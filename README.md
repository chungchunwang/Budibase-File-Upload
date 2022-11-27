# Budibase File Upload Tool
## Demo Video
Note: You can also set accepted file types, which is not shown in the video.
![Example GIF](./assets/ezgif.com-gif-maker%20(1).gif)


Or watch it on YouTube at a higher framerate.


[![Demo Youtube Video](https://img.youtube.com/vi/WgVQgUfEvhM/0.jpg)](https://www.youtube.com/watch?v=WgVQgUfEvhM)
## About
This component is used for adding file fields inside of forms. It stores data inside a text value (JSON serialized), so it sould work with any text-based database column. This should work with both the Budibase DB and any other external SQL or noSQL DBs as all the files are fully serialized into text. This is useful if you wish to circumvent the default attachment field of Budibase, which stores data in MiniIO, and you instead want to store data directly inside your database. As files can have a lot of data within them, do note that some of the generated text fields can be quite long.

Please report any issues or feature requests (or perhaps star!).

This is a plugin for the low-code platform Budibase. Find out more about Budibase [here](https://github.com/Budibase/budibase).
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

## Instructions

To build your new  plugin run the following in your Budibase CLI:
```
budi plugins --build
```

You can also re-build everytime you make a change to your plugin with the command:
```
budi plugins --watch
```

