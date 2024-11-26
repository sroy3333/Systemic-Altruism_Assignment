const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');
const Prompt = require('../models/prompt');
const Response = require('../models/response');
const Feedback = require('../models/Feedback');

// Send prompt to LLM and save response
router.post('/send-prompt', async (req, res) => {
  const { text } = req.body;

  try {
    // Validate the incoming request
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Invalid prompt text provided.' });
    }

    // Save the prompt in the database
    const prompt = await Prompt.create({ text });

    // Send the prompt to the Cohere API
    const llmResponse = await fetch('https://api.cohere.ai/v1/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.COHERE_API_KEY}`, // Use Cohere API Key
        'Cohere-Version': '2022-12-06 ',
      },
      body: JSON.stringify({
        model: 'command-light-nightly', // Replace with the desired Cohere model
        prompt: text,
        max_tokens: 150, // Adjust token limit as needed
        temperature: 0.7, // Optional: controls randomness
      }),
    });

    if (!llmResponse.ok) {
      const errorDetails = await llmResponse.text(); // Fetch error details
      console.error('Cohere API Error Details:', errorDetails);
      throw new Error(`Cohere API Error: ${errorDetails}`);
    }

    const llmData = await llmResponse.json();

    // Ensure the response has the expected structure
    if (!llmData.generations || !Array.isArray(llmData.generations) || llmData.generations.length === 0) {
      console.error('Invalid response structure from Cohere API:', llmData);
      throw new Error('Cohere API returned no generations in the response.');
    }

    const responseText = llmData.generations[0]?.text?.trim();
    if (!responseText) {
      console.error('Cohere API response is missing "text" in the first generation:', llmData.generations[0]);
      throw new Error('Cohere API returned a generation with no valid text.');
    }

    // Save the response in the database
    const response = await Response.create({ promptId: prompt._id, text: responseText });

    res.json({ promptId: prompt._id, responseId: response._id, response: responseText });
  } catch (err) {
    console.error('Error in /send-prompt:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Get feedback for a response
router.post('/get-feedback', async (req, res) => {
  const { responseId } = req.body;

  try {
    // Validate the incoming request
    if (!responseId || typeof responseId !== 'string') {
      return res.status(400).json({ error: 'Invalid response ID provided.' });
    }

    const response = await Response.findById(responseId);
    if (!response) {
      return res.status(404).json({ error: 'Response not found' });
    }

    // Generate feedback
    const feedbackData = {
      score: Math.floor(Math.random() * 10) + 1, // Dummy scoring logic (8–10)
      comments: 'Good response, but could use more detailed examples.', // Replace with real logic
    };

    // Save feedback in the database
    const savedFeedback = await Feedback.create({ responseId: response._id, score, ...feedbackData });

    res.json({ feedback: savedFeedback });
  } catch (err) {
    console.error('Error in /get-feedback:', err.message);
    res.status(500).json({ error: 'Error generating feedback', details: err.message });
  }
});


router.post('/grade-answers', async (req, res) => {
  const { studentAnswers } = req.body;

  try {
    if (!studentAnswers || !Array.isArray(studentAnswers)) {
      return res.status(400).json({ error: 'Invalid question-answer data provided.' });
    }

    const feedbackResponses = [];

    for (const { question, answer } of studentAnswers) {
      if (!question || !answer) {
        feedbackResponses.push({
          question,
          answer,
          feedback: 'Invalid question-answer pair provided.',
        });
        continue;
      }

      // Use LLM for grading and feedback generation
      const gradingPrompt = `Grade the following answer and provide constructive feedback:\n\nQuestion: ${question}\nAnswer: ${answer}`;
      const llmResponse = await fetch('https://api.cohere.ai/v1/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.COHERE_API_KEY}`,
          'Cohere-Version': '2022-12-06',
        },
        body: JSON.stringify({
          model: 'command-light-nightly',
          prompt: gradingPrompt,
          max_tokens: 200,
          temperature: 0.7,
        }),
      });

      const score = Math.floor(Math.random() * 10) + 1;
      if (!llmResponse.ok) {
        feedbackResponses.push({
          question,
          answer,
          feedback: 'Error grading this answer.',
          score
        });
        continue;
      }

      const llmData = await llmResponse.json();
      const feedback = llmData.generations[0]?.text?.trim() || 'No feedback provided';

      feedbackResponses.push({ question, answer, feedback, score });
    }

    res.json({ gradedAnswers: feedbackResponses });
  } catch (err) {
    console.error('Error in /grade-answers:', err.message);
    res.status(500).json({ error: 'Error grading answers', details: err.message });
  }
});

module.exports = router;

