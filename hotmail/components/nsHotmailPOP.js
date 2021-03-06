Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");

const ExtHotmailGuid = "{3c8e8390-2cf6-11d9-9669-0800200c9a66}";


/************************************  Hotmail ********************************/
function nsHotmail()
{
    try
    {
        var scriptLoader =  Components.classes["@mozilla.org/moz/jssubscript-loader;1"];
        scriptLoader= scriptLoader.getService(Components.interfaces.mozIJSSubScriptLoader);
        scriptLoader.loadSubScript("chrome://web-mail/content/common/DebugLog.js");
        scriptLoader.loadSubScript("chrome://hotmail/content/Hotmail-ScreenRipper-POP-BETA.js");
        scriptLoader.loadSubScript("chrome://web-mail/content/common/CommonPrefs.js");
        scriptLoader.loadSubScript("chrome://hotmail/content/Hotmail-Prefs-Data.js");

        var date = new Date();

        var  szLogFileName = "Hotmail Log - " + date.getHours()+ "-"
                                              + date.getMinutes() + "-"
                                              + date.getUTCMilliseconds() +" -";
        delete date;

        this.m_HotmailLog = new DebugLog("webmail.logging.comms", ExtHotmailGuid, szLogFileName);
        this.m_HotmailLog.Write("nsHotmail.js - Constructor - START");

        if (typeof kHotmailConstants == "undefined")
        {
            this.m_HotmailLog.Write("nsHotmail.js - Constructor - loading constants");
            scriptLoader.loadSubScript("chrome://hotmail/content/Hotmail-Constants.js");
        }

        this.m_szUserName = null;
        this.m_szPassWord = null;
        this.m_oResponseStream = null;
        this.m_bAuthorised = false;
        this.m_CommMethod = null;

        this.m_HotmailLog.Write("nsHotmail.js - Constructor - END");
    }
    catch(e)
    {
        DebugDump("nsHotmail.js: Constructor : Exception : "
                                      + e.name
                                      + ".\nError message: "
                                      + e.message+ "\n"
                                      + e.lineNumber);
    }
}




