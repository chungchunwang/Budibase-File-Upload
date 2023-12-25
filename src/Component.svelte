<script>
  //By: Chungchun Wang (https://github.com/chungchunwang)
  //To make the plugin fit the look of Budibase, some of the HTML and styling is from the Attachment Field component (https://github.com/Budibase/budibase/blob/develop/packages/client/src/components/app/forms/AttachmentField.svelte) referenced in the docs. | Mozilla Public License Version 2.0

  //This component is a Budibase field component that fits in a Budibase field. It takes the place of a text field and allows the user to upload files. The files are stored in a JSON string in the field.

  //Import Svelte functions.
  //getContext is used to get the Budibase API.
  //onDestroy is used to deregister the field when the component is destroyed.
  //onMount is used to read the field value when the component is mounted.
  import { getContext, onDestroy, onMount } from "svelte";

  //Get the variables we have registered for our component in the Budibase builder (with the schema).
  export let field; //The form field we are targeting.
  export let label; //The label of the form field.
  export let maxSize; //The maximum size of a file that can be uploaded.
  export let maxFiles; //The maximum number of files that can be uploaded.
  export let acceptedFiles; //The file types that can be uploaded. (As a comma separated string)
  export let encodingProtection; //Whether to add a period to the start and end of the JSON string to work around a Budibase bug (https://github.com/Budibase/budibase/issues/8826) that removes brackets from the beginning and end of text.
  export let useBlobURL; //Whether to use blob URLs instead of data URLs. Data URLs are opened in an iFrame, which can be blocked based on CSP settings. Thus, blob URLs are recommended.
  export let disabled = false; //Whether the field is disabled.
  export let onChange; //A function that is called when the value of the field changes. We use this to allow the user to add custom on change functionality in the Budibase builder.
  export let validation; //The validation rules for the field. We don't need to deal with this, we just need to pass it to the formApi, which does the validation.

  //Getting budibase API
  const { styleable } = getContext("sdk"); //Gets the styleable function from the Budibase API. This function is used to add Budibase styling to the component.
  const component = getContext("component"); //Gets the component object from the Budibase API. We use it to get Budibase's component styling.
  const formContext = getContext("form"); //Gets the form object from the Budibase API. We use it to get the formApi.
  const formStepContext = getContext("form-step"); //Gets the form step store from the Budibase API. We use it to get the formStep.
  const fieldGroupContext = getContext("field-group"); //Gets the field group object from the Budibase API. We use it to get the label position.
  const { notificationStore } = getContext("sdk"); //Gets the notificationStore object from the Budibase API. We use it to display warnings.

  // Budibase forms can be split into multiple steps. This is used to get the step number of the form we are in. If none are available we default to 1.
  $: formStep = formStepContext ? $formStepContext || 1 : 1; // Checks if formStepContext (a Svelte store) exists. If it does, we take the value in the store (or 1 if the value in the store is falsy). If formStepContext does not exists, we also take 1.

  const labelPos = fieldGroupContext?.labelPosition || "above"; // Gets the label position from the fieldGroupContext. We use it to set the label position later in the HTML template.

  const formApi = formContext?.formApi; // Gets the formApi from the formContext. We use it to register our field.

  //Registering our field. We make sure this is reactive so that the field is reregistered when any of the variables of the component changes. For instance, if in the Budibase builder the user changes a field to disabled, we want to reregister the field with the formApi so that it is disabled.
  $: formField = formApi?.registerField(
    field,
    "text",
    "",
    disabled,
    validation,
    formStep
  );

  // After registering the field, we can subscribe to get fieldState, fieldApi, and fieldSchema from the formField. We use these to update the value of the field.
  let fieldApi;
  let fieldState;
  let fieldSchema;
  $: unsubscribe = formField?.subscribe((value) => {
    fieldState = value?.fieldState;
    fieldApi = value?.fieldApi;
    fieldSchema = value?.fieldSchema;
  });
  // We deregister the field when the component is destroyed.
  onDestroy(() => {
    fieldApi?.deregister();
    unsubscribe?.();
  });

  let type = "string"; //We intend for this component to only be used for text fields.

  $: schemaType =
    fieldSchema?.type !== "formula" ? fieldSchema?.type : "string"; //This gets the type of the field from the fieldSchema. If the field is a formula, we set the type to string. Later on, this value is compared to 'type' above to check whether the component should be activated or not.

  $: labelClass =
    labelPos === "above" ? "" : `spectrum-FieldLabel--${labelPos}`; //Generate the corresponding CSS class for the label (in the HTML) based on the label position.

  let buttonID = Math.random().toString(16); //Generate a random ID for the button. This is used to link the button to the file input (see HTML).

  let files = []; //List of files items each structured in the following format:
  /*
  {
            name: fileName,
            type: fileType,
            size: fileSize,
            link: linkToFile, //Data URL
          }
  */
  let blobFiles = []; //List of file urls - in blobLink format - Only used if useBlobURL is true
  let archivedFiles = []; //Stored copy of files object in case a process fails

  let browseFiles = []; //Files that are selected to be uploaded - linked to the file input (see HTML)

  //Calls syncFilesWithField() if there are files selected in the file input.
  $: if (browseFiles.length > 0) {
    syncFilesWithField();
  }

  //Takes files selected in the file input, converts them into dataURLs (and blobURLs depending on settings), and then adds these dataURLs alongside their metadata into files.
  //Finally, the files array is converted to a JSON string and stored in the field.
  //This function is called everytime there are items in the browseFiles array (files selected). See the reactive if statement above.
  //This method ensures that the files array is updated with selected files and always in sync with the field.
  let syncFilesWithField = () => {
    //Check if adding selected files will breach file length restriction.
    if (maxFiles && files.length + browseFiles.length > maxFiles) {
      notificationStore.actions.warning(
        "Too many files. You can only upload " +
          maxFiles +
          " files into this field."
      );
      //Reset the file input and the browseFiles array.
      browseFiles = [];
      document.getElementById(buttonID).value = null;
      return;
    }
    //Check if adding selected files will breach file size restriction.
    for (let i = 0; i < browseFiles.length; i++) {
      if (maxSize && maxSize < browseFiles[i].size) {
        notificationStore.actions.warning(
          "File " +
            browseFiles[i].name +
            " is too large. You can only upload files up to " +
            maxSize +
            " bytes into this field."
        );
        //Just to make things clearer, we reject all files if any file is too large.
        //Reset the file input and the browseFiles array.
        browseFiles = [];
        document.getElementById(buttonID).value = null;
        return;
      }
    }
    //Here, all checks have passed. We can now add the files to the field.
    //Before our operation, we store a copy of the files in case something goes wrong.
    archivedFiles = [...files];

    //Read the files into dataURLs.
    //readFileToLink returns a promise that resolves to a dataURL. We create an array of these promises.
    let fileToLinkPromises = [];
    for (let i = 0; i < browseFiles.length; i++) {
      fileToLinkPromises.push(readFileToLink(browseFiles[i]));
    }
    //We use Promise.all to set a callback for when all of the promises resolve.
    Promise.all(fileToLinkPromises)
      .then((values) => {
        var fileDataArray = [];
        //For each file, we create a fileData object and add it to the fileDataArray.
        for (let i = 0; i < values.length; i++) {
          let e = values[i];
          const fileData = {
            name: browseFiles[i].name,
            type: browseFiles[i].type,
            size: browseFiles[i].size,
            link: e.target.result,
          };
          fileDataArray.push(fileData);
        }
        //We then add these new files to the files array.
        files = files.concat(fileDataArray);

        //If we are using blobURLs, we also convert the uploaded files to blobURLs and add them to the blobFiles array.
        if (useBlobURL) {
          for (let i = 0; i < browseFiles.length; i++) {
            blobFiles.push(URL.createObjectURL(browseFiles[i]));
          }
        }

        //Reset the file input and the browseFiles array.
        browseFiles = [];
        document.getElementById(buttonID).value = null;

        //We then convert the files array to a JSON string and store it in the field. Note that this serialization stores the file data as dataURLs contains all the file data within its URI.
        let json = JSON.stringify(files);

        //Works around a bug in Budibase (https://github.com/Budibase/budibase/issues/8826) that removes brackets from the beginning and end of text.
        if (encodingProtection) {
          json = "." + json + ".";
        }
        //If there are no files, we want the field to be entirely empty. We keep this conventions as when instantiating new rows, our field will initially be empty, and we would like for this to register as having no files.
        if (files.length == 0) json = "";
        //We then set the value of the field to the JSON string.
        const changed = fieldApi.setValue(json);
        //If the value of the field has changed, we call the onChange function (if it exists).
        if (onChange && changed) {
          onChange({ value: json });
        }
        //Given that everything has gone correctly, we can now update the archivedFiles array to match the files array.
        archivedFiles = [...files];
      })
      .catch((e) => {
        //If something goes wrong, we send a warning notification and reset the files array to the archivedFiles array.
        notificationStore.actions.warning("Error reading files. Try again.");
        files = [...archivedFiles];
        //Then, we reset the file input and the browseFiles array.
        browseFiles = [];
        document.getElementById(buttonID).value = null;
      });
  };

  //When the component is mounted, we want to parse the JSON serialized files already in the field and saves them into the files array (and the BlobURL array if it is being used).
  onMount(() => {
    if (fieldState?.value) {
      //If the field has a value, we parse it.
      let jsonValue = fieldState.value; //Get the value of the field.
      if (jsonValue == "0") return; //If the value is 0, we don't want to parse it, as it is a falsy value. I don't really remember now why 0 would show up - I assume it must be a bug in Budibase where empty fields are interpreted as 0.
      if (encodingProtection) {
        //If we are using encoding protection, we remove the first and last character of the string. Either way, we then parse the JSON string.
        files = JSON.parse(jsonValue.slice(1, -1));
      } else files = JSON.parse(jsonValue);
      if (maxFiles && files.length > maxFiles) {
        //If there are too many files, we only keep the first maxFiles files.
        files = files.slice(0, maxFiles);
        notificationStore.actions.warning(
          "Too many files. Only the first " +
            maxFiles +
            " files in the field will be kept."
        );
      }
      //Update the blobURL array to match the files array if it is being used.
      if (useBlobURL) {
        //We create an array of promises that resolve to blobURLs. readDataURLToBlobURL returns a promise that resolves to a blobURL.
        let fileToBlobPromises = [];
        for (let i = 0; i < files.length; i++) {
          fileToBlobPromises.push(readDataURLToBlobURL(files[i].link));
        }
        //We use Promise.all to set a callback for when all of the promises resolve.
        Promise.all(fileToBlobPromises)
          .then((values) => {
            blobFiles = values;
          })
          .catch((e) => {
            //If something goes wrong, we send a warning notification and reset all the arrays of files, essentially treating it as if there was no files stored in the first place.
            notificationStore.actions.warning(
              "Error reading files. Please exit the page to avoid losing data." //We ask the user to exit as if they save the page, the original files stored will be lost.
            );
            files = [];
            archivedFiles = [];
            blobFiles = [];
          });
      }
      //We update the archivedFiles array to match the files array. This is not actually necessary (as with the same operation at the end of syncFilesWithField), but just how I wrote it at the time. I wanted to maintain that at the end of each operation on files, archivedFiles is always in sync with files.
      archivedFiles = [...files];
    }
  });

  //Opens a file (object in the files array) in a new tab.
  let onLinkClick = (i) => {
    //Get the file data.
    let title = files[i].title;
    let link = files[i].link; //Data URL
    //If we are using blobURLs, we can directly open the blobURL in a new tab.
    if (useBlobURL) {
      link = blobFiles[i]; //change to Blob URL
      let tab = window.open();
      tab.location.href = link;
      return;
    }
    //If we are using dataURLs, we need to create an iframe that opens the dataURL in a new tab.
    var iframe =
      "<html><head> <style>body {margin: 0;} </style><title>Attachment: " +
      title +
      "</title><body><iframe width='100%' height='100%' src='" +
      link +
      "'></iframe></body>  </html>";
    var newWindow = window.open();
    newWindow.document.open();
    newWindow.document.write(iframe);
    newWindow.document.close();
  };

  //Deletes a file (object in the files array) given its index. Used as a callback for the delete button.
  let deleteButtonClick = (index) => {
    //Remove the file from the files array.
    files.splice(index, 1);
    //Remove the blobURL from the blobFiles array if it is being used.
    if (useBlobURL) {
      blobFiles.splice(index, 1);
    }
    //Given that the files array has changed, we need to update the field.
    syncFilesWithField();
  };

  // =====================================File Parsing Helper Methods=====================================

  //Returns a promise that reads a file and resolves it to a link.
  function readFileToLink(file) {
    return new Promise((resolve, reject) => {
      var fileReader = new FileReader();
      fileReader.onload = (e) => resolve(e);
      fileReader.onerror = (e) => reject(e);
      fileReader.readAsDataURL(file);
    });
  }

  //Returns a promise that reads a dataURL and resolves it to a blobURL.
  let readDataURLToBlobURL = (link) => {
    return new Promise((resolve, reject) => {
      let blob = dataURLtoBlob(link);
      let blobURL = URL.createObjectURL(blob);
      resolve(blobURL);
    });
  };

  //Converts DataURI to Blob. From https://stackoverflow.com/questions/12168909/blob-from-dataurl | CC BY-SA 4.0
  function dataURLtoBlob(dataURL) {
    // convert base64 to raw binary data held in a string
    // doesn't handle URLEncoded DataURIs - see SO answer #6850276 for code that does this
    var byteString = atob(dataURL.split(",")[1]);

    // separate out the mime component
    var mimeString = dataURL.split(",")[0].split(":")[1].split(";")[0];

    // write the bytes of the string to an ArrayBuffer
    var ab = new ArrayBuffer(byteString.length);

    // create a view into the buffer
    var ia = new Uint8Array(ab);

    // set the bytes of the buffer to the correct values
    for (var i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }

    // write the ArrayBuffer to a blob, and you're done
    var blob = new Blob([ab], { type: mimeString });
    return blob;
  }
