/******************************  Yahoo BETA ***************************************/
function YahooSMTPBETA(oResponseStream, oLog, oPref)
{
    try
    {
        var scriptLoader =  Components.classes["@mozilla.org/moz/jssubscript-loader;1"];
        scriptLoader = scriptLoader.getService(Components.interfaces.mozIJSSubScriptLoader);

        scriptLoader.loadSubScript("chrome://web-mail/content/common/DebugLog.js");
        scriptLoader.loadSubScript("chrome://web-mail/content/common/CommonPrefs.js");
        scriptLoader.loadSubScript("chrome://web-mail/content/common/Email.js");
        scriptLoader.loadSubScript("chrome://web-mail/content/common/HttpComms3.js");
        scriptLoader.loadSubScript("chrome://yahoo/content/Yahoo-Prefs-Accounts-Data.js");
        scriptLoader.loadSubScript("chrome://yahoo/content/HTML-escape.js");

        this.m_Log = oLog;
        this.m_Log.Write("YahooSMTPBETA.js - Constructor - START");

        //prefs
        this.m_bReUseSession = oPref.bReUseSession;    //reuse session
        this.m_bSaveCopy = oPref.bSaveSentItem;        // save copy in sent items

        //comms
        this.m_oResponseStream = oResponseStream;
        this.m_HttpComms = new HttpComms(this.m_Log);
        this.m_HttpComms.setUserAgentOverride(true);

        this.m_bAuthorised = false;
        this.m_szUserName = null;
        this.m_szPassWord = null;
        this.m_szLoginUserName = null;
        this.m_iStage = 0;
        this.m_szLocationURI = null;
        this.m_szYahooMail = null;
        this.m_szHomeURI = null;
        this.m_bReEntry = false;
        this.m_aLoginForm = null;
        this.m_iLoginCount = 0;
        this.m_szImageVerForm = null;
        this.m_szSpamURL = null;
        this.m_szID = null;
        this.m_Email = new email("");
        this.m_Email.decodeBody(true);
        this.m_szData = null;
        this.m_aszFileIDs = new Array();
        this.m_iAttCount = 0;
        this.m_szCred = null;

        this.m_ComponentManager = Components.classes["@mozilla.org/ComponentData2;1"]
                                            .getService(Components.interfaces.nsIComponentData2);

        this.m_Log.Write("YahooSMTPBETA.js - Constructor - END");
    }
    catch(e)
    {
        DebugDump("YahooSMTPBETA.js: Constructor : Exception : "
                                      + e.name
                                      + ".\nError message: "
                                      + e.message +"\n"
                                      + e.lineNumber);
    }
}



