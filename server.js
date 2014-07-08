var express = require('express');
var logger = require('morgan');
var compression = require('compression');
var app = express();

app.use(logger('dev'));
app.use(compression());
app.use(express.static(__dirname + '/public'));

app.listen(3000);
