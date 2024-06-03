# Budibase File Upload Tool
## About
This component is used for adding file fields inside of forms. It stores data inside a text value (JSON serialized), so it sould work with any text-based database column. This should work with both the Budibase DB and any other external SQL or noSQL DBs as all the files are fully serialized into text. This is useful if you wish to circumvent the default attachment field of Budibase, which stores data in MiniIO, and you instead want to store data directly inside your database. As files can have a lot of data within them, do note that some of the generated text fields can be quite long.

Please report any issues or feature requests (or perhaps star!).

This is a plugin for the low-code platform Budibase. Find out more about Budibase [here](https://github.com/Budibase/budibase).
## Demo Video
Note: You can also set accepted file types, which is not shown in the video.
![Example GIF](./assets/ezgif.com-gif-maker%20(1).gif)

Or watch it on YouTube at a higher framerate.

[![Demo Youtube Video](https://img.youtube.com/vi/WgVQgUfEvhM/0.jpg)](https://www.youtube.com/watch?v=WgVQgUfEvhM)

### Updated Ux Demo
![20240603_134814](https://github.com/ConorWebb96/Budibase-File-Upload/assets/126772285/7b8fad19-c59d-4dac-ad82-85d8754c127f)

## Large Files - Configurations (READ IF YOU PLAN TO UPLOAD FILES > 1MB)
### Limitations
Before we discuss configurations you might need to allow for large files sizes, note that the data you upload with this plugin is encoded into a String and serialized into JSON in the browser, which is not the most efficient process. Thus, it may not be practical to use this with very large files. My tests show that the page will freeze for about a second when uploading a 40mb file. A 160mb file freezes the page for about 5 seconds, so the processing time is roughly proportional to the file size. Note that these tests were done on a desktop computer and may vary based on the device running the page. As such, note that allowing larger files will come at the expense of minor freezes when uploading.
### Configurations
If your will be uploading large files, you may run into issues with payload size limits (Payload Too Large error). Both Budibase, your database, and your reverse proxy (if you are using one) may restrict the size the data you upload, so here are some changes you may need to make to them:
#### 1. Budibase
By default, Budibase has a [10 mb limit](https://github.com/chungchunwang/Budibase-File-Upload/issues/2#issuecomment-1427873840). You can modify this with the HTTP_MB_LIMIT environment variable[^1], which you set in the .env file for self-hosted solutions. [See here for more on environment variables](https://docs.budibase.com/docs/hosting-settings). This is not available for Budibase Cloud. From my tests it seems file upload work for Budibase Cloud apps up to around 3MB (maybe the limit is lower for the hosted version?).
#### 2. Database
Depending on what database you use, it may have limits on the max allowed packet size, which you will have to change in the database configurations. For MySQL this is set with the max_allowed_packet variable ([see here for how to change it](https://stackoverflow.com/questions/8062496/how-to-change-max-allowed-packet-size/8062538#8062538)).
#### 3. Reverse Proxy
Finally, your reverse proxy may also limit you file upload size. For Nginx, this is set with client_max_body_size, [as described here](https://stackoverflow.com/questions/28476643/default-nginx-client-max-body-size/66777762#66777762).


## Settings
- Field: The **text field** the component fills in the form.
- Label: The label for the field.
- Max Size: The maximum size of a file **in bytes**.
- Max Number of Files: The maximum number of files that can be stored in the field.
- Accepted File Extensions: A list of extensions seperated by commas that are acceptable input types. For example: ".jpg,.png,.pdf"
- On Change: A callback for whenever the files inside of the form change.
- Encoding Protection: Fixes error caused by Budibase Bug #8826. The bug should only affect SQL databases, however having this checked will not affect non-SQL DBs either. Note that you **must** use the same encoding protection setting for **all** of your file fields. Otherwise, there will be errors parsing your stored files.
- Use BlobURL: This allows the tab that open when you click on a file to be a blobURL link. If this is not checked, an iFrame will be opened with a DataURL inside. The use of an iFrame is necessary as DataURLs cannot be directly opened in many modern browsers. However, an iFrame may be blocked because it may violate Content Security Policy, so it is better to keep this checked. Note that whether or not this is checked, data in the DB is still stored in the same manner, so you can alter this property for the same column in different forms.

## Common Problems
### Error Message: Payload Too Large
If you are getting the Payload Too Large error message, this means that your max allowed packet size parameter for your DB is too low.
### "All of the fields are bugged out."
You are probably using a SQL DB. Make sure to select Encoding Protection to circumvent Budibase Bug #8826.
### "When I click on a file, it opens a new tab which is blocked."
Check the BlobURL option, which does not have this issue.
### "data too long for column"
Make sure your text field can support **very** long values. In MySQL I recommend turning the datatype to LONGTEXT.

## Versions
Note: If you are going back to use older versions, do not use versions 1.0.3 or 1.0.4. They have bugs.

## Other Tools
This plugin also has a companion Repeater plugin so that you can display the files outside of a form. [Check it out here!](https://github.com/chungchunwang/Budibase-File-Repeater)

## Dev Instructions
[View here for Budibase's documentation on plugins.](https://docs.budibase.com/docs/custom-plugin)

To build your new plugin run the following in your Budibase CLI:
```
budi plugins --build
```

You can also re-build everytime you make a change to your plugin with the command:
```
budi plugins --watch
```
[^1]: This was implemented in this [pull request](https://github.com/Budibase/budibase/pull/9695) as mentioned in [this issue](https://github.com/chungchunwang/Budibase-File-Upload/issues/2#issuecomment-1430054692). As of now it has been merged, though it may take a few days for it to make its way into a release.
