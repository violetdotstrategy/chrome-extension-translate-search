import translate from 'google-translate-api-x'

//Check, change, show the function is activated or not.
let activated = true;

function showActivated() {
  chrome.action.setIcon({
    path: activated ? "/icon_normal.png" : "/icon_inactive.png"
  })
  chrome.action.setBadgeText({ text: activated ? "ON" : "OFF" })
}

chrome.storage.local.get("activated", items => {
  activated = items.activated
  showActivated();
})


chrome.action.onClicked.addListener(e => {
  activated = !activated
  chrome.storage.local.set({ "activated": activated })
  showActivated()
})

//https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/webNavigation
//onBeforeNavigate does not work on some websites like twitter.com.
//onBeforeNavigate prevents loading but onHistoryStateUpdated does not.
//Using onHistoryStateUpdated only in such websites will be nice.
chrome.webNavigation.onBeforeNavigate.addListener(
  details => {
    if (!details.url.includes('translated=true')
      && !details.url.includes("uviewer")
      && activated
    ) {
      chrome.tabs.update(details.tabId, { url: "" }).then(async _ => {
        await translateUrl(details.url).then(url => chrome.tabs.update(details.tabId, { url }))
      }
      )
    }
  },
  {
    url: [
      { urlMatches: '[?&]q=' }
    ]
  }
)

/*
//Cannot use async/await here
chrome.webRequest.addListner(async details => {
  return { redirectUrl: await translateUrl(details.url) }
})
//This causes many problems because blocks every requests (not only browser navigation).
chrome.webRequest.addListner(details => {
  return { cancel: true }
})
//Better to use webNavigation.onBeforeNavigate than using tabs.onUpdated
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'loading'
    && tab.url?.match('[?&]q=')
    && !tab.url.includes('translated=true')) {
    translateUrl(tab.url).then(url => chrome.tabs.update(tabId, { url }))
  }
});
*/

//translate apis.
async function translateUrl(url: string) {
  const u = new URL(url)
  const q = u.searchParams.get('q')
  if (q) {
    u.searchParams.set('q', await translateText(q))
  }
  u.searchParams.set('translated', 'true')
  return u.toString()
}

async function translateText(text: string) {
  const res = await translate(text, { to: 'en' });
  if ('text' in res && typeof res.text === 'string') {
    return res.text
  } else {
    throw new Error('Translation type check failed');
  }
}
