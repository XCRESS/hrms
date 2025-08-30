import express from 'express';
import nodemailer from 'nodemailer';
import net from 'net';
import dns from 'dns';
import { promisify } from 'util';

const router = express.Router();
const dnsResolve = promisify(dns.resolve);

// Email diagnostic endpoint - REMOVE THIS IN PRODUCTION
router.get('/email-diagnostic', async (req, res) => {
  const results = {
    timestamp: new Date().toISOString(),
    environment: {
      platform: process.platform,
      nodeVersion: process.version,
      isRailway: !!process.env.RAILWAY_ENVIRONMENT,
      railwayEnv: process.env.RAILWAY_ENVIRONMENT || 'not-railway'
    },
    tests: {}
  };

  try {
    // Test 1: DNS Resolution
    try {
      const addresses = await dnsResolve('smtp.gmail.com');
      results.tests.dns = { success: true, addresses };
    } catch (error) {
      results.tests.dns = { success: false, error: error.message };
    }

    // Test 2: Port Connectivity
    const ports = [25, 465, 587, 2525];
    results.tests.ports = {};
    
    for (const port of ports) {
      try {
        const accessible = await testPort('smtp.gmail.com', port, 10000);
        results.tests.ports[port] = { accessible, error: null };
      } catch (error) {
        results.tests.ports[port] = { accessible: false, error: error.message };
      }
    }

    // Test 3: SMTP Auth Test
    results.tests.smtp = {};
    
    // Test port 587
    try {
      const transporter = nodemailer.createTransporter({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_APP_PASSWORD
        },
        connectionTimeout: 15000,
        greetingTimeout: 15000,
        socketTimeout: 15000
      });
      
      await transporter.verify();
      results.tests.smtp[587] = { success: true, error: null };
      transporter.close();
    } catch (error) {
      results.tests.smtp[587] = { 
        success: false, 
        error: error.message,
        code: error.code,
        errno: error.errno,
        syscall: error.syscall
      };
    }

    // Test port 465
    try {
      const transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_APP_PASSWORD
        },
        connectionTimeout: 15000,
        greetingTimeout: 15000,
        socketTimeout: 15000
      });
      
      await transporter.verify();
      results.tests.smtp[465] = { success: true, error: null };
      transporter.close();
    } catch (error) {
      results.tests.smtp[465] = { 
        success: false, 
        error: error.message,
        code: error.code,
        errno: error.errno,
        syscall: error.syscall
      };
    }

    res.json({
      success: true,
      message: 'Email diagnostic completed',
      results
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      results
    });
  }
});

// Helper function to test port connectivity
function testPort(host, port, timeout = 10000) {
  return new Promise((resolve, reject) => {
    const socket = new net.Socket();
    
    const timer = setTimeout(() => {
      socket.destroy();
      reject(new Error(`Connection timeout after ${timeout}ms`));
    }, timeout);
    
    socket.on('connect', () => {
      clearTimeout(timer);
      socket.destroy();
      resolve(true);
    });
    
    socket.on('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
    
    socket.connect(port, host);
  });
}

export default router;