</script>


<!--
  The following is the HTML template for the component.

  If either the formContext or the fieldState is not defined, we display a placeholder.
  If the schemaType is not defined or is not the same as the type, we display a placeholder.
  Otherwise, we display the component.

  The component is a file input that is hidden. Instead, we use a button to open the file input. This gives us more control over the styling of the file input.
  Below the button, for each file in the files array, we display a label that opens the file in a new tab. We also display a delete button that removes the file from the files array.

  If there is a validation error (based on user-set) validation requirements, we display an error message.
-->
<div class="spectrum-Form-item" use:styleable={$component.styles}>
  {#if !formContext}
    <div class="placeholder">Form components need to be wrapped in a form</div>
  {:else if !fieldState}
    <div class="placeholder" />
  {:else if schemaType && schemaType !== type}
    <div class="placeholder">
      This Field setting is the wrong data type for this component
    </div>
  {:else}
    <label
      class:hidden={!label}
      for={fieldState?.fieldId}
      class={`spectrum-FieldLabel spectrum-FieldLabel--sizeM spectrum-Form-itemLabel ${labelClass}`}
    >
      {label || " "}
    </label>
    <div class="spectrum-Form-itemField">
      <input
        type="file"
        id={buttonID}
        style="display: none;"
        multiple
        accept={acceptedFiles}
        bind:files={browseFiles}
      />
      <input
        type="button"
        value="Browse..."
        class="browse-button"
        onclick="document.getElementById('{buttonID}').click();"
        disabled={fieldState.disabled}
      />
      <div>
        {#each files as file, i}
          <div class="file-button-body">
            <button
              class="file-button file-button-delete"
              on:click={() => deleteButtonClick(i)}>✖</button
            >
            <button
              class="file-button file-button-link"
              on:click={() => onLinkClick(i)}
            >
              {file.name}
            </button>
          </div>
        {/each}
      </div>
      {#if fieldState.error}
        <div class="error">{fieldState.error}</div>
      {/if}
    </div>
  {/if}
</div>

<!--
  The following is the CSS styling for the component.
-->
<style>
  .placeholder {
    color: var(--spectrum-global-color-gray-600);
  }
  label {
    white-space: nowrap;
  }
  label.hidden {
    padding: 0;
  }
  .spectrum-Form-itemField {
    position: relative;
    width: 100%;
    background-color: white;
    padding: 10px;
    border-radius: 4px;
    border: 1px solid rgb(190, 190, 190);
  }
  .browse-button {
    position: relative;
    width: 100%;
    height: 50px;
    cursor: pointer;
    border: 1px solid rgb(190, 190, 190);
    border-radius: 4px;
    border-width: 1px;
    color: rgb(110, 110, 110);
    font-weight: bold;
    font-size: 16px;
  }
  .file-button-body {
    position: relative;
    width: 100%;
    height: 50px;
    cursor: pointer;
    border: 1px solid rgb(190, 190, 190);
    border-radius: 4px;
    border-width: 1px;
    color: rgb(110, 110, 110);
    font-weight: bold;
    font-size: 16px;
  }
  .file-button {
    border: 0;
    font: inherit;
    color: inherit;
  }
  .file-button-delete {
    position: absolute;
    width: 40px;
    height: 100%;
    left: 0;
    border: 0;
    background-color: rgb(151, 151, 151);
    color: rgb(168, 87, 84);
  }
  .file-button-link {
    background-color: rgb(226, 226, 226);
    position: absolute;
    width: calc(100% - 40px);
    height: 100%;
    left: 40px;
  }
  .error {
    color: var(
      --spectrum-semantic-negative-color-default,
      var(--spectrum-global-color-red-500)
    );
    font-size: var(--spectrum-global-dimension-font-size-75);
    margin-top: var(--spectrum-global-dimension-size-75);
  }
  .spectrum-FieldLabel--right,
  .spectrum-FieldLabel--left {
    padding-right: var(--spectrum-global-dimension-size-200);
  }
</style>
