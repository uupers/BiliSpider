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
3. `https://api.bilibili.com/x/web-interface/card?mid={mid}`

输入： 
- mid => 用户ID，eg：1492

输出：
```javascript
{
    "code": 0,
    "message": "0",
    "ttl": 1,
    "data": {
        "card": {
            "mid": "1492", //用户ID
            "name": "Q-kun", //用户昵称
            "approve": false,
            "sex": "男",
            "rank": "10000",
            "face": "http://i0.hdslb.com/bfs/face/f92360dc5d1bac59020b48d60c827b15a26ed70e.jpg",
            "DisplayRank": "0",
            "regtime": 0,
            "spacesta": 0,
            "birthday": "",
            "place": "",
            "description": "",
            "article": 0,
            "attentions": [ //关注列表
                14164
            ],
            "fans": 406568, //粉丝
            "friend": 16,
            "attention": 16, //关注数量
            "sign": "合集点我收藏夹weibo.com/kyusuke ",
            "level_info": {
                "current_level": 6,
                "current_min": 28800,
                "current_exp": 526773,
                "next_exp": "-"
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
                "type": 0,
                "desc": "bilibili直播签约主播\r\n"
            },
            "vip": {
                "vipType": 1,
                "vipDueDate": 1537113600000,
                "dueRemark": "",
                "accessStatus": 1,
                "vipStatus": 1,
                "vipStatusWarn": ""
            }
        },
        "following": true,
        "archive_count": 332,
        "article_count": 0,
        "follower": 406568
    }
}
```
