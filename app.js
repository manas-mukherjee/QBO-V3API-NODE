var http       = require('http'),
    port       = process.env.PORT || 3000,
    request    = require('request'),
    qs         = require('querystring'),
    util       = require('util'),
    express    = require('express'),
    app        = express(),
    QuickBooks = require('node-quickbooks')


// Generic Express config
app.set('port', port)
app.set('views', 'views')
app.use(express.bodyParser())
app.use(express.cookieParser('Scott'))
app.use(express.session({secret: 'Tiger'}));
app.use(app.router)

http.createServer(app).listen(app.get('port'), function() {
  console.log('Express server listening on port ' + app.get('port'))
})



// INSERT YOUR CONSUMER_KEY AND CONSUMER_SECRET HERE
//If you use development tokens, set the 'sandbox' flag to 'false' while creating quickbooks object below
//If you use production tokens, set the 'sandbox' flag to 'false' while creating quickbooks object below

var consumerKey    = 'qyprdT3em8tvj37G2cltvX7OuwQkHf',
    consumerSecret = 'LxggmWcgM5JxohmSfLSosivrST1KwMKPQnm7SDLc'

//using nedb as a in memory datastore to store oauth tokens
var Datastore = require('nedb');
db = {};
db.companies = new Datastore({ filename: 'companies.db', autoload: true });

app.get('/start', function(req, res) {
  res.render('quickbooks.ejs', {locals: {port:port, appCenter: QuickBooks.APP_CENTER_BASE}})
})

app.get('/requestToken', function(req, res) {

  //passing in appCompanyId as a query param to requestToken endpoint
  //This is not the best way, but for demo, this will enable
  //us to associate companyId of app to QBO company Id
  var companyId = req.query.appCompanyId;

  var postBody = {
    url: QuickBooks.REQUEST_TOKEN_URL,
    oauth: {
      callback:        'http://localhost:' + port + '/callback/',
      consumer_key:    consumerKey,
      consumer_secret: consumerSecret
    }
  }
  request.post(postBody, function (e, r, data) {
    var requestToken = qs.parse(data)
    req.session.oauth_token_secret = requestToken.oauth_token_secret
    console.log(requestToken)

    db.companies.insert([{ _id:companyId, requestToken: requestToken.oauth_token, requestTokenSecret:requestToken.oauth_token_secret }], function (err, newdoc) {
      if(err){
        console.log(err);
        //next(err);
      }
        

      console.log("RequestToken : added new record "+newdoc+" records in companies collection");

    });

    res.redirect(QuickBooks.APP_CENTER_URL + requestToken.oauth_token)
  })
})

app.get('/callback', function(req, res) {
  var postBody = {
    url: QuickBooks.ACCESS_TOKEN_URL,
    oauth: {
      consumer_key:    consumerKey,
      consumer_secret: consumerSecret,
      token:           req.query.oauth_token,
      token_secret:    req.session.oauth_token_secret,
      verifier:        req.query.oauth_verifier,
      realmId:         req.query.realmId
    }
  }
  request.post(postBody, function (e, r, data) {
    var accessToken = qs.parse(data)
    console.log(accessToken)
    console.log(postBody.oauth.realmId)

    qbo = new QuickBooks(consumerKey,
                         consumerSecret,
                         accessToken.oauth_token,
                         accessToken.oauth_token_secret,
                         postBody.oauth.realmId,
                         true, // use the Sandbox
                         true); // turn debugging on
    
    // save the access tokens on behalf of user in companies collection
    if(!e) {

        db.companies.update({requestToken: req.query.oauth_token}, { $set: {accessToken: accessToken.oauth_token, 
            accessTokenSecret:accessToken.oauth_token_secret,  qboId: postBody.oauth.realmId,
            connectedToQbo: true} }, { multi: true }, function (err, numReplaced) {
          if(err)
            next(err);

          console.log("AccessToken : replaced "+numReplaced+" records in companies collection");

        });
    }
    // test out account access
    qbo.findAccounts(function(_, accounts) {
      accounts.QueryResponse.Account.forEach(function(account) {
        console.log(account.Name)
      })
    })
  })
  res.send('<!DOCTYPE html><html lang="en"><head></head><body><script>window.opener.location.reload(); window.close();</script></body></html>')
})


//This endpoint will return the companies collection, to retrieve access tokens for companyId
app.get('/companies', function(req,res) {

  db.companies.find({}, function(e,results){

    if(e)
        return next(e);

    var obj = {
      "companies": results
    }

    res.send(obj);
  });

});

