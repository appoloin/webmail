function HotmailScreenRipperBETA(oResponseStream, oLog, oPrefData)
{
    try
    {
        var scriptLoader = Components.classes["@mozilla.org/moz/jssubscript-loader;1"];
        scriptLoader = scriptLoader.getService(Components.interfaces.mozIJSSubScriptLoader);
        scriptLoader.loadSubScript("chrome://web-mail/content/common/DebugLog.js");
        scriptLoader.loadSubScript("chrome://web-mail/content/common/HttpComms3.js");
        scriptLoader.loadSubScript("chrome://hotmail/content/Hotmail-MSG.js");
        scriptLoader.loadSubScript("chrome://hotmail/content/Hotmail-Prefs-Data.js");
        scriptLoader.loadSubScript("chrome://hotmail/content/Hotmail-FolderList.js");
        scriptLoader.loadSubScript("chrome://hotmail/content/HTML-escape.js");

        this.m_Log = oLog;
        this.m_Log.Write("Hotmail-SR-BETA - Constructor - START");

        this.m_szUserName = null;
        this.m_szPassWord = null;
        this.m_oResponseStream = oResponseStream;
        this.m_HttpComms = new HttpComms(this.m_Log);
        this.m_HttpComms.setUserAgentOverride(true);
        this.m_HttpComms.setUserAgent("Mozilla/5.0 (X11; Ubuntu; Linux i686; rv:29.0) Gecko/20100101 Firefox/29.0")
        this.m_MSGEscape = null;

        this.m_szLocationURI = null;
        this.m_szFolderURL = null;
        this.m_aMsgDataStore = new Array();
        this.m_aszFolderURLList = new Array();
        this.m_aFolderMsgCount = new Array();
        this.m_szHomeURI = null;
        this.m_iTotalSize = 0;
        this.m_iStage = 0;
        this.m_szMsgID = null;
        this.m_szLastMSGID ="";
        this.m_szMsgURL = null;
        this.m_szAuthUser = null;
        this.m_szSessionID = null;
        this.m_szAnchorDate = null;
        this.m_szMad = null;
        this.m_szNum1 = null;
        this.m_szNonce = null;
        this.m_iPageCount = 2;
        this.m_szLastRowId = null;
        this.m_szLastRowDate = null;
        this.m_iLastPage = 0;
        this.m_szMSGPerPage = 25;
        this.m_szRtl = false;
        this.m_iMsgCount = 0;

        this.m_szMSG = null;
        this.m_bStat = false;
        this.m_bReEntry = true;
        this.m_iLoginBounce = 5;
        this.m_szMT = null;
        this.m_iDownloadRetry = 3;
        this.m_szLocale = "";

        this.m_ComponentManager = Components.classes["@mozilla.org/ComponentData2;1"]
                                            .getService(Components.interfaces.nsIComponentData2);

        this.m_iTime = oPrefData.iProcessDelay;            //timer delay
        this.m_iProcessAmount  =  oPrefData.iProcessAmount; //delay proccess amount
        this.m_bReUseSession   = oPrefData.bReUseSession;    //do i reuse the session
        this.m_bUseJunkMail    = oPrefData.bUseJunkMail;       //do i download junkmail
        this.m_bDownloadUnread = oPrefData.bDownloadUnread;     //do i download unread only
        this.m_bMarkAsRead     = oPrefData.bMarkAsRead;         //do i mark email as read
        this.m_bDownloadInbox  = oPrefData.bDownloadInbox;         //do i download inbox
        this.m_iHandleCount = 0;
        this.m_Timer = Components.classes["@mozilla.org/timer;1"]
                                 .createInstance(Components.interfaces.nsITimer);

        this.m_bMarked=false;
        //process folders
        this.m_szFolderName = null;

        this.m_aszFolders = new Array();
        for(var i=0; i<oPrefData.aszFolder.length; i++)
        {
            this.m_aszFolders.push(oPrefData.aszFolder[i]);
        }
        this.m_Log.Write("Hotmail-SR-BETA.js - Constructor - m_aszFolders "+ this.m_aszFolders);
        this.m_Log.Write("Hotmail-SR-BETA.js - Constructor - END");
    }
    catch(e)
    {
        DebugDump("Hotmail-SR-BETA: Constructor : Exception : "
                                      + e.name
                                      + ".\nError message: "
                                      + e.message + "\n"
                                      + e.lineNumber);
    }
}



