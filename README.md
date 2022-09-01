相对于原repo，这个仓库有如下主要更改：
* 图片文件夹路径改到了 ./pics （无关紧要
* 直接访问网站不再直接提供图片，需要使用下面列出的api：

| 请求路径 | 请求方法 | 请求参数 |
| ------- | ------- | ------- |
|  /random  | get |  无 |
| /pic  | get | name |

比如：

`get http://localhost:3000/random`

```
HTTP/1.1 200 OK
Access-Control-Allow-Origin: *
Content-Type: application/json; charset=utf-8
Date: Thu, 01 Sep 2022 12:24:37 GMT
Connection: close
Content-Length: 34

{
  "pic": "(pid-76627494)Autumn.png"
}
```


`get http://localhost:3000/pic?name=(pid-76627494)Autumn.png`

```
一张图片
```

以及原repo提到的待添加功能，那是一个都没有实现
