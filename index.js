#!/usr/bin/env node
var repl = require("repl");
var program = require('commander');
var co = require('co');
var prompt = require('co-prompt');
var colors = require('colors');
var adal=require('adal-node');
var Client=require('node-rest-client').Client;
var rest=require('restler');
var _ = require('lodash');
var waitUntil = require('wait-until');
var jsonfile = require('jsonfile')
var util = require('util')

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

var debug = function(str){
  console.log(colors.debug(str));
}

co(function *(){
  clientId = yield prompt('Enter your Azure AD Client id: '.prompt);
  tenantId = yield prompt('Enter your Tenant Domain id: '.prompt);
  subscriptionId = yield prompt('Enter your Azure Subscription id: '.prompt);

  var resource="https://management.azure.com/";
  var authURL="https://login.windows.net/" + tenantId;
  var context=new AuthenticationContext(authURL);

  var cache = new adal.MemoryCache();
  var authorityHostUrl ='https://login.microsoftonline.com';
  var context = new AuthenticationContext(authURL, null, cache);
  var authHeader = "";

  console.log("Getting an OAuth Token...");

  context.acquireUserCode(resource, clientId, 'es-mx', function (err, response) {
    if (err) {
      console.log(colors.error('Oh dear!, I need to call Paul Bouwer: ' + err.stack));
    } else {
      console.log(colors.info(response.message));

      console.log(colors.info("Go to: http://bit.ly/AzureDeviceAuth"));

      context.acquireTokenWithDeviceCode(resource, clientId, response, function (err, tokenResponse) {
        if (err) {
          console.log(colors.error('Oh dear!, I need to call Paul Bouwer: ' + err.stack));
        }
        else {
          authHeader = tokenResponse['accessToken'];
          debug("Got a token!!!");

          var getUrl = function(subscriptionId, deal){
            requestURL = "https://management.azure.com/subscriptions/"
            + subscriptionId
            + "/providers/Microsoft.Commerce/RateCard?api-version=2015-06-01-preview&$filter=OfferDurableId eq '"
            + deal
            + "' and Currency eq 'USD' and Locale eq 'en-US' and RegionInfo eq 'US'"

            return requestURL;
          }

          bizsparkUrl = getUrl(subscriptionId, "MS-AZR-0149P");
          msdnUrl = getUrl(subscriptionId, "MS-AZR-0063P");
          paygUrl = getUrl(subscriptionId, "MS-AZR-0003P");

          var payg = "";
          var msdn = "";
          var bizspark = ""
          var paygDone = false;
          var msdnDone = false;
          var bizsparkDone = false;

          var currentData = ""

          var vms = function(){
            var storageData = _.filter(payg.Meters, function(o) {
              return  (o.MeterCategory.indexOf("Virtual Machines") > -1)
            });

            _.each(storageData, function(entry) {
              console.log(
                " When hosted in the "
                + colors.info(entry.MeterRegion)
                + " region,  " +
                colors.info(entry.MeterName)
                + " for "
                + colors.info(entry.MeterCategory)
                + " is going to cost you: "
              );

              _.each(entry.MeterRates, function(rate){
                var m = "$" + rate + " USD per (" + entry.Unit + ")";
                console.log("     - " + m)
              });
            });
          };

          var writeMeters = function(){
            jsonfile.writeFileSync('payg.json', payg);
            jsonfile.writeFileSync('bizspark.json', bizspark);
            jsonfile.writeFileSync('msdn.json', msdn);
          }

          var storage = function(){
            var storageData = _.filter(payg.Meters, function(o) {
              return  (o.MeterCategory.indexOf("Storage") > -1) || (o.MeterSubCategory.indexOf("Storage") > -1)
            });

            _.each(storageData, function(entry) {
              console.log(
                " When hosted in the "
                + colors.info(entry.MeterRegion)
                + " region,  " +
                colors.info(entry.MeterName)
                + " for "
                + colors.info(entry.MeterCategory)
                + " is going to cost you: "
              );

              _.each(entry.MeterRates, function(rate){
                var m = "$" + rate + " USD per (" + entry.Unit + ")";
                console.log("     - " + m)
              });
            });
          };

          debug("Getting MSDN rates...")
          debug("Getting PAYG rates...")
          debug("Getting BizSpark rates...")

          rest.get(msdnUrl, {accessToken:authHeader})
          .on('complete',function(result) {
            msdn = result
            debug("MSDN Done!");
            msdnd = true;
          });

          rest.get(paygUrl, {accessToken:authHeader})
          .on('complete',function(result) {
            payg = result
            debug("PAYG Done!");
            paygDone = true;
          });

          rest.get(bizsparkUrl, {accessToken:authHeader})
          .on('complete',function(result) {
            bizspark = result
            debug("BizSpark Done!");
            bizsparkDone = true
          });


          waitUntil()
          .interval(100)
          .times(60)
          .condition(function() {
            return bizsparkDone && msdnDone && paygDone;
          })
          .done(function(result) {

            var replServer = repl.start({
              prompt: "baug > ".yellow,
            });

            replServer.context.msdn = msdn;
            replServer.context.payg = payg;
            replServer.context.bizspark = bizspark;
            replServer.context.currentData = currentData;

            replServer.context.msdnUrl = msdnUrl;
            replServer.context.paygUrl = paygUrl;
            replServer.context.bizsparkUrl = bizsparkUrl;

            replServer.context.storage = storage; //hard coded to PAYG
            replServer.context.vms = vms; //hard coded to PAYG ++--

            replServer.context.offerUrl = "https://azure.microsoft.com/en-us/support/legal/offer-details/";
            writeMeters()
          });
        }
      });
    }
  });
});
