Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");

const ExtGMailGuid = "{42040a50-44a3-11da-8cd6-0800200c9a66}";

const szVersionNumber = "V20060829100000";

/******************************  GMail ***************************************/
function nsGMailSMTP()
{
    try
    {
        var scriptLoader =  Components.classes["@mozilla.org/moz/jssubscript-loader;1"]
        scriptLoader = scriptLoader.getService(Components.interfaces.mozIJSSubScriptLoader);
        scriptLoader.loadSubScript("chrome://web-mail/content/common/DebugLog.js");
        scriptLoader.loadSubScript("chrome://web-mail/content/common/Email.js");
        scriptLoader.loadSubScript("chrome://web-mail/content/common/CommonPrefs.js");
        scriptLoader.loadSubScript("chrome://web-mail/content/common/HttpComms3.js");
        scriptLoader.loadSubScript("chrome://web-mail/content/common/base64.js");
        scriptLoader.loadSubScript("chrome://gmail/content/GMailMSG.js");
        scriptLoader.loadSubScript("chrome://gmail/content/HTML-escape.js");

        var date = new Date();
        var szLogFileName = "GMailLog_SMTP_" + date.getHours()+ "_" + date.getMinutes() + "_"+ date.getUTCMilliseconds() +"_";
        // var szLogFileName = "GMailLog_";
        this.m_Log = new DebugLog("webmail.logging.comms", ExtGMailGuid, szLogFileName);

        this.m_Log.Write("nsGMailSMTP.js " + szVersionNumber + " - Constructor - START");

        if (typeof PatternGmailConstants == "undefined")
        {
            this.m_Log.Write("nsGMailSMTP.js - Constructor - loading constants");
            scriptLoader.loadSubScript("chrome://gmail/content/Gmail-Constants.js");
        }

        this.m_DomainManager =  Components.classes["@mozilla.org/GMailDomains;1"]
                                          .getService()
                                          .QueryInterface(Components.interfaces.nsIGMailDomains);

        this.m_szMailURL = "http://mail.google.com/mail/"
        this.m_bAuthorised = false;
        this.m_szUserName = null;
        this.m_szPassWord = null;
        this.m_oResponseStream = null;
        this.m_HttpComms = new HttpComms(this.m_Log);
        this.m_HttpComms.setUserAgentOverride(true);

        this.m_iStage = 0;
        this.m_szGMailAtCookie = null;
        this.m_aMsgDataStore = new Array();
        this.m_iTotalSize = 0;
        this.m_Email = new email(this.m_Log);
        this.m_base64 = new base64();
        this.m_Email.decodeBody(true);
        this.m_aszTo = new Array;
        this.m_szFrom = null;
        this.m_szCookieLoginURL = null;
        this.m_szIK = null;
        this.m_iAttachCount = 0;
        this.m_szOauth = null;
        this.m_aszAttid = new Array;
        this.m_aszFcid = new Array;
        // this.m_bReEntry = false;
        // this.m_bAttHandled = false;
        this.m_szCommon = "";
        this.m_szMsgID = 0;
        this.m_Log.Write("nsGMailSMTP.js - Constructor - END");

        this.m_ComponentManager = Components.classes["@mozilla.org/ComponentData2;1"]
                                            .getService(Components.interfaces.nsIComponentData2);

        //do i reuse the session
        var oPref = new Object();
        oPref.Value = null;
        var  WebMailPrefAccess = new WebMailCommonPrefAccess();
        if (WebMailPrefAccess.Get("bool","gmail.bReUseSession",oPref))
            this.m_bReUseSession = oPref.Value;
        else
            this.m_bReUseSession = false;

        this.m_Log.Write("nsGMailSMTP.js - Constructor - bReUseSession : " + this.m_bReUseSession);

        //do i save copy
        /*
        var oPref = new Object();
        oPref.Value = null;
        var  PrefAccess = new WebMailCommonPrefAccess();
        if (PrefAccess.Get("bool","gmail.bSaveCopy",oPref))
            this.m_bSaveCopy = oPref.Value;
        else
            this.m_bSaveCopy = true;
        delete oPref;
        this.m_Log.Write("nsGMailSMTP.js - Constructor - bSaveCopy : " + this.m_bSaveCopy);
        */

        this.m_Log.Write("nsGMailSMTP.js - Constructor - END");
    }
    catch(e) {
        DebugDump("nsGMailSMTP.js: Constructor : Exception : " + e.name + ".\nError message: " + e.message +"\n" + e.lineNumber);
    }
}


