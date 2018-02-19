# BiliSpider

# 简介

这里是UUPs爬虫组，目标是为每名创作者的创作之路助力，主要体现在：
1. 数据获取与管理：利用爬虫技术获取全B站的视频与用户数据，并用维护数据库的方法管理它们，为创作者提供检索服务
2. 数据筛选与可视化：在海量数据中筛选出有效且感兴趣的信息，并研究将它们可视化的方法，为创作者提供创作素材
3. 数据分析与科研：根据获取到的有效数据，对B站推广机制，用户习惯等进行研究，为创作者提供推广经验

# 数据来源

## 视频页
1.  `https://api.bilibili.com/x/web-interface/archive/stat?aid={video_id}`

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
2.  `http://space.bilibili.com/ajax/member/getSubmitVideos?mid={mid}&pagesize={page_size}&page={page_number}`
 
      输入：
      * mid => up主id
      * page_size => 单页显示条目数（上限50）
      * page_number => 页码
            
      输出：JSON格式如下
```json
      "data":
      {
            "tlist":
            {
                  "x":
                  {
                        "tid": "等于x表示分区记号",
                        "count": "该分区下的投稿数量",
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
                        "video_review": "未知",
                        "favorites": "作者",
                        "aid": "视频id",
                        "hide_click": "未知"
                   }
            ],
            "count": "总视频投稿数",
            "pages": "总显示页数"
       }
```
