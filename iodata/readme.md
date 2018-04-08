# 编译文件

这是 VS2017 的完整工程，因此如果安装 VS，打开 sln 工程,将 Mathematica\11.3\SystemFiles\IncludeFiles\C 里的全部 H 文件拷贝至 MSVC 编译器里的 
include 目录下，将 Mathematica\11.3\SystemFiles\Libraries\Windows-x86-64 里的全部 dll 文件拷贝至 MSVC 编译器里的 x64\lib 目录下，然后编译生成即可

如果没有安装，直接可以用编译好的dll, 即 x64\Release\iodata.dll 这个文件，需要保证自己是win10系统

# 接口的使用
参考"例子.nb"
