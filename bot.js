const puppeteer = require('puppeteer');
const fs = require('fs');
const chalk = require('chalk');

// 读取 token
function readToken() {
    return fs.readFileSync('token.txt', 'utf8').trim();
}

// 使用 Puppeteer 发送 API 请求
async function makeRequest(url, method, headers = {}, data = {}) {
    const browser = await puppeteer.launch({ 
        headless: "new", 
        args: ['--no-sandbox', '--disable-setuid-sandbox'] 
    });
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
        await page.goto(url, { timeout: 30000, waitUntil: 'networkidle2' });
    } catch (error) {
        console.error(chalk.red('页面加载超时，继续执行其他任务'));
        await browser.close();
        return null;
    }

    const response = await page.evaluate(() => document.body.innerText);
    await browser.close();
    return response;
}

// 延迟函数
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// 获取用户积分
async function fetchPoints(headers) {
    const pointsUrl = 'https://api.testnet.liqfinity.com/v1/user/points';
    console.log(chalk.blue('Fetching points...'));
    
    const pointsResponse = await makeRequest(pointsUrl, 'GET', headers);
    if (!pointsResponse) {
        console.log(chalk.red('获取积分失败，跳过此次请求'));
        return;
    }

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
            console.log(chalk.red('积分数据格式错误'));
        }
    } catch (error) {
        console.log(chalk.red('解析积分数据出错:'), error);
    }
}

// 主函数
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

    const amount = 100000;
    const fee = "0.0017661857495432799";

    while (true) {
        console.log(chalk.blue('Creating lock...'));
        const createLockUrl = 'https://api.testnet.liqfinity.com/v1/user/stakes/USDT/stake/create';
        const createLockBody = { amount: amount.toString(), fee: fee };
        const createLockResponse = await makeRequest(createLockUrl, 'POST', headers, createLockBody);
        
        if (!createLockResponse) {
            console.log(chalk.red('创建锁定失败，跳过本次循环'));
            await delay(3000);
            continue;
        }

        try {
            const createLockData = JSON.parse(createLockResponse);
            if (!createLockData.success && createLockData.message === "Insufficient balance") {
                console.log(chalk.yellow('余额不足，跳过到下一步...'));
                await fetchPoints(headers);
                await delay(3000);
                continue;
            }
        } catch (error) {
            console.log(chalk.red('解析锁定创建响应出错:'), error);
        }

        await fetchPoints(headers);
        console.log(chalk.blue('Waiting 30 seconds before creating unlock...'));
        await delay(40000);

        console.log(chalk.blue('Creating unlock...'));
        const createUnlockUrl = 'https://api.testnet.liqfinity.com/v1/user/stakes/USDT/liquidation/create';
        const createUnlockBody = { amount: amount.toString(), fee: fee };
        const createUnlockResponse = await makeRequest(createUnlockUrl, 'POST', headers, createUnlockBody);

        if (!createUnlockResponse) {
            console.log(chalk.red('创建解锁失败，跳过本次循环'));
            await delay(3000);
            continue;
        }

        await fetchPoints(headers);
        console.log(chalk.blue('Waiting 30 seconds before creating lock again...'));
        await delay(40000);
    }
}

// 运行主函数
main();
