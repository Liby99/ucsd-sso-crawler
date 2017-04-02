'use strict';

const Promise = require('bluebird');
const Driver = require('node-phantom-simple');
const Helper = require('./helper')();

// no operation set
const nop = function() {};

// url constants
const SSO_LOGIN_URL = 'https://a4.ucsd.edu/tritON/Authn/UserPassword';
const TRITONLINK_URL = 'http://mytritonlink.ucsd.edu/';
const TRITONLINK_LOGINED_URL = 'https://act.ucsd.edu/myTritonlink20/display.htm';
const DEGREEAUDIT_URL = 'https://act.ucsd.edu/studentDars/select';
const DEGREEAUDIT_REPORT_URL = 'https://act.ucsd.edu/studentDars/view';
const ACADEMIC_HISTORY_URL = 'https://act.ucsd.edu/studentAcademicHistory/academichistorystudentdisplay.htm'

// task name
const TASKS = [
  'Open Phantom Instance',
  'Create Webpage',
  'Open Login Page',
  'Login to SSO',
  'Open Degree Audit Page',
  'Open Degree Audit Report',
  'Get Degree Audit Report Content',
  'Open Academic History Page',
  'Get Academic History Content',
  'Kill Phantom Instance'
];

/**
 * local helper Check if right page is open
 * @param page, phantom instance to check with, including browser & page
 * @param url, url to validate
 * @param task, current task name
 * @param reject, promise, reject callback
 * @param resolve, promise resolve callback
 */
function checkSuccess(phantom, page, url, task, reject, resolve, isNewPage) {

  return function(newPage) {

    if (isNewPage) {
      newPage.onLoadFinished = checkSuccess(phantom, newPage, url, task, reject, resolve, false);
      phantom.pages.push(newPage);
      page.onPageCreated = nop;

    } else {
      page.get("url", function(err, openedUrl) {

        if (err) {
          Helper.cancelAssertion(task, false);
          if (phantom && phantom.browser)
            phantom.browser.exit();

          reject("Failed " + task);

        } else if (url == openedUrl) {
          page.onLoadFinished = nop;

          Helper.cancelAssertion(task, true);
          resolve(phantom);
        }
      });
    }
  };
}

/**
 * local helper get html content
 * @param pageNum, what page the content on
 * @param task, task name
 * @param phantom, phantom instance include browser & pages
 * @param storeAs, variable name to pass on
 */
function getContent(pageNum, task, phantom, storeAs) {

  return (resolve, reject) => {

    phantom.pages[pageNum].get("content", (err, content) => {

      if (err) {
        Helper.cancelAssertion(task, false);
        phantom.browser.exit();

        reject("Failed" + task);

      } else {
        Helper.cancelAssertion(task, true);
        phantom[storeAs] = content;
        resolve(phantom);
      }
    });

    Helper.assertFailedIn(null, task, reject);
  }
}


/**
 * Open phantom instance, using node-phantom-simple
 * @return promise of a phantom instance include browser instance
 */
exports.openPhantom = () => {

  return new Promise((resolve, reject) => {

    Driver.create({}, (err, browser) => {

      if (err) {
        Helper.cancelAssertion(TASKS[0], false);
        reject("Failed " + TASKS[0]);

      } else {
        Helper.cancelAssertion(TASKS[0], true);
        resolve({
          browser: browser
        });
      }
    })

    Helper.assertFailedIn(null, TASKS[0], reject);
  });
};

/**
 * Create webpage using phanton instance
 * @param Phantom, Phantom instance, including browser & pages array
 * @return promise of combination of phantom & webpage
 */
exports.createWebPage = (phantom) => {

  return new Promise((resolve, reject) => {

    phantom.browser.createPage((err, page) => {

      if (err) {
        Helper.cancelAssertion(TASKS[1], false);
        phantom.browser.exit();
        reject("Failed " + TASKS[1]);

      } else {

        page.clearMemoryCache((err) => {
          Helper.cancelAssertion(TASKS[1], true);
          resolve({
            browser: phantom.browser,
            pages: [page]
          });
        })
      }
    });

    Helper.assertFailedIn(null, TASKS[1], reject, phantom);
  });
};

