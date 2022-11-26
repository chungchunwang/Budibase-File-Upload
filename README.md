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