nsHotmail.prototype =
{
    classDescription : "Webmail Hotmail mail POP",
    classID          : Components.ID("{3f3822e0-6374-11d9-9669-0800200c9a66}"),
    contractID       : "@mozilla.org/HotmailPOP;1",

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
            this.m_HotmailLog.Write("nsHotmail.js - logIN - START");
            this.m_HotmailLog.Write("nsHotmail.js - logIN - Username: " + this.m_szUserName
                                                   + " Password: " + this.m_szPassWord
                                                   + " stream: " + this.m_oResponseStream);

            if (!this.m_szUserName || !this.m_oResponseStream || !this.m_szPassWord) return false;

            //load webdav address
            var PrefData = this.getPrefs();

            this.m_CommMethod = new HotmailScreenRipperBETA(this.m_oResponseStream, this.m_HotmailLog, PrefData);

            var bResult = this.m_CommMethod.logIn(this.m_szUserName, this.m_szPassWord);

            delete PrefData;

            this.m_HotmailLog.Write("nsHotmail.js - logIN - "+ bResult +"- END");
            return bResult;
        }
        catch(e)
        {
            this.m_HotmailLog.DebugDump("nsHotmail.js: logIN : Exception : "
                                              + e.name +
                                              ".\nError message: "
                                              + e.message+ "\n"
                                              + e.lineNumber);
            return false;
        }
    },





    //stat
    //total size is in octets
    getNumMessages : function()
    {
        try
        {
            this.m_HotmailLog.Write("nsHotmail.js - getNumMessages - START");

            this.m_CommMethod.getNumMessages();

            this.m_HotmailLog.Write("nsHotmail.js - getNumMessages - END");
            return true;
        }
        catch(e)
        {
            this.m_HotmailLog.DebugDump("nsHotmail.js: getNumMessages : Exception : "
                                          + e.name
                                          + ".\nError message: "
                                          + e.message+ "\n"
                                          + e.lineNumber);
            return false;
        }
    },






    //list
    //i'm not downloading the mailbox again.
    //I hope stat been called first or there's going to be trouble
    getMessageSizes : function()
    {
        try
        {
            this.m_HotmailLog.Write("nsHotmail.js - getMessageSizes - START");

            this.m_CommMethod.getMessageSizes();

            this.m_HotmailLog.Write("nsHotmail.js - getMessageSizes - END");
            return true;
        }
        catch(e)
        {
            this.m_HotmailLog.DebugDump("nsHotmail.js: getMessageSizes : Exception : "
                                          + e.name
                                          + ".\nError message: "
                                          + e.message+ "\n"
                                          + e.lineNumber);
            return false;
        }
    },



    //IUDL
    getMessageIDs : function()
    {
        try
        {
            this.m_HotmailLog.Write("nsHotmail.js - getMessageIDs - START");

            this.m_CommMethod.getMessageIDs();

            this.m_HotmailLog.Write("nsHotmail.js - getMessageIDs - END");
            return true;
        }
        catch(e)
        {
            this.m_HotmailLog.DebugDump("nsHotmail.js: getMessageIDs : Exception : "
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
            this.m_HotmailLog.Write("nsHotmail.js - getHeaders - START");
            this.m_HotmailLog.Write("nsHotmail.js - getHeaders - id " + lID );

            this.m_CommMethod.getMessageHeaders(lID);

            this.m_HotmailLog.Write("nsHotmail.js - getHeaders - END");
            return true;
        }
        catch(err)
        {
            this.m_HotmailLog.DebugDump("nsHotmail.js: getHeaders : Exception : "
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
            this.m_HotmailLog.Write("nsHotmail.js - getMessage - START");

            this.m_CommMethod.getMessage(lID);

            this.m_HotmailLog.Write("nsHotmail.js - getMessage - END");
            return true;
        }
        catch(e)
        {
            this.m_HotmailLog.DebugDump("nsHotmail.js: getMessage : Exception : "
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
            this.m_HotmailLog.Write("nsHotmail.js - deleteMessage - START");

            this.m_CommMethod.deleteMessage(lID);

            this.m_HotmailLog.Write("nsHotmail.js - deleteMessage - END");
            return true;
        }
        catch(e)
        {
            this.m_HotmailLog.DebugDump("nsHotmail.js: deleteMessage : Exception : "
                                          + e.name +
                                          ".\nError message: "
                                          + e.message+ "\n"
                                          + e.lineNumber);
            return false;
        }
    },





    //cookies are deleted when the connection ends so i dont need to download pages
    logOut : function()
    {
        try
        {
            this.m_HotmailLog.Write("nsHotmail.js - logOUT - START");

            this.m_CommMethod.logOut();

            this.m_HotmailLog.Write("nsHotmail.js - logOUT - END");
            return true;
        }
        catch(e)
        {
            this.m_HotmailLog.DebugDump("nsHotmail.js: logOUT : Exception : "
                                      + e.name
                                      + ".\nError message: "
                                      + e.message+ "\n"
                                      + e.lineNumber);
            return false;
        }
    },



    getPrefs : function ()
    {
        try
        {
            this.m_HotmailLog.Write("nsHotmail.js - getPrefs - START");

            var WebMailPrefAccess = new WebMailCommonPrefAccess();
            var oPref = {Value : null};
            var oData = new PrefData();

            var szUserName =  this.m_szUserName;
            szUserName = szUserName.replace(/\./g,"~");
            szUserName = szUserName.toLowerCase();


            //delay processing time delay
            if (WebMailPrefAccess.Get("int","hotmail.iProcessDelay",oPref))
                oData.iProcessDelay = oPref.Value;

            //delay proccess amount
            oPref.Value = null;
            if (WebMailPrefAccess.Get("bool","hotmail.iProcessAmount",oPref))
                oData.iProcessAmount = oPref.Value;

            //do i reuse the session
            oPref.Value = null;
            if (WebMailPrefAccess.Get("bool","hotmail.bReUseSession",oPref))
                oData.bReUseSession = oPref.Value;

            //get spam
            oPref.Value = null;
            if (WebMailPrefAccess.Get("bool","hotmail.Account."+szUserName+".bUseJunkMail",oPref))
                oData.bUseJunkMail = oPref.Value;
            this.m_HotmailLog.Write("nsHotmail.js - getPrefs - bUseJunkMail " + oPref.Value);

            //inbox
            oPref.Value = null;
            WebMailPrefAccess.Get("bool","hotmail.Account."+szUserName+".bDownloadInbox",oPref);
            if (oPref.Value==null || oPref.Value==true || oPref.Value=="null" ) oData.bDownloadInbox = true;
            this.m_HotmailLog.Write("nsHotmail.js - getPrefs - bDownloadInbox " + oData.bDownloadInbox);

            //get unread
            oPref.Value = null;
            if (WebMailPrefAccess.Get("bool","hotmail.Account."+szUserName+".bDownloadUnread",oPref))
                oData.bDownloadUnread = oPref.Value;
            this.m_HotmailLog.Write("nsHotmail.js - getPrefs - bDownloadUnread " + oPref.Value);

            //mark as read
            oPref.Value = null;
            if (WebMailPrefAccess.Get("bool","hotmail.Account."+szUserName+".bMarkAsRead",oPref))
                oData.bMarkAsRead = oPref.Value;
            this.m_HotmailLog.Write("nsHotmail.js - getPrefs - bMarkAsRead " + oPref.Value);

            //get folders
            oPref.Value = null;
            WebMailPrefAccess.Get("char","hotmail.Account."+szUserName+".szFolders",oPref);
            this.m_HotmailLog.Write("nsHotmail.js - getPrefs - szFolders " + oPref.Value);
            if (oPref.Value)
            {
                var aszFolders = oPref.Value.split("\r");
                for (j=0; j<aszFolders.length; j++)
                {
                    this.m_HotmailLog.Write("nsHotmail.js - getPrefs - aszFolders " + aszFolders[j]);
                    if (aszFolders[j].length>0)
                      oData.aszFolder.push(aszFolders[j]);
                }
            }

            this.m_HotmailLog.Write("nsHotmail.js - getPrefs - END");
            return oData;
        }
        catch(e)
        {
            this.m_HotmailLog.DebugDump("nsHotmail.js: getPrefs : Exception : "
                                      + e.name
                                      + ".\nError message: "
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
    var NSGetFactory = XPCOMUtils.generateNSGetFactory([nsHotmail]);
else
    var NSGetModule = XPCOMUtils.generateNSGetModule([nsHotmail]);