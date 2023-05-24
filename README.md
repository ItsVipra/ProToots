# ProToots (v0.99)
A Firefox extension which displays an author's pronouns next to their name on Mastodon.
![A Mastodon screenshot showing off pronouns next to a person's name](documentation\firefox_ehHwJufMau.png)

## Download
uuuuhhh i dunno, i've probably sent it to you

## FAQ
Why does it need permission for all websites?

> The addon needs to determine whether or not the site you are currently browsing is a Mastodon server. For that to work, it requires access to all sites. Otherwise, each existing Mastodon server would have to be explicitly added.


 ## setup
 - install web-ext with `npm install --global web-ext`
 - optionally:
    - run `web-ext run --firefox-profile='$ProfileNameOfYourChoosing' --profile-create-if-mising`
    - open that profile in firefox, log into fedi
    - after that when you run `web-ext run -p='$ProfileNameOfYourChoosing'` you should be logged into your fedi account
- run the extension with `web-ext run -u -u="yourinstancehere"`