nsGMailSMTP.prototype =
{
    classDescription : "Webmail GMAIL mail SMTP",
    classID          : Components.ID("{09c77b00-b437-11da-a94d-0800200c9a66}"),
    contractID       : "@mozilla.org/GMailSMTP;1",

    QueryInterface : XPCOMUtils.generateQI([Components.interfaces.nsISupports,
                                            Components.interfaces.nsISMTPDomainHandler]),

    get userName() {return this.m_szUserName;},
    set userName(userName) {return this.m_szUserName = userName;},

    get passWord() {return this.m_szPassWord;},
    set passWord(passWord) {return this.m_szPassWord = passWord;},

    get bAuthorised() {return this.m_bAuthorised;},

    get ResponseStream() {return this.m_oResponseStream;},
    set ResponseStream(responseStream) {return this.m_oResponseStream = responseStream;},

    get to() {return this.m_aszTo;},
    set to(szAddress) {return this.m_aszTo.push(szAddress);},

    get from() {return this.m_szFrom;},
    set from(szAddress) {return this.m_szFrom = szAddress;},

    logIn : function()
    {
        try {
            this.m_Log.Write("nsGMailSMTP.js - logIN - START");
            this.m_Log.Write("nsGMailSMTP.js - logIN - Username: " + this.m_szUserName + " Password: "
                                                                   + this.m_szPassWord + " stream: "
                                                                   + this.m_oResponseStream);

            if (!this.m_szUserName || !this.m_oResponseStream  || !this.m_szPassWord) return false;

            // get login webPage
            var szDomain = this.m_szUserName.match(/.*?@(.*?)$/)[1].toLowerCase();
            loginURL = "http://mail.google.com/mail/";
            if (szDomain == "gmail.com" || szDomain == "googlemail.com")
                loginURL = "http://mail.google.com/mail/";
            else
                loginURL = "http://mail.google.com/a/" + szDomain + "/";
       
            this.m_szMailURL = loginURL;


            this.m_HttpComms.setUserName(this.m_szUserName);

            var bSessionStored = this.m_ComponentManager.findElement(this.m_szUserName, "bSessionStored");
            if ( bSessionStored && this.m_bReUseSession )
            {
                this.m_Log.Write("nsGMailSMTP.js - logIN - Session Data found");

                this.serverComms("+OK Your in\r\n");
                this.m_bAuthorised = true;
            }
            else
            {
                this.m_Log.Write("nsGMailSMTP.js - logIN - No Session Data found");
                var oCookies = Components.classes["@mozilla.org/nsWebMailCookieManager2;1"]
                                         .getService(Components.interfaces.nsIWebMailCookieManager2);
                oCookies.removeCookie(this.m_szUserName);
                this.m_ComponentManager.deleteAllElements(this.m_szUserName);

                this.m_HttpComms.setURI(loginURL);
                this.m_HttpComms.setRequestMethod("GET");

                var bResult = this.m_HttpComms.send(this.loginOnloadHandler, this);
                if (!bResult) throw new Error('httpConnection returned false');
                this.m_iStage = 0;
            }

            this.m_Log.Write("nsGMailSMTP.js - logIN - END");
            return true;
        }
        catch(e)
        {
            this.m_Log.DebugDump("nsGMailSMTP.js: logIN : Exception : " + e.name
                                                     + ".\nError message: " + e.message+ "\n"
                                                     + e.lineNumber);
            this.serverComms("502 negative vibes from "+this.m_szUserName+"\r\n");
            return false;
        }
    },

    loginOnloadHandler : function(szResponse ,event , mainObject)
    {
        try
        {
            mainObject.m_Log.Write("nsGMailSMTP.js - loginOnloadHandler - START");
            mainObject.m_Log.Write("nsGMailSMTP.js - loginOnloadHandler : " + mainObject.m_iStage);

            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);

            //if this fails we've gone somewhere new
            mainObject.m_Log.Write("nsGMailSMTP.js - loginOnloadHandler - status :" + httpChannel.responseStatus );
            if (httpChannel.responseStatus != 200)
                throw new Error("return status " + httpChannel.responseStatus);

            //bounce check or welcome page
            if (szResponse.search(patternGMailLoginBounce)!=-1 || 
            		szResponse.search(PatternGmailWelcome)!=-1)
            {
                mainObject.m_Log.Write("nsGMailPOP.js - loginOnloadHandler - bounce/Welcome");
                var oEscape = new HTMLescape();
                var szClean = oEscape.decode(szResponse);
                delete oEscape;
                var szURI = ""
                	if (szResponse.search(PatternGmailWelcome)!=-1)
                		szURI = szClean.match(PatternGmailWelcome)[1];
                	else
                		szURI = szClean.match(patternGMailLoginBounce)[1];
                mainObject.m_Log.Write("nsGMailPOP.js - loginOnloadHandler - redirectURL " + szURI);

                mainObject.m_HttpComms.setURI(szURI);
                mainObject.m_HttpComms.setRequestMethod("GET");
                var bResult = mainObject.m_HttpComms.send(mainObject.loginOnloadHandler, mainObject);
                if (!bResult) throw new Error("httpConnection returned false");
                return;
            }
            
            
            switch  ( mainObject.m_iStage )
            {
                case 0:  //login
                    mainObject.m_Log.Write("nsGMailSMTP.js - loginOnloadHandler - login");

                    var aszLoginForm = szResponse.match(patternGMailLoginForm);
                    mainObject.m_Log.Write("nsGMailSMTP.js - loginOnloadHandler - aszLoginForm " + aszLoginForm);

                    var szAction = aszLoginForm[0].match(patternGMailFormAction)[1];
                    mainObject.m_Log.Write("nsGMailSMTP.js - loginOnloadHandler - szAction " + szAction);

                    var aszInput = aszLoginForm[0].match(patternGMailFormInput);
                    mainObject.m_Log.Write("nsGMailSMTP.js - loginOnloadHandler - aszInput " + aszInput);

                    for (i=0; i<aszInput.length; i++)
                    {
                        mainObject.m_Log.Write("nsGMailSMTP.js - loginOnloadHandler - aszInput[i] " + aszInput[i]);

                        var szName = aszInput[i].match(patternGMailFormName)[1];
                        mainObject.m_Log.Write("nsGMailSMTP.js - loginOnloadHandler - szName " + szName);

                        var szValue = "";
                        try
                        {
                            var szValue = aszInput[i].match(patternGMailFormValue)[1];
                        }
                        catch (e)
                        {
                        }
                        mainObject.m_Log.Write("nsGMailSMTP.js - loginOnloadHandler - szValue " + szValue);

                        if (szName.search(/Passwd/i) != -1) szValue = mainObject.m_szPassWord;
                        if (szName.search(/Email/i) != -1)
                        {
                            var szUserName = mainObject.m_szUserName.match(/(.*?)@.*?$/)[1].toLowerCase();
                            szValue = szUserName;
                        }

                        mainObject.m_HttpComms.addValuePair(szName, encodeURIComponent(szValue));
                    }

                    mainObject.m_HttpComms.setURI(szAction);
                    mainObject.m_HttpComms.setRequestMethod("POST");
                    var bResult = mainObject.m_HttpComms.send(mainObject.loginOnloadHandler, mainObject);
                    if (!bResult) throw new Error("httpConnection returned false");
                    mainObject.m_iStage++;
                break;

                case 1:
                    if ( szResponse.search(/logout/i) == -1 && szResponse.search(/ManageAccount/i)==-1)
                        throw new Error("Invalid Password");

                    mainObject.m_Log.Write("nsGMailSMTP.js - loginOnloadHandler - Getting session cookie...");

                    var szLocation  = httpChannel.URI.spec;
                    mainObject.m_Log.Write("nsGMailPOP.js - loginOnloadHandler - location : " + szLocation );

                    var IOService = Components.classes["@mozilla.org/network/io-service;1"]
                                              .getService(Components.interfaces.nsIIOService);

                    var nsIURI = IOService.newURI(szLocation, null, null);
                    var oCookies = Components.classes["@mozilla.org/nsWebMailCookieManager2;1"]
                                             .getService(Components.interfaces.nsIWebMailCookieManager2);
                    //szCookies = oCookies.findCookie(mainObject.m_szUserName, nsIURI);
                    szCookies = oCookies.findCookie(mainObject.m_szUserName, szLocation);
                    mainObject.m_Log.Write("nsGMailSMTP.js - loginOnloadHandler - session cookies:\n" + szCookies);

                    mainObject.m_szGMailAtCookie = szCookies.match(PatternGMailGetSessionCookie)[1];
                    if ( mainObject.m_szGMailAtCookie == null)
                        throw new Error("Error getting session cookie during login");

                    mainObject.m_Log.Write("nsGMailSMTP.js - loginOnloadHandler - szGMAIL_AT: " + mainObject.m_szGMailAtCookie);

                    if (szLocation.search(/\?/)!= -1)
                    	mainObject.m_szMailURL = szLocation.match(/^(.*?)\?/)[1];
                    else 
                    	mainObject.m_szMailURL = szLocation;
                    mainObject.m_Log.Write("nsGMailPOP.js - loginOnloadHandler - m_szMailURL: " + mainObject.m_szMailURL);

                    var szInboxURI = mainObject.m_szMailURL + "?search=inbox&view=tl&start=0&init=1&ui=1"
                    mainObject.m_HttpComms.setURI(szInboxURI);
                    mainObject.m_HttpComms.setRequestMethod("GET");
                    var bResult = mainObject.m_HttpComms.send(mainObject.loginOnloadHandler, mainObject);
                    if (!bResult) throw new Error("httpConnection returned false");
                    mainObject.m_iStage++;
                break;

                case 2:
                	try
                	{
                        mainObject.m_szIK = szResponse.match(PatternGMailIKAlt)[1];
                        mainObject.m_Log.Write("nsGMailPOP.js - mailBoxOnloadHandler - szIK :" + mainObject.m_szIK);
                	}
                	catch(err)
                	{ 
                		mainObject.m_szIK = szResponse.match(PatternGMailIK)[1];
                        mainObject.m_Log.Write("nsGMailPOP.js - mailBoxOnloadHandler - szIK Alt:" + mainObject.m_szIK);                    		
                	}
                    
                    mainObject.serverComms("235 Your In\r\n");
                    mainObject.m_bAuthorised = true;
                break;
            }

            mainObject.m_Log.Write("nsGMailSMTP.js - loginOnloadHandler - END");
        }
        catch(err)
        {
            var oCookies = Components.classes["@mozilla.org/nsWebMailCookieManager2;1"]
                                     .getService(Components.interfaces.nsIWebMailCookieManager2);
            oCookies.removeCookie(mainObject.m_szUserName);

            mainObject.m_ComponentManager.deleteAllElements(mainObject.m_szUserName);

            mainObject.m_Log.DebugDump("nsGMailSMTP.js: loginHandler : Exception : " + err.name
                                        + ".\nError message: " + err.message+ "\n" + err.lineNumber);
            mainObject.serverComms("502 negative vibes from "+mainObject.m_szUserName+"\r\n");
        }
    },



    rawMSG : function (szEmail)
    {
        try
        {
            this.m_Log.Write("nsGMailSMTP.js - rawMSG - START");
            this.m_Log.Write("nsGMailSMTP.js - rawMSG " + szEmail);

            if ( this.m_bAuthorised == false )return false;

            this.m_iStage =0 ;
            if ( !this.m_Email.parse(szEmail) ) throw new Error ("Parse Failed")

            if ( this.m_Email.attachments.length>0 )
            {
                this.m_Log.Write("nsGMailSMTP.js: rawMSG: nAttachments: " + this.m_Email.attachments.length );
                var szURI = this.m_szMailURL + "ota";

                this.m_HttpComms.setURI(szURI);
                this.m_HttpComms.setRequestMethod("POST");
                var bResult = this.m_HttpComms.send(this.attachmentUploadHandler, this);
                if (!bResult) throw new Error("httpConnection returned false");
                this.m_iStage =0;
                this.m_szCommon = this.randomString(5);
            }
            else
                this.message();

            this.m_Log.Write("nsGMailSMTP.js - rawMSG - END");
            return true;
        }
        catch(err)
        {
            this.m_Log.DebugDump("nsGMailSMTP.js: rawMSG : Exception : " + err.name +
                                 ".\nError message: " + err.message+ "\n" + err.lineNumber);
            return false;
        }
    },


    attachmentUploadHandler : function(szResponse ,event , mainObject)
    {
        try
        {
            mainObject.m_Log.Write("nsGMailSMTP.js - attachmentUploadHandler - START");
            mainObject.m_Log.Write("nsGMailSMTP.js - attachmentUploadHandler : " + mainObject.m_iStage);

            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);

            //if this fails we've gone somewhere new
            mainObject.m_Log.Write("nsGMailSMTP.js - attachmentUploadHandler - status :" + httpChannel.responseStatus );
            if (httpChannel.responseStatus != 200)
                throw new Error("return status " + httpChannel.responseStatus);


            switch  ( mainObject.m_iStage )
            {
                case 0: //oauth
                    mainObject.m_szOauth =  szResponse;
                    mainObject.m_Log.Write("nsGMailSMTP.js - m_szOauth  :" + mainObject.m_szOauth);

                    mainObject.m_Log.Write("nsGMailSMTP.js - attachmentUploadHandler - uploading attach");

                    var szAttid =  "f_gg" + mainObject.m_szCommon  +  mainObject.randomString(1) +
                                            mainObject.m_iAttachCount;

                    mainObject.m_aszFcid[mainObject.m_iAttachCount]  =  "gg" +  mainObject.m_szCommon  +
                                                                                mainObject.randomString(5);

                    var oAttach = mainObject.m_Email.attachments[mainObject.m_iAttachCount];
                    var szFileName = oAttach.headers.getContentType(4);
                    if (!szFileName) szFileName = "File";
                    var szDisposition = "attachment; filename=\""+ szFileName +"\"";
                    mainObject.m_HttpComms.addRequestHeader("Content-Disposition",szDisposition,false);

                    mainObject.m_HttpComms.addData(oAttach.body.getBody(),true);
                    var szURI = mainObject.m_szMailURL +"?ui=2&act=fup&view=up&rt=j"
                    szURI += "&ik=" + mainObject.m_szIK;
                    szURI += "&oauth=" + encodeURIComponent(mainObject.m_szOauth);
                    szURI += "&attid=" + szAttid;
                    szURI += "&fcid=" + mainObject.m_aszFcid[mainObject.m_iAttachCount];

                    mainObject.m_HttpComms.setURI(szURI);
                    mainObject.m_iAttachCount++;
                    mainObject.m_HttpComms.setRequestMethod("POST");
                    mainObject.m_HttpComms.setContentType("application/octet-stream");
                    var bResult = mainObject.m_HttpComms.send(mainObject.attachmentUploadHandler, mainObject);
                    if (!bResult) throw new Error("httpConnection returned false");

                    if (mainObject.m_iAttachCount >= mainObject.m_Email.attachments.length)
                        mainObject.m_iStage=2;
                    else
                        mainObject.m_iStage=1;
                break;

                case 1:
                    mainObject.m_HttpComms.setURI(mainObject.m_szMailURL + "ota");
                    mainObject.m_HttpComms.setRequestMethod("POST");
                    var bResult = mainObject.m_HttpComms.send(mainObject.attachmentUploadHandler, mainObject);
                    if (!bResult) throw new Error("httpConnection returned false");
                    mainObject.m_iStage =0;
                break;

                case 2:
                    mainObject.message();
                break;
            }

            mainObject.m_Log.Write("nsGMailSMTP.js - attachmentUploadHandler - end");
        }
        catch(err)
        {
            mainObject.m_Log.DebugDump("nsGMailSMTP.js: attachmentUploadHandler : Exception : " + err.name +
                                       ".\nError message: " + err.message+ "\n" + err.lineNumber);
            mainObject.serverComms("502 negative vibes from " + mainObject.m_szUserName + "\r\n");
            return false;
        }
    },


    composerOnloadHandler : function(szResponse ,event , mainObject)
    {
        try {
            mainObject.m_Log.Write("nsGMailSMTP.js - composerOnloadHandler - START");
            mainObject.m_Log.Write("nsGMailSMTP.js - composerOnloadHandler : " + mainObject.m_iStage);

            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);
            mainObject.m_Log.Write("nsGMailSMTP.js - composerOnloadHandler - status :" + httpChannel.responseStatus );

            if ( mainObject.m_bReUseSession)
            {
                mainObject.m_Log.Write("nsGMailPOP.js - loginOnloadHandler - Saving session Data");
                mainObject.m_ComponentManager.addElement(mainObject.m_szUserName, "bSessionStored", true);
            }
            else
            {
                var oCookies = Components.classes["@mozilla.org/nsWebMailCookieManager2;1"]
                                         .getService(Components.interfaces.nsIWebMailCookieManager2);
                oCookies.removeCookie(mainObject.m_szUserName);

                mainObject.m_ComponentManager.deleteAllElements(mainObject.m_szUserName);
            }

            mainObject.serverComms("250 OK\r\n");
            mainObject.m_Log.Write("nsGMailSMTP.js - composerOnloadHandler - END");
        }
        catch(err) {
            mainObject.m_Log.DebugDump("nsGMailSMTP.js: composerOnloadHandler : Exception : " +
                                            err.name + ".\nError message: " + err.message + "\n" + err.lineNumber);
            mainObject.serverComms("502 negative vibes from " + mainObject.m_szUserName + "\r\n");
        }
    },


    message : function()
    {
        try
        {
            this.m_Log.Write("nsGMailSMTP.js - message - start ");

            var szTo = this.m_Email.headers.getTo();
            var szCc = this.m_Email.headers.getCc();
            var szBCC = this.getBcc(szTo, szCc);

            var szSubject = this.m_Email.headers.getSubject();
            szSubject = szSubject ? szSubject : " " ;
           // szSubject = encodeURIComponent(szSubject);
            this.m_Log.Write("nsGMailSMTP.js - message - szSubject "+szSubject);

            var szContentType = null;
            var szCharset = null;

            try
            {
                 szContentType = this.m_Email.txtBody.headers.getContentType(0);
            }
            catch(e)
            {
                try
                {
                    szContentType = this.m_Email.htmlBody.headers.getContentType(0);
                }
                catch(err)
                {
                    szContentType = this.m_Email.headers.getContentType(0);
                }
            }
            this.m_Log.Write("nsGMailSMTP.js - message szContentType " + szContentType);

            if (szContentType)
            {
                if (szContentType.search(/charset/i)!=-1)
                {
                    if (szContentType.search(/charset=(.*?);\s/i)!=-1)
                        szCharset = szContentType.match(/charset=(.*?);\s/i)[1];
                    else
                       szCharset = szContentType.match(/charset=(.*?)$/i)[1];
                    this.m_Log.Write("nsGMailSMTP.js - message -szCharset " + szCharset);
                }
            }

            var szMsgBody = " ";
            if ( this.m_Email.txtBody )
            {
                szMsgBody = this.m_Email.txtBody.body.getBody();
                if (szCharset)
                    szMsgBody = this.convertToUTF8(szMsgBody, szCharset);
            }

            this.m_HttpComms.addValuePair('to', (szTo? szTo : "") );
            this.m_HttpComms.addValuePair('cc', (szCc? szCc : "") );
            this.m_HttpComms.addValuePair('bcc', (szBCC? szBCC : "") );
            this.m_HttpComms.addValuePair('subject', szSubject);


            if ( this.m_aszFcid.length>0 )
            {
                for ( i=0 ; i< this.m_aszFcid.length ; i++ )
                {
                    this.m_Log.Write("nsGMailSMTP.js: message: adding attachment" );
                    this.m_HttpComms.addValuePair('att_f', this.m_aszFcid[i]);
                }
            }


            if ( this.m_Email.htmlBody )
            {
                this.m_Log.Write("nsGMailSMTP.js: message: isHTML");

                this.m_HttpComms.addValuePair('ishtml', "1" );
                szMsgBody = this.m_Email.htmlBody.body.getBody();
                if (szCharset)
                    szMsgBody = this.convertToUTF8(szMsgBody, szCharset);
                //szMsgBody = encodeURIComponent(szMsgBody);
            }
            this.m_HttpComms.addValuePair('body', (szMsgBody? szMsgBody : " ") );


            var szComposeURI = this.m_szMailURL+"?ui=2&act=sm&cmid=2";
            szComposeURI += "&at=" + this.m_szGMailAtCookie;
            szComposeURI += "&ik=" + this.m_szIK;
           // this.m_HttpComms.setContentType("application/x-www-form-urlencoded");
            this.m_HttpComms.setContentType("multipart/form-data");
            this.m_HttpComms.setURI(szComposeURI);
            this.m_HttpComms.setRequestMethod("POST");
            var bResult = this.m_HttpComms.send(this.composerOnloadHandler, this);
            if ( !bResult ) throw new Error("httpConnection returned false");

            this.m_Log.Write("nsGMailSMTP.js - message - end ");
        }
        catch(err)
        {
            this.m_Log.DebugDump("nsGMailSMTP.js: message : Exception : "
                                    + err.name
                                    + ".\nError message: "
                                    + err.message + "\n"
                                    + err.lineNumber);
        }
    },



    randomString : function (len, charSet)
    {
        //charSet = charSet || 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        charSet = charSet || 'abcdefghijklmnopqrstuvwxyz0123456789';
        var randomString = '';
        for (var i = 0; i < len; i++)
        {
            var randomPoz = Math.floor(Math.random() * charSet.length);
            randomString += charSet.substring(randomPoz,randomPoz+1);
        }
        return randomString;
    },


    escapeStr : function(szMSG)
    {
        var szEncode = escape(szMSG);
        szEncode = szEncode.replace(/%20/gm,"+"); //replace space
        return szEncode;
    },

    getBcc : function (szTo,szCc)
    {
        try
        {
            this.m_Log.Write("nsGMailSMTP.js - getBcc - START");
            if (this.m_aszTo.length==0) return null;
            this.m_Log.Write("nsGMailSMTP.js - getBcc - szRcptList " + this.m_aszTo);

            var szBcc = null;
            var szAddress = null;
            if (szTo) szAddress = szTo;
            if (szCc) szAddress = (szTo ? (szAddress + ","+ szCc) : szCc);
            this.m_Log.Write("nsGMailSMTP.js - getBcc - szAddress " + szAddress);

            if (!szAddress)
                szBcc = this.m_aszTo;
            else
            {
                for (j=0; j<this.m_aszTo.length; j++)
                {
                    var regExp = new RegExp(this.m_aszTo[j]);
                    if (szAddress.search(regExp)==-1)
                    {
                        szBcc? (szBcc += this.m_aszTo[j]) : (szBcc = this.m_aszTo[j]);
                        szBcc +=",";
                    }
                }
            }
            this.m_Log.Write("nsGMailSMTP.js - getBcc szBcc- " + szBcc);

            this.m_Log.Write("nsGMailSMTP.js - getBcc - End");
            return szBcc;
        }
        catch(err)
        {
            this.m_Log.DebugDump("nsGMailSMTP.js: getBcc : Exception : "
                                                  + err.name
                                                  + ".\nError message: "
                                                  + err.message + "\n"
                                                  + err.lineNumber);

            return null;
        }
    },



    convertToUTF8 : function (szRawMSG, szCharset)
    {
        this.m_Log.Write("nsGMailSMTP - convertToUTF8 START " +szCharset );

        var aszCharset = new Array( "ISO-2022-CN" , "ISO-2022-JP"  , "ISO-2022-KR" , "ISO-8859-1"  , "ISO-8859-10",
                                    "ISO-8859-11" , "ISO-8859-12"  , "ISO-8859-13" , "ISO-8859-14" , "ISO-8859-15",
                                    "ISO-8859-16" , "ISO-8859-2"   , "ISO-8859-3"  , "ISO-8859-4"  , "ISO-8859-5" ,
                                    "ISO-8859-6"  , "ISO-8859-6-E" , "ISO-8859-6-I", "ISO-8859-7"  , "ISO-8859-8" ,
                                    "ISO-8859-8-E", "ISO-8859-8-I" , "ISO-8859-9"  , "ISO-IR-111"  ,
                                    "UTF-8"       , "UTF-16"       , "UTF-16BE"    , "UTF-16LE"    , "UTF-32BE"   ,
                                    "UTF-32LE"    , "UTF-7"        ,
                                    "IBM850"      , "IBM852"       , "IBM855"      , "IBM857"      , "IBM862"     ,
                                    "IBM864"      , "IBM864I"      , "IBM866"      ,
                                    "WINDOWS-1250", "WINDOWS-1251" , "WINDOWS-1252", "WINDOWS-1253", "WINDOWS-1254",
                                    "WINDOWS-1255", "WINDOWS-1256" , "WINDOWS-1257", "WINDOWS-1258", "WINDOWS-874" ,
                                    "WINDOWS-936" ,
                                    "BIG5"        , "BIG5-HKSCS"   , "EUC-JP"      , "EUC-KR"      , "GB2312"     ,
                                    "X-GBK"       , "GB18030"      , "HZ-GB-2312"  , "ARMSCII-8"   , "GEOSTD8"    ,
                                    "KOI8-R"      , "KOI8-U"       , "SHIFT_JIS"   , "T.61-8BIT"   , "TIS-620"    ,
                                    "US-ASCII"    , "VIQR"         , "VISCII"      ,
                                    "X-EUC-TW"       , "X-JOHAB"                , "X-MAC-ARABIC"          , "X-MAC-CE"       ,
                                    "X-MAC-CROATIAN" , "X-MAC-GREEK"            , "X-MAC-HEBREW"          , "X-MAC-ROMAN"    ,
                                    "X-MAC-TURKISH"  , "X-MAC-ICELANDIC"        , "X-U-ESCAPED"           , "X-MAC-CYRILLIC" ,
                                    "X-MAC-UKRAINIAN", "X-MAC-ROMANIAN"         , "X-OBSOLETED-EUC-JP"    , "X-USER-DEFINED" ,
                                    "X-VIET-VNI"     , "X-VIET-VPS"             , "X-IMAP4-MODIFIED-UTF7" , "X-VIET-TCVN5712",
                                    "X-WINDOWS-949"  , "X-OBSOLETED-ISO-2022-JP", "X-OBSOLETED-SHIFT_JIS"
                                  );

        var szUseCharSet = "US-ASCII";
        var i = 0;
        var bFound = false;
        do{
            if (aszCharset[i] == szCharset.toUpperCase())
            {
                bFound = true;
                szUseCharSet =  szCharset.toUpperCase();
            }
            i++;
        }while (i<aszCharset.length && !bFound)
        this.m_Log.Write("nsGMailSMTP - convertToUTF8 use charset " + szUseCharSet);

        var Converter = Components.classes["@mozilla.org/intl/scriptableunicodeconverter"]
                                  .getService(Components.interfaces.nsIScriptableUnicodeConverter);
        Converter.charset =  szUseCharSet;
        var unicode =  Converter.ConvertToUnicode(szRawMSG);
        Converter.charset = "UTF-8";
        var szDecoded = Converter.ConvertFromUnicode(unicode)+ Converter.Finish();
        this.m_Log.Write("nsGMailSMTP - convertToUTF8 - "+szDecoded);

        this.m_Log.Write("nsGMailSMTP - convertToUTF8 END");
        return szDecoded;
    },



    ////////////////////////////////////////////////////////////////////////////
    /////  Comms

    serverComms : function (szMsg)
    {
        try
        {
            this.m_Log.Write("nsGMailSMTP.js - serverComms - START");
            this.m_Log.Write("nsGMailSMTP.js - serverComms msg " + szMsg);
            var iCount = this.m_oResponseStream.write(szMsg,szMsg.length);
            this.m_Log.Write("nsGMailSMTP.js - serverComms sent count: " + iCount
                                                        +" msg length: " +szMsg.length);
            this.m_Log.Write("nsGMailSMTP.js - serverComms - END");
        }
        catch(e)
        {
            this.m_Log.DebugDump("nsGMailSMTP.js: serverComms : Exception : "
                                              + e.name
                                              + ".\nError message: "
                                              + e.message+ "\n"
                                              + e.lineNumber);
        }
    }
};

/**
* XPCOMUtils.generateNSGetFactory was introduced in Mozilla 2 (Firefox 4).
* XPCOMUtils.generateNSGetModule is for Mozilla 1.9.2 (Firefox 3.6).
*/
if (XPCOMUtils.generateNSGetFactory)
    var NSGetFactory = XPCOMUtils.generateNSGetFactory([nsGMailSMTP]);
else
    var NSGetModule = XPCOMUtils.generateNSGetModule([nsGMailSMTP]);

