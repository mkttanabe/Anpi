/*
* Copyright (C) 2015 KLab Inc.
*
* Licensed under the Apache License, Version 2.0 (the "License");
* you may not use this file except in compliance with the License.
* You may obtain a copy of the License at
*
* http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
*/

var MAILGUN_DOMAIN = 'sandboxXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX.mailgun.org';
var MAILGUN_KEY    = 'key-XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX';
var MAILGUN_TO     = 'Taro Yamada <XXXXXXXXXXXXX@XXXXX.XXXX>';
var MAILGUN_FROM   = 'Safety Alert <postmaster@' + MAILGUN_DOMAIN + '>';

// Use Parse.Cloud.define to define as many cloud functions as you want.
// For example:
Parse.Cloud.define("hello", function(request, response) {
    response.success("Hello world!");
});

Parse.Cloud.define("now", function(request, response) {
    response.success("date=" + now());
});

// save new object
Parse.Cloud.define("detected", function(request, response) {
    var classDetected = Parse.Object.extend('Detected');
    objNew = new classDetected();
    objNew.set('temperature', parseFloat(request.params.temp));
    objNew.set('deviceId', request.params.devid);
    objNew.set('deviceAddress', request.params.ip);
    objNew.set('posted', dateTokyo());
    objNew.save(null, {
        success: function(objNew) {
            response.success("OK! temp=" + request.params.temp);
        },
        error: function(objNew, error) {
            response.error("Error " + error.code + " : " + error.message)
        }
    });
});

// send alert mail via "Mailgun"
Parse.Cloud.define("sendmail", function(request, response) {
    var Mailgun = require('mailgun');
    Mailgun.initialize(MAILGUN_DOMAIN, MAILGUN_KEY);
    Mailgun.sendEmail({
            to: MAILGUN_TO, 
            from: MAILGUN_FROM,
            subject: "** Notification **",
            text: "緊急ボタンが押されました！至急安全確認を！ \r\n(" + now() +")"
        },{
        success: function() {
            response.success("email sent");
        },
        error: function() {
            response.error("Failed to send a mail..");
        }
    }); 
});

// send report
Parse.Cloud.job("report", function(request, status) {
    var classDetected = Parse.Object.extend('Detected');
    var query = new Parse.Query(classDetected);
    query.limit(30);
    query.descending('posted');
    query.find({
        success: function(results) {
            var msg = "";
            for (var i = 0; i < results.length; ++i) {
                var rec = results[i];
                var posted = results[i].get('posted');
                msg += toYYYYMMDD(posted, '-') + '\t' + 
                        toHHMNSS(posted, ':') + '\t' + 
                        rec.get('deviceId') + '\t' + 
                        rec.get('temperature') + '\r\n';
            }
            var Mailgun = require('mailgun');
            Mailgun.initialize(MAILGUN_DOMAIN, MAILGUN_KEY);
            Mailgun.sendEmail({
                to: MAILGUN_TO, 
                from: MAILGUN_FROM,
                subject: "Report (" + now().slice(0,-3) +")",
                text: msg
            },{
            success: function() {
                status.success("OK");
            },
            error: function() {
                status.error("Failed to send a mail");
            }
        }); 
        },
        error: function(query, error) {
            status.error("Error " + error.code + " : " + error.message)
        }
    });
});

function toYYYYMMDD(date, sep) {
    var y = date.getFullYear();
    var m = '0' + date.getMonth() + 1;
    var d = '0' + date.getDate();
    return y + sep + m.slice(-2) + sep + d.slice(-2);
}

function toHHMNSS(date, sep) {
    var h = '0' + date.getHours();
    var m = '0' + date.getMinutes();
    var s = '0' + date.getSeconds();
    return h.slice(-2) + sep + m.slice(-2) + sep + s.slice(-2);
}

function dateTokyo() {
    var d = new Date();
    d.setHours(d.getHours() + 9);
    return d;
}

function now() {
    var now = dateTokyo();
    return toYYYYMMDD(now, '-') + ' ' + toHHMNSS(now, ':');
}

