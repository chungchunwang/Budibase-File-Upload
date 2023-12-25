<script>
  //By: Chungchun Wang (https://github.com/chungchunwang)
  //To make the plugin fit the look of Budibase, some of the HTML and styling is from the Attachment Field component (https://github.com/Budibase/budibase/blob/develop/packages/client/src/components/app/forms/AttachmentField.svelte) referenced in the docs. | Mozilla Public License Version 2.0

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

  //Budibase field group setup
  let fieldApi;
  let fieldState;
  let fieldSchema;
  let type = "string";

  const formApi = formContext?.formApi;
  const labelPos = fieldGroupContext?.labelPosition || "above";
  // 
  $: formStep = formStepContext ? $formStepContext || 1 : 1; // Checks if formStepContext (a Svelte store) exists. If it does, we take the value in the store (or 1 if the value in the store is falsy). If formStepContext does not exists, we also take 1.
  $: formField = formApi?.registerField(
    field,
    "text",
    "",
    disabled,
    validation,
    formStep
  );
  $: schemaType = fieldSchema?.type !== "formula" ? fieldSchema?.type : "string";
  $: unsubscribe = formField?.subscribe((value) => {
    fieldState = value?.fieldState;
    fieldApi = value?.fieldApi;
    fieldSchema = value?.fieldSchema
  });
  $: labelClass =
    labelPos === "above" ? "" : `spectrum-FieldLabel--${labelPos}`;
  onDestroy(() => {
    fieldApi?.deregister();
    unsubscribe?.();
  });

  let buttonID = Math.random().toString(16);

  let files = []; //List of files - in link format
  let blobFiles = []; //List of files - in blobLink format - Only used if useBlobURL is true
  let archivedFiles = []; //Stored copy of files in case a process fails

  let browseFiles = []; //Files that are selected to be uploaded

  //Generates JSON from files and stores it in the field
  let syncFilesWithField = () => {
    //Check if adding selected files will breach file length restriction.
    if (maxFiles && files.length + browseFiles.length > maxFiles) {
      notificationStore.actions.warning(
        "Too many files. You can only upload " +
          maxFiles +
          " files into this field."
      );
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
        browseFiles = [];
        document.getElementById(buttonID).value = null;
        return;
      }
    }
    archivedFiles = [...files];
    let fileToLinkPromises = [];
    for (let i = 0; i < browseFiles.length; i++) {
      fileToLinkPromises.push(readFileToLink(browseFiles[i]));
    }
    Promise.all(fileToLinkPromises)
      .then((values) => {
        var fileDataArray = [];
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
        files = files.concat(fileDataArray);
        if (useBlobURL) {
          for (let i = 0; i < browseFiles.length; i++) {
            blobFiles.push(URL.createObjectURL(browseFiles[i]));
          }
        }
        browseFiles = [];
        document.getElementById(buttonID).value = null;
        let json = JSON.stringify(files);
        if (encodingProtection) {
          json = "." + json + ".";
        }
        if(files.length == 0) json = "";
        const changed = fieldApi.setValue(json);
        if (onChange && changed) {
          onChange({ value: json });
        }
        archivedFiles = [...files];
      })
      .catch((e) => {
        notificationStore.actions.warning("Error reading files. Try again.");
        files = [...archivedFiles];
        browseFiles = [];
        document.getElementById(buttonID).value = null;
      });
  };
  //Reads a file and returns a promise that resolves to a link
  function readFileToLink(file) {
    return new Promise((resolve, reject) => {
      var fileReader = new FileReader();
      fileReader.onload = (e) => resolve(e);
      fileReader.onerror = (e) => reject(e);
      fileReader.readAsDataURL(file);
    });
  }

  //Everytime the browseFiles array changes, the files are processed.
  $: if (browseFiles.length > 0) {
    syncFilesWithField();
  }

  let readDataLinkToBlobURL = (link) => {
    return new Promise((resolve, reject) => {
      let blob = dataURItoBlob(link);
      let blobURL = URL.createObjectURL(blob);
      resolve(blobURL);
    });
  };
  //From https://stackoverflow.com/questions/12168909/blob-from-dataurl | CC BY-SA 4.0
  function dataURItoBlob(dataURI) {
    // convert base64 to raw binary data held in a string
    // doesn't handle URLEncoded DataURIs - see SO answer #6850276 for code that does this
    var byteString = atob(dataURI.split(",")[1]);

    // separate out the mime component
    var mimeString = dataURI.split(",")[0].split(":")[1].split(";")[0];

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

  //Parses inputted files and saves them to the files array.
  onMount(() => {
    if (fieldState?.value) {
      let jsonValue = fieldState.value;
      if(jsonValue == "0") return;
      if (encodingProtection) {
        files = JSON.parse(jsonValue.slice(1, -1)); //Removes the first and last character of the string
      } else files = JSON.parse(jsonValue);
      if (maxFiles && files.length > maxFiles) {
        files = files.slice(0, maxFiles);
        notificationStore.actions.warning(
          "Too many files. Only the first " +
            maxFiles +
            " files in the field will be kept."
        );
      }
      //add corresponding blob url if using it
      if (useBlobURL) {
        let fileToBlobPromises = [];
        for (let i = 0; i < files.length; i++) {
          fileToBlobPromises.push(readDataLinkToBlobURL(files[i].link));
        }
        Promise.all(fileToBlobPromises)
          .then((values) => {
            blobFiles = values;
          })
          .catch((e) => {
            notificationStore.actions.warning(
              "Error reading files. Please exit the page to avoid losing data."
            );
            files = [];
            archivedFiles = [];
            blobFiles = [];
          });
      }
      archivedFiles = [...files];
    }
  });

  //Opens a file in a new tab.
  let onLinkClick = (i) => {
    let title = files[i].title;
    let link = files[i].link;
    if (useBlobURL) {
      link = blobFiles[i];
      let tab = window.open();
      tab.location.href = link;
      return;
    }
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
  let deleteButtonClick = (index) => {
    files.splice(index, 1);
    if (useBlobURL) {
      blobFiles.splice(index, 1);
    }
    syncFilesWithField();
  };
</script>

<div class="spectrum-Form-item" use:styleable={$component.styles}>
  {#if !formContext}
    <div class="placeholder">Form components need to be wrapped in a form</div>
    {:else if !fieldState}
    <div class="placeholder"></div>
  {:else if schemaType && schemaType !== type && !["options", "longform"].includes(type)}
  <div class="placeholder">This Field setting is the wrong data type for this component</div>
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
          disabled = {fieldState.disabled}
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
