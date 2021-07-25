## my blog   
> 并行和并发
```text
并发（concurrency）和并行（parallelism）
1：并行是在不同实体上的多个事件，并发是在同一实体上的多个事件。
2：并行是在**多台(核)处理器上**同时处理多个任务。并发是在**一台(核)处理器上**同时处理多个任务。
```

> 今日份异常

jar包内方法报错, 最后排查原因是, 远程的jar包版本低, 没有这个方法
```text
java.lang.NoSuchMethodError: io.netty.util.internal.StringUtil.indexOfNonWhiteSpace
```

> 关于技术学习的心得

```text
Get Started Demo， 原理，实战，博客，源码解析，
```

> 实方法 & 虚方法

```text
Java中的实方法虚方法,主要含义是啥
```

> Git Hook

```text

```

> 记一次 代码提交版本回退问题

```text
今天E同学, 把配置文件提交上去了, 需要删除
于是有了以下步骤

1.备份
2.查看当前的 `HEAD` 指向哪个版本
$ git log
3.版本回退
$ git reset --hard commit_id 退回/前进 到指定版本
$ git reset --hard HEAD^   回退到上一版本
$ git reset --hard HEAD~3  回退到三次提交之前, 以此类推
4.现在 直接强推代码
$ git push -f
```

```text
记一次代码回退  
https://juejin.cn/post/6985630098569297950
```

```text
正身以俟时, 守己而律物
```