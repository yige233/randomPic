相对于原repo，这个仓库有如下主要更改：
* 图片文件夹路径改到了 ./pics （无关紧要
* 直接访问网站不再直接提供图片，需要使用下面列出的api：

| 请求路径 | 请求方法 | 请求参数 |
| ------- | ------- | ------- |
|  /random  | get |  无 |
| /pic  | get | name |
| /fresh  | get | 无 |

比如：

`get http://localhost:3000/random`

```
HTTP/1.1 200 OK
Access-Control-Allow-Origin: *
Content-Type: application/json; charset=utf-8
Date: Sat, 03 Sep 2022 13:28:11 GMT
Connection: close
Content-Length: 88

{
  "pic": "pics:(pid-62668066)春のささやき.png",
  "size": 5921969,
  "cachedAt": 1662211482
}
```


`get http://localhost:3000/pic?name=pics:(pid-62668066)春のささやき.png`

```
Access-Control-Allow-Origin: *
Connection: keep-alive
Content-Type: image/png
Date: Sat, 03 Sep 2022 13:33:30 GMT
Keep-Alive: timeout=5
Transfer-Encoding: chunked

*一堆图片二进制数据*
```

`get http://localhost:3000/fresh`
```
HTTP/1.1 204 No Content
Access-Control-Allow-Origin: *
Date: Sat, 03 Sep 2022 13:30:01 GMT
Connection: close
```

以及原repo提到的待添加功能，~~那是一个都没有实现~~

实现了多文件夹、遍历文件夹功能，并提供了一个config.json
