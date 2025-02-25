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

    try {
        // Navigasi ke URL dengan timeout 60 detik dan menunggu hingga jaringan idle
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

        // Ambil respons dari halaman
        const response = await page.evaluate(() => document.body.innerText);
        await browser.close();
        return response;
    } catch (error) {
        console.error(chalk.red('Navigation timeout or error:'), error);
        await browser.close();
        return null;
    }
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
        // Validasi lock
        console.log(chalk.blue('Validating lock...'));
        const validateLockUrl = 'https://api.testnet.liqfinity.com/v1/user/stakes/USDT/stake/validate';
        const validateLockBody = { amount: amount };
        const validateLockResponse = await makeRequest(validateLockUrl, 'POST', headers, validateLockBody);
        console.log('Validate Lock Response:', validateLockResponse);
        await fetchPoints(headers);
        await delay(30000); // 

        // Create lock
        console.log(chalk.blue('Creating lock...'));
        const createLockUrl = 'https://api.testnet.liqfinity.com/v1/user/stakes/USDT/stake/create';
        const createLockBody = { amount: amount.toString(), fee: fee };
        const createLockResponse = await makeRequest(createLockUrl, 'POST', headers, createLockBody);
        console.log('Create Lock Response:', createLockResponse);
        await fetchPoints(headers);
        await delay(30000); // 

        // Validasi unlock
        console.log(chalk.blue('Validating unlock...'));
        const validateUnlockUrl = 'https://api.testnet.liqfinity.com/v1/user/stakes/USDT/liquidation/validate';
        const validateUnlockBody = { amount: amount };
        const validateUnlockResponse = await makeRequest(validateUnlockUrl, 'POST', headers, validateUnlockBody);
        console.log('Validate Unlock Response:', validateUnlockResponse);
        await fetchPoints(headers);
        await delay(30000); // 

        // Create unlock
        console.log(chalk.blue('Creating unlock...'));
        const createUnlockUrl = 'https://api.testnet.liqfinity.com/v1/user/stakes/USDT/liquidation/create';
        const createUnlockBody = { amount: amount.toString(), fee: fee };
        const createUnlockResponse = await makeRequest(createUnlockUrl, 'POST', headers, createUnlockBody);
        console.log('Create Unlock Response:', createUnlockResponse);
        await fetchPoints(headers);
        await delay(30000); // 
    }
}

// Jalankan fungsi utama
main();
