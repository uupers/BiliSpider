# BiliSpider

# 简介

这里是 UUPs 爬虫组，目标是为每名创作者的创作之路助力，主要体现在：

1. 数据获取与管理：利用爬虫技术获取全B站的视频与用户数据，并用维护数据库的方法管理它们，为创作者提供检索服务
2. 数据筛选与可视化：在海量数据中筛选出有效且感兴趣的信息，并研究将它们可视化的方法，为创作者提供创作素材
3. 数据分析与科研：根据获取到的有效数据，对B站推广机制，用户习惯等进行研究，为创作者提供推广经验

# 数据来源

## 视频页
1.  `https://api.bilibili.com/x/web-interface/archive/stat?aid={video_id}`

      输入： video_id => 视频的av号

      输出： JSON格式如下
```json
      "data":
      {
            "aid": "av号",
            "view": "播放数",
            "danmuku": "弹幕数",
            "reply": "回复数",
            "favorite": "收藏数",
            "coin": "硬币数",
            "share": "分享数",
            "now_rank": "未知",
            "his_rank": "最高全站日排名（0表示未曾上榜)",
            "no_reprint": "0表示默认 1表示未经作者授权禁止转载",
            "copyright": "1表示原创 2表示搬运"
      }
 ```

## 用户页
2.  `http://space.bilibili.com/ajax/member/getSubmitVideos?mid={mid}&pagesize={page_size}&page={page_number}`

      输入：
      * mid => up主id
      * page_size => 单页显示条目数（上限 100）
      * page_number => 页码

      输出：JSON格式如下
```json
      "data":
      {
            "tlist":
            {
                  "number(分区编号)":
                  {
                        "tid": "与number相等",
                        "count": "该分区下投稿数量",
                        "name": "分区名称"
                  }
            },
            "vlist":
            [
                  {
                        "comment": "评论数",
                        "typeid": "分区类型",
                        "play": "播放数",
                        "pic": "封面地址",
                        "subtitle": "子标题",
                        "description":"视频描述",
                        "copyright": "1表示原创 2表示搬运",
                        "title": "标题",
                        "review": "未知",
                        "author": "作者",
                        "mid": "作者id",
                        "created": "投稿时间（时间戳）",
                        "length": "视频时长",
                        "video_review": "弹幕数",
                        "favorites": "收藏数",
                        "aid": "视频id",
                        "hide_click": "隐藏播放量显示？"
                   }
            ],
            "count": "总视频投稿数",
            "pages": "总显示页数"
       }
```
## 用户信息
3. `https://space.bilibili.com/ajax/member/GetInfo`

输入： 
- Header
    - Content-Type => 请求类型，eg： `application/x-www-form-urlencoded; charset=UTF-8` 
    - Referer => 上一跳地址，格式：`https://space.bilibili.com/{mid}/` ，eg：`https://space.bilibili.com/2654670/`
- Body
    - mid =>  用户ID， eg：`2654670`
    - csrf => 防跨域攻击签名，对应`cookie`中 key=`bili_jct` 的数据, eg: `3600d0307c09615eb75ca5ec42ac565a`

PS: 本API必须使用POST请求, cookie中必须包含key=`bili_jct` 的数据

输出：
```json
{
    "status": true,
    "data": {
        "mid": "2654670",   //用户信息
        "name": "LePtC",    //用户名
        "approve": false,   
        "sex": "保密",    //性别
        "rank": "10000",    //等级
        "face":     "http://i1.hdslb.com/bfs/face/3a2799018636c9c43774dd7bf6685387bb219011.jpg",    //头像
        "DisplayRank": "10000",
        "regtime": 1382895515, //注册时间
        "spacesta": 0,
        "birthday": "0000-01-01",
        "place": "",
        "description": "",
        "article": 0,
        "sign": "学物理的都好萌～", //签名
        "level_info": {
            "current_level": 5,
            "current_min": 10800,
            "current_exp": 14312,
            "next_exp": 28800
        },
        "pendant": {
            "pid": 0,
            "name": "",
            "image": "",
            "expire": 0
        },
        "nameplate": {
            "nid": 0,
            "name": "",
            "image": "",
            "image_small": "",
            "level": "",
            "condition": ""
        },
        "official_verify": {
            "type": -1,
            "desc": ""
        },
        "vip": {
            "vipType": 1,
            "vipDueDate": 1491235200000,
            "dueRemark": "",
            "accessStatus": 1,
            "vipStatus": 0,
            "vipStatusWarn": ""
        },
        "toutu": "bfs/space/c9dae917e24b4fc17c4d544caf6b6c0b17f8692b.jpg",
        "toutuId": 3,
        "theme": "default",
        "theme_preview": "",
        "coins": 0,
        "im9_sign": "6159621e1268bab1c81824f21bb5ae2c",
        "playNum": 210014,
        "fans_badge": false
    }
}
```
