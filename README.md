# json-to-bookmark

## What it does

Creates bookmarks from json. The expected schema  is:
```json
{
  "folder": "New Bookmarks Folder",
  "bookmarks": [{
      "title": "Mozilla Home",
      "url": "https://www.mozilla.org/"
    },
    {
      "title": "MDN Home",
      "url": "https://developer.mozilla.org"
    }]
}
```
A **new folder** is created to store the bookmarks. The user may select where it will be saved in the bookmarks tree hierarchy. if no folder is selected it is placed by default to _Other Bookmarks_.

A title and a url is required for a bookmark to be created.
