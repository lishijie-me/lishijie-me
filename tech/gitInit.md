
> git init   

1.`git init` //初始化本地项目  
2.`git add .` //新增要提交的文件  
3.`git commit -m` "注释" //提交文件到本地仓库  
4.`git checkout -b develop` //切换并新建develop分支（看自己需要，不用可以跳过）  
5.`git remote add origin` 远程代码仓库地址 //新增远程仓库  
6.`git pull --rebase origin develop` //同步远程代码 develop是远程分支名，根据自己需求修改，前提是远程必须有该分支，大多数都是直接 master 分支  
7.`git push origin develop` //推送到远程develop分支 看自己要推送到哪个分支 前提远程有该分支  
  
> git config 
`git config --global user.name "xxx"`  
`git config --global user.email "xxx"`    

> git commit

`git commit -m ""`    
`git commit -m -a ""`   
`git reset --mixed "版本序列号"`  回退到指定版本     
`git stash`    
`git stash pop`   
