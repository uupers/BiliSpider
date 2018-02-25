const dbhtml = document.getElementById('db-info')

// Connection URL
var url = 'mongodb://spiderrd:spiderrd@45.32.68.44:37017/bilibili_spider';

const dbName = 'bilibili_spider';
var mongojs = require('mongojs');
var db = mongojs(url);
var db_member = db.collection('member_card');

var db_size = 0;
var db_objects = 0 ;
var db_storageSize = 0;


setInterval(
  db.stats(function () {
    console.log(arguments); 
    db_size = arguments[1].dataSize/1024/1024/1024; 
    dbit("数据库大小:" + db_size.toString().substring(0,5) + "G;");
    db_storageSize = arguments[1].storageSize/1024/1024/1024;
    dbit("存储空间:" + db_storageSize.toString().substring(0,5) + "G;"); 
    db_objects = arguments[1].objects;
    dbit("用户数:" + db_objects+";"); 
  }),
600000);



function dbit(elem) {
    dbhtml.innerHTML += "<span class='db-span'>"+elem+"</span>";
}