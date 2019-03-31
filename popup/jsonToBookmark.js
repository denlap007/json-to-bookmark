const SHOW_ERROR_MSECS = 6000
const SHOW_SUCCESS_MSECS = 3000

let targetNodeId = ''

/**
 * Logs success/error msg to the console and output DOM element. 
 * Msg is hidden after timeout msecs. Also, re-parses bookmarks tree
 * so as dropdown list is updated.
 */
const reportMsg = (msg, outputClass, timeout) => {
  document.getElementById("output").className = `container ${outputClass}`
  document.getElementById('output').innerHTML = msg

  showOutput()
  if (outputClass !== 'error') {
    clearSelectOptions()
    // re-register listener
    document.getElementById("select-folders").addEventListener("click", onchange)
    browser.bookmarks.getTree()
      .then(createSelectOptions, onRejected);
  }

  setTimeout(() =>{
    hideOuput()
  }, timeout)
}
/**
 * Registers listeners
 */
const registerListeners = () => {
  document.getElementById("save").addEventListener("click", createUserBookmarks)
  document.getElementById("select-folders").addEventListener("click", onchange)
}
/**
 * On Select option change get value
 * @param {Object} e 
 */
const onchange = (e) => {
  // avoid updating to unecessary values
  if(e.target.value != 'select-folders' && e.target.value != '') {
    targetNodeId = e.target.value
  }
} 
/**
 * Validates input data against a predefined schema
 * @param {Object} data 
 */
const validateSchema = (data) => {
  const invalideSchemaError = new Error('Invalid Data Schema')
  
  if (typeof data === 'object' && typeof data.folder === 'string' && Array.isArray(data.bookmarks)) {
    data.bookmarks.forEach(bookmark => {
      if (typeof bookmark !== 'object' || typeof bookmark.title !== 'string' || typeof bookmark.url !== 'string') {
        throw invalideSchemaError
      } 
    })
  } else {
    throw invalideSchemaError
  }
}
/**
 * Shows ouput element
 */
const showOutput = () => {
  var x = document.getElementById("output");
  if (x.style.display === "none") {
    x.style.display = "block";
  } 
} 
/**
 * Hides ouput element
 */
const hideOuput = () => {
  var x = document.getElementById("output");
  if (x.style.display === "block") {
    x.style.display = "none";
  } 
} 
/**
 * Gets user data and tries to create bookmarks
 */
const createUserBookmarks = async () => {
  // get user data
  const userData = document.getElementById('bookmark-data').value
  try {
    // parse string value from DOM element to js object
    var data = JSON.parse(userData)
    // validate user data according to expected structure
    validateSchema(data)

    const parentId = targetNodeId === ''
      ? undefined
      : targetNodeId

    // create folder
    const node = await browser.bookmarks.create({
      title: data.folder,
      parentId
      })

    const createBookmarks = []
    // creaet bookmarks
    data.bookmarks.forEach((bookmark, index) => {
      const bookmarkToCreate = {
        index: index,
        parentId: node.id,
        title: bookmark.title,
        url: bookmark.url,
        }
  
      createBookmarks.push(browser.bookmarks.create(bookmarkToCreate))
    })

    await Promise.all(createBookmarks)

    reportMsg('<strong>Success!</strong> Added bookmarks!', 'success', SHOW_SUCCESS_MSECS)
  } catch (error) {
    reportMsg(`<strong>Error!</strong> ${error.message}`, 'error', SHOW_ERROR_MSECS)
  }
}

/**
 * Recursively parses bookmarks tree and returns structures to create options
 * @param {Object} bookmarkItem 
 * @param {Integer} level 
 * @param {Array} topLevelOptions 
 * @param {Array} groupOptions 
 */
const parseItem = (bookmarkItem, level, topLevelOptions = [], groupOptions = []) => {
  if (!bookmarkItem.url) {
    // add top-level folders except root
    if (level === 1 && bookmarkItem.title !== "") {
      topLevelOptions.push({
        title: bookmarkItem.title,
        id: bookmarkItem.id
      })
    } 
    level++;
  }
  if (bookmarkItem.children) {
    if (bookmarkItem.title !== "") {
      groupOptions.push({
        title: bookmarkItem.title,
        id: bookmarkItem.id,
        options: bookmarkItem.children.reduce((options, child) => {
          if (!child.url) {
            options.push({title: child.title, id: child.id}) 
          }
          return options
        }, [])
      })  
    }

    for (child of bookmarkItem.children) {
      parseItem(child, level, topLevelOptions, groupOptions);
    }
  }
  level--;

  return [
    topLevelOptions,
    groupOptions
  ]
}
/**
 * Parses the bookmarks tree and populates select with options
 * @param {Array} bookmarkItems 
 */
const createSelectOptions = (bookmarkItems) => {
  const [topLevelOptions, groupOptions] = parseItem(bookmarkItems[0], 0); 
  const sel = getSelectNode()
  const groups = createGroups(topLevelOptions, groupOptions)
  const defaultOption = createDefaultOption()

  sel.appendChild(defaultOption)

  groups.forEach(group => {
    sel.appendChild(group)
  }) 
}
/**
 * Creates the select default option
 */
const createDefaultOption = () => {
  const defaultOption = new Option('Save to folder', "", targetNodeId === '', targetNodeId === '')
  defaultOption.hidden = true
  return defaultOption
}
/**
 * Create Groups of options for all the bookmark folders
 * @param {Array} topLevelOptions 
 * @param {Array} groupOptions 
 */
const createGroups = (topLevelOptions, groupOptions) => {
  const topLevelGroup = createTopLevelGroup(topLevelOptions)
  const nestedGroups = createNestedGroups(groupOptions)
  return [topLevelGroup, ...nestedGroups]
}
/**
 * Creates a group of options with the top level bookmark folders
 * @param {Array} elements 
 */
const createTopLevelGroup = (elements) => {
  const group = document.createElement('optgroup');
  group.label = 'All Bookmarks'

  elements.forEach(element => {
    const groupOption = new Option(element.title, element.id, false, targetNodeId === element.id)
    group.appendChild(groupOption)
  })
  return group
}
/**
 * Creates groups of options for all the bookmark folders, except the top-level ones
 * @param {Array} groupElemnts 
 */
const createNestedGroups = (groupElemnts) => {
  return groupElemnts.reduce((finalGroups, groupElem) => {
    const group = document.createElement('optgroup')
    group.label = groupElem.title

    groupElem.options.forEach(option => {
      const groupOption = new Option(option.title, option.id, false, targetNodeId === option.id)
      group.appendChild(groupOption)
    })

    if (groupElem.options.length > 0) {
      finalGroups.push(group)
    }
    return finalGroups
  }, [])
}
/**
 * Returns the select DOM node
 */
const getSelectNode = () => {
  return document.getElementById('select-folders');
}
/**
 * Clears select options, fast implementation
 */
const clearSelectOptions = () => {
	const selectObj = getSelectNode()
  let selectParentNode = selectObj.parentNode;
  // Make a shallow copy
	let newSelectObj = selectObj.cloneNode(false); 
	selectParentNode.replaceChild(newSelectObj, selectObj);
	return newSelectObj;
}

const onRejected =(error) => {
  reportMsg(`<strong>Error!</strong> ${error.message}`, 'error', SHOW_ERROR_MSECS)
}

// Attach listeners so as to listen to events
registerListeners()
// parse bookmark tree and create options groups for select
browser.bookmarks.getTree()
.then(createSelectOptions, onRejected);