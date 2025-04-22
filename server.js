/* 
 *      server.js
 *
 *      Runs the back-end server for the stock ticker app. Handles interacting 
 *      with the stocks database and handles the process view to search for 
 *      stock information
 *
 */
const http = require('http');
const url = require('url');
const fs = require('fs');
const querystring = require('querystring');
const { MongoClient, ServerApiVersion } = require('mongodb');

// MongoDB database access credentials
const db_username = "assignment11";
const db_password = "s0GhiGWyIBbihnia";

const uri = `mongodb+srv://${db_username}:${db_password}@alexshriver.xg4npfv.mongodb.net/?retryWrites=true&w=majority&appName=AlexShriver`;
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

// API key and base url for looking up realtime stock prices
const API_KEY = "d03sej9r01qm4vp3oeq0d03sej9r01qm4vp3oeqg";
const baseApi = `https://finnhub.io/api/v1/quote?token=${API_KEY}`

// Creates the server and handles the process view
http.createServer(async (req, res) => {
    const parsedUrl = url.parse(req.url);
    const pathname = parsedUrl.pathname;

    // serve index.html
    if (pathname === '/' && req.method === 'GET') {
        fs.readFile('index.html', (err, text) => {
            if (err) {
                res.writeHead(500, { 'Content-Type': 'text/html' });
                res.end('<h1>Error loading index.html</h1>');
            } else {
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end(text);
            }
        });
    // handle the process view by finding stock data based on how the user 
    // filled out the form on index.html
    } else if (pathname === '/process' && req.method === 'GET') {
        const queryParams = querystring.parse(parsedUrl.query);
        const query = queryParams.query;
        const searchType = queryParams.searchType;

        // check that the form was filled correctly
        if (!query || !searchType) {
            res.writeHead(400, { 'Content-Type': 'text/html' });
            res.end('<h1>Missing search input or type.</h1>');
            return;
        }

        try {
            // connect to the database
            await client.connect();
            const db = client.db('Stock');
            const collection = db.collection('PublicCompanies');

            // case-insensitive
            const regex = new RegExp(query, 'i');
            const results = await collection.find({ [searchType]: regex }).toArray();

            // Write the results
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.write('<h1>Search Results</h1>');

            if (results.length > 0) {
                res.write('<ul>');
                for (let item of results) {
                    let price = await getCurrPrice(item.ticker); 
                    if (!price) price = item.price;
                    res.write(`<li><b>name: </b> ${item.name} <b>, ticker: </b>${item.ticker} <b>, stock price: </b> $${price.toFixed(2)}</li>`);
                    console.log(`name: ${item.name}, ticker: ${item.ticker}, stock price: $${price.toFixed(2)}`);
                }
                res.write('</ul>');
            } else {
                res.write('<p>No matches found.</p>');
            }

            res.end();
        } catch (err) {
            console.error(err);
            res.writeHead(500, { 'Content-Type': 'text/html' });
            res.end('<h1>Server error</h1>');
        }
    } else {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end('<h1>Welcome! Use the /process?query=XYZ&searchType=company or ticker</h1>');
    }
// runs on either the heroku supporter server the local server
}).listen(process.env.PORT || 8080, () => {
    console.log('HTTP server running at http://localhost:8080/');
});

// returns the current stock price of an argued ticker
async function getCurrPrice(ticker)
{
    // Create the API URL call
    let apiCall = `${baseApi}&symbol=${ticker}`;

    // Fetch the data from the API
    try {
        const response = await fetch(apiCall);
        const data = await response.json();
    
        return data.c;
    } catch (error) {
        console.error(`API call ${apiCall} failed:`, error);
        return null;
    }
}
