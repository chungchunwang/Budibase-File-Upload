<script>
  //By: Chungchun Wang (https://github.com/chungchunwang)
  //To make the plugin fit the look of Budibase, some of this code and the styling is from the Attachment Field component (https://github.com/Budibase/budibase/blob/develop/packages/client/src/components/app/forms/AttachmentField.svelte) referenced in the docs.

  //imports
  import { getContext, onDestroy, onMount } from "svelte";

  //input variables
  export let field;
  export let label;
  export let onChange;
  export let maxSize;
  export let maxFiles;
  export let acceptedFiles;
  export let encodingProtection;
  export let useBlobURL;
  export let validation;
  export let disabled = false;

  //Getting budibase API
  const { styleable } = getContext("sdk");
  const component = getContext("component");
  const formContext = getContext("form");
  const formStepContext = getContext("form-step");
  const fieldGroupContext = getContext("field-group");
  const { notificationStore } = getContext("sdk");

  //Budibase field group setup
  export let fieldApi;
  export let fieldState;
  export let fieldSchema;
  export let type = "string";

  const formApi = formContext?.formApi;
  const labelPos = fieldGroupContext?.labelPosition || "above";
  $: formStep = formStepContext ? $formStepContext || 1 : 1;
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
  //https://stackoverflow.com/questions/12168909/blob-from-dataurl
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
