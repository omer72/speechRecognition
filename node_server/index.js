const express = require('express')
const app = express();
const path = require('path');
const fs = require('fs');
var filePath = path.join(__dirname, 'convertcsv.geojson');
app.get('/', function(req, res) {

	res.setHeader('Content-Type', 'application/json');
	res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE'); // If needed
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,contenttype'); // If needed
    res.setHeader('Access-Control-Allow-Credentials', true); // If needed

	var readable = fs.createReadStream(filePath);
	readable.pipe(res);
	});

app.listen(4000, () => console.log('Example app listening on port 4000!'));
