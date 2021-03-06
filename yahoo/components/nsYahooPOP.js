Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");
const ExtYahooGuid = "{d7103710-6112-11d9-9669-0800200c9a66}";

/******************************  Yahoo ***************************************/
function nsYahoo()
{
    try
    {
        var scriptLoader = Components.classes["@mozilla.org/moz/jssubscript-loader;1"];
        scriptLoader = scriptLoader.getService(Components.interfaces.mozIJSSubScriptLoader);
        scriptLoader.loadSubScript("chrome://web-mail/content/common/DebugLog.js");
        scriptLoader.loadSubScript("chrome://web-mail/content/common/CommonPrefs.js");
        //scriptLoader.loadSubScript("chrome://yahoo/content/Yahoo-POP.js");
        scriptLoader.loadSubScript("chrome://yahoo/content/Yahoo-POP-Beta.js");
        //scriptLoader.loadSubScript("chrome://yahoo/content/Yahoo-POP-Classic.js");
        scriptLoader.loadSubScript("chrome://yahoo/content/Yahoo-Prefs-Accounts-Data.js");

        var date = new Date();
        var  szLogFileName = "Yahoo Log - " + date.getHours()+ "-" + date.getMinutes() + "-"+ date.getUTCMilliseconds() +" -";
        this.m_Log = new DebugLog("webmail.logging.comms", ExtYahooGuid, szLogFileName);
        this.m_Log.Write("nsYahoo.js - Constructor - START");

        if (typeof kYahooConstants == "undefined")
        {
            this.m_Log.Write("nsYahoo.js - Constructor - loading constants");
            scriptLoader.loadSubScript("chrome://yahoo/content/Yahoo-Constants.js");
        }

        this.m_bAuthorised = false;
        this.m_szUserName = null;
        this.m_szPassWord = null;
        this.m_oResponseStream = null;
        this.m_CommMethod = null;

        this.m_Log.Write("nsYahoo.js - Constructor - END");
    }
    catch(e)
    {
        DebugDump("nsYahoo.js: Constructor : Exception : "
                                      + e.name
                                      + ".\nError message: "
                                      + e.message+ "\n"
                                      + e.lineNumber);
    }
}


