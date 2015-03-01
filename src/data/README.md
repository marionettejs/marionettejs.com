Data objects
===

## Videos

The `videos.json` file contains information used to render a carousel on the **marionettejs.com** home page. In order to add a video from YouTube service, you need to follow this section description.

Here is an example `video` object together with description of its required and optional properties:

```
{
  "author": "Jason Laster",
  "duration": "T38M08S",
  "id": "jbGm3mJXh_s",
  "link": {
    "url": "https://chrome.google.com/webstore/detail/marionette-inspector/fbgfjlockdhidoaempmjcddibjklhpka?hl=en",
    "title": "Marionette Inspector"
  },
  "name": "Jason Laster - Backbone under the Magnifying Glass Tools for Exploring and Debugging Your Apps",
  "title": "Backbone Under the Magnifying Glass"
}
```
where:

```
{
  "author":   {required} an author of content - not video
  "duration": {required} video duration in minutes and seconds as T{mm}M{ss}S 
                - note the padding zeros are required so please write T08M08S
  "id":       {required} video identifier (id) from YouTube service
  "link":     {optional} if your video should have a link just after the title
    "url":        {required} if you use link - this should point to an external url
    "title":      {required} if you use link - this should describe/label link
  },
  "name":     {required} a name of the video - this can be something different than title shown 
              under the video itself on the page - so it can be longer
  "title":    {required} a title of video shown just under the video itself - it can be different
              from "name" itself
}
```
 
Please note that `video.id` property is very important and is used extensively to compute range of links in template.
 
Note that `video.id` is also used for computing thumbnails paths and when adding a preview image of video into `images/youtube/` folder you need to follow filename naming schema:
 
```
{video.id}.jpg
```
 
All information required to build video object is available on YouTube's video page.