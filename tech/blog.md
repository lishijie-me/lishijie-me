## my blog   
> 并行和并发
```text
并发（concurrency）和并行（parallelism）
1：并行是在不同实体上的多个事件，并发是在同一实体上的多个事件。
2：并行是在**多台(核)处理器上**同时处理多个任务。并发是在**一台(核)处理器上**同时处理多个任务。
```

> 今日份异常

jar包内方法报错, 最后排查原因是, 远程的jar包版本低, 没有这个方法
```java
java.lang.NoSuchMethodError: io.netty.util.internal.StringUtil.indexOfNonWhiteSpace
```

