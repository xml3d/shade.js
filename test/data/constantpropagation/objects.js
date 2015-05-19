// Basic Propagation of object values
/*
var a = new Vec3(1);
var a2 = new Vec3(1);
var b = 1;
a = new Vec3(1, 2, 3);
var c = new Vec3(3, 2, 1);
*/
var a = new Vec3(1);
var a2 = a;
var b = a.x();
a = new Vec3(1,2,3);
var c = a.zyx();
