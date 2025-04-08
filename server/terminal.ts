
import express from 'express';
import { spawn } from 'child_process';
import { Router } from 'express';

const router = Router();

router.post('/execute/command', (req, res) => {
  const { command } = req.body;

  if (!command) {
    return res.status(400).json({ error: 'Command not provided' });
  }

  try {
    const shell = process.platform === 'win32' ? 'cmd.exe' : '/bin/bash';
    const proc = spawn(shell, ['-c', command]);

    let output = '';
    let error = '';

    proc.stdout.on('data', (data) => {
      output += data.toString();
    });

    proc.stderr.on('data', (data) => {
      error += data.toString();
    });

    proc.on('close', (code) => {
      if (code === 0) {
        res.json({ success: true, output });
      } else {
        res.status(500).json({ 
          success: false, 
          error: error || `Command execution failed with code ${code}`,
          output 
        });
      }
    });

    proc.on('error', (err) => {
      res.status(500).json({ 
        success: false, 
        error: err.message 
      });
    });
  } catch (err) {
    res.status(500).json({ 
      success: false, 
      error: err instanceof Error ? err.message : 'Unknown error' 
    });
  }
});

export default router;
