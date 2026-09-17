const express = require('express');
const https = require('https');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Serve static frontend files (index.html, style.css, script.js)
app.use(express.static(path.join(__dirname, '')));

// Official Mojang Search API Proxy
app.get('/api/search', (req, res) => {
    const page = req.query.page || 1;
    const pageSize = req.query.pageSize || 24;
    const packType = req.query.packType || '';
    const keyword = req.query.keyword || '';
    const author = req.query.author || '';

    let mojangUrl = `https://net-secondary.web.minecraft-services.net/api/v1.0/en-us/search?page=${page}&pageSize=${pageSize}&sortType=Recent&category=Marketplace&geography=IN`;
    
    if (packType && packType !== 'all') {
        // Map frontend categories to Mojang packType
        let mappedType = 'Add-On';
        if (packType === 'world') mappedType = 'World';
        else if (packType === 'skin') mappedType = 'Skin';
        else if (packType === 'texture') mappedType = 'ResourcePack';
        mojangUrl += `&filter%5BpackType%5D=${encodeURIComponent(mappedType)}`;
    }

    if (keyword) {
        mojangUrl += `&query=${encodeURIComponent(keyword)}`;
    }

    if (author) {
        mojangUrl += `&author=${encodeURIComponent(author)}`;
    }

    const options = {
        headers: {
            'content-type': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            'Referer': 'https://www.minecraft.net/'
        }
    };

    https.get(mojangUrl, options, (resp) => {
        let data = '';
        resp.on('data', (chunk) => data += chunk);
        resp.on('end', () => {
            try {
                res.setHeader('Access-Control-Allow-Origin', '*');
                res.setHeader('Content-Type', 'application/json');
                res.send(data);
            } catch (err) {
                res.status(500).json({ error: 'Failed parsing response' });
            }
        });
    }).on('error', (err) => {
        res.status(500).json({ error: err.message });
    });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
