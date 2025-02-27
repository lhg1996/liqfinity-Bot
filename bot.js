const puppeteer = require('puppeteer');
const fs = require('fs');
const chalk = require('chalk');

// Fungsi untuk membaca token dari file
function readToken() {
    return fs.readFileSync('token.txt', 'utf8').trim();
}

// Fungsi untuk melakukan request API menggunakan Puppeteer
async function makeRequest(url, method, headers = {}, data = {}) {
    const browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();

    await page.setRequestInterception(true);
    page.on('request', (req) => {
        req.continue({
            method: method,
            headers: headers,
            postData: method === 'POST' ? JSON.stringify(data) : undefined
        });
    });

    await page.goto(url, { waitUntil: 'networkidle2' });
    const response = await page.evaluate(() => document.body.innerText);
    await browser.close();
    return response;
}

// Fungsi untuk menunggu beberapa detik
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Fungsi untuk mengambil dan menampilkan poin dalam format rapi
async function fetchPoints(headers) {
    const pointsUrl = 'https://api.testnet.liqfinity.com/v1/user/points';
    console.log(chalk.blue('Fetching points...'));
    const pointsResponse = await makeRequest(pointsUrl, 'GET', headers);
    
    try {
        const pointsData = JSON.parse(pointsResponse);
        if (pointsData.success && pointsData.data && pointsData.data.points) {
            const points = pointsData.data.points;
            console.log(chalk.green(`\nPoints`));
            console.log(chalk.green(`Borrow Points: ${points.borrowPoints}`));
            console.log(chalk.green(`Liquidity Points: ${points.liquidityPoints}`));
            console.log(chalk.green(`Rank: ${points.rank}`));
            console.log(chalk.green(`Referral Points: ${points.referralPoints}`));
            console.log(chalk.green(`Sum Points: ${points.sumPoints}\n`));
        } else {
            console.log(chalk.red('Invalid points response format'));
        }
    } catch (error) {
        console.log(chalk.red('Error parsing points response:'), error);
    }
}

// Fungsi utama
async function main() {
    const token = readToken();
    const headers = {
        'authorization': `Bearer ${token}`,
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'accept': 'application/json, text/plain, */*',
        'sec-ch-ua': '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
        'content-type': 'application/json',
        'sec-ch-ua-mobile': '?0',
        'origin': 'https://app.testnet.liqfinity.com',
        'referer': 'https://app.testnet.liqfinity.com/',
        'accept-encoding': 'gzip, deflate, br, zstd',
        'accept-language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7'
    };

    const amount = 100000.80618017282;
    const fee = "0.0017661857495432799";

    while (true) {
        // Create lock
        console.log(chalk.blue('Creating lock...'));
        const createLockUrl = 'https://api.testnet.liqfinity.com/v1/user/stakes/USDT/stake/create';
        const createLockBody = { amount: amount.toString(), fee: fee };
        const createLockResponse = await makeRequest(createLockUrl, 'POST', headers, createLockBody);
        console.log('Create Lock Response:', createLockResponse);

        // Cek jika respons menunjukkan saldo tidak mencukupi
        try {
            const createLockData = JSON.parse(createLockResponse);
            if (!createLockData.success && createLockData.message === "Insufficient balance") {
                console.log(chalk.yellow('Insufficient balance, skipping to next step...'));
                await fetchPoints(headers);
                await delay(3000);
                continue; // Lanjut ke iterasi berikutnya tanpa melakukan unlock
            }
        } catch (error) {
            console.log(chalk.red('Error parsing create lock response:'), error);
        }

        await fetchPoints(headers);

        // Tunggu 30 detik sebelum create unlock
        console.log(chalk.blue('Waiting 30 seconds before creating unlock...'));
        await delay(30000);

        // Create unlock
        console.log(chalk.blue('Creating unlock...'));
        const createUnlockUrl = 'https://api.testnet.liqfinity.com/v1/user/stakes/USDT/liquidation/create';
        const createUnlockBody = { amount: amount.toString(), fee: fee };
        const createUnlockResponse = await makeRequest(createUnlockUrl, 'POST', headers, createUnlockBody);
        console.log('Create Unlock Response:', createUnlockResponse);

        await fetchPoints(headers);

        // Tunggu 30 detik sebelum kembali ke create lock
        console.log(chalk.blue('Waiting 30 seconds before creating lock again...'));
        await delay(30000);
    }
}

// Jalankan fungsi utama
main();
