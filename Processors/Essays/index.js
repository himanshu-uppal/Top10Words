import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { CHUNK_FILE_BYTE_SIZE, CHUNK_WORD_BANK_FILE_BYTE_SIZE } from '../../lib/constants.js';
import { readFileInLinesByBytes } from '../../lib/fileUtils.js'
import Bottleneck from 'bottleneck'
import moment from 'moment';
import axios from 'axios';
import * as cheerio from 'cheerio';

// Create a new Bottleneck instance
const limiter = new Bottleneck({
    maxConcurrent: 5, // Number of concurrent API calls
    minTime: 100      // Minimum time between requests (in milliseconds)
});
const wordBank = new Set();

/**
    * 1. Fetch urls from file in batches 
    * 2. process and get artcile posts from those urls in batches only 
    * 3. count words occurences of a batch and store it in a global hash map variable
    * 4. Finally after all urls processing, get top 10 words
    */
export const getTop10WordsFromEssays = async (fileName) => {

    // Get the current file's URL and convert it to a file path
    const __filename = fileURLToPath(import.meta.url);
    // Get the directory name of the current file
    const __dirname = path.dirname(__filename);
    const __project_dirname = path.join(__dirname, '..', '..');

    const filePath = path.join(__project_dirname, `/${fileName}`);

    const stats = fs.statSync(filePath);
    const fileSizeBytes = stats.size;
    const wordsCountMap = new Map();

    const wordBankFilePath = path.join(__project_dirname, `/word-bank.txt`);

    const wordBankFileStats = fs.statSync(filePath);
    const wordBankFileSizeBytes = wordBankFileStats.size;

    let incompleteReadWords;
    for (let i = 0; i < wordBankFileSizeBytes; i += CHUNK_WORD_BANK_FILE_BYTE_SIZE) {
        const readResult = await readFileInLinesByBytes(wordBankFilePath, fileSizeBytes, i, i + CHUNK_WORD_BANK_FILE_BYTE_SIZE, incompleteReadWords);
        incompleteReadWords = readResult.incompleteReadLines;
        const batchWords = readResult.lines;

        batchWords.map(word => { if (word.length >= 3 && /^[a-z]+$/.test(word)) wordBank.add(word) });
    }

    const start = moment(); //.format('DD MM YYYY hh:mm:ss.SSS');
    console.log(`Process Start - at ${start}`);

    let incompleteReadLines;
    for (let i = 0; i < fileSizeBytes; i += CHUNK_FILE_BYTE_SIZE) {

        const readResult = await readFileInLinesByBytes(filePath, fileSizeBytes, i, i + CHUNK_FILE_BYTE_SIZE, incompleteReadLines);
        //  console.log(readResult);
        incompleteReadLines = readResult.incompleteReadLines;
        const batchLines = readResult.lines;

        const articlesFetchingStart = moment();
        console.log(`artcile start - ${articlesFetchingStart.format('DD MM YYYY hh:mm:ss.SSS')}`);
        const result = await Promise.allSettled(batchLines.map(url => throttledCountWordsOfArticle(url)));
        const articlesFetchingEnd = moment(); //.format('DD MM YYYY hh:mm:ss.SSS');
        console.log(`artcile end - ${articlesFetchingEnd.format('DD MM YYYY hh:mm:ss.SSS')}`);
        console.log(`${batchLines.length} articles fetched in ${((articlesFetchingEnd.diff(articlesFetchingStart)) / 1000)}s`);
        //if 404 then ignore, else if 999 , take it as notification

        if (result) {
            for (let response of result) {
                if (response.status == 'fulfilled' && response.value && response.value.data) {
                    //   console.log(response.value.data);
                    // Load the HTML into cheerio for parsing
                    const $ = cheerio.load(response.value.data);
                    const articleText = $('article p').map((i, el) => {
                        // console.log(`---- el - ${$(el).text()} ---- \n`)
                        return $(el).text()
                    }).get();

                    for (let paragraph of articleText) {
                        const validWords = paragraph
                            .toLowerCase()
                            .split(/\W+/)
                            .filter(word => isValidWord(word));

                        countWords(validWords, wordsCountMap);
                    }
                } else if (response.status == 'rejected' && response.reason && (![404, 500].includes(response.reason.status) && !['ERR_BAD_REQUEST', 'ERR_INVALID_URL'].includes(response.reason.code))) {
                    //can be too many requests
                    // return { errorMessage: "Too many requests" };
                    console.log('Error');
                }
            }
        }
    }
    const end = moment();
    console.log(`Process End - at ${end}`)
    console.log(`Total Time -  ${((end.diff(start)) / 1000) / 60}m`)

    // Get top 10 words by frequency
    const top10Words = getTopNWords(wordsCountMap, 10);
    console.log(JSON.stringify(top10Words, null, 2));
    const response = {};
    for (let [key, value] of top10Words) {
        response[key] = value;
    }
    return response;

}

const countWordsOfArticle = async (url) => {

    //  console.log(`request - at ${moment().format('DD MM YYYY hh:mm:ss.SSS')}`)
    //  console.log(`request - ${url} at ${moment().format('DD MM YYYY hh:mm:ss.SSS')}`)
    const response = await axios.get(url);
    //  console.log(`response - ${url} at ${moment().format('DD MM YYYY hh:mm:ss.SSS')}`)
    return response;

}

// Count occurrences of words
const countWords = (words, wordCount) => {
    words.forEach(word => {

        if (wordCount.has(word)) {

            wordCount.set(word, wordCount.get(word) + 1);
        } else {

            wordCount.set(word, 1);
        }
    });
}

const getTopNWords = (map, n) => {
    const sortedArray = Array.from(map.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, n);

    return sortedArray;
}

const isValidWord = (word) => {
    return word.length >= 3 && /^[a-z]+$/.test(word) && wordBank.has(word);
}


const throttledCountWordsOfArticle = limiter.wrap(countWordsOfArticle);

















