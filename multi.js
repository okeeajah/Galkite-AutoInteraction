import fetch from 'node-fetch';
import cfonts from "cfonts";
import chalk from 'chalk';
import readline from 'readline';
import ora from 'ora';
import fs from 'fs';

// Membaca alamat wallet dari file data.txt
function getWalletAddresses() {
  try {
    const data = fs.readFileSync('data.txt', 'utf8');
    return data.split('\n').map(addr => addr.trim()).filter(addr => addr);
  } catch (error) {
    console.error(chalk.red('? Error membaca data.txt'), error);
    process.exit(1);
  }
}

// Fungsi untuk menanyakan jumlah interaksi
function askQuestion(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Fungsi utama untuk menjalankan interaksi pada semua akun
async function main() {
  cfonts.say('NT Exhaust', {
    font: 'block',
    align: 'center',
    colors: ['cyan', 'magenta'],
    background: 'black',
    letterSpacing: 1,
    lineHeight: 1,
    space: true,
    maxLength: '0',
  });

  console.log(chalk.green("=== Telegram Channel : NT Exhaust ( @NTExhaust ) ===\n"));

  const numberOfInteractions = await askQuestion(chalk.yellow("Enter the number of interactions: "));
  const walletAddresses = getWalletAddresses();

  for (const walletAddress of walletAddresses) {
    console.log(chalk.blue(`\n?? Processing wallet: ${walletAddress}`));

    for (let i = 1; i <= parseInt(numberOfInteractions); i++) {
      console.log(chalk.blue(`\nProcessing interaction ${i} of ${numberOfInteractions} for wallet ${walletAddress}`));
      await retryOperation(() => reportUsage(walletAddress)); // Retry otomatis sampai berhasil
    }
  }

  rl.close();

  console.log(chalk.magenta("? Semua interaksi selesai. Menunggu 24 jam sebelum restart..."));
  await new Promise(resolve => setTimeout(resolve, 24 * 60 * 60 * 1000));
  main(); // Restart setelah 24 jam
}

// Fungsi retry otomatis
async function retryOperation(operation, delay = 5000) {
  const spinner = ora('Processing...').start();
  let firstAttempt = true;
  while (true) {
    try {
      if (firstAttempt) {
        firstAttempt = false;
      }
      await operation();
      spinner.succeed('? Operation successful!');
      return;
    } catch {
      spinner.text = 'Retrying...';
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

// Fungsi melaporkan penggunaan
async function reportUsage(walletAddress) {
  const postUrl = 'https://quests-usage-dev.prod.zettablock.com/api/report_usage';
  const postPayload = {
    wallet_address: walletAddress,
    agent_id: "deployment_p5J9lz1Zxe7CYEoo0TZpRVay",
    request_text: "What is Kite AI?",
    response_text: "Kite AI is a blockchain for AI economy using Proof of AI (PoAI).",
    request_metadata: null
  };

  const headers = { 'Accept': '*/*', 'Content-Type': 'application/json' };

  const response = await fetch(postUrl, { method: 'POST', headers, body: JSON.stringify(postPayload) });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`POST request failed: ${response.status}\nServer Response: ${errorText}`);
  }

  const data = await response.json();
  const interactionId = data.interaction_id;

  if (!interactionId) throw new Error('interaction_id not found in the POST response!');

  console.log(chalk.green(`? Success! Got interaction ID: ${interactionId}`));

  await retryOperation(() => submitInteraction(interactionId, walletAddress)); // Retry otomatis
}

// Fungsi submit interaction
async function submitInteraction(interactionId, walletAddress) {
  const getUrl = `https://neo-dev.prod.zettablock.com/v1/inference?id=${interactionId}`;
  const headers = { 'Accept': '*/*', 'Content-Type': 'application/json' };

  console.log(chalk.cyan(`?? Trying to submit interaction (${interactionId})...`));

  const response = await fetch(getUrl, { method: 'GET', headers });
  if (!response.ok) throw new Error(`GET request failed: ${response.status}`);

  await new Promise(resolve => setTimeout(resolve, 2000));
  const response2 = await fetch(getUrl, { method: 'GET', headers });
  if (!response2.ok) throw new Error(`Second request failed: ${response2.status}`);

  console.log(chalk.green(`? Successfully submitted for wallet: ${walletAddress}`));
  console.log(chalk.magenta(`______________________________________________________________________________`));

  await fetchUserStats(walletAddress);
}

// Fungsi ambil statistik user
async function fetchUserStats(walletAddress) {
  const statsUrl = `https://quests-usage-dev.prod.zettablock.com/api/user/${walletAddress}/stats`;

  const statsHeaders = {
    'accept': '*/*',
    'accept-encoding': 'gzip, deflate, br, zstd',
    'accept-language': 'en-US,en;q=0.8',
    'origin': 'https://agents.testnet.gokite.ai',
    'referer': 'https://agents.testnet.gokite.ai/',
    'user-agent': 'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Mobile Safari/537.36'
  };

  const response = await fetch(statsUrl, { method: 'GET', headers: statsHeaders });

  if (!response.ok) {
    console.error(chalk.red(`?? Gagal mengambil user stats untuk ${walletAddress}: ${response.status}`));
    return;
  }

  const stats = await response.json();
  console.log(chalk.yellow(`?? Stats for ${walletAddress}:`));
  console.log(chalk.blue(`Total Interactions: ${stats.total_interactions || 'N/A'}`));
  console.log(chalk.blue(`Last Active: ${stats.last_active || 'N/A'}`));
}

// Menjalankan script utama
main();
