#!/usr/bin/env node
var repl = require("repl");
var program = require('commander');
var co = require('co');
var prompt = require('co-prompt');
var colors = require('colors');
var adal=require('adal-node');
var Client=require('node-rest-client').Client;
var rest=require('restler');
var AuthenticationContext= adal.AuthenticationContext;

var clientId = "";
var tenantId = "";
var subscriptionId = "";

colors.setTheme({
  input: 'grey',
  verbose: 'cyan',
  prompt: 'grey',
  info: 'green',
  data: 'grey',
  help: 'cyan',
  warn: 'yellow',
  debug: 'blue',
  error: 'red'
});


co(function *(){
  clientId = yield prompt('Enter your client id: '.prompt);
  tenantId = yield prompt('Enter your tenant id: '.prompt);
  subscriptionId = yield prompt('Enter your subscription id: '.prompt);

  var resource="https://management.azure.com/";
  var authURL="https://login.windows.net/" + tenantId;
  var context=new AuthenticationContext(authURL);

  var cache = new adal.MemoryCache();
  var authorityHostUrl ='https://login.microsoftonline.com';
  var context = new AuthenticationContext(authURL, null, cache);
  var authHeader = "";
  console.log("Getting a OAuth Token".green);

  context.acquireUserCode(resource, clientId, 'es-mx', function (err, response) {
    if (err) {
      console.log(colors.error('Oh dear!, I need to call Paul Bouwer: ' + err.stack));
    } else {
      console.log(colors.help(response.message.yellow));

      // console.log('calling acquire token with device code');

      context.acquireTokenWithDeviceCode(resource, clientId, response, function (err, tokenResponse) {
        if (err) {
          console.log('error happens when acquiring token with device code');
          console.log(err);
        }
        else {
          authHeader = tokenResponse['accessToken'];
          console.log(colors.info("Got a token:" + authHeader));

          var msdn = function(){
            requestURL = "https://management.azure.com/subscriptions/" + subscriptionId + "/providers/Microsoft.Commerce/RateCard?api-version=2015-06-01-preview&$filter=OfferDurableId eq 'MS-AZR-0149P' and Currency eq 'USD' and Locale eq 'en-US' and RegionInfo eq 'US'"
            console.log(requestURL);
            rest.get(requestURL, {accessToken:authHeader}).on('complete',function(result) {
              console.log(result);
            });
          }
          
          var replServer = repl.start({
            prompt: "baug > ".yellow,
          });

          replServer.context.msdn = msdn;




        }
      });
    }
  });



});


//
// program
// .arguments('<tenantId> <clientId> <subscriptionId>')
// .action(function(tenantId, clientId, subscriptionId, user, pass) {
//
//   var resource="https://management.azure.com/";
//   var authURL="https://login.windows.net/" + tenantId;
//   var context=new AuthenticationContext(authURL);
//
//   var cache = new adal.MemoryCache();
//
//   var authorityHostUrl ='https://login.microsoftonline.com';
//   var context = new AuthenticationContext(authURL, null, cache);
//   context.acquireUserCode(resource, clientId, 'es-mx', function (err, response) {
//     if (err) {
//       console.log('well that didn\'t work: ' + err.stack);
//     } else {
//       console.log(response);
//       console.log('calling acquire token with device code');
//       context.acquireTokenWithDeviceCode(resource, clientId, response, function (err, tokenResponse) {
//         if (err) {
//           console.log('error happens when acquiring token with device code');
//           console.log(err);
//         }
//         else {
//           authHeader = tokenResponse['accessToken'];
//
//           requestURL = "https://management.azure.com/subscriptions/" + subscriptionId + "/providers/Microsoft.Commerce/RateCard?api-version=2015-06-01-preview&$filter=OfferDurableId eq 'MS-AZR-0149P' and Currency eq 'USD' and Locale eq 'en-US' and RegionInfo eq 'US'"
//           console.log(requestURL);
//           rest.get(requestURL, {accessToken:authHeader}).on('complete',function(result) {
//             console.log(result);
//           });
//         }
//       });
//     }
//   });
//
// })
// .parse(process.argv);
