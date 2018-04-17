const loghtml = document.getElementById('log-process')

///////////////////
// For Kernel
///////////////////

const { client } = require("spider-dist");

///////////////////
// For Electron
///////////////////

// Define function that export result to html tag
function logit(elem) {
    loghtml.insertAdjacentHTML("afterbegin",elem + "<br>")
}

client.setOutput({ log: logit, error: logit });

function clickDisable(){
    document.querySelector('#btn-run').disabled = true;
    // alert("Button has been disabled.");
}
function clickChange()  {
    var text = document.querySelector('#btn-run').firstChild;
    text.data = text.data == "已经在爬数据了" ? "贡献你的计算力" : "已经在爬数据了";
}


// Function used to run test click
function runTest() {
    logit("Clicked")
}

function caction(){
    client.loop();
    clickDisable();
    clickChange();
}

// link button action to function
document.querySelector('#btn-run').addEventListener('click', caction)