nsYahoo.prototype =
{
    classDescription : "Webmail Yahoo mail POP",
    classID          : Components.ID("{bfacf8a0-6447-11d9-9669-0800200c9a66}"),
    contractID       : "@mozilla.org/YahooPOP;1",

    QueryInterface : XPCOMUtils.generateQI([Components.interfaces.nsISupports,
                                            Components.interfaces.nsIPOPDomainHandler]),

    get userName() {return this.m_szUserName;},
    set userName(userName) {return this.m_szUserName = userName;},

    get passWord() {return this.m_szPassWord;},
    set passWord(passWord) {return this.m_szPassWord = passWord;},

    get bAuthorised()
    {
        return (this.m_CommMethod)? this.m_CommMethod.m_bAuthorised: false;
    },

    get ResponseStream() {return this.m_oResponseStream;},
    set ResponseStream(responseStream) {return this.m_oResponseStream = responseStream;},


    logIn : function()
    {
        try
        {
            this.m_Log.Write("nsYahoo.js - logIN - START");
            this.m_Log.Write("nsYahoo.js - logIN - Username: " + this.m_szUserName
                                               + " Password: " + this.m_szPassWord
                                               + " stream: "   + this.m_oResponseStream);

            if (!this.m_szUserName || !this.m_oResponseStream  || !this.m_szPassWord) return false;

            //get prefs
            var oData = this.loadPrefs();

            //use beta site
            this.m_CommMethod = new YahooPOPBETA(this.m_oResponseStream, this.m_Log, oData);

            var bResult = this.m_CommMethod.logIn(this.m_szUserName, this.m_szPassWord);

            this.m_Log.Write("nsYahoo.js - logIN - END");
            return true;
        }
        catch(e)
        {
            this.m_Log.DebugDump("nsYahoo.js: logIN : Exception : "
                                              + e.name +
                                              ".\nError message: "
                                              + e.message+ "\n"
                                              + e.lineNumber);
            return false;
        }
    },



    //stat
    getNumMessages : function()
    {
        try
        {
            this.m_Log.Write("nsYahoo.js - getNumMessages - START");

            this.m_CommMethod.getNumMessages();

            this.m_Log.Write("nsYAhoo.js - getNumMessages - END");
            return true;
        }
        catch(e)
        {
            this.m_Log.DebugDump("nsYahoo.js: getNumMessages : Exception : "
                                          + e.name
                                          + ".\nError message: "
                                          + e.message+ "\n"
                                          + e.lineNumber);
            return false;
        }
    },



    //list
    getMessageSizes : function()
    {
        try
        {
            this.m_Log.Write("nsYahoo.js - getMessageSizes - START");

            this.m_CommMethod.getMessageSizes();

            this.m_Log.Write("nsYahoo.js - getMessageSizes - END");
            return true;
        }
        catch(e)
        {
            this.m_Log.DebugDump("nsYahoo.js: getMessageSizes : Exception : "
                                          + e.name
                                          + ".\nError message: "
                                          + e.message);
            return false;
        }
    },



    //IUDL
    getMessageIDs : function()
    {
        try
        {
            this.m_Log.Write("nsYahoo.js - getMessageIDs - START");

            this.m_CommMethod.getMessageIDs();

            this.m_Log.Write("nsYahoo.js - getMessageIDs - END");
            return true;
        }
        catch(e)
        {
            this.m_Log.DebugDump("nsYahoo.js: getMessageIDs : Exception : "
                                          + e.name
                                          + ".\nError message: "
                                          + e.message+ "\n"
                                          + e.lineNumber);
            return false;
        }
    },


    //top
    getMessageHeaders : function(lID)
    {
        try
        {
            this.m_Log.Write("nsYahoo.js - getHeaders - START");
            this.m_Log.Write("nsYahoo.js - getHeaders - id " + lID );

            this.m_CommMethod.getMessageHeaders(lID);

            this.m_Log.Write("nsYahoo.js - getHeaders - END");
            return true;
        }
        catch(e)
        {

            this.m_Log.DebugDump("nsYahoo.js: getHeaders : Exception : "
                                          + e.name +
                                          ".\nError message: "
                                          + e.message+ "\n"
                                          + e.lineNumber);
            return false;
        }
    },




    //retr
    getMessage : function( lID)
    {
        try
        {
            this.m_Log.Write("nsYahoo.js - getMessage - START");
            this.m_Log.Write("nsYahoo.js - getMessage - msg num" + lID);

            this.m_CommMethod.getMessage(lID);

            this.m_Log.Write("m_YahooLog.js - getMessage - END");
            return true;
        }
        catch(e)
        {
             this.m_Log.DebugDump("m_YahooLog.js: getMessage : Exception : "
                                          + e.name +
                                          ".\nError message: "
                                          + e.message+ "\n"
                                          + e.lineNumber);
            return false;
        }
    },




    //dele
    deleteMessage : function(lID)
    {
        try
        {
            this.m_Log.Write("nsYahoo.js - deleteMessage - START");
            this.m_Log.Write("nsYahoo.js - deleteMessage - id " + lID );

            this.m_CommMethod.deleteMessage(lID);

            this.m_Log.Write("nsYahoo.js - deleteMessage - END");
            return true;
        }
        catch(e)
        {
            this.m_Log.DebugDump("nsYahoo.js: deleteMessage : Exception : "
                                          + e.name +
                                          ".\nError message: "
                                          + e.message+ "\n"
                                          + e.lineNumber);
            return false;
        }
    },



    logOut : function()
    {
        try
        {
            this.m_Log.Write("nsYahoo.js - logOUT - START");

            this.m_CommMethod.logOut();

            this.m_Log.Write("nsYahoo.js - logOUT - END");
            return true;
        }
        catch(e)
        {
            this.m_Log.DebugDump("nsYahoo.js: logOUT : Exception : "
                                      + e.name
                                      + ".\nError message: "
                                      + e.message+ "\n"
                                      + e.lineNumber);
            return false;
        }
    },




    loadPrefs : function()
    {
        try
        {
            this.m_Log.Write("nsYahoo.js - loadPrefs - START");

            //get user prefs
            var oData = new PrefData();
            var oPref = {Value:null};
            var  WebMailPrefAccess = new WebMailCommonPrefAccess();

            var szUserName =  this.m_szUserName;
            szUserName = szUserName.replace(/\./g,"~");
            szUserName = szUserName.toLowerCase();

            //do i reuse the session
            if (WebMailPrefAccess.Get("bool","yahoo.Account."+szUserName +".bReUseSession",oPref))
                oData.bReUseSession = oPref.Value;

            //delay processing time delay
            oPref.Value = null;
            if (WebMailPrefAccess.Get("int","yahoo.iProcessDelay",oPref))
               oData.iProcessDelay = oPref.Value;

            //delay proccess amount
            oPref.Value = null;
            if (WebMailPrefAccess.Get("bool","yahoo.iProcessAmount",oPref))
                oData.iProcessAmount = oPref.Value;

            //msglist amount
            oPref.Value = null;
            if (WebMailPrefAccess.Get("int","yahoo.iMSGList",oPref))
                oData.iMSGList = oPref.Value;
            this.m_Log.Write("nsYahoo.js - loadPrefs - iMSGList " + oPref.Value);

            //use short id
            oPref.Value = null;
            if (WebMailPrefAccess.Get("bool","yahoo.Account."+szUserName +".bUseShortID",oPref))
               oData.bUseShortID = oPref.Value;
            this.m_Log.Write("nsYahoo.js - loadPrefs - bUseShortID " + oPref.Value);


            //inbox
            oPref.Value = null;
            WebMailPrefAccess.Get("bool","yahoo.Account."+szUserName+".bDownloadInbox",oPref);
            if (oPref.Value==null || oPref.Value==true ) oData.aszFolder.push("inbox");

            //get spam
            oPref.Value = null;
            if (WebMailPrefAccess.Get("bool","yahoo.Account."+szUserName+".bUseJunkMail",oPref))
               if (oPref.Value) oData.aszFolder.push("%40B%40Bulk");
            this.m_Log.Write("nsYahoo.js - loadPrefs - bUseJunkMail " + oPref.Value + " " + oData.aszFolder);


            //get folders
            oPref.Value = null;
            WebMailPrefAccess.Get("char","yahoo.Account."+szUserName+".szFolders",oPref);
            this.m_Log.Write("nsYahoo.js - loadPrefs - szFolders " + oPref.Value);
            if (oPref.Value)
            {
                var aszFolders = oPref.Value.split("\r");
                for (j=0; j<aszFolders.length; j++)
                {
                    this.m_Log.Write("nsYahoo - loadPRefs - aszFolders[j] " + aszFolders[j]);
                    var szEncoded = encodeURIComponent(aszFolders[j])
                    szEncoded = szEncoded.replace(/-/,"%2d")
                    oData.aszFolder.push(szEncoded);
                }
            }

            //use yahoo beta site
            oPref.Value = null;
            if (WebMailPrefAccess.Get("bool","yahoo.Account."+szUserName+".bBeta",oPref))
                oData.bBeta=oPref.Value;
            this.m_Log.Write("nsYahoo.js - loadPrefs - bBeta " + oPref.Value);

            //use yahoo classic site
            oPref.Value = null;
            if (WebMailPrefAccess.Get("bool","yahoo.Account."+szUserName+".bClassic",oPref))
                oData.bClassic=oPref.Value;
            this.m_Log.Write("nsYahoo.js - loadPrefs - bClassic " + oPref.Value);

            //get unread
            oPref.Value = null;
            if (WebMailPrefAccess.Get("bool","yahoo.Account."+szUserName+".bDownloadUnread",oPref))
                oData.bUnread=oPref.Value;
            this.m_Log.Write("nsYahoo.js - loadPrefs - bDownloadUnread " + oPref.Value);

            //bMarkAsRead
            oPref.Value = null;
            if (WebMailPrefAccess.Get("bool","yahoo.Account."+szUserName+".bMarkAsRead",oPref))
               oData.bMarkAsRead=oPref.Value;
            this.m_Log.Write("nsYahoo.js - loadPrefs - bMarkAsRead " + oPref.Value);

            this.m_Log.Write("nsYahoo.js - loadPrefs - END");
            return oData;
        }
        catch(e)
        {
             this.m_Log.DebugDump("nsYahoo.js: loadPrefs : Exception : "
                                              + e.name +
                                              ".\nError message: "
                                              + e.message+ "\n"
                                              + e.lineNumber);
            return null;
        }
    }
};


/**
* XPCOMUtils.generateNSGetFactory was introduced in Mozilla 2 (Firefox 4).
* XPCOMUtils.generateNSGetModule is for Mozilla 1.9.2 (Firefox 3.6).
*/
if (XPCOMUtils.generateNSGetFactory)
    var NSGetFactory = XPCOMUtils.generateNSGetFactory([nsYahoo]);
else
    var NSGetModule = XPCOMUtils.generateNSGetModule([nsYahoo]);