YahooSMTPBETA.prototype =
{
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


    logIn : function(szUserName, szPassWord)
    {
        try
        {
            this.m_Log.Write("YahooSMTPBETA.js - logIN - START");
            this.m_Log.Write("YahooSMTPBETA.js - logIN - Username: " + szUserName
                                                   + " Password: " + szPassWord
                                                   + " stream: " + this.m_oResponseStream);

            if (!szUserName || !szPassWord || !this.m_oResponseStream) return false;
            this.m_szPassWord = szPassWord
            this.m_szUserName =szUserName

            this.m_szYahooMail = "http://mail.yahoo.com";
            this.m_szLoginUserName = this.m_szUserName;

            if (this.m_szUserName.search(/yahoo/i)!=-1)
            {
                if (this.m_szUserName.search(/yahoo\.co\.jp/i)!=-1)
                    this.m_szYahooMail = "http://mail.yahoo.co.jp/";

                //remove domain from user name
                this.m_szLoginUserName = this.m_szUserName.match(/(.*?)@/)[1].toLowerCase();
            }
            else if (this.m_szUserName.search(/@talk21.com$/i)!=-1 ||
                     this.m_szUserName.search(/@btinternet.com$/i)!=-1  ||
                     this.m_szUserName.search(/@btopenworld.com$/i)!=-1 )
            {
                this.m_szYahooMail = "http://bt.yahoo.com/";
            }


            this.m_iStage = 0;
            this.m_HttpComms.setURI(this.m_szYahooMail);
            this.m_HttpComms.setUserName(this.m_szUserName);
            this.m_HttpComms.setRequestMethod("GET");

            if (this.m_bReUseSession)
            {
                this.m_Log.Write("YahooSMTPBETA.js - logIN - Getting Session Data");
                this.m_szHomeURI = this.m_ComponentManager.findElement(this.m_szUserName, "szHomeURI");
                this.m_Log.Write("YahooSMTPBETA - logIN - m_szLocation " +this.m_szHomeURI);
                if (this.m_szHomeURI)
                {
                    this.m_Log.Write("YahooSMTPBETA.js - logIN - Session Data Found");
                    this.m_iStage =2;
                    this.m_bReEntry = true;
                    this.m_HttpComms.setURI(this.m_szHomeURI);
                }
                else
                {
                    this.m_ComponentManager.deleteAllElements(this.m_szUserName);

                    var oCookies = Components.classes["@mozilla.org/nsWebMailCookieManager2;1"]
                                             .getService(Components.interfaces.nsIWebMailCookieManager2);
                    oCookies.removeCookie(this.m_szUserName);
                }
            }
            else
            {
                this.m_ComponentManager.deleteAllElements(this.m_szUserName);

                var oCookies = Components.classes["@mozilla.org/nsWebMailCookieManager2;1"]
                                         .getService(Components.interfaces.nsIWebMailCookieManager2);
                oCookies.removeCookie(this.m_szUserName);
            }


            var bResult = this.m_HttpComms.send(this.loginOnloadHandler,this);
            if (!bResult) throw new Error("httpConnection returned false");

            this.m_Log.Write("YahooSMTPBETA.js - logIN - END");
            return true;
        }
        catch(e)
        {
            this.m_Log.DebugDump("YahooSMTPBETA.js: logIN : Exception : "
                                              + e.name +
                                              ".\nError message: "
                                              + e.message+ "\n"
                                              + e.lineNumber);

            this.serverComms("502 negative vibes from "+this.m_szUserName+"\r\n");

            return false;
        }
    },


    loginOnloadHandler : function(szResponse ,event , mainObject)
    {
        try
        {
            mainObject.m_Log.Write("YahooSMTPBETA.js - loginOnloadHandler - START");
            mainObject.m_Log.Write("YahooSMTPBETA.js - loginOnloadHandler : " + mainObject.m_iStage );

            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);

            //if this fails we've gone somewhere new
            mainObject.m_Log.Write("YahooSMTPBETA.js - loginOnloadHandler - status :" +httpChannel.responseStatus );
            if (httpChannel.responseStatus != 200)
            {
                if (szResponse.search(/SessionIdReissue/igm)!=-1)
                {
                    mainObject.m_Log.Write("YahooSMTPBETA.js - loginOnloadHandler : ID Reiussue" );
                    mainObject.m_szWssid = szResponse.match(/;wssid=(.*?)<\/url>/i)[1];
                    mainObject.m_Log.Write("YahooSMTPBETA.js - loginOnloadHandler - m_szWssid : "+mainObject.m_szWssid );

                    mainObject.m_bReEntry = false;
                    var szURI = szResponse.match(/<url>(.*?)<\/url>/i)[1];
                    var oEscapeDecode = new HTMLescape();
                    szURI = oEscapeDecode.decode(szURI);
                    delete oEscapeDecode;
                    mainObject.m_Log.Write("YahooSMTPBETA.js - loginOnloadHandler - szURI " + szURI);
                    mainObject.m_HttpComms.setURI(szURI);
                    mainObject.m_HttpComms.setRequestMethod("POST");
                    mainObject.m_HttpComms.setContentType("application/xml");
                    mainObject.m_HttpComms.addData(kListFolders);
                    var bResult = mainObject.m_HttpComms.send(mainObject.loginOnloadHandler, mainObject);
                    if (!bResult) throw new Error("httpConnection returned false");
                    return;
                }
                else
                    throw new Error("return status " + httpChannel.responseStatus);
            }

            if (szResponse.search(patternYahooLoginForm)!=-1)
            {
                if ( mainObject.m_iLoginCount<=3)
                {
                    if (szResponse.search(patternYahooLogInSpam)!=-1)
                    {
                        mainObject.m_Log.Write("YahooSMTPBETA.js - loginOnloadHandler - Spam Image found");
                        mainObject.m_iStage =3; //spam image found
                        mainObject.m_iLoginCount++;
                    }
                    else
                    {
                        mainObject.m_iLoginCount++;
                        mainObject.m_iStage =0;
                    }
                }
                else
                    throw new Error ("Too Many Login's");
            }

            if (mainObject.m_iStage == 0 && szResponse.search(kPatternLogOut)!=-1)
            {
                mainObject.m_Log.Write("YahooSMTPBETA.js - loginOnloadHandler - already login");
                mainObject.m_iStage =2; //logged in already
                mainObject.m_iLoginCount++;
            }

            if (mainObject.m_iStage == 1 && szResponse.search(kPatternWssid)!=-1)
            {
                mainObject.m_iStage =2; // no loggin redirect
            }

            //page code
            switch (mainObject.m_iStage)
            {
                case 0: // login page
                    var aLoginForm = szResponse.match(patternYahooNewLogin);
                    if (aLoginForm == null)
                         throw new Error("error parsing yahoo login web page");
                    mainObject.m_Log.Write("YahooSMTPBETA.js - loginOnloadHandler - loginForm " + aLoginForm);

                    var szLoginURL =  httpChannel.URI.prePath +  aLoginForm[0].match(patternYahooAction)[1];
                    mainObject.m_Log.Write("YahooSMTPBETA.js - loginOnloadHandler - loginURL " + szLoginURL);

                    var aLoginData = aLoginForm[0].match(patternYahooInput);
                    mainObject.m_Log.Write("YahooSMTPBETA.js - loginOnloadHandler - loginData " + aLoginData);

                    for (i=0; i<aLoginData.length; i++)
                    {
                        var szName=aLoginData[i].match(patternYahooNameAlt)[1];
                        szName = szName.replace(/"/gm,"");
                        szName = szName.replace(/'/gm,"");
                        mainObject.m_Log.Write("YahooSMTPBETA.js - loginOnloadHandler - loginData name " + szName);

                        var szValue = aLoginData[i].match(patternYahooAltValue)[1]
                        szValue = szValue.replace(/"/gm,"");
                        szValue = szValue.replace(/'/gm,"");
                        mainObject.m_Log.Write("YahooSMTPBETA.js - loginOnloadHandler - loginData value " + szValue);

                        mainObject.m_HttpComms.addValuePair(szName,(szValue? encodeURIComponent(szValue):""));
                    }
                    
                    var szLogin =encodeURIComponent(mainObject.m_szUserName/*m_szLoginUserName*/);
                    mainObject.m_HttpComms.addValuePair("login", szLogin);

                    var szPass = encodeURIComponent(mainObject.m_szPassWord);
                    mainObject.m_HttpComms.addValuePair("passwd",szPass);

                    mainObject.m_HttpComms.addValuePair(".persistent","y")

                    mainObject.m_HttpComms.setURI(szLoginURL);
                    mainObject.m_HttpComms.setRequestMethod("POST");
                    var bResult = mainObject.m_HttpComms.send(mainObject.loginOnloadHandler, mainObject);
                    if (!bResult) throw new Error("httpConnection returned false");
                    mainObject.m_iStage++;
                break;

                case 1: //redirect
                    var aLoginRedirect = szResponse.match(patternYahooRedirect);
                    if (aLoginRedirect == null)
                         throw new Error("error parsing yahoo login web page");
                    mainObject.m_Log.Write("YahooSMTPBETA.js - loginOnloadHandler - login redirect " + aLoginRedirect);
                    var szURL = aLoginRedirect[1];

                    mainObject.m_HttpComms.setURI(szURL);
                    mainObject.m_HttpComms.setRequestMethod("GET");
                    var bResult = mainObject.m_HttpComms.send(mainObject.loginOnloadHandler, mainObject);
                    if (!bResult) throw new Error("httpConnection returned false");
                    mainObject.m_iStage++;
                break;

                case 2: //mail box
                    if (szResponse.search(kPatternLogOut)== -1 && szResponse.search(kPatternLogOutAlt)==-1)
                    {
                        mainObject.m_Log.Write("YahooSMTPBETA.js - loginOnloadHandler - logout not found");
                        //check for bounce
                        if (szResponse.search(kPatternBTBounce)!= -1 && !mainObject.m_bReEntry)
                        {
                            var szRedirect = szResponse.match(kPatternBTBounce)[1];
                            mainObject.m_Log.Write("YahooSMTPBETA.js - loginOnloadHandler - szRedirect: " + szRedirect );
                            if (!mainObject.m_HttpComms.setURI(szRedirect))
                                mainObject.m_HttpComms.setURI(szLocation + szRedirect);
                            mainObject.m_HttpComms.setRequestMethod("GET");
                            var bResult = mainObject.m_HttpComms.send(mainObject.loginOnloadHandler, mainObject);
                            if (!bResult) throw new Error("httpConnection returned false");
                            return;
                        }
                        else if (mainObject.m_bReEntry)
                        {
                            mainObject.m_ComponentManager.deleteAllElements(mainObject.m_szUserName);

                            var oCookies = Components.classes["@mozilla.org/nsWebMailCookieManager2;1"]
                                                     .getService(Components.interfaces.nsIWebMailCookieManager2);
                            oCookies.removeCookie(mainObject.m_szUserName);

                            mainObject.m_bReEntry = false;
                            mainObject.m_iStage = 0;
                            mainObject.m_HttpComms.setURI(mainObject.m_szYahooMail);
                            mainObject.m_HttpComms.setRequestMethod("GET");
                            var bResult = mainObject.m_HttpComms.send(mainObject.loginOnloadHandler, mainObject);
                            if (!bResult) throw new Error("httpConnection returned false");
                            return;
                        }
                        else
                            throw new Error("error logging in");
                    }
                    mainObject.m_szHomeURI = httpChannel.URI.spec;
                    mainObject.m_Log.Write("YahooSMTPBETA.js - loginOnloadHandler - m_szHomeURI : "+mainObject.m_szHomeURI );

                    //get urls for later use
                    mainObject.m_szLocationURI = httpChannel.URI.prePath ;
                    mainObject.m_Log.Write("YahooSMTPBETA.js - loginOnloadHandler - m_szLocationURI : "+mainObject.m_szLocationURI );

                     //get wssid
                    mainObject.m_szWssid = encodeURIComponent(szResponse.match(kPatternWssid)[1]);
                    mainObject.m_Log.Write("YahooSMTPBETA.js - loginOnloadHandler - m_szWssid : "+mainObject.m_szWssid );

                    //server response
                    mainObject.serverComms("235 Your In\r\n");
                    mainObject.m_bAuthorised = true;
                break;



                case 3: //download spam image
                    mainObject.m_aLoginForm = szResponse.match(patternYahooLoginForm);
                    if ( mainObject.m_aLoginForm  == null)
                         throw new Error("error parsing yahoo login web page");
                    mainObject.m_Log.Write("YahooSMTPBETA.js - loginOnloadHandler - loginForm Spam " +  mainObject.m_aLoginForm );

                    var szSpamURI = mainObject.m_aLoginForm[0].match(patternYahooSpanURI)[1];
                    mainObject.m_Log.Write("YahooSMTPBETA.js - loginOnloadHandler - szSpamURI " +  szSpamURI );

                    mainObject.m_HttpComms.setURI(szSpamURI);
                    mainObject.m_HttpComms.setRequestMethod("GET");
                    var bResult = mainObject.m_HttpComms.send(mainObject.loginOnloadHandler, mainObject);
                    if (!bResult) throw new Error("httpConnection returned false");
                    mainObject.m_iStage++;
                break;



                case 4: //send login
                    mainObject.m_Log.Write("YahooSMTPBETA.js - loginOnloadHandler - image download");
                    var szPath = mainObject.writeImageFile(szResponse);
                    mainObject.m_Log.Write("YahooSMTPBETA.js - loginOnloadHandler - imageFile " + szPath);
                    var szResult =  mainObject.openSpamWindow(szPath);
                    if (!szResult) throw new Error("Spam Handling Error");

                    //construct form
                    var szLoginURL = mainObject.m_aLoginForm[0].match(patternYahooAction)[1];
                    mainObject.m_Log.Write("YahooSMTPBETA.js - loginOnloadHandler - loginURL " + szLoginURL);

                    var aLoginData = mainObject.m_aLoginForm[0].match(patternYahooInput);
                    mainObject.m_Log.Write("YahooSMTPBETA.js - loginOnloadHandler - loginData " + aLoginData);

                    for (i=0; i<aLoginData.length; i++)
                    {
                        var szName=aLoginData[i].match(patternYahooNameAlt)[1];
                        szName = szName.replace(/["|']/gm,"");
                        szName = szName.replace(/^\s*|\s*$/gm,"");
                        mainObject.m_Log.Write("YahooSMTPBETA.js - loginOnloadHandler - loginData name " + szName);

                        var szValue = aLoginData[i].match(patternYahooAltValue)[1];
                        szValue = szValue.replace(/["|']/gm,"");
                        szValue = szValue.replace(/^\s*|\s*$/gm,"");
                        mainObject.m_Log.Write("YahooSMTPBETA.js - loginOnloadHandler - loginData value " + szValue);

                        mainObject.m_HttpComms.addValuePair(szName,(szValue? encodeURIComponent(szValue):""));
                    }

                    var szLogin = encodeURIComponent(mainObject.m_szLoginUserName);
                    mainObject.m_HttpComms.addValuePair("login", szLogin);

                    var szPass = encodeURIComponent(mainObject.m_szPassWord);
                    mainObject.m_HttpComms.addValuePair("passwd",szPass);

                    mainObject.m_HttpComms.addValuePair(".secword",szResult);

                    mainObject.m_HttpComms.addValuePair(".persistent","y");

                    mainObject.m_HttpComms.setURI(szLoginURL);
                    mainObject.m_HttpComms.setRequestMethod("POST");
                    var bResult = mainObject.m_HttpComms.send(mainObject.loginOnloadHandler, mainObject);
                    if (!bResult) throw new Error("httpConnection returned false");
                    mainObject.m_iStage=1;
                break;
            };

            mainObject.m_Log.Write("YahooSMTPBETA.js - loginOnloadHandler - END");
        }
        catch(err)
        {
            mainObject.m_ComponentManager.deleteAllElements(mainObject.m_szUserName);

            var oCookies = Components.classes["@mozilla.org/nsWebMailCookieManager2;1"]
                                     .getService(Components.interfaces.nsIWebMailCookieManager2);
            oCookies.removeCookie(mainObject.m_szUserName);

            mainObject.m_Log.DebugDump("nsYahooSMTP.js: loginHandler : Exception : "
                                          + err.name
                                          + ".\nError message: "
                                          + err.message+ "\n"
                                          + err.lineNumber);

            mainObject.serverComms("502 negative vibes from "+mainObject.m_szUserName+"\r\n");
        }
    },




    rawMSG : function ( szFrom, aszTo, szEmail)
    {
        try
        {
            this.m_Log.Write("YahooSMTPBETA.js - rawMSG - START");

            if (!this.m_Email.parse(szEmail)) throw new Error ("Parse Failed")

            //construct email
            this.m_szData = kSendMessge;
            this.m_szData = this.m_szData.replace(/FROMADDRESS/g,szFrom.toLowerCase());   //set from address
            var szFromName = this.m_Email.headers.getHeader("From").split('<');
            if (szFromName.length > 1)
        	{
            	var szFromName = szFromName[0].replace(/\s*$/g,"");
            	szFromName = szFromName.replace(/"/g,"\\\"");
                this.m_szData = this.m_szData.replace(/FROMNAME/g,szFromName);   //set from name
        	}
            else
                this.m_szData = this.m_szData.replace(/FROMNAME/g,szFrom.toLowerCase());

            //get subject
            var szSubject = this.encodeHTML(this.m_Email.headers.getSubject());
            szSubject = szSubject.replace(/"/g,"\\\"");
            this.m_Log.Write("YahooSMTPBETA.js - rawMSG - szSubject " + szSubject);
            this.m_szData = this.m_szData.replace(/EMAILSUBJECT/,szSubject);   //set Subject

                      
            //get to
            var szTo = this.m_Email.headers.getTo();
            this.m_Log.Write("YahooSMTPBETA.js - rawMSG - szTo " + szTo);
            var aszTempTo = szTo.split(",");
            var szMSGto = "";
            for (var i=0; i<aszTempTo.length; i++)
            {
            	var szTemp = aszTempTo[i].replace(/\s*/g,"");
            	szMSGto += "{\"fail\":false,\"email\":\""+ szTemp +"\",\"name\":\""+ szTemp+"\"}";
            	if (aszTempTo.length>1 && i<aszTempTo.length-1) szMSGto +=",";               
            }
            this.m_szData = this.m_szData.replace(/TOADDRESS/,szMSGto);   //set TO Address

            //get cc
            var szCc = this.m_Email.headers.getCc();
            this.m_Log.Write("YahooSMTPBETA.js - rawMSG - szCc " + szCc);
            if (!szCc)
                this.m_szData = this.m_szData.replace(/CCEMAILADDRESS/,"");   //remove CC
            else
            {
                var aszTempCC = szCc.split(",");
                var szMSGCC = "";
                for (var i=0; i<aszTempCC.length; i++)
                {
                	var szTemp = aszTempCC[i].replace(/\s*/g,"")
                   	szMSGCC += "{\"fail\":false,\"email\":\""+ szTemp +"\",\"name\":\""+ szTemp +"\"}";
                	if (aszTempCC.length>1 && i<aszTempCC.length-1) szMSGCC +=",";
                }
                this.m_szData = this.m_szData.replace(/CCEMAILADDRESS/,szMSGCC);   //set CC Address
            }

            //get bcc
            var szBCC = this.getBcc(aszTo, szTo, szCc);
            this.m_Log.Write("YahooSMTPBETA.js - rawMSG - szBCC " + szBCC);
            if (!szBCC)
                this.m_szData = this.m_szData.replace(/BCCEMAILADDRESS/,"");   //remove BCC
            else
            {
                var aszTempBCC = szBCC.split(",");
                var szMSGBCC = "";
                for (var i=0; i<aszTempBCC.length; i++)
                {
                	var szTemp = aszTempBCC[i].replace(/\s*/g,"")
                   	szMSGBCC += "{\"fail\":false,\"email\":\""+ szTemp +"\",\"name\":\""+ szTemp +"\"}";
                	if (aszTempBCC.length>1 && i<aszTempBCC.length-1) szMSGBCC +=",";
                }
                this.m_szData = this.m_szData.replace(/BCCEMAILADDRESS/,szMSGBCC);   //set BCC Address
            }

            //get body
            if (this.m_Email.txtBody)                                   //add plain text part
            {
                var szTXTBody = this.m_Email.txtBody.body.getBody();
                if (szTXTBody.length==0) szTXTBody = " ";

                szTXTBody = szTXTBody.replace(/"/g,"\\\"");
                szTXTBody = szTXTBody.replace(/\s\r\n/g," \\n");
                szTXTBody = szTXTBody.replace(/\r\n/g,"\\n");
               
                //convert to UTF 8
                var szContentType = null;
                var szCharset = "us-ascii";
                if (this.m_Email.txtBody.headers)
                    szContentType = this.m_Email.txtBody.headers.getContentType(0);
                else
                    szContentType = this.m_Email.headers.getContentType(0);
                this.m_Log.Write("YahooSMTPBETA.js - composerOnloadHandler szContentType " + szContentType);
                if (szContentType)
                {
                    if (szContentType.search(/charset/i)!=-1)
                    {
                        if (szContentType.search(/charset=(.*?);\s/i)!=-1)
                            szCharset = szContentType.match(/charset=(.*?);\s/i)[1];
                        else
                           szCharset = szContentType.match(/charset=(.*?)$/i)[1];
                        this.m_Log.Write("YahooSMTPBETA.js - rawMSG -szCharset " + szCharset);

                        szTXTBody = this.convertToUTF8(szTXTBody, szCharset);
                        this.m_Log.Write("YahooSMTPBETA.js - rawMSG - utf-8 "+szTXTBody);
                    }
                }
               //set plain text msg
                this.m_szData = this.m_szData.replace(/PLAINMSG/,"\""+szTXTBody+"\"");   
            }
            else 
            	this.m_szData = this.m_szData.replace(/PLAINMSG/,"null"); 
            	
            if (this.m_Email.htmlBody)                                  //add HTML part
            {
                var szHTMLBody = this.m_Email.htmlBody.body.getBody();
                szHTMLBody = szHTMLBody.replace(/"/g,"\\\"");
                szHTMLBody = szHTMLBody.replace(/\r\n/g,"\\n");
               
                //set HTML text msg
                this.m_szData =this.m_szData.replace(/HTMLMSG/, "\""+szHTMLBody+"\"");   
            }
            else 
            	this.m_szData = this.m_szData.replace(/HTMLMSG/,"null"); 

            if (this.m_Email.attachments.length==0) //no attchments
            {
            	this.m_szData = this.m_szData.replace(/EMAILATTCHMENTS/,"");
            	this.m_Log.Write("YahooSMTPBETA.js - rawMSG - szData " + this.m_szData);
                var szURI = this.m_szLocationURI + "/ws/mail/v2.0/jsonrpc?appid=YahooMailNeo&m=SendMessage&wssid="+this.m_szWssid;
                this.m_iStage = 0 ;
                this.m_HttpComms.setURI(szURI);
                this.m_HttpComms.setRequestMethod("POST");
                this.m_HttpComms.addData(this.m_szData);
                this.m_HttpComms.setContentType("application/json; charset=UTF-8");
                var bResult = this.m_HttpComms.send(this.composerOnloadHandler, this);
                if (!bResult) throw new Error("httpConnection returned false");
            }
            else
            {   //get upload cred
                var szURI = this.m_szLocationURI + "/ya/upload_get_cred?wssid=" +this.m_szWssid;           
                this.m_HttpComms.setURI(szURI);
                this.m_iStage = 1 ;
                this.m_HttpComms.setRequestMethod("GET");

                var bResult = this.m_HttpComms.send(this.composerOnloadHandler, this);
                if (!bResult) throw new Error("httpConnection returned false");
            }

            this.m_Log.Write("YahooSMTPBETA.js - rawMSG - END");
            return true;
        }
        catch(err)
        {
            this.m_Log.DebugDump("nsYahooSMTP.js: rawMSG : Exception : "
                                              + err.name +
                                              ".\nError message: "
                                              + err.message+ "\n"
                                              + err.lineNumber);
            return false;
        }
    },


    composerOnloadHandler : function(szResponse ,event , mainObject)
    {
        try
        {
            mainObject.m_Log.Write("YahooSMTPBETA.js - composerOnloadHandler - START");
            mainObject.m_Log.Write("YahooSMTPBETA.js - composerOnloadHandler : " + mainObject.m_iStage);

            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);

            //if this fails we've gone somewhere new
            mainObject.m_Log.Write("YahooSMTPBETA.js - composerOnloadHandler - status :" +httpChannel.responseStatus );
            if (httpChannel.responseStatus != 200 && httpChannel.responseStatus != 500)
                throw new Error("return status " + httpChannel.responseStatus);

            switch(mainObject.m_iStage)
            {
                case 0:  //MSG sent
                    mainObject.m_Log.Write("YahooSMTPBETA.js - composerOnloadHandler - Checking response");
                    if (szResponse.search(kPatternSendMSGResponse)!=-1)
                    {
                        mainObject.m_Log.Write("YahooSMTPBETA.js - composerOnloadHandler - SEND OK");
                        if (mainObject.m_bReUseSession)
                        {
                            mainObject.m_Log.Write("YahooSMTPBETA.js - composerOnloadHandler - Setting Session Data");
                            if (mainObject.m_bReUseSession)
                            {
                                mainObject.m_Log.Write("YahooSMTPBETA.js - logOut - Setting Session Data");
                                mainObject.m_ComponentManager.addElement(mainObject.m_szUserName, "szHomeURI", mainObject.m_szHomeURI);
                            }
                            else
                            {
                                mainObject.m_Log.Write("YahooSMTPBETA.js - logOUT - removing Session Data");
                                mainObject.m_ComponentManager.deleteAllElements(mainObject.m_szUserName);

                                var oCookies = Components.classes["@mozilla.org/nsWebMailCookieManager2;1"]
                                                         .getService(Components.interfaces.nsIWebMailCookieManager2);
                                oCookies.removeCookie(mainObject.m_szUserName);
                            }
                        }

                        mainObject.serverComms("250 OK\r\n");
                    }
                    else if (szResponse.search(/SessionIdReissue/i)!=-1)
                    {
                        mainObject.m_Log.Write("YahooSMTPBETA.js - composerOnloadHandler : ID Reiussue" );
                        mainObject.m_szWssid = szResponse.match(/;wssid=(.*?)<\/url>/i)[1];
                        mainObject.m_Log.Write("YahooSMTPBETA.js - composerOnloadHandler - m_szWssid : "+mainObject.m_szWssid );

                        mainObject.m_bReEntry = false;
                        var szURI = szResponse.match(/<url>(.*?)<\/url>/i)[1];
                        var oEscapeDecode = new HTMLescape();
                        szURI = oEscapeDecode.decode(szURI);
                        delete oEscapeDecode;
                        mainObject.m_Log.Write("YahooSMTPBETA.js - composerOnloadHandler - szURI " + szURI);
                        mainObject.m_iStage = 0;
                        mainObject.m_HttpComms.setURI(szURI);
                        mainObject.m_HttpComms.setRequestMethod("POST");
                        mainObject.m_HttpComms.setContentType("application/xml; charset=UTF-8");
                        var bResult = mainObject.m_HttpComms.send(mainObject.composerOnloadHandler, mainObject);
                        if (!bResult) throw new Error("httpConnection returned false");
                        return;
                    }
                    else
                    {   //have no idea whats gone wrong
                        mainObject.serverComms("502 Error Sending Email\r\n");
                    }
                break;

                case 1: //upload file
                	mainObject.m_Log.Write("YahooSMTPBETA.js - composerOnloadHandler - upload file");
                
                	if (szResponse.search(kPatternCred)!=-1)
            		{
                		mainObject.m_szCred = szResponse.match(kPatternCred)[1];	
                		mainObject.m_Log.Write("YahooSMTPBETA.js - composerOnloadHandler - Cred " + mainObject.m_szCred);
            		}
                	else if (szResponse.search(kFileId)!=-1)
            		{
                		mainObject.m_aszFileIDs.push(szResponse.match(kFileId)[1]);
            		}
                	else
                	{// I have no idea what's gone wrong                		    
                		throw new Error("502 Error Sending Email") 
                	}
            		
            		//headers
                    var oAttach = mainObject.m_Email.attachments[mainObject.m_iAttCount];
                    var szFileName = oAttach.headers.getContentType(4);
                    if (!szFileName) szFileName = oAttach.headers.getContentDisposition(1);
                    if (!szFileName) szFileName = "";
                    mainObject.m_HttpComms.addValuePair("Filename",szFileName);
                   
                    //body
                    var szBody = oAttach.body.getBody();
                    mainObject.m_HttpComms.addFile("Filedata", szFileName, szBody);
                    mainObject.m_iAttCount++;
                    
                    
                    mainObject.m_HttpComms.addValuePair("check_content_type","1");
                    mainObject.m_HttpComms.addValuePair("output","json");
                    mainObject.m_HttpComms.addValuePair("Upload","Submit Query");
            		              		
            		var szURI = mainObject.m_szLocationURI + "/ya/upload_with_cred?" +mainObject.m_szCred;             
            		mainObject.m_HttpComms.setURI(szURI);
            		mainObject.m_HttpComms.setContentType("multipart/form-data");
            		mainObject.m_HttpComms.setRequestMethod("POST");
            		
            	    if (mainObject.m_Email.attachments.length > mainObject.m_iAttCount)
            	    	mainObject.m_iStage = 1;
            	    else
            	    	mainObject.m_iStage = 2;
            		
                    var bResult = mainObject.m_HttpComms.send(mainObject.composerOnloadHandler, mainObject);
                    if (!bResult) throw new Error("httpConnection returned false");
                break;
                
                case 2: //attachment upload complete
                    mainObject.m_Log.Write("YahooSMTPBETA.js - composerOnloadHandler - upload attchement complete");
                    
                    //last files id
                    if (szResponse.search(kFileId)!=-1)
        				mainObject.m_aszFileIDs.push(szResponse.match(kFileId)[1]);
                    
                    //add attachments                     
                    var szAttach = "";
                    for (var i=0; i<mainObject.m_aszFileIDs.length; i++)
                    {
                    	szAttach += "{\"attachment\":\"upload://"+ mainObject.m_aszFileIDs[i] + "\",\"disposition\":\"attachment\"}";
                    	if (mainObject.m_aszFileIDs.length>1 && i<mainObject.m_aszFileIDs.length-1) szAttach +=",";
                    }
                    
	                mainObject.m_szData = mainObject.m_szData.replace(/EMAILATTCHMENTS/,szAttach);
					mainObject.m_Log.Write("YahooSMTPBETA.js - composerOnloadHandler - mainObject.m_szData "+ mainObject.m_szData);
	        		var szURI = mainObject.m_szLocationURI + "/ws/mail/v2.0/jsonrpc?appid=YahooMailNeo&m=SendMessage&wssid="+mainObject.m_szWssid;                        
	                mainObject.m_iStage = 0 ;
	                mainObject.m_HttpComms.setURI(szURI);
	                mainObject.m_HttpComms.setRequestMethod("POST");
	                mainObject.m_HttpComms.addData(mainObject.m_szData);
	                mainObject.m_HttpComms.setContentType("application/json; charset=UTF-8");
	                var bResult = mainObject.m_HttpComms.send(mainObject.composerOnloadHandler, mainObject);
	                if (!bResult) throw new Error("httpConnection returned false");                  
                break;
            }


            mainObject.m_Log.Write("YahooSMTPBETA.js - composerOnloadHandler - END");
        }
        catch(err)
        {
            mainObject.m_Log.DebugDump("YahooSMTPBETA.js: composerOnloadHandler : Exception : "
                                          + err.name
                                          + ".\nError message: "
                                          + err.message + "\n"
                                          + err.lineNumber);

            mainObject.serverComms("502 Error Sending Email from "+mainObject.m_szUserName+"\r\n");
        }
    },




    getBcc : function (aszAllToAddresses, szTo,szCc)
    {
        try
        {
            this.m_Log.Write("YahooSMTPBETA.js - getBcc - START");
            if (aszAllToAddresses.length==0) return null;
            this.m_Log.Write("YahooSMTPBETA.js - getBcc - szRcptList " + aszAllToAddresses);

            var szBcc = null;
            var szAddress = null;
            if (szTo) szAddress = szTo;
            if (szCc) szAddress = (szTo ? (szAddress + ","+ szCc) : szCc);
            this.m_Log.Write("YahooSMTPBETA.js - getBcc - szAddress " + szAddress);

            if (!szAddress)
                szBcc = aszAllToAddresses;
            else
            {
                for (j=0; j<aszAllToAddresses.length; j++)
                {
                    var regExp = new RegExp(aszAllToAddresses[j]);
                    if (szAddress.search(regExp)==-1)
                    {
                        szBcc? (szBcc += ","+aszAllToAddresses[j]) : (szBcc = aszAllToAddresses[j]);                        
                    }
                }
            }
            this.m_Log.Write("YahooSMTPBETA.js - getBcc szBcc- " + szBcc);
            this.m_Log.Write("YahooSMTPBETA.js - getBcc - End");
            return szBcc;
        }
        catch(err)
        {
            this.m_Log.DebugDump("YahooSMTPBETA.js: getBcc : Exception : "
                                                  + err.name
                                                  + ".\nError message: "
                                                  + err.message + "\n"
                                                  + err.lineNumber);

            return null;
        }
    },



    convertToUTF8 : function (szRawMSG, szCharset)
    {
        this.m_Log.Write("YahooSMTPBETA - convertToUTF8 START " +szCharset );

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
        this.m_Log.Write("YahooSMTPBETA - convertToUTF8 use charset " + szUseCharSet);

        var Converter = Components.classes["@mozilla.org/intl/scriptableunicodeconverter"]
                                  .getService(Components.interfaces.nsIScriptableUnicodeConverter);
        Converter.charset =  szUseCharSet;
        var szUnicode =  Converter.ConvertToUnicode(szRawMSG);
        szUnicode= szUnicode.replace(/\s\s/g,"\u00A0\u0020");
        Converter.charset = "UTF-8";
        var szDecoded = Converter.ConvertFromUnicode(szUnicode)+ Converter.Finish();
        this.m_Log.Write("YahooSMTPBETA - convertToUTF8 - "+szDecoded);

        this.m_Log.Write("YahooSMTPBETA - convertToUTF8 END");
        return szDecoded;
    },




    writeImageFile : function(szData)
    {
        try
        {
            this.m_Log.Write("YahooSMTPBETA.js - writeImageFile - End");

            var file = Components.classes["@mozilla.org/file/directory_service;1"];
            file = file.getService(Components.interfaces.nsIProperties);
            file = file.get("TmpD", Components.interfaces.nsIFile);
            file.append("suggestedName.jpg");
            file.createUnique(Components.interfaces.nsIFile.NORMAL_FILE_TYPE, 420);

            var deletefile = Components.classes["@mozilla.org/uriloader/external-helper-app-service;1"];
            deletefile = deletefile.getService(Components.interfaces.nsPIExternalAppLauncher);
            deletefile.deleteTemporaryFileOnExit(file);

            var outputStream = Components.classes["@mozilla.org/network/file-output-stream;1"];
            outputStream = outputStream.createInstance( Components.interfaces.nsIFileOutputStream );
            outputStream.init( file, 0x04 | 0x08 | 0x10, 420, 0 );

            var binaryStream = Components.classes["@mozilla.org/binaryoutputstream;1"];
            binaryStream = binaryStream.createInstance(Components.interfaces.nsIBinaryOutputStream);
            binaryStream.setOutputStream(outputStream)
            binaryStream.writeBytes( szData, szData.length );
            outputStream.close();
            binaryStream.close();

            var ios = Components.classes["@mozilla.org/network/io-service;1"]
                                .getService(Components.interfaces.nsIIOService);
            var fileHandler = ios.getProtocolHandler("file")
                                 .QueryInterface(Components.interfaces.nsIFileProtocolHandler);
            var URL = fileHandler.getURLSpecFromFile(file);
            this.m_Log.Write("YahooSMTPBETA.js - writeImageFile - path " + URL);

            this.m_Log.Write("YahooSMTPBETA.js - writeImageFile - End");
            return URL;
        }
        catch(err)
        {
            this.m_Log.DebugDump("YahooSMTPBETA.js: writeImageFile : Exception : "
                                                  + err.name
                                                  + ".\nError message: "
                                                  + err.message + "\n"
                                                  + err.lineNumber);

            return null;
        }
    },




    openSpamWindow : function(szPath)
    {
        try
        {
            this.m_Log.Write("nsYahooSMTP : openWindow - START");

            var params = Components.classes["@mozilla.org/embedcomp/dialogparam;1"]
                                   .createInstance(Components.interfaces.nsIDialogParamBlock);
            params.SetNumberStrings(1);
            params.SetString(0, szPath);

            var window = Components.classes["@mozilla.org/embedcomp/window-watcher;1"]
                                  .getService(Components.interfaces.nsIWindowWatcher);

            window.openWindow(null,
                              "chrome://yahoo/content/Yahoo-SpamImage.xul",
                              "_blank",
                              "chrome,alwaysRaised,dialog,modal,centerscreen,resizable",
                              params);

            var iResult = params.GetInt(0);
            this.m_Log.Write("YahooSMTPBETA : openWindow - " + iResult);
            var szResult =  null;
            if (iResult)
            {
                szResult = params.GetString(0);
                this.m_Log.Write("YahooSMTPBETA : openWindow - " + szResult);
            }

            this.m_Log.Write("YahooSMTPBETA : openWindow - END");
            return szResult;
        }
        catch(err)
        {
            this.m_Log.DebugDump("YahooSMTPBETA: Exception in openWindow : "
                                               + err.name
                                               + ".\nError message: "
                                               + err.message + "\n"
                                               + err.lineNumber);
        }
    },


    encodeHTML : function (szRaw)
    {
        this.m_Log.Write("YahooSMTPBETA - encodeHTML - START");
        var szMsg = szRaw.replace(/&/g, "&amp;");
        this.m_Log.Write("YahooSMTPBETA - encodeHTML - ENd")
        return szMsg;
    },

    ////////////////////////////////////////////////////////////////////////////
    /////  Comms

    serverComms : function (szMsg)
    {
        try
        {
            this.m_Log.Write("YahooSMTPBETA.js - serverComms - START");
            this.m_Log.Write("YahooSMTPBETA.js - serverComms msg " + szMsg);
            var iCount = this.m_oResponseStream.write(szMsg,szMsg.length);
            this.m_Log.Write("YahooSMTPBETA.js - serverComms sent count: " + iCount
                                                        +" msg length: " +szMsg.length);
            this.m_Log.Write("YahooSMTPBETA.js - serverComms - END");
        }
        catch(e)
        {
            this.m_Log.DebugDump("YahooSMTPBETA.js: serverComms : Exception : "
                                              + e.name
                                              + ".\nError message: "
                                              + e.message+ "\n"
                                              + e.lineNumber);
        }
    }
}