HotmailScreenRipperBETA.prototype =
{
    logIn : function(szUserName, szPassWord)
    {
        try
        {
            this.m_Log.Write("Hotmail-SR-BETA - logIN - START");
            this.m_Log.Write("Hotmail-SR-BETA - logIN - Username: " + szUserName
                                                   + " Password: " + szPassWord
                                                   + " stream: " + this.m_oResponseStream);

            this.m_szUserName = szUserName.toLowerCase();
            this.m_szPassWord = szPassWord.substr(0,16);

            if (!this.m_szUserName || !this.m_oResponseStream || !this.m_szPassWord) return false;

            this.m_HttpComms.setUserName(this.m_szUserName);
            //get hotmail.com webpage
            this.m_iStage= 0;
            this.m_HttpComms.setURI("http://www.hotmail.com");

            //get session data
            if (this.m_bReUseSession)
            {
                this.m_Log.Write("Hotmail-SR-BETA - logIN - Getting Session Data");
                this.m_szHomeURI = this.m_ComponentManager.findElement(this.m_szUserName, "szHomeURI");
                this.m_Log.Write("Hotmail-SR - logIN - szHomeURI " +this.m_szHomeURI);

                if (this.m_szHomeURI)
                {
                    this.m_Log.Write("Hotmail-SR-BETA - logIN - Session Data Found");
                    this.m_iStage =1;
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

            this.m_HttpComms.setRequestMethod("GET");
            var bResult = this.m_HttpComms.send(this.loginOnloadHandler, this);
            if (!bResult) throw new Error("httpConnection returned false");


            this.m_Log.Write("Hotmail-SR-BETA - logIN - END");
            return true;
        }
        catch(e)
        {
            this.m_Log.DebugDump("Hotmail-SR-BETA: logIN : Exception : "
                                              + e.name +
                                              ".\nError message: "
                                              + e.message+ "\n"
                                              + e.lineNumber);
            return false;
        }
    },



    loginOnloadHandler : function(szResponse ,event , mainObject)
    {
        try
        {
            mainObject.m_Log.Write("Hotmail-SR-BETA - loginOnloadHandler - START");
            mainObject.m_Log.Write("Hotmail-SR-BETA - loginOnloadHandler : " + mainObject.m_iStage);

            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);
            mainObject.m_Log.Write("Hotmail-SR-BETA - loginOnloadHandler - status :" +httpChannel.responseStatus );

            //if this fails we've gone somewhere new
            if (httpChannel.responseStatus != 200 )
                throw new Error("return status " + httpChannel.responseStatus);

            //check for java refresh
            var aRefresh = szResponse.match(patternHotmailJSRefresh);
            if (!aRefresh) aRefresh = szResponse.match(patternHotmailJSRefreshAlt);
            if (!aRefresh) aRefresh = szResponse.match(patternHotmailRefresh2);
            if (!aRefresh && mainObject.m_iStage>0) aRefresh = szResponse.match(patternHotmailJSRefreshAlt3);
            if (!aRefresh && mainObject.m_iStage>0) aRefresh = szResponse.match(patternHotmailJSBounce);
            mainObject.m_Log.Write("Hotmail-SR-BETA-SMTP - loginOnloadHandler aRefresh "+ aRefresh);
            if (aRefresh)
            {
                mainObject.m_Log.Write("Hotmail-SR-BETA - loginOnloadHandler - refresh ");

                if (mainObject.m_iLoginBounce == 0) throw new Error ("No many bounces")
                mainObject.m_iLoginBounce--;

                var szURL = mainObject.urlDecode(aRefresh[1]);
                if (!mainObject.m_HttpComms.setURI(szURL))
                    mainObject.m_HttpComms.setURI(httpChannel.URI.prePath + szDirectory + aRefresh[1]);

                mainObject.m_HttpComms.setRequestMethod("GET");

                var bResult = mainObject.m_HttpComms.send(mainObject.loginOnloadHandler, mainObject);
                if (!bResult) throw new Error("httpConnection returned false");
                return;
            }


            //frame
            if(szResponse.search(patternHotmailUIFrame)!=-1)
            {
                mainObject.m_Log.Write("Hotmail-SR-BETA - loginOnloadHandler - frame ");

                var szTempURL = szResponse.match(patternHotmailBase)[1];
                mainObject.m_Log.Write("Hotmail-SR-BETA - loginOnloadHandler - szTempURL " +szTempURL);
                var szURL = mainObject.urlDecode(szTempURL);
                mainObject.m_HttpComms.setURI(szURL);
                mainObject.m_HttpComms.setRequestMethod("GET");

                var bResult = mainObject.m_HttpComms.send(mainObject.loginOnloadHandler, mainObject);
                if (!bResult) throw new Error("httpConnection returned false");
                return;
            }


            //login form
            var aForm = szResponse.match(patternHotmailLoginForm);
            mainObject.m_Log.Write("Hotmail-SR-BETA-POP - loginOnloadHandler aForm "+ aForm);
            if (aForm)
            {
                var szURL = aForm[0].match(patternHotmailAction);
                mainObject.m_HttpComms.setURI(szURL[1]);
                mainObject.m_HttpComms.setRequestMethod("POST");
                var szInput = aForm[0].match(patternHotmailInput);
                var szName = szInput[0].match(patternHotmailName)[1];
                var szValue = szInput[0].match(patternHotmailValue)[1];
                mainObject.m_HttpComms.addValuePair(szName, szValue);

                var bResult = mainObject.m_HttpComms.send(mainObject.loginOnloadHandler, mainObject);
                if (!bResult) throw new Error("httpConnection returned false");
                return;
            }


            //welcome page
            if(szResponse.search(patternHotmailInboxCount)!=-1)
            {
                mainObject.m_Log.Write("Hotmail-SR-BETA-POP - welcome page ");
                var szUrl = szResponse.match(patternHotmailInboxLight)[1];
                var szCleanURL = mainObject.urlDecode(szUrl);
                if (!mainObject.m_HttpComms.setURI(szCleanURL))
                    mainObject.m_HttpComms.setURI(httpChannel.URI.prePath + szCleanURL);

                mainObject.m_HttpComms.setRequestMethod("GET");

                var bResult = mainObject.m_HttpComms.send(mainObject.loginOnloadHandler, mainObject);
                if (!bResult) throw new Error("httpConnection returned false");
                return;

            }


            //page code
            switch (mainObject.m_iStage)
            {
                case 0: //login
                    var szURL = szResponse.match(patternHotmailLoginURL)[1];
                    mainObject.m_Log.Write("Hotmail-SR-BETA loginOnloadHandler - szURL :" +szURL);
                    if (!szURL) throw new Error("error parsing login page");

                    //get form data
                    mainObject.m_HttpComms.addValuePair("idsbho","1");

                    var szPasswordPadding = "IfYouAreReadingThisYouHaveTooMuchFreeTime";
                    var lPad=szPasswordPadding.length-mainObject.m_szPassWord.length;
                    szData = szPasswordPadding.substr(0,(lPad<0)?0:lPad);
                    mainObject.m_HttpComms.addValuePair("PwdPad",szData);

                    mainObject.m_HttpComms.addValuePair("LoginOptions","2");
                    mainObject.m_HttpComms.addValuePair("CS","");
                    mainObject.m_HttpComms.addValuePair("FedState","");

                    mainObject.m_HttpComms.addValuePair("login",mainObject.urlEncode(mainObject.m_szUserName));
                    mainObject.m_HttpComms.addValuePair("passwd",mainObject.urlEncode(mainObject.m_szPassWord));
                    mainObject.m_HttpComms.addValuePair("remMe","1");
                    mainObject.m_HttpComms.addValuePair("NewUser","1");

                    var szSFT = szResponse.match(patternHotmailSFT)[1];
                    mainObject.m_Log.Write("Hotmail-SR - loginOnloadHandler - szSFT :" +szSFT);
                    mainObject.m_HttpComms.addValuePair("PPFT",szSFT);
                
                    mainObject.m_HttpComms.setURI(szURL);
                    mainObject.m_HttpComms.setRequestMethod("POST");
                    var bResult = mainObject.m_HttpComms.send(mainObject.loginOnloadHandler, mainObject);
                    if (!bResult) throw new Error("httpConnection returned false");
                    mainObject.m_iStage++;
                break;

                case 1:
                    //get urls for later use
                    var IOService = Components.classes["@mozilla.org/network/io-service;1"];
                    IOService = IOService.getService(Components.interfaces.nsIIOService);
                    var szDirectory = "/mail/"
                    this.m_Log.Write("Hotmail-SR-BETA - loginOnloadHandler - directory : " +szDirectory);

                    var oCookies = Components.classes["@mozilla.org/nsWebMailCookieManager2;1"]
                                             .getService(Components.interfaces.nsIWebMailCookieManager2);

                    //check for logout option
                    if (szResponse.search(patternHotmailLogOut)==-1)
                    {
                        mainObject.m_Log.Write("Hotmail-SR-BETA - loginOnloadHandler - logout not found : ");
                        //check for complex hotmail site
                        if (szResponse.search(patternHotmailFrame)!=-1)
                        {
                            mainObject.m_Log.Write("Hotmail-SR-BETA - loginOnloadHandler - frame found");
                            mainObject.m_iStage = 1;
                            var szURL = szResponse.match(patternHotmailLight)[1];
                            var oEscape = new HTMLescape(mainObject.m_Log);
                            szURL = oEscape.decode(szURL);
                            delete oEscape
                            mainObject.m_Log.Write("Hotmail-SR-BETA - loginOnloadHandler - szLight " + szURL);
                            mainObject.m_HttpComms.setURI(szURL);
                            mainObject.m_HttpComms.setRequestMethod("GET");
                            var bResult = mainObject.m_HttpComms.send(mainObject.loginOnloadHandler, mainObject);
                            if (!bResult) throw new Error("httpConnection returned false");
                            return;
                        }
                        else if (mainObject.m_bReEntry)//something has gone wrong retry
                        {
                            mainObject.m_ComponentManager.deleteAllElements(mainObject.m_szUserName);
                            oCookies.removeCookie(mainObject.m_szUserName);

                            mainObject.m_bReEntry = false;
                            mainObject.m_iStage =0;
                            mainObject.m_HttpComms.setURI("http://mail.live.com");
                            mainObject.m_HttpComms.setRequestMethod("GET");
                            var bResult = mainObject.m_HttpComms.send(mainObject.loginOnloadHandler, mainObject);
                            if (!bResult) throw new Error("httpConnection returned false");
                            return;
                        }
                        else
                            throw new Error("error logging in");
                    }

                    mainObject.m_szLocationURI = httpChannel.URI.prePath + szDirectory;
                    mainObject.m_Log.Write("Hotmail-SR-BETA - loginOnloadHandler - m_szLocationURI : "+mainObject.m_szLocationURI );
                    mainObject.m_szHomeURI = httpChannel.URI.spec;
                    mainObject.m_Log.Write("Hotmail-SR-BETA - loginOnloadHandler - m_szHomeURI : "+mainObject.m_szHomeURI );

                                      
                    //get cookies
                    try
                    {
	                    var szCookie = oCookies.findCookie(mainObject.m_szUserName, httpChannel.URI.spec);
	                    mainObject.m_Log.Write("Hotmail-SR-BETA - loginOnloadHandler cookies "+ szCookie);
	                    mainObject.m_szMT = szCookie.match(patternHotmailMT)[1];
	                    mainObject.m_Log.Write("Hotmail-SR-BETA - loginOnloadHandler mainObject.m_szMT "+ mainObject.m_szMT);
                    }
                    catch(e)
                    {
                    	mainObject.m_szMT="";
                    }
                    
                    //get AuthUser
                    mainObject.m_szAuthUser = szResponse.match(patternHotmailAuthUser)[1];
                    mainObject.m_Log.Write("Hotmail-SR-BETA - mailBoxOnloadHandler - m_szAuthUser : " +mainObject.m_szAuthUser);

                    //get SessionId
                    mainObject.m_szSessionID = szResponse.match(patternHotmailSessionID)[1];
                    mainObject.m_szSessionID = decodeURIComponent(mainObject.m_szSessionID);
                    mainObject.m_szSessionID = mainObject.urlDecode(mainObject.m_szSessionID);
                    mainObject.m_Log.Write("Hotmail-SR-BETA - mailBoxOnloadHandler - m_szSessionID : " +mainObject.m_szSessionID);

                    
                    //get folder list
                    var szFolderList = szResponse.match(patternOutlookFList)[0];
                    mainObject.m_Log.Write("Hotmail-SR-BETA - loginOnloadHandler - folders : "+szFolderList);
                    var aszFLItems = szFolderList.split(patternOutlookFListItems);
                    mainObject.m_Log.Write("Hotmail-SR-BETA - loginOnloadHandler - folder Items : "+aszFLItems);
                    for(i=0; i<aszFLItems.length; i++)
                    {
                    	mainObject.m_Log.Write("Hotmail-SR-BETA - loginOnloadHandler - folder Item : "+aszFLItems[i]);
                    	try
                    	{
                    		//("flinbox","flAAAAAAAAAAAAAAAAAAAAAA2",0,1,103,"294406",false,false,false,0,0,null,"Inbox",6))},[
	                    	var szID = aszFLItems[i].match(/\("(.*?)",/i)[1]; //folder id
	                    	var szFolderName = aszFLItems[i].split(/,/)[12].match(/"(.*?)"/i)[1]; //folder name
	                    	var iMsgCount = aszFLItems[i].split(/,/)[4]; // message count  
	                    	mainObject.m_Log.Write("Hotmail-SR-BETA - loginOnloadHandler - Folder name ID : " +szID + " " + szFolderName + " " + iMsgCount);
	                    	
	                    	//standard folders
	                        if (mainObject.m_bDownloadInbox && szID == "flinbox" || /*junk - 000000000001*/
	                              mainObject.m_bUseJunkMail && szID == "fljunk")  //inbox - 000000000005
	                        {
	                             var oFolder = new FolderData();
	                             mainObject.createFolder(szID);
	                             oFolder.szID = szID;
	                             oFolder.szFolderName = szFolderName;
	                             oFolder.iMSGCount = parseInt(iMsgCount);
	                            	 
	                             mainObject.m_aszFolderURLList.push(oFolder);
	                             mainObject.m_Log.Write("Hotmail-SR-BETA - loginOnloadHandler - Folder Added");
	                        }
	                        else //custom folders
	                        {	                        
	                        	var regExp = new RegExp("^"+szFolderName+"$","i");
		                        mainObject.m_Log.Write("Hotmail-SR-BETA - loginOnloadHandler - regExp : "+regExp );
		
	                            var oEscape = new HTMLescape(mainObject.m_Log);
	                            for (var j=0; j<mainObject.m_aszFolders.length; j++)
	                            {
	                                
	                                if (mainObject.m_aszFolders[j].search(regExp)!=-1)
	                                {
	                                    mainObject.createFolder(szID);                                                                     
	                                    var oFolder = new FolderData();
	                                    oFolder.szFolderName = szFolderName;
	                                    oFolder.szID = szID;
	                                    oFolder.iMSGCount = parseInt(iMsgCount);
	                                    mainObject.m_aszFolderURLList.push(oFolder);
	                                    mainObject.m_Log.Write("Hotmail-SR-BETA - loginOnloadHandler - Folder Added");
	                                }
	                            }
	                        }  
                    	}
                    	catch(e)
                    	{
                    		 mainObject.m_Log.Write("Hotmail-SR-BETA: loginHandler : folder list : "
				                                     + e.name
				                                     + ".\nError message: "
				                                     + e.message+ "\n"
				                                     + e.lineNumber);

                    	}
                    }
                  //server response
                    mainObject.serverComms("+OK Your in\r\n");
                    mainObject.m_bAuthorised = true;
                break;
            }

            mainObject.m_Log.Write("Hotmail-SR-BETA - loginOnloadHandler - END");
        }
        catch(err)
        {
            mainObject.m_Log.DebugDump("Hotmail-SR-BETA: loginHandler : Exception : "
                                          + err.name
                                          + ".\nError message: "
                                          + err.message+ "\n"
                                          + err.lineNumber);

            mainObject.m_ComponentManager.deleteAllElements(mainObject.m_szUserName);

            var oCookies = Components.classes["@mozilla.org/nsWebMailCookieManager2;1"]
                                     .getService(Components.interfaces.nsIWebMailCookieManager2);
            oCookies.removeCookie(mainObject.m_szUserName);

            mainObject.serverComms("-ERR negative vibes from " +mainObject.m_szUserName+ "\r\n");
        }
    },



    //stat
    //total size is in octets
    getNumMessages : function()
    {
        try
        {
            this.m_Log.Write("Hotmail-SR-BETA - getNumMessages - START");
            if (this.m_aszFolderURLList.length == 0)
            {
                this.serverComms("+OK " + this.m_aMsgDataStore.length + " " + this.m_iTotalSize + "\r\n");
            }
            else
            {
                this.mailBox(true);
            }
            this.m_Log.Write("Hotmail-SR-BETA - getNumMessages - END");
            return true;
        }
        catch(e)
        {
            this.m_Log.DebugDump("Hotmail-SR-BETA: getNumMessages : Exception : "
                                          + e.name
                                          + ".\nError message: "
                                          + e.message+ "\n"
                                          + e.lineNumber);
            return false;
        }
    },



    mailBox : function (bState)
    {
        this.m_iStage = 0;
        var oFolder = this.m_aszFolderURLList.shift();
        this.m_szFolderName = oFolder.szFolderName;    
        this.m_szFolderID = oFolder.szID;
        this.m_iMsgCount = oFolder.iMSGCount;
        this.m_Log.Write("Hotmail-SR-BETA - getNumMessages - mail box "+this.m_szFolderName + "  id " 
        						+ this.m_szFolderID + " MessCount "  + this.m_iMsgCount);

        //https://blu175.mail.live.com/default.aspx?fid=flinbox       
        var szURL = this.m_szLocationURI + "default.aspx?fid="+ this.m_szFolderID;
        this.m_HttpComms.setURI(szURL);
        this.m_HttpComms.setRequestMethod("GET");
        /*
        var szURL = this.m_szLocationURI + "mail.fpp?"
        szURL += "cnmn=Microsoft.Msn.Hotmail.Ui.Fpp.MailBox.GetInboxData&";
        szURL += "a=" + this.urlEncode(this.m_szSessionID) + "&";
        szURL += "au=" + this.m_szAuthUser + "&";
        szURL += "ptid=0";
        this.m_Log.Write("Hotmail-SR-BETA - emailOnloadHandler - szURL :" + szURL);

        this.m_HttpComms.addValuePair("cn","Microsoft.Msn.Hotmail.Ui.Fpp.MailBox");
        this.m_HttpComms.addValuePair("mn","GetInboxData");      	
  
        var szD = "{[],[],[{null,null,4,38,false,2,null,0,"; 
        szD += "\"" + this.m_szFolderID + "\"";  	
        szD += ",null,null,null,0,1,4,true,null,28,null,1}],[],[]}"
        	           	
        szD = this.urlEncode(szD);
        this.m_HttpComms.addValuePair("d",szD);
        this.m_HttpComms.addValuePair("v","1");
        this.m_HttpComms.addRequestHeader("mt",this.m_szMT, true);

        this.m_HttpComms.setURI(szURL);
        this.m_HttpComms.setRequestMethod("POST");
    */
        var bResult = this.m_HttpComms.send(this.mailBoxOnloadHandler, this);
        if (!bResult) throw new Error("httpConnection returned false");
        this.m_bStat = true;
    },



    mailBoxOnloadHandler : function (szResponse ,event , mainObject)
    {
        try
        {
            mainObject.m_Log.Write("Hotmail-SR-BETA - mailBoxOnloadHandler - START");
            mainObject.m_Log.Write("Hotmail-SR-BETA - mailBoxOnloadHandler : " + mainObject.m_iStage);

            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);
            mainObject.m_Log.Write("Hotmail-SR-BETA - mailBoxOnloadHandler - Mailbox :" + httpChannel.responseStatus);

            //check status should be 200.
            if (httpChannel.responseStatus != 200 )
                throw new Error("error status " + httpChannel.responseStatus);
            if (szResponse.search(/new HM.FppError/)!=-1)
            	 throw new Error("error ");
            
            if (szResponse.search(/HM.ItemListData/i)!=-1) //search for inbox content
            {
                mainObject.m_Log.Write("Hotmail-SR-BETA - mailBoxOnloadHandler - content found :");
                               

                //get msg urls
                if (szResponse.search(patternOutlookMSGBox)!= -1)
                {
                    var szMsgTable = szResponse.split(patternOutlookMSGBox)[1];
                    mainObject.m_Log.Write("Hotmail-SR-BETA - mailBoxOnloadHandler -msg table : " + szMsgTable);

                    var aszMsgRows = szMsgTable.split(/\:new HM.RollupData\(new HM.Rollup/i); //split on rows
                    mainObject.m_Log.Write("Hotmail-SR-BETA - mailBoxOnloadHandler -split msg table : " + aszMsgRows);
                    if (aszMsgRows)
                    {
                        for (j = 0; j < aszMsgRows.length; j++)
                        {
                            mainObject.m_Log.Write("Hotmail-SR-BETA - mailBoxOnloadHandler - row  : " + aszMsgRows[j]);
                                                                                 
                            if (aszMsgRows[j].search(patternHotmailDispNone)==-1)
                            {
                                var oMSG = mainObject.processMSG(aszMsgRows[j], null);
                                if (oMSG) mainObject.m_aMsgDataStore.push(oMSG);                              
                            }
                        }                 
                    }
                }
            }
            var szLastRowId = null;
            var szLastRowDate = null;
            if (mainObject.m_iMsgCount>mainObject.getMSGCount(mainObject.m_szFolderID))
    		{
            	try
            	{
	            	szLastRowId   = mainObject.m_aMsgDataStore[mainObject.m_aMsgDataStore.length-4].szMSGID;
	            	mainObject.m_Log.Write("Hotmail-SR-BETA - mailBoxOnloadHandler - m_szLastRowId : " +szLastRowId);
	            	szLastRowDate = mainObject.m_aMsgDataStore[mainObject.m_aMsgDataStore.length-4].szDate;
	            	mainObject.m_Log.Write("Hotmail-SR-BETA - mailBoxOnloadHandler - m_szLastRowDate : " +szLastRowDate);
            	}
            	catch(e)
            	{
            		szLastRowId = null;
                    szLastRowDate = null;
            	}            	
    		}
            if (szLastRowDate!=null &&  szLastRowId!=null)//check for more pages
            {
            	mainObject.m_Log.Write("Hotmail-SR-BETA - mailBoxOnloadHandler - More pages : ");
                var szURL = mainObject.m_szLocationURI + "mail.fpp?"
                szURL += "cnmn=Microsoft.Msn.Hotmail.Ui.Fpp.MailBox.GetInboxData&";
                szURL += "a=" + mainObject.urlEncode(mainObject.m_szSessionID) + "&";
                szURL += "au=" + mainObject.urlEncode(mainObject.m_szAuthUser) + "&";
                szURL += "ptid=0";
                mainObject.m_Log.Write("Hotmail-SR-BETA - emailOnloadHandler - szURL :" + szURL);

                mainObject.m_HttpComms.addValuePair("cn","Microsoft.Msn.Hotmail.Ui.Fpp.MailBox");
                mainObject.m_HttpComms.addValuePair("mn","GetInboxData");

                var szD = "{[],[],";
                szD += "[{\""   + szLastRowId + "\",\"" + szLastRowDate + "\",";
                szD += "2,38,false,2,null,0,"
                szD += "\"" + mainObject.m_szFolderID + "\",";  //folderID
                szD += "null,null,null,0,1,4,true,null,26,null,1}],[],[]}";
                             
                szD = mainObject.urlEncode(szD);
                mainObject.m_HttpComms.addValuePair("d",szD);
                mainObject.m_HttpComms.addValuePair("v","1");
                mainObject.m_HttpComms.addRequestHeader("mt",mainObject.m_szMT, true);

                mainObject.m_HttpComms.setURI(szURL);
                mainObject.m_HttpComms.setRequestMethod("POST");
                var bResult = mainObject.m_HttpComms.send(mainObject.mailBoxOnloadHandler, mainObject);
                if (!bResult) throw new Error("httpConnection returned false");
            }
            else  //done with mailbox
            {
                if (mainObject.m_aszFolderURLList.length>0)
                {
                    var oFolder = mainObject.m_aszFolderURLList.shift();
                    mainObject.m_szFolderID = oFolder.szID;
                    mainObject.m_szFolderName = oFolder.szFolderName;
                    mainObject.m_iMsgCount = oFolder.iMSGCount;
                    mainObject.m_Log.Write("Hotmail-SR-BETA - emailOnloadHandler - Next mail box "+mainObject.m_szFolderName +
                    							"  id " + mainObject.m_szFolderID + " " + mainObject.m_iMsgCount);
                    var szURL = mainObject.m_szLocationURI + "default.aspx?fid="+ mainObject.m_szFolderID;
                    mainObject.m_HttpComms.setURI(szURL);
                    mainObject.m_HttpComms.setRequestMethod("GET");
                    var bResult = mainObject.m_HttpComms.send(mainObject.mailBoxOnloadHandler, mainObject);
                    if (!bResult) throw new Error("httpConnection returned false");
                }
                else  //all uri's collected
                {
                    if (mainObject.m_bStat) //called by stat
                    {
                        mainObject.serverComms("+OK "+ mainObject.m_aMsgDataStore.length + " " + mainObject.m_iTotalSize + "\r\n");
                    }
                    else //called by list
                    {
                        var callback = {
                           notify: function(timer){ this.parent.processSizes(timer)}
                        };
                        callback.parent = mainObject;
                        mainObject.m_iHandleCount = 0;
                        mainObject.m_Timer.initWithCallback(callback,
                                                            mainObject.m_iTime,
                                                            Components.interfaces.nsITimer.TYPE_REPEATING_SLACK);
                    }
                }
            }
            mainObject.m_Log.Write("Hotmail-SR-BETA - MailBoxOnload - END");
        }
        catch(err)
        {
             mainObject.m_Log.DebugDump("Hotmail-SR-BETA: MailboxOnload : Exception : "
                                              + err.name
                                              + ".\nError message: "
                                              + err.message+ "\n"
                                              + err.lineNumber);

            mainObject.serverComms("-ERR negative vibes from " +mainObject.m_szUserName+ "\r\n");
        }
    },



    processMSG : function (szMSGData,szStatView)
    {
        try
        {
            this.m_Log.Write("Hotmail-SR-BETA - processMSG - START");
            
            var aszData= szMSGData.split(/[\[\]]/);
            this.m_Log.Write("Hotmail-SR-BETA - processMSG - aszData: " + aszData);
          
            //message ID
            var szEmailID = aszData[0].match(/\("(.*?)"/)[1];
            this.m_Log.Write("Hotmail-SR-BETA - processMSG -  szEmailID : " +  szEmailID);                                    
            
            this.incMsgCount(this.m_szFolderID);
                      
            var oMSG =  null;
            var bRead = true;
            if (this.m_bDownloadUnread)
            {
            	//("cmGJ1l6LjL4xGxIAAhWtnmmA2",null,null,1,1, //unread
                //("cmiDkZNGYB0UC3FASQEJamrg2",null,null,1,0,  // read
                if (aszData[0].spilt[4].search(/0/)!=-1) bRead = false
                this.m_Log.Write("Hotmail-SR-BETA.js - processMSG - bRead -" + bRead);
            }

            if (bRead) //unread
            {
                oMSG = new HotmailMSG();
               
                oMSG.szDate = aszData[0].split(/,/)[5].match(/"(.*?)"/)[1];
                oMSG.szDate = this.urlDecode( oMSG.szDate );
                oMSG.szDate =  oMSG.szDate .replace(/\:/g,"\\:")
    			this.m_Log.Write("Hotmail-SR-BETA - mailBoxOnloadHandler - Email Date : " +   oMSG.szDate );
                
                oMSG.szMad = aszData[6].split(/,/)[22].match(/"(.*?)"/)[1];
                this.m_Log.Write("Hotmail-SR-BETA.js - processMSG - oMSG.szMad -" + oMSG.szMad);
                oMSG.szNum1 = aszData[6].split(/,/)[21];
                this.m_Log.Write("Hotmail-SR-BETA.js - processMSG - oMSG.szNum1 -" + oMSG.szNum1);
                
             	
                oMSG.szMSGID 	  = szEmailID;
                oMSG.szFolderName = this.m_szFolderName;
                oMSG.szFolderID   = this.m_szFolderID;
                oMSG.szTo         = this.m_szUserName;

                          
                var szFrom = "";
                try
                {
                    szFrom = aszData[5].match(/"(.*?)"/)[1]; 
                    szFrom = this.urlDecode(szFrom);
                    this.m_Log.Write("Hotmail-SR-BETA - processMSG - Email Alt From : " + szFrom);
                }
                catch(err){}
                oMSG.szFrom = szFrom;

                var szSubject= "";
                try
                {
                    szSubject =  aszData[2].split(/,/)[3].match(/"(.*?)"/)[1];
                    szSubject =this.urlDecode(szSubject);
                    this.m_Log.Write("Hotmail-SR-BETA - processMSG - Email Subject Alt : " + szSubject);
                }
                catch(err){}
                oMSG.szSubject = szSubject;
               

                try
                {
                    var today = new Date();
                    var szRawDate = oMSG.szDate;
                  

                    if (szRawDate.search(/:/)!=-1)//check for time
                    {
                        var aTime = szRawDate.split(/:|\s/);
                        this.m_Log.Write("Hotmail-SR-BETA.js - processMSG - time "+aTime);
                        if (aTime[2] == 'PM')
                            today.setHours(parseInt(aTime[0])+12);
                        else
                            today.setHours(aTime[0]);

                        today.setMinutes(aTime[1]);
                    }
                    else if (szRawDate.search(/\//)!=-1)   //date
                    {
                        var aDate = szRawDate.split(/\//);
                        if (aDate[2].length>2)
                            today.setFullYear(aDate[2]);   //Hotmail uses YY
                        else
                            today.setFullYear("20" + aDate[2]);   //Hotmail uses YY

                        this.m_Log.Write("Hotmail-SR-BETA.js - processMSG - date "+aDate);
                        if (this.m_szLocale.search(/en-US/i)!=-1)
                        {
                            this.m_Log.Write("Hotmail-SR-BETA.js - processMSG - date mm/day");
                            today.setMonth(aDate[0]-1);
                            today.setDate(aDate[1]);
                        }
                        else
                        {
                            this.m_Log.Write("Hotmail-SR-BETA.js - processMSG - date day/mm");
                            today.setMonth(aDate[1]-1);
                            today.setDate(aDate[0]);
                        }
                    }
                    else  //yesterday
                    {
                         today.setDate(today.getDate()-1);
                    }
                    oMSG.stringDate = today.toUTCString();
                    this.m_Log.Write("Hotmail-SR-BETA.js - processMSG - " + oMSG.stringDate);
                }
                catch(err){}

                oMSG.iSize = 1000;
                this.m_Log.Write("Hotmail-SR-BETA - processMSG - size " + oMSG.iSize );
                this.m_iTotalSize += oMSG.iSize;

                oMSG.szStatView = szStatView;
            }

            this.m_Log.Write("Hotmail-SR-BETA - processMSG - END");
            return oMSG;
        }
        catch(e)
        {
            this.m_Log.Write("Hotmail-SR-BETA: processMSG : Exception : "
                              + e.name
                              + ".\nError message: "
                              + e.message+ "\n"
                              + e.lineNumber);

            return null;
        }
    },



    //list
    getMessageSizes : function()
    {
        try
        {
            this.m_Log.Write("Hotmail-SR-BETA - getMessageSizes - START");

            if (this.m_bStat)
            {  //msg table has been donwloaded
                 var callback = {
                   notify: function(timer) { this.parent.processSizes(timer)}
                };
                callback.parent = this;
                this.m_iHandleCount = 0;
                this.m_Timer.initWithCallback(callback,
                                              this.m_iTime,
                                              Components.interfaces.nsITimer.TYPE_REPEATING_SLACK);
            }
            else
            {
                if (this.m_aszFolderURL.length==0) return false;
                this.mailBox(false);
            }
            this.m_Log.Write("Hotmail-SR-BETA - getMessageSizes - END");
            return true;
        }
        catch(e)
        {
            this.m_Log.DebugDump("Hotmail-SR-BETA: getMessageSizes : Exception : "
                                          + e.name
                                          + ".\nError message: "
                                          + e.message+ "\n"
                                          + e.lineNumber);
            this.serverComms("-ERR negative vibes from " +this.m_szUserName+ "\r\n");
            return false;
        }
    },



    processSizes : function(timer)
    {
        try
        {
            this.m_Log.Write("Hotmail-SR-BETA.js - processSizes - START");

            //response start
            if (this.m_iHandleCount ==  0)
                this.serverComms("+OK " + this.m_aMsgDataStore.length + " Messages\r\n")


            if ( this.m_aMsgDataStore.length > 0)
            {
                var iCount = 0;
                do{
                    var iEmailSize = this.m_aMsgDataStore[this.m_iHandleCount].iSize;
                    this.serverComms((this.m_iHandleCount+1) + " " + iEmailSize + "\r\n");
                    this.m_iHandleCount++;
                    iCount++;
                }while(iCount != this.m_iProcessAmount && this.m_iHandleCount!=this.m_aMsgDataStore.length)
            }

            //response end
            if (this.m_iHandleCount == this.m_aMsgDataStore.length)
            {
              this.serverComms(".\r\n");
              timer.cancel();
            }

            this.m_Log.Write("Hotmail-SR-BETA.js - processSizes - END");
        }
        catch(err)
        {
            this.m_Timer.cancel();
            this.m_Log.DebugDump("Hotmail-SR-BETA.js: processSizes : Exception : "
                                              + err.name
                                              + ".\nError message: "
                                              + err.message+ "\n"
                                              + err.lineNumber);

            this.serverComms("-ERR negative vibes from " +this.m_szUserName+ "\r\n");
        }
    },



    //IUDL
    getMessageIDs : function()
    {
        try
        {
            this.m_Log.Write("Hotmail-SR-BETA - getMessageIDs - START");

             var callback = {
               notify: function(timer) { this.parent.processIDS(timer)}
            };
            callback.parent = this;
            this.m_iHandleCount = 0;
            this.m_Timer.initWithCallback(callback,
                                          this.m_iTime,
                                          Components.interfaces.nsITimer.TYPE_REPEATING_SLACK);

            this.m_Log.Write("Hotmail-SR-BETA - getMessageIDs - END");
            return true;
        }
        catch(e)
        {
            this.m_Log.DebugDump("Hotmail-SR-BETA: getMessageIDs : Exception : "
                                          + e.name
                                          + ".\nError message: "
                                          + e.message+ "\n"
                                          + e.lineNumber);
            this.serverComms("-ERR negative vibes from " +this.m_szUserName+ "\r\n");
            return false;
        }
    },



    processIDS : function(timer)
    {
        try
        {
            this.m_Log.Write("Hotmail-SR-BETA.js - processIDS - START");

            //response start
            if (this.m_iHandleCount ==  0)
                this.serverComms("+OK " + this.m_aMsgDataStore.length + " Messages\r\n");


            if ( this.m_aMsgDataStore.length > 0)
            {
                var iCount = 0;
                do{
                    var szEmailID = this.m_aMsgDataStore[this.m_iHandleCount].szMSGID;
                    this.m_Log.Write("Hotmail-SR-BETA - getMessageIDs - Email ID : " +szEmailID);
                    this.serverComms((this.m_iHandleCount+1) + " " + szEmailID + "\r\n");
                    this.m_iHandleCount++;
                    iCount++;
                }while(iCount != this.m_iProcessAmount && this.m_iHandleCount!=this.m_aMsgDataStore.length)
            }


            //response end
            if (this.m_iHandleCount == this.m_aMsgDataStore.length)
            {
                this.serverComms(".\r\n");
                timer.cancel();
            }

            this.m_Log.Write("Hotmail-SR-BETA.js - processIDS - END");
        }
        catch(err)
        {
            this.m_Timer.cancel();
            this.m_Log.DebugDump("Hotmail-SR-BETA..js: processIDS : Exception : "
                                              + err.name
                                              + ".\nError message: "
                                              + err.message+ "\n"
                                              + err.lineNumber);

            this.serverComms("-ERR negative vibes from " +this.m_szUserName+ "\r\n");
        }
    },



    //top
    getMessageHeaders : function(lID)
    {
        try
        {
            this.m_Log.Write("Hotmail-SR-BETA.js - getHeaders - START");
            this.m_Log.Write("Hotmail-SR-BETA.js - getHeaders - id " + lID );

            var oMSG = this.m_aMsgDataStore[lID-1];

            var szHeaders = "X-WebMail: true\r\n";
            szHeaders += "X-Folder: " +oMSG.szFolderName + "\r\n";
            szHeaders += "To: "+ oMSG.szTo +"\r\n";
            szHeaders += "From: "+ oMSG.szFrom +"\r\n";
            szHeaders += "Subject: "+ oMSG.szSubject +"\r\n";
            szHeaders += "Date: " + oMSG.szDate +"\r\n"; // \r\n";
            szHeaders += "\r\n.\r\n";//msg end

            var  szResponse = "+OK " +szHeaders.length + "\r\n";
            szResponse += szHeaders
            this.serverComms(szResponse);

            this.m_Log.Write("Hotmail-SR-BETA.js - getHeaders - END");
            return true;
        }
        catch(err)
        {
            this.m_Log.DebugDump("Hotmail-SR-BETA.js: getHeaders : Exception : "
                                          + err.name +
                                          ".\nError message: "
                                          + err.message+ "\n"
                                          + err.lineNumber);
            this.serverComms("-ERR negative vibes from " +this.m_szUserName+ "\r\n");
            return false;
        }
    },



    //retr
    getMessage : function( lID)
    {
        try
        {
            this.m_Log.Write("Hotmail-SR-BETA - getMessage - START");
            this.m_Log.Write("Hotmail-SR-BETA - getMessage - msg num" + lID);

            //get msg id
            var oMSG = this.m_aMsgDataStore[lID-1];
            this.m_szMsgID = oMSG.szMSGID;
         
            var szURI = this.m_szLocationURI + "GetMessageSource.aspx?tid=" + this.m_szMsgID +"&fid="+oMSG.szFolderID;
            this.m_Log.Write("Hotmail-SR-BETA - getMessage - msg uri" + szURI);

            if (this.m_MSGEscape) delete this.m_MSGEscape;
            this.m_szFolderName = oMSG.szFolderName;
            this.m_szFolderID = oMSG.szFolderID;
            this.m_szNum1 = oMSG.szNum1;
            this.m_szMad = oMSG.szMad;
            this.m_iStage = 0;
            this.m_iDownloadRetry = 3;

            //get msg from hotmail
            this.m_HttpComms.setURI(szURI);
            this.m_HttpComms.setRequestMethod("GET");
            this.m_HttpComms.addRequestHeader("Accept-Encoding", "deflate", true);

            var bResult = this.m_HttpComms.send(this.emailOnloadHandler, this);
            if (!bResult) throw new Error("httpConnection returned false");

            this.m_Log.Write("Hotmail-SR-BETA - getMessage - END");
            return true;
        }
        catch(e)
        {
             this.m_Log.DebugDump("Hotmail-SR-BETA: getMessage : Exception : "
                                          + e.name +
                                          ".\nError message: "
                                          + e.message+ "\n"
                                          + e.lineNumber);
            this.serverComms("-ERR negative vibes from " +this.m_szUserName+ "\r\n");
            return false;
        }
    },



    emailOnloadHandler : function (szResponse ,event , mainObject)
    {
        try
        {
            mainObject.m_Log.Write("Hotmail-SR-BETA - emailOnloadHandler - START");

            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);
            mainObject.m_Log.Write("Hotmail-SR-BETA - emailOnloadHandler - msg :" + httpChannel.responseStatus);

            //check status should be 200.
            if (httpChannel.responseStatus != 200)
            {
                if (mainObject.m_iDownloadRetry > 0 && mainObject.m_iStage == 0)
                {   
                    var szURI = mainObject.m_szLocationURI + "GetMessageSource.aspx?tid=" + mainObject.m_szMSGID 
                    												+"&fid="+mainObject.szFolderID;
                    mainObject.m_Log.Write("Hotmail-SR-BETA - getMessage - msg uri" + szURI);
                    mainObject.m_HttpComms.setURI(szURI);
                    mainObject.m_HttpComms.setRequestMethod("GET");

                    var bResult = mainObject.m_HttpComms.send(mainObject.emailOnloadHandler, mainObject);
                    mainObject.m_iDownloadRetry--;
                    return;
                }
                else throw new Error("error status " + httpChannel.responseStatus);
            }

            if (mainObject.m_iStage==0)
            {	//get email
        		var aTemp = szResponse.split(/<pre>/);
                if (!aTemp) throw new Error("Message START  not found");
                var szEmail = aTemp[1].split(/<\/pre>/)[0];
                if (!szEmail) throw new Error("Message END  not found");
                szEmail = szEmail.replace(/<\/$/,"");  //clean bad tag
                szEmail = szEmail.replace(/<\/pr$/,"");  //clean bad tag
                szEmail = szEmail.replace(/<\/pre$/,"");  //clean bad tag - Why can't MS get this right
                mainObject.m_szMSG = szEmail;
                mainObject.m_iStage++;
                
                if (mainObject.m_bMarkAsRead)
                {
                    mainObject.m_Log.Write("Hotmail-SR-BETA - emailOnloadHandler - MarkAsRead");
                    var szURL = mainObject.m_szLocationURI + "mail.fpp?"
                    szURL += "cnmn=Microsoft.Msn.Hotmail.Ui.Fpp.MailBox.MarkMessagesReadState&";
                    szURL += "a=" + mainObject.urlEncode(mainObject.m_szSessionID) + "&";
                    szURL += "au=" + mainObject.m_szAuthUser + "&";
                    szURL += "ptid=0";
                    mainObject.m_Log.Write("Hotmail-SR-BETA - emailOnloadHandler - szURL :" + szURL);
                    mainObject.m_HttpComms.addValuePair("cn","Microsoft.Msn.Hotmail.Ui.Fpp.MailBox");
                    mainObject.m_HttpComms.addValuePair("mn","MarkMessagesReadState");
                   
            /*      d=true,
                    [%22cm736VynHD4xGfPAAhWtmjkg2%22],
                    [{10516,0,%225247016365775817904%22,%22flinbox%22,0,0,0,0,2,[3,15]}],
                    [{%22%22,%22flinbox%22,null}],{[],[],[],[],[]},null
              */      
                                       
                    var szD = "true,";
                    szD    += "[\""  + mainObject.m_szMsgID + "\"],";
                    szD    += "[{"+mainObject.m_szNum1+",0,\"" + mainObject.m_szMad + "\",\""+mainObject.m_szFolderID+"\",0,0,0,0,2,[3,15]}],";
                    szD    += "[{\"\",\""+mainObject.m_szFolderID+"\",null}],{[],[],[],[],[]},null";
                                                                    
                    szD = mainObject.urlEncode(szD);
                    mainObject.m_HttpComms.addValuePair("d",szD);
                    mainObject.m_HttpComms.addValuePair("v","1");
                    mainObject.m_HttpComms.addRequestHeader("Mt",mainObject.m_szMT, true);
                    mainObject.m_bMarked=true;
                    mainObject.m_HttpComms.setURI(szURL);
                    mainObject.m_HttpComms.setRequestMethod("POST");
                    var bResult = mainObject.m_HttpComms.send(mainObject.emailOnloadHandler, mainObject);
                    if (!bResult) throw new Error("httpConnection returned false");
                }
            }
            else
    		{ //clean email
	            mainObject.m_MSGEscape = new HTMLescape(mainObject.m_Log);
	            if (!mainObject.m_MSGEscape.decodeAsync(mainObject.m_szMSG, mainObject.emailCleanCallback, mainObject))
	                throw new Error ("email clean failed")
    		}
           mainObject.m_Log.Write("Hotmail-SR-BETA - emailOnloadHandler - END");
        }
        catch(err)
        {
            mainObject.m_Log.DebugDump("Hotmail-SR-BETA: emailOnloadHandler : Exception : "
                                          + err.name
                                          + ".\nError message: "
                                          + err.message+ "\n"
                                          + err.lineNumber);

            mainObject.serverComms("-ERR negative vibes from " +mainObject.m_szUserName+ "\r\n");
        }
    },




    emailCleanCallback : function (szMSG, mainObject)
    {
        try
        {
            mainObject.m_Log.Write("Hotmail-SR-BETA - emailCleanCallback - START");

            //clean up msg
            mainObject.m_szMSG = "X-WebMail: true\r\n";
            mainObject.m_szMSG += "X-Folder: " + mainObject.m_szFolderName + "\r\n";
            mainObject.m_szMSG += szMSG;
            mainObject.m_szMSG =  mainObject.m_szMSG.replace(/^\./mg,"..");    //bit padding
            mainObject.m_szMSG += "\r\n.\r\n";
       
            var szPOPResponse = "+OK " +  mainObject.m_szMSG.length + "\r\n";
            szPOPResponse +=  mainObject.m_szMSG;
            mainObject.serverComms(szPOPResponse);
         
            mainObject.m_Log.Write("Hotmail-SR-BETA - emailCleanCallback - END");
        }
        catch(e)
        {
            mainObject.m_Log.DebugDump("Hotmail-SR-BETA: emailCleanCallback : Exception : "
                                          + e.name +
                                          ".\nError message: "
                                          + e.message+ "\n"
                                          + e.lineNumber);
            mainObject.serverComms("-ERR negative vibes from " +mainObject.m_szUserName+ "\r\n");
        }
    },



    //dele
    deleteMessage : function(lID)
    {
        try
        {
            this.m_Log.Write("Hotmail-SR-BETA - deleteMessage - START");
            this.m_Log.Write("Hotmail-SR-BETA - deleteMessage - id " + lID );

            var oMSG = this.m_aMsgDataStore[lID-1];

            var szURL = this.m_szLocationURI + "mail.fpp?"
            szURL += "cnmn=Microsoft.Msn.Hotmail.Ui.Fpp.MailBox.MoveMessagesToFolder&";
            szURL += "ptid=0&";
            szURL += "a=" +  this.urlEncode(this.m_szSessionID) + "&";
            szURL += "au=" + this.m_szAuthUser ;
           
            this.m_Log.Write("Hotmail-SR-BETA - deleteMessage - szURL :" + szURL);
            this.m_HttpComms.setURI(szURL);

            this.m_HttpComms.addValuePair("cn","Microsoft.Msn.Hotmail.Ui.Fpp.MailBox");
            this.m_HttpComms.addValuePair("mn","MoveMessagesToFolder");
            this.m_szFolderID = oMSG.szFolderID;
             
             /*
             d=%22fltrash%22,
             [%22cmlRTKqvRD5BGewgAiZMFUTg2%22],
			 [{10516,0,%225247157665372187904%22,%22flinbox%22,0,1,0,0,2,[3,15],45,%22donotrespond%40pof.com%22}],
			 [{%22%22,%22flinbox%22,null}],false,false,false,true,{[],[],[],[],[],[]},null
             */
                    
            var szD = "\"fltrash\","; //from folder
            szD   +=  "[\"" + oMSG.szMSGID + "\"],"; //msg ID
            szD   +=  "[{"+oMSG.szNum1+",0,\"" + oMSG.szMad + "\",\"" + oMSG.szFolderID + "\",0,0,0,0,2,[3,15],45,";
            szD   +=  "\""+  oMSG.szFrom +"\"";
            szD   +=  "}],[{\"\",\"" +  oMSG.szFolderID +"\",null}],false,false,false,true,{[],[],[],[],[],[]},null";
           
       	              
            szD = this.urlEncode(szD);
            this.m_HttpComms.addValuePair("d",szD);
            this.m_HttpComms.addValuePair("v","1");
            this.m_HttpComms.addRequestHeader("Mt",this.m_szMT, true);
            
            this.m_HttpComms.setRequestMethod("POST");
            var bResult = this.m_HttpComms.send(this.deleteMessageOnloadHandler, this);
            if (!bResult) throw new Error("httpConnection returned false");

            this.m_Log.Write("Hotmail-SR-BETA - deleteMessage - END");
            return true;
        }
        catch(e)
        {
            this.m_Log.DebugDump("Hotmail-SR-BETA: deleteMessage : Exception : "
                                          + e.name +
                                          ".\nError message: "
                                          + e.message+ "\n"
                                          + e.lineNumber);
            this.serverComms("-ERR negative vibes from " +this.m_szUserName+ "\r\n");
            return false;
        }
    },


    deleteMessageOnloadHandler : function (szResponse ,event , mainObject)
    {
        try
        {
            mainObject.m_Log.Write("Hotmail-SR-BETA - deleteMessageOnload - START");

            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);

            //check status should be 200.
            mainObject.m_Log.Write("Hotmail-SR-BETA - deleteMessageOnload :" + httpChannel.responseStatus);
            if (httpChannel.responseStatus != 200 )
                throw new Error("error status " + httpChannel.responseStatus);

            if (szResponse.search(/HM.FppError/i)==-1)
            {	
            	mainObject.decMsgCount(mainObject.m_szFolderID);
                mainObject.serverComms("+OK its history\r\n");
            }
            else
               mainObject.serverComms("-ERR negative vibes from " +mainObject.m_szUserName+ "\r\n");

            mainObject.m_Log.Write("Hotmail-SR-BETA - deleteMessageOnload - END");
        }
        catch(e)
        {
            mainObject.m_Log.DebugDump("Hotmail-SR-BETA: deleteMessageOnload : Exception : "
                                              + e.name
                                              + ".\nError message: "
                                              + e.message+ "\n"
                                              + e.lineNumber);
            mainObject.serverComms("-ERR negative vibes from " +mainObject.m_szUserName+ "\r\n");
        }
    },



    logOut : function()
    {
        try
        {
            this.m_Log.Write("Hotmail-SR-BETA - logOUT - START");

            if (this.m_bReUseSession)
            {
                this.m_Log.Write("Hotmail-SR-BETA - logOUT - Setting Session Data");

                this.m_ComponentManager.addElement(this.m_szUserName, "szHomeURI", this.m_szHomeURI);
            }
            else
            {
                this.m_Log.Write("Hotmail-SR-BETA - logOUT - removing Session Data");
                this.m_ComponentManager.deleteAllElements(this.m_szUserName);

                var oCookies = Components.classes["@mozilla.org/nsWebMailCookieManager2;1"]
                                         .getService(Components.interfaces.nsIWebMailCookieManager2);
                oCookies.removeCookie(this.m_szUserName);
            }

            this.m_bAuthorised = false;
            this.serverComms("+OK Your Out\r\n");

            this.m_Timer.cancel();
            delete this.m_aMsgDataStore;
            delete this.m_aszFolders;
            delete this.m_aszFolderURL;
            delete this.m_HttpComms;
            if (this.m_MSGEscape) delete this.m_MSGEscape;

            this.m_Log.Write("Hotmail-SR-BETA - logOUT - END");
            return true;
        }
        catch(e)
        {
            this.m_Log.DebugDump("Hotmail-SR-BETA: logOUT : Exception : "
                                      + e.name
                                      + ".\nError message: "
                                      + e.message+ "\n"
                                      + e.lineNumber);
            this.serverComms("-ERR negative vibes from " +this.m_szUserName+ "\r\n");
            return false;
        }
    },



    serverComms : function (szMsg)
    {
        try
        {
            this.m_Log.Write("Hotmail-SR-BETA - serverComms - START");
            this.m_Log.Write("Hotmail-SR-BETA - serverComms msg " + szMsg);
            var iCount = this.m_oResponseStream.write(szMsg,szMsg.length);
            this.m_Log.Write("Hotmail-SR-BETA - serverComms sent count: " + iCount +" msg length: " +szMsg.length);
            this.m_Log.Write("Hotmail-SR-BETA - serverComms - END");
        }
        catch(e)
        {
            this.m_Log.DebugDump("Hotmail-SR-BETA: serverComms : Exception : "
                                              + e.name
                                              + ".\nError message: "
                                              + e.message+ "\n"
                                              + e.lineNumber);
        }
    },



    /*
    %60 %7E %40 %24 %25 %5E
    `   ~   @   $   %   ^

    %26 %28 %29 %2B %3D
    &   (    )   +   =

    %7B %7D %7C %5B %5D %5C  %22
    {    }   |   [   ]   \    "

    %3B %27 %3C %3E %3F %2C %2F
    ;     '  <   >   ?   ,   /
    */
    urlEncode : function (szData)
    {
        var szEncoded = encodeURI(szData);
        szEncoded = szEncoded.replace(/!/g,"%21");
        szEncoded = szEncoded.replace(/\:/g,"%3A");
        szEncoded = szEncoded.replace(/\#/g,"%23");
        szEncoded = szEncoded.replace(/\@/g,"%40");
        szEncoded = szEncoded.replace(/&/g,"%26");
        szEncoded = szEncoded.replace(/=/g,"%3d");
        szEncoded = szEncoded.replace(/%25/g,"%");
        szEncoded = szEncoded.replace(/%5B/g,"[");
        szEncoded = szEncoded.replace(/%5D/g,"]");
        szEncoded = szEncoded.replace(/%7B/g,"{");
        szEncoded = szEncoded.replace(/%7D/g,"}");
        return szEncoded;

    },


    urlDecode : function (szDate)
    {
        var szDecode = szDate.replace(/\\x3a/g,":");
        szDecode = szDecode.replace(/&#58;/g,":");
        szDecode = szDecode.replace(/\\x2f/g,"/");
        szDecode = szDecode.replace(/\\x252f/g,"/");
        szDecode = szDecode.replace(/&#47;/g,"/");
        szDecode = szDecode.replace(/\\x3f/g,"?");
        szDecode = szDecode.replace(/&#63;/g,"?");
        szDecode = szDecode.replace(/\\x3d/g,"=");
        szDecode = szDecode.replace(/\\x253d/g,"=");
        szDecode = szDecode.replace(/&#61;/g,"=");       
        szDecode = szDecode.replace(/\\x40/g,"@");
        szDecode = szDecode.replace(/\\x26/g,"&");
        return szDecode;
    },
 
    
    
    createFolder : function(szFolderID)
    {
    	try
    	{
    		this.m_Log.Write("Hotmail-SR-BETA - createFolder - START " +szFolderID);

    		var oFolder = new FolderData()
    		oFolder.szID = szFolderID;
    		this.m_aFolderMsgCount.push(oFolder);
    		
			this.m_Log.Write("Hotmail-SR-BETA - createFolder - END " );
    	}
    	catch(e)
    	{
            this.m_Log.DebugDump("Hotmail-SR-BETA: createFolder : Exception : "
					                    + e.name
					                    + ".\nError message: "
					                    + e.message+ "\n"
					                    + e.lineNumber);

    	}
    },
    
    
    
    getMSGCount : function (szFolderID)
    {
    	try
    	{
    		this.m_Log.Write("Hotmail-SR-BETA - getMSGCount - START " +szFolderID);
    		var iCount = 0;
    		
    		if (this.m_aFolderMsgCount.length>0)
    		{
	            var regExp = new RegExp("^"+ szFolderID + "$","i");
				this.m_Log.Write("Hotmail-SR-BETA - getMSGCount -  " +szFolderID);
    			for(i=0; i<this.m_aFolderMsgCount.length; i++)
    			{
    				if (this.m_aFolderMsgCount[i].szID.search(regExp)!=-1)
    				{
    					iCount = this.m_aFolderMsgCount[i].iMSGCount;
    				}
    			}
    		}
    		
			this.m_Log.Write("Hotmail-SR-BETA - getMSGCount - END " + iCount);
			return iCount;
    	}
    	catch(e)
    	{
            this.m_Log.DebugDump("Hotmail-SR-BETA: getMSGCount : Exception : "
					                    + e.name
					                    + ".\nError message: "
					                    + e.message+ "\n"
					                    + e.lineNumber);

    	}
    },
    
  
    
    incMsgCount : function (szFolderID)
    {
    	try
    	{
    		this.m_Log.Write("Hotmail-SR-BETA - incMsgCount - START " +szFolderID);
    		var iCount = 0;
    		
    		if (this.m_aFolderMsgCount.length>0)
    		{
	            var regExp = new RegExp("^"+ szFolderID + "$","i");
				this.m_Log.Write("Hotmail-SR-BETA - incMsgCount -  " +szFolderID);
    			for(i=0; i<this.m_aFolderMsgCount.length; i++)
    			{
    				if (this.m_aFolderMsgCount[i].szID.search(regExp)!=-1)
    				{
    					this.m_aFolderMsgCount[i].iMSGCount++;
    					this.m_Log.Write("Hotmail-SR-BETA - incMsgCount -  "+ + this.m_aFolderMsgCount[i].iMSGCount);
    				}
    			}
    		}
    		
			this.m_Log.Write("Hotmail-SR-BETA - incMsgCount - END " );
    	}
    	catch(e)
    	{
            this.m_Log.DebugDump("Hotmail-SR-BETA: incMsgCount : Exception : "
					                    + e.name
					                    + ".\nError message: "
					                    + e.message+ "\n"
					                    + e.lineNumber);

    	}
    },
    
    
    
    decMsgCount : function (szFolderID)
    {
    	try
    	{
    		this.m_Log.Write("Hotmail-SR-BETA - decMsgCount - START " +szFolderID);
    		var iCount = 0;
    		
    		if (this.m_aFolderMsgCount.length>0)
    		{
	            var regExp = new RegExp("^"+ szFolderID + "$","i");
				this.m_Log.Write("Hotmail-SR-BETA - decMsgCount -  " +szFolderID);
    			for(i=0; i<this.m_aFolderMsgCount.length; i++)
    			{
    				if (this.m_aFolderMsgCount[i].szID.search(regExp)!=-1)
    				{
    					this.m_aFolderMsgCount[i].iMSGCount--;
    					this.m_Log.Write("Hotmail-SR-BETA - decMsgCount -  "+ this.m_aFolderMsgCount[i].iMSGCount);
    				}
    			}
    		}
    		
			this.m_Log.Write("Hotmail-SR-BETA - decMsgCount - END " );
    	}
    	catch(e)
    	{
            this.m_Log.DebugDump("Hotmail-SR-BETA: decMsgCount : Exception : "
					                    + e.name
					                    + ".\nError message: "
					                    + e.message+ "\n"
					                    + e.lineNumber);

    	}
    	
    }
}
