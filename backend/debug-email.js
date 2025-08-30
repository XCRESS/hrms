/**
 * Email Service Diagnostic Tool
 * Run this script to debug SMTP connection issues
 */

import nodemailer from 'nodemailer';
import net from 'net';
import dns from 'dns';
import { promisify } from 'util';

const dnsResolve = promisify(dns.resolve);

// Email configuration from your .env
const config = {
  host: 'smtp.gmail.com',
  ports: [587, 465, 25, 2525],
  user: 'intakesense@gmail.com',
  pass: 'voazallppkkbeukx'
};

console.log('🔍 Starting Email Service Diagnostics...\n');

// Step 1: DNS Resolution Test
async function testDNS() {
  console.log('1️⃣ Testing DNS Resolution for', config.host);
  try {
    const addresses = await dnsResolve(config.host);
    console.log('✅ DNS Resolution successful:', addresses);
    return true;
  } catch (error) {
    console.error('❌ DNS Resolution failed:', error.message);
    return false;
  }
}

// Step 2: Port Connectivity Test
async function testPortConnectivity(host, port, timeout = 10000) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    
    const timer = setTimeout(() => {
      socket.destroy();
      resolve({
        host,
        port,
        accessible: false,
        error: `Connection timeout after ${timeout}ms`
      });
    }, timeout);
    
    socket.on('connect', () => {
      clearTimeout(timer);
      socket.destroy();
      resolve({
        host,
        port,
        accessible: true,
        error: null
      });
    });
    
    socket.on('error', (error) => {
      clearTimeout(timer);
      resolve({
        host,
        port,
        accessible: false,
        error: error.message
      });
    });
    
    socket.connect(port, host);
  });
}

async function testAllPorts() {
  console.log('\n2️⃣ Testing Port Connectivity...');
  
  for (const port of config.ports) {
    const result = await testPortConnectivity(config.host, port, 15000);
    
    if (result.accessible) {
      console.log(`✅ Port ${port}: Accessible`);
    } else {
      console.log(`❌ Port ${port}: ${result.error}`);
    }
  }
}

// Step 3: SMTP Protocol Test
async function testSMTPAuth(port, secure) {
  console.log(`\n3️⃣ Testing SMTP Authentication on port ${port}...`);
  
  const transporter = nodemailer.createTransport({
    host: config.host,
    port: port,
    secure: secure,
    auth: {
      user: config.user,
      pass: config.pass
    },
    connectionTimeout: 20000,
    greetingTimeout: 20000,
    socketTimeout: 20000,
    logger: true,
    debug: true
  });
  
  try {
    const result = await transporter.verify();
    console.log(`✅ SMTP Auth on port ${port}: Success`);
    return { port, success: true, error: null };
  } catch (error) {
    console.log(`❌ SMTP Auth on port ${port}: ${error.message}`);
    return { port, success: false, error: error.message };
  } finally {
    transporter.close();
  }
}

// Step 4: Test Email Sending
async function testEmailSend(workingPort, secure) {
  console.log(`\n4️⃣ Testing Email Send on port ${workingPort}...`);
  
  const transporter = nodemailer.createTransport({
    host: config.host,
    port: workingPort,
    secure: secure,
    auth: {
      user: config.user,
      pass: config.pass
    },
    connectionTimeout: 30000,
    greetingTimeout: 30000,
    socketTimeout: 30000
  });
  
  try {
    const result = await transporter.sendMail({
      from: config.user,
      to: config.user, // Send to self for testing
      subject: 'HRMS Email Service Test',
      text: 'This is a test email from HRMS diagnostic script.'
    });
    
    console.log('✅ Email sent successfully:', result.messageId);
    return true;
  } catch (error) {
    console.log('❌ Email send failed:', error.message);
    return false;
  } finally {
    transporter.close();
  }
}

// Step 5: Environment Check
function checkEnvironment() {
  console.log('\n5️⃣ Environment Check...');
  console.log('Node.js version:', process.version);
  console.log('Platform:', process.platform);
  console.log('EMAIL_USER set:', !!process.env.EMAIL_USER);
  console.log('EMAIL_APP_PASSWORD set:', !!process.env.EMAIL_APP_PASSWORD);
  
  // Check if running in Railway
  if (process.env.RAILWAY_ENVIRONMENT) {
    console.log('🚂 Running on Railway');
    console.log('Railway Environment:', process.env.RAILWAY_ENVIRONMENT);
  }
}

// Main diagnostic function
async function runDiagnostics() {
  try {
    checkEnvironment();
    
    // Test DNS
    const dnsWorking = await testDNS();
    if (!dnsWorking) {
      console.log('\n🛑 DNS resolution failed - cannot proceed with further tests');
      return;
    }
    
    // Test port connectivity
    await testAllPorts();
    
    // Test SMTP authentication on different ports
    const authResults = [];
    authResults.push(await testSMTPAuth(587, false)); // TLS
    authResults.push(await testSMTPAuth(465, true));  // SSL
    authResults.push(await testSMTPAuth(2525, false)); // Alternative
    
    // Find a working port
    const workingAuth = authResults.find(result => result.success);
    
    if (workingAuth) {
      console.log(`\n🎉 Found working SMTP configuration: Port ${workingAuth.port}`);
      
      // Test actual email sending
      const secure = workingAuth.port === 465;
      await testEmailSend(workingAuth.port, secure);
    } else {
      console.log('\n🛑 No working SMTP configuration found');
      console.log('\nPossible issues:');
      console.log('- Railway hosting restrictions');
      console.log('- Invalid Gmail App Password');
      console.log('- Gmail security settings');
      console.log('- Network firewall blocking SMTP');
    }
    
  } catch (error) {
    console.error('💥 Diagnostic script failed:', error);
  }
  
  console.log('\n🔍 Diagnostics completed');
}

// Run diagnostics
runDiagnostics();