/**
 * Open mytritonlink page
 * @param Phantom, Phantom instance, including browser & pages array
 * @return promise of combination of phantom & webpage
 */
exports.openLoginPage = (phantom) => {

  return new Promise((resolve, reject) => {

    // define onload behavior check if w
    phantom.pages[0].onLoadFinished = checkSuccess(phantom, phantom.pages[0], SSO_LOGIN_URL, TASKS[2], reject, resolve);
    phantom.pages[0].open(TRITONLINK_URL);

    Helper.assertFailedIn(10000, TASKS[2], reject, phantom);
  });
};

/**
 * Fill in Login Form
 * @param username, login username
 * @param password, login password
 * @return promise of combination of phantom & webpage
 */
exports.fillInLoginForm = (username, password) => {

  return function(phantom) {

    return new Promise((resolve, reject) => {

      phantom.pages[0].onUrlChanged = (url) => {

        if (url == TRITONLINK_LOGINED_URL) {
          phantom.pages[0].onUrlChanged = nop;
          Helper.cancelAssertion(TASKS[3], true);
          resolve(phantom);
        }
      }

      phantom.pages[0].evaluateJavaScript( 'function() {'
        + 'document.getElementById("ssousername").value = \'' + username + '\';'
        + 'document.getElementById("ssopassword").value = \'' + password + '\';'
        + 'document.getElementsByClassName("sso-button")[0].click();'
      + '}');

      Helper.assertFailedIn(5000, TASKS[3], reject, phantom);
    });
  };
};

/**
 * open Degree Audit
 * @param Phantom, Phantom instance, including browser & pages array
 * @return promise of combination of phantom & webpage
 */
exports.openDegreeAudit = (phantom) => {

  return new Promise((resolve, reject) => {

    phantom.pages[0].onLoadFinished = checkSuccess(phantom, phantom.pages[0], DEGREEAUDIT_URL, TASKS[4], reject, resolve);
    phantom.pages[0].open(DEGREEAUDIT_URL);

    Helper.assertFailedIn(10000, TASKS[4], reject, phantom);
  });
};

/**
 * open Degree Audit report
 * @param Phantom, Phantom instance, including browser & pages array
 * @return promise of combination of phantom & webpage
 */
exports.openDegreeAuditReport = (phantom) => {

  return new Promise((resolve, reject) => {

    phantom.pages[0].onPageCreated = checkSuccess(phantom, phantom.pages[0], DEGREEAUDIT_REPORT_URL, TASKS[5], reject, resolve, true);
    phantom.pages[0].evaluateJavaScript('function() {'
      + 'var form = document.getElementById("unReport").form;'
      + 'form.target = "TritonLink2";'
      + 'form.submit();'
    + '}');

    Helper.assertFailedIn(10000, TASKS[5], reject, phantom);
  });
};

/**
 * get Degree Audit report content
 * @param Phantom, Phantom instance, including browser & pages array
 * @return promise of html degree audit report content
 */
exports.getDegreeAuditReport = (phantom) => {

  return new Promise(getContent(1, TASKS[6], phantom, 'DegreeAudit'));
}

/**
 * open Academic history page
 * @param Phantom, Phantom instance, including browser & pages array
 * @return promise of combination of phantom & webpage
 */
exports.openAcademicHistory = (phantom) => {

  return new Promise((resolve, reject) => {

    phantom.pages[0].onLoadFinished = checkSuccess(phantom, phantom.pages[0], ACADEMIC_HISTORY_URL, TASKS[7], reject, resolve);
    phantom.pages[0].open(ACADEMIC_HISTORY_URL);

    Helper.assertFailedIn(10000, TASKS[7], reject, phantom);
  });
}

/**
 * get Academic history content
 * @param Phantom, Phantom instance, including browser & pages array
 * @return promise of html Academic history content
 */
exports.getAcademicHistory = (phantom) => {

  return new Promise(getContent(0, TASKS[8], phantom, 'AcademicHistory'));
}

/**
 * Kill phantom instance
 * @param Phantom, Phantom instance, including browser & pages array
 */
exports.killPhantom = (phantom) => {

  return new Promise((resolve, reject) => {
    if (phantom && phantom.browser) {
      phantom.browser.exit();

      delete phantom.browser;
      delete phantom.page;
    }

    resolve(phantom);
  });
}
