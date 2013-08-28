;(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function () {
    var global = typeof window !== 'undefined' ? window : {};
    global.Shade = require("../index.js");
}());

},{"../index.js":2}],2:[function(require,module,exports){
module.exports = require('./src/shade.js');
},{"./src/shade.js":39}],3:[function(require,module,exports){
/*
  Copyright (C) 2012 Ariya Hidayat <ariya.hidayat@gmail.com>
  Copyright (C) 2012 Mathias Bynens <mathias@qiwi.be>
  Copyright (C) 2012 Joost-Wim Boekesteijn <joost-wim@boekesteijn.nl>
  Copyright (C) 2012 Kris Kowal <kris.kowal@cixar.com>
  Copyright (C) 2012 Yusuke Suzuki <utatane.tea@gmail.com>
  Copyright (C) 2012 Arpad Borsos <arpad.borsos@googlemail.com>
  Copyright (C) 2011 Ariya Hidayat <ariya.hidayat@gmail.com>

  Redistribution and use in source and binary forms, with or without
  modification, are permitted provided that the following conditions are met:

    * Redistributions of source code must retain the above copyright
      notice, this list of conditions and the following disclaimer.
    * Redistributions in binary form must reproduce the above copyright
      notice, this list of conditions and the following disclaimer in the
      documentation and/or other materials provided with the distribution.

  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
  AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
  IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
  ARE DISCLAIMED. IN NO EVENT SHALL <COPYRIGHT HOLDER> BE LIABLE FOR ANY
  DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
  (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
  LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
  ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
  (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
  THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/

/*jslint bitwise:true plusplus:true */
/*global esprima:true, define:true, exports:true, window: true,
throwError: true, createLiteral: true, generateStatement: true,
parseAssignmentExpression: true, parseBlock: true, parseExpression: true,
parseFunctionDeclaration: true, parseFunctionExpression: true,
parseFunctionSourceElements: true, parseVariableIdentifier: true,
parseLeftHandSideExpression: true,
parseStatement: true, parseSourceElement: true */

(function (root, factory) {
    'use strict';

    // Universal Module Definition (UMD) to support AMD, CommonJS/Node.js,
    // Rhino, and plain browser loading.
    if (typeof define === 'function' && define.amd) {
        define(['exports'], factory);
    } else if (typeof exports !== 'undefined') {
        factory(exports);
    } else {
        factory((root.esprima = {}));
    }
}(this, function (exports) {
    'use strict';

    var Token,
        TokenName,
        Syntax,
        PropertyKind,
        Messages,
        Regex,
        source,
        strict,
        index,
        lineNumber,
        lineStart,
        length,
        buffer,
        state,
        extra;

    Token = {
        BooleanLiteral: 1,
        EOF: 2,
        Identifier: 3,
        Keyword: 4,
        NullLiteral: 5,
        NumericLiteral: 6,
        Punctuator: 7,
        StringLiteral: 8
    };

    TokenName = {};
    TokenName[Token.BooleanLiteral] = 'Boolean';
    TokenName[Token.EOF] = '<end>';
    TokenName[Token.Identifier] = 'Identifier';
    TokenName[Token.Keyword] = 'Keyword';
    TokenName[Token.NullLiteral] = 'Null';
    TokenName[Token.NumericLiteral] = 'Numeric';
    TokenName[Token.Punctuator] = 'Punctuator';
    TokenName[Token.StringLiteral] = 'String';

    Syntax = {
        AssignmentExpression: 'AssignmentExpression',
        ArrayExpression: 'ArrayExpression',
        BlockStatement: 'BlockStatement',
        BinaryExpression: 'BinaryExpression',
        BreakStatement: 'BreakStatement',
        CallExpression: 'CallExpression',
        CatchClause: 'CatchClause',
        ConditionalExpression: 'ConditionalExpression',
        ContinueStatement: 'ContinueStatement',
        DoWhileStatement: 'DoWhileStatement',
        DebuggerStatement: 'DebuggerStatement',
        EmptyStatement: 'EmptyStatement',
        ExpressionStatement: 'ExpressionStatement',
        ForStatement: 'ForStatement',
        ForInStatement: 'ForInStatement',
        FunctionDeclaration: 'FunctionDeclaration',
        FunctionExpression: 'FunctionExpression',
        Identifier: 'Identifier',
        IfStatement: 'IfStatement',
        Literal: 'Literal',
        LabeledStatement: 'LabeledStatement',
        LogicalExpression: 'LogicalExpression',
        MemberExpression: 'MemberExpression',
        NewExpression: 'NewExpression',
        ObjectExpression: 'ObjectExpression',
        Program: 'Program',
        Property: 'Property',
        ReturnStatement: 'ReturnStatement',
        SequenceExpression: 'SequenceExpression',
        SwitchStatement: 'SwitchStatement',
        SwitchCase: 'SwitchCase',
        ThisExpression: 'ThisExpression',
        ThrowStatement: 'ThrowStatement',
        TryStatement: 'TryStatement',
        UnaryExpression: 'UnaryExpression',
        UpdateExpression: 'UpdateExpression',
        VariableDeclaration: 'VariableDeclaration',
        VariableDeclarator: 'VariableDeclarator',
        WhileStatement: 'WhileStatement',
        WithStatement: 'WithStatement'
    };

    PropertyKind = {
        Data: 1,
        Get: 2,
        Set: 4
    };

    // Error messages should be identical to V8.
    Messages = {
        UnexpectedToken:  'Unexpected token %0',
        UnexpectedNumber:  'Unexpected number',
        UnexpectedString:  'Unexpected string',
        UnexpectedIdentifier:  'Unexpected identifier',
        UnexpectedReserved:  'Unexpected reserved word',
        UnexpectedEOS:  'Unexpected end of input',
        NewlineAfterThrow:  'Illegal newline after throw',
        InvalidRegExp: 'Invalid regular expression',
        UnterminatedRegExp:  'Invalid regular expression: missing /',
        InvalidLHSInAssignment:  'Invalid left-hand side in assignment',
        InvalidLHSInForIn:  'Invalid left-hand side in for-in',
        MultipleDefaultsInSwitch: 'More than one default clause in switch statement',
        NoCatchOrFinally:  'Missing catch or finally after try',
        UnknownLabel: 'Undefined label \'%0\'',
        Redeclaration: '%0 \'%1\' has already been declared',
        IllegalContinue: 'Illegal continue statement',
        IllegalBreak: 'Illegal break statement',
        IllegalReturn: 'Illegal return statement',
        StrictModeWith:  'Strict mode code may not include a with statement',
        StrictCatchVariable:  'Catch variable may not be eval or arguments in strict mode',
        StrictVarName:  'Variable name may not be eval or arguments in strict mode',
        StrictParamName:  'Parameter name eval or arguments is not allowed in strict mode',
        StrictParamDupe: 'Strict mode function may not have duplicate parameter names',
        StrictFunctionName:  'Function name may not be eval or arguments in strict mode',
        StrictOctalLiteral:  'Octal literals are not allowed in strict mode.',
        StrictDelete:  'Delete of an unqualified identifier in strict mode.',
        StrictDuplicateProperty:  'Duplicate data property in object literal not allowed in strict mode',
        AccessorDataProperty:  'Object literal may not have data and accessor property with the same name',
        AccessorGetSet:  'Object literal may not have multiple get/set accessors with the same name',
        StrictLHSAssignment:  'Assignment to eval or arguments is not allowed in strict mode',
        StrictLHSPostfix:  'Postfix increment/decrement may not have eval or arguments operand in strict mode',
        StrictLHSPrefix:  'Prefix increment/decrement may not have eval or arguments operand in strict mode',
        StrictReservedWord:  'Use of future reserved word in strict mode'
    };

    // See also tools/generate-unicode-regex.py.
    Regex = {
        NonAsciiIdentifierStart: new RegExp('[\xaa\xb5\xba\xc0-\xd6\xd8-\xf6\xf8-\u02c1\u02c6-\u02d1\u02e0-\u02e4\u02ec\u02ee\u0370-\u0374\u0376\u0377\u037a-\u037d\u0386\u0388-\u038a\u038c\u038e-\u03a1\u03a3-\u03f5\u03f7-\u0481\u048a-\u0527\u0531-\u0556\u0559\u0561-\u0587\u05d0-\u05ea\u05f0-\u05f2\u0620-\u064a\u066e\u066f\u0671-\u06d3\u06d5\u06e5\u06e6\u06ee\u06ef\u06fa-\u06fc\u06ff\u0710\u0712-\u072f\u074d-\u07a5\u07b1\u07ca-\u07ea\u07f4\u07f5\u07fa\u0800-\u0815\u081a\u0824\u0828\u0840-\u0858\u08a0\u08a2-\u08ac\u0904-\u0939\u093d\u0950\u0958-\u0961\u0971-\u0977\u0979-\u097f\u0985-\u098c\u098f\u0990\u0993-\u09a8\u09aa-\u09b0\u09b2\u09b6-\u09b9\u09bd\u09ce\u09dc\u09dd\u09df-\u09e1\u09f0\u09f1\u0a05-\u0a0a\u0a0f\u0a10\u0a13-\u0a28\u0a2a-\u0a30\u0a32\u0a33\u0a35\u0a36\u0a38\u0a39\u0a59-\u0a5c\u0a5e\u0a72-\u0a74\u0a85-\u0a8d\u0a8f-\u0a91\u0a93-\u0aa8\u0aaa-\u0ab0\u0ab2\u0ab3\u0ab5-\u0ab9\u0abd\u0ad0\u0ae0\u0ae1\u0b05-\u0b0c\u0b0f\u0b10\u0b13-\u0b28\u0b2a-\u0b30\u0b32\u0b33\u0b35-\u0b39\u0b3d\u0b5c\u0b5d\u0b5f-\u0b61\u0b71\u0b83\u0b85-\u0b8a\u0b8e-\u0b90\u0b92-\u0b95\u0b99\u0b9a\u0b9c\u0b9e\u0b9f\u0ba3\u0ba4\u0ba8-\u0baa\u0bae-\u0bb9\u0bd0\u0c05-\u0c0c\u0c0e-\u0c10\u0c12-\u0c28\u0c2a-\u0c33\u0c35-\u0c39\u0c3d\u0c58\u0c59\u0c60\u0c61\u0c85-\u0c8c\u0c8e-\u0c90\u0c92-\u0ca8\u0caa-\u0cb3\u0cb5-\u0cb9\u0cbd\u0cde\u0ce0\u0ce1\u0cf1\u0cf2\u0d05-\u0d0c\u0d0e-\u0d10\u0d12-\u0d3a\u0d3d\u0d4e\u0d60\u0d61\u0d7a-\u0d7f\u0d85-\u0d96\u0d9a-\u0db1\u0db3-\u0dbb\u0dbd\u0dc0-\u0dc6\u0e01-\u0e30\u0e32\u0e33\u0e40-\u0e46\u0e81\u0e82\u0e84\u0e87\u0e88\u0e8a\u0e8d\u0e94-\u0e97\u0e99-\u0e9f\u0ea1-\u0ea3\u0ea5\u0ea7\u0eaa\u0eab\u0ead-\u0eb0\u0eb2\u0eb3\u0ebd\u0ec0-\u0ec4\u0ec6\u0edc-\u0edf\u0f00\u0f40-\u0f47\u0f49-\u0f6c\u0f88-\u0f8c\u1000-\u102a\u103f\u1050-\u1055\u105a-\u105d\u1061\u1065\u1066\u106e-\u1070\u1075-\u1081\u108e\u10a0-\u10c5\u10c7\u10cd\u10d0-\u10fa\u10fc-\u1248\u124a-\u124d\u1250-\u1256\u1258\u125a-\u125d\u1260-\u1288\u128a-\u128d\u1290-\u12b0\u12b2-\u12b5\u12b8-\u12be\u12c0\u12c2-\u12c5\u12c8-\u12d6\u12d8-\u1310\u1312-\u1315\u1318-\u135a\u1380-\u138f\u13a0-\u13f4\u1401-\u166c\u166f-\u167f\u1681-\u169a\u16a0-\u16ea\u16ee-\u16f0\u1700-\u170c\u170e-\u1711\u1720-\u1731\u1740-\u1751\u1760-\u176c\u176e-\u1770\u1780-\u17b3\u17d7\u17dc\u1820-\u1877\u1880-\u18a8\u18aa\u18b0-\u18f5\u1900-\u191c\u1950-\u196d\u1970-\u1974\u1980-\u19ab\u19c1-\u19c7\u1a00-\u1a16\u1a20-\u1a54\u1aa7\u1b05-\u1b33\u1b45-\u1b4b\u1b83-\u1ba0\u1bae\u1baf\u1bba-\u1be5\u1c00-\u1c23\u1c4d-\u1c4f\u1c5a-\u1c7d\u1ce9-\u1cec\u1cee-\u1cf1\u1cf5\u1cf6\u1d00-\u1dbf\u1e00-\u1f15\u1f18-\u1f1d\u1f20-\u1f45\u1f48-\u1f4d\u1f50-\u1f57\u1f59\u1f5b\u1f5d\u1f5f-\u1f7d\u1f80-\u1fb4\u1fb6-\u1fbc\u1fbe\u1fc2-\u1fc4\u1fc6-\u1fcc\u1fd0-\u1fd3\u1fd6-\u1fdb\u1fe0-\u1fec\u1ff2-\u1ff4\u1ff6-\u1ffc\u2071\u207f\u2090-\u209c\u2102\u2107\u210a-\u2113\u2115\u2119-\u211d\u2124\u2126\u2128\u212a-\u212d\u212f-\u2139\u213c-\u213f\u2145-\u2149\u214e\u2160-\u2188\u2c00-\u2c2e\u2c30-\u2c5e\u2c60-\u2ce4\u2ceb-\u2cee\u2cf2\u2cf3\u2d00-\u2d25\u2d27\u2d2d\u2d30-\u2d67\u2d6f\u2d80-\u2d96\u2da0-\u2da6\u2da8-\u2dae\u2db0-\u2db6\u2db8-\u2dbe\u2dc0-\u2dc6\u2dc8-\u2dce\u2dd0-\u2dd6\u2dd8-\u2dde\u2e2f\u3005-\u3007\u3021-\u3029\u3031-\u3035\u3038-\u303c\u3041-\u3096\u309d-\u309f\u30a1-\u30fa\u30fc-\u30ff\u3105-\u312d\u3131-\u318e\u31a0-\u31ba\u31f0-\u31ff\u3400-\u4db5\u4e00-\u9fcc\ua000-\ua48c\ua4d0-\ua4fd\ua500-\ua60c\ua610-\ua61f\ua62a\ua62b\ua640-\ua66e\ua67f-\ua697\ua6a0-\ua6ef\ua717-\ua71f\ua722-\ua788\ua78b-\ua78e\ua790-\ua793\ua7a0-\ua7aa\ua7f8-\ua801\ua803-\ua805\ua807-\ua80a\ua80c-\ua822\ua840-\ua873\ua882-\ua8b3\ua8f2-\ua8f7\ua8fb\ua90a-\ua925\ua930-\ua946\ua960-\ua97c\ua984-\ua9b2\ua9cf\uaa00-\uaa28\uaa40-\uaa42\uaa44-\uaa4b\uaa60-\uaa76\uaa7a\uaa80-\uaaaf\uaab1\uaab5\uaab6\uaab9-\uaabd\uaac0\uaac2\uaadb-\uaadd\uaae0-\uaaea\uaaf2-\uaaf4\uab01-\uab06\uab09-\uab0e\uab11-\uab16\uab20-\uab26\uab28-\uab2e\uabc0-\uabe2\uac00-\ud7a3\ud7b0-\ud7c6\ud7cb-\ud7fb\uf900-\ufa6d\ufa70-\ufad9\ufb00-\ufb06\ufb13-\ufb17\ufb1d\ufb1f-\ufb28\ufb2a-\ufb36\ufb38-\ufb3c\ufb3e\ufb40\ufb41\ufb43\ufb44\ufb46-\ufbb1\ufbd3-\ufd3d\ufd50-\ufd8f\ufd92-\ufdc7\ufdf0-\ufdfb\ufe70-\ufe74\ufe76-\ufefc\uff21-\uff3a\uff41-\uff5a\uff66-\uffbe\uffc2-\uffc7\uffca-\uffcf\uffd2-\uffd7\uffda-\uffdc]'),
        NonAsciiIdentifierPart: new RegExp('[\xaa\xb5\xba\xc0-\xd6\xd8-\xf6\xf8-\u02c1\u02c6-\u02d1\u02e0-\u02e4\u02ec\u02ee\u0300-\u0374\u0376\u0377\u037a-\u037d\u0386\u0388-\u038a\u038c\u038e-\u03a1\u03a3-\u03f5\u03f7-\u0481\u0483-\u0487\u048a-\u0527\u0531-\u0556\u0559\u0561-\u0587\u0591-\u05bd\u05bf\u05c1\u05c2\u05c4\u05c5\u05c7\u05d0-\u05ea\u05f0-\u05f2\u0610-\u061a\u0620-\u0669\u066e-\u06d3\u06d5-\u06dc\u06df-\u06e8\u06ea-\u06fc\u06ff\u0710-\u074a\u074d-\u07b1\u07c0-\u07f5\u07fa\u0800-\u082d\u0840-\u085b\u08a0\u08a2-\u08ac\u08e4-\u08fe\u0900-\u0963\u0966-\u096f\u0971-\u0977\u0979-\u097f\u0981-\u0983\u0985-\u098c\u098f\u0990\u0993-\u09a8\u09aa-\u09b0\u09b2\u09b6-\u09b9\u09bc-\u09c4\u09c7\u09c8\u09cb-\u09ce\u09d7\u09dc\u09dd\u09df-\u09e3\u09e6-\u09f1\u0a01-\u0a03\u0a05-\u0a0a\u0a0f\u0a10\u0a13-\u0a28\u0a2a-\u0a30\u0a32\u0a33\u0a35\u0a36\u0a38\u0a39\u0a3c\u0a3e-\u0a42\u0a47\u0a48\u0a4b-\u0a4d\u0a51\u0a59-\u0a5c\u0a5e\u0a66-\u0a75\u0a81-\u0a83\u0a85-\u0a8d\u0a8f-\u0a91\u0a93-\u0aa8\u0aaa-\u0ab0\u0ab2\u0ab3\u0ab5-\u0ab9\u0abc-\u0ac5\u0ac7-\u0ac9\u0acb-\u0acd\u0ad0\u0ae0-\u0ae3\u0ae6-\u0aef\u0b01-\u0b03\u0b05-\u0b0c\u0b0f\u0b10\u0b13-\u0b28\u0b2a-\u0b30\u0b32\u0b33\u0b35-\u0b39\u0b3c-\u0b44\u0b47\u0b48\u0b4b-\u0b4d\u0b56\u0b57\u0b5c\u0b5d\u0b5f-\u0b63\u0b66-\u0b6f\u0b71\u0b82\u0b83\u0b85-\u0b8a\u0b8e-\u0b90\u0b92-\u0b95\u0b99\u0b9a\u0b9c\u0b9e\u0b9f\u0ba3\u0ba4\u0ba8-\u0baa\u0bae-\u0bb9\u0bbe-\u0bc2\u0bc6-\u0bc8\u0bca-\u0bcd\u0bd0\u0bd7\u0be6-\u0bef\u0c01-\u0c03\u0c05-\u0c0c\u0c0e-\u0c10\u0c12-\u0c28\u0c2a-\u0c33\u0c35-\u0c39\u0c3d-\u0c44\u0c46-\u0c48\u0c4a-\u0c4d\u0c55\u0c56\u0c58\u0c59\u0c60-\u0c63\u0c66-\u0c6f\u0c82\u0c83\u0c85-\u0c8c\u0c8e-\u0c90\u0c92-\u0ca8\u0caa-\u0cb3\u0cb5-\u0cb9\u0cbc-\u0cc4\u0cc6-\u0cc8\u0cca-\u0ccd\u0cd5\u0cd6\u0cde\u0ce0-\u0ce3\u0ce6-\u0cef\u0cf1\u0cf2\u0d02\u0d03\u0d05-\u0d0c\u0d0e-\u0d10\u0d12-\u0d3a\u0d3d-\u0d44\u0d46-\u0d48\u0d4a-\u0d4e\u0d57\u0d60-\u0d63\u0d66-\u0d6f\u0d7a-\u0d7f\u0d82\u0d83\u0d85-\u0d96\u0d9a-\u0db1\u0db3-\u0dbb\u0dbd\u0dc0-\u0dc6\u0dca\u0dcf-\u0dd4\u0dd6\u0dd8-\u0ddf\u0df2\u0df3\u0e01-\u0e3a\u0e40-\u0e4e\u0e50-\u0e59\u0e81\u0e82\u0e84\u0e87\u0e88\u0e8a\u0e8d\u0e94-\u0e97\u0e99-\u0e9f\u0ea1-\u0ea3\u0ea5\u0ea7\u0eaa\u0eab\u0ead-\u0eb9\u0ebb-\u0ebd\u0ec0-\u0ec4\u0ec6\u0ec8-\u0ecd\u0ed0-\u0ed9\u0edc-\u0edf\u0f00\u0f18\u0f19\u0f20-\u0f29\u0f35\u0f37\u0f39\u0f3e-\u0f47\u0f49-\u0f6c\u0f71-\u0f84\u0f86-\u0f97\u0f99-\u0fbc\u0fc6\u1000-\u1049\u1050-\u109d\u10a0-\u10c5\u10c7\u10cd\u10d0-\u10fa\u10fc-\u1248\u124a-\u124d\u1250-\u1256\u1258\u125a-\u125d\u1260-\u1288\u128a-\u128d\u1290-\u12b0\u12b2-\u12b5\u12b8-\u12be\u12c0\u12c2-\u12c5\u12c8-\u12d6\u12d8-\u1310\u1312-\u1315\u1318-\u135a\u135d-\u135f\u1380-\u138f\u13a0-\u13f4\u1401-\u166c\u166f-\u167f\u1681-\u169a\u16a0-\u16ea\u16ee-\u16f0\u1700-\u170c\u170e-\u1714\u1720-\u1734\u1740-\u1753\u1760-\u176c\u176e-\u1770\u1772\u1773\u1780-\u17d3\u17d7\u17dc\u17dd\u17e0-\u17e9\u180b-\u180d\u1810-\u1819\u1820-\u1877\u1880-\u18aa\u18b0-\u18f5\u1900-\u191c\u1920-\u192b\u1930-\u193b\u1946-\u196d\u1970-\u1974\u1980-\u19ab\u19b0-\u19c9\u19d0-\u19d9\u1a00-\u1a1b\u1a20-\u1a5e\u1a60-\u1a7c\u1a7f-\u1a89\u1a90-\u1a99\u1aa7\u1b00-\u1b4b\u1b50-\u1b59\u1b6b-\u1b73\u1b80-\u1bf3\u1c00-\u1c37\u1c40-\u1c49\u1c4d-\u1c7d\u1cd0-\u1cd2\u1cd4-\u1cf6\u1d00-\u1de6\u1dfc-\u1f15\u1f18-\u1f1d\u1f20-\u1f45\u1f48-\u1f4d\u1f50-\u1f57\u1f59\u1f5b\u1f5d\u1f5f-\u1f7d\u1f80-\u1fb4\u1fb6-\u1fbc\u1fbe\u1fc2-\u1fc4\u1fc6-\u1fcc\u1fd0-\u1fd3\u1fd6-\u1fdb\u1fe0-\u1fec\u1ff2-\u1ff4\u1ff6-\u1ffc\u200c\u200d\u203f\u2040\u2054\u2071\u207f\u2090-\u209c\u20d0-\u20dc\u20e1\u20e5-\u20f0\u2102\u2107\u210a-\u2113\u2115\u2119-\u211d\u2124\u2126\u2128\u212a-\u212d\u212f-\u2139\u213c-\u213f\u2145-\u2149\u214e\u2160-\u2188\u2c00-\u2c2e\u2c30-\u2c5e\u2c60-\u2ce4\u2ceb-\u2cf3\u2d00-\u2d25\u2d27\u2d2d\u2d30-\u2d67\u2d6f\u2d7f-\u2d96\u2da0-\u2da6\u2da8-\u2dae\u2db0-\u2db6\u2db8-\u2dbe\u2dc0-\u2dc6\u2dc8-\u2dce\u2dd0-\u2dd6\u2dd8-\u2dde\u2de0-\u2dff\u2e2f\u3005-\u3007\u3021-\u302f\u3031-\u3035\u3038-\u303c\u3041-\u3096\u3099\u309a\u309d-\u309f\u30a1-\u30fa\u30fc-\u30ff\u3105-\u312d\u3131-\u318e\u31a0-\u31ba\u31f0-\u31ff\u3400-\u4db5\u4e00-\u9fcc\ua000-\ua48c\ua4d0-\ua4fd\ua500-\ua60c\ua610-\ua62b\ua640-\ua66f\ua674-\ua67d\ua67f-\ua697\ua69f-\ua6f1\ua717-\ua71f\ua722-\ua788\ua78b-\ua78e\ua790-\ua793\ua7a0-\ua7aa\ua7f8-\ua827\ua840-\ua873\ua880-\ua8c4\ua8d0-\ua8d9\ua8e0-\ua8f7\ua8fb\ua900-\ua92d\ua930-\ua953\ua960-\ua97c\ua980-\ua9c0\ua9cf-\ua9d9\uaa00-\uaa36\uaa40-\uaa4d\uaa50-\uaa59\uaa60-\uaa76\uaa7a\uaa7b\uaa80-\uaac2\uaadb-\uaadd\uaae0-\uaaef\uaaf2-\uaaf6\uab01-\uab06\uab09-\uab0e\uab11-\uab16\uab20-\uab26\uab28-\uab2e\uabc0-\uabea\uabec\uabed\uabf0-\uabf9\uac00-\ud7a3\ud7b0-\ud7c6\ud7cb-\ud7fb\uf900-\ufa6d\ufa70-\ufad9\ufb00-\ufb06\ufb13-\ufb17\ufb1d-\ufb28\ufb2a-\ufb36\ufb38-\ufb3c\ufb3e\ufb40\ufb41\ufb43\ufb44\ufb46-\ufbb1\ufbd3-\ufd3d\ufd50-\ufd8f\ufd92-\ufdc7\ufdf0-\ufdfb\ufe00-\ufe0f\ufe20-\ufe26\ufe33\ufe34\ufe4d-\ufe4f\ufe70-\ufe74\ufe76-\ufefc\uff10-\uff19\uff21-\uff3a\uff3f\uff41-\uff5a\uff66-\uffbe\uffc2-\uffc7\uffca-\uffcf\uffd2-\uffd7\uffda-\uffdc]')
    };

    // Ensure the condition is true, otherwise throw an error.
    // This is only to have a better contract semantic, i.e. another safety net
    // to catch a logic error. The condition shall be fulfilled in normal case.
    // Do NOT use this to enforce a certain condition on any user input.

    function assert(condition, message) {
        if (!condition) {
            throw new Error('ASSERT: ' + message);
        }
    }

    function sliceSource(from, to) {
        return source.slice(from, to);
    }

    if (typeof 'esprima'[0] === 'undefined') {
        sliceSource = function sliceArraySource(from, to) {
            return source.slice(from, to).join('');
        };
    }

    function isDecimalDigit(ch) {
        return '0123456789'.indexOf(ch) >= 0;
    }

    function isHexDigit(ch) {
        return '0123456789abcdefABCDEF'.indexOf(ch) >= 0;
    }

    function isOctalDigit(ch) {
        return '01234567'.indexOf(ch) >= 0;
    }


    // 7.2 White Space

    function isWhiteSpace(ch) {
        return (ch === ' ') || (ch === '\u0009') || (ch === '\u000B') ||
            (ch === '\u000C') || (ch === '\u00A0') ||
            (ch.charCodeAt(0) >= 0x1680 &&
             '\u1680\u180E\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200A\u202F\u205F\u3000\uFEFF'.indexOf(ch) >= 0);
    }

    // 7.3 Line Terminators

    function isLineTerminator(ch) {
        return (ch === '\n' || ch === '\r' || ch === '\u2028' || ch === '\u2029');
    }

    // 7.6 Identifier Names and Identifiers

    function isIdentifierStart(ch) {
        return (ch === '$') || (ch === '_') || (ch === '\\') ||
            (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') ||
            ((ch.charCodeAt(0) >= 0x80) && Regex.NonAsciiIdentifierStart.test(ch));
    }

    function isIdentifierPart(ch) {
        return (ch === '$') || (ch === '_') || (ch === '\\') ||
            (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') ||
            ((ch >= '0') && (ch <= '9')) ||
            ((ch.charCodeAt(0) >= 0x80) && Regex.NonAsciiIdentifierPart.test(ch));
    }

    // 7.6.1.2 Future Reserved Words

    function isFutureReservedWord(id) {
        switch (id) {

        // Future reserved words.
        case 'class':
        case 'enum':
        case 'export':
        case 'extends':
        case 'import':
        case 'super':
            return true;
        }

        return false;
    }

    function isStrictModeReservedWord(id) {
        switch (id) {

        // Strict Mode reserved words.
        case 'implements':
        case 'interface':
        case 'package':
        case 'private':
        case 'protected':
        case 'public':
        case 'static':
        case 'yield':
        case 'let':
            return true;
        }

        return false;
    }

    function isRestrictedWord(id) {
        return id === 'eval' || id === 'arguments';
    }

    // 7.6.1.1 Keywords

    function isKeyword(id) {
        var keyword = false;
        switch (id.length) {
        case 2:
            keyword = (id === 'if') || (id === 'in') || (id === 'do');
            break;
        case 3:
            keyword = (id === 'var') || (id === 'for') || (id === 'new') || (id === 'try');
            break;
        case 4:
            keyword = (id === 'this') || (id === 'else') || (id === 'case') || (id === 'void') || (id === 'with');
            break;
        case 5:
            keyword = (id === 'while') || (id === 'break') || (id === 'catch') || (id === 'throw');
            break;
        case 6:
            keyword = (id === 'return') || (id === 'typeof') || (id === 'delete') || (id === 'switch');
            break;
        case 7:
            keyword = (id === 'default') || (id === 'finally');
            break;
        case 8:
            keyword = (id === 'function') || (id === 'continue') || (id === 'debugger');
            break;
        case 10:
            keyword = (id === 'instanceof');
            break;
        }

        if (keyword) {
            return true;
        }

        switch (id) {
        // Future reserved words.
        // 'const' is specialized as Keyword in V8.
        case 'const':
            return true;

        // For compatiblity to SpiderMonkey and ES.next
        case 'yield':
        case 'let':
            return true;
        }

        if (strict && isStrictModeReservedWord(id)) {
            return true;
        }

        return isFutureReservedWord(id);
    }

    // 7.4 Comments

    function skipComment() {
        var ch, blockComment, lineComment;

        blockComment = false;
        lineComment = false;

        while (index < length) {
            ch = source[index];

            if (lineComment) {
                ch = source[index++];
                if (isLineTerminator(ch)) {
                    lineComment = false;
                    if (ch === '\r' && source[index] === '\n') {
                        ++index;
                    }
                    ++lineNumber;
                    lineStart = index;
                }
            } else if (blockComment) {
                if (isLineTerminator(ch)) {
                    if (ch === '\r' && source[index + 1] === '\n') {
                        ++index;
                    }
                    ++lineNumber;
                    ++index;
                    lineStart = index;
                    if (index >= length) {
                        throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
                    }
                } else {
                    ch = source[index++];
                    if (index >= length) {
                        throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
                    }
                    if (ch === '*') {
                        ch = source[index];
                        if (ch === '/') {
                            ++index;
                            blockComment = false;
                        }
                    }
                }
            } else if (ch === '/') {
                ch = source[index + 1];
                if (ch === '/') {
                    index += 2;
                    lineComment = true;
                } else if (ch === '*') {
                    index += 2;
                    blockComment = true;
                    if (index >= length) {
                        throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
                    }
                } else {
                    break;
                }
            } else if (isWhiteSpace(ch)) {
                ++index;
            } else if (isLineTerminator(ch)) {
                ++index;
                if (ch ===  '\r' && source[index] === '\n') {
                    ++index;
                }
                ++lineNumber;
                lineStart = index;
            } else {
                break;
            }
        }
    }

    function scanHexEscape(prefix) {
        var i, len, ch, code = 0;

        len = (prefix === 'u') ? 4 : 2;
        for (i = 0; i < len; ++i) {
            if (index < length && isHexDigit(source[index])) {
                ch = source[index++];
                code = code * 16 + '0123456789abcdef'.indexOf(ch.toLowerCase());
            } else {
                return '';
            }
        }
        return String.fromCharCode(code);
    }

    function scanIdentifier() {
        var ch, start, id, restore;

        ch = source[index];
        if (!isIdentifierStart(ch)) {
            return;
        }

        start = index;
        if (ch === '\\') {
            ++index;
            if (source[index] !== 'u') {
                return;
            }
            ++index;
            restore = index;
            ch = scanHexEscape('u');
            if (ch) {
                if (ch === '\\' || !isIdentifierStart(ch)) {
                    return;
                }
                id = ch;
            } else {
                index = restore;
                id = 'u';
            }
        } else {
            id = source[index++];
        }

        while (index < length) {
            ch = source[index];
            if (!isIdentifierPart(ch)) {
                break;
            }
            if (ch === '\\') {
                ++index;
                if (source[index] !== 'u') {
                    return;
                }
                ++index;
                restore = index;
                ch = scanHexEscape('u');
                if (ch) {
                    if (ch === '\\' || !isIdentifierPart(ch)) {
                        return;
                    }
                    id += ch;
                } else {
                    index = restore;
                    id += 'u';
                }
            } else {
                id += source[index++];
            }
        }

        // There is no keyword or literal with only one character.
        // Thus, it must be an identifier.
        if (id.length === 1) {
            return {
                type: Token.Identifier,
                value: id,
                lineNumber: lineNumber,
                lineStart: lineStart,
                range: [start, index]
            };
        }

        if (isKeyword(id)) {
            return {
                type: Token.Keyword,
                value: id,
                lineNumber: lineNumber,
                lineStart: lineStart,
                range: [start, index]
            };
        }

        // 7.8.1 Null Literals

        if (id === 'null') {
            return {
                type: Token.NullLiteral,
                value: id,
                lineNumber: lineNumber,
                lineStart: lineStart,
                range: [start, index]
            };
        }

        // 7.8.2 Boolean Literals

        if (id === 'true' || id === 'false') {
            return {
                type: Token.BooleanLiteral,
                value: id,
                lineNumber: lineNumber,
                lineStart: lineStart,
                range: [start, index]
            };
        }

        return {
            type: Token.Identifier,
            value: id,
            lineNumber: lineNumber,
            lineStart: lineStart,
            range: [start, index]
        };
    }

    // 7.7 Punctuators

    function scanPunctuator() {
        var start = index,
            ch1 = source[index],
            ch2,
            ch3,
            ch4;

        // Check for most common single-character punctuators.

        if (ch1 === ';' || ch1 === '{' || ch1 === '}') {
            ++index;
            return {
                type: Token.Punctuator,
                value: ch1,
                lineNumber: lineNumber,
                lineStart: lineStart,
                range: [start, index]
            };
        }

        if (ch1 === ',' || ch1 === '(' || ch1 === ')') {
            ++index;
            return {
                type: Token.Punctuator,
                value: ch1,
                lineNumber: lineNumber,
                lineStart: lineStart,
                range: [start, index]
            };
        }

        // Dot (.) can also start a floating-point number, hence the need
        // to check the next character.

        ch2 = source[index + 1];
        if (ch1 === '.' && !isDecimalDigit(ch2)) {
            return {
                type: Token.Punctuator,
                value: source[index++],
                lineNumber: lineNumber,
                lineStart: lineStart,
                range: [start, index]
            };
        }

        // Peek more characters.

        ch3 = source[index + 2];
        ch4 = source[index + 3];

        // 4-character punctuator: >>>=

        if (ch1 === '>' && ch2 === '>' && ch3 === '>') {
            if (ch4 === '=') {
                index += 4;
                return {
                    type: Token.Punctuator,
                    value: '>>>=',
                    lineNumber: lineNumber,
                    lineStart: lineStart,
                    range: [start, index]
                };
            }
        }

        // 3-character punctuators: === !== >>> <<= >>=

        if (ch1 === '=' && ch2 === '=' && ch3 === '=') {
            index += 3;
            return {
                type: Token.Punctuator,
                value: '===',
                lineNumber: lineNumber,
                lineStart: lineStart,
                range: [start, index]
            };
        }

        if (ch1 === '!' && ch2 === '=' && ch3 === '=') {
            index += 3;
            return {
                type: Token.Punctuator,
                value: '!==',
                lineNumber: lineNumber,
                lineStart: lineStart,
                range: [start, index]
            };
        }

        if (ch1 === '>' && ch2 === '>' && ch3 === '>') {
            index += 3;
            return {
                type: Token.Punctuator,
                value: '>>>',
                lineNumber: lineNumber,
                lineStart: lineStart,
                range: [start, index]
            };
        }

        if (ch1 === '<' && ch2 === '<' && ch3 === '=') {
            index += 3;
            return {
                type: Token.Punctuator,
                value: '<<=',
                lineNumber: lineNumber,
                lineStart: lineStart,
                range: [start, index]
            };
        }

        if (ch1 === '>' && ch2 === '>' && ch3 === '=') {
            index += 3;
            return {
                type: Token.Punctuator,
                value: '>>=',
                lineNumber: lineNumber,
                lineStart: lineStart,
                range: [start, index]
            };
        }

        // 2-character punctuators: <= >= == != ++ -- << >> && ||
        // += -= *= %= &= |= ^= /=

        if (ch2 === '=') {
            if ('<>=!+-*%&|^/'.indexOf(ch1) >= 0) {
                index += 2;
                return {
                    type: Token.Punctuator,
                    value: ch1 + ch2,
                    lineNumber: lineNumber,
                    lineStart: lineStart,
                    range: [start, index]
                };
            }
        }

        if (ch1 === ch2 && ('+-<>&|'.indexOf(ch1) >= 0)) {
            if ('+-<>&|'.indexOf(ch2) >= 0) {
                index += 2;
                return {
                    type: Token.Punctuator,
                    value: ch1 + ch2,
                    lineNumber: lineNumber,
                    lineStart: lineStart,
                    range: [start, index]
                };
            }
        }

        // The remaining 1-character punctuators.

        if ('[]<>+-*%&|^!~?:=/'.indexOf(ch1) >= 0) {
            return {
                type: Token.Punctuator,
                value: source[index++],
                lineNumber: lineNumber,
                lineStart: lineStart,
                range: [start, index]
            };
        }
    }

    // 7.8.3 Numeric Literals

    function scanNumericLiteral() {
        var number, start, ch;

        ch = source[index];
        assert(isDecimalDigit(ch) || (ch === '.'),
            'Numeric literal must start with a decimal digit or a decimal point');

        start = index;
        number = '';
        if (ch !== '.') {
            number = source[index++];
            ch = source[index];

            // Hex number starts with '0x'.
            // Octal number starts with '0'.
            if (number === '0') {
                if (ch === 'x' || ch === 'X') {
                    number += source[index++];
                    while (index < length) {
                        ch = source[index];
                        if (!isHexDigit(ch)) {
                            break;
                        }
                        number += source[index++];
                    }

                    if (number.length <= 2) {
                        // only 0x
                        throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
                    }

                    if (index < length) {
                        ch = source[index];
                        if (isIdentifierStart(ch)) {
                            throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
                        }
                    }
                    return {
                        type: Token.NumericLiteral,
                        value: parseInt(number, 16),
                        lineNumber: lineNumber,
                        lineStart: lineStart,
                        range: [start, index]
                    };
                } else if (isOctalDigit(ch)) {
                    number += source[index++];
                    while (index < length) {
                        ch = source[index];
                        if (!isOctalDigit(ch)) {
                            break;
                        }
                        number += source[index++];
                    }

                    if (index < length) {
                        ch = source[index];
                        if (isIdentifierStart(ch) || isDecimalDigit(ch)) {
                            throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
                        }
                    }
                    return {
                        type: Token.NumericLiteral,
                        value: parseInt(number, 8),
                        octal: true,
                        lineNumber: lineNumber,
                        lineStart: lineStart,
                        range: [start, index]
                    };
                }

                // decimal number starts with '0' such as '09' is illegal.
                if (isDecimalDigit(ch)) {
                    throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
                }
            }

            while (index < length) {
                ch = source[index];
                if (!isDecimalDigit(ch)) {
                    break;
                }
                number += source[index++];
            }
        }

        if (ch === '.') {
            number += source[index++];
            while (index < length) {
                ch = source[index];
                if (!isDecimalDigit(ch)) {
                    break;
                }
                number += source[index++];
            }
        }

        if (ch === 'e' || ch === 'E') {
            number += source[index++];

            ch = source[index];
            if (ch === '+' || ch === '-') {
                number += source[index++];
            }

            ch = source[index];
            if (isDecimalDigit(ch)) {
                number += source[index++];
                while (index < length) {
                    ch = source[index];
                    if (!isDecimalDigit(ch)) {
                        break;
                    }
                    number += source[index++];
                }
            } else {
                ch = 'character ' + ch;
                if (index >= length) {
                    ch = '<end>';
                }
                throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
            }
        }

        if (index < length) {
            ch = source[index];
            if (isIdentifierStart(ch)) {
                throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
            }
        }

        return {
            type: Token.NumericLiteral,
            value: parseFloat(number),
            lineNumber: lineNumber,
            lineStart: lineStart,
            range: [start, index]
        };
    }

    // 7.8.4 String Literals

    function scanStringLiteral() {
        var str = '', quote, start, ch, code, unescaped, restore, octal = false;

        quote = source[index];
        assert((quote === '\'' || quote === '"'),
            'String literal must starts with a quote');

        start = index;
        ++index;

        while (index < length) {
            ch = source[index++];

            if (ch === quote) {
                quote = '';
                break;
            } else if (ch === '\\') {
                ch = source[index++];
                if (!isLineTerminator(ch)) {
                    switch (ch) {
                    case 'n':
                        str += '\n';
                        break;
                    case 'r':
                        str += '\r';
                        break;
                    case 't':
                        str += '\t';
                        break;
                    case 'u':
                    case 'x':
                        restore = index;
                        unescaped = scanHexEscape(ch);
                        if (unescaped) {
                            str += unescaped;
                        } else {
                            index = restore;
                            str += ch;
                        }
                        break;
                    case 'b':
                        str += '\b';
                        break;
                    case 'f':
                        str += '\f';
                        break;
                    case 'v':
                        str += '\x0B';
                        break;

                    default:
                        if (isOctalDigit(ch)) {
                            code = '01234567'.indexOf(ch);

                            // \0 is not octal escape sequence
                            if (code !== 0) {
                                octal = true;
                            }

                            if (index < length && isOctalDigit(source[index])) {
                                octal = true;
                                code = code * 8 + '01234567'.indexOf(source[index++]);

                                // 3 digits are only allowed when string starts
                                // with 0, 1, 2, 3
                                if ('0123'.indexOf(ch) >= 0 &&
                                        index < length &&
                                        isOctalDigit(source[index])) {
                                    code = code * 8 + '01234567'.indexOf(source[index++]);
                                }
                            }
                            str += String.fromCharCode(code);
                        } else {
                            str += ch;
                        }
                        break;
                    }
                } else {
                    ++lineNumber;
                    if (ch ===  '\r' && source[index] === '\n') {
                        ++index;
                    }
                }
            } else if (isLineTerminator(ch)) {
                break;
            } else {
                str += ch;
            }
        }

        if (quote !== '') {
            throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
        }

        return {
            type: Token.StringLiteral,
            value: str,
            octal: octal,
            lineNumber: lineNumber,
            lineStart: lineStart,
            range: [start, index]
        };
    }

    function scanRegExp() {
        var str, ch, start, pattern, flags, value, classMarker = false, restore, terminated = false;

        buffer = null;
        skipComment();

        start = index;
        ch = source[index];
        assert(ch === '/', 'Regular expression literal must start with a slash');
        str = source[index++];

        while (index < length) {
            ch = source[index++];
            str += ch;
            if (classMarker) {
                if (ch === ']') {
                    classMarker = false;
                }
            } else {
                if (ch === '\\') {
                    ch = source[index++];
                    // ECMA-262 7.8.5
                    if (isLineTerminator(ch)) {
                        throwError({}, Messages.UnterminatedRegExp);
                    }
                    str += ch;
                } else if (ch === '/') {
                    terminated = true;
                    break;
                } else if (ch === '[') {
                    classMarker = true;
                } else if (isLineTerminator(ch)) {
                    throwError({}, Messages.UnterminatedRegExp);
                }
            }
        }

        if (!terminated) {
            throwError({}, Messages.UnterminatedRegExp);
        }

        // Exclude leading and trailing slash.
        pattern = str.substr(1, str.length - 2);

        flags = '';
        while (index < length) {
            ch = source[index];
            if (!isIdentifierPart(ch)) {
                break;
            }

            ++index;
            if (ch === '\\' && index < length) {
                ch = source[index];
                if (ch === 'u') {
                    ++index;
                    restore = index;
                    ch = scanHexEscape('u');
                    if (ch) {
                        flags += ch;
                        str += '\\u';
                        for (; restore < index; ++restore) {
                            str += source[restore];
                        }
                    } else {
                        index = restore;
                        flags += 'u';
                        str += '\\u';
                    }
                } else {
                    str += '\\';
                }
            } else {
                flags += ch;
                str += ch;
            }
        }

        try {
            value = new RegExp(pattern, flags);
        } catch (e) {
            throwError({}, Messages.InvalidRegExp);
        }

        return {
            literal: str,
            value: value,
            range: [start, index]
        };
    }

    function isIdentifierName(token) {
        return token.type === Token.Identifier ||
            token.type === Token.Keyword ||
            token.type === Token.BooleanLiteral ||
            token.type === Token.NullLiteral;
    }

    function advance() {
        var ch, token;

        skipComment();

        if (index >= length) {
            return {
                type: Token.EOF,
                lineNumber: lineNumber,
                lineStart: lineStart,
                range: [index, index]
            };
        }

        token = scanPunctuator();
        if (typeof token !== 'undefined') {
            return token;
        }

        ch = source[index];

        if (ch === '\'' || ch === '"') {
            return scanStringLiteral();
        }

        if (ch === '.' || isDecimalDigit(ch)) {
            return scanNumericLiteral();
        }

        token = scanIdentifier();
        if (typeof token !== 'undefined') {
            return token;
        }

        throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
    }

    function lex() {
        var token;

        if (buffer) {
            index = buffer.range[1];
            lineNumber = buffer.lineNumber;
            lineStart = buffer.lineStart;
            token = buffer;
            buffer = null;
            return token;
        }

        buffer = null;
        return advance();
    }

    function lookahead() {
        var pos, line, start;

        if (buffer !== null) {
            return buffer;
        }

        pos = index;
        line = lineNumber;
        start = lineStart;
        buffer = advance();
        index = pos;
        lineNumber = line;
        lineStart = start;

        return buffer;
    }

    // Return true if there is a line terminator before the next token.

    function peekLineTerminator() {
        var pos, line, start, found;

        pos = index;
        line = lineNumber;
        start = lineStart;
        skipComment();
        found = lineNumber !== line;
        index = pos;
        lineNumber = line;
        lineStart = start;

        return found;
    }

    // Throw an exception

    function throwError(token, messageFormat) {
        var error,
            args = Array.prototype.slice.call(arguments, 2),
            msg = messageFormat.replace(
                /%(\d)/g,
                function (whole, index) {
                    return args[index] || '';
                }
            );

        if (typeof token.lineNumber === 'number') {
            error = new Error('Line ' + token.lineNumber + ': ' + msg);
            error.index = token.range[0];
            error.lineNumber = token.lineNumber;
            error.column = token.range[0] - lineStart + 1;
        } else {
            error = new Error('Line ' + lineNumber + ': ' + msg);
            error.index = index;
            error.lineNumber = lineNumber;
            error.column = index - lineStart + 1;
        }

        throw error;
    }

    function throwErrorTolerant() {
        try {
            throwError.apply(null, arguments);
        } catch (e) {
            if (extra.errors) {
                extra.errors.push(e);
            } else {
                throw e;
            }
        }
    }


    // Throw an exception because of the token.

    function throwUnexpected(token) {
        if (token.type === Token.EOF) {
            throwError(token, Messages.UnexpectedEOS);
        }

        if (token.type === Token.NumericLiteral) {
            throwError(token, Messages.UnexpectedNumber);
        }

        if (token.type === Token.StringLiteral) {
            throwError(token, Messages.UnexpectedString);
        }

        if (token.type === Token.Identifier) {
            throwError(token, Messages.UnexpectedIdentifier);
        }

        if (token.type === Token.Keyword) {
            if (isFutureReservedWord(token.value)) {
                throwError(token, Messages.UnexpectedReserved);
            } else if (strict && isStrictModeReservedWord(token.value)) {
                throwErrorTolerant(token, Messages.StrictReservedWord);
                return;
            }
            throwError(token, Messages.UnexpectedToken, token.value);
        }

        // BooleanLiteral, NullLiteral, or Punctuator.
        throwError(token, Messages.UnexpectedToken, token.value);
    }

    // Expect the next token to match the specified punctuator.
    // If not, an exception will be thrown.

    function expect(value) {
        var token = lex();
        if (token.type !== Token.Punctuator || token.value !== value) {
            throwUnexpected(token);
        }
    }

    // Expect the next token to match the specified keyword.
    // If not, an exception will be thrown.

    function expectKeyword(keyword) {
        var token = lex();
        if (token.type !== Token.Keyword || token.value !== keyword) {
            throwUnexpected(token);
        }
    }

    // Return true if the next token matches the specified punctuator.

    function match(value) {
        var token = lookahead();
        return token.type === Token.Punctuator && token.value === value;
    }

    // Return true if the next token matches the specified keyword

    function matchKeyword(keyword) {
        var token = lookahead();
        return token.type === Token.Keyword && token.value === keyword;
    }

    // Return true if the next token is an assignment operator

    function matchAssign() {
        var token = lookahead(),
            op = token.value;

        if (token.type !== Token.Punctuator) {
            return false;
        }
        return op === '=' ||
            op === '*=' ||
            op === '/=' ||
            op === '%=' ||
            op === '+=' ||
            op === '-=' ||
            op === '<<=' ||
            op === '>>=' ||
            op === '>>>=' ||
            op === '&=' ||
            op === '^=' ||
            op === '|=';
    }

    function consumeSemicolon() {
        var token, line;

        // Catch the very common case first.
        if (source[index] === ';') {
            lex();
            return;
        }

        line = lineNumber;
        skipComment();
        if (lineNumber !== line) {
            return;
        }

        if (match(';')) {
            lex();
            return;
        }

        token = lookahead();
        if (token.type !== Token.EOF && !match('}')) {
            throwUnexpected(token);
        }
    }

    // Return true if provided expression is LeftHandSideExpression

    function isLeftHandSide(expr) {
        return expr.type === Syntax.Identifier || expr.type === Syntax.MemberExpression;
    }

    // 11.1.4 Array Initialiser

    function parseArrayInitialiser() {
        var elements = [];

        expect('[');

        while (!match(']')) {
            if (match(',')) {
                lex();
                elements.push(null);
            } else {
                elements.push(parseAssignmentExpression());

                if (!match(']')) {
                    expect(',');
                }
            }
        }

        expect(']');

        return {
            type: Syntax.ArrayExpression,
            elements: elements
        };
    }

    // 11.1.5 Object Initialiser

    function parsePropertyFunction(param, first) {
        var previousStrict, body;

        previousStrict = strict;
        body = parseFunctionSourceElements();
        if (first && strict && isRestrictedWord(param[0].name)) {
            throwErrorTolerant(first, Messages.StrictParamName);
        }
        strict = previousStrict;

        return {
            type: Syntax.FunctionExpression,
            id: null,
            params: param,
            defaults: [],
            body: body,
            rest: null,
            generator: false,
            expression: false
        };
    }

    function parseObjectPropertyKey() {
        var token = lex();

        // Note: This function is called only from parseObjectProperty(), where
        // EOF and Punctuator tokens are already filtered out.

        if (token.type === Token.StringLiteral || token.type === Token.NumericLiteral) {
            if (strict && token.octal) {
                throwErrorTolerant(token, Messages.StrictOctalLiteral);
            }
            return createLiteral(token);
        }

        return {
            type: Syntax.Identifier,
            name: token.value
        };
    }

    function parseObjectProperty() {
        var token, key, id, param;

        token = lookahead();

        if (token.type === Token.Identifier) {

            id = parseObjectPropertyKey();

            // Property Assignment: Getter and Setter.

            if (token.value === 'get' && !match(':')) {
                key = parseObjectPropertyKey();
                expect('(');
                expect(')');
                return {
                    type: Syntax.Property,
                    key: key,
                    value: parsePropertyFunction([]),
                    kind: 'get'
                };
            } else if (token.value === 'set' && !match(':')) {
                key = parseObjectPropertyKey();
                expect('(');
                token = lookahead();
                if (token.type !== Token.Identifier) {
                    expect(')');
                    throwErrorTolerant(token, Messages.UnexpectedToken, token.value);
                    return {
                        type: Syntax.Property,
                        key: key,
                        value: parsePropertyFunction([]),
                        kind: 'set'
                    };
                } else {
                    param = [ parseVariableIdentifier() ];
                    expect(')');
                    return {
                        type: Syntax.Property,
                        key: key,
                        value: parsePropertyFunction(param, token),
                        kind: 'set'
                    };
                }
            } else {
                expect(':');
                return {
                    type: Syntax.Property,
                    key: id,
                    value: parseAssignmentExpression(),
                    kind: 'init'
                };
            }
        } else if (token.type === Token.EOF || token.type === Token.Punctuator) {
            throwUnexpected(token);
        } else {
            key = parseObjectPropertyKey();
            expect(':');
            return {
                type: Syntax.Property,
                key: key,
                value: parseAssignmentExpression(),
                kind: 'init'
            };
        }
    }

    function parseObjectInitialiser() {
        var properties = [], property, name, kind, map = {}, toString = String;

        expect('{');

        while (!match('}')) {
            property = parseObjectProperty();

            if (property.key.type === Syntax.Identifier) {
                name = property.key.name;
            } else {
                name = toString(property.key.value);
            }
            kind = (property.kind === 'init') ? PropertyKind.Data : (property.kind === 'get') ? PropertyKind.Get : PropertyKind.Set;
            if (Object.prototype.hasOwnProperty.call(map, name)) {
                if (map[name] === PropertyKind.Data) {
                    if (strict && kind === PropertyKind.Data) {
                        throwErrorTolerant({}, Messages.StrictDuplicateProperty);
                    } else if (kind !== PropertyKind.Data) {
                        throwErrorTolerant({}, Messages.AccessorDataProperty);
                    }
                } else {
                    if (kind === PropertyKind.Data) {
                        throwErrorTolerant({}, Messages.AccessorDataProperty);
                    } else if (map[name] & kind) {
                        throwErrorTolerant({}, Messages.AccessorGetSet);
                    }
                }
                map[name] |= kind;
            } else {
                map[name] = kind;
            }

            properties.push(property);

            if (!match('}')) {
                expect(',');
            }
        }

        expect('}');

        return {
            type: Syntax.ObjectExpression,
            properties: properties
        };
    }

    // 11.1.6 The Grouping Operator

    function parseGroupExpression() {
        var expr;

        expect('(');

        expr = parseExpression();

        expect(')');

        return expr;
    }


    // 11.1 Primary Expressions

    function parsePrimaryExpression() {
        var token = lookahead(),
            type = token.type;

        if (type === Token.Identifier) {
            return {
                type: Syntax.Identifier,
                name: lex().value
            };
        }

        if (type === Token.StringLiteral || type === Token.NumericLiteral) {
            if (strict && token.octal) {
                throwErrorTolerant(token, Messages.StrictOctalLiteral);
            }
            return createLiteral(lex());
        }

        if (type === Token.Keyword) {
            if (matchKeyword('this')) {
                lex();
                return {
                    type: Syntax.ThisExpression
                };
            }

            if (matchKeyword('function')) {
                return parseFunctionExpression();
            }
        }

        if (type === Token.BooleanLiteral) {
            lex();
            token.value = (token.value === 'true');
            return createLiteral(token);
        }

        if (type === Token.NullLiteral) {
            lex();
            token.value = null;
            return createLiteral(token);
        }

        if (match('[')) {
            return parseArrayInitialiser();
        }

        if (match('{')) {
            return parseObjectInitialiser();
        }

        if (match('(')) {
            return parseGroupExpression();
        }

        if (match('/') || match('/=')) {
            return createLiteral(scanRegExp());
        }

        return throwUnexpected(lex());
    }

    // 11.2 Left-Hand-Side Expressions

    function parseArguments() {
        var args = [];

        expect('(');

        if (!match(')')) {
            while (index < length) {
                args.push(parseAssignmentExpression());
                if (match(')')) {
                    break;
                }
                expect(',');
            }
        }

        expect(')');

        return args;
    }

    function parseNonComputedProperty() {
        var token = lex();

        if (!isIdentifierName(token)) {
            throwUnexpected(token);
        }

        return {
            type: Syntax.Identifier,
            name: token.value
        };
    }

    function parseNonComputedMember() {
        expect('.');

        return parseNonComputedProperty();
    }

    function parseComputedMember() {
        var expr;

        expect('[');

        expr = parseExpression();

        expect(']');

        return expr;
    }

    function parseNewExpression() {
        var expr;

        expectKeyword('new');

        expr = {
            type: Syntax.NewExpression,
            callee: parseLeftHandSideExpression(),
            'arguments': []
        };

        if (match('(')) {
            expr['arguments'] = parseArguments();
        }

        return expr;
    }

    function parseLeftHandSideExpressionAllowCall() {
        var expr;

        expr = matchKeyword('new') ? parseNewExpression() : parsePrimaryExpression();

        while (match('.') || match('[') || match('(')) {
            if (match('(')) {
                expr = {
                    type: Syntax.CallExpression,
                    callee: expr,
                    'arguments': parseArguments()
                };
            } else if (match('[')) {
                expr = {
                    type: Syntax.MemberExpression,
                    computed: true,
                    object: expr,
                    property: parseComputedMember()
                };
            } else {
                expr = {
                    type: Syntax.MemberExpression,
                    computed: false,
                    object: expr,
                    property: parseNonComputedMember()
                };
            }
        }

        return expr;
    }


    function parseLeftHandSideExpression() {
        var expr;

        expr = matchKeyword('new') ? parseNewExpression() : parsePrimaryExpression();

        while (match('.') || match('[')) {
            if (match('[')) {
                expr = {
                    type: Syntax.MemberExpression,
                    computed: true,
                    object: expr,
                    property: parseComputedMember()
                };
            } else {
                expr = {
                    type: Syntax.MemberExpression,
                    computed: false,
                    object: expr,
                    property: parseNonComputedMember()
                };
            }
        }

        return expr;
    }

    // 11.3 Postfix Expressions

    function parsePostfixExpression() {
        var expr = parseLeftHandSideExpressionAllowCall(), token;

        token = lookahead();
        if (token.type !== Token.Punctuator) {
            return expr;
        }

        if ((match('++') || match('--')) && !peekLineTerminator()) {
            // 11.3.1, 11.3.2
            if (strict && expr.type === Syntax.Identifier && isRestrictedWord(expr.name)) {
                throwErrorTolerant({}, Messages.StrictLHSPostfix);
            }

            if (!isLeftHandSide(expr)) {
                throwError({}, Messages.InvalidLHSInAssignment);
            }

            expr = {
                type: Syntax.UpdateExpression,
                operator: lex().value,
                argument: expr,
                prefix: false
            };
        }

        return expr;
    }

    // 11.4 Unary Operators

    function parseUnaryExpression() {
        var token, expr;

        token = lookahead();
        if (token.type !== Token.Punctuator && token.type !== Token.Keyword) {
            return parsePostfixExpression();
        }

        if (match('++') || match('--')) {
            token = lex();
            expr = parseUnaryExpression();
            // 11.4.4, 11.4.5
            if (strict && expr.type === Syntax.Identifier && isRestrictedWord(expr.name)) {
                throwErrorTolerant({}, Messages.StrictLHSPrefix);
            }

            if (!isLeftHandSide(expr)) {
                throwError({}, Messages.InvalidLHSInAssignment);
            }

            expr = {
                type: Syntax.UpdateExpression,
                operator: token.value,
                argument: expr,
                prefix: true
            };
            return expr;
        }

        if (match('+') || match('-') || match('~') || match('!')) {
            expr = {
                type: Syntax.UnaryExpression,
                operator: lex().value,
                argument: parseUnaryExpression(),
                prefix: true
            };
            return expr;
        }

        if (matchKeyword('delete') || matchKeyword('void') || matchKeyword('typeof')) {
            expr = {
                type: Syntax.UnaryExpression,
                operator: lex().value,
                argument: parseUnaryExpression(),
                prefix: true
            };
            if (strict && expr.operator === 'delete' && expr.argument.type === Syntax.Identifier) {
                throwErrorTolerant({}, Messages.StrictDelete);
            }
            return expr;
        }

        return parsePostfixExpression();
    }

    // 11.5 Multiplicative Operators

    function parseMultiplicativeExpression() {
        var expr = parseUnaryExpression();

        while (match('*') || match('/') || match('%')) {
            expr = {
                type: Syntax.BinaryExpression,
                operator: lex().value,
                left: expr,
                right: parseUnaryExpression()
            };
        }

        return expr;
    }

    // 11.6 Additive Operators

    function parseAdditiveExpression() {
        var expr = parseMultiplicativeExpression();

        while (match('+') || match('-')) {
            expr = {
                type: Syntax.BinaryExpression,
                operator: lex().value,
                left: expr,
                right: parseMultiplicativeExpression()
            };
        }

        return expr;
    }

    // 11.7 Bitwise Shift Operators

    function parseShiftExpression() {
        var expr = parseAdditiveExpression();

        while (match('<<') || match('>>') || match('>>>')) {
            expr = {
                type: Syntax.BinaryExpression,
                operator: lex().value,
                left: expr,
                right: parseAdditiveExpression()
            };
        }

        return expr;
    }
    // 11.8 Relational Operators

    function parseRelationalExpression() {
        var expr, previousAllowIn;

        previousAllowIn = state.allowIn;
        state.allowIn = true;

        expr = parseShiftExpression();

        while (match('<') || match('>') || match('<=') || match('>=') || (previousAllowIn && matchKeyword('in')) || matchKeyword('instanceof')) {
            expr = {
                type: Syntax.BinaryExpression,
                operator: lex().value,
                left: expr,
                right: parseShiftExpression()
            };
        }

        state.allowIn = previousAllowIn;
        return expr;
    }

    // 11.9 Equality Operators

    function parseEqualityExpression() {
        var expr = parseRelationalExpression();

        while (match('==') || match('!=') || match('===') || match('!==')) {
            expr = {
                type: Syntax.BinaryExpression,
                operator: lex().value,
                left: expr,
                right: parseRelationalExpression()
            };
        }

        return expr;
    }

    // 11.10 Binary Bitwise Operators

    function parseBitwiseANDExpression() {
        var expr = parseEqualityExpression();

        while (match('&')) {
            lex();
            expr = {
                type: Syntax.BinaryExpression,
                operator: '&',
                left: expr,
                right: parseEqualityExpression()
            };
        }

        return expr;
    }

    function parseBitwiseXORExpression() {
        var expr = parseBitwiseANDExpression();

        while (match('^')) {
            lex();
            expr = {
                type: Syntax.BinaryExpression,
                operator: '^',
                left: expr,
                right: parseBitwiseANDExpression()
            };
        }

        return expr;
    }

    function parseBitwiseORExpression() {
        var expr = parseBitwiseXORExpression();

        while (match('|')) {
            lex();
            expr = {
                type: Syntax.BinaryExpression,
                operator: '|',
                left: expr,
                right: parseBitwiseXORExpression()
            };
        }

        return expr;
    }

    // 11.11 Binary Logical Operators

    function parseLogicalANDExpression() {
        var expr = parseBitwiseORExpression();

        while (match('&&')) {
            lex();
            expr = {
                type: Syntax.LogicalExpression,
                operator: '&&',
                left: expr,
                right: parseBitwiseORExpression()
            };
        }

        return expr;
    }

    function parseLogicalORExpression() {
        var expr = parseLogicalANDExpression();

        while (match('||')) {
            lex();
            expr = {
                type: Syntax.LogicalExpression,
                operator: '||',
                left: expr,
                right: parseLogicalANDExpression()
            };
        }

        return expr;
    }

    // 11.12 Conditional Operator

    function parseConditionalExpression() {
        var expr, previousAllowIn, consequent;

        expr = parseLogicalORExpression();

        if (match('?')) {
            lex();
            previousAllowIn = state.allowIn;
            state.allowIn = true;
            consequent = parseAssignmentExpression();
            state.allowIn = previousAllowIn;
            expect(':');

            expr = {
                type: Syntax.ConditionalExpression,
                test: expr,
                consequent: consequent,
                alternate: parseAssignmentExpression()
            };
        }

        return expr;
    }

    // 11.13 Assignment Operators

    function parseAssignmentExpression() {
        var token, expr;

        token = lookahead();
        expr = parseConditionalExpression();

        if (matchAssign()) {
            // LeftHandSideExpression
            if (!isLeftHandSide(expr)) {
                throwError({}, Messages.InvalidLHSInAssignment);
            }

            // 11.13.1
            if (strict && expr.type === Syntax.Identifier && isRestrictedWord(expr.name)) {
                throwErrorTolerant(token, Messages.StrictLHSAssignment);
            }

            expr = {
                type: Syntax.AssignmentExpression,
                operator: lex().value,
                left: expr,
                right: parseAssignmentExpression()
            };
        }

        return expr;
    }

    // 11.14 Comma Operator

    function parseExpression() {
        var expr = parseAssignmentExpression();

        if (match(',')) {
            expr = {
                type: Syntax.SequenceExpression,
                expressions: [ expr ]
            };

            while (index < length) {
                if (!match(',')) {
                    break;
                }
                lex();
                expr.expressions.push(parseAssignmentExpression());
            }

        }
        return expr;
    }

    // 12.1 Block

    function parseStatementList() {
        var list = [],
            statement;

        while (index < length) {
            if (match('}')) {
                break;
            }
            statement = parseSourceElement();
            if (typeof statement === 'undefined') {
                break;
            }
            list.push(statement);
        }

        return list;
    }

    function parseBlock() {
        var block;

        expect('{');

        block = parseStatementList();

        expect('}');

        return {
            type: Syntax.BlockStatement,
            body: block
        };
    }

    // 12.2 Variable Statement

    function parseVariableIdentifier() {
        var token = lex();

        if (token.type !== Token.Identifier) {
            throwUnexpected(token);
        }

        return {
            type: Syntax.Identifier,
            name: token.value
        };
    }

    function parseVariableDeclaration(kind) {
        var id = parseVariableIdentifier(),
            init = null;

        // 12.2.1
        if (strict && isRestrictedWord(id.name)) {
            throwErrorTolerant({}, Messages.StrictVarName);
        }

        if (kind === 'const') {
            expect('=');
            init = parseAssignmentExpression();
        } else if (match('=')) {
            lex();
            init = parseAssignmentExpression();
        }

        return {
            type: Syntax.VariableDeclarator,
            id: id,
            init: init
        };
    }

    function parseVariableDeclarationList(kind) {
        var list = [];

        do {
            list.push(parseVariableDeclaration(kind));
            if (!match(',')) {
                break;
            }
            lex();
        } while (index < length);

        return list;
    }

    function parseVariableStatement() {
        var declarations;

        expectKeyword('var');

        declarations = parseVariableDeclarationList();

        consumeSemicolon();

        return {
            type: Syntax.VariableDeclaration,
            declarations: declarations,
            kind: 'var'
        };
    }

    // kind may be `const` or `let`
    // Both are experimental and not in the specification yet.
    // see http://wiki.ecmascript.org/doku.php?id=harmony:const
    // and http://wiki.ecmascript.org/doku.php?id=harmony:let
    function parseConstLetDeclaration(kind) {
        var declarations;

        expectKeyword(kind);

        declarations = parseVariableDeclarationList(kind);

        consumeSemicolon();

        return {
            type: Syntax.VariableDeclaration,
            declarations: declarations,
            kind: kind
        };
    }

    // 12.3 Empty Statement

    function parseEmptyStatement() {
        expect(';');

        return {
            type: Syntax.EmptyStatement
        };
    }

    // 12.4 Expression Statement

    function parseExpressionStatement() {
        var expr = parseExpression();

        consumeSemicolon();

        return {
            type: Syntax.ExpressionStatement,
            expression: expr
        };
    }

    // 12.5 If statement

    function parseIfStatement() {
        var test, consequent, alternate;

        expectKeyword('if');

        expect('(');

        test = parseExpression();

        expect(')');

        consequent = parseStatement();

        if (matchKeyword('else')) {
            lex();
            alternate = parseStatement();
        } else {
            alternate = null;
        }

        return {
            type: Syntax.IfStatement,
            test: test,
            consequent: consequent,
            alternate: alternate
        };
    }

    // 12.6 Iteration Statements

    function parseDoWhileStatement() {
        var body, test, oldInIteration;

        expectKeyword('do');

        oldInIteration = state.inIteration;
        state.inIteration = true;

        body = parseStatement();

        state.inIteration = oldInIteration;

        expectKeyword('while');

        expect('(');

        test = parseExpression();

        expect(')');

        if (match(';')) {
            lex();
        }

        return {
            type: Syntax.DoWhileStatement,
            body: body,
            test: test
        };
    }

    function parseWhileStatement() {
        var test, body, oldInIteration;

        expectKeyword('while');

        expect('(');

        test = parseExpression();

        expect(')');

        oldInIteration = state.inIteration;
        state.inIteration = true;

        body = parseStatement();

        state.inIteration = oldInIteration;

        return {
            type: Syntax.WhileStatement,
            test: test,
            body: body
        };
    }

    function parseForVariableDeclaration() {
        var token = lex();

        return {
            type: Syntax.VariableDeclaration,
            declarations: parseVariableDeclarationList(),
            kind: token.value
        };
    }

    function parseForStatement() {
        var init, test, update, left, right, body, oldInIteration;

        init = test = update = null;

        expectKeyword('for');

        expect('(');

        if (match(';')) {
            lex();
        } else {
            if (matchKeyword('var') || matchKeyword('let')) {
                state.allowIn = false;
                init = parseForVariableDeclaration();
                state.allowIn = true;

                if (init.declarations.length === 1 && matchKeyword('in')) {
                    lex();
                    left = init;
                    right = parseExpression();
                    init = null;
                }
            } else {
                state.allowIn = false;
                init = parseExpression();
                state.allowIn = true;

                if (matchKeyword('in')) {
                    // LeftHandSideExpression
                    if (!isLeftHandSide(init)) {
                        throwError({}, Messages.InvalidLHSInForIn);
                    }

                    lex();
                    left = init;
                    right = parseExpression();
                    init = null;
                }
            }

            if (typeof left === 'undefined') {
                expect(';');
            }
        }

        if (typeof left === 'undefined') {

            if (!match(';')) {
                test = parseExpression();
            }
            expect(';');

            if (!match(')')) {
                update = parseExpression();
            }
        }

        expect(')');

        oldInIteration = state.inIteration;
        state.inIteration = true;

        body = parseStatement();

        state.inIteration = oldInIteration;

        if (typeof left === 'undefined') {
            return {
                type: Syntax.ForStatement,
                init: init,
                test: test,
                update: update,
                body: body
            };
        }

        return {
            type: Syntax.ForInStatement,
            left: left,
            right: right,
            body: body,
            each: false
        };
    }

    // 12.7 The continue statement

    function parseContinueStatement() {
        var token, label = null;

        expectKeyword('continue');

        // Optimize the most common form: 'continue;'.
        if (source[index] === ';') {
            lex();

            if (!state.inIteration) {
                throwError({}, Messages.IllegalContinue);
            }

            return {
                type: Syntax.ContinueStatement,
                label: null
            };
        }

        if (peekLineTerminator()) {
            if (!state.inIteration) {
                throwError({}, Messages.IllegalContinue);
            }

            return {
                type: Syntax.ContinueStatement,
                label: null
            };
        }

        token = lookahead();
        if (token.type === Token.Identifier) {
            label = parseVariableIdentifier();

            if (!Object.prototype.hasOwnProperty.call(state.labelSet, label.name)) {
                throwError({}, Messages.UnknownLabel, label.name);
            }
        }

        consumeSemicolon();

        if (label === null && !state.inIteration) {
            throwError({}, Messages.IllegalContinue);
        }

        return {
            type: Syntax.ContinueStatement,
            label: label
        };
    }

    // 12.8 The break statement

    function parseBreakStatement() {
        var token, label = null;

        expectKeyword('break');

        // Optimize the most common form: 'break;'.
        if (source[index] === ';') {
            lex();

            if (!(state.inIteration || state.inSwitch)) {
                throwError({}, Messages.IllegalBreak);
            }

            return {
                type: Syntax.BreakStatement,
                label: null
            };
        }

        if (peekLineTerminator()) {
            if (!(state.inIteration || state.inSwitch)) {
                throwError({}, Messages.IllegalBreak);
            }

            return {
                type: Syntax.BreakStatement,
                label: null
            };
        }

        token = lookahead();
        if (token.type === Token.Identifier) {
            label = parseVariableIdentifier();

            if (!Object.prototype.hasOwnProperty.call(state.labelSet, label.name)) {
                throwError({}, Messages.UnknownLabel, label.name);
            }
        }

        consumeSemicolon();

        if (label === null && !(state.inIteration || state.inSwitch)) {
            throwError({}, Messages.IllegalBreak);
        }

        return {
            type: Syntax.BreakStatement,
            label: label
        };
    }

    // 12.9 The return statement

    function parseReturnStatement() {
        var token, argument = null;

        expectKeyword('return');

        if (!state.inFunctionBody) {
            throwErrorTolerant({}, Messages.IllegalReturn);
        }

        // 'return' followed by a space and an identifier is very common.
        if (source[index] === ' ') {
            if (isIdentifierStart(source[index + 1])) {
                argument = parseExpression();
                consumeSemicolon();
                return {
                    type: Syntax.ReturnStatement,
                    argument: argument
                };
            }
        }

        if (peekLineTerminator()) {
            return {
                type: Syntax.ReturnStatement,
                argument: null
            };
        }

        if (!match(';')) {
            token = lookahead();
            if (!match('}') && token.type !== Token.EOF) {
                argument = parseExpression();
            }
        }

        consumeSemicolon();

        return {
            type: Syntax.ReturnStatement,
            argument: argument
        };
    }

    // 12.10 The with statement

    function parseWithStatement() {
        var object, body;

        if (strict) {
            throwErrorTolerant({}, Messages.StrictModeWith);
        }

        expectKeyword('with');

        expect('(');

        object = parseExpression();

        expect(')');

        body = parseStatement();

        return {
            type: Syntax.WithStatement,
            object: object,
            body: body
        };
    }

    // 12.10 The swith statement

    function parseSwitchCase() {
        var test,
            consequent = [],
            statement;

        if (matchKeyword('default')) {
            lex();
            test = null;
        } else {
            expectKeyword('case');
            test = parseExpression();
        }
        expect(':');

        while (index < length) {
            if (match('}') || matchKeyword('default') || matchKeyword('case')) {
                break;
            }
            statement = parseStatement();
            if (typeof statement === 'undefined') {
                break;
            }
            consequent.push(statement);
        }

        return {
            type: Syntax.SwitchCase,
            test: test,
            consequent: consequent
        };
    }

    function parseSwitchStatement() {
        var discriminant, cases, clause, oldInSwitch, defaultFound;

        expectKeyword('switch');

        expect('(');

        discriminant = parseExpression();

        expect(')');

        expect('{');

        if (match('}')) {
            lex();
            return {
                type: Syntax.SwitchStatement,
                discriminant: discriminant
            };
        }

        cases = [];

        oldInSwitch = state.inSwitch;
        state.inSwitch = true;
        defaultFound = false;

        while (index < length) {
            if (match('}')) {
                break;
            }
            clause = parseSwitchCase();
            if (clause.test === null) {
                if (defaultFound) {
                    throwError({}, Messages.MultipleDefaultsInSwitch);
                }
                defaultFound = true;
            }
            cases.push(clause);
        }

        state.inSwitch = oldInSwitch;

        expect('}');

        return {
            type: Syntax.SwitchStatement,
            discriminant: discriminant,
            cases: cases
        };
    }

    // 12.13 The throw statement

    function parseThrowStatement() {
        var argument;

        expectKeyword('throw');

        if (peekLineTerminator()) {
            throwError({}, Messages.NewlineAfterThrow);
        }

        argument = parseExpression();

        consumeSemicolon();

        return {
            type: Syntax.ThrowStatement,
            argument: argument
        };
    }

    // 12.14 The try statement

    function parseCatchClause() {
        var param;

        expectKeyword('catch');

        expect('(');
        if (match(')')) {
            throwUnexpected(lookahead());
        }

        param = parseVariableIdentifier();
        // 12.14.1
        if (strict && isRestrictedWord(param.name)) {
            throwErrorTolerant({}, Messages.StrictCatchVariable);
        }

        expect(')');

        return {
            type: Syntax.CatchClause,
            param: param,
            body: parseBlock()
        };
    }

    function parseTryStatement() {
        var block, handlers = [], finalizer = null;

        expectKeyword('try');

        block = parseBlock();

        if (matchKeyword('catch')) {
            handlers.push(parseCatchClause());
        }

        if (matchKeyword('finally')) {
            lex();
            finalizer = parseBlock();
        }

        if (handlers.length === 0 && !finalizer) {
            throwError({}, Messages.NoCatchOrFinally);
        }

        return {
            type: Syntax.TryStatement,
            block: block,
            guardedHandlers: [],
            handlers: handlers,
            finalizer: finalizer
        };
    }

    // 12.15 The debugger statement

    function parseDebuggerStatement() {
        expectKeyword('debugger');

        consumeSemicolon();

        return {
            type: Syntax.DebuggerStatement
        };
    }

    // 12 Statements

    function parseStatement() {
        var token = lookahead(),
            expr,
            labeledBody;

        if (token.type === Token.EOF) {
            throwUnexpected(token);
        }

        if (token.type === Token.Punctuator) {
            switch (token.value) {
            case ';':
                return parseEmptyStatement();
            case '{':
                return parseBlock();
            case '(':
                return parseExpressionStatement();
            default:
                break;
            }
        }

        if (token.type === Token.Keyword) {
            switch (token.value) {
            case 'break':
                return parseBreakStatement();
            case 'continue':
                return parseContinueStatement();
            case 'debugger':
                return parseDebuggerStatement();
            case 'do':
                return parseDoWhileStatement();
            case 'for':
                return parseForStatement();
            case 'function':
                return parseFunctionDeclaration();
            case 'if':
                return parseIfStatement();
            case 'return':
                return parseReturnStatement();
            case 'switch':
                return parseSwitchStatement();
            case 'throw':
                return parseThrowStatement();
            case 'try':
                return parseTryStatement();
            case 'var':
                return parseVariableStatement();
            case 'while':
                return parseWhileStatement();
            case 'with':
                return parseWithStatement();
            default:
                break;
            }
        }

        expr = parseExpression();

        // 12.12 Labelled Statements
        if ((expr.type === Syntax.Identifier) && match(':')) {
            lex();

            if (Object.prototype.hasOwnProperty.call(state.labelSet, expr.name)) {
                throwError({}, Messages.Redeclaration, 'Label', expr.name);
            }

            state.labelSet[expr.name] = true;
            labeledBody = parseStatement();
            delete state.labelSet[expr.name];

            return {
                type: Syntax.LabeledStatement,
                label: expr,
                body: labeledBody
            };
        }

        consumeSemicolon();

        return {
            type: Syntax.ExpressionStatement,
            expression: expr
        };
    }

    // 13 Function Definition

    function parseFunctionSourceElements() {
        var sourceElement, sourceElements = [], token, directive, firstRestricted,
            oldLabelSet, oldInIteration, oldInSwitch, oldInFunctionBody;

        expect('{');

        while (index < length) {
            token = lookahead();
            if (token.type !== Token.StringLiteral) {
                break;
            }

            sourceElement = parseSourceElement();
            sourceElements.push(sourceElement);
            if (sourceElement.expression.type !== Syntax.Literal) {
                // this is not directive
                break;
            }
            directive = sliceSource(token.range[0] + 1, token.range[1] - 1);
            if (directive === 'use strict') {
                strict = true;
                if (firstRestricted) {
                    throwErrorTolerant(firstRestricted, Messages.StrictOctalLiteral);
                }
            } else {
                if (!firstRestricted && token.octal) {
                    firstRestricted = token;
                }
            }
        }

        oldLabelSet = state.labelSet;
        oldInIteration = state.inIteration;
        oldInSwitch = state.inSwitch;
        oldInFunctionBody = state.inFunctionBody;

        state.labelSet = {};
        state.inIteration = false;
        state.inSwitch = false;
        state.inFunctionBody = true;

        while (index < length) {
            if (match('}')) {
                break;
            }
            sourceElement = parseSourceElement();
            if (typeof sourceElement === 'undefined') {
                break;
            }
            sourceElements.push(sourceElement);
        }

        expect('}');

        state.labelSet = oldLabelSet;
        state.inIteration = oldInIteration;
        state.inSwitch = oldInSwitch;
        state.inFunctionBody = oldInFunctionBody;

        return {
            type: Syntax.BlockStatement,
            body: sourceElements
        };
    }

    function parseFunctionDeclaration() {
        var id, param, params = [], body, token, stricted, firstRestricted, message, previousStrict, paramSet;

        expectKeyword('function');
        token = lookahead();
        id = parseVariableIdentifier();
        if (strict) {
            if (isRestrictedWord(token.value)) {
                throwErrorTolerant(token, Messages.StrictFunctionName);
            }
        } else {
            if (isRestrictedWord(token.value)) {
                firstRestricted = token;
                message = Messages.StrictFunctionName;
            } else if (isStrictModeReservedWord(token.value)) {
                firstRestricted = token;
                message = Messages.StrictReservedWord;
            }
        }

        expect('(');

        if (!match(')')) {
            paramSet = {};
            while (index < length) {
                token = lookahead();
                param = parseVariableIdentifier();
                if (strict) {
                    if (isRestrictedWord(token.value)) {
                        stricted = token;
                        message = Messages.StrictParamName;
                    }
                    if (Object.prototype.hasOwnProperty.call(paramSet, token.value)) {
                        stricted = token;
                        message = Messages.StrictParamDupe;
                    }
                } else if (!firstRestricted) {
                    if (isRestrictedWord(token.value)) {
                        firstRestricted = token;
                        message = Messages.StrictParamName;
                    } else if (isStrictModeReservedWord(token.value)) {
                        firstRestricted = token;
                        message = Messages.StrictReservedWord;
                    } else if (Object.prototype.hasOwnProperty.call(paramSet, token.value)) {
                        firstRestricted = token;
                        message = Messages.StrictParamDupe;
                    }
                }
                params.push(param);
                paramSet[param.name] = true;
                if (match(')')) {
                    break;
                }
                expect(',');
            }
        }

        expect(')');

        previousStrict = strict;
        body = parseFunctionSourceElements();
        if (strict && firstRestricted) {
            throwError(firstRestricted, message);
        }
        if (strict && stricted) {
            throwErrorTolerant(stricted, message);
        }
        strict = previousStrict;

        return {
            type: Syntax.FunctionDeclaration,
            id: id,
            params: params,
            defaults: [],
            body: body,
            rest: null,
            generator: false,
            expression: false
        };
    }

    function parseFunctionExpression() {
        var token, id = null, stricted, firstRestricted, message, param, params = [], body, previousStrict, paramSet;

        expectKeyword('function');

        if (!match('(')) {
            token = lookahead();
            id = parseVariableIdentifier();
            if (strict) {
                if (isRestrictedWord(token.value)) {
                    throwErrorTolerant(token, Messages.StrictFunctionName);
                }
            } else {
                if (isRestrictedWord(token.value)) {
                    firstRestricted = token;
                    message = Messages.StrictFunctionName;
                } else if (isStrictModeReservedWord(token.value)) {
                    firstRestricted = token;
                    message = Messages.StrictReservedWord;
                }
            }
        }

        expect('(');

        if (!match(')')) {
            paramSet = {};
            while (index < length) {
                token = lookahead();
                param = parseVariableIdentifier();
                if (strict) {
                    if (isRestrictedWord(token.value)) {
                        stricted = token;
                        message = Messages.StrictParamName;
                    }
                    if (Object.prototype.hasOwnProperty.call(paramSet, token.value)) {
                        stricted = token;
                        message = Messages.StrictParamDupe;
                    }
                } else if (!firstRestricted) {
                    if (isRestrictedWord(token.value)) {
                        firstRestricted = token;
                        message = Messages.StrictParamName;
                    } else if (isStrictModeReservedWord(token.value)) {
                        firstRestricted = token;
                        message = Messages.StrictReservedWord;
                    } else if (Object.prototype.hasOwnProperty.call(paramSet, token.value)) {
                        firstRestricted = token;
                        message = Messages.StrictParamDupe;
                    }
                }
                params.push(param);
                paramSet[param.name] = true;
                if (match(')')) {
                    break;
                }
                expect(',');
            }
        }

        expect(')');

        previousStrict = strict;
        body = parseFunctionSourceElements();
        if (strict && firstRestricted) {
            throwError(firstRestricted, message);
        }
        if (strict && stricted) {
            throwErrorTolerant(stricted, message);
        }
        strict = previousStrict;

        return {
            type: Syntax.FunctionExpression,
            id: id,
            params: params,
            defaults: [],
            body: body,
            rest: null,
            generator: false,
            expression: false
        };
    }

    // 14 Program

    function parseSourceElement() {
        var token = lookahead();

        if (token.type === Token.Keyword) {
            switch (token.value) {
            case 'const':
            case 'let':
                return parseConstLetDeclaration(token.value);
            case 'function':
                return parseFunctionDeclaration();
            default:
                return parseStatement();
            }
        }

        if (token.type !== Token.EOF) {
            return parseStatement();
        }
    }

    function parseSourceElements() {
        var sourceElement, sourceElements = [], token, directive, firstRestricted;

        while (index < length) {
            token = lookahead();
            if (token.type !== Token.StringLiteral) {
                break;
            }

            sourceElement = parseSourceElement();
            sourceElements.push(sourceElement);
            if (sourceElement.expression.type !== Syntax.Literal) {
                // this is not directive
                break;
            }
            directive = sliceSource(token.range[0] + 1, token.range[1] - 1);
            if (directive === 'use strict') {
                strict = true;
                if (firstRestricted) {
                    throwErrorTolerant(firstRestricted, Messages.StrictOctalLiteral);
                }
            } else {
                if (!firstRestricted && token.octal) {
                    firstRestricted = token;
                }
            }
        }

        while (index < length) {
            sourceElement = parseSourceElement();
            if (typeof sourceElement === 'undefined') {
                break;
            }
            sourceElements.push(sourceElement);
        }
        return sourceElements;
    }

    function parseProgram() {
        var program;
        strict = false;
        program = {
            type: Syntax.Program,
            body: parseSourceElements()
        };
        return program;
    }

    // The following functions are needed only when the option to preserve
    // the comments is active.

    function addComment(type, value, start, end, loc) {
        assert(typeof start === 'number', 'Comment must have valid position');

        // Because the way the actual token is scanned, often the comments
        // (if any) are skipped twice during the lexical analysis.
        // Thus, we need to skip adding a comment if the comment array already
        // handled it.
        if (extra.comments.length > 0) {
            if (extra.comments[extra.comments.length - 1].range[1] > start) {
                return;
            }
        }

        extra.comments.push({
            type: type,
            value: value,
            range: [start, end],
            loc: loc
        });
    }

    function scanComment() {
        var comment, ch, loc, start, blockComment, lineComment;

        comment = '';
        blockComment = false;
        lineComment = false;

        while (index < length) {
            ch = source[index];

            if (lineComment) {
                ch = source[index++];
                if (isLineTerminator(ch)) {
                    loc.end = {
                        line: lineNumber,
                        column: index - lineStart - 1
                    };
                    lineComment = false;
                    addComment('Line', comment, start, index - 1, loc);
                    if (ch === '\r' && source[index] === '\n') {
                        ++index;
                    }
                    ++lineNumber;
                    lineStart = index;
                    comment = '';
                } else if (index >= length) {
                    lineComment = false;
                    comment += ch;
                    loc.end = {
                        line: lineNumber,
                        column: length - lineStart
                    };
                    addComment('Line', comment, start, length, loc);
                } else {
                    comment += ch;
                }
            } else if (blockComment) {
                if (isLineTerminator(ch)) {
                    if (ch === '\r' && source[index + 1] === '\n') {
                        ++index;
                        comment += '\r\n';
                    } else {
                        comment += ch;
                    }
                    ++lineNumber;
                    ++index;
                    lineStart = index;
                    if (index >= length) {
                        throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
                    }
                } else {
                    ch = source[index++];
                    if (index >= length) {
                        throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
                    }
                    comment += ch;
                    if (ch === '*') {
                        ch = source[index];
                        if (ch === '/') {
                            comment = comment.substr(0, comment.length - 1);
                            blockComment = false;
                            ++index;
                            loc.end = {
                                line: lineNumber,
                                column: index - lineStart
                            };
                            addComment('Block', comment, start, index, loc);
                            comment = '';
                        }
                    }
                }
            } else if (ch === '/') {
                ch = source[index + 1];
                if (ch === '/') {
                    loc = {
                        start: {
                            line: lineNumber,
                            column: index - lineStart
                        }
                    };
                    start = index;
                    index += 2;
                    lineComment = true;
                    if (index >= length) {
                        loc.end = {
                            line: lineNumber,
                            column: index - lineStart
                        };
                        lineComment = false;
                        addComment('Line', comment, start, index, loc);
                    }
                } else if (ch === '*') {
                    start = index;
                    index += 2;
                    blockComment = true;
                    loc = {
                        start: {
                            line: lineNumber,
                            column: index - lineStart - 2
                        }
                    };
                    if (index >= length) {
                        throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
                    }
                } else {
                    break;
                }
            } else if (isWhiteSpace(ch)) {
                ++index;
            } else if (isLineTerminator(ch)) {
                ++index;
                if (ch ===  '\r' && source[index] === '\n') {
                    ++index;
                }
                ++lineNumber;
                lineStart = index;
            } else {
                break;
            }
        }
    }

    function filterCommentLocation() {
        var i, entry, comment, comments = [];

        for (i = 0; i < extra.comments.length; ++i) {
            entry = extra.comments[i];
            comment = {
                type: entry.type,
                value: entry.value
            };
            if (extra.range) {
                comment.range = entry.range;
            }
            if (extra.loc) {
                comment.loc = entry.loc;
            }
            comments.push(comment);
        }

        extra.comments = comments;
    }

    function collectToken() {
        var start, loc, token, range, value;

        skipComment();
        start = index;
        loc = {
            start: {
                line: lineNumber,
                column: index - lineStart
            }
        };

        token = extra.advance();
        loc.end = {
            line: lineNumber,
            column: index - lineStart
        };

        if (token.type !== Token.EOF) {
            range = [token.range[0], token.range[1]];
            value = sliceSource(token.range[0], token.range[1]);
            extra.tokens.push({
                type: TokenName[token.type],
                value: value,
                range: range,
                loc: loc
            });
        }

        return token;
    }

    function collectRegex() {
        var pos, loc, regex, token;

        skipComment();

        pos = index;
        loc = {
            start: {
                line: lineNumber,
                column: index - lineStart
            }
        };

        regex = extra.scanRegExp();
        loc.end = {
            line: lineNumber,
            column: index - lineStart
        };

        // Pop the previous token, which is likely '/' or '/='
        if (extra.tokens.length > 0) {
            token = extra.tokens[extra.tokens.length - 1];
            if (token.range[0] === pos && token.type === 'Punctuator') {
                if (token.value === '/' || token.value === '/=') {
                    extra.tokens.pop();
                }
            }
        }

        extra.tokens.push({
            type: 'RegularExpression',
            value: regex.literal,
            range: [pos, index],
            loc: loc
        });

        return regex;
    }

    function filterTokenLocation() {
        var i, entry, token, tokens = [];

        for (i = 0; i < extra.tokens.length; ++i) {
            entry = extra.tokens[i];
            token = {
                type: entry.type,
                value: entry.value
            };
            if (extra.range) {
                token.range = entry.range;
            }
            if (extra.loc) {
                token.loc = entry.loc;
            }
            tokens.push(token);
        }

        extra.tokens = tokens;
    }

    function createLiteral(token) {
        return {
            type: Syntax.Literal,
            value: token.value
        };
    }

    function createRawLiteral(token) {
        return {
            type: Syntax.Literal,
            value: token.value,
            raw: sliceSource(token.range[0], token.range[1])
        };
    }

    function createLocationMarker() {
        var marker = {};

        marker.range = [index, index];
        marker.loc = {
            start: {
                line: lineNumber,
                column: index - lineStart
            },
            end: {
                line: lineNumber,
                column: index - lineStart
            }
        };

        marker.end = function () {
            this.range[1] = index;
            this.loc.end.line = lineNumber;
            this.loc.end.column = index - lineStart;
        };

        marker.applyGroup = function (node) {
            if (extra.range) {
                node.groupRange = [this.range[0], this.range[1]];
            }
            if (extra.loc) {
                node.groupLoc = {
                    start: {
                        line: this.loc.start.line,
                        column: this.loc.start.column
                    },
                    end: {
                        line: this.loc.end.line,
                        column: this.loc.end.column
                    }
                };
            }
        };

        marker.apply = function (node) {
            if (extra.range) {
                node.range = [this.range[0], this.range[1]];
            }
            if (extra.loc) {
                node.loc = {
                    start: {
                        line: this.loc.start.line,
                        column: this.loc.start.column
                    },
                    end: {
                        line: this.loc.end.line,
                        column: this.loc.end.column
                    }
                };
            }
        };

        return marker;
    }

    function trackGroupExpression() {
        var marker, expr;

        skipComment();
        marker = createLocationMarker();
        expect('(');

        expr = parseExpression();

        expect(')');

        marker.end();
        marker.applyGroup(expr);

        return expr;
    }

    function trackLeftHandSideExpression() {
        var marker, expr;

        skipComment();
        marker = createLocationMarker();

        expr = matchKeyword('new') ? parseNewExpression() : parsePrimaryExpression();

        while (match('.') || match('[')) {
            if (match('[')) {
                expr = {
                    type: Syntax.MemberExpression,
                    computed: true,
                    object: expr,
                    property: parseComputedMember()
                };
                marker.end();
                marker.apply(expr);
            } else {
                expr = {
                    type: Syntax.MemberExpression,
                    computed: false,
                    object: expr,
                    property: parseNonComputedMember()
                };
                marker.end();
                marker.apply(expr);
            }
        }

        return expr;
    }

    function trackLeftHandSideExpressionAllowCall() {
        var marker, expr;

        skipComment();
        marker = createLocationMarker();

        expr = matchKeyword('new') ? parseNewExpression() : parsePrimaryExpression();

        while (match('.') || match('[') || match('(')) {
            if (match('(')) {
                expr = {
                    type: Syntax.CallExpression,
                    callee: expr,
                    'arguments': parseArguments()
                };
                marker.end();
                marker.apply(expr);
            } else if (match('[')) {
                expr = {
                    type: Syntax.MemberExpression,
                    computed: true,
                    object: expr,
                    property: parseComputedMember()
                };
                marker.end();
                marker.apply(expr);
            } else {
                expr = {
                    type: Syntax.MemberExpression,
                    computed: false,
                    object: expr,
                    property: parseNonComputedMember()
                };
                marker.end();
                marker.apply(expr);
            }
        }

        return expr;
    }

    function filterGroup(node) {
        var n, i, entry;

        n = (Object.prototype.toString.apply(node) === '[object Array]') ? [] : {};
        for (i in node) {
            if (node.hasOwnProperty(i) && i !== 'groupRange' && i !== 'groupLoc') {
                entry = node[i];
                if (entry === null || typeof entry !== 'object' || entry instanceof RegExp) {
                    n[i] = entry;
                } else {
                    n[i] = filterGroup(entry);
                }
            }
        }
        return n;
    }

    function wrapTrackingFunction(range, loc) {

        return function (parseFunction) {

            function isBinary(node) {
                return node.type === Syntax.LogicalExpression ||
                    node.type === Syntax.BinaryExpression;
            }

            function visit(node) {
                var start, end;

                if (isBinary(node.left)) {
                    visit(node.left);
                }
                if (isBinary(node.right)) {
                    visit(node.right);
                }

                if (range) {
                    if (node.left.groupRange || node.right.groupRange) {
                        start = node.left.groupRange ? node.left.groupRange[0] : node.left.range[0];
                        end = node.right.groupRange ? node.right.groupRange[1] : node.right.range[1];
                        node.range = [start, end];
                    } else if (typeof node.range === 'undefined') {
                        start = node.left.range[0];
                        end = node.right.range[1];
                        node.range = [start, end];
                    }
                }
                if (loc) {
                    if (node.left.groupLoc || node.right.groupLoc) {
                        start = node.left.groupLoc ? node.left.groupLoc.start : node.left.loc.start;
                        end = node.right.groupLoc ? node.right.groupLoc.end : node.right.loc.end;
                        node.loc = {
                            start: start,
                            end: end
                        };
                    } else if (typeof node.loc === 'undefined') {
                        node.loc = {
                            start: node.left.loc.start,
                            end: node.right.loc.end
                        };
                    }
                }
            }

            return function () {
                var marker, node;

                skipComment();

                marker = createLocationMarker();
                node = parseFunction.apply(null, arguments);
                marker.end();

                if (range && typeof node.range === 'undefined') {
                    marker.apply(node);
                }

                if (loc && typeof node.loc === 'undefined') {
                    marker.apply(node);
                }

                if (isBinary(node)) {
                    visit(node);
                }

                return node;
            };
        };
    }

    function patch() {

        var wrapTracking;

        if (extra.comments) {
            extra.skipComment = skipComment;
            skipComment = scanComment;
        }

        if (extra.raw) {
            extra.createLiteral = createLiteral;
            createLiteral = createRawLiteral;
        }

        if (extra.range || extra.loc) {

            extra.parseGroupExpression = parseGroupExpression;
            extra.parseLeftHandSideExpression = parseLeftHandSideExpression;
            extra.parseLeftHandSideExpressionAllowCall = parseLeftHandSideExpressionAllowCall;
            parseGroupExpression = trackGroupExpression;
            parseLeftHandSideExpression = trackLeftHandSideExpression;
            parseLeftHandSideExpressionAllowCall = trackLeftHandSideExpressionAllowCall;

            wrapTracking = wrapTrackingFunction(extra.range, extra.loc);

            extra.parseAdditiveExpression = parseAdditiveExpression;
            extra.parseAssignmentExpression = parseAssignmentExpression;
            extra.parseBitwiseANDExpression = parseBitwiseANDExpression;
            extra.parseBitwiseORExpression = parseBitwiseORExpression;
            extra.parseBitwiseXORExpression = parseBitwiseXORExpression;
            extra.parseBlock = parseBlock;
            extra.parseFunctionSourceElements = parseFunctionSourceElements;
            extra.parseCatchClause = parseCatchClause;
            extra.parseComputedMember = parseComputedMember;
            extra.parseConditionalExpression = parseConditionalExpression;
            extra.parseConstLetDeclaration = parseConstLetDeclaration;
            extra.parseEqualityExpression = parseEqualityExpression;
            extra.parseExpression = parseExpression;
            extra.parseForVariableDeclaration = parseForVariableDeclaration;
            extra.parseFunctionDeclaration = parseFunctionDeclaration;
            extra.parseFunctionExpression = parseFunctionExpression;
            extra.parseLogicalANDExpression = parseLogicalANDExpression;
            extra.parseLogicalORExpression = parseLogicalORExpression;
            extra.parseMultiplicativeExpression = parseMultiplicativeExpression;
            extra.parseNewExpression = parseNewExpression;
            extra.parseNonComputedProperty = parseNonComputedProperty;
            extra.parseObjectProperty = parseObjectProperty;
            extra.parseObjectPropertyKey = parseObjectPropertyKey;
            extra.parsePostfixExpression = parsePostfixExpression;
            extra.parsePrimaryExpression = parsePrimaryExpression;
            extra.parseProgram = parseProgram;
            extra.parsePropertyFunction = parsePropertyFunction;
            extra.parseRelationalExpression = parseRelationalExpression;
            extra.parseStatement = parseStatement;
            extra.parseShiftExpression = parseShiftExpression;
            extra.parseSwitchCase = parseSwitchCase;
            extra.parseUnaryExpression = parseUnaryExpression;
            extra.parseVariableDeclaration = parseVariableDeclaration;
            extra.parseVariableIdentifier = parseVariableIdentifier;

            parseAdditiveExpression = wrapTracking(extra.parseAdditiveExpression);
            parseAssignmentExpression = wrapTracking(extra.parseAssignmentExpression);
            parseBitwiseANDExpression = wrapTracking(extra.parseBitwiseANDExpression);
            parseBitwiseORExpression = wrapTracking(extra.parseBitwiseORExpression);
            parseBitwiseXORExpression = wrapTracking(extra.parseBitwiseXORExpression);
            parseBlock = wrapTracking(extra.parseBlock);
            parseFunctionSourceElements = wrapTracking(extra.parseFunctionSourceElements);
            parseCatchClause = wrapTracking(extra.parseCatchClause);
            parseComputedMember = wrapTracking(extra.parseComputedMember);
            parseConditionalExpression = wrapTracking(extra.parseConditionalExpression);
            parseConstLetDeclaration = wrapTracking(extra.parseConstLetDeclaration);
            parseEqualityExpression = wrapTracking(extra.parseEqualityExpression);
            parseExpression = wrapTracking(extra.parseExpression);
            parseForVariableDeclaration = wrapTracking(extra.parseForVariableDeclaration);
            parseFunctionDeclaration = wrapTracking(extra.parseFunctionDeclaration);
            parseFunctionExpression = wrapTracking(extra.parseFunctionExpression);
            parseLeftHandSideExpression = wrapTracking(parseLeftHandSideExpression);
            parseLogicalANDExpression = wrapTracking(extra.parseLogicalANDExpression);
            parseLogicalORExpression = wrapTracking(extra.parseLogicalORExpression);
            parseMultiplicativeExpression = wrapTracking(extra.parseMultiplicativeExpression);
            parseNewExpression = wrapTracking(extra.parseNewExpression);
            parseNonComputedProperty = wrapTracking(extra.parseNonComputedProperty);
            parseObjectProperty = wrapTracking(extra.parseObjectProperty);
            parseObjectPropertyKey = wrapTracking(extra.parseObjectPropertyKey);
            parsePostfixExpression = wrapTracking(extra.parsePostfixExpression);
            parsePrimaryExpression = wrapTracking(extra.parsePrimaryExpression);
            parseProgram = wrapTracking(extra.parseProgram);
            parsePropertyFunction = wrapTracking(extra.parsePropertyFunction);
            parseRelationalExpression = wrapTracking(extra.parseRelationalExpression);
            parseStatement = wrapTracking(extra.parseStatement);
            parseShiftExpression = wrapTracking(extra.parseShiftExpression);
            parseSwitchCase = wrapTracking(extra.parseSwitchCase);
            parseUnaryExpression = wrapTracking(extra.parseUnaryExpression);
            parseVariableDeclaration = wrapTracking(extra.parseVariableDeclaration);
            parseVariableIdentifier = wrapTracking(extra.parseVariableIdentifier);
        }

        if (typeof extra.tokens !== 'undefined') {
            extra.advance = advance;
            extra.scanRegExp = scanRegExp;

            advance = collectToken;
            scanRegExp = collectRegex;
        }
    }

    function unpatch() {
        if (typeof extra.skipComment === 'function') {
            skipComment = extra.skipComment;
        }

        if (extra.raw) {
            createLiteral = extra.createLiteral;
        }

        if (extra.range || extra.loc) {
            parseAdditiveExpression = extra.parseAdditiveExpression;
            parseAssignmentExpression = extra.parseAssignmentExpression;
            parseBitwiseANDExpression = extra.parseBitwiseANDExpression;
            parseBitwiseORExpression = extra.parseBitwiseORExpression;
            parseBitwiseXORExpression = extra.parseBitwiseXORExpression;
            parseBlock = extra.parseBlock;
            parseFunctionSourceElements = extra.parseFunctionSourceElements;
            parseCatchClause = extra.parseCatchClause;
            parseComputedMember = extra.parseComputedMember;
            parseConditionalExpression = extra.parseConditionalExpression;
            parseConstLetDeclaration = extra.parseConstLetDeclaration;
            parseEqualityExpression = extra.parseEqualityExpression;
            parseExpression = extra.parseExpression;
            parseForVariableDeclaration = extra.parseForVariableDeclaration;
            parseFunctionDeclaration = extra.parseFunctionDeclaration;
            parseFunctionExpression = extra.parseFunctionExpression;
            parseGroupExpression = extra.parseGroupExpression;
            parseLeftHandSideExpression = extra.parseLeftHandSideExpression;
            parseLeftHandSideExpressionAllowCall = extra.parseLeftHandSideExpressionAllowCall;
            parseLogicalANDExpression = extra.parseLogicalANDExpression;
            parseLogicalORExpression = extra.parseLogicalORExpression;
            parseMultiplicativeExpression = extra.parseMultiplicativeExpression;
            parseNewExpression = extra.parseNewExpression;
            parseNonComputedProperty = extra.parseNonComputedProperty;
            parseObjectProperty = extra.parseObjectProperty;
            parseObjectPropertyKey = extra.parseObjectPropertyKey;
            parsePrimaryExpression = extra.parsePrimaryExpression;
            parsePostfixExpression = extra.parsePostfixExpression;
            parseProgram = extra.parseProgram;
            parsePropertyFunction = extra.parsePropertyFunction;
            parseRelationalExpression = extra.parseRelationalExpression;
            parseStatement = extra.parseStatement;
            parseShiftExpression = extra.parseShiftExpression;
            parseSwitchCase = extra.parseSwitchCase;
            parseUnaryExpression = extra.parseUnaryExpression;
            parseVariableDeclaration = extra.parseVariableDeclaration;
            parseVariableIdentifier = extra.parseVariableIdentifier;
        }

        if (typeof extra.scanRegExp === 'function') {
            advance = extra.advance;
            scanRegExp = extra.scanRegExp;
        }
    }

    function stringToArray(str) {
        var length = str.length,
            result = [],
            i;
        for (i = 0; i < length; ++i) {
            result[i] = str.charAt(i);
        }
        return result;
    }

    function parse(code, options) {
        var program, toString;

        toString = String;
        if (typeof code !== 'string' && !(code instanceof String)) {
            code = toString(code);
        }

        source = code;
        index = 0;
        lineNumber = (source.length > 0) ? 1 : 0;
        lineStart = 0;
        length = source.length;
        buffer = null;
        state = {
            allowIn: true,
            labelSet: {},
            inFunctionBody: false,
            inIteration: false,
            inSwitch: false
        };

        extra = {};
        if (typeof options !== 'undefined') {
            extra.range = (typeof options.range === 'boolean') && options.range;
            extra.loc = (typeof options.loc === 'boolean') && options.loc;
            extra.raw = (typeof options.raw === 'boolean') && options.raw;
            if (typeof options.tokens === 'boolean' && options.tokens) {
                extra.tokens = [];
            }
            if (typeof options.comment === 'boolean' && options.comment) {
                extra.comments = [];
            }
            if (typeof options.tolerant === 'boolean' && options.tolerant) {
                extra.errors = [];
            }
        }

        if (length > 0) {
            if (typeof source[0] === 'undefined') {
                // Try first to convert to a string. This is good as fast path
                // for old IE which understands string indexing for string
                // literals only and not for string object.
                if (code instanceof String) {
                    source = code.valueOf();
                }

                // Force accessing the characters via an array.
                if (typeof source[0] === 'undefined') {
                    source = stringToArray(code);
                }
            }
        }

        patch();
        try {
            program = parseProgram();
            if (typeof extra.comments !== 'undefined') {
                filterCommentLocation();
                program.comments = extra.comments;
            }
            if (typeof extra.tokens !== 'undefined') {
                filterTokenLocation();
                program.tokens = extra.tokens;
            }
            if (typeof extra.errors !== 'undefined') {
                program.errors = extra.errors;
            }
            if (extra.range || extra.loc) {
                program.body = filterGroup(program.body);
            }
        } catch (e) {
            throw e;
        } finally {
            unpatch();
            extra = {};
        }

        return program;
    }

    // Sync with package.json.
    exports.version = '1.0.3';

    exports.parse = parse;

    // Deep copy.
    exports.Syntax = (function () {
        var name, types = {};

        if (typeof Object.create === 'function') {
            types = Object.create(null);
        }

        for (name in Syntax) {
            if (Syntax.hasOwnProperty(name)) {
                types[name] = Syntax[name];
            }
        }

        if (typeof Object.freeze === 'function') {
            Object.freeze(types);
        }

        return types;
    }());

}));
/* vim: set sw=4 ts=4 et tw=80 : */

},{}],4:[function(require,module,exports){
/*
  Copyright (C) 2012 Yusuke Suzuki <utatane.tea@gmail.com>
  Copyright (C) 2012 Ariya Hidayat <ariya.hidayat@gmail.com>

  Redistribution and use in source and binary forms, with or without
  modification, are permitted provided that the following conditions are met:

    * Redistributions of source code must retain the above copyright
      notice, this list of conditions and the following disclaimer.
    * Redistributions in binary form must reproduce the above copyright
      notice, this list of conditions and the following disclaimer in the
      documentation and/or other materials provided with the distribution.

  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
  AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
  IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
  ARE DISCLAIMED. IN NO EVENT SHALL <COPYRIGHT HOLDER> BE LIABLE FOR ANY
  DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
  (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
  LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
  ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
  (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
  THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/

/*jslint bitwise:true */
/*global exports:true, define:true, window:true */
(function (factory) {
    'use strict';

    // Universal Module Definition (UMD) to support AMD, CommonJS/Node.js,
    // and plain browser loading,
    if (typeof define === 'function' && define.amd) {
        define(['exports'], factory);
    } else if (typeof exports !== 'undefined') {
        factory(exports);
    } else {
        factory((window.estraverse = {}));
    }
}(function (exports) {
    'use strict';

    var Syntax,
        isArray,
        VisitorOption,
        VisitorKeys,
        wrappers;

    Syntax = {
        AssignmentExpression: 'AssignmentExpression',
        ArrayExpression: 'ArrayExpression',
        BlockStatement: 'BlockStatement',
        BinaryExpression: 'BinaryExpression',
        BreakStatement: 'BreakStatement',
        CallExpression: 'CallExpression',
        CatchClause: 'CatchClause',
        ConditionalExpression: 'ConditionalExpression',
        ContinueStatement: 'ContinueStatement',
        DebuggerStatement: 'DebuggerStatement',
        DirectiveStatement: 'DirectiveStatement',
        DoWhileStatement: 'DoWhileStatement',
        EmptyStatement: 'EmptyStatement',
        ExpressionStatement: 'ExpressionStatement',
        ForStatement: 'ForStatement',
        ForInStatement: 'ForInStatement',
        FunctionDeclaration: 'FunctionDeclaration',
        FunctionExpression: 'FunctionExpression',
        Identifier: 'Identifier',
        IfStatement: 'IfStatement',
        Literal: 'Literal',
        LabeledStatement: 'LabeledStatement',
        LogicalExpression: 'LogicalExpression',
        MemberExpression: 'MemberExpression',
        NewExpression: 'NewExpression',
        ObjectExpression: 'ObjectExpression',
        Program: 'Program',
        Property: 'Property',
        ReturnStatement: 'ReturnStatement',
        SequenceExpression: 'SequenceExpression',
        SwitchStatement: 'SwitchStatement',
        SwitchCase: 'SwitchCase',
        ThisExpression: 'ThisExpression',
        ThrowStatement: 'ThrowStatement',
        TryStatement: 'TryStatement',
        UnaryExpression: 'UnaryExpression',
        UpdateExpression: 'UpdateExpression',
        VariableDeclaration: 'VariableDeclaration',
        VariableDeclarator: 'VariableDeclarator',
        WhileStatement: 'WhileStatement',
        WithStatement: 'WithStatement'
    };

    isArray = Array.isArray;
    if (!isArray) {
        isArray = function isArray(array) {
            return Object.prototype.toString.call(array) === '[object Array]';
        };
    }

    VisitorKeys = {
        AssignmentExpression: ['left', 'right'],
        ArrayExpression: ['elements'],
        BlockStatement: ['body'],
        BinaryExpression: ['left', 'right'],
        BreakStatement: ['label'],
        CallExpression: ['callee', 'arguments'],
        CatchClause: ['param', 'body'],
        ConditionalExpression: ['test', 'consequent', 'alternate'],
        ContinueStatement: ['label'],
        DebuggerStatement: [],
        DirectiveStatement: [],
        DoWhileStatement: ['body', 'test'],
        EmptyStatement: [],
        ExpressionStatement: ['expression'],
        ForStatement: ['init', 'test', 'update', 'body'],
        ForInStatement: ['left', 'right', 'body'],
        FunctionDeclaration: ['id', 'params', 'body'],
        FunctionExpression: ['id', 'params', 'body'],
        Identifier: [],
        IfStatement: ['test', 'consequent', 'alternate'],
        Literal: [],
        LabeledStatement: ['label', 'body'],
        LogicalExpression: ['left', 'right'],
        MemberExpression: ['object', 'property'],
        NewExpression: ['callee', 'arguments'],
        ObjectExpression: ['properties'],
        Program: ['body'],
        Property: ['key', 'value'],
        ReturnStatement: ['argument'],
        SequenceExpression: ['expressions'],
        SwitchStatement: ['discriminant', 'cases'],
        SwitchCase: ['test', 'consequent'],
        ThisExpression: [],
        ThrowStatement: ['argument'],
        TryStatement: ['block', 'handlers', 'finalizer'],
        UnaryExpression: ['argument'],
        UpdateExpression: ['argument'],
        VariableDeclaration: ['declarations'],
        VariableDeclarator: ['id', 'init'],
        WhileStatement: ['test', 'body'],
        WithStatement: ['object', 'body']
    };

    VisitorOption = {
        Break: 1,
        Skip: 2
    };

    wrappers = {
        PropertyWrapper: 'Property'
    };

    function traverse(top, visitor) {
        var worklist, leavelist, node, nodeType, ret, current, current2, candidates, candidate, marker = {};

        worklist = [ top ];
        leavelist = [ null ];

        while (worklist.length) {
            node = worklist.pop();
            nodeType = node.type;

            if (node === marker) {
                node = leavelist.pop();
                if (visitor.leave) {
                    ret = visitor.leave(node, leavelist[leavelist.length - 1]);
                } else {
                    ret = undefined;
                }
                if (ret === VisitorOption.Break) {
                    return;
                }
            } else if (node) {
                if (wrappers.hasOwnProperty(nodeType)) {
                    node = node.node;
                    nodeType = wrappers[nodeType];
                }

                if (visitor.enter) {
                    ret = visitor.enter(node, leavelist[leavelist.length - 1]);
                } else {
                    ret = undefined;
                }

                if (ret === VisitorOption.Break) {
                    return;
                }

                worklist.push(marker);
                leavelist.push(node);

                if (ret !== VisitorOption.Skip) {
                    candidates = VisitorKeys[nodeType];
                    current = candidates.length;
                    while ((current -= 1) >= 0) {
                        candidate = node[candidates[current]];
                        if (candidate) {
                            if (isArray(candidate)) {
                                current2 = candidate.length;
                                while ((current2 -= 1) >= 0) {
                                    if (candidate[current2]) {
                                        if(nodeType === Syntax.ObjectExpression && 'properties' === candidates[current] && null == candidates[current].type) {
                                            worklist.push({type: 'PropertyWrapper', node: candidate[current2]});
                                        } else {
                                            worklist.push(candidate[current2]);
                                        }
                                    }
                                }
                            } else {
                                worklist.push(candidate);
                            }
                        }
                    }
                }
            }
        }
    }

    function replace(top, visitor) {
        var worklist, leavelist, node, nodeType, target, tuple, ret, current, current2, candidates, candidate, marker = {}, result;

        result = {
            top: top
        };

        tuple = [ top, result, 'top' ];
        worklist = [ tuple ];
        leavelist = [ tuple ];

        function notify(v) {
            ret = v;
        }

        while (worklist.length) {
            tuple = worklist.pop();

            if (tuple === marker) {
                tuple = leavelist.pop();
                ret = undefined;
                if (visitor.leave) {
                    node = tuple[0];
                    target = visitor.leave(tuple[0], leavelist[leavelist.length - 1][0], notify);
                    if (target !== undefined) {
                        node = target;
                    }
                    tuple[1][tuple[2]] = node;
                }
                if (ret === VisitorOption.Break) {
                    return result.top;
                }
            } else if (tuple[0]) {
                ret = undefined;
                node = tuple[0];

                nodeType = node.type;
                if (wrappers.hasOwnProperty(nodeType)) {
                    tuple[0] = node = node.node;
                    nodeType = wrappers[nodeType];
                }

                if (visitor.enter) {
                    target = visitor.enter(tuple[0], leavelist[leavelist.length - 1][0], notify);
                    if (target !== undefined) {
                        node = target;
                    }
                    tuple[1][tuple[2]] = node;
                    tuple[0] = node;
                }

                if (ret === VisitorOption.Break) {
                    return result.top;
                }

                if (tuple[0]) {
                    worklist.push(marker);
                    leavelist.push(tuple);

                    if (ret !== VisitorOption.Skip) {
                        candidates = VisitorKeys[nodeType];
                        current = candidates.length;
                        while ((current -= 1) >= 0) {
                            candidate = node[candidates[current]];
                            if (candidate) {
                                if (isArray(candidate)) {
                                    current2 = candidate.length;
                                    while ((current2 -= 1) >= 0) {
                                        if (candidate[current2]) {
                                            if(nodeType === Syntax.ObjectExpression && 'properties' === candidates[current] && null == candidates[current].type) {
                                                worklist.push([{type: 'PropertyWrapper', node: candidate[current2]}, candidate, current2]);
                                            } else {
                                                worklist.push([candidate[current2], candidate, current2]);
                                            }
                                        }
                                    }
                                } else {
                                    worklist.push([candidate, node, candidates[current]]);
                                }
                            }
                        }
                    }
                }
            }
        }

        return result.top;
    }

    exports.version = '0.0.4';
    exports.Syntax = Syntax;
    exports.traverse = traverse;
    exports.replace = replace;
    exports.VisitorKeys = VisitorKeys;
    exports.VisitorOption = VisitorOption;
}));
/* vim: set sw=4 ts=4 et tw=80 : */

},{}],5:[function(require,module,exports){
(function (ns) {

    var walk = require('estraverse'),
        Context = require("./../base/context.js").getContext(null),
        Syntax = walk.Syntax;

    var findParametersInProgram = function (program, contextName, param, analyzedCalls) {
        var contextStack = [new Context(program, null, {name: "global"})];
        var foundParams = [];
        analyzedCalls = analyzedCalls || {};
        //console.log("Looking for: ", contextName, param);

        var activeParam = null;
        walk.traverse(program, {
            enter: function (node) {
                var type = node.type,
                    context;
                switch (type) {
                    case Syntax.FunctionDeclaration:
                        var parentContext = contextStack[contextStack.length - 1];
                        parentContext.declareVariable(node.id.name, false);
                        context = new Context(node, parentContext, {name: node.id.name });
                        contextStack.push(context);
                        if (context.str() == contextName) {
                            if (node.params.length > param) {
                                activeParam = node.params[param].name;
                            }
                        }
                        break;
                    case Syntax.CallExpression:
                        var pos = node.arguments.reduce(function (prev, curr, index) {
                            if (curr.name == activeParam)
                                return index;
                            return prev;
                        }, -1);
                        if (pos != -1) {
                            context = contextStack[contextStack.length - 1];
                            var id = context.getVariableIdentifier(node.callee.name);
                            if (!analyzedCalls[id]) {
                                analyzedCalls[id] = true;
                                foundParams = foundParams.concat(findParametersInProgram(program, id, pos, analyzedCalls));
                            }
                        }
                        break;

                }
            },
            leave: function (node) {
                var type = node.type;
                switch (type) {
                    case Syntax.FunctionDeclaration:
                        contextStack.pop();
                        activeParam = null;
                        break;
                    case Syntax.MemberExpression:
                        if (activeParam && node.object.name == activeParam) {
                            var parameterName = node.property.name;
                            if (foundParams.indexOf(parameterName) == -1)
                                foundParams.push(parameterName);
                        }
                        break;
                }
            }
        });

        return foundParams;
    };

    /**
     * @param {object!} program
     * @param {object?} opt
     */
    ns.extractParameters = function (program, opt) {
        opt = opt || {};
        var context = opt.context || "global.shade";
        var param = opt.param || 0;

        return findParametersInProgram(program, context, param);
    };


}(exports));

},{"./../base/context.js":21,"estraverse":4}],6:[function(require,module,exports){
(function (ns) {

    var Syntax = require('estraverse').Syntax,
        VisitorOption = require('estraverse').VisitorOption,
        Shade = require("../../interfaces.js"),
        TYPES = Shade.TYPES,
        Annotation = require("./../../base/annotation.js").Annotation,
        Base = require("./../../base/index.js");


    var BinaryFunctions = {
        "+" : function(a,b) { return a + b; },
        "-" : function(a,b) { return a - b; },
        "/" : function(a,b) { return a / b; },
        "*" : function(a,b) { return a * b; },
        "%" : function(a,b) { return a % b; },

        "==" : function(a,b) { return a == b; },
        "!=" : function(a,b) { return a != b; },
        "===" : function(a,b) { return a === b; },
        "!==" : function(a,b) { return a !== b; },
        "<" : function(a,b) { return a < b; },
        "<=" : function(a,b) { return a <= b; },
        ">" : function(a,b) { return a > b; },
        ">=" : function(a,b) { return a >= b; }
        };

    var UnaryFunctions = {
                "!": function(a) { return !a; },
                "-": function(a) { return -a; },
                "+": function(a) { return +a; },
                "typeof": function(a) { return typeof a; },
                "void": function(a) { return void a; },
                "delete": function(a) { return delete a; }

    };


    function getObjectReferenceFromNode(object, context) {
        switch (object.type) {
            case Syntax.NewExpression:
            case Syntax.CallExpression:
            case Syntax.MemberExpression:
                return context.createTypeInfo(object);
                break;
            case Syntax.Identifier:
                return context.getBindingByName(object.name);
                break;
            case Syntax.ThisExpression:
                return context.getBindingByName("this");
                break;
            default:
                throw new Error("Unhandled object type in TypeInference: " + object.type);
        }
    }

    var evaluateTruth = function(exp) {
        return !!exp;
    }

    var log = function(str) {};
    //var log = function() { console.log.apply(console, arguments); };


    var enterHandlers = {
        // On enter
        ConditionalExpression: function (node, parent, ctx, root) {
            var result = new Annotation(node);

            root.traverse(node.test);
            var test = ctx.createTypeInfo(node.test);

            // console.log(node.test, node.consequent, node.alternate);
            if (test.hasStaticValue() || test.isObject()) {
                var testResult = test.hasStaticValue() ? evaluateTruth(test.getStaticValue()) : true;
                if (testResult === true) {
                    root.traverse(node.consequent);
                    consequent = ctx.createTypeInfo(node.consequent);
                    result.copy(consequent);
                    var alternate = new Annotation(node.alternate);
                    alternate.eliminate();
                } else {
                    root.traverse(node.alternate);
                    var alternate = ctx.createTypeInfo(node.alternate);
                    result.copy(alternate);
                    var consequent = new Annotation(node.consequent);
                    consequent.eliminate();
                }
            } else {
                // We can't decide, thus traverse both;
                root.traverse(node.consequent);
                root.traverse(node.alternate);
                var consequent = ctx.createTypeInfo(node.consequent),
                    alternate = ctx.createTypeInfo(node.alternate);


                if (consequent.equals(alternate)) {
                    result.copy(consequent);
                } else if (consequent.canNumber() && alternate.canNumber()) {
                    result.setType(TYPES.NUMBER);
                }
                else if (test.isNullOrUndefined()) {
                    result.setType(alternate.getType())
                } else {
                    // We don't allow dynamic types (the type of the result depends on the value of it's operands).
                    // At this point, the expression needs to evaluate to a result, otherwise it's an error
                    throw Shade.throwError(node, "Static evaluation not implemented yet");
                }
            }
            return VisitorOption.Skip;

        },
        Literal: function (literal) {
            //console.log(literal);
            var value = literal.raw !== undefined ? literal.raw : literal.value,
                result = new Annotation(literal);

            var number = parseFloat(value);

            if (!isNaN(number)) {
                if (value.indexOf(".") == -1) {
                    result.setType(TYPES.INT);
                }
                else {
                    result.setType(TYPES.NUMBER);
                }
                result.setStaticValue(number);
            } else if (value === 'true') {
                result.setType(TYPES.BOOLEAN);
                result.setStaticValue(true);
            } else if (value === 'false') {
                result.setType(TYPES.BOOLEAN);
                result.setStaticValue(false);
            } else if (value === 'null') {
                result.setType(TYPES.NULL);
            } else {
                result.setType(TYPES.STRING);
                result.setStaticValue(value);
            }
        }
    }

    var handlers = {
        AssignmentExpression: function (node, ctx) {
            var right = ctx.createTypeInfo(node.right),
                result = new Annotation(node);

            result.copy(right);
            if (node.left.type == Syntax.Identifier) {
                var name = node.left.name;
                if (ctx.inDeclaration === true) {
                    ctx.declareVariable(name, true, result)
                }
                ctx.updateExpression(name, right);
            } else {
                throw new Error("Assignment expression");
            }
        },


        NewExpression: function(node, parent, ctx) {
            var result = new Annotation(node);

            var entry = ctx.getBindingByName(node.callee.name);
            //console.error(entry);
            if (entry && entry.hasConstructor()) {
                var constructor = entry.getConstructor();
                var args = Annotation.createAnnotatedNodeArray(node.arguments, ctx);
                var extra = constructor.evaluate(result, args, ctx);
                result.setFromExtra(extra);
            }
           else {
                throw new Error("ReferenceError: " + node.callee.name + " is not defined");
            }
        },

        UnaryExpression: function (node, ctx) {
            var result = new Annotation(node),
                argument = ctx.createTypeInfo(node.argument),
                operator = node.operator,
                func = UnaryFunctions[operator];

            switch (operator) {
                case "!":

                    result.setType(TYPES.BOOLEAN);
                    break;
                case "+":
                case "-":
                    if (argument.canInt()) {
                        result.setType(TYPES.INT);
                    } else if (argument.canNumber()) {
                        result.setType(TYPES.NUMBER);
                    } else {
                        throw new Error("Can't evaluate '" + operator + '" for ' + argument);
                    }
                    break;
                case "~":
                case "typeof":
                case "void":
                case "delete":
                default:
                    throw new Error("Operator not yet supported: " + operator);
            }
            if (argument.hasStaticValue()) {
                result.setStaticValue(func(argument.getStaticValue()));
            } else {
                result.setDynamicValue();
            }

        },


        Identifier: function (node, ctx) {
            var result = new Annotation(node),
                name = node.name;

            if (name === "undefined") {
                result.setType(TYPES.UNDEFINED);
                return;
            }
        },



        LogicalExpression: function (node, ctx) {
            var left = ctx.createTypeInfo(node.left),
                right = ctx.createTypeInfo(node.right),
                result = new Annotation(node),
                operator = node.operator;

            if (!(operator == "&&" || operator == "||"))
                throw new Error("Operator not supported: " + node.operator);

            if (left.isNullOrUndefined()) {  // evaluates to false
                if (operator == "||") {      // false || x = x
                    result.copy(right);
                    left.eliminate();
                } else {                     // false && x = false
                    result.copy(left);
                    right.eliminate();
                }
            } else if (left.isObject() && operator == "||") { // An object that is not null evaluates to true
                result.copy(left);
                right.eliminate();
            }
            else if (left.getType() == right.getType()) {
                if (left.isObject() && left.getKind() != right.getKind()) {
                    throw new Error("Can't evaluate logical expression with two different kind of objects");
                }
                result.copy(left); // TODO: Static value?
            }
            else {
                // We don't allow dynamic types (the type of the result depends on the value of it's operands).
                // At this point, the expression needs to evaluate to a result, otherwise it's an error
                throw new Error("Static evaluation not implemented yet");
            }
        },


        BinaryExpression: function (node, ctx) {
            //console.log(node.left, node.right);
            var left = ctx.createTypeInfo(node.left),
                right = ctx.createTypeInfo(node.right),
                result = new Annotation(node),
                operator = node.operator,
                func = BinaryFunctions[operator];

            switch (operator) {
                case "+":
                case "-":
                case "*":
                case "/":
                case "%":
                    // int 'op' int => int
                    // int / int => number
                    if (left.isInt() && right.isInt()) {
                        if (operator == "/")
                            result.setType(TYPES.NUMBER);
                        else
                            result.setType(TYPES.INT);
                    }
                    // int 'op' number => number
                    else if (left.isInt() && right.isNumber() || right.isInt() && left.isNumber())
                        result.setType(TYPES.NUMBER);
                    // number 'op' number => number
                    else if (left.isNumber() && right.isNumber())
                        result.setType(TYPES.NUMBER);
                    // int 'op' null => int
                    else if (left.isInt() && right.isNullOrUndefined() || right.isInt() && left.isNullOrUndefined()) {
                        result.setType(TYPES.INT);
                    }
                    // number 'op' null => number
                    else if ((left.isNumber() && right.isNullOrUndefined()) || (right.isNumber() && left.isNullOrUndefined())) {
                        result.setType(TYPES.NUMBER);
                    }
                    else {
                        //console.error(node, left.getType(), operator, right.getType());
                        Shade.throwError(node, "Evaluates to NaN: " + left.getTypeString() + " " + operator + " " + right.getTypeString());
                    }
                    break;
                case "===":
                case "!==":
                    result.setType(TYPES.BOOLEAN);
                    if (left.isUndefined() || right.isUndefined()) {
                        var value = left.isUndefined() && right.isUndefined();
                        result.setStaticValue(operator == "===" ? value : !value);
                        return;
                    }
                    break;
                case "==": // comparison
                case "!=":
                case ">":
                case "<":
                case ">=":
                case "<=":
                    result.setType(TYPES.BOOLEAN);
                    if (left.isUndefined() || right.isUndefined()) {
                        var value = left.isUndefined() && right.isUndefined();
                        result.setStaticValue(operator == "!=" ? !value : value);
                        return;
                    }
                    break;
                default:
                    throw new Error("Operator not supported: " + operator);
            }
            if (left.hasStaticValue() && right.hasStaticValue()) {
                //console.log(left.getStaticValue(), operator, right.getStaticValue());
                result.setStaticValue(func(left.getStaticValue(), right.getStaticValue()));
            } else {
                result.setDynamicValue();
            }

        },


        MemberExpression: function (node, parent, ctx, root) {
            var resultType = ctx.createTypeInfo(node),
                objectAnnotation = new Annotation(node.object),
                propertyAnnotation = new Annotation(node.property),
                propertyName = node.property.name;

            //console.log("Member", node.object.name, node.property.name);
            if (node.computed) {
                if (objectAnnotation.isArray()) {
                    // Property is computed, thus it could be a variable
                    var propertyType =  ctx.createTypeInfo(node.property);
                    if (!propertyType.canInt()) {
                        Shade.throwError(node, "Expected 'int' type for array accessor");
                    }
                    var elementInfo = objectAnnotation.getArrayElementType();
                    resultType.setType(elementInfo.type, elementInfo.kind);
                    return;
                }
                else {
                    Shade.throwError(node, "TypeError: Cannot read property '"+ propertyName + "' of " + objectAnnotation.getTypeString());
                }
            }

            var objectOfInterest = getObjectReferenceFromNode(node.object, ctx);

            objectOfInterest || Shade.throwError(node,"ReferenceError: " + node.object.name + " is not defined. Context: " + ctx.str());

            if (objectOfInterest.getType() == TYPES.UNDEFINED) {  // e.g. var a = undefined; a.unknown;
                Shade.throwError(node, "TypeError: Cannot read property '"+ propertyName +"' of undefined")
            }
            if (objectOfInterest.getType() != TYPES.OBJECT) { // e.g. var a = 5; a.unknown;
                resultType.setType(TYPES.UNDEFINED);
                return;
            }

            var objectInfo = ctx.getObjectInfoFor(objectOfInterest);
            if(!objectInfo)
                Shade.throwError(node, "Internal: Incomplete registration for object: " + objectOfInterest.getTypeString() + ", " + JSON.stringify(node.object));

            objectAnnotation.copy(objectOfInterest);
            if (!objectInfo.hasOwnProperty(propertyName)) {
                resultType.setType(TYPES.UNDEFINED);
                propertyAnnotation.setType(TYPES.UNDEFINED);
                return;
            }

            var propertyTypeInfo = objectInfo[propertyName];
            propertyAnnotation.setFromExtra(propertyTypeInfo);
            resultType.setFromExtra(propertyTypeInfo);
        },

        CallExpression: function (node, ctx, root) {
            var result = new Annotation(node);

            // Call on an object, e.g. Math.cos()
            if (node.callee.type == Syntax.MemberExpression) {
                var callingObject = getObjectReferenceFromNode(node.callee, ctx);

                if (!callingObject.isFunction()) { // e.g. Math.PI()
                    Shade.throwError(node, "TypeError: Object #<" + callingObject.getType()+ "> has no method '"+ node.callee.property.name + "'");
                }

                var object = node.callee.object,
                    propertyName = node.callee.property.name;

                var objectReference = getObjectReferenceFromNode(object, ctx);
                if(!objectReference)  {
                    Shade.throwError(node, "Internal: No object info for: " + object);
                }

                var objectInfo = ctx.getObjectInfoFor(objectReference);
                if(!objectInfo) { // Every object needs an info, otherwise we did something wrong
                    Shade.throwError(node, "Internal Error: No object registered for: " + objectReference.getTypeString() + JSON.stringify(node.object));
                }
                if (objectInfo.hasOwnProperty(propertyName)) {
                    var propertyHandler = objectInfo[propertyName];
                    if (typeof propertyHandler.evaluate == "function") {
                        var args = Annotation.createAnnotatedNodeArray(node.arguments, ctx);
                        var extra = propertyHandler.evaluate(result, args, ctx, objectReference);
                        result.setFromExtra(extra);
                        return;
                    }
                }
            }  else if (node.callee.type == Syntax.Identifier) {
                var functionName = node.callee.name;
                var func = ctx.getBindingByName(functionName);
                if (!func) {
                    Shade.throwError(node, "ReferenceError: " + functionName + " is not defined");
                }
                if(!func.isFunction()) {
                    Shade.throwError(node, "TypeError: " + func.getTypeString() + " is not a function");
                }
                var args = Annotation.createAnnotatedNodeArray(node.arguments, ctx);
                var definingContext = ctx.getContextForName(functionName);
                try {
                var extra = root.getFunctionInformationFor(ctx.getVariableIdentifier(functionName), args, definingContext);
                } catch(e) {
                    Shade.throwError(node, "Failure in function call: " + e.message);
                }
                extra && result.setFromExtra(extra);
                node.callee.name = extra.newName;
                return;
            }

                /*case Syntax.Identifier:
                    var functionName = node.callee.name;
                    var func = ctx.getBindingByName(functionName);
                    if (!(func && func.isInitialized())) {
                        throw new Error(functionName + " is not defined. Context: " + ctx.str());
                    }
                    // console.log(func);
                    //throw new Error("Can't call " + functionName + "() in this context: " + ctx.str());
                    break;
                default:   */
                        throw new Error("Unhandled CallExpression:" + node.callee.type);

        }
    };

    var enterExpression = function (node, parent, ctx) {
        if (enterHandlers.hasOwnProperty(node.type)) {
            return enterHandlers[node.type](node, parent, ctx, this);
        }
    };

    var exitExpression = function (node, parent, ctx) {

        switch (node.type) {
            case Syntax.AssignmentExpression:
                handlers.AssignmentExpression(node, ctx);
                break;
            case Syntax.ArrayExpression:
                log(node.type + " is not handle yet.");
                break;
            case Syntax.ArrayPattern:
                log(node.type + " is not handle yet.");
                break;
            case Syntax.BinaryExpression:
                handlers.BinaryExpression(node, ctx);
                break;
            case Syntax.CallExpression:
                handlers.CallExpression(node, ctx, this);
                break;
            case Syntax.ConditionalExpression:
                break;
            case Syntax.FunctionExpression:
                log(node.type + " is not handle yet.");
                break;
            case Syntax.Identifier:
                handlers.Identifier(node, ctx);
                break;
            case Syntax.Literal:
                break;
            case Syntax.LogicalExpression:
                handlers.LogicalExpression(node, ctx);
                break;
            case Syntax.MemberExpression:
                handlers.MemberExpression(node, parent, ctx, this);
                break;
            case Syntax.NewExpression:
                handlers.NewExpression(node, parent, ctx);
                break;
            case Syntax.ObjectExpression:
                log(node.type + " is not handle yet.");
                break;
            case Syntax.ObjectPattern:
                log(node.type + " is not handle yet.");
                break;
            case Syntax.Property:
                log(node.type + " is not handle yet.");
                break;
            case Syntax.SequenceExpression:
                log(node.type + " is not handle yet.");
                break;
            case Syntax.ThisExpression:
                break;
            case Syntax.UnaryExpression:
                handlers.UnaryExpression(node, ctx);
                break;
            case Syntax.UpdateExpression:
                log(node.type + " is not handle yet.");
                break;
            case Syntax.YieldExpression:
                log(node.type + " is not handle yet.");
                break;
            default:
                throw new Error('Unknown node type: ' + node.type);


        }

    };


    ns.enterExpression = enterExpression;
    ns.exitExpression = exitExpression;
}(exports));

},{"../../interfaces.js":38,"./../../base/annotation.js":20,"./../../base/index.js":22,"estraverse":4}],7:[function(require,module,exports){
(function (ns) {

    var walk = require('estraverse'),
        enterExpression = require('./infer_expression.js').enterExpression,
        exitExpression = require('./infer_expression.js').exitExpression,
        Syntax = require('estraverse').Syntax,
        TYPES = require("../../interfaces.js").TYPES,
        Annotation = require("./../../base/annotation.js").Annotation,
        FunctionAnnotation = require("./../../base/annotation.js").FunctionAnnotation;

    var log = function(str) {};
    //var log = function() { console.log.apply(console, arguments); };

    var enterHandler = {
        ForStatement: function(node, ctx, root) {
            var ctx = root.createContext(node, ctx);
            root.pushContext(ctx);

            root.traverse(node.init);
            root.traverse(node.test);

            var test = new Annotation(node.test);
            if (test.hasStaticValue()) { // Great! We can evaluate it!
                // TODO
            }

            root.traverse(node.update);
            root.traverse(node.body);
            root.popContext();
            return walk.VisitorOption.Skip;
        },

        IfStatement: (function() {

            var c_evaluate = function(exp) {
                return !!exp;
            }

            return function(node, ctx, root) {
                root.traverse(node.test);
                var test = new Annotation(node.test);
                if (test.hasStaticValue()) { // Great! We can evaluate it!
                    //console.log("Static value in if test!");
                    var testResult = c_evaluate(test.getStaticValue());
                    if(!testResult) {
                        if (node.alternate)
                            root.traverse(node.alternate);

                        var consequent = new Annotation(node.consequent);
                        consequent.eliminate();
                    } else {
                        root.traverse(node.consequent);
                        if(node.alternate) {
                            var alternate = new Annotation(node.alternate);
                            alternate.eliminate();
                        }
                    }
                    return walk.VisitorOption.Skip;
                }
            }
        }()),

        VariableDeclaration: function(node, ctx) {
            ctx.inDeclaration = true;
        },


        /**
         * @param {Object} node
         * @param {Context} parentContext
         * @param {TypeInference} root
         */
        FunctionDeclaration: function(node, parentContext, root) {
            var result = new FunctionAnnotation(node);

            if (node.id.type != Syntax.Identifier) {
                throw new Error("Dynamic variable names are not yet supported");
            }
            var functionName = node.id.name;
            var functionContext = root.createContext(node, parentContext, functionName);
            functionContext.declareParameters(node.params);
            root.pushContext(functionContext);
            if(functionContext.str() != root.entryPoint) {
                return walk.VisitorOption.Skip;
            }
        }
    }

    var exitHandler = {
        /**
         * @param node
         * @param {Context} ctx
         * @param {TypeInference} root
         */
        FunctionDeclaration: function(node, ctx, root) {
            var result = new FunctionAnnotation(node);
            var returnInfo = ctx.getReturnInfo();
            result.setReturnInfo(returnInfo || { type: TYPES.UNDEFINED });
            root.popContext();
        },
        VariableDeclaration: function(node, ctx) {
            ctx.inDeclaration = false;
        },
        VariableDeclarator: function(node, ctx) {
            var result = new Annotation(node);

            if (node.id.type != Syntax.Identifier) {
                throw new Error("Dynamic variable names are not yet supported");
            }
            var variableName = node.id.name;
            ctx.declareVariable(variableName, true, result);

            if (node.init) {
                var init = ctx.createTypeInfo(node.init);
                result.copy(init);
                ctx.updateExpression(variableName, init);
            } else {
                result.setType(TYPES.UNDEFINED);
            }
            // TODO: result.setType(init.getType());
        },
        ReturnStatement: function(node, parent, ctx) {
            var result = new Annotation(node),
                argument = node.argument ? ctx.createTypeInfo(node.argument) : null;

            if (argument) {
                result.copy(argument);
            } else {
                result.setType(TYPES.UNDEFINED);
            }
            ctx.updateReturnInfo(result);
        }

    }




    var enterStatement = function (node, parent, ctx) {
        switch (node.type) {
            case Syntax.ForStatement:
                return enterHandler.ForStatement(node, ctx, this);
            case Syntax.IfStatement:
                return enterHandler.IfStatement(node, ctx, this);
            case Syntax.VariableDeclaration:
                return enterHandler.VariableDeclaration(node, ctx);
            case Syntax.FunctionDeclaration:
                return enterHandler.FunctionDeclaration(node, ctx, this);

        }
        return;


    };

    var exitStatement = function (node, parent, ctx) {

        switch (node.type) {
            case Syntax.ExpressionStatement:
                var result = new Annotation(node),
                    expression = new Annotation(node.expression);

                result.copy(expression);

                break;
            case Syntax.BlockStatement:
                log(node.type + " is not handle yet.");
                break;
            case Syntax.BreakStatement:
                log(node.type + " is not handle yet.");
                break;
            case Syntax.CatchClause:
                log(node.type + " is not handle yet.");
                break;
            case Syntax.ContinueStatement:
                log(node.type + " is not handle yet.");
                break;
            case Syntax.DirectiveStatement:
                log(node.type + " is not handle yet.");
                break;
            case Syntax.DoWhileStatement:
                log(node.type + " is not handle yet.");
                break;
            case Syntax.DebuggerStatement:
                log(node.type + " is not handle yet.");
                break;
            case Syntax.EmptyStatement:
                log(node.type + " is not handle yet.");
                break;
            case Syntax.ForStatement:
                log(node.type + " is not handle yet.");
                break;
            case Syntax.ForInStatement:
                log(node.type + " is not handle yet.");
                break;
            case Syntax.FunctionDeclaration:
                return exitHandler.FunctionDeclaration(node, ctx, this);
                break;
            case Syntax.IfStatement:
                break;
            case Syntax.LabeledStatement:
                log(node.type + " is not handle yet.");
                break;
            case Syntax.Program:
                break;
            case Syntax.ReturnStatement:
                return exitHandler.ReturnStatement(node, parent, ctx);
                break;
            case Syntax.SwitchStatement:
                log(node.type + " is not handle yet.");
                break;
            case Syntax.SwitchCase:
                log(node.type + " is not handle yet.");
                break;
            case Syntax.ThrowStatement:
                log(node.type + " is not handle yet.");
                break;
            case Syntax.TryStatement:
                log(node.type + " is not handle yet.");
                break;
            case Syntax.VariableDeclaration:
                return exitHandler.VariableDeclaration(node, ctx);
            case Syntax.VariableDeclarator:
                exitHandler.VariableDeclarator(node, ctx);
                break;
            case Syntax.WhileStatement:
                log(node.type + " is not handle yet.");
                break;
            case Syntax.WithStatement:
                log(node.type + " is not handle yet.");
                break;
            default:
                throw new Error('Unknown node type: ' + node.type);
        }

    };

    ns.enterStatement = enterStatement;
    ns.exitStatement = exitStatement;
}(exports));

},{"../../interfaces.js":38,"./../../base/annotation.js":20,"./infer_expression.js":6,"estraverse":4}],8:[function(require,module,exports){
(function(ns){

    var Shade = require("../../../interfaces.js"),
        TYPES = Shade.TYPES,
        KINDS = Shade.OBJECT_KINDS,
        Tools = require("./tools.js");

    var ColorClosureInstance = {
        multiply: {
            type: TYPES.FUNCTION,
            evaluate: function() {
                return {
                    type: TYPES.OBJECT,
                    kind: KINDS.COLOR_CLOSURE
                };
            }
        },
        add: {
            type: TYPES.FUNCTION,
            evaluate: function() {
                return {
                    type: TYPES.OBJECT,
                    kind: KINDS.COLOR_CLOSURE
                };
            }
        }
    };

    Tools.extend(ns, {
        id: "ColorClosure",
        kind: KINDS.COLOR_CLOSURE,
        object: null,
        instance: ColorClosureInstance
    });


}(exports));

},{"../../../interfaces.js":38,"./tools.js":15}],9:[function(require,module,exports){
(function (ns) {

    var objects = {
        Shade : require("./shade.js"),
        Matrix4 : require("./matrix.js"),
        Math : require("./math.js"),
        Vec2 : require("./vec2.js"),
        Vec3 : require("./vec3.js"),
        Color: require("./vec3.js"),
        Vec4 : require("./vec4.js"),
        Texture : require("./texture.js"),
        System: require("./system.js"),
        ColorClosure: require("./colorclosure.js")
    };

    exports.Registry = {
        name: "TypeInference",
        getByName: function(name) {
            var result = objects[name];
            return result || null;
        },
        getInstanceForKind: function(kind) {
            for(var obj in objects) {
                if (objects[obj].kind == kind) {
                    return objects[obj].instance;
                }
            }
            return null;
        }
    }

}(exports));

},{"./colorclosure.js":8,"./math.js":10,"./matrix.js":11,"./shade.js":12,"./system.js":13,"./texture.js":14,"./vec2.js":16,"./vec3.js":17,"./vec4.js":18}],10:[function(require,module,exports){
(function (ns) {

    var Shade = require("../../../interfaces.js"),
        TYPES = Shade.TYPES,
        Base = require("../../../base/index.js"),
        Tools = require("./tools.js");


    var evaluateMethod = function (name, paramCount, returnType) {
        /**
         * @param {Annotation} result
         * @param {Array.<Annotation>} args
         * @param {Context} ctx
         */
        return function (result, args, ctx) {
            if (paramCount != -1) { // Arbitrary number of arguments
                if (!args || args.length != paramCount) {
                    throw new Error("Invalid number of parameters for Math." + name + ", expected " + paramCount);
                }
            }

            var argArray = [];
            var isStatic = true;
            args.forEach(function (param, index) {
                if (!param.canNumber())
                    throw new Error("Parameter " + index + " has invalid type for Math." + name + ", expected 'number', but got " + param.getType());
                isStatic = isStatic && param.hasStaticValue();
                if (isStatic)
                    argArray.push(param.getStaticValue());
            });
            var typeInfo = {
                type: returnType || TYPES.NUMBER
            }
            if (isStatic) {
                typeInfo.staticValue = Math[name].apply(undefined, argArray);
            }
            return typeInfo;
        }
    }

    var MathObject = {
        random: {
            type: TYPES.FUNCTION,
            evaluate: function(node, args) {
                if (args.length)
                    throw new Error("Math.random has no parameters.");
                return {
                    type: TYPES.NUMBER
                }
            }
        },
        abs: {
            type: TYPES.FUNCTION,
            evaluate: function(result, args) {
                Tools.checkParamCount(result.node, "Math.abs", [1], args.length);
                var typeInfo = {};
                switch(args[0].getType()) {
                    case TYPES.NUMBER:
                    case TYPES.INT:
                        typeInfo.type = args[0].getType();
                        break;
                    default:
                        Shade.throwError(result.node, "InvalidType for Math.abs");
                }
                return typeInfo;
            }
        }
    };

    var MathConstants = ["E", "PI", "LN2", "LOG2E", "LOG10E", "PI", "SQRT1_2", "SQRT2"];
    var OneParameterNumberMethods = ["acos", "asin", "atan", "cos", "exp", "log", "round", "sin", "sqrt", "tan"];
    var OneParameterIntMethods = ["ceil", "floor"];
    var TwoParameterNumberMethods = ["atan2", "pow"];
    var ArbitraryParameterNumberMethods = ["max", "min"];

    MathConstants.forEach(function (constant) {
        MathObject[constant] = { type: TYPES.NUMBER, staticValue: Math[constant] };
    });

    OneParameterNumberMethods.forEach(function (method) {
        MathObject[method] = { type: TYPES.FUNCTION, evaluate: evaluateMethod(method, 1) };
    });

    TwoParameterNumberMethods.forEach(function (method) {
        MathObject[method] = { type: TYPES.FUNCTION, evaluate: evaluateMethod(method, 2) };
    });

    OneParameterIntMethods.forEach(function (method) {
        MathObject[method] = { type: TYPES.FUNCTION, evaluate: evaluateMethod(method, 1, TYPES.INT) };
    });

    ArbitraryParameterNumberMethods.forEach(function (method) {
        MathObject[method] = { type: TYPES.FUNCTION, evaluate: evaluateMethod(method, -1) };
    });

    Base.extend(ns, {
        id: "Math",
        object: {
            constructor: null,
            static: MathObject
        },
        instance: MathObject
    });


}(exports));

},{"../../../base/index.js":22,"../../../interfaces.js":38,"./tools.js":15}],11:[function(require,module,exports){
(function (ns) {

    var interfaces = require("../../../interfaces.js"),
    Tools = require("./tools.js");

    var TYPES = interfaces.TYPES,
        KINDS = interfaces.OBJECT_KINDS;

    var MatrixInstance = {
        transformPoint: {
            type: TYPES.UNDEFINED,
            evaluate: function(result, args) {
                Tools.checkParamCount(result.node, "Matrix::transformPoint", [1,2], args.length);
                var sourcePoint = targetPoint = args[0];
                if (!(sourcePoint.isObject() && sourcePoint.canNormal())) {
                    throw new Error("First argument of Matrix::transformPoint must evaluate to a point, found: " + sourcePoint.getTypeString());
                }


            }
        }
    }

    Tools.extend(ns, {
        id: "Matrix4",
        kind: "matrix4",
        object: {
            constructor: null,
            static: null
        },
        instance: MatrixInstance
    });

}(exports));

},{"../../../interfaces.js":38,"./tools.js":15}],12:[function(require,module,exports){
(function(ns){

    var Shade = require("../../../interfaces.js"),
        TYPES = Shade.TYPES,
        KINDS = Shade.OBJECT_KINDS,
        Base = require("../../../base/index.js"),
        Tools = require("./tools.js");

    var ShadeObject = {
        diffuse: {
            type: TYPES.FUNCTION,
            evaluate: function(result, args, ctx) {
                if (args.length < 1)
                    throw new Error("Shade.diffuse expects at least 1 parameter.")
                var normal = args[0];
                if(!(normal && normal.canNormal())) {
                    throw new Error("First argument of Shade.diffuse must evaluate to a normal");
                }
                if (args.length > 1) {
                    var color = args[1];
                    //console.log("Color: ", color.str(), color.getType(ctx));
                    if(!color.canColor()) {
                        throw new Error("Second argument of Shade.diffuse must evaluate to a color. Found: " + color.str());
                    }
                }
                return {
                    type: TYPES.OBJECT,
                    kind: KINDS.COLOR_CLOSURE
                };
            }
        },
        phong: {
            type: TYPES.FUNCTION,
            evaluate: function(result, args, ctx) {
                if (args.length < 1)
                    throw new Error("Shade.phong expects at least 1 parameter.")
                var normal = args[0];
                if(!(normal && normal.canNormal())) {
                    throw new Error("First argument of Shade.phong must evaluate to a normal");
                }
                if (args.length > 1) {
                    var shininess = args[1];
                    //console.log("Color: ", color.str(), color.getType(ctx));
                    if(!shininess.canNumber()) {
                        throw new Error("Second argument of Shade.phong must evaluate to a number. Found: " + color.str());
                    }
                }
                return {
                    type: TYPES.OBJECT,
                    kind: KINDS.COLOR_CLOSURE
                };
            }
        },
        clamp: {
            type: TYPES.FUNCTION,
            evaluate: function(result, args) {
                Tools.checkParamCount(result.node, "Shade.clamp", [3], args.length);

                if (args.every(function(e) { return e.canNumber(); })) {
                    var typeInfo = {
                        type: TYPES.NUMBER
                    }
                    if (Tools.allArgumentsAreStatic(args)) {
                        var callArgs = args.map(function(a) {return a.getStaticValue(); });
                        typeInfo.staticValue = Shade.Shade.clamp.apply(null, callArgs);
                    }
                    return typeInfo;
                }
                Shade.throwError(result.node, "Shade.clamp not supported with argument types: " + args.map(function(arg) { return arg.getTypeString(); }).join(", "));
            }
        },
        smoothstep: {
            type: TYPES.FUNCTION,
            evaluate: function(result, args, ctx) {
                Tools.checkParamCount(result.node, "Shade.smoothstep", [3], args.length);

                if (args.every(function(e) { return e.canNumber(); })) {
                    var typeInfo = {
                        type: TYPES.NUMBER
                    }
                    if (Tools.allArgumentsAreStatic(args)) {
                        var callArgs = args.map(function(a) {return a.getStaticValue(); });
                        typeInfo.staticValue = Shade.Shade.smoothstep.apply(null, callArgs);
                    }
                    return typeInfo;
                }
                Shade.throwError(result.node, "Shade.smoothstep not supported with argument types: " + args.map(function(arg) { return arg.getTypeString(); }).join(", "));
            }
        },
        step: {
            type: TYPES.FUNCTION,
            evaluate: function(result, args, ctx) {
                Tools.checkParamCount(result.node, "Shade.step", [2], args.length);

                if (args.every(function(e) { return e.canNumber(); })) {
                    var typeInfo = {
                        type: TYPES.NUMBER
                    }
                    if (Tools.allArgumentsAreStatic(args)) {
                        var callArgs = args.map(function(a) {return a.getStaticValue(); });
                        typeInfo.staticValue = Shade.Shade.step.apply(null, callArgs);
                    }
                    return typeInfo;
                }
                Shade.throwError(result.node, "Shade.step not supported with argument types: " + args.map(function(arg) { return arg.getTypeString(); }).join(", "));
            }
        },
        fract: {
            type: TYPES.FUNCTION,
            evaluate: Tools.Vec.anyVecArgumentEvaluate.bind(null, "Shade.fract")
        },
        mix: {
            type: TYPES.FUNCTION,
            evaluate: function(result, args, ctx) {
                Tools.checkParamCount(result.node, "Shade.mix", [3], args.length);

                var arg = args[0];

                var typeInfo = {};
                var cnt = Tools.Vec.checkAnyVecArgument("Shade.mix", args[0]);
                Base.extend(typeInfo, Tools.Vec.getType(cnt));

                if(!args[1].equals(args[0]))
                    Shade.throwError(result.node, "Shade.mix types of first two arguments do no match: got " + arg[0].getTypeString() +
                        " and " + arg[1].getTypeString() );
                if(!args[2].canNumber())
                    Shade.throwError(result.node, "Shade.mix third argument is not a number.");

                return typeInfo;
            }
        }
    };

    Base.extend(ns, {
        id: "Shade",
        object: {
            constructor: null,
            static: ShadeObject
        },
        instance: null
    });

}(exports));

},{"../../../base/index.js":22,"../../../interfaces.js":38,"./tools.js":15}],13:[function(require,module,exports){
(function(ns){

    var Shade = require("../../../interfaces.js"),
        TYPES = Shade.TYPES,
        KINDS = Shade.OBJECT_KINDS,
        Base = require("../../../base/index.js");

    var SystemObject = {
        coords: {
            type: TYPES.OBJECT,
            kind: KINDS.FLOAT3
        },
        normalizedCoords: {
            type: TYPES.OBJECT,
            kind: KINDS.FLOAT3
        },
        height: {
            type: TYPES.INT
        },
        width: {
            type: TYPES.INT
        }

    };

    Base.extend(ns, {
        id: "System",
        object: {
            constructor: null,
            static: SystemObject
        },
        instance: null
    });

}(exports));

},{"../../../base/index.js":22,"../../../interfaces.js":38}],14:[function(require,module,exports){
(function(ns){

    var Shade = require("../../../interfaces.js"),
        TYPES = Shade.TYPES,
        KINDS = Shade.OBJECT_KINDS,
        Tools = require("./tools.js");

    var TextureConstructor =  {
        type: TYPES.OBJECT,
        kind: KINDS.TEXTURE,
        /**
         * @param {Annotation} result
         * @param {Array.<Annotation>} args
         * @param {Context} ctx
         */
        evaluate: function(result, args, ctx) {
            Shade.throwError(result.node, "Construction of Textures is not supported." );
        }
    };

    var TextureStaticObject = {
    };

    var TextureInstance = {
    };
    Tools.Vec.attachVecMethods(TextureInstance, "Texture", 4, 2, ['sample2D']);


    Tools.extend(ns, {
        id: "Texture",
        kind: KINDS.TEXTURE,
        object: {
            constructor: TextureConstructor,
            static: TextureStaticObject
        },
        instance: TextureInstance
    });


}(exports));

},{"../../../interfaces.js":38,"./tools.js":15}],15:[function(require,module,exports){
(function(ns){
    var Base = require("../../../base/index.js");
    var Shade = require("../../../interfaces.js"),
        TYPES = Shade.TYPES,
        KINDS = Shade.OBJECT_KINDS,
        VecBase = require("../../../base/vec.js");

    var allArgumentsAreStatic = function (args) {
        return args.every(function (arg) {
            return arg.hasStaticValue()
        });
    }

    ns.checkParamCount = function(node, name, allowed, is) {
        if (allowed.indexOf(is) == -1) {
            Shade.throwError(node, "Invalid number of parameters for " + name + ", expected " + allowed.join(" or ") + ", found: " + is);
        }
    }

    ns.singleAccessor = function (name, obj, validArgCounts, staticValueFunction) {
        return {
            type: TYPES.FUNCTION,
            evaluate: function (result, args, ctx, callObject) {
                ns.checkParamCount(result.node, name, validArgCounts, args.length);
                var typeInfo =  args.length ? obj : { type: TYPES.NUMBER };

                if (staticValueFunction && callObject.hasStaticValue() && args.every(function(a) {return a.hasStaticValue(); })) {
                    typeInfo.staticValue = staticValueFunction(callObject.getStaticValue(), args);
                }
                return typeInfo;
            }
        }
    };

    ns.extend = Base.extend;

    var Vec = {
        TYPES: {
            1: { type: TYPES.NUMBER },
            2: { type: TYPES.OBJECT, kind: KINDS.FLOAT2 },
            3: { type: TYPES.OBJECT, kind: KINDS.FLOAT3 },
            4: { type: TYPES.OBJECT, kind: KINDS.FLOAT4 }
        },
        getType: function(destVector){
            return Vec.TYPES[destVector];
        },
        getStaticValue: function(typeInfo, methodName, args, callObject){
            if(callObject.hasStaticValue() && allArgumentsAreStatic(args)){
                var object = callObject.getStaticValue();
                var callArgs = args.map(function(a) {return a.getStaticValue(); });
                var method = object[methodName];
                if(method)
                    typeInfo.staticValue = method.apply(object, callArgs);
            }
        },
        checkAnyVecArgument: function(methodName, arg){
            var cnt;

            if(arg.canNumber()) cnt = 1;
            else if(arg.isOfKind(KINDS.FLOAT2)) cnt = 2;
            else if(arg.isOfKind(KINDS.FLOAT3)) cnt = 3;
            else if(arg.isOfKind(KINDS.FLOAT4)) cnt = 4;
            else Shade.throwError(result.node, "Invalid parameter for " + methodName + ", type '" +
                    arg.getTypeString() + "' is not supported");
            return cnt;
        },
        checkVecArguments: function(methodName, vecSize, withEmpty, argStart, result, args){
            withEmpty = (withEmpty || vecSize == 0);
            var allowed = [];
            for(var i = withEmpty ? 0 : 1; i <= vecSize; ++i) allowed.push(i + argStart);
            ns.checkParamCount(result.node, methodName, allowed, args.length);

            if(withEmpty && args.length - argStart == 0)
                return;

            if(args.length - argStart== 1 && args[0].canNumber())
                return;

            var idx = 0;
            for(var i = argStart; idx < vecSize && i < args.length; ++i){
                var arg= args[i], cnt;
                if(arg.canNumber()) cnt = 1;
                else if(arg.isOfKind(KINDS.FLOAT2)) cnt = 2;
                else if(arg.isOfKind(KINDS.FLOAT3)) cnt = 3;
                else if(arg.isOfKind(KINDS.FLOAT4)) cnt = 4;
                else if(arg.isOfKind(KINDS.MATRIX3)) cnt = 9;
                else if(arg.isOfKind(KINDS.MATRIX4)) cnt = 16;
                else Shade.throwError(result.node, "Invalid parameter for " + methodName + ", type '" + arg.getTypeString() + "' is not supported");
                idx += cnt;
            }

            if(idx < vecSize)
                Shade.throwError(result.node, "Invalid parameters for " + methodName + ", expected " + vecSize + " scalar values, got " + idx);
            else if(i < args.length){
                Shade.throwError(result.node, "Invalid parameters for " + methodName + ", too many parameters");
            }
        },

        vecEvaluate: function(objectName, methodName, destVecSize, srcVecSize, result, args, ctx, callObject){
            Vec.checkVecArguments(objectName + "." + methodName, srcVecSize, false, 0, result, args);

            var typeInfo = {};
            Base.extend(typeInfo, Vec.getType(destVecSize));

            Vec.getStaticValue(typeInfo, methodName, args, callObject);
            return typeInfo;
        },
        anyVecArgumentEvaluate: function(methodName, result, args, ctx, callObject){
            ns.checkParamCount(result.node, methodName, [1], args.length);
            var arg = args[0];

            var typeInfo = {};
            var cnt = Vec.checkAnyVecArgument(methodName, arg);
            Base.extend(typeInfo, Vec.getType(cnt));

            Vec.getStaticValue(typeInfo, methodName, args, callObject);
            return typeInfo;
        },

        optionalZeroEvaluate: function(objectName, methodName, destVecSize, zeroDestVecSize, srcVecSize, result, args, ctx, callObject) {
            var qualifiedName = objectName + "." + methodName;
            var typeInfo = {};

            if(args.length == 0){
                Base.extend(typeInfo, Vec.getType(zeroDestVecSize));
            }
            else{
                Vec.checkVecArguments(qualifiedName, srcVecSize, true, 0, result, args);
                Base.extend(typeInfo, Vec.getType(destVecSize));
            }
            Vec.getStaticValue(typeInfo, methodName, args, callObject);

            return typeInfo;
        },

        swizzleEvaluate: function(objectName, vecSize, swizzle, withSetter, result, args, ctx, callObject) {
            if(withSetter){
                return Vec.optionalZeroEvaluate(objectName, swizzle, vecSize, swizzle.length, swizzle.length,
                    result, args, ctx, callObject);
            }
            else{
                return Vec.vecEvaluate(objectName, swizzle, swizzle.length, 0, result, args, ctx, callObject);
            }
        },
        getSwizzleEvaluate: function(objectName, vecSize, swizzle){
            var indices = [], withSetter = (swizzle.length <= vecSize);
            for(var i = 0; withSetter && i < swizzle.length; ++i){
                var idx = VecBase.swizzleToIndex(swizzle.charAt(i));
                if(indices[idx])
                    withSetter = false;
                else
                    indices[idx] = true;
            }
            return  {
                type: TYPES.FUNCTION,
                evaluate: Vec.swizzleEvaluate.bind(null, objectName, vecSize, swizzle, withSetter)
            }
        },
        attachSwizzles: function (instance, objectName, vecCount){
            for(var s = 0; s < VecBase.swizzleSets.length; ++s){
                for(var count = 1; count <= 4; ++count){
                    var max = Math.pow(vecCount, count);
                     for(var i = 0; i < max; ++i){
                        var val = i;
                        var key = "";
                        for(var  j = 0; j < count; ++j){
                            var idx = val % vecCount;
                            val = Math.floor(val / vecCount);
                            key+= VecBase.swizzleSets[s][idx];
                        }
                        instance[key] = Vec.getSwizzleEvaluate(objectName, vecCount, key);
                    }
                }
            }
        },
        attachVecMethods: function(instance, objectName, destVecSize, srcVecSize, methodNames){
            for(var i = 0; i < methodNames.length; ++i){
                var methodName = methodNames[i];
                instance[methodName] = {
                    type: TYPES.FUNCTION,
                    evaluate: Vec.vecEvaluate.bind(null, objectName, methodName, destVecSize, srcVecSize)
                }
            }
        },

        getConstructorTypeInfo: function(objectName, vecSize, type, result, args){
            var argArray = [];
            var isStatic = true;
            args.forEach(function (param, index) {
                isStatic = isStatic && param.hasStaticValue();
                if (isStatic)
                    argArray.push(param.getStaticValue());
            });

            var typeInfo = Base.extend({}, type);

            if (isStatic) {
                var v = new Shade[objectName]();
                Shade[objectName].apply(v, argArray);
                typeInfo.staticValue = v;
            }
            return typeInfo;
        },

        constructorEvaluate: function(objectName, vecSize, result, args, ctx) {
            Vec.checkVecArguments(objectName, vecSize, true, 0, result, args);
            return Vec.getConstructorTypeInfo(objectName, vecSize, Vec.getType(vecSize), result, args);
        }

    };

    var Mat = {
        TYPES: {
            "Mat3": { type: { type: TYPES.OBJECT, kind: KINDS.MATRIX3 }, cols: 3, rows: 3 },
            "Mat4": { type: { type: TYPES.OBJECT, kind: KINDS.MATRIX4 }, cols: 4, rows: 4 }
        },
        getType: function(matName){
            return Mat.TYPES[matName].type;
        },
        getVecSize: function(matName){
            return Mat.TYPES[matName].cols * Mat.TYPES[matName].rows;
        },
        checkMatArguments: function(methodName, matName, withEmpty, result, args){
            if(args.length == 1 && (args[0].isOfKind(KINDS.MATRIX3) || args[0].isOfKind(KINDS.MATRIX4)))
                return;

            for(var i = 0; i < args.length; ++i){
                if(args[i].isOfKind(KINDS.MATRIX3) || args[i].isOfKind(KINDS.MATRIX4))
                    Shade.throwError(result.node, "Invalid parameter for " + methodName + ": Constructing Matrix from Matrix can only take one argument");
            }
            Vec.checkVecArguments(methodName, Mat.getVecSize(matName), withEmpty, 0, result, args);
        },

        matEvaluate: function(matName, methodName, result, args, ctx, callObject){
            Mat.checkMatArguments(matName + "." + methodName, matName, false, result, args);

            var typeInfo = {};
            Base.extend(typeInfo, Mat.getType(matName));

            Vec.getStaticValue(typeInfo, methodName, args, callObject);
            return typeInfo;
        },

        matConstructorEvaluate: function(matName, result, args, ctx){
            Mat.checkMatArguments(matName, matName, true, result, args);
            return Vec.getConstructorTypeInfo(matName, Mat.getVecSize(matName), Mat.getType(matName), result, args);
        },

        attachMatMethods: function(instance, matName, methodNames){
            for(var i = 0; i < methodNames.length; ++i){
                var methodName = methodNames[i];
                instance[methodName] = {
                    type: TYPES.FUNCTION,
                    evaluate: Mat.matEvaluate.bind(null, matName, methodName)
                }
            }
        },
        colEvaluate: function(matName, result, args, ctx, callObject) {
            var qualifiedName = matName + ".col";
            var typeInfo = {};

            var cols = Mat.TYPES[matName].cols, rows = Mat.TYPES[matName].rows;

            if(args.length > 1){
                Vec.checkVecArguments(qualifiedName, rows, true, 1, result, args);
                Base.extend(typeInfo, Mat.getType(matName));
            }
            else{
                ns.checkParamCount(result.node, qualifiedName, [1], args.length);
                Base.extend(typeInfo, Vec.getType(rows));
            }
            if(!args[0].canNumber()){
                Shade.throwError(result.node, "Invalid parameter for " + qualifiedName + ", first parameter must be a number.");
            }

            Vec.getStaticValue(typeInfo, "col", args, callObject);

            return typeInfo;
        }

    }

    ns.Vec = Vec;
    ns.Mat = Mat;
    ns.allArgumentsAreStatic = allArgumentsAreStatic;


}(exports));

},{"../../../base/index.js":22,"../../../base/vec.js":24,"../../../interfaces.js":38}],16:[function(require,module,exports){
(function(ns){

    var Shade = require("../../../interfaces.js"),
        TYPES = Shade.TYPES,
        KINDS = Shade.OBJECT_KINDS,
        Tools = require("./tools.js");

    var Vector2Constructor =  {
        type: TYPES.OBJECT,
        kind: KINDS.FLOAT2,
        /**
         * @param {Annotation} result
         * @param {Array.<Annotation>} args
         * @param {Context} ctx
         */
        evaluate: Tools.Vec.constructorEvaluate.bind(null, "Vec2", 2)
    };

    var Vector2StaticObject = {
    };

    var Vector2Instance = {
        length: {
            type: TYPES.FUNCTION,
            evaluate: Tools.Vec.optionalZeroEvaluate.bind(null,"Vec2", "length", 2, 1, 1)
        }
    };
    Tools.Vec.attachSwizzles(Vector2Instance, "Vec2", 2);
    Tools.Vec.attachVecMethods(Vector2Instance, "Vec2", 2, 2, ['add', 'sub', 'mul', 'div', 'mod']);
    Tools.Vec.attachVecMethods(Vector2Instance, "Vec2", 1, 2, ['dot']);
    Tools.Vec.attachVecMethods(Vector2Instance, "Vec2", 2, 0, ['normalize']);


    Tools.extend(ns, {
        id: "Vec2",
        kind: KINDS.FLOAT2,
        object: {
            constructor: Vector2Constructor,
            static: Vector2StaticObject
        },
        instance: Vector2Instance
    });


}(exports));

},{"../../../interfaces.js":38,"./tools.js":15}],17:[function(require,module,exports){
(function(ns){

    var Shade = require("../../../interfaces.js"),
        TYPES = Shade.TYPES,
        KINDS = Shade.OBJECT_KINDS,
        Tools = require("./tools.js");

    var Vector3Constructor =  {
        type: TYPES.OBJECT,
        kind: KINDS.FLOAT3,
        /**
         * @param {Annotation} result
         * @param {Array.<Annotation>} args
         * @param {Context} ctx
         */
        evaluate: Tools.Vec.constructorEvaluate.bind(null, "Vec3", 3)
    };

    var Vector3StaticObject = {
    };

    var Vector3Instance = {
        length: {
            type: TYPES.FUNCTION,
            evaluate: Tools.Vec.optionalZeroEvaluate.bind(null,"Vec3", "length", 3, 1, 1)
        }
    };
    Tools.Vec.attachSwizzles(Vector3Instance, "Vec3", 3);
    Tools.Vec.attachVecMethods(Vector3Instance, "Vec3", 3, 3, ['add', 'sub', 'mul', 'div', 'mod']);
    Tools.Vec.attachVecMethods(Vector3Instance, "Vec3", 1, 3, ['dot']);
    Tools.Vec.attachVecMethods(Vector3Instance, "Vec3", 3, 0, ['normalize']);


    Tools.extend(ns, {
        id: "Vec3",
        kind: KINDS.FLOAT3,
        object: {
            constructor: Vector3Constructor,
            static: Vector3StaticObject
        },
        instance: Vector3Instance
    });


}(exports));

},{"../../../interfaces.js":38,"./tools.js":15}],18:[function(require,module,exports){
(function(ns){

    var Shade = require("../../../interfaces.js"),
        TYPES = Shade.TYPES,
        KINDS = Shade.OBJECT_KINDS,
        Tools = require("./tools.js");

    var Vector4Constructor =  {
        type: TYPES.OBJECT,
        kind: KINDS.FLOAT4,
        /**
         * @param {Annotation} result
         * @param {Array.<Annotation>} args
         * @param {Context} ctx
         */
        evaluate: Tools.Vec.constructorEvaluate.bind(null, "Vec4", 4)
    };

    var Vector4StaticObject = {
    };

    var Vector4Instance = {
        length: {
            type: TYPES.FUNCTION,
            evaluate: Tools.Vec.optionalZeroEvaluate.bind(null,"Vec4", "length", 4, 1, 1)
        }
    };
    Tools.Vec.attachSwizzles(Vector4Instance, "Vec4", 4);
    Tools.Vec.attachVecMethods(Vector4Instance, "Vec4", 4, 4, ['add', 'sub', 'mul', 'div', 'mod']);
    Tools.Vec.attachVecMethods(Vector4Instance, "Vec4", 1, 4, ['dot']);
    Tools.Vec.attachVecMethods(Vector4Instance, "Vec4", 4, 0, ['normalize']);


    Tools.extend(ns, {
        id: "Vec4",
        kind: KINDS.FLOAT4,
        object: {
            constructor: Vector4Constructor,
            static: Vector4StaticObject
        },
        instance: Vector4Instance
    });


}(exports));

},{"../../../interfaces.js":38,"./tools.js":15}],19:[function(require,module,exports){
(function (ns) {
    /**
     * Shade.js specific type inference that is also inferring
     * virtual types {@link Shade.TYPES }
     */

    var walk = require('estraverse'),
        enterExpression = require('./infer_expression.js').enterExpression,
        exitExpression = require('./infer_expression.js').exitExpression,
        enterStatement = require('./infer_statement.js').enterStatement,
        exitStatement = require('./infer_statement.js').exitStatement,

        ObjectRegistry = require("./registry/index.js").Registry,
        Context = require("./../../base/context.js").getContext(ObjectRegistry),
        Base = require("../../base/index.js"),
        Annotation = require("./../../base/annotation.js").Annotation,
        FunctionAnnotation = require("./../../base/annotation.js").FunctionAnnotation;



    var Syntax = walk.Syntax;


    var registerGlobalContext = function (program) {
        var ctx = new Context(program, null, {name: "global"});
        ctx.registerObject("Math", ObjectRegistry.getByName("Math"));
        ctx.registerObject("Color", ObjectRegistry.getByName("Color"));
        ctx.registerObject("Vec2", ObjectRegistry.getByName("Vec2"));
        ctx.registerObject("Vec3", ObjectRegistry.getByName("Vec3"));
        ctx.registerObject("Vec4", ObjectRegistry.getByName("Vec4"));
        ctx.registerObject("Texture", ObjectRegistry.getByName("Texture"));
        ctx.registerObject("Shade", ObjectRegistry.getByName("Shade"));
        ctx.registerObject("this", ObjectRegistry.getByName("System"));
        return ctx;
    }

    var TypeInference = function (root, opt) {
        opt = opt || {};
        this.root = root;
        this.context = [];
        /** @type {Object.<String, Array.<TypeInfo>} **/
        this.injections = {};
        this.entryPoint = opt.entry || "global.shade";
        this.root.injections = this.injections;
        this.functions = {
            orig: {},
            derived: {}
        }

    }

    Base.extend(TypeInference.prototype, {
        pushContext: function (context) {
            this.context.push(context);
            var injection = this.injections[context.str()];
            if (injection) {
                context.injectParameters(injection);
            }
        },
        popContext: function () {
            this.context.pop();
        },
        peekContext: function () {
            return this.context[this.context.length - 1];
        },
        createContext: function (node, parentContext, name) {
           var result = new Context(node, parentContext, {name: name } );
           return result;
        },

        annotateParameters: function(arr) {
            return arr ? arr.map(function(param) {
                var annotated =  new Annotation(param);
                return annotated;
            }) : [];
        },


        buildFunctionMap: function(prg) {
            var that = this;
            walk.replace(prg, {
                enter: function(node) {
                    if (node.type == Syntax.FunctionDeclaration) {
                        var result = new FunctionAnnotation(node);
                        var functionName = node.id.name;
                        var parentContext = that.peekContext();
                        var functionContext = that.createContext(node, parentContext, functionName);
                        functionContext.declareParameters(node.params);
                        parentContext.declareVariable(functionName);
                        parentContext.updateExpression(functionName, result);
                        that.pushContext(functionContext);
                        that.functions.orig[functionContext.str()] = node;
                    }
                },
                leave: function(node) {
                    if (node.type == Syntax.FunctionDeclaration) {
                        that.popContext();
                        return { type: Syntax.EmptyStatement };
                    }
                }
            });
           prg.body = prg.body.filter(function(a) { return a.type != Syntax.EmptyStatement; });
        },

        traverse: function (node) {
            walk.traverse(node, {
                enter: this.enterNode.bind(this),
                leave: this.exitNode.bind(this)
            });
            return node;
        },

        enterNode: function (node, parent) {
            var context = this.context[this.context.length - 1];
            return this.switchKind(node, parent, context, enterStatement, enterExpression);
        },

        exitNode: function (node, parent) {
            var context = this.context[this.context.length - 1];
            return this.switchKind(node, parent, context, exitStatement, exitExpression);
        },

        switchKind: function (node, parent, ctx, statement, expression) {
            switch (node.type) {
                case Syntax.BlockStatement:
                case Syntax.BreakStatement:
                case Syntax.CatchClause:
                case Syntax.ContinueStatement:
                case Syntax.DirectiveStatement:
                case Syntax.DoWhileStatement:
                case Syntax.DebuggerStatement:
                case Syntax.EmptyStatement:
                case Syntax.ExpressionStatement:
                case Syntax.ForStatement:
                case Syntax.ForInStatement:
                case Syntax.FunctionDeclaration:
                case Syntax.IfStatement:
                case Syntax.LabeledStatement:
                case Syntax.Program:
                case Syntax.ReturnStatement:
                case Syntax.SwitchStatement:
                case Syntax.SwitchCase:
                case Syntax.ThrowStatement:
                case Syntax.TryStatement:
                case Syntax.VariableDeclaration:
                case Syntax.VariableDeclarator:
                case Syntax.WhileStatement:
                case Syntax.WithStatement:
                    return statement.call(this, node, parent, ctx);

                case Syntax.AssignmentExpression:
                case Syntax.ArrayExpression:
                case Syntax.ArrayPattern:
                case Syntax.BinaryExpression:
                case Syntax.CallExpression:
                case Syntax.ConditionalExpression:
                case Syntax.FunctionExpression:
                case Syntax.Identifier:
                case Syntax.Literal:
                case Syntax.LogicalExpression:
                case Syntax.MemberExpression:
                case Syntax.NewExpression:
                case Syntax.ObjectExpression:
                case Syntax.ObjectPattern:
                case Syntax.Property:
                case Syntax.SequenceExpression:
                case Syntax.ThisExpression:
                case Syntax.UnaryExpression:
                case Syntax.UpdateExpression:
                case Syntax.YieldExpression:
                    return expression.call(this, node, parent, ctx);

                default:
                    throw new Error('Unknown node type: ' + node.type);
            }
        },

        /**
         *
         * @param {Object} functionAST
         * @param {Array.<TypeInfo> params
         * @param {Context} parentContext
         * @returns {*}
         */
        inferFunction: function (functionAST, params, parentContext) {
            var functionName = functionAST.id.name;
            var targetContextName = parentContext.getVariableIdentifier(functionName);
            this.injections[targetContextName] = params;

            // We have a specifc type set in params that we annotate to the
            // function AST
            for(var i = 0; i < params.length; i++) {
                if (i == functionAST.params.length)
                    break;
                var funcParam = new Annotation(functionAST.params[i]);
                funcParam.setFromExtra(params[i].getExtra());
            }

            var oldEntryPoint = this.entryPoint;
            this.entryPoint = targetContextName;
            this.pushContext(parentContext);
            //console.log("Starting to traverse: " + functionName + " in context " + parentContext.str())
            var ast = this.traverse(functionAST);
            this.popContext();
            this.entryPoint = oldEntryPoint;

            return ast;
        },

        inferProgram: function(prg, params) {
            var params = params || {};
            var programContext = registerGlobalContext(prg);

            this.pushContext(programContext);
            this.buildFunctionMap(prg);
            this.traverse(prg);
            this.popContext();

            var entryPoint = this.entryPoint;
            if (this.functions.orig.hasOwnProperty(entryPoint)) {
                var ast = this.functions.orig[entryPoint];
                var params = this.annotateParameters(params[entryPoint]);
                var aast = this.inferFunction(ast, params, programContext);
                for(var func in this.functions.derived) {
                    var variations = this.functions.derived[func];
                    for (var signature in variations) {
                        prg.body.push(variations[signature].ast);
                    }

                }
                prg.body.push(aast);

            }

            if (this.context.length)
                throw Error("Something went wrong");
            return prg;
        },
        getFunctionInformationFor: function(name, args, definingContext) {
            var signature = args.reduce(function(str, arg) { return str + arg.getTypeString()}, "");
            if (this.functions.derived.hasOwnProperty(name)) {
                var derivedFunction = this.functions.derived[name];
                if (derivedFunction.hasOwnProperty(signature)) {
                    return derivedFunction[signature].info;
                }
            }
            if (this.functions.orig.hasOwnProperty(name)) {
                var ast = this.functions.orig[name];
                var variations = this.functions.derived[name] = this.functions.derived[name] || {};
                var derived = variations[signature] = {};
                derived.ast = this.inferFunction(JSON.parse(JSON.stringify(ast)), args, definingContext);
                derived.info = derived.ast.extra.returnInfo;
                derived.info.newName = name.replace(/\./g, '_') + Object.keys(variations).length;
                derived.ast.id.name = derived.info.newName;
                return derived.info;
            }
            throw new Error("Could not resolve function " + name);
        }

    });


    ns.infer = function (ast, opt) {
        var ti = new TypeInference(ast, opt);
        return ti.inferProgram(ti.root, opt.inject);
    };


}(exports));

},{"../../base/index.js":22,"./../../base/annotation.js":20,"./../../base/context.js":21,"./infer_expression.js":6,"./infer_statement.js":7,"./registry/index.js":9,"estraverse":4}],20:[function(require,module,exports){
(function(ns){

    var Shade = require("../interfaces.js"),
        Syntax = require('estraverse').Syntax,
        Base = require("./index.js"),
        TypeInfo = require("./typeinfo.js").TypeInfo;

    var TYPES = Shade.TYPES,
        KINDS = Shade.OBJECT_KINDS;


    /**
     * @param {object} node
     * @param {object} extra
     * @extends TypeInfo
     * @constructor
     */
    var Annotation = function (node, extra) {
        TypeInfo.call(this, node, extra);
    };

    Base.createClass(Annotation, TypeInfo, {

        setCall : function(call) {
            var extra = this.getExtra();
            extra.evaluate = call;
        },
        getCall : function() {
            return this.getExtra().evaluate;
        },
        clearCall: function() {
            var extra = this.getExtra();
            delete extra.evaluate;
        },
        eliminate : function() {
            var extra = this.getExtra();
            extra.eliminate = true;
        },
        canEliminate : function() {
            var extra = this.getExtra();
            return extra.eliminate == true;
        }

    });

    /**
     * @param {Array.<object>} arr Array of nodes
     * @param {Context} ctx
     * @returns {Array.<Annotation>}
     */
    Annotation.createAnnotatedNodeArray = function(arr, ctx) {
        return arr.map(function (arg) {
            return ctx.createTypeInfo(arg);
        });
    }


    /**
     * @param {object} node
     * @param {object} extra
     * @extends Annotation
     * @constructor
     */
    var FunctionAnnotation = function (node, extra) {
        Annotation.call(this, node, extra);
        this.setType(TYPES.FUNCTION);
    };

    Base.createClass(FunctionAnnotation, Annotation, {
        getReturnInfo: function() {
            return this.getExtra().returnInfo;
        },
        setReturnInfo: function(info) {
            this.getExtra().returnInfo = info;
        },
        isUsed: function() {
            return !!this.getExtra().used;
        },
        setUsed: function(v) {
            this.getExtra().used = v;
        }
    });

    ns.Annotation = Annotation;
    ns.FunctionAnnotation = FunctionAnnotation;
    ns.ANNO = function(object){return new Annotation(object)};

}(exports));

},{"../interfaces.js":38,"./index.js":22,"./typeinfo.js":23,"estraverse":4}],21:[function(require,module,exports){
(function(ns){

    var Base = require("./index.js"),
        Shade = require("../interfaces.js"),
        TYPES = Shade.TYPES,
        Annotation = require("./annotation.js").Annotation,
        TypeInfo = require("./typeinfo.js").TypeInfo,
        Syntax = require('estraverse').Syntax;

    ns.getContext = function(registry) {

    /**
     *
     * @param binding
     * @extends TypeInfo
     * @constructor
     */
    var Binding = function(binding, registery) {
        TypeInfo.call(this, binding);
        if(this.node.ref) {
            if (!registery[this.node.ref])
                throw Error("No object has been registered for: " + this.node.ref);
            this.globalObject = registery[this.node.ref].object;
            if (this.globalObject) {
                this.setType(TYPES.OBJECT);
            }
        }
    };


    Base.createClass(Binding, TypeInfo, {
        hasConstructor: function() {
            return !!this.getConstructor();
        },
        getConstructor: function() {
            return this.globalObject && this.globalObject.constructor;
        },
        isInitialized: function() {
            return this.node.initialized;
        },
        setInitialized: function(v) {
            this.node.initialized = v;
        },
        hasStaticValue: function() {
            return false;
        },
        isGlobal: function() {
            return this.node.info && this.node.info._global || TypeInfo.prototype.isGlobal.call(this);
        },
        getType: function() {
            return this.globalObject? TYPES.OBJECT : TypeInfo.prototype.getType.call(this);
        },
        getObjectInfo: function() {
            if (this.globalObject)
                return this.globalObject.static;
            if (this.isObject()) {
                return this.node.info || registry.getInstanceForKind(this.getKind());
            }
            return null;
        },
        getInfoForSignature: function(signature) {
            var extra = this.getExtra();
            if(!extra.signatures)
                return null;
            return extra.signatures[signature];
        },
        setInfoForSignature: function(signature, info) {
            var extra = this.getExtra();
            if(!extra.signatures)
                extra.signatures = {};
            return extra.signatures[signature] = info;
        }


    })


    /**
     * @param {Context|null} parent
     * @param opt
     * @constructor
     */
    var Context = function(node, parent, opt) {
        opt = opt || {};

        /** @type (Context|null) */
        this.parent = parent || opt.parent || null;
        this.registery = parent ? parent.registery : {};

        this.context = node.context = node.context || {};

        /** @type {Object.<string, {initialized: boolean, annotation: Annotation}>} */
        this.context.bindings = this.context.bindings || {};
        if(opt.bindings) {
            Base.extend(this.context.bindings, opt.bindings);
        }

        this.context.name = opt.name || node.name || "<anonymous>";

    };

    Base.extend(Context.prototype, {

        getName: function() {
            return this.context.name;
        },

        getBindings: function() {
            return this.context.bindings;
        },

        updateReturnInfo: function(annotation) {
            this.context.returnInfo = annotation.getExtra();
        },
        getReturnInfo: function() {
            return this.context.returnInfo;
        },

        /**
         * @param {string} name
         * @returns {*}
         */
        getBindingByName: function(name) {
            var bindings = this.getBindings();
            var binding = bindings[name];
            if(binding !== undefined)
                return new Binding(binding, this.registery);
            if (this.parent)
                return this.parent.getBindingByName(name);
            return undefined;
        },

        /**
         * @param {string} name
         * @returns {Context|null}
         */
        getContextForName: function(name) {
            var bindings = this.getBindings();
            if(bindings[name] !== undefined)
                return this;
            if (this.parent)
                return this.parent.getContextForName(name);
            return null;
        },

        getVariableIdentifier: function(name) {
            var context = this.getContextForName(name);
            if(!context)
                return null;
            return context.str() + "." + name;
        },

        declareVariable: function(name, fail, position) {
            var bindings = this.getBindings();
            fail = (fail == undefined) ? true : fail;
            if (bindings[name]) {
                if (fail) {
                    throw new Error(name + " was already declared in this scope.")
                } else {
                    return false;
                }
            }

            var init = {
                initialized : false,
                initPosition: position,
                extra: {
                    type: TYPES.UNDEFINED
                }
            };
            bindings[name] = init;
            return true;
        },

        /**
         *
         * @param {string} name
         * @param {TypeInfo} typeInfo
         */
        updateExpression: function (name, typeInfo) {
            var v = this.getBindingByName(name);
            if (!v) {
                throw new Error("Variable was not declared in this scope: " + name);
            }
            if (v.isInitialized() && v.getType() !== typeInfo.getType()) {
                throw new Error("Variable may not change it's type: " + name);
            }
            if (!v.isInitialized()) {
                // Annotate the declaration, if one is given
                if(v.node.initPosition)
                    v.node.initPosition.copy(typeInfo);
            }

            v.copy(typeInfo);
            v.setDynamicValue();
            v.setInitialized(!typeInfo.isUndefined());
        },

        registerObject: function(name, obj) {
            this.registery[obj.id] = obj;
            var bindings = this.getBindings();
            bindings[name] = {
                extra: {
                    type: TYPES.OBJECT
                },
                ref: obj.id
            };
        },

        declareParameters: function(params) {
            var bindings = this.getBindings();
            this.params = [];
            for(var i = 0; i < params.length; i++) {
                var parameter = params[i];
                this.params[i] = parameter.name;
                bindings[parameter.name] = { type: TYPES.UNDEFINED };
            }
        },

        /**
         *
         * @param {Array.<TypeInfo>} <params
         */
        injectParameters: function(params) {
            for(var i = 0; i< params.length; i++) {
                if (i == this.params.length)
                    break;
                var name = this.params[i];
                var bindings = this.getBindings();
                bindings[name] = { extra: {} };
                Base.deepExtend(bindings[name].extra, params[i].getExtra());
                if (params[i].getNodeInfo()) {
                    bindings[name].info = {};
                    Base.deepExtend(bindings[name].info, params[i].getNodeInfo());
                }
            }
        },

        str: function() {
            var ctx = this;
            var names = [];
            while(ctx) {
                names.unshift(ctx.getName());
                ctx = ctx.parent;
            }
            return names.join(".");
        },

        getAllBindings: function() {
            var result = Object.keys(this.getBindings());
            if (this.parent) {
                var parentBindings = this.parent.getAllBindings();
                for(var i = 0; i < parentBindings.length; i++) {
                    if (result.indexOf(parentBindings[i]) !== -1) {
                        result.push(parentBindings[i]);
                    }
                }
            }
            return result;
        },

        /**
         *
         * @param node
         * @returns {TypeInfo}
         */
        createTypeInfo: function (node) {
            var result = new Annotation(node);
            if (node.type == Syntax.Identifier) {
                var name = node.name;
                var binding = this.getBindingByName(name);
                if (binding) {
                    result.copy(binding);
                    return binding;
                }
            }
            return result;
        },

        getObjectInfoFor: function(obj) {
            if (!obj.isObject())
                return null;

            /* The TypeInfo might know about it's object type */
            if (obj.getObjectInfo) {
                return obj.getObjectInfo();
            };

            var nodeInfo = obj.getNodeInfo();
            if (nodeInfo) {
                return nodeInfo;
            }
            return registry.getInstanceForKind(obj.getKind())
        }

    });


        return Context;

    };



}(exports));

},{"../interfaces.js":38,"./annotation.js":20,"./index.js":22,"./typeinfo.js":23,"estraverse":4}],22:[function(require,module,exports){
(function(ns){

    ns.extend = function(a, b) {
        for ( var prop in b) {
            var g = b.__lookupGetter__(prop), s = b.__lookupSetter__(prop);
            if (g||s) {
                if (g) {
                    a.__defineGetter__(prop, g);
                }
                if (s) {
                    a.__defineSetter__(prop, s);
                }
            } else {
                if (b[prop] === undefined) {
                    delete a[prop];
                } else if (prop !== "constructor" || a !== window) {
                    a[prop] = b[prop];
                }
            }
        }
        return a;
    };

    ns.deepExtend = function(destination, source) {
        for (var property in source) {
            if (typeof source[property] === "object" && source[property] !== null) {
                destination[property] = destination[property] || {};
                ns.deepExtend(destination[property], source[property]);
            } else {
                destination[property] = source[property];
            }
        }
    };

    /**
     *
     * @param {Object} ctor Constructor
     * @param {Object} parent Parent class
     * @param {Object=} methods Methods to add to the class
     * @return {Object!}
     */
    ns.createClass = function(ctor, parent, methods) {
        methods = methods || {};
        if (parent) {
            /** @constructor */
            var F = function() {
            };
            F.prototype = parent.prototype;
            ctor.prototype = new F();
            ctor.prototype.constructor = ctor;
            ctor.superclass = parent.prototype;
        }
        for ( var m in methods) {
            ctor.prototype[m] = methods[m];
        }
        return ctor;
    };


}(exports))

},{}],23:[function(require,module,exports){
(function(ns){

    var Shade = require("../interfaces.js"),
        Syntax = require('estraverse').Syntax,
        Base = require("./index.js");

    var TYPES = Shade.TYPES,
        KINDS = Shade.OBJECT_KINDS;


    /**
     * @param {*} node Carrier object for the type info, only node.extra gets polluted
     * @param {Object?} extra
     * @constructor
     */
    var TypeInfo = function (node, extra) {
        this.node = node;
        this.node.extra = this.node.extra || {};
        if (extra) {
            Base.deepExtend(this.node.extra, extra);
        }
    }

    TypeInfo.createForContext = function(node, ctx) {
        var result = new TypeInfo(node);
        if (result.getType() !== TYPES.ANY) {
            return result;
        }

        if (node.type == Syntax.Identifier) {
            var name = node.name;
            var variable = ctx.getBindingByName(name);
            return new TypeInfo(node, variable);
        }
        return result;
    }

    TypeInfo.prototype = {
        getExtra: function () {
            return this.node.extra;
        },
        getType: function () {
            var extra = this.getExtra();
            if (extra.type != undefined)
                return extra.type;
            return TYPES.ANY;
        },

        setKind: function (kind) {
            var extra = this.getExtra();
            extra.kind = kind;
        },

        getKind: function () {
            if (!this.isObject())
                return null;
            return this.getExtra().kind || KINDS.ANY;
        },

        getArrayElementType: function () {
            if(!this.isArray())
                throw new Error("Called getArrayElementType on " + this.getType());
            return this.getExtra().elements;
        },

        isOfKind: function(kind) {
            if (!this.isObject()) {
                return false;
            }
            return this.getKind() == kind;
        },

        /**
         * @param {string} type
         * @param {string?} kind
         */
        setType: function (type, kind) {
            var extra = this.getExtra();
            extra.type = type;
            if (kind)
                this.setKind(kind);
        },

        isOfType: function (type) {
            return this.getType() == type;
        },

        equals: function (other) {
            return this.getType() == other.getType() && this.getKind() == other.getKind();
        },

        isInt: function () {
            return this.isOfType(TYPES.INT);
        },
        isNumber: function () {
            return this.isOfType(TYPES.NUMBER);
        },
        isNullOrUndefined: function () {
            return this.isNull() || this.isUndefined();
        },
        isNull: function () {
            return this.isOfType(TYPES.NULL);
        },
        isUndefined: function () {
            return this.isOfType(TYPES.UNDEFINED);
        },
        isBool: function () {
            return this.isOfType(TYPES.BOOLEAN);
        },
        isString: function () {
            return this.isOfType(TYPES.STRING);
        },
        isArray: function () {
            return this.isOfType(TYPES.ARRAY);
        },
        isFunction: function () {
            return this.isOfType(TYPES.FUNCTION);
        },
        isObject: function () {
            return this.isOfType(TYPES.OBJECT);
        },
        isGlobal: function() {
            return !!this.getExtra().global;
        },
        setGlobal: function (global) {
            var extra = this.getExtra();
            extra.global = global;
        },
        canNumber: function () {
            return this.isNumber() || this.isInt() || this.isBool();
        },
        canInt: function () {
            return this.isInt() || this.isBool();
        },
        hasStaticValue : function() {
            var extra = this.getExtra();
            if (this.isNullOrUndefined())
                return true;
            return extra.hasOwnProperty("staticValue");
        },
        setStaticValue : function(v) {
            var extra = this.getExtra();
            if (this.isNullOrUndefined())
                throw("Null and undefined have predefined values.");
            extra.staticValue = v;
        },
        getStaticValue : function() {
            if (!this.hasStaticValue()) {
                throw new Error("Node has no static value: " + this.node);
            }
            if (this.isNull())
                return null;
            if (this.isUndefined())
                return undefined;
            return this.getExtra().staticValue;
        },
        setDynamicValue : function() {
            delete this.getExtra().staticValue;
        },
        setCall : function(call) {
            var extra = this.getExtra();
            extra.evaluate = call;
        },
        getCall : function() {
            return this.getExtra().evaluate;
        },
        clearCall: function() {
            var extra = this.getExtra();
            delete extra.evaluate;
        },
        copy: function(other) {
            Base.deepExtend(this.node.extra, other.getExtra());
        },
        str: function() {
            var extra = this.getExtra();
            return JSON.stringify(extra, null, 1);
        },
        canNormal: function() {
            return this.isObject() && (this.isOfKind(KINDS.NORMAL) || this.isOfKind(KINDS.FLOAT3));
        },
        canColor: function() {
            return this.isObject() && (this.isOfKind(KINDS.FLOAT4) || this.isOfKind(KINDS.FLOAT3));
        },
        eliminate : function() {
            var extra = this.getExtra();
            extra.eliminate = true;
        },
        canEliminate : function() {
            var extra = this.getExtra();
            return extra.eliminate == true;
        },
        setFromExtra: function(extra){
            this.setType(extra.type);
            if (extra.kind != undefined)
                this.setKind(extra.kind);
            this.setGlobal(extra.global);
            if (extra.staticValue != undefined)
                this.setStaticValue(extra.staticValue);
            if (extra.evaluate != undefined)
                this.setCall(extra.evaluate);
            if (extra.source != undefined)
                this.setSource(extra.source);
        },
        getNodeInfo: function() {
            if (this.isObject())
                return this.getExtra().info;
        },
        getTypeString: function() {
            if (this.isObject())
                return "Object #<" + this.getKind() + ">";
            return this.getType();
        },
        setSource: function(source) {
            var extra = this.getExtra();
            extra.source = source;
        },
        getSource: function() {
            return this.getExtra().source;
        }

    }

    ns.TypeInfo = TypeInfo;

}(exports));

},{"../interfaces.js":38,"./index.js":22,"estraverse":4}],24:[function(require,module,exports){
(function(ns){

    ns.swizzleToIndex = function(swizzleKey){
        switch(swizzleKey){
            case 'x':case 'r' :case 's': return 0;
            case 'y':case 'g' :case 't': return 1;
            case 'z':case 'b' :case 'p': return 2;
            case 'w':case 'a' :case 'q': return 3;
        }
        throw new Error("Unknown swizzle key: '" + swizzleKey + "'");
    };
    ns.indexToSwizzle = function(index){
        switch(index){
            case 0: return 'x';
            case 1: return 'y';
            case 2: return 'z';
            case 3: return 'w';
        }
        throw new Error("Unknown swizzle index: '" + index + "'");
    };
    ns.swizzleSets = [
        ['x', 'y', 'z', 'w'],
        ['r', 'g', 'b', 'a'],
        ['s', 't', 'p', 'q']
    ];

}(exports))

},{}],25:[function(require,module,exports){
(function (ns) {

    var Base = require("../../base/index.js");

    var Transformer = require("./transform.js").GLASTTransformer;
    var generate = require("./glsl-generate.js").generate;

    var GLSLCompiler = function () {

    };

    Base.extend(GLSLCompiler.prototype, {

        compileFragmentShader: function (aast, opt) {

            var transformer = new Transformer("global.shade");

            //console.log(JSON.stringify(aast, 0, " "));

            var transformed = transformer.transformAAST(aast);

            //console.log(JSON.stringify(aast, 0, " "));

            var code = generate(transformed, opt);

            return code;
        }

    });


    ns.GLSLCompiler = GLSLCompiler;

}(exports));

},{"../../base/index.js":22,"./glsl-generate.js":26,"./transform.js":37}],26:[function(require,module,exports){
(function (ns) {

    var FunctionAnnotation = require("./../../base/annotation.js").FunctionAnnotation;
    var Shade = require("./../../interfaces.js");
    var walk = require('estraverse'),
        Syntax = walk.Syntax,
        VisitorOption = walk.VisitorOption;

    var Types = Shade.TYPES,
        Kinds = Shade.OBJECT_KINDS,
        Sources = Shade.SOURCES;



    /**
     * @param {object} opt
     */
    var getHeader = function (opt) {
        if (opt.omitHeader == true)
            return [];
        var header = [
            "// Generated by shade.js"
        ];
        var floatPrecision = opt.floatPrecision || "mediump";
        header.push("precision " + floatPrecision + " float;");
        return header;
    }

    var toGLSLType = function (info, allowUndefined) {
        switch (info.type) {
            case Types.OBJECT:
                switch (info.kind) {
                    case Kinds.FLOAT4:
                        return "vec4";
                    case Kinds.FLOAT3:
                        return "vec3";
                    case Kinds.FLOAT2:
                        return "vec2";
                    case Kinds.TEXTURE:
                        return "sampler2D"
                    default:
                        return "<undefined>";
                }
            case Types.UNDEFINED:
                if (allowUndefined)
                    return "void";
                throw new Error("Could not determine type");
            case Types.NUMBER:
                return "float";
            case Types.BOOLEAN:
                return "bool";
            case Types.INT:
                return "int";
            case Types.BOOLEAN:
                return "bool";
            default:
                throw new Error("toGLSLType: Unhandled type: " + info.type);

        }
    }

    var toGLSLSource = function(info) {
        if (!info.source)
            return "";
        if (info.source == Sources.VERTEX)
            return "varying";
        if (info.source == Sources.UNIFORM)
            return "uniform";
        if (info.source == Sources.CONSTANT)
            return "const";
        throw new Error("toGLSLSource: Unhandled type: " + info.source);
    }

    function createLineStack() {
        var arr = [];
        arr.push.apply(arr, arguments);
        var indent = "";
        arr.appendLine = function(line){
            this.push(indent + line);
        };
        arr.changeIndention = function(add){
            while(add > 0){
                indent += "    "; add--;
            }
            if(add < 0){
                indent = indent.substr(0, indent.length + add*4);
            }
        };
        arr.append = function(str){
            this[this.length-1] = this[this.length-1] + str;
        };
        return arr;
    };


    /*Base.extend(LineStack.prototype, {

    });*/

    var generate = function (ast, opt) {

        opt = opt || {};

        var lines = createLineStack();

        traverse(ast, lines, opt);

        return lines.join("\n");
    }

    function traverse(ast, lines, opt) {
        var insideMain = false;


        walk.traverse(ast, {
                enter: function (node) {
                    try {
                        var type = node.type;
                        switch (type) {

                            case Syntax.Program:
                                getHeader(opt).forEach(function (e) {
                                    lines.push(e)
                                });
                                break;


                            case Syntax.FunctionDeclaration:
                                var func = new FunctionAnnotation(node);
                                var methodStart = [toGLSLType(func.getReturnInfo(), true)];
                                methodStart.push(node.id.name, '(');
                                if(node.id.name == "main")
                                    insideMain = true;

                                if (!(node.params && node.params.length)) {
                                    methodStart.push("void");
                                } else {
                                    node.params.forEach(function (param) {
                                        methodStart.push(toGLSLType(param.extra), param.name);
                                    })
                                }
                                methodStart.push(') {');
                                lines.appendLine(methodStart.join(" "));
                                lines.changeIndention(1);
                                return;


                            case Syntax.ReturnStatement:
                                var hasArguments = node.argument;
                                lines.appendLine("return " + (hasArguments ? handleExpression(node.argument) : "") + ";");
                                return;

                            case Syntax.VariableDeclarator :
                                // console.log("Meep!");
                                var source = !insideMain ? toGLSLSource(node.extra) : null;
                                var line = source ? source + " " : "";
                                line += toGLSLType(node.extra) + " " + node.id.name;
                                if (node.init) line += " = " + handleExpression(node.init);
                                lines.appendLine(line + ";");
                                return;

                            case Syntax.AssignmentExpression:
                                lines.appendLine(handleExpression(node) + ";")
                                return;

                            case Syntax.ExpressionStatement:
                                lines.appendLine(handleExpression(node.expression) + ";");
                                return VisitorOption.Skip;

                            case Syntax.IfStatement:
                                lines.appendLine("if(" + handleExpression(node.test) + ") {");

                                lines.changeIndention(1);
                                traverse(node.consequent, lines, opt);
                                lines.changeIndention(-1);

                                if (node.alternate) {
                                    lines.appendLine("} else {");
                                    lines.changeIndention(1);
                                    traverse(node.alternate, lines, opt);
                                    lines.changeIndention(-1);
                                }
                                lines.appendLine("}");
                                return VisitorOption.Skip;

                            case Syntax.ForStatement:
                                lines.appendLine("for (" + handleInlineDeclaration(node.init) + "; " + handleExpression(node.test) +"; " + handleExpression(node.update) + ") {");
                                lines.changeIndention(1);
                                traverse(node.body, lines, opt);
                                lines.changeIndention(-1);
                                lines.appendLine("}");
                                return VisitorOption.Skip;

                            case Syntax.ContinueStatement:
                                lines.appendLine("continue;");


                            default:
                            //console.log("Unhandled: " + type);

                        }
                    } catch (e) {
                        Shade.throwError(node, e.message);
                    }
                },
                leave: function (node) {
                    var type = node.type;
                    switch (type) {
                        case Syntax.Program:
                            break;
                        case Syntax.FunctionDeclaration:
                            lines.changeIndention(-1);
                            lines.appendLine("}");
                            break;
                    }
                }
            }
        );
    }

    var generateFloat = function(value) {
        if(isNaN(value))
            throw Error("Internal: Expression generated NaN!");
        var result = '' + value;
        if (result.indexOf(".") == -1) {
            result += ".0";
        }
        return result;
    }

    /**
     *
     * @param node
     * @returns {string}
     */
    var handleExpression = function(node) {
        var result = "<unhandled: " + node.type+ ">";
        switch(node.type) {
            case Syntax.NewExpression:
                result = toGLSLType(node.extra);
                result += handleArguments(node.arguments);
                break;

            case Syntax.Literal:
                var value = node.extra.staticValue !== undefined ? node.extra.staticValue : node.value;
                if (node.extra.type == Types.NUMBER)
                    result = generateFloat(value);
                else
                    result = value;
                break;


            case Syntax.Identifier:
                result = node.name;
                break;

            case Syntax.BinaryExpression:
            case Syntax.LogicalExpression:
            case Syntax.AssignmentExpression:
                result = handleBinaryArgument(node.left);
                result += " " + node.operator + " ";
                result += handleBinaryArgument(node.right);
                break;
            case Syntax.UnaryExpression:
                result = node.operator;
                result += handleBinaryArgument(node.argument);
                break;

            case Syntax.CallExpression:
                result = handleExpression(node.callee);
                result += handleArguments(node.arguments);
                break;

            case Syntax.MemberExpression:
                result = handleExpression(node.object);
                result += ".";
                result += handleExpression(node.property);
                break;

            case Syntax.ConditionalExpression:
                result = handleExpression(node.test);
                result += " ? ";
                result += handleExpression(node.consequent);
                result += " : ";
                result += handleExpression(node.alternate);
                break;

            case Syntax.UpdateExpression:
                result = "";
                if (node.isPrefix) {
                    result += node.operator;
                }
                result += handleExpression(node.argument);
                if (!node.isPrefix) {
                    result += node.operator;
                }
            default:
                //console.log("Unhandled: " , node.type);
        }
        return result;
    }


    function handleInlineDeclaration(node) {
        if (node.type != Syntax.VariableDeclaration)
            Shade.throwError(node, "Internal error in GLSL::handleInlineDeclaration");
        var result = node.declarations.reduce(function(declString, declaration){
            var decl = toGLSLType(declaration.extra) + " " + declaration.id.name;
            if (declaration.init) {
                decl += " = " + handleExpression(declaration.init);
            }
            return declString + decl;
        }, "");
        return result;
    }

    function handleBinaryArgument(node){
        var result = handleExpression(node);
        switch(node.type) {
            case Syntax.BinaryExpression:
            case Syntax.LogicalExpression:
            case Syntax.AssignmentExpression: result = "( " + result + " )"; break;
        }
        return result;
    }

    function handleArguments(container) {
        var result = "(";
        container.forEach(function (arg, index) {
            result += handleExpression(arg);
            if (index < container.length - 1) {
                result += ", ";
            }
        });
        return result + ")";
    }


    exports.generate = generate;


}(exports));

},{"./../../base/annotation.js":20,"./../../interfaces.js":38,"estraverse":4}],27:[function(require,module,exports){
(function(ns){

    var Shade = require("../../../interfaces.js");
    var Tools = require("./tools.js");

    var ColorClosureInstance = {

    };

    Tools.extend(ns, {
        id: "ColorClosure",
        kind: Shade.OBJECT_KINDS.COLOR_CLOSURE,
        object: {
            constructor: null,
            static: {}
        },
        instance: ColorClosureInstance
    });
}(exports));

},{"../../../interfaces.js":38,"./tools.js":33}],28:[function(require,module,exports){
(function(ns) {

    var objects = {
        //Color : require("./color.js"),
        Shade : require("./shade.js"),
        //Matrix4 : require("./matrix.js"),
        Math : require("./math.js"),
        System : require("./system.js"),
        Vec2 : require("./vec2.js"),
        Vec3 : require("./vec3.js"),
        Color: require("./vec3.js"),
        Vec4 : require("./vec4.js"),
        Texture : require("./texture.js"),
        ColorClosure: require("./colorclosure.js")
    };

    ns.Registry = {
        name: "GLSLTransformRegistry",
        getByName: function(name) {
            var result = objects[name];
            return result || null;
        },
        getInstanceForKind: function(kind) {
            for(var obj in objects) {
                if (objects[obj].kind == kind) {
                    return objects[obj].instance;
                }
            }
            return null;
        }
    }


}(exports));

},{"./colorclosure.js":27,"./math.js":29,"./shade.js":30,"./system.js":31,"./texture.js":32,"./vec2.js":34,"./vec3.js":35,"./vec4.js":36}],29:[function(require,module,exports){
(function(ns){

   var Shade = require("../../../interfaces.js");
   var Syntax = require('estraverse').Syntax;
   var Tools = require('./tools.js');

    var MathConstants = ["E", "PI", "LN2", "LOG2E", "LOG10E", "PI", "SQRT1_2", "SQRT2"];


    var handleIntVersion = function(node) {
        node.extra.type = Shade.TYPES.NUMBER;
        node.callee = Tools.removeMemberFromExpression(node.callee);
        return node;
    };

    var handleMathCall = function(opt) {
        opt = opt ||{};
        return function(node) {
            if (node.type !== Syntax.CallExpression) {
                Shade.throwError(node, "Internal Error in Math object");
            }
            // Cast all arguments of the math function to float, as they are
            // not defined for other types (int, bool)
            // Don't replace the arguments array, it's already cached by the traversal
            for(var i = 0; i < node.arguments.length; i++) {
                node.arguments[i] = Tools.castToFloat(node.arguments[i]);
            }
            node.callee = Tools.removeMemberFromExpression(node.callee);
            if (opt.name) {
                node.callee.name = opt.name;
            }
            return node;
        }
    };



    var MathEntry  = {
        abs: { callExp: handleMathCall() },
        acos: { callExp: handleMathCall() },
        asin: { callExp: handleMathCall() },
        atan: { callExp: handleMathCall() },
        atan2: { callExp: handleMathCall({ name: "atan" } ) },
        ceil: { callExp: handleIntVersion },
        cos:  { callExp: handleMathCall() },
        exp: { callExp: handleMathCall() },
        floor: { callExp: handleIntVersion },
        // imul: { callExp: handleMathCall },
        log: { callExp: handleMathCall() },
        max: { callExp: handleMathCall() },
        min: { callExp: handleMathCall() },
        pow: { callExp: handleMathCall() },
        // random: function random() { [native code] }
        round: { callExp: handleMathCall() }, // Since GLSL 1.3, what does WebGL use?
        sin:  { callExp: handleMathCall() },
        sqrt: { callExp: handleMathCall() },
        tan: { callExp: handleMathCall() }
    };

    MathConstants.forEach(function (constant) {
        MathEntry[constant] = {
            property: function () {
                return  { type: Syntax.Literal, value: Math[constant], extra: { type: Shade.TYPES.NUMBER } };
            }
        }
    });

    Tools.extend(ns, {
        id: "Math",
        object: {
            constructor: null,
            static: MathEntry
        },
        instance: MathEntry
    });

}(exports));

},{"../../../interfaces.js":38,"./tools.js":33,"estraverse":4}],30:[function(require,module,exports){
(function(ns){

    var Shade = require("../../../interfaces.js");
    var Syntax = require('estraverse').Syntax;
    var Tools = require('./tools.js');

    var ShadeObject = {
        diffuse: {},
        phong: {},
        fract: { property: Tools.removeMemberFromExpression },
        clamp: { property: Tools.removeMemberFromExpression },
        step: { property: Tools.removeMemberFromExpression },
        mix: { property: Tools.removeMemberFromExpression },
        smoothstep: { property: Tools.removeMemberFromExpression }
    }

    Tools.extend(ns, {
    id: "Shade",
    object: {
        constructor: null,
        static: ShadeObject
    },
    instance: null
});

}(exports));

},{"../../../interfaces.js":38,"./tools.js":33,"estraverse":4}],31:[function(require,module,exports){
(function (ns) {

    var Base = require("../../../base/index.js"),
        Shade = require("../../../interfaces.js"),
        Syntax = require('estraverse').Syntax;


    var SystemParameterNames = {
        "coords" : "_sys_coords",
        "height": "_sys_height",
        "width": "_sys_width"
    }

    var CoordsType =  {
        type: Shade.TYPES.OBJECT,
        kind: Shade.OBJECT_KINDS.FLOAT3,
        source: Shade.SOURCES.UNIFORM
    };

    var SystemEntry = {
        coords: {
            property: function (node) {
                node.property.name = "gl_FragCoord";
                return node.property;
            }
        },
        normalizedCoords: {
            property: function (node, parent, context, state) {
                state.systemParameters[SystemParameterNames.coords] = CoordsType;
                return {
                    type: Syntax.NewExpression,
                    callee: {
                        type: Syntax.Identifier,
                        name: "Vec3"
                    },
                    arguments: [
                        {
                            type: Syntax.BinaryExpression,
                            left: {
                                type: Syntax.MemberExpression,
                                object: {
                                    type: Syntax.Identifier,
                                    name: "gl_FragCoord"
                                },
                                property: {
                                    type: Syntax.Identifier,
                                    name: "xyz"
                                }
                            },
                            right: {
                                type: Syntax.Identifier,
                                name: SystemParameterNames.coords
                            },
                            operator: "/",
                            extra: {
                                type: Shade.TYPES.OBJECT,
                                kind: Shade.OBJECT_KINDS.FLOAT3
                            }
                        }
                    ],
                    extra: {
                        type: Shade.TYPES.OBJECT,
                        kind: Shade.OBJECT_KINDS.FLOAT3
                    }
                }
            }
        },
        height: {
            property: function (node, parent, context, state) {
                state.systemParameters[SystemParameterNames.coords] = CoordsType;
                node.property.name = SystemParameterNames.coords + ".y";
                return node.property;
            }
        },
        width: {
            property: function (node, parent, context, state) {
                state.systemParameters[SystemParameterNames.coords] = CoordsType;
                node.property.name = SystemParameterNames.coords + ".x";
                return node.property;
            }
        }

    };

    Base.extend(ns, {
        id: "System",
        object: {
            constructor: null,
            static: SystemEntry
        },
        instance: null
    });
}(exports));

},{"../../../base/index.js":22,"../../../interfaces.js":38,"estraverse":4}],32:[function(require,module,exports){
(function(ns){

    var Shade = require("../../../interfaces.js");
    var Syntax = require('estraverse').Syntax;
    var Tools = require("./tools.js");
    var ANNO = require("../../../base/annotation.js").ANNO;

    var TYPES = Shade.TYPES,
        KINDS = Shade.OBJECT_KINDS;

    var TextureInstance = {
        sample2D: {
            callExp: Tools.Vec.createFunctionCall.bind(null, 'texture2D', 2)
        }
    }

    Tools.extend(ns, {
        id: "Texture",
        kind: KINDS.TEXTURE,
        object: {
            constructor: null,
            static: {}
        },
        instance: TextureInstance
    });

}(exports));

},{"../../../base/annotation.js":20,"../../../interfaces.js":38,"./tools.js":33,"estraverse":4}],33:[function(require,module,exports){
(function (ns) {

    var Syntax = require('estraverse').Syntax;
    var Base = require("../../../base/index.js");
    var ANNO = require("../../../base/annotation.js").ANNO;
    var Shade = require("../../../interfaces.js"),
        TYPES = Shade.TYPES,
        KINDS = Shade.OBJECT_KINDS,
        VecBase = require("../../../base/vec.js");


    ns.removeMemberFromExpression = function (node) {
        return {
            type: Syntax.Identifier,
            name: node.property.name
        }
    }

    var Vec = {
        getVecArgs: function(args){
            if(args.length == 0){
                var result = [
                    {
                        type: "Literal",
                        value: "0"
                    }
                ];
                ANNO(result[0]).setType(TYPES.NUMBER);
                return result;
            }
            else{
                return args;
            }
        },

        generateVecFromArgs: function(vecCount, args){
            if(vecCount == 1)
                return args[0];
            if(args.length == 0){
                args = Vec.getVecArgs(args);
            }

            if(args.length == 1 && ANNO(args[0]).isOfKind(KINDS['FLOAT' + vecCount]))
                return args[0];
            var result = {
                type: Syntax.NewExpression,
                callee: {
                    type: Syntax.Identifier,
                    name: "Vec" + vecCount
                },
                arguments: args
            };
            ANNO(result).setType(TYPES.OBJECT, KINDS['FLOAT' + vecCount]);
            ANNO(result.callee).setType(TYPES.FUNCTION);
            return result;
        },

        createSwizzle: function(vecCount, swizzle, node, args, parent){
            if (args.length == 0) {
                node.callee.extra = node.extra;
                return node.callee;
            }
            var singular = swizzle.length == 1;
            var argObject = singular ? node.arguments[0] : Vec.generateVecFromArgs(swizzle.length, node.arguments);
            var replace = {
                type: Syntax.NewExpression,
                callee: {
                   type: Syntax.Identifier,
                   name: "Vec" + vecCount
                },
                arguments: []
            };
            var indices = [];
            for(var i = 0; i < swizzle.length; ++i){
                var idx = VecBase.swizzleToIndex(swizzle.charAt(i));
                indices[idx] = i;
            }
            for(var i = 0; i < vecCount; ++i){
                if(indices[i] !== undefined){
                    replace.arguments[i] = singular ? argObject : {
                        type: Syntax.MemberExpression,
                        object: argObject,
                        property: {
                            type: Syntax.Identifier,
                            name: VecBase.indexToSwizzle(indices[i])
                        }
                    };
                }
                else{
                   replace.arguments[i] = {
                        type: Syntax.MemberExpression,
                        object: node.callee.object,
                        property: {
                            type: Syntax.Identifier,
                            name: VecBase.indexToSwizzle(i)
                        }
                    };
                }
            }
            ANNO(replace).copy(ANNO(node));
            return replace;
        },

        attachSwizzles: function (instance, vecCount){
            for(var s = 0; s < VecBase.swizzleSets.length; ++s){
                for(var count = 1; count <= 4; ++count){
                    var max = Math.pow(vecCount, count);
                     for(var i = 0; i < max; ++i){
                        var val = i;
                        var key = "";
                        for(var  j = 0; j < count; ++j){
                            var idx = val % vecCount;
                            val = Math.floor(val / vecCount);
                            key+= VecBase.swizzleSets[s][idx];
                        }
                        instance[key] = {
                            callExp: Vec.createSwizzle.bind(null, vecCount, key)
                        };
                    }
                }
            }
        },

        createOperator: function(vecCount, operator, node, args, parent) {
            var other = Vec.generateVecFromArgs(vecCount, node.arguments);
            var replace = {
                type: Syntax.BinaryExpression,
                operator: operator,
                left: node.callee.object,
                right: other
            };
            ANNO(replace).copy(ANNO(node));
            return replace;
        },

        attachOperators: function(instance, vecCount, operators){
            for(var name in operators){
                var operator = operators[name];
                instance[name] = {
                    callExp: Vec.createOperator.bind(null, vecCount, operator)
                }
            }
        },

        createFunctionCall: function(functionName, secondVecSize, node, args, parent) {
            var replace = {
                type: Syntax.CallExpression,
                callee: {
                    type: Syntax.Identifier,
                    name: functionName
                },
                arguments: [
                    node.callee.object
                ]
            };
            if(secondVecSize){
                var other = Vec.generateVecFromArgs(secondVecSize, node.arguments);
                replace.arguments.push(other);
            }
            ANNO(replace).copy(ANNO(node));
            return replace;
        },

        generateLengthCall: function(node, args, parent){
            if(args.length == 0){
                return Vec.createFunctionCall('length', 0, node, args, parent);
            }
            else{
                 var replace = {
                    type: Syntax.BinaryExpression,
                    operator: '*',
                    left: node.callee.object,
                    right: {
                        type: Syntax.BinaryExpression,
                        operator: '/',
                        left: node.arguments[0],
                        right: Vec.createFunctionCall('length', 0, node, args, parent)
                    }
                };
                ANNO(replace.right).setType(TYPES.NUMBER);
                ANNO(replace).copy(ANNO(node));
                return replace;
            }
        },

        generateConstructor: function(node){
            node.arguments = Vec.getVecArgs(node.arguments);
        }
    };

    var Mat = {
        TYPES: {
            "Mat3" : {kind: KINDS.MATRIX3, colKind: KINDS.FLOAT3},
            "Mat4" : {kind: KINDS.MATRIX4, colKind: KINDS.FLOAT4}
        },

        generateMatFromArgs: function(matName, args){
            if(args.length == 0){
                args = Vec.getVecArgs(args);
            }

            if(args.length == 1 && ANNO(args[0]).isOfKind( Mat.TYPES[matName].kind))
                return args[0];
            var result = {
                type: Syntax.NewExpression,
                callee: {
                    type: Syntax.Identifier,
                    name: matName
                },
                arguments: args
            };
            ANNO(result).setType(TYPES.OBJECT, Mat.TYPES[matName].kind);
            ANNO(result.callee).setType(TYPES.FUNCTION);
            return result;
        },

        createOperator: function(matName, operator, node, args, parent) {
            var other = Mat.generateMatFromArgs(matName, node.arguments);
            var replace = {
                type: Syntax.BinaryExpression,
                operator: operator,
                left: node.callee.object,
                right: other
            };
            ANNO(replace).copy(ANNO(node));
            return replace;
        },

        attachOperators: function(instance, matName, operators){
            for(var name in operators){
                var operator = operators[name];
                instance[name] = {
                    callExp: Mat.createOperator.bind(null, matName, operator)
                }
            }
        },

        generateColCall: function(matName, node, args, parent){
            var memberAccess = {
                type: Syntax.MemberExpression,
                object: node.callee.object,
                property: node.arguments[0],
                computed: true
            };
            ANNO(memberAccess).setType(TYPES.OBJECT, Mat.TYPES[matName].colKind);

            if(args.length == 1){
                return memberAccess;
            }
            else{
                 var replace = {
                    type: Syntax.BinaryExpression,
                    operator: '*',
                    left: node.callee.object,
                    right: {
                        type: Syntax.BinaryExpression,
                        operator: '/',
                        left: node.arguments[0],
                        right: Vec.createFunctionCall('length', 0, node, args, parent)
                    }
                };
                ANNO(replace.right).setType(TYPES.NUMBER);
                ANNO(replace).copy(ANNO(node));
                return replace;
            }
        }

    }


    ns.Vec = Vec;

    ns.castToFloat = function (ast) {
        var exp = ANNO(ast);

        if (!exp.isNumber()) {   // Cast
            return {
                type: Syntax.CallExpression,
                callee: {
                    type: Syntax.Identifier,
                    name: "float"
                },
                arguments: [ast]
            }
        }
        return ast;
    }

    ns.extend = Base.extend;


}(exports));

},{"../../../base/annotation.js":20,"../../../base/index.js":22,"../../../base/vec.js":24,"../../../interfaces.js":38,"estraverse":4}],34:[function(require,module,exports){
(function(ns){

    var Shade = require("../../../interfaces.js");
    var Syntax = require('estraverse').Syntax;
    var Tools = require("./tools.js");
    var ANNO = require("../../../base/annotation.js").ANNO;

    var TYPES = Shade.TYPES,
        KINDS = Shade.OBJECT_KINDS;

    var Vec2Instance = {
        normalize: {
            callExp: Tools.Vec.createFunctionCall.bind(null, 'normalize', 0)
        },
        dot: {
            callExp: Tools.Vec.createFunctionCall.bind(null, 'dot', 2)
        },
        length: {
            callExp: Tools.Vec.generateLengthCall
        }
    }
    Tools.Vec.attachSwizzles(Vec2Instance, 2);
    Tools.Vec.attachOperators(Vec2Instance, 2, {
        add: '+',
        sub: '-',
        mul: '*',
        div: '/',
        mod: '%'
    })


    Tools.extend(ns, {
        id: "Vec2",
        kind: KINDS.FLOAT2,
        object: {
            constructor: Tools.Vec.generateConstructor,
            static: {}
        },
        instance: Vec2Instance
    });

}(exports));

},{"../../../base/annotation.js":20,"../../../interfaces.js":38,"./tools.js":33,"estraverse":4}],35:[function(require,module,exports){
(function(ns){

    var Shade = require("../../../interfaces.js");
    var Syntax = require('estraverse').Syntax;
    var Tools = require("./tools.js");
    var ANNO = require("../../../base/annotation.js").ANNO;

    var TYPES = Shade.TYPES,
        KINDS = Shade.OBJECT_KINDS;

    var Vec3Instance = {
        normalize: {
            callExp: Tools.Vec.createFunctionCall.bind(null, 'normalize', 0)
        },
        dot: {
            callExp: Tools.Vec.createFunctionCall.bind(null, 'dot', 3)
        },
        length: {
            callExp: Tools.Vec.generateLengthCall
        }
    }
    Tools.Vec.attachSwizzles(Vec3Instance, 3);
    Tools.Vec.attachOperators(Vec3Instance, 3, {
        add: '+',
        sub: '-',
        mul: '*',
        div: '/',
        mod: '%'
    })


    Tools.extend(ns, {
        id: "Vec3",
        kind: KINDS.FLOAT3,
        object: {
            constructor: Tools.Vec.generateConstructor,
            static: {}
        },
        instance: Vec3Instance
    });

}(exports));

},{"../../../base/annotation.js":20,"../../../interfaces.js":38,"./tools.js":33,"estraverse":4}],36:[function(require,module,exports){
(function(ns){

    var Shade = require("../../../interfaces.js");
    var Syntax = require('estraverse').Syntax;
    var Tools = require("./tools.js");
    var ANNO = require("../../../base/annotation.js").ANNO;

    var TYPES = Shade.TYPES,
        KINDS = Shade.OBJECT_KINDS;

    var Vec4Instance = {
        normalize: {
            callExp: Tools.Vec.createFunctionCall.bind(null, 'normalize', 0)
        },
        dot: {
            callExp: Tools.Vec.createFunctionCall.bind(null, 'dot', 4)
        },
        length: {
            callExp: Tools.Vec.generateLengthCall
        }
    }
    Tools.Vec.attachSwizzles(Vec4Instance, 4);
    Tools.Vec.attachOperators(Vec4Instance, 4, {
        add: '+',
        sub: '-',
        mul: '*',
        div: '/',
        mod: '%'
    })


    Tools.extend(ns, {
        id: "Vec4",
        kind: KINDS.FLOAT4,
        object: {
            constructor: Tools.Vec.generateConstructor,
            static: {}
        },
        instance: Vec4Instance
    });

}(exports));

},{"../../../base/annotation.js":20,"../../../interfaces.js":38,"./tools.js":33,"estraverse":4}],37:[function(require,module,exports){
(function (ns) {

    var Base = require("../../base/index.js"),
        ANNO = require("../../base/annotation.js").ANNO,
        Annotation = require("../../base/annotation.js").Annotation,
        FunctionAnnotation = require("../../base/annotation.js").FunctionAnnotation,
        TypeInfo = require("../../base/typeinfo.js").TypeInfo,
        Shade = require("./../../interfaces.js"),
        Types = Shade.TYPES,
        Kinds = Shade.OBJECT_KINDS,
        Sources = require("./../../interfaces.js").SOURCES,
        Tools = require('./registry/tools.js');

    var ObjectRegistry = require("./registry/index.js").Registry,
        Context = require("../../base/context.js").getContext(ObjectRegistry);


    var walk = require('estraverse');
    var Syntax = walk.Syntax;
    var VisitorOption = walk.VisitorOption;


    /**
     * Transforms the JS AST to an AST representation convenient
     * for code generation
     * @constructor
     */
    var GLASTTransformer = function (mainId) {
        this.mainId = mainId;
    };

    Base.extend(GLASTTransformer.prototype, {
        registerGlobalContext : function (program) {
            var ctx = new Context(program, null, {name: "global"});
            ctx.registerObject("Math", ObjectRegistry.getByName("Math"));
            ctx.registerObject("this", ObjectRegistry.getByName("System"));
            ctx.registerObject("Shade", ObjectRegistry.getByName("Shade"));
            ctx.registerObject("Vec2", ObjectRegistry.getByName("Vec2"));
            ctx.registerObject("Vec3", ObjectRegistry.getByName("Vec3"));
            ctx.registerObject("Vec4", ObjectRegistry.getByName("Vec4"));
            ctx.registerObject("Color", ObjectRegistry.getByName("Vec3"));
            ctx.registerObject("Texture", ObjectRegistry.getByName("Texture"));
            ctx.declareVariable("gl_FragCoord", false);
            ctx.updateExpression("gl_FragCoord", new TypeInfo({
                extra: {
                    type: Types.OBJECT,
                    kind: Kinds.FLOAT3
                }
            }));
            ctx.declareVariable("_sys_normalizedCoords", false);
            ctx.updateExpression("_sys_normalizedCoords", new TypeInfo({
                extra: {
                    type: Types.OBJECT,
                    kind: Kinds.FLOAT3
                }
            }));

            return ctx;
        },
        transformAAST: function (program) {
            this.root = program;
            var context = this.registerGlobalContext(program);

            var state = {
                 context: context,
                 contextStack: [context],
                 inMain:  this.mainId == context.str(),
                 globalParameters : program.injections[this.mainId] && program.injections[this.mainId][0] ? program.injections[this.mainId][0].node.extra.info : {},
                 systemParameters: {},
                 blockedNames : [],
                 topDeclarations : [],
                 idNameMap : {}
            }


            // TODO: We should also block systemParameters here. We can block all system names, even if not used.
            for(var name in state.globalParameters){
                state.blockedNames.push( getNameForGlobal(name) );
            }

            this.replace(program, state);

            for(var name in state.systemParameters){
                var decl = handleTopDeclaration(name, state.systemParameters[name]);
                decl && program.body.unshift(decl);
            }

            for(var name in state.globalParameters){
                var decl = handleTopDeclaration(getNameForGlobal(name), state.globalParameters[name]);
                decl && program.body.unshift(decl);
            }

            return program;
        },
        /**
         *
         * @param {Object!} ast
         * @param {Object!} state
         * @returns {*}
         */
        replace: function(ast, state) {
            ast = walk.replace(ast, {

                enter: function (node, parent, cb) {
                    //console.log("Enter:", node.type);
                    switch (node.type) {
                        case Syntax.Identifier:
                            return handleIdentifier(node, parent, state.blockedNames, state.idNameMap);
                        case Syntax.IfStatement:
                            return handleIfStatement(node);
                        case Syntax.ConditionalExpression:
                            return handleConditionalExpression(node, state, this, cb);
                        case Syntax.LogicalExpression:
                            return handleEnterLogicalExpression(node, this, state);
                        case Syntax.FunctionDeclaration:
                            // No need to declare, this has been annotated already
                            var parentContext = state.contextStack[state.contextStack.length - 1];
                            var context = new Context(node, parentContext, {name: node.id.name });
                            state.context = context;
                            state.contextStack.push(context);
                            state.inMain = this.mainId == context.str();
                            break;
                    }
                }.bind(this),

                leave: function(node, parent) {
                    switch(node.type) {
                        case Syntax.MemberExpression:
                            return handleMemberExpression(node, parent, state);
                        case Syntax.NewExpression:
                            return handleNewExpression(node, parent, state.context);
                        case Syntax.LogicalExpression:
                            return handleExitLogicalExpression(node, this, state);
                        case Syntax.CallExpression:
                            return handleCallExpression(node, parent, state.topDeclarations, state.context);
                        case Syntax.FunctionDeclaration:
                            state.context = state.contextStack.pop();
                            state.inMain = state.context.str() == this.mainId;
                            if (state.inMain)
                                return handleMainFunction(node, parent, state.context);
                        case Syntax.ReturnStatement:
                            if(state.inMain) {
                                return handleReturnInMain(node, state.context);
                            }
                            break;
                        case Syntax.BinaryExpression:
                            return handleBinaryExpression(node, parent);

                    }
                }.bind(this)
            });
            return ast;
        }
    });

    var handleTopDeclaration = function(name, typeInfo){
        var propertyLiteral =  { type: Syntax.Identifier, name: name};
        var propertyAnnotation =  ANNO(propertyLiteral);
        propertyAnnotation.setFromExtra(typeInfo);

        if (propertyAnnotation.isNullOrUndefined())
            return;

        var decl = {
            type: Syntax.VariableDeclaration,
            declarations: [
                {
                    type: Syntax.VariableDeclarator,
                    id: propertyLiteral,
                    init: null
                }
            ],
            kind: "var"
        };
        var declAnnotation =  ANNO(decl.declarations[0]);
        declAnnotation.copy(propertyAnnotation);
        return decl;
    }

    var handleIdentifier = function(node, parent, blockedNames, idNameMap){
        if(parent.type == Syntax.MemberExpression)
            return node;

        var name = node.name;
        if(idNameMap[name]) node.name = idNameMap[name];
        var newName = name.replace(/_+/g, "_"), i = 1;
        while(blockedNames.indexOf(newName) != -1){
            newName = name + "_" + (++i);
        }
        idNameMap[name] = newName;
        node.name = newName;
        return node;
    }


    var handleReturnInMain = function(node, context) {
        if (node.argument) {
            return {
                type: Syntax.BlockStatement,
                body: [
                    {
                        type: Syntax.AssignmentExpression,
                        operator: "=",
                        left: {
                            type: Syntax.Identifier,
                            name: "gl_FragColor"
                        },
                        right: castToVec4(node.argument, context)
                    },
                    {
                        type: Syntax.ReturnStatement
                    }
                ]
            }
        } else {
            return {
                type: Syntax.ExpressionStatement,
                expression : {
                    type: Syntax.Identifier,
                    name: "discard"
                }
            }
        }
    };

    var handleMainFunction = function(node, parent, context) {
        var anno = new FunctionAnnotation(node);
        anno.setReturnInfo({ type: Types.UNDEFINED });

        // Main has no parameters
        node.params = [];
        // Rename to 'main'
        node.id.name = "main";
        //console.log(node);
    }


    function getNameOfNode(node) {
        switch (node.type) {
            case Syntax.Identifier:
                return node.name;
            case Syntax.MemberExpression:
                return getNameOfNode(node.object) + "." + getNameOfNode(node.property);
            case Syntax.NewExpression:
                return getNameOfNode(node.callee);
            default:
                return "unknown(" + node.type + ")";
        }
    };

    function getObjectReferenceFromNode(object, context) {
        switch (object.type) {
            case Syntax.NewExpression:
            case Syntax.CallExpression:
            case Syntax.MemberExpression:
            case Syntax.BinaryExpression:
            case Syntax.Identifier:
                return context.createTypeInfo(object);
                break;
            case Syntax.ThisExpression:
                return context.getBindingByName("this");
                break;
            default:
                throw new Error("Unhandled object type in GLSL generation: " + object.type);
        }
    }

    var handleCallExpression = function (callExpression, parent, topDeclarations, context) {

        // Is this a call on an object?
        if (callExpression.callee.type == Syntax.MemberExpression) {
            var calleeReference = getObjectReferenceFromNode(callExpression.callee, context);
            if(!(calleeReference && calleeReference.isFunction()))
                Shade.throwError(callExpression, "Something went wrong in type inference, " + callExpression.callee.object.name);

            var object = callExpression.callee.object,
                propertyName = callExpression.callee.property.name;

            var objectReference = getObjectReferenceFromNode(object, context);
            if(!objectReference)  {
                Shade.throwError(callExpression, "Internal: No object info for: " + object);
            }

            var objectInfo = context.getObjectInfoFor(objectReference);
            if(!objectInfo) { // Every object needs an info, otherwise we did something wrong
                Shade.throwError(callExpression, "Internal Error: No object registered for: " + objectReference.getTypeString() + ", " + getNameOfNode(callExpression.callee.object)+", "+callExpression.callee.object.type);
            }
            if (objectInfo.hasOwnProperty(propertyName)) {
                var propertyHandler = objectInfo[propertyName];
                if (typeof propertyHandler.callExp == "function") {
                    var args = Annotation.createAnnotatedNodeArray(callExpression.arguments, context);
                    return propertyHandler.callExp(callExpression, args, parent);
                }
            }
        }
    }

    var handleNewExpression = function(newExpression, parent, context){
        var entry = context.getBindingByName(newExpression.callee.name);
        //console.error(entry);
        if (entry && entry.hasConstructor()) {
            var constructor = entry.getConstructor();
            return constructor(newExpression);
        }
       else {
            throw new Error("ReferenceError: " + node.callee.name + " is not defined");
        }
    }


    var handleMemberExpression = function (memberExpression, parent, state) {
        var propertyName = memberExpression.property.name,
            context = state.context;

        var objectReference = getObjectReferenceFromNode(memberExpression.object, context);

        if (!objectReference || !objectReference.isObject())
            Shade.throwError(memberExpression, "Internal Error: Object of Member expression is no object.");

        var objectInfo = context.getObjectInfoFor(objectReference);
        if(!objectInfo) {// Every object needs an info, otherwise we did something wrong
            Shade.throwError(memberExpression, "Internal Error: No object registered for: " + objectReference.getTypeString() + JSON.stringify(memberExpression.object));
        }
        if (!objectInfo.hasOwnProperty(propertyName))
            Shade.throwError(memberExpression, "Internal Error: Object of type " + objectReference.getTypeString() + " has no property '" + propertyName +"'");

        var propertyHandler = objectInfo[propertyName];
        if (typeof propertyHandler.property == "function") {
            var result = propertyHandler.property(memberExpression, parent, context, state);
            return result;
        }
        else if(objectReference.isGlobal()) {
            var propertyLiteral =  { type: Syntax.Identifier, name: getNameForGlobal(propertyName)};
            ANNO(propertyLiteral).copy(ANNO(memberExpression));
            return propertyLiteral;
        }

    };

    var getNameForGlobal = function(baseName) {
        var name = "_env_" + baseName;
        return name.replace(/_+/g, "_");
    }

    var handleBinaryExpression = function (binaryExpression, parent, cb) {
        // In GL, we can't mix up floats, ints and boold for binary expressions
        var left = ANNO(binaryExpression.left),
            right = ANNO(binaryExpression.right);

        if (left.isNumber() && right.isInt()) {
            binaryExpression.right = Tools.castToFloat(binaryExpression.right);
        }
        else if (right.isNumber() && left.isInt()) {
            binaryExpression.left = Tools.castToFloat(binaryExpression.left);
        }

        if (binaryExpression.operator == "%") {
            return handleModulo(binaryExpression);
        }
        return binaryExpression;
    }

    function castToInt(ast, force) {
        var exp = ANNO(ast);

        if (!exp.isInt() || force) {   // Cast
            return {
                type: Syntax.CallExpression,
                callee: {
                    type: Syntax.Identifier,
                    name: "int"
                },
                arguments: [ast]
            }
        }
        return ast;
    }

    function castToVec4(ast, context) {
        var exp = TypeInfo.createForContext(ast, context);

        if (exp.isOfKind(Kinds.FLOAT4))
            return ast;

        if (exp.isOfKind(Kinds.FLOAT3)) {
            return {
                type: Syntax.CallExpression,
                callee: {
                    type: Syntax.Identifier,
                    name: "vec4"
                },
                arguments: [ast, { type: Syntax.Literal, value: 1.0, extra: { type: Types.NUMBER} }]
            }
        }
        Shade.throwError(ast, "Can't cast from '" + exp.getTypeString() + "' to vec4");
    }

    var handleModulo = function (binaryExpression) {
        binaryExpression.right = Tools.castToFloat(binaryExpression.right);
        binaryExpression.left = Tools.castToFloat(binaryExpression.left);
        return {
            type: Syntax.CallExpression,
            callee: {
                type: Syntax.Identifier,
                name: "mod"
            },
            arguments: [
                binaryExpression.left,
                binaryExpression.right
            ],
            extra: {
                type: Types.NUMBER
            }
        }
    }

    var handleConditionalExpression = function(node, state, root, cb) {
        var consequent = ANNO(node.consequent);
        var alternate = ANNO(node.alternate);
        if (consequent.canEliminate() || alternate.canEliminate()) {
            // In this case, we replace the whole conditional expression by the
            // resulting expression. We have to do the traversal manually and skip the
            // subtree for the parent traversal.
            cb(VisitorOption.Skip);
            return root.replace(consequent.canEliminate() ? node.alternate : node.consequent , state);
        }
    }

    var handleIfStatement = function (node) {
        var consequent = ANNO(node.consequent);
        var alternate = node.alternate ? ANNO(node.alternate) : null;
        if (consequent.canEliminate()) {
            if (alternate) {
                return node.alternate;
            }
            return {
                type: Syntax.EmptyStatement
            }
        } else if (alternate && alternate.canEliminate()) {
            return node.consequent;
        }
        // We still have a real if statement
       var test = ANNO(node.test);
       switch(test.getType()) {
           case Types.INT:
           case Types.NUMBER:
               node.test = {
                   type: Syntax.BinaryExpression,
                   operator: "!=",
                   left: node.test,
                   right: {
                       type: Syntax.Literal,
                       value: 0,
                       extra: {
                           type: test.getType()
                       }
                   }
               }
       }


    };

    var handleEnterLogicalExpression = function (node, root, state) {
        var left = ANNO(node.left);
        var right = ANNO(node.right);
        if (left.canEliminate())
            return root.replace(node.right, state);
        if (right.canEliminate())
            return root.replace(node.left, state);
    }

    var handleExitLogicalExpression = function(node, root, state) {
        var left = ANNO(node.left);
        var right = ANNO(node.right);

        if (left.isBool() && right.isBool()) {
            // Everything is okay, no need to modify anything
            return;
        }

        // Now we have to implement the JS boolean semantic for GLSL
        if (left.canNumber()) {
            var test =  node.left;
            return {
                type: Syntax.ConditionalExpression,
                test: {
                    type: Syntax.BinaryExpression,
                    operator: "==",
                    left: test,
                    right: {
                        type: Syntax.Literal,
                        value: left.isNumber() ? 0.0 : left.isInt() ? 0 : "false",
                        extra: {
                            type : left.getType(),
                            staticValue: left.isNumber() ? 0.0 : left.isInt() ? 0 : "false"
                        }
                    },
                    extra: { type: Types.BOOLEAN }
                },
                consequent: node.right,
                alternate: test
            }
        }
    }


    // Exports
    ns.GLASTTransformer = GLASTTransformer;


}(exports));

},{"../../base/annotation.js":20,"../../base/context.js":21,"../../base/index.js":22,"../../base/typeinfo.js":23,"./../../interfaces.js":38,"./registry/index.js":28,"./registry/tools.js":33,"estraverse":4}],38:[function(require,module,exports){
(function (ns) {
    var Base = require("./base/index.js");
    /**
     * @enum {string}
     */
    ns.TYPES = {
        ANY: "any",
        INT: "int",
        NUMBER: "number",
        BOOLEAN: "boolean",
        OBJECT: "object",
        ARRAY: "array",
        NULL: "null",
        UNDEFINED: "undefined",
        FUNCTION: "function",
        STRING: "string"
    }

    ns.OBJECT_KINDS = {
        ANY: "any",
        FLOAT2: "float2", // virtual kinds
        FLOAT3: "float3", // virtual kinds
        FLOAT4: "float4", // virtual kinds
        NORMAL: "normal",
        MATRIX3: "matrix3",
        MATRIX4: "matrix4",
        TEXTURE: "texture",
        COLOR_CLOSURE: "color_closure"
    }

    ns.SOURCES = {
        UNIFORM: "uniform",
        VERTEX: "vertex",
        CONSTANT: "constant"
    }

    function constructFromMatrix(dest, matSize, args){
        if(args.length > 1){
            for(var i = 0; i < args.length; ++i){
                if(args[i] instanceof Mat3 || args[i] instanceof Mat4)
                    throw "Constructing Matrix from Matrix can only take one argument";
            }
        }
        if(args.length < 1)
            return false;
        if(args.length == 1){
            var srcMat = args[0];
            var srcSize = 0;

            if(srcMat instanceof Mat3) srcSize = 3;
            else if(srcMat instanceof Mat4) srcSize = 4;
            else return false;

            for(var y = 0; y < matSize; y++)
                for(var x = 0; x < matSize; x++){
                    var destIdx = y*matSize + x;
                    if(x < srcSize && y < srcSize){
                        var srcIdx = y*srcSize + x;
                        dest[destIdx] = srcMat[srcIdx];
                    }
                    else dest[destIdx] = x == y ? 1 : 0;
                }
            return true;
        }

    }

    function fillVector(dest, vecSize, arguments){
        var color = false;
        if(arguments.length == 0 ){
            for(var i = 0; i < vecSize; ++i)
                dest[i] = 0;
            if(color) dest[3] = 1;
            return;
        }
        if(arguments.length == 1 && !isNaN(arguments[0])){
            for(var i = 0; i < vecSize; ++i)
                dest[i] = arguments[0];
            if(color) dest[3] = 1;
            return;
        }

        var idx = 0;
        for(var i = 0; idx < vecSize && i < arguments.length; ++i){
            var arg= arguments[i], cnt = 1;
            if(arg instanceof Vec2) cnt = 2;
            else if(arg instanceof Vec3) cnt = 3;
            else if(arg instanceof Vec4) cnt = 4;
            else if(arg instanceof Mat3) cnt = 9;
            else if(arg instanceof Mat4) cnt = 16;

            if(cnt == 1)
                dest[idx++] = arg || 0;
            else
                for(var j = 0; idx < vecSize && j < cnt; ++j){
                    dest[idx++] = arg[j];
                }
        }
        if(i < arguments.length)
            throw new Error("Too many arguments for " + (color ? "Color" : "Vec" + vecSize) + ".");
        if(idx < vecSize){
            if(color && (idx == 3))
                dest[3] = 1;
            else
                throw new Error("Not enough arguments for " + (color ? "Color" : "Vec" + vecSize) + ".");
        }
    }


    // TODO: Generate Swizzle functions
    var SWIZZLE_KEYS = [
        ['x','y','z','w'],
        ['r', 'g', 'b', 'a'],
        ['s', 't', 'p', 'q']
    ]

    function addSwizzles(prototype, vecCount, maskCount, withSetter){
        var max = Math.pow(vecCount, maskCount);
        for(var i = 0; i < max; ++i){
            var indices = [], keys = ["", "", ""], val = i, args = [];
            var setterArgs = [], generateSetter = withSetter;
            for(var j = 0; j < maskCount; ++j){
                var idx = val % vecCount;
                indices.push(idx);
                if(generateSetter){
                    if(setterArgs[idx] === undefined)
                        setterArgs[idx] = 'other[' + j + ']';
                    else
                        generateSetter = false;
                }
                for(var k = 0; k < SWIZZLE_KEYS.length; ++k){
                    keys[k] += SWIZZLE_KEYS[k][idx];
                }
                val = Math.floor(val / vecCount);
                args.push('this['+ idx + ']' );
            }

            var funcArgs = "";
            var body = '  return getVec' + maskCount + '.apply(null, arguments);\n';
            if(generateSetter){
                for(var j = 0; j < vecCount; ++j){
                    if(setterArgs[j] === undefined)
                        setterArgs[j] = 'this[' + j + ']';
                }
                switch(maskCount){
                    case 2 : funcArgs = "x, y"; break;
                    case 3 : funcArgs = "x, y, z"; break;
                    case 4 : funcArgs = "x, y, z, w"; break;
                }

                body = "  if(arguments.length == 0)\n  " + body +
                       "  else{\n" +
                       "    var other=getVec" + maskCount + '.apply(null, arguments);\n' +
                       "    return getVec" + vecCount + '(' + setterArgs.join(", ") + ');\n' +
                       "  }\n";
            }
            var functionCode = 'function(' + funcArgs +  '){\n' + body + '}';
            try{
                var result = eval("(" + functionCode + ")");
                for(var j = 0; j < keys.length; ++j)
                    prototype[keys[j]] = result;
            }
            catch(e){
                console.error("Error Compiling Code:\n" + functionCode);
                throw e;

            }
        }
    }


    /**
    * The virtual Vec2 type
    * @constructor
    */
    var Vec2 = function(x, y) {
        fillVector(this, 2, arguments);
    }


    function getVec2() {
        if(arguments[0] instanceof Vec2)
            return arguments[0];
        var obj = new Vec2();
        Vec2.apply(obj, arguments);
        return obj;
    }

    Vec2.prototype.add = function(x, y) { // 0 arguments => identity or error?
        var add = getVec2.apply(null, arguments);
        return new Vec2(this[0] + add[0], this[1] + add[1]);
    }
    Vec2.prototype.sub = function(x, y) {
        var sub = getVec2.apply(null, arguments);
        return new Vec2(this[0] - sub[0], this[1] - sub[1]);
    }
    Vec2.prototype.mul = function(x, y) {
        var other = getVec2.apply(null, arguments);
        return new Vec2(this[0] * other[0], this[1] * other[1]);
    }
    Vec2.prototype.div = function(x, y) {
        var other = getVec2.apply(null, arguments);
        return new Vec2(this[0] / other[0], this[1] / other[1]);
    }
    Vec2.prototype.mod = function(x, y) {
        var other = getVec2.apply(null, arguments);
        return new Vec2(this[0] % other[0], this[1] % other[1]);
    }
    Vec2.prototype.dot = function(x, y) {
        var other = getVec2.apply(null, arguments);
        return this[0] * other[0] + this[1] * other[1];
    }
    Vec2.prototype.abs = function() {
        return new Vec2(Math.abs(this[0]), Math.abs(this[1]));
    }
    Vec2.prototype.length = function(length) {
        if(arguments.length == 0)
            return Math.sqrt(this.dot(this));
        else {
            return this.mul(length / this.length());
        }
    }
    Vec2.prototype.normalize = function() {
        return this.length(1);
    }

    Vec2.prototype.xy = Vec2.prototype.rg = Vec2.prototype.st = function(x, y) {
        if(arguments.length == 0)
            return this;
        else {
            return getVec2.apply(null, arguments);
        }
    }
    Vec2.prototype.x = Vec2.prototype.r = Vec2.prototype.s = function(x) {
        if(arguments.length == 0)
            return this[0];
        else
            return this.xy(x, this[1]);
    }
    Vec2.prototype.y = Vec2.prototype.g = Vec2.prototype.t = function(y) {
        if(arguments.length == 0)
            return this[1];
        else
            return this.xy(this[0], y);
    }

    addSwizzles(Vec2.prototype, 2, 2, true);
    addSwizzles(Vec2.prototype, 2, 3, false);
    addSwizzles(Vec2.prototype, 2, 4, false);


    /**
     * The virtual Vec3 type
     * @constructor
     */
    var Vec3 = function(x, y, z) {
        fillVector(this, 3, arguments);
    }

    function getVec3() {
        if(arguments[0] instanceof Vec3)
            return arguments[0];
        var obj = new Vec3();
        Vec3.apply(obj, arguments);
        return obj;
    }

    Vec3.prototype.add = function(x, y, z) {
        var other = getVec3.apply(null, arguments);
        return new Vec3(this[0] + other[0], this[1] + other[1], this[2] + other[2]);
    }
    Vec3.prototype.sub = function(x, y, z) {
        var other = getVec3.apply(null, arguments);
        return new Vec3(this[0] - other[0], this[1] - other[1], this[2] - other[2]);
    }
    Vec3.prototype.mul = function(x, y, z) {
        var other = getVec3.apply(null, arguments);
        return new Vec3(this[0] * other[0], this[1] * other[1], this[2] * other[2]);
    }
    Vec3.prototype.div = function(x, y, z) {
        var other = getVec3.apply(null, arguments);
        return new Vec3(this[0] / other[0], this[1] / other[1], this[2] / other[2]);
    }
    Vec3.prototype.mod = function(x, y, z) {
        var other = getVec3.apply(null, arguments);
        return new Vec3(this[0] % other[0], this[1] % other[1], this[2] % other[2]);
    }
    Vec3.prototype.abs = function() {
        return new Vec3(Math.abs(this[0]), Math.abs(this[1]), Math.abs(this[2]));
    }
    Vec3.prototype.dot = function(x, y, z) {
        var other = getVec3.apply(null, arguments);
        return this[0] * other[0] + this[1] * other[1] + this[2] * other[2];
    }
    Vec3.prototype.cross = function(x, y, z) {
        var other = getVec3.apply(null, arguments);
        var x = this[1] * other[2] - other[1] * this[2];
        var y = this[2] * other[0] - other[2] * this[0];
        var z = this[0] * other[1] - other[0] * this[1];
        return new Vec3(x, y, z);
    }
    Vec3.prototype.length = function(length) {
        if(arguments.length == 0)
            return Math.sqrt(this.dot(this));
        else {
            return this.mul(length / this.length());
        }
    }
    Vec3.prototype.normalize = function() {
        return this.length(1);
    }
    Vec3.prototype.xyz = Vec3.prototype.rgb = Vec3.prototype.stp = function(x, y, z) {
        if(arguments.length == 0)
            return this;
        else
            return new Vec3(x, y, z);
    }
    Vec3.prototype.x = Vec3.prototype.r = Vec3.prototype.s = function(x) {
        if(arguments.length == 0)
            return this[0];
        else
            return new Vec3(x, this[1], this[2]);
    }
    Vec3.prototype.y = Vec3.prototype.g = Vec3.prototype.t = function(y) {
        if(arguments.length == 0)
            return this[1];
        else
            return new Vec3(this[0], y, this[2]);
    }
    Vec3.prototype.z = Vec3.prototype.b = Vec3.prototype.p = function(z) {
        if(arguments.length == 0)
            return this[2];
        else
            return new Vec3(this[0], this[1], z);
    }
    addSwizzles(Vec3.prototype, 3, 2, true);
    addSwizzles(Vec3.prototype, 3, 3, true);
    addSwizzles(Vec3.prototype, 3, 4, false);


    /**
     * The virtual Vec4 type
     * @constructor
     */
    var Vec4 = function(x, y, z, w) {
        fillVector(this, 4, arguments)
    }

    function getVec4() {
        if(arguments[0] instanceof Vec4)
            return arguments[0];
        var obj = new Vec4();
        Vec4.apply(obj, arguments);
        return obj;
    }

    Vec4.prototype.add = function(x, y, z, w) {
        var other = getVec4.apply(null, arguments);
        return new Vec4(this[0] + other[0], this[1] + other[1], this[2] + other[2], this[3] + other[3]);
    }
    Vec4.prototype.sub = function(x, y, z, w) {
        var other = getVec4.apply(null, arguments);
        return new Vec4(this[0] - other[0], this[1] - other[1], this[2] - other[2], this[3] - other[3]);
    }
    Vec4.prototype.mul = function(x, y, z, w) {
        var other = getVec4.apply(null, arguments);
        return new Vec4(this[0] * other[0], this[1] * other[1], this[2] * other[2], this[3] * other[3]);
    }
    Vec4.prototype.div = function(x, y, z, w) {
        var other = getVec4.apply(null, arguments);
        return new Vec4(this[0] / other[0], this[1] / other[1], this[2] / other[2], this[3] / other[3]);
    }
    Vec4.prototype.mod = function(x, y, z, w) {
        var other = getVec4.apply(null, arguments);
        return new Vec4(this[0] % other[0], this[1] % other[1], this[2] % other[2], this[3] % other[3]);
    }
    Vec4.prototype.abs = function() {
        return new Vec4(Math.abs(this[0]), Math.abs(this[1]), Math.abs(this[2]), Math.abs(this[3]));
    }
    Vec4.prototype.dot = function(x, y, z, w) {
        var other = getVec4.apply(null, arguments);
        return this[0] * other[0] + this[1] * other[1] + this[2] * other[2] + this[3] * other[3];
    }
    Vec4.prototype.length = function(length) {
        if(arguments.length == 0)
            return Math.sqrt(this.dot(this));
        else {
            return this.mul(length / this.length());
        }
    }
    Vec4.prototype.normalize = function() {
        return this.length(1);
    }
    Vec4.prototype.xyzw = Vec4.prototype.rgba = Vec4.prototype.stpq = function(x, y, z, w) {
        if(arguments.length == 0)
            return this;
        else
            return getVec4.apply(null, arguments);
    }
    Vec4.prototype.x = Vec4.prototype.r = Vec4.prototype.s = function(x) {
        if(arguments.length == 0)
            return this[0];
        else
            return getVec4(x, this[1], this[2], this[3]);
    }

    Vec4.prototype.y = Vec4.prototype.g = Vec4.prototype.t = function(y) {
        if(arguments.length == 0)
            return this[1];
        else
            return getVec4(this[0], y, this[2], this[3]);
    }
    Vec4.prototype.z = Vec4.prototype.b = Vec4.prototype.p = function(z) {
        if(arguments.length == 0)
            return this[2];
        else
            return getVec4(this[0], this[1], z, this[3]);
    }
    Vec4.prototype.w = Vec4.prototype.a = Vec4.prototype.q = function(w) {
        if(arguments.length == 0)
            return this[3];
        else
            return getVec4(this[0], this[1], this[2], w);
    }
    addSwizzles(Vec4.prototype, 4, 2, true);
    addSwizzles(Vec4.prototype, 4, 3, true);
    addSwizzles(Vec4.prototype, 4, 4, true);

    /**
     * The virtual Color type
     * @constructor
     */
    var Color = Vec4;

    /**
     * The virtual Mat3 type
     * @constructor
     */
    var Mat3 = function(m11, m12, m13, m21, m22, m23, m31, m32, m33) {
        constructFromMatrix(this, 3, arguments) || fillVector(this, 9, arguments)
    }

    function getMat3() {
        if(arguments[0] instanceof Mat3)
            return arguments[0];
        var obj = new Mat3();
        Mat3.apply(obj, arguments);
        return obj;
    }

    Mat3.prototype.add = function(m11, m12, m13, m21, m22, m23, m31, m32, m33) {
        var other = getMat3.apply(null, arguments);
        return new Mat3(this[0] + other[0], this[1] + other[1], this[2] + other[2],
                        this[3] + other[3], this[4] + other[4], this[5] + other[5],
                        this[6] + other[6], this[7] + other[7], this[8] + other[8]);
    }
    Mat3.prototype.sub = function(m11, m12, m13, m21, m22, m23, m31, m32, m33) {
        var other = getMat3.apply(null, arguments);
        return new Mat3(this[0] - other[0], this[1] - other[1], this[2] - other[2],
                        this[3] - other[3], this[4] - other[4], this[5] - other[5],
                        this[6] - other[6], this[7] - other[7], this[8] - other[8]);
    }
    Mat3.prototype.mul = function(m11, m12, m13, m21, m22, m23, m31, m32, m33) {
        var other = getMat3.apply(null, arguments);
        // TODO: Do correct matrix multiplication...
        return null;
    }
    Mat3.prototype.div = function(m11, m12, m13, m21, m22, m23, m31, m32, m33) {
        var other = getMat3.apply(null, arguments);
        return new Mat3(this[0] / other[0], this[1] / other[1], this[2] / other[2],
                        this[3] / other[3], this[4] / other[4], this[5] / other[5],
                        this[6] / other[6], this[7] / other[7], this[8] / other[8]);
    }

    Mat3.prototype.col = function(idx, x, y, z){
        if(arguments.length == 1){
            return new Vec3(this[3*idx + 0], this[3*idx + 1], this[3*idx + 2]);
        }
        else{
            var input = getVec3.apply(null, Array.prototype.slice.call(arguments, 1));
            var copy = new Mat3(this);
            copy[3*idx + 0] = input[0];
            copy[3*idx + 1] = input[1];
            copy[3*idx + 2] = input[2];
        }
    }
    Mat3.prototype.mulVec = function(x, y, z){
        var other = getVec3.apply(null, arguments);
        return new Vec3(
            other.dot(this[0], this[1], this[2]),
            other.dot(this[3], this[4], this[5]),
            other.dot(this[6], this[7], this[8])
        )
    }

    /**
     * The virtual Mat3 type
     * @constructor
     */
    var Mat4 = function(m11, m12, m13, m14, m21, m22, m23, m24, m31, m32, m33, m34, m41, m42, m43, m44) {
        constructFromMatrix(this, 4, arguments) || fillVector(this, 16, arguments);
    }

    function getMat4() {
        if(arguments[0] instanceof Mat4)
            return arguments[0];
        var obj = new Mat4();
        Mat4.apply(obj, arguments);
        return obj;
    }

    Mat4.prototype.add = function(m11, m12, m13, m14, m21, m22, m23, m24, m31, m32, m33, m34, m41, m42, m43, m44) {
        var other = getMat4.apply(null, arguments);
        return new Mat3(this[0] + other[0], this[1] + other[1], this[2] + other[2], this[3] + other[3],
                        this[4] + other[4], this[5] + other[5], this[6] + other[6], this[7] + other[7],
                        this[8] + other[8], this[9] + other[9], this[10] + other[10], this[11] + other[11],
                        this[12] + other[12], this[13] + other[13], this[14] + other[14], this[15] + other[15]);
    }
    Mat4.prototype.sub = function(m11, m12, m13, m14, m21, m22, m23, m24, m31, m32, m33, m34, m41, m42, m43, m44) {
        var other = getMat4.apply(null, arguments);
        return new Mat3(this[0] - other[0], this[1] - other[1], this[2] - other[2], this[3] - other[3],
                        this[4] - other[4], this[5] - other[5], this[6] - other[6], this[7] - other[7],
                        this[8] - other[8], this[9] - other[9], this[10] - other[10], this[11] - other[11],
                        this[12] - other[12], this[13] - other[13], this[14] - other[14], this[15] - other[15]);
    }
    Mat4.prototype.mul = function(m11, m12, m13, m14, m21, m22, m23, m24, m31, m32, m33, m34, m41, m42, m43, m44) {
        var other = getMat4.apply(null, arguments);
        // TODO: Do correct matrix multiplication...
        return null;
    }
    Mat4.prototype.div = function(m11, m12, m13, m14, m21, m22, m23, m24, m31, m32, m33, m34, m41, m42, m43, m44) {
        var other = getMat4.apply(null, arguments);
        return new Mat3(this[0] / other[0], this[1] / other[1], this[2] / other[2], this[3] / other[3],
                        this[4] / other[4], this[5] / other[5], this[6] / other[6], this[7] / other[7],
                        this[8] / other[8], this[9] / other[9], this[10] / other[10], this[11] / other[11],
                        this[12] / other[12], this[13] / other[13], this[14] / other[14], this[15] / other[15]);
    }

    Mat4.prototype.col = function(idx, x, y, z, w){
        if(arguments.length == 1){
            return new Vec4(this[4*idx + 0], this[4*idx + 1], this[4*idx + 2], this[4*idx + 3]);
        }
        else{
            var input = getVec4.apply(null, Array.prototype.slice.call(arguments, 1));
            var copy = new Mat4(this);
            copy[4*idx + 0] = input[0];
            copy[4*idx + 1] = input[1];
            copy[4*idx + 2] = input[2];
            copy[4*idx + 3] = input[3];
        }
    }
    Mat4.prototype.mulVec = function(x, y, z, w){
        var other = getVec4.apply(null, arguments);
        return new Vec3(
            other.dot(this[0], this[1], this[2], this[3]),
            other.dot(this[4], this[5], this[6], this[7]),
            other.dot(this[8], this[9], this[10], this[11]),
            other.dot(this[12], this[13], this[14], this[15])
        );
    }


    /**
     * The virtual Teture type
     * @constructor
     */
    var Texture = function(image) {
        this.image = image;
    }

    Texture.prototype.sample2D = function(x, y) {
        return new Vec4(0, 0, 0, 0);
    }





    var Shade = {};

    Shade.clamp = function(x, minVal, maxVal) {
        return Math.min(Math.max(x, minVal), maxVal);
    };

    Shade.smoothstep = function(edge1, edge2, x) {
        var t = Shade.clamp((x - edge1) / (edge2 - edge1), 0.0, 1.0);
        return t * t * (3.0 - 2.0 * t);
    };

    Shade.step = function(edge, x) {
        return x < edge ? 0 : 1;
    };

    Shade.fract = function(x) {
        return x - Math.floor(x);
    }


    /**
     * @param {object} node
     * @param {string} msg
     */
    ns.throwError = function(node, msg) {
        var loc = node && node.loc;
        if (loc && loc.start.line) {
            msg = "Line " + loc.start.line + ": " + msg;
        }
        var error = new Error(msg);
        error.loc = loc;
        throw error;
    }

    ns.Vec2 = Vec2;
    ns.Vec3 = Vec3;
    ns.Vec4 = Vec4;
    ns.Color = Color;
    ns.Shade = Shade;

}(exports));

},{"./base/index.js":22}],39:[function(require,module,exports){
(function (ns) {
    var parser = require('esprima'),
        parameters = require("./analyze/parameters.js"),
        interfaces = require("./interfaces.js"),
        inference = require("./analyze/typeinference/typeinference.js"),
        Base = require("./base/index.js"),
        GLSLCompiler = require("./generate/glsl/compiler.js").GLSLCompiler;



    Base.extend(ns, {

        /**
         * Analyzes a javascript program and returns a list of parameters
         * @param {function()|string) func
         * @returns {object!}
         */
        extractParameters: function (func, opt) {
            if (typeof func == 'function') {
                func = func.toString();
            }
            var ast = parser.parse(func);

            return parameters.extractParameters(ast, opt);
        },

        parseAndInferenceExpression: function (str, opt) {
            opt = opt || {};
            var ast = parser.parse(str, {raw: true, loc: opt.loc || false });
            var aast = inference.infer(ast, opt);
            return aast;
        },

        compileFragmentShader: function(aast){
            return new GLSLCompiler().compileFragmentShader(aast);
        },

        TYPES : interfaces.TYPES,
        OBJECT_KINDS : interfaces.OBJECT_KINDS,
        SOURCES: interfaces.SOURCES,
        Vec2: interfaces.Vec2,
        Vec3: interfaces.Vec3,
        Vec4: interfaces.Vec4,
        Texture: interfaces.Texture,
        Color: interfaces.Color

});
    /**
     * Library version:
     */
    ns.version = '0.0.1';

}(exports));

},{"./analyze/parameters.js":5,"./analyze/typeinference/typeinference.js":19,"./base/index.js":22,"./generate/glsl/compiler.js":25,"./interfaces.js":38,"esprima":3}]},{},[1])
//@ sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyJjOlxcVXNlcnNcXGtyaXN0aWFuXFxyZXBvc19wdWJsaWNcXHNoYWRlanNcXGJ1aWxkXFxzaGFkZS5qcyIsImM6XFxVc2Vyc1xca3Jpc3RpYW5cXHJlcG9zX3B1YmxpY1xcc2hhZGVqc1xcaW5kZXguanMiLCJjOlxcVXNlcnNcXGtyaXN0aWFuXFxyZXBvc19wdWJsaWNcXHNoYWRlanNcXG5vZGVfbW9kdWxlc1xcZXNwcmltYVxcZXNwcmltYS5qcyIsImM6XFxVc2Vyc1xca3Jpc3RpYW5cXHJlcG9zX3B1YmxpY1xcc2hhZGVqc1xcbm9kZV9tb2R1bGVzXFxlc3RyYXZlcnNlXFxlc3RyYXZlcnNlLmpzIiwiYzpcXFVzZXJzXFxrcmlzdGlhblxccmVwb3NfcHVibGljXFxzaGFkZWpzXFxzcmNcXGFuYWx5emVcXHBhcmFtZXRlcnMuanMiLCJjOlxcVXNlcnNcXGtyaXN0aWFuXFxyZXBvc19wdWJsaWNcXHNoYWRlanNcXHNyY1xcYW5hbHl6ZVxcdHlwZWluZmVyZW5jZVxcaW5mZXJfZXhwcmVzc2lvbi5qcyIsImM6XFxVc2Vyc1xca3Jpc3RpYW5cXHJlcG9zX3B1YmxpY1xcc2hhZGVqc1xcc3JjXFxhbmFseXplXFx0eXBlaW5mZXJlbmNlXFxpbmZlcl9zdGF0ZW1lbnQuanMiLCJjOlxcVXNlcnNcXGtyaXN0aWFuXFxyZXBvc19wdWJsaWNcXHNoYWRlanNcXHNyY1xcYW5hbHl6ZVxcdHlwZWluZmVyZW5jZVxccmVnaXN0cnlcXGNvbG9yY2xvc3VyZS5qcyIsImM6XFxVc2Vyc1xca3Jpc3RpYW5cXHJlcG9zX3B1YmxpY1xcc2hhZGVqc1xcc3JjXFxhbmFseXplXFx0eXBlaW5mZXJlbmNlXFxyZWdpc3RyeVxcaW5kZXguanMiLCJjOlxcVXNlcnNcXGtyaXN0aWFuXFxyZXBvc19wdWJsaWNcXHNoYWRlanNcXHNyY1xcYW5hbHl6ZVxcdHlwZWluZmVyZW5jZVxccmVnaXN0cnlcXG1hdGguanMiLCJjOlxcVXNlcnNcXGtyaXN0aWFuXFxyZXBvc19wdWJsaWNcXHNoYWRlanNcXHNyY1xcYW5hbHl6ZVxcdHlwZWluZmVyZW5jZVxccmVnaXN0cnlcXG1hdHJpeC5qcyIsImM6XFxVc2Vyc1xca3Jpc3RpYW5cXHJlcG9zX3B1YmxpY1xcc2hhZGVqc1xcc3JjXFxhbmFseXplXFx0eXBlaW5mZXJlbmNlXFxyZWdpc3RyeVxcc2hhZGUuanMiLCJjOlxcVXNlcnNcXGtyaXN0aWFuXFxyZXBvc19wdWJsaWNcXHNoYWRlanNcXHNyY1xcYW5hbHl6ZVxcdHlwZWluZmVyZW5jZVxccmVnaXN0cnlcXHN5c3RlbS5qcyIsImM6XFxVc2Vyc1xca3Jpc3RpYW5cXHJlcG9zX3B1YmxpY1xcc2hhZGVqc1xcc3JjXFxhbmFseXplXFx0eXBlaW5mZXJlbmNlXFxyZWdpc3RyeVxcdGV4dHVyZS5qcyIsImM6XFxVc2Vyc1xca3Jpc3RpYW5cXHJlcG9zX3B1YmxpY1xcc2hhZGVqc1xcc3JjXFxhbmFseXplXFx0eXBlaW5mZXJlbmNlXFxyZWdpc3RyeVxcdG9vbHMuanMiLCJjOlxcVXNlcnNcXGtyaXN0aWFuXFxyZXBvc19wdWJsaWNcXHNoYWRlanNcXHNyY1xcYW5hbHl6ZVxcdHlwZWluZmVyZW5jZVxccmVnaXN0cnlcXHZlYzIuanMiLCJjOlxcVXNlcnNcXGtyaXN0aWFuXFxyZXBvc19wdWJsaWNcXHNoYWRlanNcXHNyY1xcYW5hbHl6ZVxcdHlwZWluZmVyZW5jZVxccmVnaXN0cnlcXHZlYzMuanMiLCJjOlxcVXNlcnNcXGtyaXN0aWFuXFxyZXBvc19wdWJsaWNcXHNoYWRlanNcXHNyY1xcYW5hbHl6ZVxcdHlwZWluZmVyZW5jZVxccmVnaXN0cnlcXHZlYzQuanMiLCJjOlxcVXNlcnNcXGtyaXN0aWFuXFxyZXBvc19wdWJsaWNcXHNoYWRlanNcXHNyY1xcYW5hbHl6ZVxcdHlwZWluZmVyZW5jZVxcdHlwZWluZmVyZW5jZS5qcyIsImM6XFxVc2Vyc1xca3Jpc3RpYW5cXHJlcG9zX3B1YmxpY1xcc2hhZGVqc1xcc3JjXFxiYXNlXFxhbm5vdGF0aW9uLmpzIiwiYzpcXFVzZXJzXFxrcmlzdGlhblxccmVwb3NfcHVibGljXFxzaGFkZWpzXFxzcmNcXGJhc2VcXGNvbnRleHQuanMiLCJjOlxcVXNlcnNcXGtyaXN0aWFuXFxyZXBvc19wdWJsaWNcXHNoYWRlanNcXHNyY1xcYmFzZVxcaW5kZXguanMiLCJjOlxcVXNlcnNcXGtyaXN0aWFuXFxyZXBvc19wdWJsaWNcXHNoYWRlanNcXHNyY1xcYmFzZVxcdHlwZWluZm8uanMiLCJjOlxcVXNlcnNcXGtyaXN0aWFuXFxyZXBvc19wdWJsaWNcXHNoYWRlanNcXHNyY1xcYmFzZVxcdmVjLmpzIiwiYzpcXFVzZXJzXFxrcmlzdGlhblxccmVwb3NfcHVibGljXFxzaGFkZWpzXFxzcmNcXGdlbmVyYXRlXFxnbHNsXFxjb21waWxlci5qcyIsImM6XFxVc2Vyc1xca3Jpc3RpYW5cXHJlcG9zX3B1YmxpY1xcc2hhZGVqc1xcc3JjXFxnZW5lcmF0ZVxcZ2xzbFxcZ2xzbC1nZW5lcmF0ZS5qcyIsImM6XFxVc2Vyc1xca3Jpc3RpYW5cXHJlcG9zX3B1YmxpY1xcc2hhZGVqc1xcc3JjXFxnZW5lcmF0ZVxcZ2xzbFxccmVnaXN0cnlcXGNvbG9yY2xvc3VyZS5qcyIsImM6XFxVc2Vyc1xca3Jpc3RpYW5cXHJlcG9zX3B1YmxpY1xcc2hhZGVqc1xcc3JjXFxnZW5lcmF0ZVxcZ2xzbFxccmVnaXN0cnlcXGluZGV4LmpzIiwiYzpcXFVzZXJzXFxrcmlzdGlhblxccmVwb3NfcHVibGljXFxzaGFkZWpzXFxzcmNcXGdlbmVyYXRlXFxnbHNsXFxyZWdpc3RyeVxcbWF0aC5qcyIsImM6XFxVc2Vyc1xca3Jpc3RpYW5cXHJlcG9zX3B1YmxpY1xcc2hhZGVqc1xcc3JjXFxnZW5lcmF0ZVxcZ2xzbFxccmVnaXN0cnlcXHNoYWRlLmpzIiwiYzpcXFVzZXJzXFxrcmlzdGlhblxccmVwb3NfcHVibGljXFxzaGFkZWpzXFxzcmNcXGdlbmVyYXRlXFxnbHNsXFxyZWdpc3RyeVxcc3lzdGVtLmpzIiwiYzpcXFVzZXJzXFxrcmlzdGlhblxccmVwb3NfcHVibGljXFxzaGFkZWpzXFxzcmNcXGdlbmVyYXRlXFxnbHNsXFxyZWdpc3RyeVxcdGV4dHVyZS5qcyIsImM6XFxVc2Vyc1xca3Jpc3RpYW5cXHJlcG9zX3B1YmxpY1xcc2hhZGVqc1xcc3JjXFxnZW5lcmF0ZVxcZ2xzbFxccmVnaXN0cnlcXHRvb2xzLmpzIiwiYzpcXFVzZXJzXFxrcmlzdGlhblxccmVwb3NfcHVibGljXFxzaGFkZWpzXFxzcmNcXGdlbmVyYXRlXFxnbHNsXFxyZWdpc3RyeVxcdmVjMi5qcyIsImM6XFxVc2Vyc1xca3Jpc3RpYW5cXHJlcG9zX3B1YmxpY1xcc2hhZGVqc1xcc3JjXFxnZW5lcmF0ZVxcZ2xzbFxccmVnaXN0cnlcXHZlYzMuanMiLCJjOlxcVXNlcnNcXGtyaXN0aWFuXFxyZXBvc19wdWJsaWNcXHNoYWRlanNcXHNyY1xcZ2VuZXJhdGVcXGdsc2xcXHJlZ2lzdHJ5XFx2ZWM0LmpzIiwiYzpcXFVzZXJzXFxrcmlzdGlhblxccmVwb3NfcHVibGljXFxzaGFkZWpzXFxzcmNcXGdlbmVyYXRlXFxnbHNsXFx0cmFuc2Zvcm0uanMiLCJjOlxcVXNlcnNcXGtyaXN0aWFuXFxyZXBvc19wdWJsaWNcXHNoYWRlanNcXHNyY1xcaW50ZXJmYWNlcy5qcyIsImM6XFxVc2Vyc1xca3Jpc3RpYW5cXHJlcG9zX3B1YmxpY1xcc2hhZGVqc1xcc3JjXFxzaGFkZS5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNKQTs7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcDBIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzVEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JoQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaFBBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9JQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hTQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN1FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqVEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNURBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pPQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdFZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcFNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoZ0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM21CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gKCkge1xuICAgIHZhciBnbG9iYWwgPSB0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJyA/IHdpbmRvdyA6IHt9O1xuICAgIGdsb2JhbC5TaGFkZSA9IHJlcXVpcmUoXCIuLi9pbmRleC5qc1wiKTtcbn0oKSk7XG4iLCJtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoJy4vc3JjL3NoYWRlLmpzJyk7IiwiLypcbiAgQ29weXJpZ2h0IChDKSAyMDEyIEFyaXlhIEhpZGF5YXQgPGFyaXlhLmhpZGF5YXRAZ21haWwuY29tPlxuICBDb3B5cmlnaHQgKEMpIDIwMTIgTWF0aGlhcyBCeW5lbnMgPG1hdGhpYXNAcWl3aS5iZT5cbiAgQ29weXJpZ2h0IChDKSAyMDEyIEpvb3N0LVdpbSBCb2VrZXN0ZWlqbiA8am9vc3Qtd2ltQGJvZWtlc3RlaWpuLm5sPlxuICBDb3B5cmlnaHQgKEMpIDIwMTIgS3JpcyBLb3dhbCA8a3Jpcy5rb3dhbEBjaXhhci5jb20+XG4gIENvcHlyaWdodCAoQykgMjAxMiBZdXN1a2UgU3V6dWtpIDx1dGF0YW5lLnRlYUBnbWFpbC5jb20+XG4gIENvcHlyaWdodCAoQykgMjAxMiBBcnBhZCBCb3Jzb3MgPGFycGFkLmJvcnNvc0Bnb29nbGVtYWlsLmNvbT5cbiAgQ29weXJpZ2h0IChDKSAyMDExIEFyaXlhIEhpZGF5YXQgPGFyaXlhLmhpZGF5YXRAZ21haWwuY29tPlxuXG4gIFJlZGlzdHJpYnV0aW9uIGFuZCB1c2UgaW4gc291cmNlIGFuZCBiaW5hcnkgZm9ybXMsIHdpdGggb3Igd2l0aG91dFxuICBtb2RpZmljYXRpb24sIGFyZSBwZXJtaXR0ZWQgcHJvdmlkZWQgdGhhdCB0aGUgZm9sbG93aW5nIGNvbmRpdGlvbnMgYXJlIG1ldDpcblxuICAgICogUmVkaXN0cmlidXRpb25zIG9mIHNvdXJjZSBjb2RlIG11c3QgcmV0YWluIHRoZSBhYm92ZSBjb3B5cmlnaHRcbiAgICAgIG5vdGljZSwgdGhpcyBsaXN0IG9mIGNvbmRpdGlvbnMgYW5kIHRoZSBmb2xsb3dpbmcgZGlzY2xhaW1lci5cbiAgICAqIFJlZGlzdHJpYnV0aW9ucyBpbiBiaW5hcnkgZm9ybSBtdXN0IHJlcHJvZHVjZSB0aGUgYWJvdmUgY29weXJpZ2h0XG4gICAgICBub3RpY2UsIHRoaXMgbGlzdCBvZiBjb25kaXRpb25zIGFuZCB0aGUgZm9sbG93aW5nIGRpc2NsYWltZXIgaW4gdGhlXG4gICAgICBkb2N1bWVudGF0aW9uIGFuZC9vciBvdGhlciBtYXRlcmlhbHMgcHJvdmlkZWQgd2l0aCB0aGUgZGlzdHJpYnV0aW9uLlxuXG4gIFRISVMgU09GVFdBUkUgSVMgUFJPVklERUQgQlkgVEhFIENPUFlSSUdIVCBIT0xERVJTIEFORCBDT05UUklCVVRPUlMgXCJBUyBJU1wiXG4gIEFORCBBTlkgRVhQUkVTUyBPUiBJTVBMSUVEIFdBUlJBTlRJRVMsIElOQ0xVRElORywgQlVUIE5PVCBMSU1JVEVEIFRPLCBUSEVcbiAgSU1QTElFRCBXQVJSQU5USUVTIE9GIE1FUkNIQU5UQUJJTElUWSBBTkQgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0VcbiAgQVJFIERJU0NMQUlNRUQuIElOIE5PIEVWRU5UIFNIQUxMIDxDT1BZUklHSFQgSE9MREVSPiBCRSBMSUFCTEUgRk9SIEFOWVxuICBESVJFQ1QsIElORElSRUNULCBJTkNJREVOVEFMLCBTUEVDSUFMLCBFWEVNUExBUlksIE9SIENPTlNFUVVFTlRJQUwgREFNQUdFU1xuICAoSU5DTFVESU5HLCBCVVQgTk9UIExJTUlURUQgVE8sIFBST0NVUkVNRU5UIE9GIFNVQlNUSVRVVEUgR09PRFMgT1IgU0VSVklDRVM7XG4gIExPU1MgT0YgVVNFLCBEQVRBLCBPUiBQUk9GSVRTOyBPUiBCVVNJTkVTUyBJTlRFUlJVUFRJT04pIEhPV0VWRVIgQ0FVU0VEIEFORFxuICBPTiBBTlkgVEhFT1JZIE9GIExJQUJJTElUWSwgV0hFVEhFUiBJTiBDT05UUkFDVCwgU1RSSUNUIExJQUJJTElUWSwgT1IgVE9SVFxuICAoSU5DTFVESU5HIE5FR0xJR0VOQ0UgT1IgT1RIRVJXSVNFKSBBUklTSU5HIElOIEFOWSBXQVkgT1VUIE9GIFRIRSBVU0UgT0ZcbiAgVEhJUyBTT0ZUV0FSRSwgRVZFTiBJRiBBRFZJU0VEIE9GIFRIRSBQT1NTSUJJTElUWSBPRiBTVUNIIERBTUFHRS5cbiovXG5cbi8qanNsaW50IGJpdHdpc2U6dHJ1ZSBwbHVzcGx1czp0cnVlICovXG4vKmdsb2JhbCBlc3ByaW1hOnRydWUsIGRlZmluZTp0cnVlLCBleHBvcnRzOnRydWUsIHdpbmRvdzogdHJ1ZSxcbnRocm93RXJyb3I6IHRydWUsIGNyZWF0ZUxpdGVyYWw6IHRydWUsIGdlbmVyYXRlU3RhdGVtZW50OiB0cnVlLFxucGFyc2VBc3NpZ25tZW50RXhwcmVzc2lvbjogdHJ1ZSwgcGFyc2VCbG9jazogdHJ1ZSwgcGFyc2VFeHByZXNzaW9uOiB0cnVlLFxucGFyc2VGdW5jdGlvbkRlY2xhcmF0aW9uOiB0cnVlLCBwYXJzZUZ1bmN0aW9uRXhwcmVzc2lvbjogdHJ1ZSxcbnBhcnNlRnVuY3Rpb25Tb3VyY2VFbGVtZW50czogdHJ1ZSwgcGFyc2VWYXJpYWJsZUlkZW50aWZpZXI6IHRydWUsXG5wYXJzZUxlZnRIYW5kU2lkZUV4cHJlc3Npb246IHRydWUsXG5wYXJzZVN0YXRlbWVudDogdHJ1ZSwgcGFyc2VTb3VyY2VFbGVtZW50OiB0cnVlICovXG5cbihmdW5jdGlvbiAocm9vdCwgZmFjdG9yeSkge1xuICAgICd1c2Ugc3RyaWN0JztcblxuICAgIC8vIFVuaXZlcnNhbCBNb2R1bGUgRGVmaW5pdGlvbiAoVU1EKSB0byBzdXBwb3J0IEFNRCwgQ29tbW9uSlMvTm9kZS5qcyxcbiAgICAvLyBSaGlubywgYW5kIHBsYWluIGJyb3dzZXIgbG9hZGluZy5cbiAgICBpZiAodHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kKSB7XG4gICAgICAgIGRlZmluZShbJ2V4cG9ydHMnXSwgZmFjdG9yeSk7XG4gICAgfSBlbHNlIGlmICh0eXBlb2YgZXhwb3J0cyAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgZmFjdG9yeShleHBvcnRzKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBmYWN0b3J5KChyb290LmVzcHJpbWEgPSB7fSkpO1xuICAgIH1cbn0odGhpcywgZnVuY3Rpb24gKGV4cG9ydHMpIHtcbiAgICAndXNlIHN0cmljdCc7XG5cbiAgICB2YXIgVG9rZW4sXG4gICAgICAgIFRva2VuTmFtZSxcbiAgICAgICAgU3ludGF4LFxuICAgICAgICBQcm9wZXJ0eUtpbmQsXG4gICAgICAgIE1lc3NhZ2VzLFxuICAgICAgICBSZWdleCxcbiAgICAgICAgc291cmNlLFxuICAgICAgICBzdHJpY3QsXG4gICAgICAgIGluZGV4LFxuICAgICAgICBsaW5lTnVtYmVyLFxuICAgICAgICBsaW5lU3RhcnQsXG4gICAgICAgIGxlbmd0aCxcbiAgICAgICAgYnVmZmVyLFxuICAgICAgICBzdGF0ZSxcbiAgICAgICAgZXh0cmE7XG5cbiAgICBUb2tlbiA9IHtcbiAgICAgICAgQm9vbGVhbkxpdGVyYWw6IDEsXG4gICAgICAgIEVPRjogMixcbiAgICAgICAgSWRlbnRpZmllcjogMyxcbiAgICAgICAgS2V5d29yZDogNCxcbiAgICAgICAgTnVsbExpdGVyYWw6IDUsXG4gICAgICAgIE51bWVyaWNMaXRlcmFsOiA2LFxuICAgICAgICBQdW5jdHVhdG9yOiA3LFxuICAgICAgICBTdHJpbmdMaXRlcmFsOiA4XG4gICAgfTtcblxuICAgIFRva2VuTmFtZSA9IHt9O1xuICAgIFRva2VuTmFtZVtUb2tlbi5Cb29sZWFuTGl0ZXJhbF0gPSAnQm9vbGVhbic7XG4gICAgVG9rZW5OYW1lW1Rva2VuLkVPRl0gPSAnPGVuZD4nO1xuICAgIFRva2VuTmFtZVtUb2tlbi5JZGVudGlmaWVyXSA9ICdJZGVudGlmaWVyJztcbiAgICBUb2tlbk5hbWVbVG9rZW4uS2V5d29yZF0gPSAnS2V5d29yZCc7XG4gICAgVG9rZW5OYW1lW1Rva2VuLk51bGxMaXRlcmFsXSA9ICdOdWxsJztcbiAgICBUb2tlbk5hbWVbVG9rZW4uTnVtZXJpY0xpdGVyYWxdID0gJ051bWVyaWMnO1xuICAgIFRva2VuTmFtZVtUb2tlbi5QdW5jdHVhdG9yXSA9ICdQdW5jdHVhdG9yJztcbiAgICBUb2tlbk5hbWVbVG9rZW4uU3RyaW5nTGl0ZXJhbF0gPSAnU3RyaW5nJztcblxuICAgIFN5bnRheCA9IHtcbiAgICAgICAgQXNzaWdubWVudEV4cHJlc3Npb246ICdBc3NpZ25tZW50RXhwcmVzc2lvbicsXG4gICAgICAgIEFycmF5RXhwcmVzc2lvbjogJ0FycmF5RXhwcmVzc2lvbicsXG4gICAgICAgIEJsb2NrU3RhdGVtZW50OiAnQmxvY2tTdGF0ZW1lbnQnLFxuICAgICAgICBCaW5hcnlFeHByZXNzaW9uOiAnQmluYXJ5RXhwcmVzc2lvbicsXG4gICAgICAgIEJyZWFrU3RhdGVtZW50OiAnQnJlYWtTdGF0ZW1lbnQnLFxuICAgICAgICBDYWxsRXhwcmVzc2lvbjogJ0NhbGxFeHByZXNzaW9uJyxcbiAgICAgICAgQ2F0Y2hDbGF1c2U6ICdDYXRjaENsYXVzZScsXG4gICAgICAgIENvbmRpdGlvbmFsRXhwcmVzc2lvbjogJ0NvbmRpdGlvbmFsRXhwcmVzc2lvbicsXG4gICAgICAgIENvbnRpbnVlU3RhdGVtZW50OiAnQ29udGludWVTdGF0ZW1lbnQnLFxuICAgICAgICBEb1doaWxlU3RhdGVtZW50OiAnRG9XaGlsZVN0YXRlbWVudCcsXG4gICAgICAgIERlYnVnZ2VyU3RhdGVtZW50OiAnRGVidWdnZXJTdGF0ZW1lbnQnLFxuICAgICAgICBFbXB0eVN0YXRlbWVudDogJ0VtcHR5U3RhdGVtZW50JyxcbiAgICAgICAgRXhwcmVzc2lvblN0YXRlbWVudDogJ0V4cHJlc3Npb25TdGF0ZW1lbnQnLFxuICAgICAgICBGb3JTdGF0ZW1lbnQ6ICdGb3JTdGF0ZW1lbnQnLFxuICAgICAgICBGb3JJblN0YXRlbWVudDogJ0ZvckluU3RhdGVtZW50JyxcbiAgICAgICAgRnVuY3Rpb25EZWNsYXJhdGlvbjogJ0Z1bmN0aW9uRGVjbGFyYXRpb24nLFxuICAgICAgICBGdW5jdGlvbkV4cHJlc3Npb246ICdGdW5jdGlvbkV4cHJlc3Npb24nLFxuICAgICAgICBJZGVudGlmaWVyOiAnSWRlbnRpZmllcicsXG4gICAgICAgIElmU3RhdGVtZW50OiAnSWZTdGF0ZW1lbnQnLFxuICAgICAgICBMaXRlcmFsOiAnTGl0ZXJhbCcsXG4gICAgICAgIExhYmVsZWRTdGF0ZW1lbnQ6ICdMYWJlbGVkU3RhdGVtZW50JyxcbiAgICAgICAgTG9naWNhbEV4cHJlc3Npb246ICdMb2dpY2FsRXhwcmVzc2lvbicsXG4gICAgICAgIE1lbWJlckV4cHJlc3Npb246ICdNZW1iZXJFeHByZXNzaW9uJyxcbiAgICAgICAgTmV3RXhwcmVzc2lvbjogJ05ld0V4cHJlc3Npb24nLFxuICAgICAgICBPYmplY3RFeHByZXNzaW9uOiAnT2JqZWN0RXhwcmVzc2lvbicsXG4gICAgICAgIFByb2dyYW06ICdQcm9ncmFtJyxcbiAgICAgICAgUHJvcGVydHk6ICdQcm9wZXJ0eScsXG4gICAgICAgIFJldHVyblN0YXRlbWVudDogJ1JldHVyblN0YXRlbWVudCcsXG4gICAgICAgIFNlcXVlbmNlRXhwcmVzc2lvbjogJ1NlcXVlbmNlRXhwcmVzc2lvbicsXG4gICAgICAgIFN3aXRjaFN0YXRlbWVudDogJ1N3aXRjaFN0YXRlbWVudCcsXG4gICAgICAgIFN3aXRjaENhc2U6ICdTd2l0Y2hDYXNlJyxcbiAgICAgICAgVGhpc0V4cHJlc3Npb246ICdUaGlzRXhwcmVzc2lvbicsXG4gICAgICAgIFRocm93U3RhdGVtZW50OiAnVGhyb3dTdGF0ZW1lbnQnLFxuICAgICAgICBUcnlTdGF0ZW1lbnQ6ICdUcnlTdGF0ZW1lbnQnLFxuICAgICAgICBVbmFyeUV4cHJlc3Npb246ICdVbmFyeUV4cHJlc3Npb24nLFxuICAgICAgICBVcGRhdGVFeHByZXNzaW9uOiAnVXBkYXRlRXhwcmVzc2lvbicsXG4gICAgICAgIFZhcmlhYmxlRGVjbGFyYXRpb246ICdWYXJpYWJsZURlY2xhcmF0aW9uJyxcbiAgICAgICAgVmFyaWFibGVEZWNsYXJhdG9yOiAnVmFyaWFibGVEZWNsYXJhdG9yJyxcbiAgICAgICAgV2hpbGVTdGF0ZW1lbnQ6ICdXaGlsZVN0YXRlbWVudCcsXG4gICAgICAgIFdpdGhTdGF0ZW1lbnQ6ICdXaXRoU3RhdGVtZW50J1xuICAgIH07XG5cbiAgICBQcm9wZXJ0eUtpbmQgPSB7XG4gICAgICAgIERhdGE6IDEsXG4gICAgICAgIEdldDogMixcbiAgICAgICAgU2V0OiA0XG4gICAgfTtcblxuICAgIC8vIEVycm9yIG1lc3NhZ2VzIHNob3VsZCBiZSBpZGVudGljYWwgdG8gVjguXG4gICAgTWVzc2FnZXMgPSB7XG4gICAgICAgIFVuZXhwZWN0ZWRUb2tlbjogICdVbmV4cGVjdGVkIHRva2VuICUwJyxcbiAgICAgICAgVW5leHBlY3RlZE51bWJlcjogICdVbmV4cGVjdGVkIG51bWJlcicsXG4gICAgICAgIFVuZXhwZWN0ZWRTdHJpbmc6ICAnVW5leHBlY3RlZCBzdHJpbmcnLFxuICAgICAgICBVbmV4cGVjdGVkSWRlbnRpZmllcjogICdVbmV4cGVjdGVkIGlkZW50aWZpZXInLFxuICAgICAgICBVbmV4cGVjdGVkUmVzZXJ2ZWQ6ICAnVW5leHBlY3RlZCByZXNlcnZlZCB3b3JkJyxcbiAgICAgICAgVW5leHBlY3RlZEVPUzogICdVbmV4cGVjdGVkIGVuZCBvZiBpbnB1dCcsXG4gICAgICAgIE5ld2xpbmVBZnRlclRocm93OiAgJ0lsbGVnYWwgbmV3bGluZSBhZnRlciB0aHJvdycsXG4gICAgICAgIEludmFsaWRSZWdFeHA6ICdJbnZhbGlkIHJlZ3VsYXIgZXhwcmVzc2lvbicsXG4gICAgICAgIFVudGVybWluYXRlZFJlZ0V4cDogICdJbnZhbGlkIHJlZ3VsYXIgZXhwcmVzc2lvbjogbWlzc2luZyAvJyxcbiAgICAgICAgSW52YWxpZExIU0luQXNzaWdubWVudDogICdJbnZhbGlkIGxlZnQtaGFuZCBzaWRlIGluIGFzc2lnbm1lbnQnLFxuICAgICAgICBJbnZhbGlkTEhTSW5Gb3JJbjogICdJbnZhbGlkIGxlZnQtaGFuZCBzaWRlIGluIGZvci1pbicsXG4gICAgICAgIE11bHRpcGxlRGVmYXVsdHNJblN3aXRjaDogJ01vcmUgdGhhbiBvbmUgZGVmYXVsdCBjbGF1c2UgaW4gc3dpdGNoIHN0YXRlbWVudCcsXG4gICAgICAgIE5vQ2F0Y2hPckZpbmFsbHk6ICAnTWlzc2luZyBjYXRjaCBvciBmaW5hbGx5IGFmdGVyIHRyeScsXG4gICAgICAgIFVua25vd25MYWJlbDogJ1VuZGVmaW5lZCBsYWJlbCBcXCclMFxcJycsXG4gICAgICAgIFJlZGVjbGFyYXRpb246ICclMCBcXCclMVxcJyBoYXMgYWxyZWFkeSBiZWVuIGRlY2xhcmVkJyxcbiAgICAgICAgSWxsZWdhbENvbnRpbnVlOiAnSWxsZWdhbCBjb250aW51ZSBzdGF0ZW1lbnQnLFxuICAgICAgICBJbGxlZ2FsQnJlYWs6ICdJbGxlZ2FsIGJyZWFrIHN0YXRlbWVudCcsXG4gICAgICAgIElsbGVnYWxSZXR1cm46ICdJbGxlZ2FsIHJldHVybiBzdGF0ZW1lbnQnLFxuICAgICAgICBTdHJpY3RNb2RlV2l0aDogICdTdHJpY3QgbW9kZSBjb2RlIG1heSBub3QgaW5jbHVkZSBhIHdpdGggc3RhdGVtZW50JyxcbiAgICAgICAgU3RyaWN0Q2F0Y2hWYXJpYWJsZTogICdDYXRjaCB2YXJpYWJsZSBtYXkgbm90IGJlIGV2YWwgb3IgYXJndW1lbnRzIGluIHN0cmljdCBtb2RlJyxcbiAgICAgICAgU3RyaWN0VmFyTmFtZTogICdWYXJpYWJsZSBuYW1lIG1heSBub3QgYmUgZXZhbCBvciBhcmd1bWVudHMgaW4gc3RyaWN0IG1vZGUnLFxuICAgICAgICBTdHJpY3RQYXJhbU5hbWU6ICAnUGFyYW1ldGVyIG5hbWUgZXZhbCBvciBhcmd1bWVudHMgaXMgbm90IGFsbG93ZWQgaW4gc3RyaWN0IG1vZGUnLFxuICAgICAgICBTdHJpY3RQYXJhbUR1cGU6ICdTdHJpY3QgbW9kZSBmdW5jdGlvbiBtYXkgbm90IGhhdmUgZHVwbGljYXRlIHBhcmFtZXRlciBuYW1lcycsXG4gICAgICAgIFN0cmljdEZ1bmN0aW9uTmFtZTogICdGdW5jdGlvbiBuYW1lIG1heSBub3QgYmUgZXZhbCBvciBhcmd1bWVudHMgaW4gc3RyaWN0IG1vZGUnLFxuICAgICAgICBTdHJpY3RPY3RhbExpdGVyYWw6ICAnT2N0YWwgbGl0ZXJhbHMgYXJlIG5vdCBhbGxvd2VkIGluIHN0cmljdCBtb2RlLicsXG4gICAgICAgIFN0cmljdERlbGV0ZTogICdEZWxldGUgb2YgYW4gdW5xdWFsaWZpZWQgaWRlbnRpZmllciBpbiBzdHJpY3QgbW9kZS4nLFxuICAgICAgICBTdHJpY3REdXBsaWNhdGVQcm9wZXJ0eTogICdEdXBsaWNhdGUgZGF0YSBwcm9wZXJ0eSBpbiBvYmplY3QgbGl0ZXJhbCBub3QgYWxsb3dlZCBpbiBzdHJpY3QgbW9kZScsXG4gICAgICAgIEFjY2Vzc29yRGF0YVByb3BlcnR5OiAgJ09iamVjdCBsaXRlcmFsIG1heSBub3QgaGF2ZSBkYXRhIGFuZCBhY2Nlc3NvciBwcm9wZXJ0eSB3aXRoIHRoZSBzYW1lIG5hbWUnLFxuICAgICAgICBBY2Nlc3NvckdldFNldDogICdPYmplY3QgbGl0ZXJhbCBtYXkgbm90IGhhdmUgbXVsdGlwbGUgZ2V0L3NldCBhY2Nlc3NvcnMgd2l0aCB0aGUgc2FtZSBuYW1lJyxcbiAgICAgICAgU3RyaWN0TEhTQXNzaWdubWVudDogICdBc3NpZ25tZW50IHRvIGV2YWwgb3IgYXJndW1lbnRzIGlzIG5vdCBhbGxvd2VkIGluIHN0cmljdCBtb2RlJyxcbiAgICAgICAgU3RyaWN0TEhTUG9zdGZpeDogICdQb3N0Zml4IGluY3JlbWVudC9kZWNyZW1lbnQgbWF5IG5vdCBoYXZlIGV2YWwgb3IgYXJndW1lbnRzIG9wZXJhbmQgaW4gc3RyaWN0IG1vZGUnLFxuICAgICAgICBTdHJpY3RMSFNQcmVmaXg6ICAnUHJlZml4IGluY3JlbWVudC9kZWNyZW1lbnQgbWF5IG5vdCBoYXZlIGV2YWwgb3IgYXJndW1lbnRzIG9wZXJhbmQgaW4gc3RyaWN0IG1vZGUnLFxuICAgICAgICBTdHJpY3RSZXNlcnZlZFdvcmQ6ICAnVXNlIG9mIGZ1dHVyZSByZXNlcnZlZCB3b3JkIGluIHN0cmljdCBtb2RlJ1xuICAgIH07XG5cbiAgICAvLyBTZWUgYWxzbyB0b29scy9nZW5lcmF0ZS11bmljb2RlLXJlZ2V4LnB5LlxuICAgIFJlZ2V4ID0ge1xuICAgICAgICBOb25Bc2NpaUlkZW50aWZpZXJTdGFydDogbmV3IFJlZ0V4cCgnW1xceGFhXFx4YjVcXHhiYVxceGMwLVxceGQ2XFx4ZDgtXFx4ZjZcXHhmOC1cXHUwMmMxXFx1MDJjNi1cXHUwMmQxXFx1MDJlMC1cXHUwMmU0XFx1MDJlY1xcdTAyZWVcXHUwMzcwLVxcdTAzNzRcXHUwMzc2XFx1MDM3N1xcdTAzN2EtXFx1MDM3ZFxcdTAzODZcXHUwMzg4LVxcdTAzOGFcXHUwMzhjXFx1MDM4ZS1cXHUwM2ExXFx1MDNhMy1cXHUwM2Y1XFx1MDNmNy1cXHUwNDgxXFx1MDQ4YS1cXHUwNTI3XFx1MDUzMS1cXHUwNTU2XFx1MDU1OVxcdTA1NjEtXFx1MDU4N1xcdTA1ZDAtXFx1MDVlYVxcdTA1ZjAtXFx1MDVmMlxcdTA2MjAtXFx1MDY0YVxcdTA2NmVcXHUwNjZmXFx1MDY3MS1cXHUwNmQzXFx1MDZkNVxcdTA2ZTVcXHUwNmU2XFx1MDZlZVxcdTA2ZWZcXHUwNmZhLVxcdTA2ZmNcXHUwNmZmXFx1MDcxMFxcdTA3MTItXFx1MDcyZlxcdTA3NGQtXFx1MDdhNVxcdTA3YjFcXHUwN2NhLVxcdTA3ZWFcXHUwN2Y0XFx1MDdmNVxcdTA3ZmFcXHUwODAwLVxcdTA4MTVcXHUwODFhXFx1MDgyNFxcdTA4MjhcXHUwODQwLVxcdTA4NThcXHUwOGEwXFx1MDhhMi1cXHUwOGFjXFx1MDkwNC1cXHUwOTM5XFx1MDkzZFxcdTA5NTBcXHUwOTU4LVxcdTA5NjFcXHUwOTcxLVxcdTA5NzdcXHUwOTc5LVxcdTA5N2ZcXHUwOTg1LVxcdTA5OGNcXHUwOThmXFx1MDk5MFxcdTA5OTMtXFx1MDlhOFxcdTA5YWEtXFx1MDliMFxcdTA5YjJcXHUwOWI2LVxcdTA5YjlcXHUwOWJkXFx1MDljZVxcdTA5ZGNcXHUwOWRkXFx1MDlkZi1cXHUwOWUxXFx1MDlmMFxcdTA5ZjFcXHUwYTA1LVxcdTBhMGFcXHUwYTBmXFx1MGExMFxcdTBhMTMtXFx1MGEyOFxcdTBhMmEtXFx1MGEzMFxcdTBhMzJcXHUwYTMzXFx1MGEzNVxcdTBhMzZcXHUwYTM4XFx1MGEzOVxcdTBhNTktXFx1MGE1Y1xcdTBhNWVcXHUwYTcyLVxcdTBhNzRcXHUwYTg1LVxcdTBhOGRcXHUwYThmLVxcdTBhOTFcXHUwYTkzLVxcdTBhYThcXHUwYWFhLVxcdTBhYjBcXHUwYWIyXFx1MGFiM1xcdTBhYjUtXFx1MGFiOVxcdTBhYmRcXHUwYWQwXFx1MGFlMFxcdTBhZTFcXHUwYjA1LVxcdTBiMGNcXHUwYjBmXFx1MGIxMFxcdTBiMTMtXFx1MGIyOFxcdTBiMmEtXFx1MGIzMFxcdTBiMzJcXHUwYjMzXFx1MGIzNS1cXHUwYjM5XFx1MGIzZFxcdTBiNWNcXHUwYjVkXFx1MGI1Zi1cXHUwYjYxXFx1MGI3MVxcdTBiODNcXHUwYjg1LVxcdTBiOGFcXHUwYjhlLVxcdTBiOTBcXHUwYjkyLVxcdTBiOTVcXHUwYjk5XFx1MGI5YVxcdTBiOWNcXHUwYjllXFx1MGI5ZlxcdTBiYTNcXHUwYmE0XFx1MGJhOC1cXHUwYmFhXFx1MGJhZS1cXHUwYmI5XFx1MGJkMFxcdTBjMDUtXFx1MGMwY1xcdTBjMGUtXFx1MGMxMFxcdTBjMTItXFx1MGMyOFxcdTBjMmEtXFx1MGMzM1xcdTBjMzUtXFx1MGMzOVxcdTBjM2RcXHUwYzU4XFx1MGM1OVxcdTBjNjBcXHUwYzYxXFx1MGM4NS1cXHUwYzhjXFx1MGM4ZS1cXHUwYzkwXFx1MGM5Mi1cXHUwY2E4XFx1MGNhYS1cXHUwY2IzXFx1MGNiNS1cXHUwY2I5XFx1MGNiZFxcdTBjZGVcXHUwY2UwXFx1MGNlMVxcdTBjZjFcXHUwY2YyXFx1MGQwNS1cXHUwZDBjXFx1MGQwZS1cXHUwZDEwXFx1MGQxMi1cXHUwZDNhXFx1MGQzZFxcdTBkNGVcXHUwZDYwXFx1MGQ2MVxcdTBkN2EtXFx1MGQ3ZlxcdTBkODUtXFx1MGQ5NlxcdTBkOWEtXFx1MGRiMVxcdTBkYjMtXFx1MGRiYlxcdTBkYmRcXHUwZGMwLVxcdTBkYzZcXHUwZTAxLVxcdTBlMzBcXHUwZTMyXFx1MGUzM1xcdTBlNDAtXFx1MGU0NlxcdTBlODFcXHUwZTgyXFx1MGU4NFxcdTBlODdcXHUwZTg4XFx1MGU4YVxcdTBlOGRcXHUwZTk0LVxcdTBlOTdcXHUwZTk5LVxcdTBlOWZcXHUwZWExLVxcdTBlYTNcXHUwZWE1XFx1MGVhN1xcdTBlYWFcXHUwZWFiXFx1MGVhZC1cXHUwZWIwXFx1MGViMlxcdTBlYjNcXHUwZWJkXFx1MGVjMC1cXHUwZWM0XFx1MGVjNlxcdTBlZGMtXFx1MGVkZlxcdTBmMDBcXHUwZjQwLVxcdTBmNDdcXHUwZjQ5LVxcdTBmNmNcXHUwZjg4LVxcdTBmOGNcXHUxMDAwLVxcdTEwMmFcXHUxMDNmXFx1MTA1MC1cXHUxMDU1XFx1MTA1YS1cXHUxMDVkXFx1MTA2MVxcdTEwNjVcXHUxMDY2XFx1MTA2ZS1cXHUxMDcwXFx1MTA3NS1cXHUxMDgxXFx1MTA4ZVxcdTEwYTAtXFx1MTBjNVxcdTEwYzdcXHUxMGNkXFx1MTBkMC1cXHUxMGZhXFx1MTBmYy1cXHUxMjQ4XFx1MTI0YS1cXHUxMjRkXFx1MTI1MC1cXHUxMjU2XFx1MTI1OFxcdTEyNWEtXFx1MTI1ZFxcdTEyNjAtXFx1MTI4OFxcdTEyOGEtXFx1MTI4ZFxcdTEyOTAtXFx1MTJiMFxcdTEyYjItXFx1MTJiNVxcdTEyYjgtXFx1MTJiZVxcdTEyYzBcXHUxMmMyLVxcdTEyYzVcXHUxMmM4LVxcdTEyZDZcXHUxMmQ4LVxcdTEzMTBcXHUxMzEyLVxcdTEzMTVcXHUxMzE4LVxcdTEzNWFcXHUxMzgwLVxcdTEzOGZcXHUxM2EwLVxcdTEzZjRcXHUxNDAxLVxcdTE2NmNcXHUxNjZmLVxcdTE2N2ZcXHUxNjgxLVxcdTE2OWFcXHUxNmEwLVxcdTE2ZWFcXHUxNmVlLVxcdTE2ZjBcXHUxNzAwLVxcdTE3MGNcXHUxNzBlLVxcdTE3MTFcXHUxNzIwLVxcdTE3MzFcXHUxNzQwLVxcdTE3NTFcXHUxNzYwLVxcdTE3NmNcXHUxNzZlLVxcdTE3NzBcXHUxNzgwLVxcdTE3YjNcXHUxN2Q3XFx1MTdkY1xcdTE4MjAtXFx1MTg3N1xcdTE4ODAtXFx1MThhOFxcdTE4YWFcXHUxOGIwLVxcdTE4ZjVcXHUxOTAwLVxcdTE5MWNcXHUxOTUwLVxcdTE5NmRcXHUxOTcwLVxcdTE5NzRcXHUxOTgwLVxcdTE5YWJcXHUxOWMxLVxcdTE5YzdcXHUxYTAwLVxcdTFhMTZcXHUxYTIwLVxcdTFhNTRcXHUxYWE3XFx1MWIwNS1cXHUxYjMzXFx1MWI0NS1cXHUxYjRiXFx1MWI4My1cXHUxYmEwXFx1MWJhZVxcdTFiYWZcXHUxYmJhLVxcdTFiZTVcXHUxYzAwLVxcdTFjMjNcXHUxYzRkLVxcdTFjNGZcXHUxYzVhLVxcdTFjN2RcXHUxY2U5LVxcdTFjZWNcXHUxY2VlLVxcdTFjZjFcXHUxY2Y1XFx1MWNmNlxcdTFkMDAtXFx1MWRiZlxcdTFlMDAtXFx1MWYxNVxcdTFmMTgtXFx1MWYxZFxcdTFmMjAtXFx1MWY0NVxcdTFmNDgtXFx1MWY0ZFxcdTFmNTAtXFx1MWY1N1xcdTFmNTlcXHUxZjViXFx1MWY1ZFxcdTFmNWYtXFx1MWY3ZFxcdTFmODAtXFx1MWZiNFxcdTFmYjYtXFx1MWZiY1xcdTFmYmVcXHUxZmMyLVxcdTFmYzRcXHUxZmM2LVxcdTFmY2NcXHUxZmQwLVxcdTFmZDNcXHUxZmQ2LVxcdTFmZGJcXHUxZmUwLVxcdTFmZWNcXHUxZmYyLVxcdTFmZjRcXHUxZmY2LVxcdTFmZmNcXHUyMDcxXFx1MjA3ZlxcdTIwOTAtXFx1MjA5Y1xcdTIxMDJcXHUyMTA3XFx1MjEwYS1cXHUyMTEzXFx1MjExNVxcdTIxMTktXFx1MjExZFxcdTIxMjRcXHUyMTI2XFx1MjEyOFxcdTIxMmEtXFx1MjEyZFxcdTIxMmYtXFx1MjEzOVxcdTIxM2MtXFx1MjEzZlxcdTIxNDUtXFx1MjE0OVxcdTIxNGVcXHUyMTYwLVxcdTIxODhcXHUyYzAwLVxcdTJjMmVcXHUyYzMwLVxcdTJjNWVcXHUyYzYwLVxcdTJjZTRcXHUyY2ViLVxcdTJjZWVcXHUyY2YyXFx1MmNmM1xcdTJkMDAtXFx1MmQyNVxcdTJkMjdcXHUyZDJkXFx1MmQzMC1cXHUyZDY3XFx1MmQ2ZlxcdTJkODAtXFx1MmQ5NlxcdTJkYTAtXFx1MmRhNlxcdTJkYTgtXFx1MmRhZVxcdTJkYjAtXFx1MmRiNlxcdTJkYjgtXFx1MmRiZVxcdTJkYzAtXFx1MmRjNlxcdTJkYzgtXFx1MmRjZVxcdTJkZDAtXFx1MmRkNlxcdTJkZDgtXFx1MmRkZVxcdTJlMmZcXHUzMDA1LVxcdTMwMDdcXHUzMDIxLVxcdTMwMjlcXHUzMDMxLVxcdTMwMzVcXHUzMDM4LVxcdTMwM2NcXHUzMDQxLVxcdTMwOTZcXHUzMDlkLVxcdTMwOWZcXHUzMGExLVxcdTMwZmFcXHUzMGZjLVxcdTMwZmZcXHUzMTA1LVxcdTMxMmRcXHUzMTMxLVxcdTMxOGVcXHUzMWEwLVxcdTMxYmFcXHUzMWYwLVxcdTMxZmZcXHUzNDAwLVxcdTRkYjVcXHU0ZTAwLVxcdTlmY2NcXHVhMDAwLVxcdWE0OGNcXHVhNGQwLVxcdWE0ZmRcXHVhNTAwLVxcdWE2MGNcXHVhNjEwLVxcdWE2MWZcXHVhNjJhXFx1YTYyYlxcdWE2NDAtXFx1YTY2ZVxcdWE2N2YtXFx1YTY5N1xcdWE2YTAtXFx1YTZlZlxcdWE3MTctXFx1YTcxZlxcdWE3MjItXFx1YTc4OFxcdWE3OGItXFx1YTc4ZVxcdWE3OTAtXFx1YTc5M1xcdWE3YTAtXFx1YTdhYVxcdWE3ZjgtXFx1YTgwMVxcdWE4MDMtXFx1YTgwNVxcdWE4MDctXFx1YTgwYVxcdWE4MGMtXFx1YTgyMlxcdWE4NDAtXFx1YTg3M1xcdWE4ODItXFx1YThiM1xcdWE4ZjItXFx1YThmN1xcdWE4ZmJcXHVhOTBhLVxcdWE5MjVcXHVhOTMwLVxcdWE5NDZcXHVhOTYwLVxcdWE5N2NcXHVhOTg0LVxcdWE5YjJcXHVhOWNmXFx1YWEwMC1cXHVhYTI4XFx1YWE0MC1cXHVhYTQyXFx1YWE0NC1cXHVhYTRiXFx1YWE2MC1cXHVhYTc2XFx1YWE3YVxcdWFhODAtXFx1YWFhZlxcdWFhYjFcXHVhYWI1XFx1YWFiNlxcdWFhYjktXFx1YWFiZFxcdWFhYzBcXHVhYWMyXFx1YWFkYi1cXHVhYWRkXFx1YWFlMC1cXHVhYWVhXFx1YWFmMi1cXHVhYWY0XFx1YWIwMS1cXHVhYjA2XFx1YWIwOS1cXHVhYjBlXFx1YWIxMS1cXHVhYjE2XFx1YWIyMC1cXHVhYjI2XFx1YWIyOC1cXHVhYjJlXFx1YWJjMC1cXHVhYmUyXFx1YWMwMC1cXHVkN2EzXFx1ZDdiMC1cXHVkN2M2XFx1ZDdjYi1cXHVkN2ZiXFx1ZjkwMC1cXHVmYTZkXFx1ZmE3MC1cXHVmYWQ5XFx1ZmIwMC1cXHVmYjA2XFx1ZmIxMy1cXHVmYjE3XFx1ZmIxZFxcdWZiMWYtXFx1ZmIyOFxcdWZiMmEtXFx1ZmIzNlxcdWZiMzgtXFx1ZmIzY1xcdWZiM2VcXHVmYjQwXFx1ZmI0MVxcdWZiNDNcXHVmYjQ0XFx1ZmI0Ni1cXHVmYmIxXFx1ZmJkMy1cXHVmZDNkXFx1ZmQ1MC1cXHVmZDhmXFx1ZmQ5Mi1cXHVmZGM3XFx1ZmRmMC1cXHVmZGZiXFx1ZmU3MC1cXHVmZTc0XFx1ZmU3Ni1cXHVmZWZjXFx1ZmYyMS1cXHVmZjNhXFx1ZmY0MS1cXHVmZjVhXFx1ZmY2Ni1cXHVmZmJlXFx1ZmZjMi1cXHVmZmM3XFx1ZmZjYS1cXHVmZmNmXFx1ZmZkMi1cXHVmZmQ3XFx1ZmZkYS1cXHVmZmRjXScpLFxuICAgICAgICBOb25Bc2NpaUlkZW50aWZpZXJQYXJ0OiBuZXcgUmVnRXhwKCdbXFx4YWFcXHhiNVxceGJhXFx4YzAtXFx4ZDZcXHhkOC1cXHhmNlxceGY4LVxcdTAyYzFcXHUwMmM2LVxcdTAyZDFcXHUwMmUwLVxcdTAyZTRcXHUwMmVjXFx1MDJlZVxcdTAzMDAtXFx1MDM3NFxcdTAzNzZcXHUwMzc3XFx1MDM3YS1cXHUwMzdkXFx1MDM4NlxcdTAzODgtXFx1MDM4YVxcdTAzOGNcXHUwMzhlLVxcdTAzYTFcXHUwM2EzLVxcdTAzZjVcXHUwM2Y3LVxcdTA0ODFcXHUwNDgzLVxcdTA0ODdcXHUwNDhhLVxcdTA1MjdcXHUwNTMxLVxcdTA1NTZcXHUwNTU5XFx1MDU2MS1cXHUwNTg3XFx1MDU5MS1cXHUwNWJkXFx1MDViZlxcdTA1YzFcXHUwNWMyXFx1MDVjNFxcdTA1YzVcXHUwNWM3XFx1MDVkMC1cXHUwNWVhXFx1MDVmMC1cXHUwNWYyXFx1MDYxMC1cXHUwNjFhXFx1MDYyMC1cXHUwNjY5XFx1MDY2ZS1cXHUwNmQzXFx1MDZkNS1cXHUwNmRjXFx1MDZkZi1cXHUwNmU4XFx1MDZlYS1cXHUwNmZjXFx1MDZmZlxcdTA3MTAtXFx1MDc0YVxcdTA3NGQtXFx1MDdiMVxcdTA3YzAtXFx1MDdmNVxcdTA3ZmFcXHUwODAwLVxcdTA4MmRcXHUwODQwLVxcdTA4NWJcXHUwOGEwXFx1MDhhMi1cXHUwOGFjXFx1MDhlNC1cXHUwOGZlXFx1MDkwMC1cXHUwOTYzXFx1MDk2Ni1cXHUwOTZmXFx1MDk3MS1cXHUwOTc3XFx1MDk3OS1cXHUwOTdmXFx1MDk4MS1cXHUwOTgzXFx1MDk4NS1cXHUwOThjXFx1MDk4ZlxcdTA5OTBcXHUwOTkzLVxcdTA5YThcXHUwOWFhLVxcdTA5YjBcXHUwOWIyXFx1MDliNi1cXHUwOWI5XFx1MDliYy1cXHUwOWM0XFx1MDljN1xcdTA5YzhcXHUwOWNiLVxcdTA5Y2VcXHUwOWQ3XFx1MDlkY1xcdTA5ZGRcXHUwOWRmLVxcdTA5ZTNcXHUwOWU2LVxcdTA5ZjFcXHUwYTAxLVxcdTBhMDNcXHUwYTA1LVxcdTBhMGFcXHUwYTBmXFx1MGExMFxcdTBhMTMtXFx1MGEyOFxcdTBhMmEtXFx1MGEzMFxcdTBhMzJcXHUwYTMzXFx1MGEzNVxcdTBhMzZcXHUwYTM4XFx1MGEzOVxcdTBhM2NcXHUwYTNlLVxcdTBhNDJcXHUwYTQ3XFx1MGE0OFxcdTBhNGItXFx1MGE0ZFxcdTBhNTFcXHUwYTU5LVxcdTBhNWNcXHUwYTVlXFx1MGE2Ni1cXHUwYTc1XFx1MGE4MS1cXHUwYTgzXFx1MGE4NS1cXHUwYThkXFx1MGE4Zi1cXHUwYTkxXFx1MGE5My1cXHUwYWE4XFx1MGFhYS1cXHUwYWIwXFx1MGFiMlxcdTBhYjNcXHUwYWI1LVxcdTBhYjlcXHUwYWJjLVxcdTBhYzVcXHUwYWM3LVxcdTBhYzlcXHUwYWNiLVxcdTBhY2RcXHUwYWQwXFx1MGFlMC1cXHUwYWUzXFx1MGFlNi1cXHUwYWVmXFx1MGIwMS1cXHUwYjAzXFx1MGIwNS1cXHUwYjBjXFx1MGIwZlxcdTBiMTBcXHUwYjEzLVxcdTBiMjhcXHUwYjJhLVxcdTBiMzBcXHUwYjMyXFx1MGIzM1xcdTBiMzUtXFx1MGIzOVxcdTBiM2MtXFx1MGI0NFxcdTBiNDdcXHUwYjQ4XFx1MGI0Yi1cXHUwYjRkXFx1MGI1NlxcdTBiNTdcXHUwYjVjXFx1MGI1ZFxcdTBiNWYtXFx1MGI2M1xcdTBiNjYtXFx1MGI2ZlxcdTBiNzFcXHUwYjgyXFx1MGI4M1xcdTBiODUtXFx1MGI4YVxcdTBiOGUtXFx1MGI5MFxcdTBiOTItXFx1MGI5NVxcdTBiOTlcXHUwYjlhXFx1MGI5Y1xcdTBiOWVcXHUwYjlmXFx1MGJhM1xcdTBiYTRcXHUwYmE4LVxcdTBiYWFcXHUwYmFlLVxcdTBiYjlcXHUwYmJlLVxcdTBiYzJcXHUwYmM2LVxcdTBiYzhcXHUwYmNhLVxcdTBiY2RcXHUwYmQwXFx1MGJkN1xcdTBiZTYtXFx1MGJlZlxcdTBjMDEtXFx1MGMwM1xcdTBjMDUtXFx1MGMwY1xcdTBjMGUtXFx1MGMxMFxcdTBjMTItXFx1MGMyOFxcdTBjMmEtXFx1MGMzM1xcdTBjMzUtXFx1MGMzOVxcdTBjM2QtXFx1MGM0NFxcdTBjNDYtXFx1MGM0OFxcdTBjNGEtXFx1MGM0ZFxcdTBjNTVcXHUwYzU2XFx1MGM1OFxcdTBjNTlcXHUwYzYwLVxcdTBjNjNcXHUwYzY2LVxcdTBjNmZcXHUwYzgyXFx1MGM4M1xcdTBjODUtXFx1MGM4Y1xcdTBjOGUtXFx1MGM5MFxcdTBjOTItXFx1MGNhOFxcdTBjYWEtXFx1MGNiM1xcdTBjYjUtXFx1MGNiOVxcdTBjYmMtXFx1MGNjNFxcdTBjYzYtXFx1MGNjOFxcdTBjY2EtXFx1MGNjZFxcdTBjZDVcXHUwY2Q2XFx1MGNkZVxcdTBjZTAtXFx1MGNlM1xcdTBjZTYtXFx1MGNlZlxcdTBjZjFcXHUwY2YyXFx1MGQwMlxcdTBkMDNcXHUwZDA1LVxcdTBkMGNcXHUwZDBlLVxcdTBkMTBcXHUwZDEyLVxcdTBkM2FcXHUwZDNkLVxcdTBkNDRcXHUwZDQ2LVxcdTBkNDhcXHUwZDRhLVxcdTBkNGVcXHUwZDU3XFx1MGQ2MC1cXHUwZDYzXFx1MGQ2Ni1cXHUwZDZmXFx1MGQ3YS1cXHUwZDdmXFx1MGQ4MlxcdTBkODNcXHUwZDg1LVxcdTBkOTZcXHUwZDlhLVxcdTBkYjFcXHUwZGIzLVxcdTBkYmJcXHUwZGJkXFx1MGRjMC1cXHUwZGM2XFx1MGRjYVxcdTBkY2YtXFx1MGRkNFxcdTBkZDZcXHUwZGQ4LVxcdTBkZGZcXHUwZGYyXFx1MGRmM1xcdTBlMDEtXFx1MGUzYVxcdTBlNDAtXFx1MGU0ZVxcdTBlNTAtXFx1MGU1OVxcdTBlODFcXHUwZTgyXFx1MGU4NFxcdTBlODdcXHUwZTg4XFx1MGU4YVxcdTBlOGRcXHUwZTk0LVxcdTBlOTdcXHUwZTk5LVxcdTBlOWZcXHUwZWExLVxcdTBlYTNcXHUwZWE1XFx1MGVhN1xcdTBlYWFcXHUwZWFiXFx1MGVhZC1cXHUwZWI5XFx1MGViYi1cXHUwZWJkXFx1MGVjMC1cXHUwZWM0XFx1MGVjNlxcdTBlYzgtXFx1MGVjZFxcdTBlZDAtXFx1MGVkOVxcdTBlZGMtXFx1MGVkZlxcdTBmMDBcXHUwZjE4XFx1MGYxOVxcdTBmMjAtXFx1MGYyOVxcdTBmMzVcXHUwZjM3XFx1MGYzOVxcdTBmM2UtXFx1MGY0N1xcdTBmNDktXFx1MGY2Y1xcdTBmNzEtXFx1MGY4NFxcdTBmODYtXFx1MGY5N1xcdTBmOTktXFx1MGZiY1xcdTBmYzZcXHUxMDAwLVxcdTEwNDlcXHUxMDUwLVxcdTEwOWRcXHUxMGEwLVxcdTEwYzVcXHUxMGM3XFx1MTBjZFxcdTEwZDAtXFx1MTBmYVxcdTEwZmMtXFx1MTI0OFxcdTEyNGEtXFx1MTI0ZFxcdTEyNTAtXFx1MTI1NlxcdTEyNThcXHUxMjVhLVxcdTEyNWRcXHUxMjYwLVxcdTEyODhcXHUxMjhhLVxcdTEyOGRcXHUxMjkwLVxcdTEyYjBcXHUxMmIyLVxcdTEyYjVcXHUxMmI4LVxcdTEyYmVcXHUxMmMwXFx1MTJjMi1cXHUxMmM1XFx1MTJjOC1cXHUxMmQ2XFx1MTJkOC1cXHUxMzEwXFx1MTMxMi1cXHUxMzE1XFx1MTMxOC1cXHUxMzVhXFx1MTM1ZC1cXHUxMzVmXFx1MTM4MC1cXHUxMzhmXFx1MTNhMC1cXHUxM2Y0XFx1MTQwMS1cXHUxNjZjXFx1MTY2Zi1cXHUxNjdmXFx1MTY4MS1cXHUxNjlhXFx1MTZhMC1cXHUxNmVhXFx1MTZlZS1cXHUxNmYwXFx1MTcwMC1cXHUxNzBjXFx1MTcwZS1cXHUxNzE0XFx1MTcyMC1cXHUxNzM0XFx1MTc0MC1cXHUxNzUzXFx1MTc2MC1cXHUxNzZjXFx1MTc2ZS1cXHUxNzcwXFx1MTc3MlxcdTE3NzNcXHUxNzgwLVxcdTE3ZDNcXHUxN2Q3XFx1MTdkY1xcdTE3ZGRcXHUxN2UwLVxcdTE3ZTlcXHUxODBiLVxcdTE4MGRcXHUxODEwLVxcdTE4MTlcXHUxODIwLVxcdTE4NzdcXHUxODgwLVxcdTE4YWFcXHUxOGIwLVxcdTE4ZjVcXHUxOTAwLVxcdTE5MWNcXHUxOTIwLVxcdTE5MmJcXHUxOTMwLVxcdTE5M2JcXHUxOTQ2LVxcdTE5NmRcXHUxOTcwLVxcdTE5NzRcXHUxOTgwLVxcdTE5YWJcXHUxOWIwLVxcdTE5YzlcXHUxOWQwLVxcdTE5ZDlcXHUxYTAwLVxcdTFhMWJcXHUxYTIwLVxcdTFhNWVcXHUxYTYwLVxcdTFhN2NcXHUxYTdmLVxcdTFhODlcXHUxYTkwLVxcdTFhOTlcXHUxYWE3XFx1MWIwMC1cXHUxYjRiXFx1MWI1MC1cXHUxYjU5XFx1MWI2Yi1cXHUxYjczXFx1MWI4MC1cXHUxYmYzXFx1MWMwMC1cXHUxYzM3XFx1MWM0MC1cXHUxYzQ5XFx1MWM0ZC1cXHUxYzdkXFx1MWNkMC1cXHUxY2QyXFx1MWNkNC1cXHUxY2Y2XFx1MWQwMC1cXHUxZGU2XFx1MWRmYy1cXHUxZjE1XFx1MWYxOC1cXHUxZjFkXFx1MWYyMC1cXHUxZjQ1XFx1MWY0OC1cXHUxZjRkXFx1MWY1MC1cXHUxZjU3XFx1MWY1OVxcdTFmNWJcXHUxZjVkXFx1MWY1Zi1cXHUxZjdkXFx1MWY4MC1cXHUxZmI0XFx1MWZiNi1cXHUxZmJjXFx1MWZiZVxcdTFmYzItXFx1MWZjNFxcdTFmYzYtXFx1MWZjY1xcdTFmZDAtXFx1MWZkM1xcdTFmZDYtXFx1MWZkYlxcdTFmZTAtXFx1MWZlY1xcdTFmZjItXFx1MWZmNFxcdTFmZjYtXFx1MWZmY1xcdTIwMGNcXHUyMDBkXFx1MjAzZlxcdTIwNDBcXHUyMDU0XFx1MjA3MVxcdTIwN2ZcXHUyMDkwLVxcdTIwOWNcXHUyMGQwLVxcdTIwZGNcXHUyMGUxXFx1MjBlNS1cXHUyMGYwXFx1MjEwMlxcdTIxMDdcXHUyMTBhLVxcdTIxMTNcXHUyMTE1XFx1MjExOS1cXHUyMTFkXFx1MjEyNFxcdTIxMjZcXHUyMTI4XFx1MjEyYS1cXHUyMTJkXFx1MjEyZi1cXHUyMTM5XFx1MjEzYy1cXHUyMTNmXFx1MjE0NS1cXHUyMTQ5XFx1MjE0ZVxcdTIxNjAtXFx1MjE4OFxcdTJjMDAtXFx1MmMyZVxcdTJjMzAtXFx1MmM1ZVxcdTJjNjAtXFx1MmNlNFxcdTJjZWItXFx1MmNmM1xcdTJkMDAtXFx1MmQyNVxcdTJkMjdcXHUyZDJkXFx1MmQzMC1cXHUyZDY3XFx1MmQ2ZlxcdTJkN2YtXFx1MmQ5NlxcdTJkYTAtXFx1MmRhNlxcdTJkYTgtXFx1MmRhZVxcdTJkYjAtXFx1MmRiNlxcdTJkYjgtXFx1MmRiZVxcdTJkYzAtXFx1MmRjNlxcdTJkYzgtXFx1MmRjZVxcdTJkZDAtXFx1MmRkNlxcdTJkZDgtXFx1MmRkZVxcdTJkZTAtXFx1MmRmZlxcdTJlMmZcXHUzMDA1LVxcdTMwMDdcXHUzMDIxLVxcdTMwMmZcXHUzMDMxLVxcdTMwMzVcXHUzMDM4LVxcdTMwM2NcXHUzMDQxLVxcdTMwOTZcXHUzMDk5XFx1MzA5YVxcdTMwOWQtXFx1MzA5ZlxcdTMwYTEtXFx1MzBmYVxcdTMwZmMtXFx1MzBmZlxcdTMxMDUtXFx1MzEyZFxcdTMxMzEtXFx1MzE4ZVxcdTMxYTAtXFx1MzFiYVxcdTMxZjAtXFx1MzFmZlxcdTM0MDAtXFx1NGRiNVxcdTRlMDAtXFx1OWZjY1xcdWEwMDAtXFx1YTQ4Y1xcdWE0ZDAtXFx1YTRmZFxcdWE1MDAtXFx1YTYwY1xcdWE2MTAtXFx1YTYyYlxcdWE2NDAtXFx1YTY2ZlxcdWE2NzQtXFx1YTY3ZFxcdWE2N2YtXFx1YTY5N1xcdWE2OWYtXFx1YTZmMVxcdWE3MTctXFx1YTcxZlxcdWE3MjItXFx1YTc4OFxcdWE3OGItXFx1YTc4ZVxcdWE3OTAtXFx1YTc5M1xcdWE3YTAtXFx1YTdhYVxcdWE3ZjgtXFx1YTgyN1xcdWE4NDAtXFx1YTg3M1xcdWE4ODAtXFx1YThjNFxcdWE4ZDAtXFx1YThkOVxcdWE4ZTAtXFx1YThmN1xcdWE4ZmJcXHVhOTAwLVxcdWE5MmRcXHVhOTMwLVxcdWE5NTNcXHVhOTYwLVxcdWE5N2NcXHVhOTgwLVxcdWE5YzBcXHVhOWNmLVxcdWE5ZDlcXHVhYTAwLVxcdWFhMzZcXHVhYTQwLVxcdWFhNGRcXHVhYTUwLVxcdWFhNTlcXHVhYTYwLVxcdWFhNzZcXHVhYTdhXFx1YWE3YlxcdWFhODAtXFx1YWFjMlxcdWFhZGItXFx1YWFkZFxcdWFhZTAtXFx1YWFlZlxcdWFhZjItXFx1YWFmNlxcdWFiMDEtXFx1YWIwNlxcdWFiMDktXFx1YWIwZVxcdWFiMTEtXFx1YWIxNlxcdWFiMjAtXFx1YWIyNlxcdWFiMjgtXFx1YWIyZVxcdWFiYzAtXFx1YWJlYVxcdWFiZWNcXHVhYmVkXFx1YWJmMC1cXHVhYmY5XFx1YWMwMC1cXHVkN2EzXFx1ZDdiMC1cXHVkN2M2XFx1ZDdjYi1cXHVkN2ZiXFx1ZjkwMC1cXHVmYTZkXFx1ZmE3MC1cXHVmYWQ5XFx1ZmIwMC1cXHVmYjA2XFx1ZmIxMy1cXHVmYjE3XFx1ZmIxZC1cXHVmYjI4XFx1ZmIyYS1cXHVmYjM2XFx1ZmIzOC1cXHVmYjNjXFx1ZmIzZVxcdWZiNDBcXHVmYjQxXFx1ZmI0M1xcdWZiNDRcXHVmYjQ2LVxcdWZiYjFcXHVmYmQzLVxcdWZkM2RcXHVmZDUwLVxcdWZkOGZcXHVmZDkyLVxcdWZkYzdcXHVmZGYwLVxcdWZkZmJcXHVmZTAwLVxcdWZlMGZcXHVmZTIwLVxcdWZlMjZcXHVmZTMzXFx1ZmUzNFxcdWZlNGQtXFx1ZmU0ZlxcdWZlNzAtXFx1ZmU3NFxcdWZlNzYtXFx1ZmVmY1xcdWZmMTAtXFx1ZmYxOVxcdWZmMjEtXFx1ZmYzYVxcdWZmM2ZcXHVmZjQxLVxcdWZmNWFcXHVmZjY2LVxcdWZmYmVcXHVmZmMyLVxcdWZmYzdcXHVmZmNhLVxcdWZmY2ZcXHVmZmQyLVxcdWZmZDdcXHVmZmRhLVxcdWZmZGNdJylcbiAgICB9O1xuXG4gICAgLy8gRW5zdXJlIHRoZSBjb25kaXRpb24gaXMgdHJ1ZSwgb3RoZXJ3aXNlIHRocm93IGFuIGVycm9yLlxuICAgIC8vIFRoaXMgaXMgb25seSB0byBoYXZlIGEgYmV0dGVyIGNvbnRyYWN0IHNlbWFudGljLCBpLmUuIGFub3RoZXIgc2FmZXR5IG5ldFxuICAgIC8vIHRvIGNhdGNoIGEgbG9naWMgZXJyb3IuIFRoZSBjb25kaXRpb24gc2hhbGwgYmUgZnVsZmlsbGVkIGluIG5vcm1hbCBjYXNlLlxuICAgIC8vIERvIE5PVCB1c2UgdGhpcyB0byBlbmZvcmNlIGEgY2VydGFpbiBjb25kaXRpb24gb24gYW55IHVzZXIgaW5wdXQuXG5cbiAgICBmdW5jdGlvbiBhc3NlcnQoY29uZGl0aW9uLCBtZXNzYWdlKSB7XG4gICAgICAgIGlmICghY29uZGl0aW9uKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0FTU0VSVDogJyArIG1lc3NhZ2UpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gc2xpY2VTb3VyY2UoZnJvbSwgdG8pIHtcbiAgICAgICAgcmV0dXJuIHNvdXJjZS5zbGljZShmcm9tLCB0byk7XG4gICAgfVxuXG4gICAgaWYgKHR5cGVvZiAnZXNwcmltYSdbMF0gPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgIHNsaWNlU291cmNlID0gZnVuY3Rpb24gc2xpY2VBcnJheVNvdXJjZShmcm9tLCB0bykge1xuICAgICAgICAgICAgcmV0dXJuIHNvdXJjZS5zbGljZShmcm9tLCB0bykuam9pbignJyk7XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gaXNEZWNpbWFsRGlnaXQoY2gpIHtcbiAgICAgICAgcmV0dXJuICcwMTIzNDU2Nzg5Jy5pbmRleE9mKGNoKSA+PSAwO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGlzSGV4RGlnaXQoY2gpIHtcbiAgICAgICAgcmV0dXJuICcwMTIzNDU2Nzg5YWJjZGVmQUJDREVGJy5pbmRleE9mKGNoKSA+PSAwO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGlzT2N0YWxEaWdpdChjaCkge1xuICAgICAgICByZXR1cm4gJzAxMjM0NTY3Jy5pbmRleE9mKGNoKSA+PSAwO1xuICAgIH1cblxuXG4gICAgLy8gNy4yIFdoaXRlIFNwYWNlXG5cbiAgICBmdW5jdGlvbiBpc1doaXRlU3BhY2UoY2gpIHtcbiAgICAgICAgcmV0dXJuIChjaCA9PT0gJyAnKSB8fCAoY2ggPT09ICdcXHUwMDA5JykgfHwgKGNoID09PSAnXFx1MDAwQicpIHx8XG4gICAgICAgICAgICAoY2ggPT09ICdcXHUwMDBDJykgfHwgKGNoID09PSAnXFx1MDBBMCcpIHx8XG4gICAgICAgICAgICAoY2guY2hhckNvZGVBdCgwKSA+PSAweDE2ODAgJiZcbiAgICAgICAgICAgICAnXFx1MTY4MFxcdTE4MEVcXHUyMDAwXFx1MjAwMVxcdTIwMDJcXHUyMDAzXFx1MjAwNFxcdTIwMDVcXHUyMDA2XFx1MjAwN1xcdTIwMDhcXHUyMDA5XFx1MjAwQVxcdTIwMkZcXHUyMDVGXFx1MzAwMFxcdUZFRkYnLmluZGV4T2YoY2gpID49IDApO1xuICAgIH1cblxuICAgIC8vIDcuMyBMaW5lIFRlcm1pbmF0b3JzXG5cbiAgICBmdW5jdGlvbiBpc0xpbmVUZXJtaW5hdG9yKGNoKSB7XG4gICAgICAgIHJldHVybiAoY2ggPT09ICdcXG4nIHx8IGNoID09PSAnXFxyJyB8fCBjaCA9PT0gJ1xcdTIwMjgnIHx8IGNoID09PSAnXFx1MjAyOScpO1xuICAgIH1cblxuICAgIC8vIDcuNiBJZGVudGlmaWVyIE5hbWVzIGFuZCBJZGVudGlmaWVyc1xuXG4gICAgZnVuY3Rpb24gaXNJZGVudGlmaWVyU3RhcnQoY2gpIHtcbiAgICAgICAgcmV0dXJuIChjaCA9PT0gJyQnKSB8fCAoY2ggPT09ICdfJykgfHwgKGNoID09PSAnXFxcXCcpIHx8XG4gICAgICAgICAgICAoY2ggPj0gJ2EnICYmIGNoIDw9ICd6JykgfHwgKGNoID49ICdBJyAmJiBjaCA8PSAnWicpIHx8XG4gICAgICAgICAgICAoKGNoLmNoYXJDb2RlQXQoMCkgPj0gMHg4MCkgJiYgUmVnZXguTm9uQXNjaWlJZGVudGlmaWVyU3RhcnQudGVzdChjaCkpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGlzSWRlbnRpZmllclBhcnQoY2gpIHtcbiAgICAgICAgcmV0dXJuIChjaCA9PT0gJyQnKSB8fCAoY2ggPT09ICdfJykgfHwgKGNoID09PSAnXFxcXCcpIHx8XG4gICAgICAgICAgICAoY2ggPj0gJ2EnICYmIGNoIDw9ICd6JykgfHwgKGNoID49ICdBJyAmJiBjaCA8PSAnWicpIHx8XG4gICAgICAgICAgICAoKGNoID49ICcwJykgJiYgKGNoIDw9ICc5JykpIHx8XG4gICAgICAgICAgICAoKGNoLmNoYXJDb2RlQXQoMCkgPj0gMHg4MCkgJiYgUmVnZXguTm9uQXNjaWlJZGVudGlmaWVyUGFydC50ZXN0KGNoKSk7XG4gICAgfVxuXG4gICAgLy8gNy42LjEuMiBGdXR1cmUgUmVzZXJ2ZWQgV29yZHNcblxuICAgIGZ1bmN0aW9uIGlzRnV0dXJlUmVzZXJ2ZWRXb3JkKGlkKSB7XG4gICAgICAgIHN3aXRjaCAoaWQpIHtcblxuICAgICAgICAvLyBGdXR1cmUgcmVzZXJ2ZWQgd29yZHMuXG4gICAgICAgIGNhc2UgJ2NsYXNzJzpcbiAgICAgICAgY2FzZSAnZW51bSc6XG4gICAgICAgIGNhc2UgJ2V4cG9ydCc6XG4gICAgICAgIGNhc2UgJ2V4dGVuZHMnOlxuICAgICAgICBjYXNlICdpbXBvcnQnOlxuICAgICAgICBjYXNlICdzdXBlcic6XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBpc1N0cmljdE1vZGVSZXNlcnZlZFdvcmQoaWQpIHtcbiAgICAgICAgc3dpdGNoIChpZCkge1xuXG4gICAgICAgIC8vIFN0cmljdCBNb2RlIHJlc2VydmVkIHdvcmRzLlxuICAgICAgICBjYXNlICdpbXBsZW1lbnRzJzpcbiAgICAgICAgY2FzZSAnaW50ZXJmYWNlJzpcbiAgICAgICAgY2FzZSAncGFja2FnZSc6XG4gICAgICAgIGNhc2UgJ3ByaXZhdGUnOlxuICAgICAgICBjYXNlICdwcm90ZWN0ZWQnOlxuICAgICAgICBjYXNlICdwdWJsaWMnOlxuICAgICAgICBjYXNlICdzdGF0aWMnOlxuICAgICAgICBjYXNlICd5aWVsZCc6XG4gICAgICAgIGNhc2UgJ2xldCc6XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBpc1Jlc3RyaWN0ZWRXb3JkKGlkKSB7XG4gICAgICAgIHJldHVybiBpZCA9PT0gJ2V2YWwnIHx8IGlkID09PSAnYXJndW1lbnRzJztcbiAgICB9XG5cbiAgICAvLyA3LjYuMS4xIEtleXdvcmRzXG5cbiAgICBmdW5jdGlvbiBpc0tleXdvcmQoaWQpIHtcbiAgICAgICAgdmFyIGtleXdvcmQgPSBmYWxzZTtcbiAgICAgICAgc3dpdGNoIChpZC5sZW5ndGgpIHtcbiAgICAgICAgY2FzZSAyOlxuICAgICAgICAgICAga2V5d29yZCA9IChpZCA9PT0gJ2lmJykgfHwgKGlkID09PSAnaW4nKSB8fCAoaWQgPT09ICdkbycpO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgMzpcbiAgICAgICAgICAgIGtleXdvcmQgPSAoaWQgPT09ICd2YXInKSB8fCAoaWQgPT09ICdmb3InKSB8fCAoaWQgPT09ICduZXcnKSB8fCAoaWQgPT09ICd0cnknKTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIDQ6XG4gICAgICAgICAgICBrZXl3b3JkID0gKGlkID09PSAndGhpcycpIHx8IChpZCA9PT0gJ2Vsc2UnKSB8fCAoaWQgPT09ICdjYXNlJykgfHwgKGlkID09PSAndm9pZCcpIHx8IChpZCA9PT0gJ3dpdGgnKTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIDU6XG4gICAgICAgICAgICBrZXl3b3JkID0gKGlkID09PSAnd2hpbGUnKSB8fCAoaWQgPT09ICdicmVhaycpIHx8IChpZCA9PT0gJ2NhdGNoJykgfHwgKGlkID09PSAndGhyb3cnKTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIDY6XG4gICAgICAgICAgICBrZXl3b3JkID0gKGlkID09PSAncmV0dXJuJykgfHwgKGlkID09PSAndHlwZW9mJykgfHwgKGlkID09PSAnZGVsZXRlJykgfHwgKGlkID09PSAnc3dpdGNoJyk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSA3OlxuICAgICAgICAgICAga2V5d29yZCA9IChpZCA9PT0gJ2RlZmF1bHQnKSB8fCAoaWQgPT09ICdmaW5hbGx5Jyk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSA4OlxuICAgICAgICAgICAga2V5d29yZCA9IChpZCA9PT0gJ2Z1bmN0aW9uJykgfHwgKGlkID09PSAnY29udGludWUnKSB8fCAoaWQgPT09ICdkZWJ1Z2dlcicpO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgMTA6XG4gICAgICAgICAgICBrZXl3b3JkID0gKGlkID09PSAnaW5zdGFuY2VvZicpO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoa2V5d29yZCkge1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cblxuICAgICAgICBzd2l0Y2ggKGlkKSB7XG4gICAgICAgIC8vIEZ1dHVyZSByZXNlcnZlZCB3b3Jkcy5cbiAgICAgICAgLy8gJ2NvbnN0JyBpcyBzcGVjaWFsaXplZCBhcyBLZXl3b3JkIGluIFY4LlxuICAgICAgICBjYXNlICdjb25zdCc6XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcblxuICAgICAgICAvLyBGb3IgY29tcGF0aWJsaXR5IHRvIFNwaWRlck1vbmtleSBhbmQgRVMubmV4dFxuICAgICAgICBjYXNlICd5aWVsZCc6XG4gICAgICAgIGNhc2UgJ2xldCc6XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChzdHJpY3QgJiYgaXNTdHJpY3RNb2RlUmVzZXJ2ZWRXb3JkKGlkKSkge1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gaXNGdXR1cmVSZXNlcnZlZFdvcmQoaWQpO1xuICAgIH1cblxuICAgIC8vIDcuNCBDb21tZW50c1xuXG4gICAgZnVuY3Rpb24gc2tpcENvbW1lbnQoKSB7XG4gICAgICAgIHZhciBjaCwgYmxvY2tDb21tZW50LCBsaW5lQ29tbWVudDtcblxuICAgICAgICBibG9ja0NvbW1lbnQgPSBmYWxzZTtcbiAgICAgICAgbGluZUNvbW1lbnQgPSBmYWxzZTtcblxuICAgICAgICB3aGlsZSAoaW5kZXggPCBsZW5ndGgpIHtcbiAgICAgICAgICAgIGNoID0gc291cmNlW2luZGV4XTtcblxuICAgICAgICAgICAgaWYgKGxpbmVDb21tZW50KSB7XG4gICAgICAgICAgICAgICAgY2ggPSBzb3VyY2VbaW5kZXgrK107XG4gICAgICAgICAgICAgICAgaWYgKGlzTGluZVRlcm1pbmF0b3IoY2gpKSB7XG4gICAgICAgICAgICAgICAgICAgIGxpbmVDb21tZW50ID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgIGlmIChjaCA9PT0gJ1xccicgJiYgc291cmNlW2luZGV4XSA9PT0gJ1xcbicpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICsraW5kZXg7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgKytsaW5lTnVtYmVyO1xuICAgICAgICAgICAgICAgICAgICBsaW5lU3RhcnQgPSBpbmRleDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGJsb2NrQ29tbWVudCkge1xuICAgICAgICAgICAgICAgIGlmIChpc0xpbmVUZXJtaW5hdG9yKGNoKSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoY2ggPT09ICdcXHInICYmIHNvdXJjZVtpbmRleCArIDFdID09PSAnXFxuJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgKytpbmRleDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICArK2xpbmVOdW1iZXI7XG4gICAgICAgICAgICAgICAgICAgICsraW5kZXg7XG4gICAgICAgICAgICAgICAgICAgIGxpbmVTdGFydCA9IGluZGV4O1xuICAgICAgICAgICAgICAgICAgICBpZiAoaW5kZXggPj0gbGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aHJvd0Vycm9yKHt9LCBNZXNzYWdlcy5VbmV4cGVjdGVkVG9rZW4sICdJTExFR0FMJyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBjaCA9IHNvdXJjZVtpbmRleCsrXTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGluZGV4ID49IGxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3dFcnJvcih7fSwgTWVzc2FnZXMuVW5leHBlY3RlZFRva2VuLCAnSUxMRUdBTCcpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGlmIChjaCA9PT0gJyonKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjaCA9IHNvdXJjZVtpbmRleF07XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoY2ggPT09ICcvJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICsraW5kZXg7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYmxvY2tDb21tZW50ID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGNoID09PSAnLycpIHtcbiAgICAgICAgICAgICAgICBjaCA9IHNvdXJjZVtpbmRleCArIDFdO1xuICAgICAgICAgICAgICAgIGlmIChjaCA9PT0gJy8nKSB7XG4gICAgICAgICAgICAgICAgICAgIGluZGV4ICs9IDI7XG4gICAgICAgICAgICAgICAgICAgIGxpbmVDb21tZW50ID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGNoID09PSAnKicpIHtcbiAgICAgICAgICAgICAgICAgICAgaW5kZXggKz0gMjtcbiAgICAgICAgICAgICAgICAgICAgYmxvY2tDb21tZW50ID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGluZGV4ID49IGxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3dFcnJvcih7fSwgTWVzc2FnZXMuVW5leHBlY3RlZFRva2VuLCAnSUxMRUdBTCcpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIGlmIChpc1doaXRlU3BhY2UoY2gpKSB7XG4gICAgICAgICAgICAgICAgKytpbmRleDtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoaXNMaW5lVGVybWluYXRvcihjaCkpIHtcbiAgICAgICAgICAgICAgICArK2luZGV4O1xuICAgICAgICAgICAgICAgIGlmIChjaCA9PT0gICdcXHInICYmIHNvdXJjZVtpbmRleF0gPT09ICdcXG4nKSB7XG4gICAgICAgICAgICAgICAgICAgICsraW5kZXg7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICsrbGluZU51bWJlcjtcbiAgICAgICAgICAgICAgICBsaW5lU3RhcnQgPSBpbmRleDtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBzY2FuSGV4RXNjYXBlKHByZWZpeCkge1xuICAgICAgICB2YXIgaSwgbGVuLCBjaCwgY29kZSA9IDA7XG5cbiAgICAgICAgbGVuID0gKHByZWZpeCA9PT0gJ3UnKSA/IDQgOiAyO1xuICAgICAgICBmb3IgKGkgPSAwOyBpIDwgbGVuOyArK2kpIHtcbiAgICAgICAgICAgIGlmIChpbmRleCA8IGxlbmd0aCAmJiBpc0hleERpZ2l0KHNvdXJjZVtpbmRleF0pKSB7XG4gICAgICAgICAgICAgICAgY2ggPSBzb3VyY2VbaW5kZXgrK107XG4gICAgICAgICAgICAgICAgY29kZSA9IGNvZGUgKiAxNiArICcwMTIzNDU2Nzg5YWJjZGVmJy5pbmRleE9mKGNoLnRvTG93ZXJDYXNlKCkpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gJyc7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIFN0cmluZy5mcm9tQ2hhckNvZGUoY29kZSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gc2NhbklkZW50aWZpZXIoKSB7XG4gICAgICAgIHZhciBjaCwgc3RhcnQsIGlkLCByZXN0b3JlO1xuXG4gICAgICAgIGNoID0gc291cmNlW2luZGV4XTtcbiAgICAgICAgaWYgKCFpc0lkZW50aWZpZXJTdGFydChjaCkpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIHN0YXJ0ID0gaW5kZXg7XG4gICAgICAgIGlmIChjaCA9PT0gJ1xcXFwnKSB7XG4gICAgICAgICAgICArK2luZGV4O1xuICAgICAgICAgICAgaWYgKHNvdXJjZVtpbmRleF0gIT09ICd1Jykge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgICsraW5kZXg7XG4gICAgICAgICAgICByZXN0b3JlID0gaW5kZXg7XG4gICAgICAgICAgICBjaCA9IHNjYW5IZXhFc2NhcGUoJ3UnKTtcbiAgICAgICAgICAgIGlmIChjaCkge1xuICAgICAgICAgICAgICAgIGlmIChjaCA9PT0gJ1xcXFwnIHx8ICFpc0lkZW50aWZpZXJTdGFydChjaCkpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZCA9IGNoO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBpbmRleCA9IHJlc3RvcmU7XG4gICAgICAgICAgICAgICAgaWQgPSAndSc7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBpZCA9IHNvdXJjZVtpbmRleCsrXTtcbiAgICAgICAgfVxuXG4gICAgICAgIHdoaWxlIChpbmRleCA8IGxlbmd0aCkge1xuICAgICAgICAgICAgY2ggPSBzb3VyY2VbaW5kZXhdO1xuICAgICAgICAgICAgaWYgKCFpc0lkZW50aWZpZXJQYXJ0KGNoKSkge1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGNoID09PSAnXFxcXCcpIHtcbiAgICAgICAgICAgICAgICArK2luZGV4O1xuICAgICAgICAgICAgICAgIGlmIChzb3VyY2VbaW5kZXhdICE9PSAndScpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICArK2luZGV4O1xuICAgICAgICAgICAgICAgIHJlc3RvcmUgPSBpbmRleDtcbiAgICAgICAgICAgICAgICBjaCA9IHNjYW5IZXhFc2NhcGUoJ3UnKTtcbiAgICAgICAgICAgICAgICBpZiAoY2gpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGNoID09PSAnXFxcXCcgfHwgIWlzSWRlbnRpZmllclBhcnQoY2gpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgaWQgKz0gY2g7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgaW5kZXggPSByZXN0b3JlO1xuICAgICAgICAgICAgICAgICAgICBpZCArPSAndSc7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBpZCArPSBzb3VyY2VbaW5kZXgrK107XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyBUaGVyZSBpcyBubyBrZXl3b3JkIG9yIGxpdGVyYWwgd2l0aCBvbmx5IG9uZSBjaGFyYWN0ZXIuXG4gICAgICAgIC8vIFRodXMsIGl0IG11c3QgYmUgYW4gaWRlbnRpZmllci5cbiAgICAgICAgaWYgKGlkLmxlbmd0aCA9PT0gMSkge1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICB0eXBlOiBUb2tlbi5JZGVudGlmaWVyLFxuICAgICAgICAgICAgICAgIHZhbHVlOiBpZCxcbiAgICAgICAgICAgICAgICBsaW5lTnVtYmVyOiBsaW5lTnVtYmVyLFxuICAgICAgICAgICAgICAgIGxpbmVTdGFydDogbGluZVN0YXJ0LFxuICAgICAgICAgICAgICAgIHJhbmdlOiBbc3RhcnQsIGluZGV4XVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChpc0tleXdvcmQoaWQpKSB7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHR5cGU6IFRva2VuLktleXdvcmQsXG4gICAgICAgICAgICAgICAgdmFsdWU6IGlkLFxuICAgICAgICAgICAgICAgIGxpbmVOdW1iZXI6IGxpbmVOdW1iZXIsXG4gICAgICAgICAgICAgICAgbGluZVN0YXJ0OiBsaW5lU3RhcnQsXG4gICAgICAgICAgICAgICAgcmFuZ2U6IFtzdGFydCwgaW5kZXhdXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gNy44LjEgTnVsbCBMaXRlcmFsc1xuXG4gICAgICAgIGlmIChpZCA9PT0gJ251bGwnKSB7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHR5cGU6IFRva2VuLk51bGxMaXRlcmFsLFxuICAgICAgICAgICAgICAgIHZhbHVlOiBpZCxcbiAgICAgICAgICAgICAgICBsaW5lTnVtYmVyOiBsaW5lTnVtYmVyLFxuICAgICAgICAgICAgICAgIGxpbmVTdGFydDogbGluZVN0YXJ0LFxuICAgICAgICAgICAgICAgIHJhbmdlOiBbc3RhcnQsIGluZGV4XVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIDcuOC4yIEJvb2xlYW4gTGl0ZXJhbHNcblxuICAgICAgICBpZiAoaWQgPT09ICd0cnVlJyB8fCBpZCA9PT0gJ2ZhbHNlJykge1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICB0eXBlOiBUb2tlbi5Cb29sZWFuTGl0ZXJhbCxcbiAgICAgICAgICAgICAgICB2YWx1ZTogaWQsXG4gICAgICAgICAgICAgICAgbGluZU51bWJlcjogbGluZU51bWJlcixcbiAgICAgICAgICAgICAgICBsaW5lU3RhcnQ6IGxpbmVTdGFydCxcbiAgICAgICAgICAgICAgICByYW5nZTogW3N0YXJ0LCBpbmRleF1cbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgdHlwZTogVG9rZW4uSWRlbnRpZmllcixcbiAgICAgICAgICAgIHZhbHVlOiBpZCxcbiAgICAgICAgICAgIGxpbmVOdW1iZXI6IGxpbmVOdW1iZXIsXG4gICAgICAgICAgICBsaW5lU3RhcnQ6IGxpbmVTdGFydCxcbiAgICAgICAgICAgIHJhbmdlOiBbc3RhcnQsIGluZGV4XVxuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8vIDcuNyBQdW5jdHVhdG9yc1xuXG4gICAgZnVuY3Rpb24gc2NhblB1bmN0dWF0b3IoKSB7XG4gICAgICAgIHZhciBzdGFydCA9IGluZGV4LFxuICAgICAgICAgICAgY2gxID0gc291cmNlW2luZGV4XSxcbiAgICAgICAgICAgIGNoMixcbiAgICAgICAgICAgIGNoMyxcbiAgICAgICAgICAgIGNoNDtcblxuICAgICAgICAvLyBDaGVjayBmb3IgbW9zdCBjb21tb24gc2luZ2xlLWNoYXJhY3RlciBwdW5jdHVhdG9ycy5cblxuICAgICAgICBpZiAoY2gxID09PSAnOycgfHwgY2gxID09PSAneycgfHwgY2gxID09PSAnfScpIHtcbiAgICAgICAgICAgICsraW5kZXg7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHR5cGU6IFRva2VuLlB1bmN0dWF0b3IsXG4gICAgICAgICAgICAgICAgdmFsdWU6IGNoMSxcbiAgICAgICAgICAgICAgICBsaW5lTnVtYmVyOiBsaW5lTnVtYmVyLFxuICAgICAgICAgICAgICAgIGxpbmVTdGFydDogbGluZVN0YXJ0LFxuICAgICAgICAgICAgICAgIHJhbmdlOiBbc3RhcnQsIGluZGV4XVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChjaDEgPT09ICcsJyB8fCBjaDEgPT09ICcoJyB8fCBjaDEgPT09ICcpJykge1xuICAgICAgICAgICAgKytpbmRleDtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgdHlwZTogVG9rZW4uUHVuY3R1YXRvcixcbiAgICAgICAgICAgICAgICB2YWx1ZTogY2gxLFxuICAgICAgICAgICAgICAgIGxpbmVOdW1iZXI6IGxpbmVOdW1iZXIsXG4gICAgICAgICAgICAgICAgbGluZVN0YXJ0OiBsaW5lU3RhcnQsXG4gICAgICAgICAgICAgICAgcmFuZ2U6IFtzdGFydCwgaW5kZXhdXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gRG90ICguKSBjYW4gYWxzbyBzdGFydCBhIGZsb2F0aW5nLXBvaW50IG51bWJlciwgaGVuY2UgdGhlIG5lZWRcbiAgICAgICAgLy8gdG8gY2hlY2sgdGhlIG5leHQgY2hhcmFjdGVyLlxuXG4gICAgICAgIGNoMiA9IHNvdXJjZVtpbmRleCArIDFdO1xuICAgICAgICBpZiAoY2gxID09PSAnLicgJiYgIWlzRGVjaW1hbERpZ2l0KGNoMikpIHtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgdHlwZTogVG9rZW4uUHVuY3R1YXRvcixcbiAgICAgICAgICAgICAgICB2YWx1ZTogc291cmNlW2luZGV4KytdLFxuICAgICAgICAgICAgICAgIGxpbmVOdW1iZXI6IGxpbmVOdW1iZXIsXG4gICAgICAgICAgICAgICAgbGluZVN0YXJ0OiBsaW5lU3RhcnQsXG4gICAgICAgICAgICAgICAgcmFuZ2U6IFtzdGFydCwgaW5kZXhdXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gUGVlayBtb3JlIGNoYXJhY3RlcnMuXG5cbiAgICAgICAgY2gzID0gc291cmNlW2luZGV4ICsgMl07XG4gICAgICAgIGNoNCA9IHNvdXJjZVtpbmRleCArIDNdO1xuXG4gICAgICAgIC8vIDQtY2hhcmFjdGVyIHB1bmN0dWF0b3I6ID4+Pj1cblxuICAgICAgICBpZiAoY2gxID09PSAnPicgJiYgY2gyID09PSAnPicgJiYgY2gzID09PSAnPicpIHtcbiAgICAgICAgICAgIGlmIChjaDQgPT09ICc9Jykge1xuICAgICAgICAgICAgICAgIGluZGV4ICs9IDQ7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogVG9rZW4uUHVuY3R1YXRvcixcbiAgICAgICAgICAgICAgICAgICAgdmFsdWU6ICc+Pj49JyxcbiAgICAgICAgICAgICAgICAgICAgbGluZU51bWJlcjogbGluZU51bWJlcixcbiAgICAgICAgICAgICAgICAgICAgbGluZVN0YXJ0OiBsaW5lU3RhcnQsXG4gICAgICAgICAgICAgICAgICAgIHJhbmdlOiBbc3RhcnQsIGluZGV4XVxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyAzLWNoYXJhY3RlciBwdW5jdHVhdG9yczogPT09ICE9PSA+Pj4gPDw9ID4+PVxuXG4gICAgICAgIGlmIChjaDEgPT09ICc9JyAmJiBjaDIgPT09ICc9JyAmJiBjaDMgPT09ICc9Jykge1xuICAgICAgICAgICAgaW5kZXggKz0gMztcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgdHlwZTogVG9rZW4uUHVuY3R1YXRvcixcbiAgICAgICAgICAgICAgICB2YWx1ZTogJz09PScsXG4gICAgICAgICAgICAgICAgbGluZU51bWJlcjogbGluZU51bWJlcixcbiAgICAgICAgICAgICAgICBsaW5lU3RhcnQ6IGxpbmVTdGFydCxcbiAgICAgICAgICAgICAgICByYW5nZTogW3N0YXJ0LCBpbmRleF1cbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoY2gxID09PSAnIScgJiYgY2gyID09PSAnPScgJiYgY2gzID09PSAnPScpIHtcbiAgICAgICAgICAgIGluZGV4ICs9IDM7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHR5cGU6IFRva2VuLlB1bmN0dWF0b3IsXG4gICAgICAgICAgICAgICAgdmFsdWU6ICchPT0nLFxuICAgICAgICAgICAgICAgIGxpbmVOdW1iZXI6IGxpbmVOdW1iZXIsXG4gICAgICAgICAgICAgICAgbGluZVN0YXJ0OiBsaW5lU3RhcnQsXG4gICAgICAgICAgICAgICAgcmFuZ2U6IFtzdGFydCwgaW5kZXhdXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGNoMSA9PT0gJz4nICYmIGNoMiA9PT0gJz4nICYmIGNoMyA9PT0gJz4nKSB7XG4gICAgICAgICAgICBpbmRleCArPSAzO1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICB0eXBlOiBUb2tlbi5QdW5jdHVhdG9yLFxuICAgICAgICAgICAgICAgIHZhbHVlOiAnPj4+JyxcbiAgICAgICAgICAgICAgICBsaW5lTnVtYmVyOiBsaW5lTnVtYmVyLFxuICAgICAgICAgICAgICAgIGxpbmVTdGFydDogbGluZVN0YXJ0LFxuICAgICAgICAgICAgICAgIHJhbmdlOiBbc3RhcnQsIGluZGV4XVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChjaDEgPT09ICc8JyAmJiBjaDIgPT09ICc8JyAmJiBjaDMgPT09ICc9Jykge1xuICAgICAgICAgICAgaW5kZXggKz0gMztcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgdHlwZTogVG9rZW4uUHVuY3R1YXRvcixcbiAgICAgICAgICAgICAgICB2YWx1ZTogJzw8PScsXG4gICAgICAgICAgICAgICAgbGluZU51bWJlcjogbGluZU51bWJlcixcbiAgICAgICAgICAgICAgICBsaW5lU3RhcnQ6IGxpbmVTdGFydCxcbiAgICAgICAgICAgICAgICByYW5nZTogW3N0YXJ0LCBpbmRleF1cbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoY2gxID09PSAnPicgJiYgY2gyID09PSAnPicgJiYgY2gzID09PSAnPScpIHtcbiAgICAgICAgICAgIGluZGV4ICs9IDM7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHR5cGU6IFRva2VuLlB1bmN0dWF0b3IsXG4gICAgICAgICAgICAgICAgdmFsdWU6ICc+Pj0nLFxuICAgICAgICAgICAgICAgIGxpbmVOdW1iZXI6IGxpbmVOdW1iZXIsXG4gICAgICAgICAgICAgICAgbGluZVN0YXJ0OiBsaW5lU3RhcnQsXG4gICAgICAgICAgICAgICAgcmFuZ2U6IFtzdGFydCwgaW5kZXhdXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gMi1jaGFyYWN0ZXIgcHVuY3R1YXRvcnM6IDw9ID49ID09ICE9ICsrIC0tIDw8ID4+ICYmIHx8XG4gICAgICAgIC8vICs9IC09ICo9ICU9ICY9IHw9IF49IC89XG5cbiAgICAgICAgaWYgKGNoMiA9PT0gJz0nKSB7XG4gICAgICAgICAgICBpZiAoJzw+PSErLSolJnxeLycuaW5kZXhPZihjaDEpID49IDApIHtcbiAgICAgICAgICAgICAgICBpbmRleCArPSAyO1xuICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IFRva2VuLlB1bmN0dWF0b3IsXG4gICAgICAgICAgICAgICAgICAgIHZhbHVlOiBjaDEgKyBjaDIsXG4gICAgICAgICAgICAgICAgICAgIGxpbmVOdW1iZXI6IGxpbmVOdW1iZXIsXG4gICAgICAgICAgICAgICAgICAgIGxpbmVTdGFydDogbGluZVN0YXJ0LFxuICAgICAgICAgICAgICAgICAgICByYW5nZTogW3N0YXJ0LCBpbmRleF1cbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGNoMSA9PT0gY2gyICYmICgnKy08PiZ8Jy5pbmRleE9mKGNoMSkgPj0gMCkpIHtcbiAgICAgICAgICAgIGlmICgnKy08PiZ8Jy5pbmRleE9mKGNoMikgPj0gMCkge1xuICAgICAgICAgICAgICAgIGluZGV4ICs9IDI7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogVG9rZW4uUHVuY3R1YXRvcixcbiAgICAgICAgICAgICAgICAgICAgdmFsdWU6IGNoMSArIGNoMixcbiAgICAgICAgICAgICAgICAgICAgbGluZU51bWJlcjogbGluZU51bWJlcixcbiAgICAgICAgICAgICAgICAgICAgbGluZVN0YXJ0OiBsaW5lU3RhcnQsXG4gICAgICAgICAgICAgICAgICAgIHJhbmdlOiBbc3RhcnQsIGluZGV4XVxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyBUaGUgcmVtYWluaW5nIDEtY2hhcmFjdGVyIHB1bmN0dWF0b3JzLlxuXG4gICAgICAgIGlmICgnW108PistKiUmfF4hfj86PS8nLmluZGV4T2YoY2gxKSA+PSAwKSB7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHR5cGU6IFRva2VuLlB1bmN0dWF0b3IsXG4gICAgICAgICAgICAgICAgdmFsdWU6IHNvdXJjZVtpbmRleCsrXSxcbiAgICAgICAgICAgICAgICBsaW5lTnVtYmVyOiBsaW5lTnVtYmVyLFxuICAgICAgICAgICAgICAgIGxpbmVTdGFydDogbGluZVN0YXJ0LFxuICAgICAgICAgICAgICAgIHJhbmdlOiBbc3RhcnQsIGluZGV4XVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8vIDcuOC4zIE51bWVyaWMgTGl0ZXJhbHNcblxuICAgIGZ1bmN0aW9uIHNjYW5OdW1lcmljTGl0ZXJhbCgpIHtcbiAgICAgICAgdmFyIG51bWJlciwgc3RhcnQsIGNoO1xuXG4gICAgICAgIGNoID0gc291cmNlW2luZGV4XTtcbiAgICAgICAgYXNzZXJ0KGlzRGVjaW1hbERpZ2l0KGNoKSB8fCAoY2ggPT09ICcuJyksXG4gICAgICAgICAgICAnTnVtZXJpYyBsaXRlcmFsIG11c3Qgc3RhcnQgd2l0aCBhIGRlY2ltYWwgZGlnaXQgb3IgYSBkZWNpbWFsIHBvaW50Jyk7XG5cbiAgICAgICAgc3RhcnQgPSBpbmRleDtcbiAgICAgICAgbnVtYmVyID0gJyc7XG4gICAgICAgIGlmIChjaCAhPT0gJy4nKSB7XG4gICAgICAgICAgICBudW1iZXIgPSBzb3VyY2VbaW5kZXgrK107XG4gICAgICAgICAgICBjaCA9IHNvdXJjZVtpbmRleF07XG5cbiAgICAgICAgICAgIC8vIEhleCBudW1iZXIgc3RhcnRzIHdpdGggJzB4Jy5cbiAgICAgICAgICAgIC8vIE9jdGFsIG51bWJlciBzdGFydHMgd2l0aCAnMCcuXG4gICAgICAgICAgICBpZiAobnVtYmVyID09PSAnMCcpIHtcbiAgICAgICAgICAgICAgICBpZiAoY2ggPT09ICd4JyB8fCBjaCA9PT0gJ1gnKSB7XG4gICAgICAgICAgICAgICAgICAgIG51bWJlciArPSBzb3VyY2VbaW5kZXgrK107XG4gICAgICAgICAgICAgICAgICAgIHdoaWxlIChpbmRleCA8IGxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY2ggPSBzb3VyY2VbaW5kZXhdO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFpc0hleERpZ2l0KGNoKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgbnVtYmVyICs9IHNvdXJjZVtpbmRleCsrXTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIGlmIChudW1iZXIubGVuZ3RoIDw9IDIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIG9ubHkgMHhcbiAgICAgICAgICAgICAgICAgICAgICAgIHRocm93RXJyb3Ioe30sIE1lc3NhZ2VzLlVuZXhwZWN0ZWRUb2tlbiwgJ0lMTEVHQUwnKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIGlmIChpbmRleCA8IGxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY2ggPSBzb3VyY2VbaW5kZXhdO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGlzSWRlbnRpZmllclN0YXJ0KGNoKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRocm93RXJyb3Ioe30sIE1lc3NhZ2VzLlVuZXhwZWN0ZWRUb2tlbiwgJ0lMTEVHQUwnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogVG9rZW4uTnVtZXJpY0xpdGVyYWwsXG4gICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZTogcGFyc2VJbnQobnVtYmVyLCAxNiksXG4gICAgICAgICAgICAgICAgICAgICAgICBsaW5lTnVtYmVyOiBsaW5lTnVtYmVyLFxuICAgICAgICAgICAgICAgICAgICAgICAgbGluZVN0YXJ0OiBsaW5lU3RhcnQsXG4gICAgICAgICAgICAgICAgICAgICAgICByYW5nZTogW3N0YXJ0LCBpbmRleF1cbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGlzT2N0YWxEaWdpdChjaCkpIHtcbiAgICAgICAgICAgICAgICAgICAgbnVtYmVyICs9IHNvdXJjZVtpbmRleCsrXTtcbiAgICAgICAgICAgICAgICAgICAgd2hpbGUgKGluZGV4IDwgbGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjaCA9IHNvdXJjZVtpbmRleF07XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIWlzT2N0YWxEaWdpdChjaCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIG51bWJlciArPSBzb3VyY2VbaW5kZXgrK107XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICBpZiAoaW5kZXggPCBsZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNoID0gc291cmNlW2luZGV4XTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpc0lkZW50aWZpZXJTdGFydChjaCkgfHwgaXNEZWNpbWFsRGlnaXQoY2gpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3dFcnJvcih7fSwgTWVzc2FnZXMuVW5leHBlY3RlZFRva2VuLCAnSUxMRUdBTCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiBUb2tlbi5OdW1lcmljTGl0ZXJhbCxcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlOiBwYXJzZUludChudW1iZXIsIDgpLFxuICAgICAgICAgICAgICAgICAgICAgICAgb2N0YWw6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgICAgICBsaW5lTnVtYmVyOiBsaW5lTnVtYmVyLFxuICAgICAgICAgICAgICAgICAgICAgICAgbGluZVN0YXJ0OiBsaW5lU3RhcnQsXG4gICAgICAgICAgICAgICAgICAgICAgICByYW5nZTogW3N0YXJ0LCBpbmRleF1cbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAvLyBkZWNpbWFsIG51bWJlciBzdGFydHMgd2l0aCAnMCcgc3VjaCBhcyAnMDknIGlzIGlsbGVnYWwuXG4gICAgICAgICAgICAgICAgaWYgKGlzRGVjaW1hbERpZ2l0KGNoKSkge1xuICAgICAgICAgICAgICAgICAgICB0aHJvd0Vycm9yKHt9LCBNZXNzYWdlcy5VbmV4cGVjdGVkVG9rZW4sICdJTExFR0FMJyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB3aGlsZSAoaW5kZXggPCBsZW5ndGgpIHtcbiAgICAgICAgICAgICAgICBjaCA9IHNvdXJjZVtpbmRleF07XG4gICAgICAgICAgICAgICAgaWYgKCFpc0RlY2ltYWxEaWdpdChjaCkpIHtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIG51bWJlciArPSBzb3VyY2VbaW5kZXgrK107XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoY2ggPT09ICcuJykge1xuICAgICAgICAgICAgbnVtYmVyICs9IHNvdXJjZVtpbmRleCsrXTtcbiAgICAgICAgICAgIHdoaWxlIChpbmRleCA8IGxlbmd0aCkge1xuICAgICAgICAgICAgICAgIGNoID0gc291cmNlW2luZGV4XTtcbiAgICAgICAgICAgICAgICBpZiAoIWlzRGVjaW1hbERpZ2l0KGNoKSkge1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgbnVtYmVyICs9IHNvdXJjZVtpbmRleCsrXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChjaCA9PT0gJ2UnIHx8IGNoID09PSAnRScpIHtcbiAgICAgICAgICAgIG51bWJlciArPSBzb3VyY2VbaW5kZXgrK107XG5cbiAgICAgICAgICAgIGNoID0gc291cmNlW2luZGV4XTtcbiAgICAgICAgICAgIGlmIChjaCA9PT0gJysnIHx8IGNoID09PSAnLScpIHtcbiAgICAgICAgICAgICAgICBudW1iZXIgKz0gc291cmNlW2luZGV4KytdO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjaCA9IHNvdXJjZVtpbmRleF07XG4gICAgICAgICAgICBpZiAoaXNEZWNpbWFsRGlnaXQoY2gpKSB7XG4gICAgICAgICAgICAgICAgbnVtYmVyICs9IHNvdXJjZVtpbmRleCsrXTtcbiAgICAgICAgICAgICAgICB3aGlsZSAoaW5kZXggPCBsZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgY2ggPSBzb3VyY2VbaW5kZXhdO1xuICAgICAgICAgICAgICAgICAgICBpZiAoIWlzRGVjaW1hbERpZ2l0KGNoKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgbnVtYmVyICs9IHNvdXJjZVtpbmRleCsrXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNoID0gJ2NoYXJhY3RlciAnICsgY2g7XG4gICAgICAgICAgICAgICAgaWYgKGluZGV4ID49IGxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICBjaCA9ICc8ZW5kPic7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHRocm93RXJyb3Ioe30sIE1lc3NhZ2VzLlVuZXhwZWN0ZWRUb2tlbiwgJ0lMTEVHQUwnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChpbmRleCA8IGxlbmd0aCkge1xuICAgICAgICAgICAgY2ggPSBzb3VyY2VbaW5kZXhdO1xuICAgICAgICAgICAgaWYgKGlzSWRlbnRpZmllclN0YXJ0KGNoKSkge1xuICAgICAgICAgICAgICAgIHRocm93RXJyb3Ioe30sIE1lc3NhZ2VzLlVuZXhwZWN0ZWRUb2tlbiwgJ0lMTEVHQUwnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB0eXBlOiBUb2tlbi5OdW1lcmljTGl0ZXJhbCxcbiAgICAgICAgICAgIHZhbHVlOiBwYXJzZUZsb2F0KG51bWJlciksXG4gICAgICAgICAgICBsaW5lTnVtYmVyOiBsaW5lTnVtYmVyLFxuICAgICAgICAgICAgbGluZVN0YXJ0OiBsaW5lU3RhcnQsXG4gICAgICAgICAgICByYW5nZTogW3N0YXJ0LCBpbmRleF1cbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvLyA3LjguNCBTdHJpbmcgTGl0ZXJhbHNcblxuICAgIGZ1bmN0aW9uIHNjYW5TdHJpbmdMaXRlcmFsKCkge1xuICAgICAgICB2YXIgc3RyID0gJycsIHF1b3RlLCBzdGFydCwgY2gsIGNvZGUsIHVuZXNjYXBlZCwgcmVzdG9yZSwgb2N0YWwgPSBmYWxzZTtcblxuICAgICAgICBxdW90ZSA9IHNvdXJjZVtpbmRleF07XG4gICAgICAgIGFzc2VydCgocXVvdGUgPT09ICdcXCcnIHx8IHF1b3RlID09PSAnXCInKSxcbiAgICAgICAgICAgICdTdHJpbmcgbGl0ZXJhbCBtdXN0IHN0YXJ0cyB3aXRoIGEgcXVvdGUnKTtcblxuICAgICAgICBzdGFydCA9IGluZGV4O1xuICAgICAgICArK2luZGV4O1xuXG4gICAgICAgIHdoaWxlIChpbmRleCA8IGxlbmd0aCkge1xuICAgICAgICAgICAgY2ggPSBzb3VyY2VbaW5kZXgrK107XG5cbiAgICAgICAgICAgIGlmIChjaCA9PT0gcXVvdGUpIHtcbiAgICAgICAgICAgICAgICBxdW90ZSA9ICcnO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChjaCA9PT0gJ1xcXFwnKSB7XG4gICAgICAgICAgICAgICAgY2ggPSBzb3VyY2VbaW5kZXgrK107XG4gICAgICAgICAgICAgICAgaWYgKCFpc0xpbmVUZXJtaW5hdG9yKGNoKSkge1xuICAgICAgICAgICAgICAgICAgICBzd2l0Y2ggKGNoKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ24nOlxuICAgICAgICAgICAgICAgICAgICAgICAgc3RyICs9ICdcXG4nO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ3InOlxuICAgICAgICAgICAgICAgICAgICAgICAgc3RyICs9ICdcXHInO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ3QnOlxuICAgICAgICAgICAgICAgICAgICAgICAgc3RyICs9ICdcXHQnO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ3UnOlxuICAgICAgICAgICAgICAgICAgICBjYXNlICd4JzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc3RvcmUgPSBpbmRleDtcbiAgICAgICAgICAgICAgICAgICAgICAgIHVuZXNjYXBlZCA9IHNjYW5IZXhFc2NhcGUoY2gpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHVuZXNjYXBlZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0ciArPSB1bmVzY2FwZWQ7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGluZGV4ID0gcmVzdG9yZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdHIgKz0gY2g7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnYic6XG4gICAgICAgICAgICAgICAgICAgICAgICBzdHIgKz0gJ1xcYic7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnZic6XG4gICAgICAgICAgICAgICAgICAgICAgICBzdHIgKz0gJ1xcZic7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAndic6XG4gICAgICAgICAgICAgICAgICAgICAgICBzdHIgKz0gJ1xceDBCJztcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoaXNPY3RhbERpZ2l0KGNoKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvZGUgPSAnMDEyMzQ1NjcnLmluZGV4T2YoY2gpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gXFwwIGlzIG5vdCBvY3RhbCBlc2NhcGUgc2VxdWVuY2VcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoY29kZSAhPT0gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvY3RhbCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGluZGV4IDwgbGVuZ3RoICYmIGlzT2N0YWxEaWdpdChzb3VyY2VbaW5kZXhdKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvY3RhbCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvZGUgPSBjb2RlICogOCArICcwMTIzNDU2NycuaW5kZXhPZihzb3VyY2VbaW5kZXgrK10pO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIDMgZGlnaXRzIGFyZSBvbmx5IGFsbG93ZWQgd2hlbiBzdHJpbmcgc3RhcnRzXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIHdpdGggMCwgMSwgMiwgM1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoJzAxMjMnLmluZGV4T2YoY2gpID49IDAgJiZcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpbmRleCA8IGxlbmd0aCAmJlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlzT2N0YWxEaWdpdChzb3VyY2VbaW5kZXhdKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29kZSA9IGNvZGUgKiA4ICsgJzAxMjM0NTY3Jy5pbmRleE9mKHNvdXJjZVtpbmRleCsrXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RyICs9IFN0cmluZy5mcm9tQ2hhckNvZGUoY29kZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0ciArPSBjaDtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgKytsaW5lTnVtYmVyO1xuICAgICAgICAgICAgICAgICAgICBpZiAoY2ggPT09ICAnXFxyJyAmJiBzb3VyY2VbaW5kZXhdID09PSAnXFxuJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgKytpbmRleDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSBpZiAoaXNMaW5lVGVybWluYXRvcihjaCkpIHtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgc3RyICs9IGNoO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHF1b3RlICE9PSAnJykge1xuICAgICAgICAgICAgdGhyb3dFcnJvcih7fSwgTWVzc2FnZXMuVW5leHBlY3RlZFRva2VuLCAnSUxMRUdBTCcpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHR5cGU6IFRva2VuLlN0cmluZ0xpdGVyYWwsXG4gICAgICAgICAgICB2YWx1ZTogc3RyLFxuICAgICAgICAgICAgb2N0YWw6IG9jdGFsLFxuICAgICAgICAgICAgbGluZU51bWJlcjogbGluZU51bWJlcixcbiAgICAgICAgICAgIGxpbmVTdGFydDogbGluZVN0YXJ0LFxuICAgICAgICAgICAgcmFuZ2U6IFtzdGFydCwgaW5kZXhdXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gc2NhblJlZ0V4cCgpIHtcbiAgICAgICAgdmFyIHN0ciwgY2gsIHN0YXJ0LCBwYXR0ZXJuLCBmbGFncywgdmFsdWUsIGNsYXNzTWFya2VyID0gZmFsc2UsIHJlc3RvcmUsIHRlcm1pbmF0ZWQgPSBmYWxzZTtcblxuICAgICAgICBidWZmZXIgPSBudWxsO1xuICAgICAgICBza2lwQ29tbWVudCgpO1xuXG4gICAgICAgIHN0YXJ0ID0gaW5kZXg7XG4gICAgICAgIGNoID0gc291cmNlW2luZGV4XTtcbiAgICAgICAgYXNzZXJ0KGNoID09PSAnLycsICdSZWd1bGFyIGV4cHJlc3Npb24gbGl0ZXJhbCBtdXN0IHN0YXJ0IHdpdGggYSBzbGFzaCcpO1xuICAgICAgICBzdHIgPSBzb3VyY2VbaW5kZXgrK107XG5cbiAgICAgICAgd2hpbGUgKGluZGV4IDwgbGVuZ3RoKSB7XG4gICAgICAgICAgICBjaCA9IHNvdXJjZVtpbmRleCsrXTtcbiAgICAgICAgICAgIHN0ciArPSBjaDtcbiAgICAgICAgICAgIGlmIChjbGFzc01hcmtlcikge1xuICAgICAgICAgICAgICAgIGlmIChjaCA9PT0gJ10nKSB7XG4gICAgICAgICAgICAgICAgICAgIGNsYXNzTWFya2VyID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBpZiAoY2ggPT09ICdcXFxcJykge1xuICAgICAgICAgICAgICAgICAgICBjaCA9IHNvdXJjZVtpbmRleCsrXTtcbiAgICAgICAgICAgICAgICAgICAgLy8gRUNNQS0yNjIgNy44LjVcbiAgICAgICAgICAgICAgICAgICAgaWYgKGlzTGluZVRlcm1pbmF0b3IoY2gpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aHJvd0Vycm9yKHt9LCBNZXNzYWdlcy5VbnRlcm1pbmF0ZWRSZWdFeHApO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHN0ciArPSBjaDtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGNoID09PSAnLycpIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybWluYXRlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoY2ggPT09ICdbJykge1xuICAgICAgICAgICAgICAgICAgICBjbGFzc01hcmtlciA9IHRydWU7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChpc0xpbmVUZXJtaW5hdG9yKGNoKSkge1xuICAgICAgICAgICAgICAgICAgICB0aHJvd0Vycm9yKHt9LCBNZXNzYWdlcy5VbnRlcm1pbmF0ZWRSZWdFeHApO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghdGVybWluYXRlZCkge1xuICAgICAgICAgICAgdGhyb3dFcnJvcih7fSwgTWVzc2FnZXMuVW50ZXJtaW5hdGVkUmVnRXhwKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEV4Y2x1ZGUgbGVhZGluZyBhbmQgdHJhaWxpbmcgc2xhc2guXG4gICAgICAgIHBhdHRlcm4gPSBzdHIuc3Vic3RyKDEsIHN0ci5sZW5ndGggLSAyKTtcblxuICAgICAgICBmbGFncyA9ICcnO1xuICAgICAgICB3aGlsZSAoaW5kZXggPCBsZW5ndGgpIHtcbiAgICAgICAgICAgIGNoID0gc291cmNlW2luZGV4XTtcbiAgICAgICAgICAgIGlmICghaXNJZGVudGlmaWVyUGFydChjaCkpIHtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgKytpbmRleDtcbiAgICAgICAgICAgIGlmIChjaCA9PT0gJ1xcXFwnICYmIGluZGV4IDwgbGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgY2ggPSBzb3VyY2VbaW5kZXhdO1xuICAgICAgICAgICAgICAgIGlmIChjaCA9PT0gJ3UnKSB7XG4gICAgICAgICAgICAgICAgICAgICsraW5kZXg7XG4gICAgICAgICAgICAgICAgICAgIHJlc3RvcmUgPSBpbmRleDtcbiAgICAgICAgICAgICAgICAgICAgY2ggPSBzY2FuSGV4RXNjYXBlKCd1Jyk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChjaCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZmxhZ3MgKz0gY2g7XG4gICAgICAgICAgICAgICAgICAgICAgICBzdHIgKz0gJ1xcXFx1JztcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvciAoOyByZXN0b3JlIDwgaW5kZXg7ICsrcmVzdG9yZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0ciArPSBzb3VyY2VbcmVzdG9yZV07XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpbmRleCA9IHJlc3RvcmU7XG4gICAgICAgICAgICAgICAgICAgICAgICBmbGFncyArPSAndSc7XG4gICAgICAgICAgICAgICAgICAgICAgICBzdHIgKz0gJ1xcXFx1JztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHN0ciArPSAnXFxcXCc7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBmbGFncyArPSBjaDtcbiAgICAgICAgICAgICAgICBzdHIgKz0gY2g7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgdmFsdWUgPSBuZXcgUmVnRXhwKHBhdHRlcm4sIGZsYWdzKTtcbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgdGhyb3dFcnJvcih7fSwgTWVzc2FnZXMuSW52YWxpZFJlZ0V4cCk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgbGl0ZXJhbDogc3RyLFxuICAgICAgICAgICAgdmFsdWU6IHZhbHVlLFxuICAgICAgICAgICAgcmFuZ2U6IFtzdGFydCwgaW5kZXhdXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gaXNJZGVudGlmaWVyTmFtZSh0b2tlbikge1xuICAgICAgICByZXR1cm4gdG9rZW4udHlwZSA9PT0gVG9rZW4uSWRlbnRpZmllciB8fFxuICAgICAgICAgICAgdG9rZW4udHlwZSA9PT0gVG9rZW4uS2V5d29yZCB8fFxuICAgICAgICAgICAgdG9rZW4udHlwZSA9PT0gVG9rZW4uQm9vbGVhbkxpdGVyYWwgfHxcbiAgICAgICAgICAgIHRva2VuLnR5cGUgPT09IFRva2VuLk51bGxMaXRlcmFsO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGFkdmFuY2UoKSB7XG4gICAgICAgIHZhciBjaCwgdG9rZW47XG5cbiAgICAgICAgc2tpcENvbW1lbnQoKTtcblxuICAgICAgICBpZiAoaW5kZXggPj0gbGVuZ3RoKSB7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHR5cGU6IFRva2VuLkVPRixcbiAgICAgICAgICAgICAgICBsaW5lTnVtYmVyOiBsaW5lTnVtYmVyLFxuICAgICAgICAgICAgICAgIGxpbmVTdGFydDogbGluZVN0YXJ0LFxuICAgICAgICAgICAgICAgIHJhbmdlOiBbaW5kZXgsIGluZGV4XVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRva2VuID0gc2NhblB1bmN0dWF0b3IoKTtcbiAgICAgICAgaWYgKHR5cGVvZiB0b2tlbiAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIHJldHVybiB0b2tlbjtcbiAgICAgICAgfVxuXG4gICAgICAgIGNoID0gc291cmNlW2luZGV4XTtcblxuICAgICAgICBpZiAoY2ggPT09ICdcXCcnIHx8IGNoID09PSAnXCInKSB7XG4gICAgICAgICAgICByZXR1cm4gc2NhblN0cmluZ0xpdGVyYWwoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChjaCA9PT0gJy4nIHx8IGlzRGVjaW1hbERpZ2l0KGNoKSkge1xuICAgICAgICAgICAgcmV0dXJuIHNjYW5OdW1lcmljTGl0ZXJhbCgpO1xuICAgICAgICB9XG5cbiAgICAgICAgdG9rZW4gPSBzY2FuSWRlbnRpZmllcigpO1xuICAgICAgICBpZiAodHlwZW9mIHRva2VuICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgcmV0dXJuIHRva2VuO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhyb3dFcnJvcih7fSwgTWVzc2FnZXMuVW5leHBlY3RlZFRva2VuLCAnSUxMRUdBTCcpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGxleCgpIHtcbiAgICAgICAgdmFyIHRva2VuO1xuXG4gICAgICAgIGlmIChidWZmZXIpIHtcbiAgICAgICAgICAgIGluZGV4ID0gYnVmZmVyLnJhbmdlWzFdO1xuICAgICAgICAgICAgbGluZU51bWJlciA9IGJ1ZmZlci5saW5lTnVtYmVyO1xuICAgICAgICAgICAgbGluZVN0YXJ0ID0gYnVmZmVyLmxpbmVTdGFydDtcbiAgICAgICAgICAgIHRva2VuID0gYnVmZmVyO1xuICAgICAgICAgICAgYnVmZmVyID0gbnVsbDtcbiAgICAgICAgICAgIHJldHVybiB0b2tlbjtcbiAgICAgICAgfVxuXG4gICAgICAgIGJ1ZmZlciA9IG51bGw7XG4gICAgICAgIHJldHVybiBhZHZhbmNlKCk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gbG9va2FoZWFkKCkge1xuICAgICAgICB2YXIgcG9zLCBsaW5lLCBzdGFydDtcblxuICAgICAgICBpZiAoYnVmZmVyICE9PSBudWxsKSB7XG4gICAgICAgICAgICByZXR1cm4gYnVmZmVyO1xuICAgICAgICB9XG5cbiAgICAgICAgcG9zID0gaW5kZXg7XG4gICAgICAgIGxpbmUgPSBsaW5lTnVtYmVyO1xuICAgICAgICBzdGFydCA9IGxpbmVTdGFydDtcbiAgICAgICAgYnVmZmVyID0gYWR2YW5jZSgpO1xuICAgICAgICBpbmRleCA9IHBvcztcbiAgICAgICAgbGluZU51bWJlciA9IGxpbmU7XG4gICAgICAgIGxpbmVTdGFydCA9IHN0YXJ0O1xuXG4gICAgICAgIHJldHVybiBidWZmZXI7XG4gICAgfVxuXG4gICAgLy8gUmV0dXJuIHRydWUgaWYgdGhlcmUgaXMgYSBsaW5lIHRlcm1pbmF0b3IgYmVmb3JlIHRoZSBuZXh0IHRva2VuLlxuXG4gICAgZnVuY3Rpb24gcGVla0xpbmVUZXJtaW5hdG9yKCkge1xuICAgICAgICB2YXIgcG9zLCBsaW5lLCBzdGFydCwgZm91bmQ7XG5cbiAgICAgICAgcG9zID0gaW5kZXg7XG4gICAgICAgIGxpbmUgPSBsaW5lTnVtYmVyO1xuICAgICAgICBzdGFydCA9IGxpbmVTdGFydDtcbiAgICAgICAgc2tpcENvbW1lbnQoKTtcbiAgICAgICAgZm91bmQgPSBsaW5lTnVtYmVyICE9PSBsaW5lO1xuICAgICAgICBpbmRleCA9IHBvcztcbiAgICAgICAgbGluZU51bWJlciA9IGxpbmU7XG4gICAgICAgIGxpbmVTdGFydCA9IHN0YXJ0O1xuXG4gICAgICAgIHJldHVybiBmb3VuZDtcbiAgICB9XG5cbiAgICAvLyBUaHJvdyBhbiBleGNlcHRpb25cblxuICAgIGZ1bmN0aW9uIHRocm93RXJyb3IodG9rZW4sIG1lc3NhZ2VGb3JtYXQpIHtcbiAgICAgICAgdmFyIGVycm9yLFxuICAgICAgICAgICAgYXJncyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMiksXG4gICAgICAgICAgICBtc2cgPSBtZXNzYWdlRm9ybWF0LnJlcGxhY2UoXG4gICAgICAgICAgICAgICAgLyUoXFxkKS9nLFxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uICh3aG9sZSwgaW5kZXgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGFyZ3NbaW5kZXhdIHx8ICcnO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICk7XG5cbiAgICAgICAgaWYgKHR5cGVvZiB0b2tlbi5saW5lTnVtYmVyID09PSAnbnVtYmVyJykge1xuICAgICAgICAgICAgZXJyb3IgPSBuZXcgRXJyb3IoJ0xpbmUgJyArIHRva2VuLmxpbmVOdW1iZXIgKyAnOiAnICsgbXNnKTtcbiAgICAgICAgICAgIGVycm9yLmluZGV4ID0gdG9rZW4ucmFuZ2VbMF07XG4gICAgICAgICAgICBlcnJvci5saW5lTnVtYmVyID0gdG9rZW4ubGluZU51bWJlcjtcbiAgICAgICAgICAgIGVycm9yLmNvbHVtbiA9IHRva2VuLnJhbmdlWzBdIC0gbGluZVN0YXJ0ICsgMTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGVycm9yID0gbmV3IEVycm9yKCdMaW5lICcgKyBsaW5lTnVtYmVyICsgJzogJyArIG1zZyk7XG4gICAgICAgICAgICBlcnJvci5pbmRleCA9IGluZGV4O1xuICAgICAgICAgICAgZXJyb3IubGluZU51bWJlciA9IGxpbmVOdW1iZXI7XG4gICAgICAgICAgICBlcnJvci5jb2x1bW4gPSBpbmRleCAtIGxpbmVTdGFydCArIDE7XG4gICAgICAgIH1cblxuICAgICAgICB0aHJvdyBlcnJvcjtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiB0aHJvd0Vycm9yVG9sZXJhbnQoKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICB0aHJvd0Vycm9yLmFwcGx5KG51bGwsIGFyZ3VtZW50cyk7XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgIGlmIChleHRyYS5lcnJvcnMpIHtcbiAgICAgICAgICAgICAgICBleHRyYS5lcnJvcnMucHVzaChlKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuXG4gICAgLy8gVGhyb3cgYW4gZXhjZXB0aW9uIGJlY2F1c2Ugb2YgdGhlIHRva2VuLlxuXG4gICAgZnVuY3Rpb24gdGhyb3dVbmV4cGVjdGVkKHRva2VuKSB7XG4gICAgICAgIGlmICh0b2tlbi50eXBlID09PSBUb2tlbi5FT0YpIHtcbiAgICAgICAgICAgIHRocm93RXJyb3IodG9rZW4sIE1lc3NhZ2VzLlVuZXhwZWN0ZWRFT1MpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHRva2VuLnR5cGUgPT09IFRva2VuLk51bWVyaWNMaXRlcmFsKSB7XG4gICAgICAgICAgICB0aHJvd0Vycm9yKHRva2VuLCBNZXNzYWdlcy5VbmV4cGVjdGVkTnVtYmVyKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0b2tlbi50eXBlID09PSBUb2tlbi5TdHJpbmdMaXRlcmFsKSB7XG4gICAgICAgICAgICB0aHJvd0Vycm9yKHRva2VuLCBNZXNzYWdlcy5VbmV4cGVjdGVkU3RyaW5nKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0b2tlbi50eXBlID09PSBUb2tlbi5JZGVudGlmaWVyKSB7XG4gICAgICAgICAgICB0aHJvd0Vycm9yKHRva2VuLCBNZXNzYWdlcy5VbmV4cGVjdGVkSWRlbnRpZmllcik7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodG9rZW4udHlwZSA9PT0gVG9rZW4uS2V5d29yZCkge1xuICAgICAgICAgICAgaWYgKGlzRnV0dXJlUmVzZXJ2ZWRXb3JkKHRva2VuLnZhbHVlKSkge1xuICAgICAgICAgICAgICAgIHRocm93RXJyb3IodG9rZW4sIE1lc3NhZ2VzLlVuZXhwZWN0ZWRSZXNlcnZlZCk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHN0cmljdCAmJiBpc1N0cmljdE1vZGVSZXNlcnZlZFdvcmQodG9rZW4udmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgdGhyb3dFcnJvclRvbGVyYW50KHRva2VuLCBNZXNzYWdlcy5TdHJpY3RSZXNlcnZlZFdvcmQpO1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRocm93RXJyb3IodG9rZW4sIE1lc3NhZ2VzLlVuZXhwZWN0ZWRUb2tlbiwgdG9rZW4udmFsdWUpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQm9vbGVhbkxpdGVyYWwsIE51bGxMaXRlcmFsLCBvciBQdW5jdHVhdG9yLlxuICAgICAgICB0aHJvd0Vycm9yKHRva2VuLCBNZXNzYWdlcy5VbmV4cGVjdGVkVG9rZW4sIHRva2VuLnZhbHVlKTtcbiAgICB9XG5cbiAgICAvLyBFeHBlY3QgdGhlIG5leHQgdG9rZW4gdG8gbWF0Y2ggdGhlIHNwZWNpZmllZCBwdW5jdHVhdG9yLlxuICAgIC8vIElmIG5vdCwgYW4gZXhjZXB0aW9uIHdpbGwgYmUgdGhyb3duLlxuXG4gICAgZnVuY3Rpb24gZXhwZWN0KHZhbHVlKSB7XG4gICAgICAgIHZhciB0b2tlbiA9IGxleCgpO1xuICAgICAgICBpZiAodG9rZW4udHlwZSAhPT0gVG9rZW4uUHVuY3R1YXRvciB8fCB0b2tlbi52YWx1ZSAhPT0gdmFsdWUpIHtcbiAgICAgICAgICAgIHRocm93VW5leHBlY3RlZCh0b2tlbik7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBFeHBlY3QgdGhlIG5leHQgdG9rZW4gdG8gbWF0Y2ggdGhlIHNwZWNpZmllZCBrZXl3b3JkLlxuICAgIC8vIElmIG5vdCwgYW4gZXhjZXB0aW9uIHdpbGwgYmUgdGhyb3duLlxuXG4gICAgZnVuY3Rpb24gZXhwZWN0S2V5d29yZChrZXl3b3JkKSB7XG4gICAgICAgIHZhciB0b2tlbiA9IGxleCgpO1xuICAgICAgICBpZiAodG9rZW4udHlwZSAhPT0gVG9rZW4uS2V5d29yZCB8fCB0b2tlbi52YWx1ZSAhPT0ga2V5d29yZCkge1xuICAgICAgICAgICAgdGhyb3dVbmV4cGVjdGVkKHRva2VuKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8vIFJldHVybiB0cnVlIGlmIHRoZSBuZXh0IHRva2VuIG1hdGNoZXMgdGhlIHNwZWNpZmllZCBwdW5jdHVhdG9yLlxuXG4gICAgZnVuY3Rpb24gbWF0Y2godmFsdWUpIHtcbiAgICAgICAgdmFyIHRva2VuID0gbG9va2FoZWFkKCk7XG4gICAgICAgIHJldHVybiB0b2tlbi50eXBlID09PSBUb2tlbi5QdW5jdHVhdG9yICYmIHRva2VuLnZhbHVlID09PSB2YWx1ZTtcbiAgICB9XG5cbiAgICAvLyBSZXR1cm4gdHJ1ZSBpZiB0aGUgbmV4dCB0b2tlbiBtYXRjaGVzIHRoZSBzcGVjaWZpZWQga2V5d29yZFxuXG4gICAgZnVuY3Rpb24gbWF0Y2hLZXl3b3JkKGtleXdvcmQpIHtcbiAgICAgICAgdmFyIHRva2VuID0gbG9va2FoZWFkKCk7XG4gICAgICAgIHJldHVybiB0b2tlbi50eXBlID09PSBUb2tlbi5LZXl3b3JkICYmIHRva2VuLnZhbHVlID09PSBrZXl3b3JkO1xuICAgIH1cblxuICAgIC8vIFJldHVybiB0cnVlIGlmIHRoZSBuZXh0IHRva2VuIGlzIGFuIGFzc2lnbm1lbnQgb3BlcmF0b3JcblxuICAgIGZ1bmN0aW9uIG1hdGNoQXNzaWduKCkge1xuICAgICAgICB2YXIgdG9rZW4gPSBsb29rYWhlYWQoKSxcbiAgICAgICAgICAgIG9wID0gdG9rZW4udmFsdWU7XG5cbiAgICAgICAgaWYgKHRva2VuLnR5cGUgIT09IFRva2VuLlB1bmN0dWF0b3IpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gb3AgPT09ICc9JyB8fFxuICAgICAgICAgICAgb3AgPT09ICcqPScgfHxcbiAgICAgICAgICAgIG9wID09PSAnLz0nIHx8XG4gICAgICAgICAgICBvcCA9PT0gJyU9JyB8fFxuICAgICAgICAgICAgb3AgPT09ICcrPScgfHxcbiAgICAgICAgICAgIG9wID09PSAnLT0nIHx8XG4gICAgICAgICAgICBvcCA9PT0gJzw8PScgfHxcbiAgICAgICAgICAgIG9wID09PSAnPj49JyB8fFxuICAgICAgICAgICAgb3AgPT09ICc+Pj49JyB8fFxuICAgICAgICAgICAgb3AgPT09ICcmPScgfHxcbiAgICAgICAgICAgIG9wID09PSAnXj0nIHx8XG4gICAgICAgICAgICBvcCA9PT0gJ3w9JztcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBjb25zdW1lU2VtaWNvbG9uKCkge1xuICAgICAgICB2YXIgdG9rZW4sIGxpbmU7XG5cbiAgICAgICAgLy8gQ2F0Y2ggdGhlIHZlcnkgY29tbW9uIGNhc2UgZmlyc3QuXG4gICAgICAgIGlmIChzb3VyY2VbaW5kZXhdID09PSAnOycpIHtcbiAgICAgICAgICAgIGxleCgpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgbGluZSA9IGxpbmVOdW1iZXI7XG4gICAgICAgIHNraXBDb21tZW50KCk7XG4gICAgICAgIGlmIChsaW5lTnVtYmVyICE9PSBsaW5lKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBpZiAobWF0Y2goJzsnKSkge1xuICAgICAgICAgICAgbGV4KCk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICB0b2tlbiA9IGxvb2thaGVhZCgpO1xuICAgICAgICBpZiAodG9rZW4udHlwZSAhPT0gVG9rZW4uRU9GICYmICFtYXRjaCgnfScpKSB7XG4gICAgICAgICAgICB0aHJvd1VuZXhwZWN0ZWQodG9rZW4pO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy8gUmV0dXJuIHRydWUgaWYgcHJvdmlkZWQgZXhwcmVzc2lvbiBpcyBMZWZ0SGFuZFNpZGVFeHByZXNzaW9uXG5cbiAgICBmdW5jdGlvbiBpc0xlZnRIYW5kU2lkZShleHByKSB7XG4gICAgICAgIHJldHVybiBleHByLnR5cGUgPT09IFN5bnRheC5JZGVudGlmaWVyIHx8IGV4cHIudHlwZSA9PT0gU3ludGF4Lk1lbWJlckV4cHJlc3Npb247XG4gICAgfVxuXG4gICAgLy8gMTEuMS40IEFycmF5IEluaXRpYWxpc2VyXG5cbiAgICBmdW5jdGlvbiBwYXJzZUFycmF5SW5pdGlhbGlzZXIoKSB7XG4gICAgICAgIHZhciBlbGVtZW50cyA9IFtdO1xuXG4gICAgICAgIGV4cGVjdCgnWycpO1xuXG4gICAgICAgIHdoaWxlICghbWF0Y2goJ10nKSkge1xuICAgICAgICAgICAgaWYgKG1hdGNoKCcsJykpIHtcbiAgICAgICAgICAgICAgICBsZXgoKTtcbiAgICAgICAgICAgICAgICBlbGVtZW50cy5wdXNoKG51bGwpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBlbGVtZW50cy5wdXNoKHBhcnNlQXNzaWdubWVudEV4cHJlc3Npb24oKSk7XG5cbiAgICAgICAgICAgICAgICBpZiAoIW1hdGNoKCddJykpIHtcbiAgICAgICAgICAgICAgICAgICAgZXhwZWN0KCcsJyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgZXhwZWN0KCddJyk7XG5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHR5cGU6IFN5bnRheC5BcnJheUV4cHJlc3Npb24sXG4gICAgICAgICAgICBlbGVtZW50czogZWxlbWVudHNcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvLyAxMS4xLjUgT2JqZWN0IEluaXRpYWxpc2VyXG5cbiAgICBmdW5jdGlvbiBwYXJzZVByb3BlcnR5RnVuY3Rpb24ocGFyYW0sIGZpcnN0KSB7XG4gICAgICAgIHZhciBwcmV2aW91c1N0cmljdCwgYm9keTtcblxuICAgICAgICBwcmV2aW91c1N0cmljdCA9IHN0cmljdDtcbiAgICAgICAgYm9keSA9IHBhcnNlRnVuY3Rpb25Tb3VyY2VFbGVtZW50cygpO1xuICAgICAgICBpZiAoZmlyc3QgJiYgc3RyaWN0ICYmIGlzUmVzdHJpY3RlZFdvcmQocGFyYW1bMF0ubmFtZSkpIHtcbiAgICAgICAgICAgIHRocm93RXJyb3JUb2xlcmFudChmaXJzdCwgTWVzc2FnZXMuU3RyaWN0UGFyYW1OYW1lKTtcbiAgICAgICAgfVxuICAgICAgICBzdHJpY3QgPSBwcmV2aW91c1N0cmljdDtcblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgdHlwZTogU3ludGF4LkZ1bmN0aW9uRXhwcmVzc2lvbixcbiAgICAgICAgICAgIGlkOiBudWxsLFxuICAgICAgICAgICAgcGFyYW1zOiBwYXJhbSxcbiAgICAgICAgICAgIGRlZmF1bHRzOiBbXSxcbiAgICAgICAgICAgIGJvZHk6IGJvZHksXG4gICAgICAgICAgICByZXN0OiBudWxsLFxuICAgICAgICAgICAgZ2VuZXJhdG9yOiBmYWxzZSxcbiAgICAgICAgICAgIGV4cHJlc3Npb246IGZhbHNlXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcGFyc2VPYmplY3RQcm9wZXJ0eUtleSgpIHtcbiAgICAgICAgdmFyIHRva2VuID0gbGV4KCk7XG5cbiAgICAgICAgLy8gTm90ZTogVGhpcyBmdW5jdGlvbiBpcyBjYWxsZWQgb25seSBmcm9tIHBhcnNlT2JqZWN0UHJvcGVydHkoKSwgd2hlcmVcbiAgICAgICAgLy8gRU9GIGFuZCBQdW5jdHVhdG9yIHRva2VucyBhcmUgYWxyZWFkeSBmaWx0ZXJlZCBvdXQuXG5cbiAgICAgICAgaWYgKHRva2VuLnR5cGUgPT09IFRva2VuLlN0cmluZ0xpdGVyYWwgfHwgdG9rZW4udHlwZSA9PT0gVG9rZW4uTnVtZXJpY0xpdGVyYWwpIHtcbiAgICAgICAgICAgIGlmIChzdHJpY3QgJiYgdG9rZW4ub2N0YWwpIHtcbiAgICAgICAgICAgICAgICB0aHJvd0Vycm9yVG9sZXJhbnQodG9rZW4sIE1lc3NhZ2VzLlN0cmljdE9jdGFsTGl0ZXJhbCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gY3JlYXRlTGl0ZXJhbCh0b2tlbik7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgdHlwZTogU3ludGF4LklkZW50aWZpZXIsXG4gICAgICAgICAgICBuYW1lOiB0b2tlbi52YWx1ZVxuICAgICAgICB9O1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHBhcnNlT2JqZWN0UHJvcGVydHkoKSB7XG4gICAgICAgIHZhciB0b2tlbiwga2V5LCBpZCwgcGFyYW07XG5cbiAgICAgICAgdG9rZW4gPSBsb29rYWhlYWQoKTtcblxuICAgICAgICBpZiAodG9rZW4udHlwZSA9PT0gVG9rZW4uSWRlbnRpZmllcikge1xuXG4gICAgICAgICAgICBpZCA9IHBhcnNlT2JqZWN0UHJvcGVydHlLZXkoKTtcblxuICAgICAgICAgICAgLy8gUHJvcGVydHkgQXNzaWdubWVudDogR2V0dGVyIGFuZCBTZXR0ZXIuXG5cbiAgICAgICAgICAgIGlmICh0b2tlbi52YWx1ZSA9PT0gJ2dldCcgJiYgIW1hdGNoKCc6JykpIHtcbiAgICAgICAgICAgICAgICBrZXkgPSBwYXJzZU9iamVjdFByb3BlcnR5S2V5KCk7XG4gICAgICAgICAgICAgICAgZXhwZWN0KCcoJyk7XG4gICAgICAgICAgICAgICAgZXhwZWN0KCcpJyk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogU3ludGF4LlByb3BlcnR5LFxuICAgICAgICAgICAgICAgICAgICBrZXk6IGtleSxcbiAgICAgICAgICAgICAgICAgICAgdmFsdWU6IHBhcnNlUHJvcGVydHlGdW5jdGlvbihbXSksXG4gICAgICAgICAgICAgICAgICAgIGtpbmQ6ICdnZXQnXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAodG9rZW4udmFsdWUgPT09ICdzZXQnICYmICFtYXRjaCgnOicpKSB7XG4gICAgICAgICAgICAgICAga2V5ID0gcGFyc2VPYmplY3RQcm9wZXJ0eUtleSgpO1xuICAgICAgICAgICAgICAgIGV4cGVjdCgnKCcpO1xuICAgICAgICAgICAgICAgIHRva2VuID0gbG9va2FoZWFkKCk7XG4gICAgICAgICAgICAgICAgaWYgKHRva2VuLnR5cGUgIT09IFRva2VuLklkZW50aWZpZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgZXhwZWN0KCcpJyk7XG4gICAgICAgICAgICAgICAgICAgIHRocm93RXJyb3JUb2xlcmFudCh0b2tlbiwgTWVzc2FnZXMuVW5leHBlY3RlZFRva2VuLCB0b2tlbi52YWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiBTeW50YXguUHJvcGVydHksXG4gICAgICAgICAgICAgICAgICAgICAgICBrZXk6IGtleSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlOiBwYXJzZVByb3BlcnR5RnVuY3Rpb24oW10pLFxuICAgICAgICAgICAgICAgICAgICAgICAga2luZDogJ3NldCdcbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBwYXJhbSA9IFsgcGFyc2VWYXJpYWJsZUlkZW50aWZpZXIoKSBdO1xuICAgICAgICAgICAgICAgICAgICBleHBlY3QoJyknKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6IFN5bnRheC5Qcm9wZXJ0eSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGtleToga2V5LFxuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6IHBhcnNlUHJvcGVydHlGdW5jdGlvbihwYXJhbSwgdG9rZW4pLFxuICAgICAgICAgICAgICAgICAgICAgICAga2luZDogJ3NldCdcbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGV4cGVjdCgnOicpO1xuICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IFN5bnRheC5Qcm9wZXJ0eSxcbiAgICAgICAgICAgICAgICAgICAga2V5OiBpZCxcbiAgICAgICAgICAgICAgICAgICAgdmFsdWU6IHBhcnNlQXNzaWdubWVudEV4cHJlc3Npb24oKSxcbiAgICAgICAgICAgICAgICAgICAga2luZDogJ2luaXQnXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmICh0b2tlbi50eXBlID09PSBUb2tlbi5FT0YgfHwgdG9rZW4udHlwZSA9PT0gVG9rZW4uUHVuY3R1YXRvcikge1xuICAgICAgICAgICAgdGhyb3dVbmV4cGVjdGVkKHRva2VuKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGtleSA9IHBhcnNlT2JqZWN0UHJvcGVydHlLZXkoKTtcbiAgICAgICAgICAgIGV4cGVjdCgnOicpO1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICB0eXBlOiBTeW50YXguUHJvcGVydHksXG4gICAgICAgICAgICAgICAga2V5OiBrZXksXG4gICAgICAgICAgICAgICAgdmFsdWU6IHBhcnNlQXNzaWdubWVudEV4cHJlc3Npb24oKSxcbiAgICAgICAgICAgICAgICBraW5kOiAnaW5pdCdcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBwYXJzZU9iamVjdEluaXRpYWxpc2VyKCkge1xuICAgICAgICB2YXIgcHJvcGVydGllcyA9IFtdLCBwcm9wZXJ0eSwgbmFtZSwga2luZCwgbWFwID0ge30sIHRvU3RyaW5nID0gU3RyaW5nO1xuXG4gICAgICAgIGV4cGVjdCgneycpO1xuXG4gICAgICAgIHdoaWxlICghbWF0Y2goJ30nKSkge1xuICAgICAgICAgICAgcHJvcGVydHkgPSBwYXJzZU9iamVjdFByb3BlcnR5KCk7XG5cbiAgICAgICAgICAgIGlmIChwcm9wZXJ0eS5rZXkudHlwZSA9PT0gU3ludGF4LklkZW50aWZpZXIpIHtcbiAgICAgICAgICAgICAgICBuYW1lID0gcHJvcGVydHkua2V5Lm5hbWU7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIG5hbWUgPSB0b1N0cmluZyhwcm9wZXJ0eS5rZXkudmFsdWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAga2luZCA9IChwcm9wZXJ0eS5raW5kID09PSAnaW5pdCcpID8gUHJvcGVydHlLaW5kLkRhdGEgOiAocHJvcGVydHkua2luZCA9PT0gJ2dldCcpID8gUHJvcGVydHlLaW5kLkdldCA6IFByb3BlcnR5S2luZC5TZXQ7XG4gICAgICAgICAgICBpZiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG1hcCwgbmFtZSkpIHtcbiAgICAgICAgICAgICAgICBpZiAobWFwW25hbWVdID09PSBQcm9wZXJ0eUtpbmQuRGF0YSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoc3RyaWN0ICYmIGtpbmQgPT09IFByb3BlcnR5S2luZC5EYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aHJvd0Vycm9yVG9sZXJhbnQoe30sIE1lc3NhZ2VzLlN0cmljdER1cGxpY2F0ZVByb3BlcnR5KTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChraW5kICE9PSBQcm9wZXJ0eUtpbmQuRGF0YSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3dFcnJvclRvbGVyYW50KHt9LCBNZXNzYWdlcy5BY2Nlc3NvckRhdGFQcm9wZXJ0eSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBpZiAoa2luZCA9PT0gUHJvcGVydHlLaW5kLkRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRocm93RXJyb3JUb2xlcmFudCh7fSwgTWVzc2FnZXMuQWNjZXNzb3JEYXRhUHJvcGVydHkpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKG1hcFtuYW1lXSAmIGtpbmQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRocm93RXJyb3JUb2xlcmFudCh7fSwgTWVzc2FnZXMuQWNjZXNzb3JHZXRTZXQpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIG1hcFtuYW1lXSB8PSBraW5kO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBtYXBbbmFtZV0gPSBraW5kO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBwcm9wZXJ0aWVzLnB1c2gocHJvcGVydHkpO1xuXG4gICAgICAgICAgICBpZiAoIW1hdGNoKCd9JykpIHtcbiAgICAgICAgICAgICAgICBleHBlY3QoJywnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGV4cGVjdCgnfScpO1xuXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB0eXBlOiBTeW50YXguT2JqZWN0RXhwcmVzc2lvbixcbiAgICAgICAgICAgIHByb3BlcnRpZXM6IHByb3BlcnRpZXNcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvLyAxMS4xLjYgVGhlIEdyb3VwaW5nIE9wZXJhdG9yXG5cbiAgICBmdW5jdGlvbiBwYXJzZUdyb3VwRXhwcmVzc2lvbigpIHtcbiAgICAgICAgdmFyIGV4cHI7XG5cbiAgICAgICAgZXhwZWN0KCcoJyk7XG5cbiAgICAgICAgZXhwciA9IHBhcnNlRXhwcmVzc2lvbigpO1xuXG4gICAgICAgIGV4cGVjdCgnKScpO1xuXG4gICAgICAgIHJldHVybiBleHByO1xuICAgIH1cblxuXG4gICAgLy8gMTEuMSBQcmltYXJ5IEV4cHJlc3Npb25zXG5cbiAgICBmdW5jdGlvbiBwYXJzZVByaW1hcnlFeHByZXNzaW9uKCkge1xuICAgICAgICB2YXIgdG9rZW4gPSBsb29rYWhlYWQoKSxcbiAgICAgICAgICAgIHR5cGUgPSB0b2tlbi50eXBlO1xuXG4gICAgICAgIGlmICh0eXBlID09PSBUb2tlbi5JZGVudGlmaWVyKSB7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHR5cGU6IFN5bnRheC5JZGVudGlmaWVyLFxuICAgICAgICAgICAgICAgIG5hbWU6IGxleCgpLnZhbHVlXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHR5cGUgPT09IFRva2VuLlN0cmluZ0xpdGVyYWwgfHwgdHlwZSA9PT0gVG9rZW4uTnVtZXJpY0xpdGVyYWwpIHtcbiAgICAgICAgICAgIGlmIChzdHJpY3QgJiYgdG9rZW4ub2N0YWwpIHtcbiAgICAgICAgICAgICAgICB0aHJvd0Vycm9yVG9sZXJhbnQodG9rZW4sIE1lc3NhZ2VzLlN0cmljdE9jdGFsTGl0ZXJhbCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gY3JlYXRlTGl0ZXJhbChsZXgoKSk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodHlwZSA9PT0gVG9rZW4uS2V5d29yZCkge1xuICAgICAgICAgICAgaWYgKG1hdGNoS2V5d29yZCgndGhpcycpKSB7XG4gICAgICAgICAgICAgICAgbGV4KCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogU3ludGF4LlRoaXNFeHByZXNzaW9uXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKG1hdGNoS2V5d29yZCgnZnVuY3Rpb24nKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBwYXJzZUZ1bmN0aW9uRXhwcmVzc2lvbigpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHR5cGUgPT09IFRva2VuLkJvb2xlYW5MaXRlcmFsKSB7XG4gICAgICAgICAgICBsZXgoKTtcbiAgICAgICAgICAgIHRva2VuLnZhbHVlID0gKHRva2VuLnZhbHVlID09PSAndHJ1ZScpO1xuICAgICAgICAgICAgcmV0dXJuIGNyZWF0ZUxpdGVyYWwodG9rZW4pO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHR5cGUgPT09IFRva2VuLk51bGxMaXRlcmFsKSB7XG4gICAgICAgICAgICBsZXgoKTtcbiAgICAgICAgICAgIHRva2VuLnZhbHVlID0gbnVsbDtcbiAgICAgICAgICAgIHJldHVybiBjcmVhdGVMaXRlcmFsKHRva2VuKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChtYXRjaCgnWycpKSB7XG4gICAgICAgICAgICByZXR1cm4gcGFyc2VBcnJheUluaXRpYWxpc2VyKCk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAobWF0Y2goJ3snKSkge1xuICAgICAgICAgICAgcmV0dXJuIHBhcnNlT2JqZWN0SW5pdGlhbGlzZXIoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChtYXRjaCgnKCcpKSB7XG4gICAgICAgICAgICByZXR1cm4gcGFyc2VHcm91cEV4cHJlc3Npb24oKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChtYXRjaCgnLycpIHx8IG1hdGNoKCcvPScpKSB7XG4gICAgICAgICAgICByZXR1cm4gY3JlYXRlTGl0ZXJhbChzY2FuUmVnRXhwKCkpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHRocm93VW5leHBlY3RlZChsZXgoKSk7XG4gICAgfVxuXG4gICAgLy8gMTEuMiBMZWZ0LUhhbmQtU2lkZSBFeHByZXNzaW9uc1xuXG4gICAgZnVuY3Rpb24gcGFyc2VBcmd1bWVudHMoKSB7XG4gICAgICAgIHZhciBhcmdzID0gW107XG5cbiAgICAgICAgZXhwZWN0KCcoJyk7XG5cbiAgICAgICAgaWYgKCFtYXRjaCgnKScpKSB7XG4gICAgICAgICAgICB3aGlsZSAoaW5kZXggPCBsZW5ndGgpIHtcbiAgICAgICAgICAgICAgICBhcmdzLnB1c2gocGFyc2VBc3NpZ25tZW50RXhwcmVzc2lvbigpKTtcbiAgICAgICAgICAgICAgICBpZiAobWF0Y2goJyknKSkge1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZXhwZWN0KCcsJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBleHBlY3QoJyknKTtcblxuICAgICAgICByZXR1cm4gYXJncztcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBwYXJzZU5vbkNvbXB1dGVkUHJvcGVydHkoKSB7XG4gICAgICAgIHZhciB0b2tlbiA9IGxleCgpO1xuXG4gICAgICAgIGlmICghaXNJZGVudGlmaWVyTmFtZSh0b2tlbikpIHtcbiAgICAgICAgICAgIHRocm93VW5leHBlY3RlZCh0b2tlbik7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgdHlwZTogU3ludGF4LklkZW50aWZpZXIsXG4gICAgICAgICAgICBuYW1lOiB0b2tlbi52YWx1ZVxuICAgICAgICB9O1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHBhcnNlTm9uQ29tcHV0ZWRNZW1iZXIoKSB7XG4gICAgICAgIGV4cGVjdCgnLicpO1xuXG4gICAgICAgIHJldHVybiBwYXJzZU5vbkNvbXB1dGVkUHJvcGVydHkoKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBwYXJzZUNvbXB1dGVkTWVtYmVyKCkge1xuICAgICAgICB2YXIgZXhwcjtcblxuICAgICAgICBleHBlY3QoJ1snKTtcblxuICAgICAgICBleHByID0gcGFyc2VFeHByZXNzaW9uKCk7XG5cbiAgICAgICAgZXhwZWN0KCddJyk7XG5cbiAgICAgICAgcmV0dXJuIGV4cHI7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcGFyc2VOZXdFeHByZXNzaW9uKCkge1xuICAgICAgICB2YXIgZXhwcjtcblxuICAgICAgICBleHBlY3RLZXl3b3JkKCduZXcnKTtcblxuICAgICAgICBleHByID0ge1xuICAgICAgICAgICAgdHlwZTogU3ludGF4Lk5ld0V4cHJlc3Npb24sXG4gICAgICAgICAgICBjYWxsZWU6IHBhcnNlTGVmdEhhbmRTaWRlRXhwcmVzc2lvbigpLFxuICAgICAgICAgICAgJ2FyZ3VtZW50cyc6IFtdXG4gICAgICAgIH07XG5cbiAgICAgICAgaWYgKG1hdGNoKCcoJykpIHtcbiAgICAgICAgICAgIGV4cHJbJ2FyZ3VtZW50cyddID0gcGFyc2VBcmd1bWVudHMoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBleHByO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHBhcnNlTGVmdEhhbmRTaWRlRXhwcmVzc2lvbkFsbG93Q2FsbCgpIHtcbiAgICAgICAgdmFyIGV4cHI7XG5cbiAgICAgICAgZXhwciA9IG1hdGNoS2V5d29yZCgnbmV3JykgPyBwYXJzZU5ld0V4cHJlc3Npb24oKSA6IHBhcnNlUHJpbWFyeUV4cHJlc3Npb24oKTtcblxuICAgICAgICB3aGlsZSAobWF0Y2goJy4nKSB8fCBtYXRjaCgnWycpIHx8IG1hdGNoKCcoJykpIHtcbiAgICAgICAgICAgIGlmIChtYXRjaCgnKCcpKSB7XG4gICAgICAgICAgICAgICAgZXhwciA9IHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogU3ludGF4LkNhbGxFeHByZXNzaW9uLFxuICAgICAgICAgICAgICAgICAgICBjYWxsZWU6IGV4cHIsXG4gICAgICAgICAgICAgICAgICAgICdhcmd1bWVudHMnOiBwYXJzZUFyZ3VtZW50cygpXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAobWF0Y2goJ1snKSkge1xuICAgICAgICAgICAgICAgIGV4cHIgPSB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IFN5bnRheC5NZW1iZXJFeHByZXNzaW9uLFxuICAgICAgICAgICAgICAgICAgICBjb21wdXRlZDogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgb2JqZWN0OiBleHByLFxuICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0eTogcGFyc2VDb21wdXRlZE1lbWJlcigpXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgZXhwciA9IHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogU3ludGF4Lk1lbWJlckV4cHJlc3Npb24sXG4gICAgICAgICAgICAgICAgICAgIGNvbXB1dGVkOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgb2JqZWN0OiBleHByLFxuICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0eTogcGFyc2VOb25Db21wdXRlZE1lbWJlcigpXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBleHByO1xuICAgIH1cblxuXG4gICAgZnVuY3Rpb24gcGFyc2VMZWZ0SGFuZFNpZGVFeHByZXNzaW9uKCkge1xuICAgICAgICB2YXIgZXhwcjtcblxuICAgICAgICBleHByID0gbWF0Y2hLZXl3b3JkKCduZXcnKSA/IHBhcnNlTmV3RXhwcmVzc2lvbigpIDogcGFyc2VQcmltYXJ5RXhwcmVzc2lvbigpO1xuXG4gICAgICAgIHdoaWxlIChtYXRjaCgnLicpIHx8IG1hdGNoKCdbJykpIHtcbiAgICAgICAgICAgIGlmIChtYXRjaCgnWycpKSB7XG4gICAgICAgICAgICAgICAgZXhwciA9IHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogU3ludGF4Lk1lbWJlckV4cHJlc3Npb24sXG4gICAgICAgICAgICAgICAgICAgIGNvbXB1dGVkOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICBvYmplY3Q6IGV4cHIsXG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnR5OiBwYXJzZUNvbXB1dGVkTWVtYmVyKClcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBleHByID0ge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiBTeW50YXguTWVtYmVyRXhwcmVzc2lvbixcbiAgICAgICAgICAgICAgICAgICAgY29tcHV0ZWQ6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICBvYmplY3Q6IGV4cHIsXG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnR5OiBwYXJzZU5vbkNvbXB1dGVkTWVtYmVyKClcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGV4cHI7XG4gICAgfVxuXG4gICAgLy8gMTEuMyBQb3N0Zml4IEV4cHJlc3Npb25zXG5cbiAgICBmdW5jdGlvbiBwYXJzZVBvc3RmaXhFeHByZXNzaW9uKCkge1xuICAgICAgICB2YXIgZXhwciA9IHBhcnNlTGVmdEhhbmRTaWRlRXhwcmVzc2lvbkFsbG93Q2FsbCgpLCB0b2tlbjtcblxuICAgICAgICB0b2tlbiA9IGxvb2thaGVhZCgpO1xuICAgICAgICBpZiAodG9rZW4udHlwZSAhPT0gVG9rZW4uUHVuY3R1YXRvcikge1xuICAgICAgICAgICAgcmV0dXJuIGV4cHI7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoKG1hdGNoKCcrKycpIHx8IG1hdGNoKCctLScpKSAmJiAhcGVla0xpbmVUZXJtaW5hdG9yKCkpIHtcbiAgICAgICAgICAgIC8vIDExLjMuMSwgMTEuMy4yXG4gICAgICAgICAgICBpZiAoc3RyaWN0ICYmIGV4cHIudHlwZSA9PT0gU3ludGF4LklkZW50aWZpZXIgJiYgaXNSZXN0cmljdGVkV29yZChleHByLm5hbWUpKSB7XG4gICAgICAgICAgICAgICAgdGhyb3dFcnJvclRvbGVyYW50KHt9LCBNZXNzYWdlcy5TdHJpY3RMSFNQb3N0Zml4KTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKCFpc0xlZnRIYW5kU2lkZShleHByKSkge1xuICAgICAgICAgICAgICAgIHRocm93RXJyb3Ioe30sIE1lc3NhZ2VzLkludmFsaWRMSFNJbkFzc2lnbm1lbnQpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBleHByID0ge1xuICAgICAgICAgICAgICAgIHR5cGU6IFN5bnRheC5VcGRhdGVFeHByZXNzaW9uLFxuICAgICAgICAgICAgICAgIG9wZXJhdG9yOiBsZXgoKS52YWx1ZSxcbiAgICAgICAgICAgICAgICBhcmd1bWVudDogZXhwcixcbiAgICAgICAgICAgICAgICBwcmVmaXg6IGZhbHNlXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGV4cHI7XG4gICAgfVxuXG4gICAgLy8gMTEuNCBVbmFyeSBPcGVyYXRvcnNcblxuICAgIGZ1bmN0aW9uIHBhcnNlVW5hcnlFeHByZXNzaW9uKCkge1xuICAgICAgICB2YXIgdG9rZW4sIGV4cHI7XG5cbiAgICAgICAgdG9rZW4gPSBsb29rYWhlYWQoKTtcbiAgICAgICAgaWYgKHRva2VuLnR5cGUgIT09IFRva2VuLlB1bmN0dWF0b3IgJiYgdG9rZW4udHlwZSAhPT0gVG9rZW4uS2V5d29yZCkge1xuICAgICAgICAgICAgcmV0dXJuIHBhcnNlUG9zdGZpeEV4cHJlc3Npb24oKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChtYXRjaCgnKysnKSB8fCBtYXRjaCgnLS0nKSkge1xuICAgICAgICAgICAgdG9rZW4gPSBsZXgoKTtcbiAgICAgICAgICAgIGV4cHIgPSBwYXJzZVVuYXJ5RXhwcmVzc2lvbigpO1xuICAgICAgICAgICAgLy8gMTEuNC40LCAxMS40LjVcbiAgICAgICAgICAgIGlmIChzdHJpY3QgJiYgZXhwci50eXBlID09PSBTeW50YXguSWRlbnRpZmllciAmJiBpc1Jlc3RyaWN0ZWRXb3JkKGV4cHIubmFtZSkpIHtcbiAgICAgICAgICAgICAgICB0aHJvd0Vycm9yVG9sZXJhbnQoe30sIE1lc3NhZ2VzLlN0cmljdExIU1ByZWZpeCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmICghaXNMZWZ0SGFuZFNpZGUoZXhwcikpIHtcbiAgICAgICAgICAgICAgICB0aHJvd0Vycm9yKHt9LCBNZXNzYWdlcy5JbnZhbGlkTEhTSW5Bc3NpZ25tZW50KTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgZXhwciA9IHtcbiAgICAgICAgICAgICAgICB0eXBlOiBTeW50YXguVXBkYXRlRXhwcmVzc2lvbixcbiAgICAgICAgICAgICAgICBvcGVyYXRvcjogdG9rZW4udmFsdWUsXG4gICAgICAgICAgICAgICAgYXJndW1lbnQ6IGV4cHIsXG4gICAgICAgICAgICAgICAgcHJlZml4OiB0cnVlXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgcmV0dXJuIGV4cHI7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAobWF0Y2goJysnKSB8fCBtYXRjaCgnLScpIHx8IG1hdGNoKCd+JykgfHwgbWF0Y2goJyEnKSkge1xuICAgICAgICAgICAgZXhwciA9IHtcbiAgICAgICAgICAgICAgICB0eXBlOiBTeW50YXguVW5hcnlFeHByZXNzaW9uLFxuICAgICAgICAgICAgICAgIG9wZXJhdG9yOiBsZXgoKS52YWx1ZSxcbiAgICAgICAgICAgICAgICBhcmd1bWVudDogcGFyc2VVbmFyeUV4cHJlc3Npb24oKSxcbiAgICAgICAgICAgICAgICBwcmVmaXg6IHRydWVcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICByZXR1cm4gZXhwcjtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChtYXRjaEtleXdvcmQoJ2RlbGV0ZScpIHx8IG1hdGNoS2V5d29yZCgndm9pZCcpIHx8IG1hdGNoS2V5d29yZCgndHlwZW9mJykpIHtcbiAgICAgICAgICAgIGV4cHIgPSB7XG4gICAgICAgICAgICAgICAgdHlwZTogU3ludGF4LlVuYXJ5RXhwcmVzc2lvbixcbiAgICAgICAgICAgICAgICBvcGVyYXRvcjogbGV4KCkudmFsdWUsXG4gICAgICAgICAgICAgICAgYXJndW1lbnQ6IHBhcnNlVW5hcnlFeHByZXNzaW9uKCksXG4gICAgICAgICAgICAgICAgcHJlZml4OiB0cnVlXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgaWYgKHN0cmljdCAmJiBleHByLm9wZXJhdG9yID09PSAnZGVsZXRlJyAmJiBleHByLmFyZ3VtZW50LnR5cGUgPT09IFN5bnRheC5JZGVudGlmaWVyKSB7XG4gICAgICAgICAgICAgICAgdGhyb3dFcnJvclRvbGVyYW50KHt9LCBNZXNzYWdlcy5TdHJpY3REZWxldGUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIGV4cHI7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gcGFyc2VQb3N0Zml4RXhwcmVzc2lvbigpO1xuICAgIH1cblxuICAgIC8vIDExLjUgTXVsdGlwbGljYXRpdmUgT3BlcmF0b3JzXG5cbiAgICBmdW5jdGlvbiBwYXJzZU11bHRpcGxpY2F0aXZlRXhwcmVzc2lvbigpIHtcbiAgICAgICAgdmFyIGV4cHIgPSBwYXJzZVVuYXJ5RXhwcmVzc2lvbigpO1xuXG4gICAgICAgIHdoaWxlIChtYXRjaCgnKicpIHx8IG1hdGNoKCcvJykgfHwgbWF0Y2goJyUnKSkge1xuICAgICAgICAgICAgZXhwciA9IHtcbiAgICAgICAgICAgICAgICB0eXBlOiBTeW50YXguQmluYXJ5RXhwcmVzc2lvbixcbiAgICAgICAgICAgICAgICBvcGVyYXRvcjogbGV4KCkudmFsdWUsXG4gICAgICAgICAgICAgICAgbGVmdDogZXhwcixcbiAgICAgICAgICAgICAgICByaWdodDogcGFyc2VVbmFyeUV4cHJlc3Npb24oKVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBleHByO1xuICAgIH1cblxuICAgIC8vIDExLjYgQWRkaXRpdmUgT3BlcmF0b3JzXG5cbiAgICBmdW5jdGlvbiBwYXJzZUFkZGl0aXZlRXhwcmVzc2lvbigpIHtcbiAgICAgICAgdmFyIGV4cHIgPSBwYXJzZU11bHRpcGxpY2F0aXZlRXhwcmVzc2lvbigpO1xuXG4gICAgICAgIHdoaWxlIChtYXRjaCgnKycpIHx8IG1hdGNoKCctJykpIHtcbiAgICAgICAgICAgIGV4cHIgPSB7XG4gICAgICAgICAgICAgICAgdHlwZTogU3ludGF4LkJpbmFyeUV4cHJlc3Npb24sXG4gICAgICAgICAgICAgICAgb3BlcmF0b3I6IGxleCgpLnZhbHVlLFxuICAgICAgICAgICAgICAgIGxlZnQ6IGV4cHIsXG4gICAgICAgICAgICAgICAgcmlnaHQ6IHBhcnNlTXVsdGlwbGljYXRpdmVFeHByZXNzaW9uKClcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gZXhwcjtcbiAgICB9XG5cbiAgICAvLyAxMS43IEJpdHdpc2UgU2hpZnQgT3BlcmF0b3JzXG5cbiAgICBmdW5jdGlvbiBwYXJzZVNoaWZ0RXhwcmVzc2lvbigpIHtcbiAgICAgICAgdmFyIGV4cHIgPSBwYXJzZUFkZGl0aXZlRXhwcmVzc2lvbigpO1xuXG4gICAgICAgIHdoaWxlIChtYXRjaCgnPDwnKSB8fCBtYXRjaCgnPj4nKSB8fCBtYXRjaCgnPj4+JykpIHtcbiAgICAgICAgICAgIGV4cHIgPSB7XG4gICAgICAgICAgICAgICAgdHlwZTogU3ludGF4LkJpbmFyeUV4cHJlc3Npb24sXG4gICAgICAgICAgICAgICAgb3BlcmF0b3I6IGxleCgpLnZhbHVlLFxuICAgICAgICAgICAgICAgIGxlZnQ6IGV4cHIsXG4gICAgICAgICAgICAgICAgcmlnaHQ6IHBhcnNlQWRkaXRpdmVFeHByZXNzaW9uKClcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gZXhwcjtcbiAgICB9XG4gICAgLy8gMTEuOCBSZWxhdGlvbmFsIE9wZXJhdG9yc1xuXG4gICAgZnVuY3Rpb24gcGFyc2VSZWxhdGlvbmFsRXhwcmVzc2lvbigpIHtcbiAgICAgICAgdmFyIGV4cHIsIHByZXZpb3VzQWxsb3dJbjtcblxuICAgICAgICBwcmV2aW91c0FsbG93SW4gPSBzdGF0ZS5hbGxvd0luO1xuICAgICAgICBzdGF0ZS5hbGxvd0luID0gdHJ1ZTtcblxuICAgICAgICBleHByID0gcGFyc2VTaGlmdEV4cHJlc3Npb24oKTtcblxuICAgICAgICB3aGlsZSAobWF0Y2goJzwnKSB8fCBtYXRjaCgnPicpIHx8IG1hdGNoKCc8PScpIHx8IG1hdGNoKCc+PScpIHx8IChwcmV2aW91c0FsbG93SW4gJiYgbWF0Y2hLZXl3b3JkKCdpbicpKSB8fCBtYXRjaEtleXdvcmQoJ2luc3RhbmNlb2YnKSkge1xuICAgICAgICAgICAgZXhwciA9IHtcbiAgICAgICAgICAgICAgICB0eXBlOiBTeW50YXguQmluYXJ5RXhwcmVzc2lvbixcbiAgICAgICAgICAgICAgICBvcGVyYXRvcjogbGV4KCkudmFsdWUsXG4gICAgICAgICAgICAgICAgbGVmdDogZXhwcixcbiAgICAgICAgICAgICAgICByaWdodDogcGFyc2VTaGlmdEV4cHJlc3Npb24oKVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuXG4gICAgICAgIHN0YXRlLmFsbG93SW4gPSBwcmV2aW91c0FsbG93SW47XG4gICAgICAgIHJldHVybiBleHByO1xuICAgIH1cblxuICAgIC8vIDExLjkgRXF1YWxpdHkgT3BlcmF0b3JzXG5cbiAgICBmdW5jdGlvbiBwYXJzZUVxdWFsaXR5RXhwcmVzc2lvbigpIHtcbiAgICAgICAgdmFyIGV4cHIgPSBwYXJzZVJlbGF0aW9uYWxFeHByZXNzaW9uKCk7XG5cbiAgICAgICAgd2hpbGUgKG1hdGNoKCc9PScpIHx8IG1hdGNoKCchPScpIHx8IG1hdGNoKCc9PT0nKSB8fCBtYXRjaCgnIT09JykpIHtcbiAgICAgICAgICAgIGV4cHIgPSB7XG4gICAgICAgICAgICAgICAgdHlwZTogU3ludGF4LkJpbmFyeUV4cHJlc3Npb24sXG4gICAgICAgICAgICAgICAgb3BlcmF0b3I6IGxleCgpLnZhbHVlLFxuICAgICAgICAgICAgICAgIGxlZnQ6IGV4cHIsXG4gICAgICAgICAgICAgICAgcmlnaHQ6IHBhcnNlUmVsYXRpb25hbEV4cHJlc3Npb24oKVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBleHByO1xuICAgIH1cblxuICAgIC8vIDExLjEwIEJpbmFyeSBCaXR3aXNlIE9wZXJhdG9yc1xuXG4gICAgZnVuY3Rpb24gcGFyc2VCaXR3aXNlQU5ERXhwcmVzc2lvbigpIHtcbiAgICAgICAgdmFyIGV4cHIgPSBwYXJzZUVxdWFsaXR5RXhwcmVzc2lvbigpO1xuXG4gICAgICAgIHdoaWxlIChtYXRjaCgnJicpKSB7XG4gICAgICAgICAgICBsZXgoKTtcbiAgICAgICAgICAgIGV4cHIgPSB7XG4gICAgICAgICAgICAgICAgdHlwZTogU3ludGF4LkJpbmFyeUV4cHJlc3Npb24sXG4gICAgICAgICAgICAgICAgb3BlcmF0b3I6ICcmJyxcbiAgICAgICAgICAgICAgICBsZWZ0OiBleHByLFxuICAgICAgICAgICAgICAgIHJpZ2h0OiBwYXJzZUVxdWFsaXR5RXhwcmVzc2lvbigpXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGV4cHI7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcGFyc2VCaXR3aXNlWE9SRXhwcmVzc2lvbigpIHtcbiAgICAgICAgdmFyIGV4cHIgPSBwYXJzZUJpdHdpc2VBTkRFeHByZXNzaW9uKCk7XG5cbiAgICAgICAgd2hpbGUgKG1hdGNoKCdeJykpIHtcbiAgICAgICAgICAgIGxleCgpO1xuICAgICAgICAgICAgZXhwciA9IHtcbiAgICAgICAgICAgICAgICB0eXBlOiBTeW50YXguQmluYXJ5RXhwcmVzc2lvbixcbiAgICAgICAgICAgICAgICBvcGVyYXRvcjogJ14nLFxuICAgICAgICAgICAgICAgIGxlZnQ6IGV4cHIsXG4gICAgICAgICAgICAgICAgcmlnaHQ6IHBhcnNlQml0d2lzZUFOREV4cHJlc3Npb24oKVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBleHByO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHBhcnNlQml0d2lzZU9SRXhwcmVzc2lvbigpIHtcbiAgICAgICAgdmFyIGV4cHIgPSBwYXJzZUJpdHdpc2VYT1JFeHByZXNzaW9uKCk7XG5cbiAgICAgICAgd2hpbGUgKG1hdGNoKCd8JykpIHtcbiAgICAgICAgICAgIGxleCgpO1xuICAgICAgICAgICAgZXhwciA9IHtcbiAgICAgICAgICAgICAgICB0eXBlOiBTeW50YXguQmluYXJ5RXhwcmVzc2lvbixcbiAgICAgICAgICAgICAgICBvcGVyYXRvcjogJ3wnLFxuICAgICAgICAgICAgICAgIGxlZnQ6IGV4cHIsXG4gICAgICAgICAgICAgICAgcmlnaHQ6IHBhcnNlQml0d2lzZVhPUkV4cHJlc3Npb24oKVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBleHByO1xuICAgIH1cblxuICAgIC8vIDExLjExIEJpbmFyeSBMb2dpY2FsIE9wZXJhdG9yc1xuXG4gICAgZnVuY3Rpb24gcGFyc2VMb2dpY2FsQU5ERXhwcmVzc2lvbigpIHtcbiAgICAgICAgdmFyIGV4cHIgPSBwYXJzZUJpdHdpc2VPUkV4cHJlc3Npb24oKTtcblxuICAgICAgICB3aGlsZSAobWF0Y2goJyYmJykpIHtcbiAgICAgICAgICAgIGxleCgpO1xuICAgICAgICAgICAgZXhwciA9IHtcbiAgICAgICAgICAgICAgICB0eXBlOiBTeW50YXguTG9naWNhbEV4cHJlc3Npb24sXG4gICAgICAgICAgICAgICAgb3BlcmF0b3I6ICcmJicsXG4gICAgICAgICAgICAgICAgbGVmdDogZXhwcixcbiAgICAgICAgICAgICAgICByaWdodDogcGFyc2VCaXR3aXNlT1JFeHByZXNzaW9uKClcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gZXhwcjtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBwYXJzZUxvZ2ljYWxPUkV4cHJlc3Npb24oKSB7XG4gICAgICAgIHZhciBleHByID0gcGFyc2VMb2dpY2FsQU5ERXhwcmVzc2lvbigpO1xuXG4gICAgICAgIHdoaWxlIChtYXRjaCgnfHwnKSkge1xuICAgICAgICAgICAgbGV4KCk7XG4gICAgICAgICAgICBleHByID0ge1xuICAgICAgICAgICAgICAgIHR5cGU6IFN5bnRheC5Mb2dpY2FsRXhwcmVzc2lvbixcbiAgICAgICAgICAgICAgICBvcGVyYXRvcjogJ3x8JyxcbiAgICAgICAgICAgICAgICBsZWZ0OiBleHByLFxuICAgICAgICAgICAgICAgIHJpZ2h0OiBwYXJzZUxvZ2ljYWxBTkRFeHByZXNzaW9uKClcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gZXhwcjtcbiAgICB9XG5cbiAgICAvLyAxMS4xMiBDb25kaXRpb25hbCBPcGVyYXRvclxuXG4gICAgZnVuY3Rpb24gcGFyc2VDb25kaXRpb25hbEV4cHJlc3Npb24oKSB7XG4gICAgICAgIHZhciBleHByLCBwcmV2aW91c0FsbG93SW4sIGNvbnNlcXVlbnQ7XG5cbiAgICAgICAgZXhwciA9IHBhcnNlTG9naWNhbE9SRXhwcmVzc2lvbigpO1xuXG4gICAgICAgIGlmIChtYXRjaCgnPycpKSB7XG4gICAgICAgICAgICBsZXgoKTtcbiAgICAgICAgICAgIHByZXZpb3VzQWxsb3dJbiA9IHN0YXRlLmFsbG93SW47XG4gICAgICAgICAgICBzdGF0ZS5hbGxvd0luID0gdHJ1ZTtcbiAgICAgICAgICAgIGNvbnNlcXVlbnQgPSBwYXJzZUFzc2lnbm1lbnRFeHByZXNzaW9uKCk7XG4gICAgICAgICAgICBzdGF0ZS5hbGxvd0luID0gcHJldmlvdXNBbGxvd0luO1xuICAgICAgICAgICAgZXhwZWN0KCc6Jyk7XG5cbiAgICAgICAgICAgIGV4cHIgPSB7XG4gICAgICAgICAgICAgICAgdHlwZTogU3ludGF4LkNvbmRpdGlvbmFsRXhwcmVzc2lvbixcbiAgICAgICAgICAgICAgICB0ZXN0OiBleHByLFxuICAgICAgICAgICAgICAgIGNvbnNlcXVlbnQ6IGNvbnNlcXVlbnQsXG4gICAgICAgICAgICAgICAgYWx0ZXJuYXRlOiBwYXJzZUFzc2lnbm1lbnRFeHByZXNzaW9uKClcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gZXhwcjtcbiAgICB9XG5cbiAgICAvLyAxMS4xMyBBc3NpZ25tZW50IE9wZXJhdG9yc1xuXG4gICAgZnVuY3Rpb24gcGFyc2VBc3NpZ25tZW50RXhwcmVzc2lvbigpIHtcbiAgICAgICAgdmFyIHRva2VuLCBleHByO1xuXG4gICAgICAgIHRva2VuID0gbG9va2FoZWFkKCk7XG4gICAgICAgIGV4cHIgPSBwYXJzZUNvbmRpdGlvbmFsRXhwcmVzc2lvbigpO1xuXG4gICAgICAgIGlmIChtYXRjaEFzc2lnbigpKSB7XG4gICAgICAgICAgICAvLyBMZWZ0SGFuZFNpZGVFeHByZXNzaW9uXG4gICAgICAgICAgICBpZiAoIWlzTGVmdEhhbmRTaWRlKGV4cHIpKSB7XG4gICAgICAgICAgICAgICAgdGhyb3dFcnJvcih7fSwgTWVzc2FnZXMuSW52YWxpZExIU0luQXNzaWdubWVudCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIDExLjEzLjFcbiAgICAgICAgICAgIGlmIChzdHJpY3QgJiYgZXhwci50eXBlID09PSBTeW50YXguSWRlbnRpZmllciAmJiBpc1Jlc3RyaWN0ZWRXb3JkKGV4cHIubmFtZSkpIHtcbiAgICAgICAgICAgICAgICB0aHJvd0Vycm9yVG9sZXJhbnQodG9rZW4sIE1lc3NhZ2VzLlN0cmljdExIU0Fzc2lnbm1lbnQpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBleHByID0ge1xuICAgICAgICAgICAgICAgIHR5cGU6IFN5bnRheC5Bc3NpZ25tZW50RXhwcmVzc2lvbixcbiAgICAgICAgICAgICAgICBvcGVyYXRvcjogbGV4KCkudmFsdWUsXG4gICAgICAgICAgICAgICAgbGVmdDogZXhwcixcbiAgICAgICAgICAgICAgICByaWdodDogcGFyc2VBc3NpZ25tZW50RXhwcmVzc2lvbigpXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGV4cHI7XG4gICAgfVxuXG4gICAgLy8gMTEuMTQgQ29tbWEgT3BlcmF0b3JcblxuICAgIGZ1bmN0aW9uIHBhcnNlRXhwcmVzc2lvbigpIHtcbiAgICAgICAgdmFyIGV4cHIgPSBwYXJzZUFzc2lnbm1lbnRFeHByZXNzaW9uKCk7XG5cbiAgICAgICAgaWYgKG1hdGNoKCcsJykpIHtcbiAgICAgICAgICAgIGV4cHIgPSB7XG4gICAgICAgICAgICAgICAgdHlwZTogU3ludGF4LlNlcXVlbmNlRXhwcmVzc2lvbixcbiAgICAgICAgICAgICAgICBleHByZXNzaW9uczogWyBleHByIF1cbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHdoaWxlIChpbmRleCA8IGxlbmd0aCkge1xuICAgICAgICAgICAgICAgIGlmICghbWF0Y2goJywnKSkge1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgbGV4KCk7XG4gICAgICAgICAgICAgICAgZXhwci5leHByZXNzaW9ucy5wdXNoKHBhcnNlQXNzaWdubWVudEV4cHJlc3Npb24oKSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZXhwcjtcbiAgICB9XG5cbiAgICAvLyAxMi4xIEJsb2NrXG5cbiAgICBmdW5jdGlvbiBwYXJzZVN0YXRlbWVudExpc3QoKSB7XG4gICAgICAgIHZhciBsaXN0ID0gW10sXG4gICAgICAgICAgICBzdGF0ZW1lbnQ7XG5cbiAgICAgICAgd2hpbGUgKGluZGV4IDwgbGVuZ3RoKSB7XG4gICAgICAgICAgICBpZiAobWF0Y2goJ30nKSkge1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgc3RhdGVtZW50ID0gcGFyc2VTb3VyY2VFbGVtZW50KCk7XG4gICAgICAgICAgICBpZiAodHlwZW9mIHN0YXRlbWVudCA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGxpc3QucHVzaChzdGF0ZW1lbnQpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGxpc3Q7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcGFyc2VCbG9jaygpIHtcbiAgICAgICAgdmFyIGJsb2NrO1xuXG4gICAgICAgIGV4cGVjdCgneycpO1xuXG4gICAgICAgIGJsb2NrID0gcGFyc2VTdGF0ZW1lbnRMaXN0KCk7XG5cbiAgICAgICAgZXhwZWN0KCd9Jyk7XG5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHR5cGU6IFN5bnRheC5CbG9ja1N0YXRlbWVudCxcbiAgICAgICAgICAgIGJvZHk6IGJsb2NrXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLy8gMTIuMiBWYXJpYWJsZSBTdGF0ZW1lbnRcblxuICAgIGZ1bmN0aW9uIHBhcnNlVmFyaWFibGVJZGVudGlmaWVyKCkge1xuICAgICAgICB2YXIgdG9rZW4gPSBsZXgoKTtcblxuICAgICAgICBpZiAodG9rZW4udHlwZSAhPT0gVG9rZW4uSWRlbnRpZmllcikge1xuICAgICAgICAgICAgdGhyb3dVbmV4cGVjdGVkKHRva2VuKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB0eXBlOiBTeW50YXguSWRlbnRpZmllcixcbiAgICAgICAgICAgIG5hbWU6IHRva2VuLnZhbHVlXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcGFyc2VWYXJpYWJsZURlY2xhcmF0aW9uKGtpbmQpIHtcbiAgICAgICAgdmFyIGlkID0gcGFyc2VWYXJpYWJsZUlkZW50aWZpZXIoKSxcbiAgICAgICAgICAgIGluaXQgPSBudWxsO1xuXG4gICAgICAgIC8vIDEyLjIuMVxuICAgICAgICBpZiAoc3RyaWN0ICYmIGlzUmVzdHJpY3RlZFdvcmQoaWQubmFtZSkpIHtcbiAgICAgICAgICAgIHRocm93RXJyb3JUb2xlcmFudCh7fSwgTWVzc2FnZXMuU3RyaWN0VmFyTmFtZSk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoa2luZCA9PT0gJ2NvbnN0Jykge1xuICAgICAgICAgICAgZXhwZWN0KCc9Jyk7XG4gICAgICAgICAgICBpbml0ID0gcGFyc2VBc3NpZ25tZW50RXhwcmVzc2lvbigpO1xuICAgICAgICB9IGVsc2UgaWYgKG1hdGNoKCc9JykpIHtcbiAgICAgICAgICAgIGxleCgpO1xuICAgICAgICAgICAgaW5pdCA9IHBhcnNlQXNzaWdubWVudEV4cHJlc3Npb24oKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB0eXBlOiBTeW50YXguVmFyaWFibGVEZWNsYXJhdG9yLFxuICAgICAgICAgICAgaWQ6IGlkLFxuICAgICAgICAgICAgaW5pdDogaW5pdFxuICAgICAgICB9O1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHBhcnNlVmFyaWFibGVEZWNsYXJhdGlvbkxpc3Qoa2luZCkge1xuICAgICAgICB2YXIgbGlzdCA9IFtdO1xuXG4gICAgICAgIGRvIHtcbiAgICAgICAgICAgIGxpc3QucHVzaChwYXJzZVZhcmlhYmxlRGVjbGFyYXRpb24oa2luZCkpO1xuICAgICAgICAgICAgaWYgKCFtYXRjaCgnLCcpKSB7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBsZXgoKTtcbiAgICAgICAgfSB3aGlsZSAoaW5kZXggPCBsZW5ndGgpO1xuXG4gICAgICAgIHJldHVybiBsaXN0O1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHBhcnNlVmFyaWFibGVTdGF0ZW1lbnQoKSB7XG4gICAgICAgIHZhciBkZWNsYXJhdGlvbnM7XG5cbiAgICAgICAgZXhwZWN0S2V5d29yZCgndmFyJyk7XG5cbiAgICAgICAgZGVjbGFyYXRpb25zID0gcGFyc2VWYXJpYWJsZURlY2xhcmF0aW9uTGlzdCgpO1xuXG4gICAgICAgIGNvbnN1bWVTZW1pY29sb24oKTtcblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgdHlwZTogU3ludGF4LlZhcmlhYmxlRGVjbGFyYXRpb24sXG4gICAgICAgICAgICBkZWNsYXJhdGlvbnM6IGRlY2xhcmF0aW9ucyxcbiAgICAgICAgICAgIGtpbmQ6ICd2YXInXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLy8ga2luZCBtYXkgYmUgYGNvbnN0YCBvciBgbGV0YFxuICAgIC8vIEJvdGggYXJlIGV4cGVyaW1lbnRhbCBhbmQgbm90IGluIHRoZSBzcGVjaWZpY2F0aW9uIHlldC5cbiAgICAvLyBzZWUgaHR0cDovL3dpa2kuZWNtYXNjcmlwdC5vcmcvZG9rdS5waHA/aWQ9aGFybW9ueTpjb25zdFxuICAgIC8vIGFuZCBodHRwOi8vd2lraS5lY21hc2NyaXB0Lm9yZy9kb2t1LnBocD9pZD1oYXJtb255OmxldFxuICAgIGZ1bmN0aW9uIHBhcnNlQ29uc3RMZXREZWNsYXJhdGlvbihraW5kKSB7XG4gICAgICAgIHZhciBkZWNsYXJhdGlvbnM7XG5cbiAgICAgICAgZXhwZWN0S2V5d29yZChraW5kKTtcblxuICAgICAgICBkZWNsYXJhdGlvbnMgPSBwYXJzZVZhcmlhYmxlRGVjbGFyYXRpb25MaXN0KGtpbmQpO1xuXG4gICAgICAgIGNvbnN1bWVTZW1pY29sb24oKTtcblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgdHlwZTogU3ludGF4LlZhcmlhYmxlRGVjbGFyYXRpb24sXG4gICAgICAgICAgICBkZWNsYXJhdGlvbnM6IGRlY2xhcmF0aW9ucyxcbiAgICAgICAgICAgIGtpbmQ6IGtpbmRcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvLyAxMi4zIEVtcHR5IFN0YXRlbWVudFxuXG4gICAgZnVuY3Rpb24gcGFyc2VFbXB0eVN0YXRlbWVudCgpIHtcbiAgICAgICAgZXhwZWN0KCc7Jyk7XG5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHR5cGU6IFN5bnRheC5FbXB0eVN0YXRlbWVudFxuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8vIDEyLjQgRXhwcmVzc2lvbiBTdGF0ZW1lbnRcblxuICAgIGZ1bmN0aW9uIHBhcnNlRXhwcmVzc2lvblN0YXRlbWVudCgpIHtcbiAgICAgICAgdmFyIGV4cHIgPSBwYXJzZUV4cHJlc3Npb24oKTtcblxuICAgICAgICBjb25zdW1lU2VtaWNvbG9uKCk7XG5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHR5cGU6IFN5bnRheC5FeHByZXNzaW9uU3RhdGVtZW50LFxuICAgICAgICAgICAgZXhwcmVzc2lvbjogZXhwclxuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8vIDEyLjUgSWYgc3RhdGVtZW50XG5cbiAgICBmdW5jdGlvbiBwYXJzZUlmU3RhdGVtZW50KCkge1xuICAgICAgICB2YXIgdGVzdCwgY29uc2VxdWVudCwgYWx0ZXJuYXRlO1xuXG4gICAgICAgIGV4cGVjdEtleXdvcmQoJ2lmJyk7XG5cbiAgICAgICAgZXhwZWN0KCcoJyk7XG5cbiAgICAgICAgdGVzdCA9IHBhcnNlRXhwcmVzc2lvbigpO1xuXG4gICAgICAgIGV4cGVjdCgnKScpO1xuXG4gICAgICAgIGNvbnNlcXVlbnQgPSBwYXJzZVN0YXRlbWVudCgpO1xuXG4gICAgICAgIGlmIChtYXRjaEtleXdvcmQoJ2Vsc2UnKSkge1xuICAgICAgICAgICAgbGV4KCk7XG4gICAgICAgICAgICBhbHRlcm5hdGUgPSBwYXJzZVN0YXRlbWVudCgpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgYWx0ZXJuYXRlID0gbnVsbDtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB0eXBlOiBTeW50YXguSWZTdGF0ZW1lbnQsXG4gICAgICAgICAgICB0ZXN0OiB0ZXN0LFxuICAgICAgICAgICAgY29uc2VxdWVudDogY29uc2VxdWVudCxcbiAgICAgICAgICAgIGFsdGVybmF0ZTogYWx0ZXJuYXRlXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLy8gMTIuNiBJdGVyYXRpb24gU3RhdGVtZW50c1xuXG4gICAgZnVuY3Rpb24gcGFyc2VEb1doaWxlU3RhdGVtZW50KCkge1xuICAgICAgICB2YXIgYm9keSwgdGVzdCwgb2xkSW5JdGVyYXRpb247XG5cbiAgICAgICAgZXhwZWN0S2V5d29yZCgnZG8nKTtcblxuICAgICAgICBvbGRJbkl0ZXJhdGlvbiA9IHN0YXRlLmluSXRlcmF0aW9uO1xuICAgICAgICBzdGF0ZS5pbkl0ZXJhdGlvbiA9IHRydWU7XG5cbiAgICAgICAgYm9keSA9IHBhcnNlU3RhdGVtZW50KCk7XG5cbiAgICAgICAgc3RhdGUuaW5JdGVyYXRpb24gPSBvbGRJbkl0ZXJhdGlvbjtcblxuICAgICAgICBleHBlY3RLZXl3b3JkKCd3aGlsZScpO1xuXG4gICAgICAgIGV4cGVjdCgnKCcpO1xuXG4gICAgICAgIHRlc3QgPSBwYXJzZUV4cHJlc3Npb24oKTtcblxuICAgICAgICBleHBlY3QoJyknKTtcblxuICAgICAgICBpZiAobWF0Y2goJzsnKSkge1xuICAgICAgICAgICAgbGV4KCk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgdHlwZTogU3ludGF4LkRvV2hpbGVTdGF0ZW1lbnQsXG4gICAgICAgICAgICBib2R5OiBib2R5LFxuICAgICAgICAgICAgdGVzdDogdGVzdFxuICAgICAgICB9O1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHBhcnNlV2hpbGVTdGF0ZW1lbnQoKSB7XG4gICAgICAgIHZhciB0ZXN0LCBib2R5LCBvbGRJbkl0ZXJhdGlvbjtcblxuICAgICAgICBleHBlY3RLZXl3b3JkKCd3aGlsZScpO1xuXG4gICAgICAgIGV4cGVjdCgnKCcpO1xuXG4gICAgICAgIHRlc3QgPSBwYXJzZUV4cHJlc3Npb24oKTtcblxuICAgICAgICBleHBlY3QoJyknKTtcblxuICAgICAgICBvbGRJbkl0ZXJhdGlvbiA9IHN0YXRlLmluSXRlcmF0aW9uO1xuICAgICAgICBzdGF0ZS5pbkl0ZXJhdGlvbiA9IHRydWU7XG5cbiAgICAgICAgYm9keSA9IHBhcnNlU3RhdGVtZW50KCk7XG5cbiAgICAgICAgc3RhdGUuaW5JdGVyYXRpb24gPSBvbGRJbkl0ZXJhdGlvbjtcblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgdHlwZTogU3ludGF4LldoaWxlU3RhdGVtZW50LFxuICAgICAgICAgICAgdGVzdDogdGVzdCxcbiAgICAgICAgICAgIGJvZHk6IGJvZHlcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBwYXJzZUZvclZhcmlhYmxlRGVjbGFyYXRpb24oKSB7XG4gICAgICAgIHZhciB0b2tlbiA9IGxleCgpO1xuXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB0eXBlOiBTeW50YXguVmFyaWFibGVEZWNsYXJhdGlvbixcbiAgICAgICAgICAgIGRlY2xhcmF0aW9uczogcGFyc2VWYXJpYWJsZURlY2xhcmF0aW9uTGlzdCgpLFxuICAgICAgICAgICAga2luZDogdG9rZW4udmFsdWVcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBwYXJzZUZvclN0YXRlbWVudCgpIHtcbiAgICAgICAgdmFyIGluaXQsIHRlc3QsIHVwZGF0ZSwgbGVmdCwgcmlnaHQsIGJvZHksIG9sZEluSXRlcmF0aW9uO1xuXG4gICAgICAgIGluaXQgPSB0ZXN0ID0gdXBkYXRlID0gbnVsbDtcblxuICAgICAgICBleHBlY3RLZXl3b3JkKCdmb3InKTtcblxuICAgICAgICBleHBlY3QoJygnKTtcblxuICAgICAgICBpZiAobWF0Y2goJzsnKSkge1xuICAgICAgICAgICAgbGV4KCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBpZiAobWF0Y2hLZXl3b3JkKCd2YXInKSB8fCBtYXRjaEtleXdvcmQoJ2xldCcpKSB7XG4gICAgICAgICAgICAgICAgc3RhdGUuYWxsb3dJbiA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIGluaXQgPSBwYXJzZUZvclZhcmlhYmxlRGVjbGFyYXRpb24oKTtcbiAgICAgICAgICAgICAgICBzdGF0ZS5hbGxvd0luID0gdHJ1ZTtcblxuICAgICAgICAgICAgICAgIGlmIChpbml0LmRlY2xhcmF0aW9ucy5sZW5ndGggPT09IDEgJiYgbWF0Y2hLZXl3b3JkKCdpbicpKSB7XG4gICAgICAgICAgICAgICAgICAgIGxleCgpO1xuICAgICAgICAgICAgICAgICAgICBsZWZ0ID0gaW5pdDtcbiAgICAgICAgICAgICAgICAgICAgcmlnaHQgPSBwYXJzZUV4cHJlc3Npb24oKTtcbiAgICAgICAgICAgICAgICAgICAgaW5pdCA9IG51bGw7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBzdGF0ZS5hbGxvd0luID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgaW5pdCA9IHBhcnNlRXhwcmVzc2lvbigpO1xuICAgICAgICAgICAgICAgIHN0YXRlLmFsbG93SW4gPSB0cnVlO1xuXG4gICAgICAgICAgICAgICAgaWYgKG1hdGNoS2V5d29yZCgnaW4nKSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBMZWZ0SGFuZFNpZGVFeHByZXNzaW9uXG4gICAgICAgICAgICAgICAgICAgIGlmICghaXNMZWZ0SGFuZFNpZGUoaW5pdCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRocm93RXJyb3Ioe30sIE1lc3NhZ2VzLkludmFsaWRMSFNJbkZvckluKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIGxleCgpO1xuICAgICAgICAgICAgICAgICAgICBsZWZ0ID0gaW5pdDtcbiAgICAgICAgICAgICAgICAgICAgcmlnaHQgPSBwYXJzZUV4cHJlc3Npb24oKTtcbiAgICAgICAgICAgICAgICAgICAgaW5pdCA9IG51bGw7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAodHlwZW9mIGxlZnQgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgZXhwZWN0KCc7Jyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodHlwZW9mIGxlZnQgPT09ICd1bmRlZmluZWQnKSB7XG5cbiAgICAgICAgICAgIGlmICghbWF0Y2goJzsnKSkge1xuICAgICAgICAgICAgICAgIHRlc3QgPSBwYXJzZUV4cHJlc3Npb24oKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGV4cGVjdCgnOycpO1xuXG4gICAgICAgICAgICBpZiAoIW1hdGNoKCcpJykpIHtcbiAgICAgICAgICAgICAgICB1cGRhdGUgPSBwYXJzZUV4cHJlc3Npb24oKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGV4cGVjdCgnKScpO1xuXG4gICAgICAgIG9sZEluSXRlcmF0aW9uID0gc3RhdGUuaW5JdGVyYXRpb247XG4gICAgICAgIHN0YXRlLmluSXRlcmF0aW9uID0gdHJ1ZTtcblxuICAgICAgICBib2R5ID0gcGFyc2VTdGF0ZW1lbnQoKTtcblxuICAgICAgICBzdGF0ZS5pbkl0ZXJhdGlvbiA9IG9sZEluSXRlcmF0aW9uO1xuXG4gICAgICAgIGlmICh0eXBlb2YgbGVmdCA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgdHlwZTogU3ludGF4LkZvclN0YXRlbWVudCxcbiAgICAgICAgICAgICAgICBpbml0OiBpbml0LFxuICAgICAgICAgICAgICAgIHRlc3Q6IHRlc3QsXG4gICAgICAgICAgICAgICAgdXBkYXRlOiB1cGRhdGUsXG4gICAgICAgICAgICAgICAgYm9keTogYm9keVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB0eXBlOiBTeW50YXguRm9ySW5TdGF0ZW1lbnQsXG4gICAgICAgICAgICBsZWZ0OiBsZWZ0LFxuICAgICAgICAgICAgcmlnaHQ6IHJpZ2h0LFxuICAgICAgICAgICAgYm9keTogYm9keSxcbiAgICAgICAgICAgIGVhY2g6IGZhbHNlXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLy8gMTIuNyBUaGUgY29udGludWUgc3RhdGVtZW50XG5cbiAgICBmdW5jdGlvbiBwYXJzZUNvbnRpbnVlU3RhdGVtZW50KCkge1xuICAgICAgICB2YXIgdG9rZW4sIGxhYmVsID0gbnVsbDtcblxuICAgICAgICBleHBlY3RLZXl3b3JkKCdjb250aW51ZScpO1xuXG4gICAgICAgIC8vIE9wdGltaXplIHRoZSBtb3N0IGNvbW1vbiBmb3JtOiAnY29udGludWU7Jy5cbiAgICAgICAgaWYgKHNvdXJjZVtpbmRleF0gPT09ICc7Jykge1xuICAgICAgICAgICAgbGV4KCk7XG5cbiAgICAgICAgICAgIGlmICghc3RhdGUuaW5JdGVyYXRpb24pIHtcbiAgICAgICAgICAgICAgICB0aHJvd0Vycm9yKHt9LCBNZXNzYWdlcy5JbGxlZ2FsQ29udGludWUpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHR5cGU6IFN5bnRheC5Db250aW51ZVN0YXRlbWVudCxcbiAgICAgICAgICAgICAgICBsYWJlbDogbnVsbFxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChwZWVrTGluZVRlcm1pbmF0b3IoKSkge1xuICAgICAgICAgICAgaWYgKCFzdGF0ZS5pbkl0ZXJhdGlvbikge1xuICAgICAgICAgICAgICAgIHRocm93RXJyb3Ioe30sIE1lc3NhZ2VzLklsbGVnYWxDb250aW51ZSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgdHlwZTogU3ludGF4LkNvbnRpbnVlU3RhdGVtZW50LFxuICAgICAgICAgICAgICAgIGxhYmVsOiBudWxsXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG5cbiAgICAgICAgdG9rZW4gPSBsb29rYWhlYWQoKTtcbiAgICAgICAgaWYgKHRva2VuLnR5cGUgPT09IFRva2VuLklkZW50aWZpZXIpIHtcbiAgICAgICAgICAgIGxhYmVsID0gcGFyc2VWYXJpYWJsZUlkZW50aWZpZXIoKTtcblxuICAgICAgICAgICAgaWYgKCFPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwoc3RhdGUubGFiZWxTZXQsIGxhYmVsLm5hbWUpKSB7XG4gICAgICAgICAgICAgICAgdGhyb3dFcnJvcih7fSwgTWVzc2FnZXMuVW5rbm93bkxhYmVsLCBsYWJlbC5uYW1lKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN1bWVTZW1pY29sb24oKTtcblxuICAgICAgICBpZiAobGFiZWwgPT09IG51bGwgJiYgIXN0YXRlLmluSXRlcmF0aW9uKSB7XG4gICAgICAgICAgICB0aHJvd0Vycm9yKHt9LCBNZXNzYWdlcy5JbGxlZ2FsQ29udGludWUpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHR5cGU6IFN5bnRheC5Db250aW51ZVN0YXRlbWVudCxcbiAgICAgICAgICAgIGxhYmVsOiBsYWJlbFxuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8vIDEyLjggVGhlIGJyZWFrIHN0YXRlbWVudFxuXG4gICAgZnVuY3Rpb24gcGFyc2VCcmVha1N0YXRlbWVudCgpIHtcbiAgICAgICAgdmFyIHRva2VuLCBsYWJlbCA9IG51bGw7XG5cbiAgICAgICAgZXhwZWN0S2V5d29yZCgnYnJlYWsnKTtcblxuICAgICAgICAvLyBPcHRpbWl6ZSB0aGUgbW9zdCBjb21tb24gZm9ybTogJ2JyZWFrOycuXG4gICAgICAgIGlmIChzb3VyY2VbaW5kZXhdID09PSAnOycpIHtcbiAgICAgICAgICAgIGxleCgpO1xuXG4gICAgICAgICAgICBpZiAoIShzdGF0ZS5pbkl0ZXJhdGlvbiB8fCBzdGF0ZS5pblN3aXRjaCkpIHtcbiAgICAgICAgICAgICAgICB0aHJvd0Vycm9yKHt9LCBNZXNzYWdlcy5JbGxlZ2FsQnJlYWspO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHR5cGU6IFN5bnRheC5CcmVha1N0YXRlbWVudCxcbiAgICAgICAgICAgICAgICBsYWJlbDogbnVsbFxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChwZWVrTGluZVRlcm1pbmF0b3IoKSkge1xuICAgICAgICAgICAgaWYgKCEoc3RhdGUuaW5JdGVyYXRpb24gfHwgc3RhdGUuaW5Td2l0Y2gpKSB7XG4gICAgICAgICAgICAgICAgdGhyb3dFcnJvcih7fSwgTWVzc2FnZXMuSWxsZWdhbEJyZWFrKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICB0eXBlOiBTeW50YXguQnJlYWtTdGF0ZW1lbnQsXG4gICAgICAgICAgICAgICAgbGFiZWw6IG51bGxcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cblxuICAgICAgICB0b2tlbiA9IGxvb2thaGVhZCgpO1xuICAgICAgICBpZiAodG9rZW4udHlwZSA9PT0gVG9rZW4uSWRlbnRpZmllcikge1xuICAgICAgICAgICAgbGFiZWwgPSBwYXJzZVZhcmlhYmxlSWRlbnRpZmllcigpO1xuXG4gICAgICAgICAgICBpZiAoIU9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChzdGF0ZS5sYWJlbFNldCwgbGFiZWwubmFtZSkpIHtcbiAgICAgICAgICAgICAgICB0aHJvd0Vycm9yKHt9LCBNZXNzYWdlcy5Vbmtub3duTGFiZWwsIGxhYmVsLm5hbWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgY29uc3VtZVNlbWljb2xvbigpO1xuXG4gICAgICAgIGlmIChsYWJlbCA9PT0gbnVsbCAmJiAhKHN0YXRlLmluSXRlcmF0aW9uIHx8IHN0YXRlLmluU3dpdGNoKSkge1xuICAgICAgICAgICAgdGhyb3dFcnJvcih7fSwgTWVzc2FnZXMuSWxsZWdhbEJyZWFrKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB0eXBlOiBTeW50YXguQnJlYWtTdGF0ZW1lbnQsXG4gICAgICAgICAgICBsYWJlbDogbGFiZWxcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvLyAxMi45IFRoZSByZXR1cm4gc3RhdGVtZW50XG5cbiAgICBmdW5jdGlvbiBwYXJzZVJldHVyblN0YXRlbWVudCgpIHtcbiAgICAgICAgdmFyIHRva2VuLCBhcmd1bWVudCA9IG51bGw7XG5cbiAgICAgICAgZXhwZWN0S2V5d29yZCgncmV0dXJuJyk7XG5cbiAgICAgICAgaWYgKCFzdGF0ZS5pbkZ1bmN0aW9uQm9keSkge1xuICAgICAgICAgICAgdGhyb3dFcnJvclRvbGVyYW50KHt9LCBNZXNzYWdlcy5JbGxlZ2FsUmV0dXJuKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vICdyZXR1cm4nIGZvbGxvd2VkIGJ5IGEgc3BhY2UgYW5kIGFuIGlkZW50aWZpZXIgaXMgdmVyeSBjb21tb24uXG4gICAgICAgIGlmIChzb3VyY2VbaW5kZXhdID09PSAnICcpIHtcbiAgICAgICAgICAgIGlmIChpc0lkZW50aWZpZXJTdGFydChzb3VyY2VbaW5kZXggKyAxXSkpIHtcbiAgICAgICAgICAgICAgICBhcmd1bWVudCA9IHBhcnNlRXhwcmVzc2lvbigpO1xuICAgICAgICAgICAgICAgIGNvbnN1bWVTZW1pY29sb24oKTtcbiAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiBTeW50YXguUmV0dXJuU3RhdGVtZW50LFxuICAgICAgICAgICAgICAgICAgICBhcmd1bWVudDogYXJndW1lbnRcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHBlZWtMaW5lVGVybWluYXRvcigpKSB7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHR5cGU6IFN5bnRheC5SZXR1cm5TdGF0ZW1lbnQsXG4gICAgICAgICAgICAgICAgYXJndW1lbnQ6IG51bGxcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIW1hdGNoKCc7JykpIHtcbiAgICAgICAgICAgIHRva2VuID0gbG9va2FoZWFkKCk7XG4gICAgICAgICAgICBpZiAoIW1hdGNoKCd9JykgJiYgdG9rZW4udHlwZSAhPT0gVG9rZW4uRU9GKSB7XG4gICAgICAgICAgICAgICAgYXJndW1lbnQgPSBwYXJzZUV4cHJlc3Npb24oKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN1bWVTZW1pY29sb24oKTtcblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgdHlwZTogU3ludGF4LlJldHVyblN0YXRlbWVudCxcbiAgICAgICAgICAgIGFyZ3VtZW50OiBhcmd1bWVudFxuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8vIDEyLjEwIFRoZSB3aXRoIHN0YXRlbWVudFxuXG4gICAgZnVuY3Rpb24gcGFyc2VXaXRoU3RhdGVtZW50KCkge1xuICAgICAgICB2YXIgb2JqZWN0LCBib2R5O1xuXG4gICAgICAgIGlmIChzdHJpY3QpIHtcbiAgICAgICAgICAgIHRocm93RXJyb3JUb2xlcmFudCh7fSwgTWVzc2FnZXMuU3RyaWN0TW9kZVdpdGgpO1xuICAgICAgICB9XG5cbiAgICAgICAgZXhwZWN0S2V5d29yZCgnd2l0aCcpO1xuXG4gICAgICAgIGV4cGVjdCgnKCcpO1xuXG4gICAgICAgIG9iamVjdCA9IHBhcnNlRXhwcmVzc2lvbigpO1xuXG4gICAgICAgIGV4cGVjdCgnKScpO1xuXG4gICAgICAgIGJvZHkgPSBwYXJzZVN0YXRlbWVudCgpO1xuXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB0eXBlOiBTeW50YXguV2l0aFN0YXRlbWVudCxcbiAgICAgICAgICAgIG9iamVjdDogb2JqZWN0LFxuICAgICAgICAgICAgYm9keTogYm9keVxuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8vIDEyLjEwIFRoZSBzd2l0aCBzdGF0ZW1lbnRcblxuICAgIGZ1bmN0aW9uIHBhcnNlU3dpdGNoQ2FzZSgpIHtcbiAgICAgICAgdmFyIHRlc3QsXG4gICAgICAgICAgICBjb25zZXF1ZW50ID0gW10sXG4gICAgICAgICAgICBzdGF0ZW1lbnQ7XG5cbiAgICAgICAgaWYgKG1hdGNoS2V5d29yZCgnZGVmYXVsdCcpKSB7XG4gICAgICAgICAgICBsZXgoKTtcbiAgICAgICAgICAgIHRlc3QgPSBudWxsO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZXhwZWN0S2V5d29yZCgnY2FzZScpO1xuICAgICAgICAgICAgdGVzdCA9IHBhcnNlRXhwcmVzc2lvbigpO1xuICAgICAgICB9XG4gICAgICAgIGV4cGVjdCgnOicpO1xuXG4gICAgICAgIHdoaWxlIChpbmRleCA8IGxlbmd0aCkge1xuICAgICAgICAgICAgaWYgKG1hdGNoKCd9JykgfHwgbWF0Y2hLZXl3b3JkKCdkZWZhdWx0JykgfHwgbWF0Y2hLZXl3b3JkKCdjYXNlJykpIHtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHN0YXRlbWVudCA9IHBhcnNlU3RhdGVtZW50KCk7XG4gICAgICAgICAgICBpZiAodHlwZW9mIHN0YXRlbWVudCA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbnNlcXVlbnQucHVzaChzdGF0ZW1lbnQpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHR5cGU6IFN5bnRheC5Td2l0Y2hDYXNlLFxuICAgICAgICAgICAgdGVzdDogdGVzdCxcbiAgICAgICAgICAgIGNvbnNlcXVlbnQ6IGNvbnNlcXVlbnRcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBwYXJzZVN3aXRjaFN0YXRlbWVudCgpIHtcbiAgICAgICAgdmFyIGRpc2NyaW1pbmFudCwgY2FzZXMsIGNsYXVzZSwgb2xkSW5Td2l0Y2gsIGRlZmF1bHRGb3VuZDtcblxuICAgICAgICBleHBlY3RLZXl3b3JkKCdzd2l0Y2gnKTtcblxuICAgICAgICBleHBlY3QoJygnKTtcblxuICAgICAgICBkaXNjcmltaW5hbnQgPSBwYXJzZUV4cHJlc3Npb24oKTtcblxuICAgICAgICBleHBlY3QoJyknKTtcblxuICAgICAgICBleHBlY3QoJ3snKTtcblxuICAgICAgICBpZiAobWF0Y2goJ30nKSkge1xuICAgICAgICAgICAgbGV4KCk7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHR5cGU6IFN5bnRheC5Td2l0Y2hTdGF0ZW1lbnQsXG4gICAgICAgICAgICAgICAgZGlzY3JpbWluYW50OiBkaXNjcmltaW5hbnRcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cblxuICAgICAgICBjYXNlcyA9IFtdO1xuXG4gICAgICAgIG9sZEluU3dpdGNoID0gc3RhdGUuaW5Td2l0Y2g7XG4gICAgICAgIHN0YXRlLmluU3dpdGNoID0gdHJ1ZTtcbiAgICAgICAgZGVmYXVsdEZvdW5kID0gZmFsc2U7XG5cbiAgICAgICAgd2hpbGUgKGluZGV4IDwgbGVuZ3RoKSB7XG4gICAgICAgICAgICBpZiAobWF0Y2goJ30nKSkge1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2xhdXNlID0gcGFyc2VTd2l0Y2hDYXNlKCk7XG4gICAgICAgICAgICBpZiAoY2xhdXNlLnRlc3QgPT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICBpZiAoZGVmYXVsdEZvdW5kKSB7XG4gICAgICAgICAgICAgICAgICAgIHRocm93RXJyb3Ioe30sIE1lc3NhZ2VzLk11bHRpcGxlRGVmYXVsdHNJblN3aXRjaCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGRlZmF1bHRGb3VuZCA9IHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjYXNlcy5wdXNoKGNsYXVzZSk7XG4gICAgICAgIH1cblxuICAgICAgICBzdGF0ZS5pblN3aXRjaCA9IG9sZEluU3dpdGNoO1xuXG4gICAgICAgIGV4cGVjdCgnfScpO1xuXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB0eXBlOiBTeW50YXguU3dpdGNoU3RhdGVtZW50LFxuICAgICAgICAgICAgZGlzY3JpbWluYW50OiBkaXNjcmltaW5hbnQsXG4gICAgICAgICAgICBjYXNlczogY2FzZXNcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvLyAxMi4xMyBUaGUgdGhyb3cgc3RhdGVtZW50XG5cbiAgICBmdW5jdGlvbiBwYXJzZVRocm93U3RhdGVtZW50KCkge1xuICAgICAgICB2YXIgYXJndW1lbnQ7XG5cbiAgICAgICAgZXhwZWN0S2V5d29yZCgndGhyb3cnKTtcblxuICAgICAgICBpZiAocGVla0xpbmVUZXJtaW5hdG9yKCkpIHtcbiAgICAgICAgICAgIHRocm93RXJyb3Ioe30sIE1lc3NhZ2VzLk5ld2xpbmVBZnRlclRocm93KTtcbiAgICAgICAgfVxuXG4gICAgICAgIGFyZ3VtZW50ID0gcGFyc2VFeHByZXNzaW9uKCk7XG5cbiAgICAgICAgY29uc3VtZVNlbWljb2xvbigpO1xuXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB0eXBlOiBTeW50YXguVGhyb3dTdGF0ZW1lbnQsXG4gICAgICAgICAgICBhcmd1bWVudDogYXJndW1lbnRcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvLyAxMi4xNCBUaGUgdHJ5IHN0YXRlbWVudFxuXG4gICAgZnVuY3Rpb24gcGFyc2VDYXRjaENsYXVzZSgpIHtcbiAgICAgICAgdmFyIHBhcmFtO1xuXG4gICAgICAgIGV4cGVjdEtleXdvcmQoJ2NhdGNoJyk7XG5cbiAgICAgICAgZXhwZWN0KCcoJyk7XG4gICAgICAgIGlmIChtYXRjaCgnKScpKSB7XG4gICAgICAgICAgICB0aHJvd1VuZXhwZWN0ZWQobG9va2FoZWFkKCkpO1xuICAgICAgICB9XG5cbiAgICAgICAgcGFyYW0gPSBwYXJzZVZhcmlhYmxlSWRlbnRpZmllcigpO1xuICAgICAgICAvLyAxMi4xNC4xXG4gICAgICAgIGlmIChzdHJpY3QgJiYgaXNSZXN0cmljdGVkV29yZChwYXJhbS5uYW1lKSkge1xuICAgICAgICAgICAgdGhyb3dFcnJvclRvbGVyYW50KHt9LCBNZXNzYWdlcy5TdHJpY3RDYXRjaFZhcmlhYmxlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGV4cGVjdCgnKScpO1xuXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB0eXBlOiBTeW50YXguQ2F0Y2hDbGF1c2UsXG4gICAgICAgICAgICBwYXJhbTogcGFyYW0sXG4gICAgICAgICAgICBib2R5OiBwYXJzZUJsb2NrKClcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBwYXJzZVRyeVN0YXRlbWVudCgpIHtcbiAgICAgICAgdmFyIGJsb2NrLCBoYW5kbGVycyA9IFtdLCBmaW5hbGl6ZXIgPSBudWxsO1xuXG4gICAgICAgIGV4cGVjdEtleXdvcmQoJ3RyeScpO1xuXG4gICAgICAgIGJsb2NrID0gcGFyc2VCbG9jaygpO1xuXG4gICAgICAgIGlmIChtYXRjaEtleXdvcmQoJ2NhdGNoJykpIHtcbiAgICAgICAgICAgIGhhbmRsZXJzLnB1c2gocGFyc2VDYXRjaENsYXVzZSgpKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChtYXRjaEtleXdvcmQoJ2ZpbmFsbHknKSkge1xuICAgICAgICAgICAgbGV4KCk7XG4gICAgICAgICAgICBmaW5hbGl6ZXIgPSBwYXJzZUJsb2NrKCk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoaGFuZGxlcnMubGVuZ3RoID09PSAwICYmICFmaW5hbGl6ZXIpIHtcbiAgICAgICAgICAgIHRocm93RXJyb3Ioe30sIE1lc3NhZ2VzLk5vQ2F0Y2hPckZpbmFsbHkpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHR5cGU6IFN5bnRheC5UcnlTdGF0ZW1lbnQsXG4gICAgICAgICAgICBibG9jazogYmxvY2ssXG4gICAgICAgICAgICBndWFyZGVkSGFuZGxlcnM6IFtdLFxuICAgICAgICAgICAgaGFuZGxlcnM6IGhhbmRsZXJzLFxuICAgICAgICAgICAgZmluYWxpemVyOiBmaW5hbGl6ZXJcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvLyAxMi4xNSBUaGUgZGVidWdnZXIgc3RhdGVtZW50XG5cbiAgICBmdW5jdGlvbiBwYXJzZURlYnVnZ2VyU3RhdGVtZW50KCkge1xuICAgICAgICBleHBlY3RLZXl3b3JkKCdkZWJ1Z2dlcicpO1xuXG4gICAgICAgIGNvbnN1bWVTZW1pY29sb24oKTtcblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgdHlwZTogU3ludGF4LkRlYnVnZ2VyU3RhdGVtZW50XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLy8gMTIgU3RhdGVtZW50c1xuXG4gICAgZnVuY3Rpb24gcGFyc2VTdGF0ZW1lbnQoKSB7XG4gICAgICAgIHZhciB0b2tlbiA9IGxvb2thaGVhZCgpLFxuICAgICAgICAgICAgZXhwcixcbiAgICAgICAgICAgIGxhYmVsZWRCb2R5O1xuXG4gICAgICAgIGlmICh0b2tlbi50eXBlID09PSBUb2tlbi5FT0YpIHtcbiAgICAgICAgICAgIHRocm93VW5leHBlY3RlZCh0b2tlbik7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodG9rZW4udHlwZSA9PT0gVG9rZW4uUHVuY3R1YXRvcikge1xuICAgICAgICAgICAgc3dpdGNoICh0b2tlbi52YWx1ZSkge1xuICAgICAgICAgICAgY2FzZSAnOyc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIHBhcnNlRW1wdHlTdGF0ZW1lbnQoKTtcbiAgICAgICAgICAgIGNhc2UgJ3snOlxuICAgICAgICAgICAgICAgIHJldHVybiBwYXJzZUJsb2NrKCk7XG4gICAgICAgICAgICBjYXNlICcoJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gcGFyc2VFeHByZXNzaW9uU3RhdGVtZW50KCk7XG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHRva2VuLnR5cGUgPT09IFRva2VuLktleXdvcmQpIHtcbiAgICAgICAgICAgIHN3aXRjaCAodG9rZW4udmFsdWUpIHtcbiAgICAgICAgICAgIGNhc2UgJ2JyZWFrJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gcGFyc2VCcmVha1N0YXRlbWVudCgpO1xuICAgICAgICAgICAgY2FzZSAnY29udGludWUnOlxuICAgICAgICAgICAgICAgIHJldHVybiBwYXJzZUNvbnRpbnVlU3RhdGVtZW50KCk7XG4gICAgICAgICAgICBjYXNlICdkZWJ1Z2dlcic6XG4gICAgICAgICAgICAgICAgcmV0dXJuIHBhcnNlRGVidWdnZXJTdGF0ZW1lbnQoKTtcbiAgICAgICAgICAgIGNhc2UgJ2RvJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gcGFyc2VEb1doaWxlU3RhdGVtZW50KCk7XG4gICAgICAgICAgICBjYXNlICdmb3InOlxuICAgICAgICAgICAgICAgIHJldHVybiBwYXJzZUZvclN0YXRlbWVudCgpO1xuICAgICAgICAgICAgY2FzZSAnZnVuY3Rpb24nOlxuICAgICAgICAgICAgICAgIHJldHVybiBwYXJzZUZ1bmN0aW9uRGVjbGFyYXRpb24oKTtcbiAgICAgICAgICAgIGNhc2UgJ2lmJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gcGFyc2VJZlN0YXRlbWVudCgpO1xuICAgICAgICAgICAgY2FzZSAncmV0dXJuJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gcGFyc2VSZXR1cm5TdGF0ZW1lbnQoKTtcbiAgICAgICAgICAgIGNhc2UgJ3N3aXRjaCc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIHBhcnNlU3dpdGNoU3RhdGVtZW50KCk7XG4gICAgICAgICAgICBjYXNlICd0aHJvdyc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIHBhcnNlVGhyb3dTdGF0ZW1lbnQoKTtcbiAgICAgICAgICAgIGNhc2UgJ3RyeSc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIHBhcnNlVHJ5U3RhdGVtZW50KCk7XG4gICAgICAgICAgICBjYXNlICd2YXInOlxuICAgICAgICAgICAgICAgIHJldHVybiBwYXJzZVZhcmlhYmxlU3RhdGVtZW50KCk7XG4gICAgICAgICAgICBjYXNlICd3aGlsZSc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIHBhcnNlV2hpbGVTdGF0ZW1lbnQoKTtcbiAgICAgICAgICAgIGNhc2UgJ3dpdGgnOlxuICAgICAgICAgICAgICAgIHJldHVybiBwYXJzZVdpdGhTdGF0ZW1lbnQoKTtcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBleHByID0gcGFyc2VFeHByZXNzaW9uKCk7XG5cbiAgICAgICAgLy8gMTIuMTIgTGFiZWxsZWQgU3RhdGVtZW50c1xuICAgICAgICBpZiAoKGV4cHIudHlwZSA9PT0gU3ludGF4LklkZW50aWZpZXIpICYmIG1hdGNoKCc6JykpIHtcbiAgICAgICAgICAgIGxleCgpO1xuXG4gICAgICAgICAgICBpZiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKHN0YXRlLmxhYmVsU2V0LCBleHByLm5hbWUpKSB7XG4gICAgICAgICAgICAgICAgdGhyb3dFcnJvcih7fSwgTWVzc2FnZXMuUmVkZWNsYXJhdGlvbiwgJ0xhYmVsJywgZXhwci5uYW1lKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgc3RhdGUubGFiZWxTZXRbZXhwci5uYW1lXSA9IHRydWU7XG4gICAgICAgICAgICBsYWJlbGVkQm9keSA9IHBhcnNlU3RhdGVtZW50KCk7XG4gICAgICAgICAgICBkZWxldGUgc3RhdGUubGFiZWxTZXRbZXhwci5uYW1lXTtcblxuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICB0eXBlOiBTeW50YXguTGFiZWxlZFN0YXRlbWVudCxcbiAgICAgICAgICAgICAgICBsYWJlbDogZXhwcixcbiAgICAgICAgICAgICAgICBib2R5OiBsYWJlbGVkQm9keVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN1bWVTZW1pY29sb24oKTtcblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgdHlwZTogU3ludGF4LkV4cHJlc3Npb25TdGF0ZW1lbnQsXG4gICAgICAgICAgICBleHByZXNzaW9uOiBleHByXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLy8gMTMgRnVuY3Rpb24gRGVmaW5pdGlvblxuXG4gICAgZnVuY3Rpb24gcGFyc2VGdW5jdGlvblNvdXJjZUVsZW1lbnRzKCkge1xuICAgICAgICB2YXIgc291cmNlRWxlbWVudCwgc291cmNlRWxlbWVudHMgPSBbXSwgdG9rZW4sIGRpcmVjdGl2ZSwgZmlyc3RSZXN0cmljdGVkLFxuICAgICAgICAgICAgb2xkTGFiZWxTZXQsIG9sZEluSXRlcmF0aW9uLCBvbGRJblN3aXRjaCwgb2xkSW5GdW5jdGlvbkJvZHk7XG5cbiAgICAgICAgZXhwZWN0KCd7Jyk7XG5cbiAgICAgICAgd2hpbGUgKGluZGV4IDwgbGVuZ3RoKSB7XG4gICAgICAgICAgICB0b2tlbiA9IGxvb2thaGVhZCgpO1xuICAgICAgICAgICAgaWYgKHRva2VuLnR5cGUgIT09IFRva2VuLlN0cmluZ0xpdGVyYWwpIHtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgc291cmNlRWxlbWVudCA9IHBhcnNlU291cmNlRWxlbWVudCgpO1xuICAgICAgICAgICAgc291cmNlRWxlbWVudHMucHVzaChzb3VyY2VFbGVtZW50KTtcbiAgICAgICAgICAgIGlmIChzb3VyY2VFbGVtZW50LmV4cHJlc3Npb24udHlwZSAhPT0gU3ludGF4LkxpdGVyYWwpIHtcbiAgICAgICAgICAgICAgICAvLyB0aGlzIGlzIG5vdCBkaXJlY3RpdmVcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGRpcmVjdGl2ZSA9IHNsaWNlU291cmNlKHRva2VuLnJhbmdlWzBdICsgMSwgdG9rZW4ucmFuZ2VbMV0gLSAxKTtcbiAgICAgICAgICAgIGlmIChkaXJlY3RpdmUgPT09ICd1c2Ugc3RyaWN0Jykge1xuICAgICAgICAgICAgICAgIHN0cmljdCA9IHRydWU7XG4gICAgICAgICAgICAgICAgaWYgKGZpcnN0UmVzdHJpY3RlZCkge1xuICAgICAgICAgICAgICAgICAgICB0aHJvd0Vycm9yVG9sZXJhbnQoZmlyc3RSZXN0cmljdGVkLCBNZXNzYWdlcy5TdHJpY3RPY3RhbExpdGVyYWwpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgaWYgKCFmaXJzdFJlc3RyaWN0ZWQgJiYgdG9rZW4ub2N0YWwpIHtcbiAgICAgICAgICAgICAgICAgICAgZmlyc3RSZXN0cmljdGVkID0gdG9rZW47XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgb2xkTGFiZWxTZXQgPSBzdGF0ZS5sYWJlbFNldDtcbiAgICAgICAgb2xkSW5JdGVyYXRpb24gPSBzdGF0ZS5pbkl0ZXJhdGlvbjtcbiAgICAgICAgb2xkSW5Td2l0Y2ggPSBzdGF0ZS5pblN3aXRjaDtcbiAgICAgICAgb2xkSW5GdW5jdGlvbkJvZHkgPSBzdGF0ZS5pbkZ1bmN0aW9uQm9keTtcblxuICAgICAgICBzdGF0ZS5sYWJlbFNldCA9IHt9O1xuICAgICAgICBzdGF0ZS5pbkl0ZXJhdGlvbiA9IGZhbHNlO1xuICAgICAgICBzdGF0ZS5pblN3aXRjaCA9IGZhbHNlO1xuICAgICAgICBzdGF0ZS5pbkZ1bmN0aW9uQm9keSA9IHRydWU7XG5cbiAgICAgICAgd2hpbGUgKGluZGV4IDwgbGVuZ3RoKSB7XG4gICAgICAgICAgICBpZiAobWF0Y2goJ30nKSkge1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgc291cmNlRWxlbWVudCA9IHBhcnNlU291cmNlRWxlbWVudCgpO1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBzb3VyY2VFbGVtZW50ID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgc291cmNlRWxlbWVudHMucHVzaChzb3VyY2VFbGVtZW50KTtcbiAgICAgICAgfVxuXG4gICAgICAgIGV4cGVjdCgnfScpO1xuXG4gICAgICAgIHN0YXRlLmxhYmVsU2V0ID0gb2xkTGFiZWxTZXQ7XG4gICAgICAgIHN0YXRlLmluSXRlcmF0aW9uID0gb2xkSW5JdGVyYXRpb247XG4gICAgICAgIHN0YXRlLmluU3dpdGNoID0gb2xkSW5Td2l0Y2g7XG4gICAgICAgIHN0YXRlLmluRnVuY3Rpb25Cb2R5ID0gb2xkSW5GdW5jdGlvbkJvZHk7XG5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHR5cGU6IFN5bnRheC5CbG9ja1N0YXRlbWVudCxcbiAgICAgICAgICAgIGJvZHk6IHNvdXJjZUVsZW1lbnRzXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcGFyc2VGdW5jdGlvbkRlY2xhcmF0aW9uKCkge1xuICAgICAgICB2YXIgaWQsIHBhcmFtLCBwYXJhbXMgPSBbXSwgYm9keSwgdG9rZW4sIHN0cmljdGVkLCBmaXJzdFJlc3RyaWN0ZWQsIG1lc3NhZ2UsIHByZXZpb3VzU3RyaWN0LCBwYXJhbVNldDtcblxuICAgICAgICBleHBlY3RLZXl3b3JkKCdmdW5jdGlvbicpO1xuICAgICAgICB0b2tlbiA9IGxvb2thaGVhZCgpO1xuICAgICAgICBpZCA9IHBhcnNlVmFyaWFibGVJZGVudGlmaWVyKCk7XG4gICAgICAgIGlmIChzdHJpY3QpIHtcbiAgICAgICAgICAgIGlmIChpc1Jlc3RyaWN0ZWRXb3JkKHRva2VuLnZhbHVlKSkge1xuICAgICAgICAgICAgICAgIHRocm93RXJyb3JUb2xlcmFudCh0b2tlbiwgTWVzc2FnZXMuU3RyaWN0RnVuY3Rpb25OYW1lKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGlmIChpc1Jlc3RyaWN0ZWRXb3JkKHRva2VuLnZhbHVlKSkge1xuICAgICAgICAgICAgICAgIGZpcnN0UmVzdHJpY3RlZCA9IHRva2VuO1xuICAgICAgICAgICAgICAgIG1lc3NhZ2UgPSBNZXNzYWdlcy5TdHJpY3RGdW5jdGlvbk5hbWU7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGlzU3RyaWN0TW9kZVJlc2VydmVkV29yZCh0b2tlbi52YWx1ZSkpIHtcbiAgICAgICAgICAgICAgICBmaXJzdFJlc3RyaWN0ZWQgPSB0b2tlbjtcbiAgICAgICAgICAgICAgICBtZXNzYWdlID0gTWVzc2FnZXMuU3RyaWN0UmVzZXJ2ZWRXb3JkO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgZXhwZWN0KCcoJyk7XG5cbiAgICAgICAgaWYgKCFtYXRjaCgnKScpKSB7XG4gICAgICAgICAgICBwYXJhbVNldCA9IHt9O1xuICAgICAgICAgICAgd2hpbGUgKGluZGV4IDwgbGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgdG9rZW4gPSBsb29rYWhlYWQoKTtcbiAgICAgICAgICAgICAgICBwYXJhbSA9IHBhcnNlVmFyaWFibGVJZGVudGlmaWVyKCk7XG4gICAgICAgICAgICAgICAgaWYgKHN0cmljdCkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoaXNSZXN0cmljdGVkV29yZCh0b2tlbi52YWx1ZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0cmljdGVkID0gdG9rZW47XG4gICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlID0gTWVzc2FnZXMuU3RyaWN0UGFyYW1OYW1lO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwocGFyYW1TZXQsIHRva2VuLnZhbHVlKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgc3RyaWN0ZWQgPSB0b2tlbjtcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UgPSBNZXNzYWdlcy5TdHJpY3RQYXJhbUR1cGU7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKCFmaXJzdFJlc3RyaWN0ZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGlzUmVzdHJpY3RlZFdvcmQodG9rZW4udmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBmaXJzdFJlc3RyaWN0ZWQgPSB0b2tlbjtcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UgPSBNZXNzYWdlcy5TdHJpY3RQYXJhbU5hbWU7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoaXNTdHJpY3RNb2RlUmVzZXJ2ZWRXb3JkKHRva2VuLnZhbHVlKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZmlyc3RSZXN0cmljdGVkID0gdG9rZW47XG4gICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlID0gTWVzc2FnZXMuU3RyaWN0UmVzZXJ2ZWRXb3JkO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChwYXJhbVNldCwgdG9rZW4udmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBmaXJzdFJlc3RyaWN0ZWQgPSB0b2tlbjtcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UgPSBNZXNzYWdlcy5TdHJpY3RQYXJhbUR1cGU7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcGFyYW1zLnB1c2gocGFyYW0pO1xuICAgICAgICAgICAgICAgIHBhcmFtU2V0W3BhcmFtLm5hbWVdID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICBpZiAobWF0Y2goJyknKSkge1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZXhwZWN0KCcsJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBleHBlY3QoJyknKTtcblxuICAgICAgICBwcmV2aW91c1N0cmljdCA9IHN0cmljdDtcbiAgICAgICAgYm9keSA9IHBhcnNlRnVuY3Rpb25Tb3VyY2VFbGVtZW50cygpO1xuICAgICAgICBpZiAoc3RyaWN0ICYmIGZpcnN0UmVzdHJpY3RlZCkge1xuICAgICAgICAgICAgdGhyb3dFcnJvcihmaXJzdFJlc3RyaWN0ZWQsIG1lc3NhZ2UpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChzdHJpY3QgJiYgc3RyaWN0ZWQpIHtcbiAgICAgICAgICAgIHRocm93RXJyb3JUb2xlcmFudChzdHJpY3RlZCwgbWVzc2FnZSk7XG4gICAgICAgIH1cbiAgICAgICAgc3RyaWN0ID0gcHJldmlvdXNTdHJpY3Q7XG5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHR5cGU6IFN5bnRheC5GdW5jdGlvbkRlY2xhcmF0aW9uLFxuICAgICAgICAgICAgaWQ6IGlkLFxuICAgICAgICAgICAgcGFyYW1zOiBwYXJhbXMsXG4gICAgICAgICAgICBkZWZhdWx0czogW10sXG4gICAgICAgICAgICBib2R5OiBib2R5LFxuICAgICAgICAgICAgcmVzdDogbnVsbCxcbiAgICAgICAgICAgIGdlbmVyYXRvcjogZmFsc2UsXG4gICAgICAgICAgICBleHByZXNzaW9uOiBmYWxzZVxuICAgICAgICB9O1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHBhcnNlRnVuY3Rpb25FeHByZXNzaW9uKCkge1xuICAgICAgICB2YXIgdG9rZW4sIGlkID0gbnVsbCwgc3RyaWN0ZWQsIGZpcnN0UmVzdHJpY3RlZCwgbWVzc2FnZSwgcGFyYW0sIHBhcmFtcyA9IFtdLCBib2R5LCBwcmV2aW91c1N0cmljdCwgcGFyYW1TZXQ7XG5cbiAgICAgICAgZXhwZWN0S2V5d29yZCgnZnVuY3Rpb24nKTtcblxuICAgICAgICBpZiAoIW1hdGNoKCcoJykpIHtcbiAgICAgICAgICAgIHRva2VuID0gbG9va2FoZWFkKCk7XG4gICAgICAgICAgICBpZCA9IHBhcnNlVmFyaWFibGVJZGVudGlmaWVyKCk7XG4gICAgICAgICAgICBpZiAoc3RyaWN0KSB7XG4gICAgICAgICAgICAgICAgaWYgKGlzUmVzdHJpY3RlZFdvcmQodG9rZW4udmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgICAgIHRocm93RXJyb3JUb2xlcmFudCh0b2tlbiwgTWVzc2FnZXMuU3RyaWN0RnVuY3Rpb25OYW1lKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGlmIChpc1Jlc3RyaWN0ZWRXb3JkKHRva2VuLnZhbHVlKSkge1xuICAgICAgICAgICAgICAgICAgICBmaXJzdFJlc3RyaWN0ZWQgPSB0b2tlbjtcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZSA9IE1lc3NhZ2VzLlN0cmljdEZ1bmN0aW9uTmFtZTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGlzU3RyaWN0TW9kZVJlc2VydmVkV29yZCh0b2tlbi52YWx1ZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgZmlyc3RSZXN0cmljdGVkID0gdG9rZW47XG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UgPSBNZXNzYWdlcy5TdHJpY3RSZXNlcnZlZFdvcmQ7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgZXhwZWN0KCcoJyk7XG5cbiAgICAgICAgaWYgKCFtYXRjaCgnKScpKSB7XG4gICAgICAgICAgICBwYXJhbVNldCA9IHt9O1xuICAgICAgICAgICAgd2hpbGUgKGluZGV4IDwgbGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgdG9rZW4gPSBsb29rYWhlYWQoKTtcbiAgICAgICAgICAgICAgICBwYXJhbSA9IHBhcnNlVmFyaWFibGVJZGVudGlmaWVyKCk7XG4gICAgICAgICAgICAgICAgaWYgKHN0cmljdCkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoaXNSZXN0cmljdGVkV29yZCh0b2tlbi52YWx1ZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0cmljdGVkID0gdG9rZW47XG4gICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlID0gTWVzc2FnZXMuU3RyaWN0UGFyYW1OYW1lO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwocGFyYW1TZXQsIHRva2VuLnZhbHVlKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgc3RyaWN0ZWQgPSB0b2tlbjtcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UgPSBNZXNzYWdlcy5TdHJpY3RQYXJhbUR1cGU7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKCFmaXJzdFJlc3RyaWN0ZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGlzUmVzdHJpY3RlZFdvcmQodG9rZW4udmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBmaXJzdFJlc3RyaWN0ZWQgPSB0b2tlbjtcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UgPSBNZXNzYWdlcy5TdHJpY3RQYXJhbU5hbWU7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoaXNTdHJpY3RNb2RlUmVzZXJ2ZWRXb3JkKHRva2VuLnZhbHVlKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZmlyc3RSZXN0cmljdGVkID0gdG9rZW47XG4gICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlID0gTWVzc2FnZXMuU3RyaWN0UmVzZXJ2ZWRXb3JkO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChwYXJhbVNldCwgdG9rZW4udmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBmaXJzdFJlc3RyaWN0ZWQgPSB0b2tlbjtcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UgPSBNZXNzYWdlcy5TdHJpY3RQYXJhbUR1cGU7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcGFyYW1zLnB1c2gocGFyYW0pO1xuICAgICAgICAgICAgICAgIHBhcmFtU2V0W3BhcmFtLm5hbWVdID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICBpZiAobWF0Y2goJyknKSkge1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZXhwZWN0KCcsJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBleHBlY3QoJyknKTtcblxuICAgICAgICBwcmV2aW91c1N0cmljdCA9IHN0cmljdDtcbiAgICAgICAgYm9keSA9IHBhcnNlRnVuY3Rpb25Tb3VyY2VFbGVtZW50cygpO1xuICAgICAgICBpZiAoc3RyaWN0ICYmIGZpcnN0UmVzdHJpY3RlZCkge1xuICAgICAgICAgICAgdGhyb3dFcnJvcihmaXJzdFJlc3RyaWN0ZWQsIG1lc3NhZ2UpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChzdHJpY3QgJiYgc3RyaWN0ZWQpIHtcbiAgICAgICAgICAgIHRocm93RXJyb3JUb2xlcmFudChzdHJpY3RlZCwgbWVzc2FnZSk7XG4gICAgICAgIH1cbiAgICAgICAgc3RyaWN0ID0gcHJldmlvdXNTdHJpY3Q7XG5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHR5cGU6IFN5bnRheC5GdW5jdGlvbkV4cHJlc3Npb24sXG4gICAgICAgICAgICBpZDogaWQsXG4gICAgICAgICAgICBwYXJhbXM6IHBhcmFtcyxcbiAgICAgICAgICAgIGRlZmF1bHRzOiBbXSxcbiAgICAgICAgICAgIGJvZHk6IGJvZHksXG4gICAgICAgICAgICByZXN0OiBudWxsLFxuICAgICAgICAgICAgZ2VuZXJhdG9yOiBmYWxzZSxcbiAgICAgICAgICAgIGV4cHJlc3Npb246IGZhbHNlXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLy8gMTQgUHJvZ3JhbVxuXG4gICAgZnVuY3Rpb24gcGFyc2VTb3VyY2VFbGVtZW50KCkge1xuICAgICAgICB2YXIgdG9rZW4gPSBsb29rYWhlYWQoKTtcblxuICAgICAgICBpZiAodG9rZW4udHlwZSA9PT0gVG9rZW4uS2V5d29yZCkge1xuICAgICAgICAgICAgc3dpdGNoICh0b2tlbi52YWx1ZSkge1xuICAgICAgICAgICAgY2FzZSAnY29uc3QnOlxuICAgICAgICAgICAgY2FzZSAnbGV0JzpcbiAgICAgICAgICAgICAgICByZXR1cm4gcGFyc2VDb25zdExldERlY2xhcmF0aW9uKHRva2VuLnZhbHVlKTtcbiAgICAgICAgICAgIGNhc2UgJ2Z1bmN0aW9uJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gcGFyc2VGdW5jdGlvbkRlY2xhcmF0aW9uKCk7XG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgIHJldHVybiBwYXJzZVN0YXRlbWVudCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHRva2VuLnR5cGUgIT09IFRva2VuLkVPRikge1xuICAgICAgICAgICAgcmV0dXJuIHBhcnNlU3RhdGVtZW50KCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBwYXJzZVNvdXJjZUVsZW1lbnRzKCkge1xuICAgICAgICB2YXIgc291cmNlRWxlbWVudCwgc291cmNlRWxlbWVudHMgPSBbXSwgdG9rZW4sIGRpcmVjdGl2ZSwgZmlyc3RSZXN0cmljdGVkO1xuXG4gICAgICAgIHdoaWxlIChpbmRleCA8IGxlbmd0aCkge1xuICAgICAgICAgICAgdG9rZW4gPSBsb29rYWhlYWQoKTtcbiAgICAgICAgICAgIGlmICh0b2tlbi50eXBlICE9PSBUb2tlbi5TdHJpbmdMaXRlcmFsKSB7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHNvdXJjZUVsZW1lbnQgPSBwYXJzZVNvdXJjZUVsZW1lbnQoKTtcbiAgICAgICAgICAgIHNvdXJjZUVsZW1lbnRzLnB1c2goc291cmNlRWxlbWVudCk7XG4gICAgICAgICAgICBpZiAoc291cmNlRWxlbWVudC5leHByZXNzaW9uLnR5cGUgIT09IFN5bnRheC5MaXRlcmFsKSB7XG4gICAgICAgICAgICAgICAgLy8gdGhpcyBpcyBub3QgZGlyZWN0aXZlXG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBkaXJlY3RpdmUgPSBzbGljZVNvdXJjZSh0b2tlbi5yYW5nZVswXSArIDEsIHRva2VuLnJhbmdlWzFdIC0gMSk7XG4gICAgICAgICAgICBpZiAoZGlyZWN0aXZlID09PSAndXNlIHN0cmljdCcpIHtcbiAgICAgICAgICAgICAgICBzdHJpY3QgPSB0cnVlO1xuICAgICAgICAgICAgICAgIGlmIChmaXJzdFJlc3RyaWN0ZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhyb3dFcnJvclRvbGVyYW50KGZpcnN0UmVzdHJpY3RlZCwgTWVzc2FnZXMuU3RyaWN0T2N0YWxMaXRlcmFsKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGlmICghZmlyc3RSZXN0cmljdGVkICYmIHRva2VuLm9jdGFsKSB7XG4gICAgICAgICAgICAgICAgICAgIGZpcnN0UmVzdHJpY3RlZCA9IHRva2VuO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHdoaWxlIChpbmRleCA8IGxlbmd0aCkge1xuICAgICAgICAgICAgc291cmNlRWxlbWVudCA9IHBhcnNlU291cmNlRWxlbWVudCgpO1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBzb3VyY2VFbGVtZW50ID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgc291cmNlRWxlbWVudHMucHVzaChzb3VyY2VFbGVtZW50KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gc291cmNlRWxlbWVudHM7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcGFyc2VQcm9ncmFtKCkge1xuICAgICAgICB2YXIgcHJvZ3JhbTtcbiAgICAgICAgc3RyaWN0ID0gZmFsc2U7XG4gICAgICAgIHByb2dyYW0gPSB7XG4gICAgICAgICAgICB0eXBlOiBTeW50YXguUHJvZ3JhbSxcbiAgICAgICAgICAgIGJvZHk6IHBhcnNlU291cmNlRWxlbWVudHMoKVxuICAgICAgICB9O1xuICAgICAgICByZXR1cm4gcHJvZ3JhbTtcbiAgICB9XG5cbiAgICAvLyBUaGUgZm9sbG93aW5nIGZ1bmN0aW9ucyBhcmUgbmVlZGVkIG9ubHkgd2hlbiB0aGUgb3B0aW9uIHRvIHByZXNlcnZlXG4gICAgLy8gdGhlIGNvbW1lbnRzIGlzIGFjdGl2ZS5cblxuICAgIGZ1bmN0aW9uIGFkZENvbW1lbnQodHlwZSwgdmFsdWUsIHN0YXJ0LCBlbmQsIGxvYykge1xuICAgICAgICBhc3NlcnQodHlwZW9mIHN0YXJ0ID09PSAnbnVtYmVyJywgJ0NvbW1lbnQgbXVzdCBoYXZlIHZhbGlkIHBvc2l0aW9uJyk7XG5cbiAgICAgICAgLy8gQmVjYXVzZSB0aGUgd2F5IHRoZSBhY3R1YWwgdG9rZW4gaXMgc2Nhbm5lZCwgb2Z0ZW4gdGhlIGNvbW1lbnRzXG4gICAgICAgIC8vIChpZiBhbnkpIGFyZSBza2lwcGVkIHR3aWNlIGR1cmluZyB0aGUgbGV4aWNhbCBhbmFseXNpcy5cbiAgICAgICAgLy8gVGh1cywgd2UgbmVlZCB0byBza2lwIGFkZGluZyBhIGNvbW1lbnQgaWYgdGhlIGNvbW1lbnQgYXJyYXkgYWxyZWFkeVxuICAgICAgICAvLyBoYW5kbGVkIGl0LlxuICAgICAgICBpZiAoZXh0cmEuY29tbWVudHMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgaWYgKGV4dHJhLmNvbW1lbnRzW2V4dHJhLmNvbW1lbnRzLmxlbmd0aCAtIDFdLnJhbmdlWzFdID4gc3RhcnQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBleHRyYS5jb21tZW50cy5wdXNoKHtcbiAgICAgICAgICAgIHR5cGU6IHR5cGUsXG4gICAgICAgICAgICB2YWx1ZTogdmFsdWUsXG4gICAgICAgICAgICByYW5nZTogW3N0YXJ0LCBlbmRdLFxuICAgICAgICAgICAgbG9jOiBsb2NcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gc2NhbkNvbW1lbnQoKSB7XG4gICAgICAgIHZhciBjb21tZW50LCBjaCwgbG9jLCBzdGFydCwgYmxvY2tDb21tZW50LCBsaW5lQ29tbWVudDtcblxuICAgICAgICBjb21tZW50ID0gJyc7XG4gICAgICAgIGJsb2NrQ29tbWVudCA9IGZhbHNlO1xuICAgICAgICBsaW5lQ29tbWVudCA9IGZhbHNlO1xuXG4gICAgICAgIHdoaWxlIChpbmRleCA8IGxlbmd0aCkge1xuICAgICAgICAgICAgY2ggPSBzb3VyY2VbaW5kZXhdO1xuXG4gICAgICAgICAgICBpZiAobGluZUNvbW1lbnQpIHtcbiAgICAgICAgICAgICAgICBjaCA9IHNvdXJjZVtpbmRleCsrXTtcbiAgICAgICAgICAgICAgICBpZiAoaXNMaW5lVGVybWluYXRvcihjaCkpIHtcbiAgICAgICAgICAgICAgICAgICAgbG9jLmVuZCA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxpbmU6IGxpbmVOdW1iZXIsXG4gICAgICAgICAgICAgICAgICAgICAgICBjb2x1bW46IGluZGV4IC0gbGluZVN0YXJ0IC0gMVxuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICBsaW5lQ29tbWVudCA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICBhZGRDb21tZW50KCdMaW5lJywgY29tbWVudCwgc3RhcnQsIGluZGV4IC0gMSwgbG9jKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGNoID09PSAnXFxyJyAmJiBzb3VyY2VbaW5kZXhdID09PSAnXFxuJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgKytpbmRleDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICArK2xpbmVOdW1iZXI7XG4gICAgICAgICAgICAgICAgICAgIGxpbmVTdGFydCA9IGluZGV4O1xuICAgICAgICAgICAgICAgICAgICBjb21tZW50ID0gJyc7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChpbmRleCA+PSBsZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgbGluZUNvbW1lbnQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgY29tbWVudCArPSBjaDtcbiAgICAgICAgICAgICAgICAgICAgbG9jLmVuZCA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxpbmU6IGxpbmVOdW1iZXIsXG4gICAgICAgICAgICAgICAgICAgICAgICBjb2x1bW46IGxlbmd0aCAtIGxpbmVTdGFydFxuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICBhZGRDb21tZW50KCdMaW5lJywgY29tbWVudCwgc3RhcnQsIGxlbmd0aCwgbG9jKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBjb21tZW50ICs9IGNoO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSBpZiAoYmxvY2tDb21tZW50KSB7XG4gICAgICAgICAgICAgICAgaWYgKGlzTGluZVRlcm1pbmF0b3IoY2gpKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChjaCA9PT0gJ1xccicgJiYgc291cmNlW2luZGV4ICsgMV0gPT09ICdcXG4nKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICArK2luZGV4O1xuICAgICAgICAgICAgICAgICAgICAgICAgY29tbWVudCArPSAnXFxyXFxuJztcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbW1lbnQgKz0gY2g7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgKytsaW5lTnVtYmVyO1xuICAgICAgICAgICAgICAgICAgICArK2luZGV4O1xuICAgICAgICAgICAgICAgICAgICBsaW5lU3RhcnQgPSBpbmRleDtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGluZGV4ID49IGxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3dFcnJvcih7fSwgTWVzc2FnZXMuVW5leHBlY3RlZFRva2VuLCAnSUxMRUdBTCcpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgY2ggPSBzb3VyY2VbaW5kZXgrK107XG4gICAgICAgICAgICAgICAgICAgIGlmIChpbmRleCA+PSBsZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRocm93RXJyb3Ioe30sIE1lc3NhZ2VzLlVuZXhwZWN0ZWRUb2tlbiwgJ0lMTEVHQUwnKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBjb21tZW50ICs9IGNoO1xuICAgICAgICAgICAgICAgICAgICBpZiAoY2ggPT09ICcqJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgY2ggPSBzb3VyY2VbaW5kZXhdO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGNoID09PSAnLycpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb21tZW50ID0gY29tbWVudC5zdWJzdHIoMCwgY29tbWVudC5sZW5ndGggLSAxKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBibG9ja0NvbW1lbnQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICArK2luZGV4O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxvYy5lbmQgPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxpbmU6IGxpbmVOdW1iZXIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbHVtbjogaW5kZXggLSBsaW5lU3RhcnRcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFkZENvbW1lbnQoJ0Jsb2NrJywgY29tbWVudCwgc3RhcnQsIGluZGV4LCBsb2MpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbW1lbnQgPSAnJztcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSBpZiAoY2ggPT09ICcvJykge1xuICAgICAgICAgICAgICAgIGNoID0gc291cmNlW2luZGV4ICsgMV07XG4gICAgICAgICAgICAgICAgaWYgKGNoID09PSAnLycpIHtcbiAgICAgICAgICAgICAgICAgICAgbG9jID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgc3RhcnQ6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsaW5lOiBsaW5lTnVtYmVyLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbHVtbjogaW5kZXggLSBsaW5lU3RhcnRcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgc3RhcnQgPSBpbmRleDtcbiAgICAgICAgICAgICAgICAgICAgaW5kZXggKz0gMjtcbiAgICAgICAgICAgICAgICAgICAgbGluZUNvbW1lbnQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICBpZiAoaW5kZXggPj0gbGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBsb2MuZW5kID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxpbmU6IGxpbmVOdW1iZXIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29sdW1uOiBpbmRleCAtIGxpbmVTdGFydFxuICAgICAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxpbmVDb21tZW50ID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgICAgICBhZGRDb21tZW50KCdMaW5lJywgY29tbWVudCwgc3RhcnQsIGluZGV4LCBsb2MpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChjaCA9PT0gJyonKSB7XG4gICAgICAgICAgICAgICAgICAgIHN0YXJ0ID0gaW5kZXg7XG4gICAgICAgICAgICAgICAgICAgIGluZGV4ICs9IDI7XG4gICAgICAgICAgICAgICAgICAgIGJsb2NrQ29tbWVudCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIGxvYyA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0YXJ0OiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGluZTogbGluZU51bWJlcixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb2x1bW46IGluZGV4IC0gbGluZVN0YXJ0IC0gMlxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICBpZiAoaW5kZXggPj0gbGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aHJvd0Vycm9yKHt9LCBNZXNzYWdlcy5VbmV4cGVjdGVkVG9rZW4sICdJTExFR0FMJyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGlzV2hpdGVTcGFjZShjaCkpIHtcbiAgICAgICAgICAgICAgICArK2luZGV4O1xuICAgICAgICAgICAgfSBlbHNlIGlmIChpc0xpbmVUZXJtaW5hdG9yKGNoKSkge1xuICAgICAgICAgICAgICAgICsraW5kZXg7XG4gICAgICAgICAgICAgICAgaWYgKGNoID09PSAgJ1xccicgJiYgc291cmNlW2luZGV4XSA9PT0gJ1xcbicpIHtcbiAgICAgICAgICAgICAgICAgICAgKytpbmRleDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgKytsaW5lTnVtYmVyO1xuICAgICAgICAgICAgICAgIGxpbmVTdGFydCA9IGluZGV4O1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGZpbHRlckNvbW1lbnRMb2NhdGlvbigpIHtcbiAgICAgICAgdmFyIGksIGVudHJ5LCBjb21tZW50LCBjb21tZW50cyA9IFtdO1xuXG4gICAgICAgIGZvciAoaSA9IDA7IGkgPCBleHRyYS5jb21tZW50cy5sZW5ndGg7ICsraSkge1xuICAgICAgICAgICAgZW50cnkgPSBleHRyYS5jb21tZW50c1tpXTtcbiAgICAgICAgICAgIGNvbW1lbnQgPSB7XG4gICAgICAgICAgICAgICAgdHlwZTogZW50cnkudHlwZSxcbiAgICAgICAgICAgICAgICB2YWx1ZTogZW50cnkudmFsdWVcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBpZiAoZXh0cmEucmFuZ2UpIHtcbiAgICAgICAgICAgICAgICBjb21tZW50LnJhbmdlID0gZW50cnkucmFuZ2U7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoZXh0cmEubG9jKSB7XG4gICAgICAgICAgICAgICAgY29tbWVudC5sb2MgPSBlbnRyeS5sb2M7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb21tZW50cy5wdXNoKGNvbW1lbnQpO1xuICAgICAgICB9XG5cbiAgICAgICAgZXh0cmEuY29tbWVudHMgPSBjb21tZW50cztcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBjb2xsZWN0VG9rZW4oKSB7XG4gICAgICAgIHZhciBzdGFydCwgbG9jLCB0b2tlbiwgcmFuZ2UsIHZhbHVlO1xuXG4gICAgICAgIHNraXBDb21tZW50KCk7XG4gICAgICAgIHN0YXJ0ID0gaW5kZXg7XG4gICAgICAgIGxvYyA9IHtcbiAgICAgICAgICAgIHN0YXJ0OiB7XG4gICAgICAgICAgICAgICAgbGluZTogbGluZU51bWJlcixcbiAgICAgICAgICAgICAgICBjb2x1bW46IGluZGV4IC0gbGluZVN0YXJ0XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgdG9rZW4gPSBleHRyYS5hZHZhbmNlKCk7XG4gICAgICAgIGxvYy5lbmQgPSB7XG4gICAgICAgICAgICBsaW5lOiBsaW5lTnVtYmVyLFxuICAgICAgICAgICAgY29sdW1uOiBpbmRleCAtIGxpbmVTdGFydFxuICAgICAgICB9O1xuXG4gICAgICAgIGlmICh0b2tlbi50eXBlICE9PSBUb2tlbi5FT0YpIHtcbiAgICAgICAgICAgIHJhbmdlID0gW3Rva2VuLnJhbmdlWzBdLCB0b2tlbi5yYW5nZVsxXV07XG4gICAgICAgICAgICB2YWx1ZSA9IHNsaWNlU291cmNlKHRva2VuLnJhbmdlWzBdLCB0b2tlbi5yYW5nZVsxXSk7XG4gICAgICAgICAgICBleHRyYS50b2tlbnMucHVzaCh7XG4gICAgICAgICAgICAgICAgdHlwZTogVG9rZW5OYW1lW3Rva2VuLnR5cGVdLFxuICAgICAgICAgICAgICAgIHZhbHVlOiB2YWx1ZSxcbiAgICAgICAgICAgICAgICByYW5nZTogcmFuZ2UsXG4gICAgICAgICAgICAgICAgbG9jOiBsb2NcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHRva2VuO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGNvbGxlY3RSZWdleCgpIHtcbiAgICAgICAgdmFyIHBvcywgbG9jLCByZWdleCwgdG9rZW47XG5cbiAgICAgICAgc2tpcENvbW1lbnQoKTtcblxuICAgICAgICBwb3MgPSBpbmRleDtcbiAgICAgICAgbG9jID0ge1xuICAgICAgICAgICAgc3RhcnQ6IHtcbiAgICAgICAgICAgICAgICBsaW5lOiBsaW5lTnVtYmVyLFxuICAgICAgICAgICAgICAgIGNvbHVtbjogaW5kZXggLSBsaW5lU3RhcnRcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICByZWdleCA9IGV4dHJhLnNjYW5SZWdFeHAoKTtcbiAgICAgICAgbG9jLmVuZCA9IHtcbiAgICAgICAgICAgIGxpbmU6IGxpbmVOdW1iZXIsXG4gICAgICAgICAgICBjb2x1bW46IGluZGV4IC0gbGluZVN0YXJ0XG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gUG9wIHRoZSBwcmV2aW91cyB0b2tlbiwgd2hpY2ggaXMgbGlrZWx5ICcvJyBvciAnLz0nXG4gICAgICAgIGlmIChleHRyYS50b2tlbnMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgdG9rZW4gPSBleHRyYS50b2tlbnNbZXh0cmEudG9rZW5zLmxlbmd0aCAtIDFdO1xuICAgICAgICAgICAgaWYgKHRva2VuLnJhbmdlWzBdID09PSBwb3MgJiYgdG9rZW4udHlwZSA9PT0gJ1B1bmN0dWF0b3InKSB7XG4gICAgICAgICAgICAgICAgaWYgKHRva2VuLnZhbHVlID09PSAnLycgfHwgdG9rZW4udmFsdWUgPT09ICcvPScpIHtcbiAgICAgICAgICAgICAgICAgICAgZXh0cmEudG9rZW5zLnBvcCgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGV4dHJhLnRva2Vucy5wdXNoKHtcbiAgICAgICAgICAgIHR5cGU6ICdSZWd1bGFyRXhwcmVzc2lvbicsXG4gICAgICAgICAgICB2YWx1ZTogcmVnZXgubGl0ZXJhbCxcbiAgICAgICAgICAgIHJhbmdlOiBbcG9zLCBpbmRleF0sXG4gICAgICAgICAgICBsb2M6IGxvY1xuICAgICAgICB9KTtcblxuICAgICAgICByZXR1cm4gcmVnZXg7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZmlsdGVyVG9rZW5Mb2NhdGlvbigpIHtcbiAgICAgICAgdmFyIGksIGVudHJ5LCB0b2tlbiwgdG9rZW5zID0gW107XG5cbiAgICAgICAgZm9yIChpID0gMDsgaSA8IGV4dHJhLnRva2Vucy5sZW5ndGg7ICsraSkge1xuICAgICAgICAgICAgZW50cnkgPSBleHRyYS50b2tlbnNbaV07XG4gICAgICAgICAgICB0b2tlbiA9IHtcbiAgICAgICAgICAgICAgICB0eXBlOiBlbnRyeS50eXBlLFxuICAgICAgICAgICAgICAgIHZhbHVlOiBlbnRyeS52YWx1ZVxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIGlmIChleHRyYS5yYW5nZSkge1xuICAgICAgICAgICAgICAgIHRva2VuLnJhbmdlID0gZW50cnkucmFuZ2U7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoZXh0cmEubG9jKSB7XG4gICAgICAgICAgICAgICAgdG9rZW4ubG9jID0gZW50cnkubG9jO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdG9rZW5zLnB1c2godG9rZW4pO1xuICAgICAgICB9XG5cbiAgICAgICAgZXh0cmEudG9rZW5zID0gdG9rZW5zO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGNyZWF0ZUxpdGVyYWwodG9rZW4pIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHR5cGU6IFN5bnRheC5MaXRlcmFsLFxuICAgICAgICAgICAgdmFsdWU6IHRva2VuLnZhbHVlXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gY3JlYXRlUmF3TGl0ZXJhbCh0b2tlbikge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgdHlwZTogU3ludGF4LkxpdGVyYWwsXG4gICAgICAgICAgICB2YWx1ZTogdG9rZW4udmFsdWUsXG4gICAgICAgICAgICByYXc6IHNsaWNlU291cmNlKHRva2VuLnJhbmdlWzBdLCB0b2tlbi5yYW5nZVsxXSlcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBjcmVhdGVMb2NhdGlvbk1hcmtlcigpIHtcbiAgICAgICAgdmFyIG1hcmtlciA9IHt9O1xuXG4gICAgICAgIG1hcmtlci5yYW5nZSA9IFtpbmRleCwgaW5kZXhdO1xuICAgICAgICBtYXJrZXIubG9jID0ge1xuICAgICAgICAgICAgc3RhcnQ6IHtcbiAgICAgICAgICAgICAgICBsaW5lOiBsaW5lTnVtYmVyLFxuICAgICAgICAgICAgICAgIGNvbHVtbjogaW5kZXggLSBsaW5lU3RhcnRcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBlbmQ6IHtcbiAgICAgICAgICAgICAgICBsaW5lOiBsaW5lTnVtYmVyLFxuICAgICAgICAgICAgICAgIGNvbHVtbjogaW5kZXggLSBsaW5lU3RhcnRcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICBtYXJrZXIuZW5kID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdGhpcy5yYW5nZVsxXSA9IGluZGV4O1xuICAgICAgICAgICAgdGhpcy5sb2MuZW5kLmxpbmUgPSBsaW5lTnVtYmVyO1xuICAgICAgICAgICAgdGhpcy5sb2MuZW5kLmNvbHVtbiA9IGluZGV4IC0gbGluZVN0YXJ0O1xuICAgICAgICB9O1xuXG4gICAgICAgIG1hcmtlci5hcHBseUdyb3VwID0gZnVuY3Rpb24gKG5vZGUpIHtcbiAgICAgICAgICAgIGlmIChleHRyYS5yYW5nZSkge1xuICAgICAgICAgICAgICAgIG5vZGUuZ3JvdXBSYW5nZSA9IFt0aGlzLnJhbmdlWzBdLCB0aGlzLnJhbmdlWzFdXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChleHRyYS5sb2MpIHtcbiAgICAgICAgICAgICAgICBub2RlLmdyb3VwTG9jID0ge1xuICAgICAgICAgICAgICAgICAgICBzdGFydDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgbGluZTogdGhpcy5sb2Muc3RhcnQubGluZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbHVtbjogdGhpcy5sb2Muc3RhcnQuY29sdW1uXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIGVuZDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgbGluZTogdGhpcy5sb2MuZW5kLmxpbmUsXG4gICAgICAgICAgICAgICAgICAgICAgICBjb2x1bW46IHRoaXMubG9jLmVuZC5jb2x1bW5cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgbWFya2VyLmFwcGx5ID0gZnVuY3Rpb24gKG5vZGUpIHtcbiAgICAgICAgICAgIGlmIChleHRyYS5yYW5nZSkge1xuICAgICAgICAgICAgICAgIG5vZGUucmFuZ2UgPSBbdGhpcy5yYW5nZVswXSwgdGhpcy5yYW5nZVsxXV07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoZXh0cmEubG9jKSB7XG4gICAgICAgICAgICAgICAgbm9kZS5sb2MgPSB7XG4gICAgICAgICAgICAgICAgICAgIHN0YXJ0OiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBsaW5lOiB0aGlzLmxvYy5zdGFydC5saW5lLFxuICAgICAgICAgICAgICAgICAgICAgICAgY29sdW1uOiB0aGlzLmxvYy5zdGFydC5jb2x1bW5cbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgZW5kOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBsaW5lOiB0aGlzLmxvYy5lbmQubGluZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbHVtbjogdGhpcy5sb2MuZW5kLmNvbHVtblxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICByZXR1cm4gbWFya2VyO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHRyYWNrR3JvdXBFeHByZXNzaW9uKCkge1xuICAgICAgICB2YXIgbWFya2VyLCBleHByO1xuXG4gICAgICAgIHNraXBDb21tZW50KCk7XG4gICAgICAgIG1hcmtlciA9IGNyZWF0ZUxvY2F0aW9uTWFya2VyKCk7XG4gICAgICAgIGV4cGVjdCgnKCcpO1xuXG4gICAgICAgIGV4cHIgPSBwYXJzZUV4cHJlc3Npb24oKTtcblxuICAgICAgICBleHBlY3QoJyknKTtcblxuICAgICAgICBtYXJrZXIuZW5kKCk7XG4gICAgICAgIG1hcmtlci5hcHBseUdyb3VwKGV4cHIpO1xuXG4gICAgICAgIHJldHVybiBleHByO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHRyYWNrTGVmdEhhbmRTaWRlRXhwcmVzc2lvbigpIHtcbiAgICAgICAgdmFyIG1hcmtlciwgZXhwcjtcblxuICAgICAgICBza2lwQ29tbWVudCgpO1xuICAgICAgICBtYXJrZXIgPSBjcmVhdGVMb2NhdGlvbk1hcmtlcigpO1xuXG4gICAgICAgIGV4cHIgPSBtYXRjaEtleXdvcmQoJ25ldycpID8gcGFyc2VOZXdFeHByZXNzaW9uKCkgOiBwYXJzZVByaW1hcnlFeHByZXNzaW9uKCk7XG5cbiAgICAgICAgd2hpbGUgKG1hdGNoKCcuJykgfHwgbWF0Y2goJ1snKSkge1xuICAgICAgICAgICAgaWYgKG1hdGNoKCdbJykpIHtcbiAgICAgICAgICAgICAgICBleHByID0ge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiBTeW50YXguTWVtYmVyRXhwcmVzc2lvbixcbiAgICAgICAgICAgICAgICAgICAgY29tcHV0ZWQ6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIG9iamVjdDogZXhwcixcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydHk6IHBhcnNlQ29tcHV0ZWRNZW1iZXIoKVxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgbWFya2VyLmVuZCgpO1xuICAgICAgICAgICAgICAgIG1hcmtlci5hcHBseShleHByKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgZXhwciA9IHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogU3ludGF4Lk1lbWJlckV4cHJlc3Npb24sXG4gICAgICAgICAgICAgICAgICAgIGNvbXB1dGVkOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgb2JqZWN0OiBleHByLFxuICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0eTogcGFyc2VOb25Db21wdXRlZE1lbWJlcigpXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICBtYXJrZXIuZW5kKCk7XG4gICAgICAgICAgICAgICAgbWFya2VyLmFwcGx5KGV4cHIpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGV4cHI7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gdHJhY2tMZWZ0SGFuZFNpZGVFeHByZXNzaW9uQWxsb3dDYWxsKCkge1xuICAgICAgICB2YXIgbWFya2VyLCBleHByO1xuXG4gICAgICAgIHNraXBDb21tZW50KCk7XG4gICAgICAgIG1hcmtlciA9IGNyZWF0ZUxvY2F0aW9uTWFya2VyKCk7XG5cbiAgICAgICAgZXhwciA9IG1hdGNoS2V5d29yZCgnbmV3JykgPyBwYXJzZU5ld0V4cHJlc3Npb24oKSA6IHBhcnNlUHJpbWFyeUV4cHJlc3Npb24oKTtcblxuICAgICAgICB3aGlsZSAobWF0Y2goJy4nKSB8fCBtYXRjaCgnWycpIHx8IG1hdGNoKCcoJykpIHtcbiAgICAgICAgICAgIGlmIChtYXRjaCgnKCcpKSB7XG4gICAgICAgICAgICAgICAgZXhwciA9IHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogU3ludGF4LkNhbGxFeHByZXNzaW9uLFxuICAgICAgICAgICAgICAgICAgICBjYWxsZWU6IGV4cHIsXG4gICAgICAgICAgICAgICAgICAgICdhcmd1bWVudHMnOiBwYXJzZUFyZ3VtZW50cygpXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICBtYXJrZXIuZW5kKCk7XG4gICAgICAgICAgICAgICAgbWFya2VyLmFwcGx5KGV4cHIpO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChtYXRjaCgnWycpKSB7XG4gICAgICAgICAgICAgICAgZXhwciA9IHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogU3ludGF4Lk1lbWJlckV4cHJlc3Npb24sXG4gICAgICAgICAgICAgICAgICAgIGNvbXB1dGVkOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICBvYmplY3Q6IGV4cHIsXG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnR5OiBwYXJzZUNvbXB1dGVkTWVtYmVyKClcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIG1hcmtlci5lbmQoKTtcbiAgICAgICAgICAgICAgICBtYXJrZXIuYXBwbHkoZXhwcik7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGV4cHIgPSB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IFN5bnRheC5NZW1iZXJFeHByZXNzaW9uLFxuICAgICAgICAgICAgICAgICAgICBjb21wdXRlZDogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgIG9iamVjdDogZXhwcixcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydHk6IHBhcnNlTm9uQ29tcHV0ZWRNZW1iZXIoKVxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgbWFya2VyLmVuZCgpO1xuICAgICAgICAgICAgICAgIG1hcmtlci5hcHBseShleHByKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBleHByO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGZpbHRlckdyb3VwKG5vZGUpIHtcbiAgICAgICAgdmFyIG4sIGksIGVudHJ5O1xuXG4gICAgICAgIG4gPSAoT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5hcHBseShub2RlKSA9PT0gJ1tvYmplY3QgQXJyYXldJykgPyBbXSA6IHt9O1xuICAgICAgICBmb3IgKGkgaW4gbm9kZSkge1xuICAgICAgICAgICAgaWYgKG5vZGUuaGFzT3duUHJvcGVydHkoaSkgJiYgaSAhPT0gJ2dyb3VwUmFuZ2UnICYmIGkgIT09ICdncm91cExvYycpIHtcbiAgICAgICAgICAgICAgICBlbnRyeSA9IG5vZGVbaV07XG4gICAgICAgICAgICAgICAgaWYgKGVudHJ5ID09PSBudWxsIHx8IHR5cGVvZiBlbnRyeSAhPT0gJ29iamVjdCcgfHwgZW50cnkgaW5zdGFuY2VvZiBSZWdFeHApIHtcbiAgICAgICAgICAgICAgICAgICAgbltpXSA9IGVudHJ5O1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIG5baV0gPSBmaWx0ZXJHcm91cChlbnRyeSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBuO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHdyYXBUcmFja2luZ0Z1bmN0aW9uKHJhbmdlLCBsb2MpIHtcblxuICAgICAgICByZXR1cm4gZnVuY3Rpb24gKHBhcnNlRnVuY3Rpb24pIHtcblxuICAgICAgICAgICAgZnVuY3Rpb24gaXNCaW5hcnkobm9kZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBub2RlLnR5cGUgPT09IFN5bnRheC5Mb2dpY2FsRXhwcmVzc2lvbiB8fFxuICAgICAgICAgICAgICAgICAgICBub2RlLnR5cGUgPT09IFN5bnRheC5CaW5hcnlFeHByZXNzaW9uO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBmdW5jdGlvbiB2aXNpdChub2RlKSB7XG4gICAgICAgICAgICAgICAgdmFyIHN0YXJ0LCBlbmQ7XG5cbiAgICAgICAgICAgICAgICBpZiAoaXNCaW5hcnkobm9kZS5sZWZ0KSkge1xuICAgICAgICAgICAgICAgICAgICB2aXNpdChub2RlLmxlZnQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoaXNCaW5hcnkobm9kZS5yaWdodCkpIHtcbiAgICAgICAgICAgICAgICAgICAgdmlzaXQobm9kZS5yaWdodCk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaWYgKHJhbmdlKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChub2RlLmxlZnQuZ3JvdXBSYW5nZSB8fCBub2RlLnJpZ2h0Lmdyb3VwUmFuZ2UpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0YXJ0ID0gbm9kZS5sZWZ0Lmdyb3VwUmFuZ2UgPyBub2RlLmxlZnQuZ3JvdXBSYW5nZVswXSA6IG5vZGUubGVmdC5yYW5nZVswXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGVuZCA9IG5vZGUucmlnaHQuZ3JvdXBSYW5nZSA/IG5vZGUucmlnaHQuZ3JvdXBSYW5nZVsxXSA6IG5vZGUucmlnaHQucmFuZ2VbMV07XG4gICAgICAgICAgICAgICAgICAgICAgICBub2RlLnJhbmdlID0gW3N0YXJ0LCBlbmRdO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHR5cGVvZiBub2RlLnJhbmdlID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgc3RhcnQgPSBub2RlLmxlZnQucmFuZ2VbMF07XG4gICAgICAgICAgICAgICAgICAgICAgICBlbmQgPSBub2RlLnJpZ2h0LnJhbmdlWzFdO1xuICAgICAgICAgICAgICAgICAgICAgICAgbm9kZS5yYW5nZSA9IFtzdGFydCwgZW5kXTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAobG9jKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChub2RlLmxlZnQuZ3JvdXBMb2MgfHwgbm9kZS5yaWdodC5ncm91cExvYykge1xuICAgICAgICAgICAgICAgICAgICAgICAgc3RhcnQgPSBub2RlLmxlZnQuZ3JvdXBMb2MgPyBub2RlLmxlZnQuZ3JvdXBMb2Muc3RhcnQgOiBub2RlLmxlZnQubG9jLnN0YXJ0O1xuICAgICAgICAgICAgICAgICAgICAgICAgZW5kID0gbm9kZS5yaWdodC5ncm91cExvYyA/IG5vZGUucmlnaHQuZ3JvdXBMb2MuZW5kIDogbm9kZS5yaWdodC5sb2MuZW5kO1xuICAgICAgICAgICAgICAgICAgICAgICAgbm9kZS5sb2MgPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RhcnQ6IHN0YXJ0LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVuZDogZW5kXG4gICAgICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHR5cGVvZiBub2RlLmxvYyA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG5vZGUubG9jID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0YXJ0OiBub2RlLmxlZnQubG9jLnN0YXJ0LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVuZDogbm9kZS5yaWdodC5sb2MuZW5kXG4gICAgICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHZhciBtYXJrZXIsIG5vZGU7XG5cbiAgICAgICAgICAgICAgICBza2lwQ29tbWVudCgpO1xuXG4gICAgICAgICAgICAgICAgbWFya2VyID0gY3JlYXRlTG9jYXRpb25NYXJrZXIoKTtcbiAgICAgICAgICAgICAgICBub2RlID0gcGFyc2VGdW5jdGlvbi5hcHBseShudWxsLCBhcmd1bWVudHMpO1xuICAgICAgICAgICAgICAgIG1hcmtlci5lbmQoKTtcblxuICAgICAgICAgICAgICAgIGlmIChyYW5nZSAmJiB0eXBlb2Ygbm9kZS5yYW5nZSA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgICAgICAgbWFya2VyLmFwcGx5KG5vZGUpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGlmIChsb2MgJiYgdHlwZW9mIG5vZGUubG9jID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgICAgICAgICBtYXJrZXIuYXBwbHkobm9kZSk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaWYgKGlzQmluYXJ5KG5vZGUpKSB7XG4gICAgICAgICAgICAgICAgICAgIHZpc2l0KG5vZGUpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHJldHVybiBub2RlO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBwYXRjaCgpIHtcblxuICAgICAgICB2YXIgd3JhcFRyYWNraW5nO1xuXG4gICAgICAgIGlmIChleHRyYS5jb21tZW50cykge1xuICAgICAgICAgICAgZXh0cmEuc2tpcENvbW1lbnQgPSBza2lwQ29tbWVudDtcbiAgICAgICAgICAgIHNraXBDb21tZW50ID0gc2NhbkNvbW1lbnQ7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoZXh0cmEucmF3KSB7XG4gICAgICAgICAgICBleHRyYS5jcmVhdGVMaXRlcmFsID0gY3JlYXRlTGl0ZXJhbDtcbiAgICAgICAgICAgIGNyZWF0ZUxpdGVyYWwgPSBjcmVhdGVSYXdMaXRlcmFsO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGV4dHJhLnJhbmdlIHx8IGV4dHJhLmxvYykge1xuXG4gICAgICAgICAgICBleHRyYS5wYXJzZUdyb3VwRXhwcmVzc2lvbiA9IHBhcnNlR3JvdXBFeHByZXNzaW9uO1xuICAgICAgICAgICAgZXh0cmEucGFyc2VMZWZ0SGFuZFNpZGVFeHByZXNzaW9uID0gcGFyc2VMZWZ0SGFuZFNpZGVFeHByZXNzaW9uO1xuICAgICAgICAgICAgZXh0cmEucGFyc2VMZWZ0SGFuZFNpZGVFeHByZXNzaW9uQWxsb3dDYWxsID0gcGFyc2VMZWZ0SGFuZFNpZGVFeHByZXNzaW9uQWxsb3dDYWxsO1xuICAgICAgICAgICAgcGFyc2VHcm91cEV4cHJlc3Npb24gPSB0cmFja0dyb3VwRXhwcmVzc2lvbjtcbiAgICAgICAgICAgIHBhcnNlTGVmdEhhbmRTaWRlRXhwcmVzc2lvbiA9IHRyYWNrTGVmdEhhbmRTaWRlRXhwcmVzc2lvbjtcbiAgICAgICAgICAgIHBhcnNlTGVmdEhhbmRTaWRlRXhwcmVzc2lvbkFsbG93Q2FsbCA9IHRyYWNrTGVmdEhhbmRTaWRlRXhwcmVzc2lvbkFsbG93Q2FsbDtcblxuICAgICAgICAgICAgd3JhcFRyYWNraW5nID0gd3JhcFRyYWNraW5nRnVuY3Rpb24oZXh0cmEucmFuZ2UsIGV4dHJhLmxvYyk7XG5cbiAgICAgICAgICAgIGV4dHJhLnBhcnNlQWRkaXRpdmVFeHByZXNzaW9uID0gcGFyc2VBZGRpdGl2ZUV4cHJlc3Npb247XG4gICAgICAgICAgICBleHRyYS5wYXJzZUFzc2lnbm1lbnRFeHByZXNzaW9uID0gcGFyc2VBc3NpZ25tZW50RXhwcmVzc2lvbjtcbiAgICAgICAgICAgIGV4dHJhLnBhcnNlQml0d2lzZUFOREV4cHJlc3Npb24gPSBwYXJzZUJpdHdpc2VBTkRFeHByZXNzaW9uO1xuICAgICAgICAgICAgZXh0cmEucGFyc2VCaXR3aXNlT1JFeHByZXNzaW9uID0gcGFyc2VCaXR3aXNlT1JFeHByZXNzaW9uO1xuICAgICAgICAgICAgZXh0cmEucGFyc2VCaXR3aXNlWE9SRXhwcmVzc2lvbiA9IHBhcnNlQml0d2lzZVhPUkV4cHJlc3Npb247XG4gICAgICAgICAgICBleHRyYS5wYXJzZUJsb2NrID0gcGFyc2VCbG9jaztcbiAgICAgICAgICAgIGV4dHJhLnBhcnNlRnVuY3Rpb25Tb3VyY2VFbGVtZW50cyA9IHBhcnNlRnVuY3Rpb25Tb3VyY2VFbGVtZW50cztcbiAgICAgICAgICAgIGV4dHJhLnBhcnNlQ2F0Y2hDbGF1c2UgPSBwYXJzZUNhdGNoQ2xhdXNlO1xuICAgICAgICAgICAgZXh0cmEucGFyc2VDb21wdXRlZE1lbWJlciA9IHBhcnNlQ29tcHV0ZWRNZW1iZXI7XG4gICAgICAgICAgICBleHRyYS5wYXJzZUNvbmRpdGlvbmFsRXhwcmVzc2lvbiA9IHBhcnNlQ29uZGl0aW9uYWxFeHByZXNzaW9uO1xuICAgICAgICAgICAgZXh0cmEucGFyc2VDb25zdExldERlY2xhcmF0aW9uID0gcGFyc2VDb25zdExldERlY2xhcmF0aW9uO1xuICAgICAgICAgICAgZXh0cmEucGFyc2VFcXVhbGl0eUV4cHJlc3Npb24gPSBwYXJzZUVxdWFsaXR5RXhwcmVzc2lvbjtcbiAgICAgICAgICAgIGV4dHJhLnBhcnNlRXhwcmVzc2lvbiA9IHBhcnNlRXhwcmVzc2lvbjtcbiAgICAgICAgICAgIGV4dHJhLnBhcnNlRm9yVmFyaWFibGVEZWNsYXJhdGlvbiA9IHBhcnNlRm9yVmFyaWFibGVEZWNsYXJhdGlvbjtcbiAgICAgICAgICAgIGV4dHJhLnBhcnNlRnVuY3Rpb25EZWNsYXJhdGlvbiA9IHBhcnNlRnVuY3Rpb25EZWNsYXJhdGlvbjtcbiAgICAgICAgICAgIGV4dHJhLnBhcnNlRnVuY3Rpb25FeHByZXNzaW9uID0gcGFyc2VGdW5jdGlvbkV4cHJlc3Npb247XG4gICAgICAgICAgICBleHRyYS5wYXJzZUxvZ2ljYWxBTkRFeHByZXNzaW9uID0gcGFyc2VMb2dpY2FsQU5ERXhwcmVzc2lvbjtcbiAgICAgICAgICAgIGV4dHJhLnBhcnNlTG9naWNhbE9SRXhwcmVzc2lvbiA9IHBhcnNlTG9naWNhbE9SRXhwcmVzc2lvbjtcbiAgICAgICAgICAgIGV4dHJhLnBhcnNlTXVsdGlwbGljYXRpdmVFeHByZXNzaW9uID0gcGFyc2VNdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb247XG4gICAgICAgICAgICBleHRyYS5wYXJzZU5ld0V4cHJlc3Npb24gPSBwYXJzZU5ld0V4cHJlc3Npb247XG4gICAgICAgICAgICBleHRyYS5wYXJzZU5vbkNvbXB1dGVkUHJvcGVydHkgPSBwYXJzZU5vbkNvbXB1dGVkUHJvcGVydHk7XG4gICAgICAgICAgICBleHRyYS5wYXJzZU9iamVjdFByb3BlcnR5ID0gcGFyc2VPYmplY3RQcm9wZXJ0eTtcbiAgICAgICAgICAgIGV4dHJhLnBhcnNlT2JqZWN0UHJvcGVydHlLZXkgPSBwYXJzZU9iamVjdFByb3BlcnR5S2V5O1xuICAgICAgICAgICAgZXh0cmEucGFyc2VQb3N0Zml4RXhwcmVzc2lvbiA9IHBhcnNlUG9zdGZpeEV4cHJlc3Npb247XG4gICAgICAgICAgICBleHRyYS5wYXJzZVByaW1hcnlFeHByZXNzaW9uID0gcGFyc2VQcmltYXJ5RXhwcmVzc2lvbjtcbiAgICAgICAgICAgIGV4dHJhLnBhcnNlUHJvZ3JhbSA9IHBhcnNlUHJvZ3JhbTtcbiAgICAgICAgICAgIGV4dHJhLnBhcnNlUHJvcGVydHlGdW5jdGlvbiA9IHBhcnNlUHJvcGVydHlGdW5jdGlvbjtcbiAgICAgICAgICAgIGV4dHJhLnBhcnNlUmVsYXRpb25hbEV4cHJlc3Npb24gPSBwYXJzZVJlbGF0aW9uYWxFeHByZXNzaW9uO1xuICAgICAgICAgICAgZXh0cmEucGFyc2VTdGF0ZW1lbnQgPSBwYXJzZVN0YXRlbWVudDtcbiAgICAgICAgICAgIGV4dHJhLnBhcnNlU2hpZnRFeHByZXNzaW9uID0gcGFyc2VTaGlmdEV4cHJlc3Npb247XG4gICAgICAgICAgICBleHRyYS5wYXJzZVN3aXRjaENhc2UgPSBwYXJzZVN3aXRjaENhc2U7XG4gICAgICAgICAgICBleHRyYS5wYXJzZVVuYXJ5RXhwcmVzc2lvbiA9IHBhcnNlVW5hcnlFeHByZXNzaW9uO1xuICAgICAgICAgICAgZXh0cmEucGFyc2VWYXJpYWJsZURlY2xhcmF0aW9uID0gcGFyc2VWYXJpYWJsZURlY2xhcmF0aW9uO1xuICAgICAgICAgICAgZXh0cmEucGFyc2VWYXJpYWJsZUlkZW50aWZpZXIgPSBwYXJzZVZhcmlhYmxlSWRlbnRpZmllcjtcblxuICAgICAgICAgICAgcGFyc2VBZGRpdGl2ZUV4cHJlc3Npb24gPSB3cmFwVHJhY2tpbmcoZXh0cmEucGFyc2VBZGRpdGl2ZUV4cHJlc3Npb24pO1xuICAgICAgICAgICAgcGFyc2VBc3NpZ25tZW50RXhwcmVzc2lvbiA9IHdyYXBUcmFja2luZyhleHRyYS5wYXJzZUFzc2lnbm1lbnRFeHByZXNzaW9uKTtcbiAgICAgICAgICAgIHBhcnNlQml0d2lzZUFOREV4cHJlc3Npb24gPSB3cmFwVHJhY2tpbmcoZXh0cmEucGFyc2VCaXR3aXNlQU5ERXhwcmVzc2lvbik7XG4gICAgICAgICAgICBwYXJzZUJpdHdpc2VPUkV4cHJlc3Npb24gPSB3cmFwVHJhY2tpbmcoZXh0cmEucGFyc2VCaXR3aXNlT1JFeHByZXNzaW9uKTtcbiAgICAgICAgICAgIHBhcnNlQml0d2lzZVhPUkV4cHJlc3Npb24gPSB3cmFwVHJhY2tpbmcoZXh0cmEucGFyc2VCaXR3aXNlWE9SRXhwcmVzc2lvbik7XG4gICAgICAgICAgICBwYXJzZUJsb2NrID0gd3JhcFRyYWNraW5nKGV4dHJhLnBhcnNlQmxvY2spO1xuICAgICAgICAgICAgcGFyc2VGdW5jdGlvblNvdXJjZUVsZW1lbnRzID0gd3JhcFRyYWNraW5nKGV4dHJhLnBhcnNlRnVuY3Rpb25Tb3VyY2VFbGVtZW50cyk7XG4gICAgICAgICAgICBwYXJzZUNhdGNoQ2xhdXNlID0gd3JhcFRyYWNraW5nKGV4dHJhLnBhcnNlQ2F0Y2hDbGF1c2UpO1xuICAgICAgICAgICAgcGFyc2VDb21wdXRlZE1lbWJlciA9IHdyYXBUcmFja2luZyhleHRyYS5wYXJzZUNvbXB1dGVkTWVtYmVyKTtcbiAgICAgICAgICAgIHBhcnNlQ29uZGl0aW9uYWxFeHByZXNzaW9uID0gd3JhcFRyYWNraW5nKGV4dHJhLnBhcnNlQ29uZGl0aW9uYWxFeHByZXNzaW9uKTtcbiAgICAgICAgICAgIHBhcnNlQ29uc3RMZXREZWNsYXJhdGlvbiA9IHdyYXBUcmFja2luZyhleHRyYS5wYXJzZUNvbnN0TGV0RGVjbGFyYXRpb24pO1xuICAgICAgICAgICAgcGFyc2VFcXVhbGl0eUV4cHJlc3Npb24gPSB3cmFwVHJhY2tpbmcoZXh0cmEucGFyc2VFcXVhbGl0eUV4cHJlc3Npb24pO1xuICAgICAgICAgICAgcGFyc2VFeHByZXNzaW9uID0gd3JhcFRyYWNraW5nKGV4dHJhLnBhcnNlRXhwcmVzc2lvbik7XG4gICAgICAgICAgICBwYXJzZUZvclZhcmlhYmxlRGVjbGFyYXRpb24gPSB3cmFwVHJhY2tpbmcoZXh0cmEucGFyc2VGb3JWYXJpYWJsZURlY2xhcmF0aW9uKTtcbiAgICAgICAgICAgIHBhcnNlRnVuY3Rpb25EZWNsYXJhdGlvbiA9IHdyYXBUcmFja2luZyhleHRyYS5wYXJzZUZ1bmN0aW9uRGVjbGFyYXRpb24pO1xuICAgICAgICAgICAgcGFyc2VGdW5jdGlvbkV4cHJlc3Npb24gPSB3cmFwVHJhY2tpbmcoZXh0cmEucGFyc2VGdW5jdGlvbkV4cHJlc3Npb24pO1xuICAgICAgICAgICAgcGFyc2VMZWZ0SGFuZFNpZGVFeHByZXNzaW9uID0gd3JhcFRyYWNraW5nKHBhcnNlTGVmdEhhbmRTaWRlRXhwcmVzc2lvbik7XG4gICAgICAgICAgICBwYXJzZUxvZ2ljYWxBTkRFeHByZXNzaW9uID0gd3JhcFRyYWNraW5nKGV4dHJhLnBhcnNlTG9naWNhbEFOREV4cHJlc3Npb24pO1xuICAgICAgICAgICAgcGFyc2VMb2dpY2FsT1JFeHByZXNzaW9uID0gd3JhcFRyYWNraW5nKGV4dHJhLnBhcnNlTG9naWNhbE9SRXhwcmVzc2lvbik7XG4gICAgICAgICAgICBwYXJzZU11bHRpcGxpY2F0aXZlRXhwcmVzc2lvbiA9IHdyYXBUcmFja2luZyhleHRyYS5wYXJzZU11bHRpcGxpY2F0aXZlRXhwcmVzc2lvbik7XG4gICAgICAgICAgICBwYXJzZU5ld0V4cHJlc3Npb24gPSB3cmFwVHJhY2tpbmcoZXh0cmEucGFyc2VOZXdFeHByZXNzaW9uKTtcbiAgICAgICAgICAgIHBhcnNlTm9uQ29tcHV0ZWRQcm9wZXJ0eSA9IHdyYXBUcmFja2luZyhleHRyYS5wYXJzZU5vbkNvbXB1dGVkUHJvcGVydHkpO1xuICAgICAgICAgICAgcGFyc2VPYmplY3RQcm9wZXJ0eSA9IHdyYXBUcmFja2luZyhleHRyYS5wYXJzZU9iamVjdFByb3BlcnR5KTtcbiAgICAgICAgICAgIHBhcnNlT2JqZWN0UHJvcGVydHlLZXkgPSB3cmFwVHJhY2tpbmcoZXh0cmEucGFyc2VPYmplY3RQcm9wZXJ0eUtleSk7XG4gICAgICAgICAgICBwYXJzZVBvc3RmaXhFeHByZXNzaW9uID0gd3JhcFRyYWNraW5nKGV4dHJhLnBhcnNlUG9zdGZpeEV4cHJlc3Npb24pO1xuICAgICAgICAgICAgcGFyc2VQcmltYXJ5RXhwcmVzc2lvbiA9IHdyYXBUcmFja2luZyhleHRyYS5wYXJzZVByaW1hcnlFeHByZXNzaW9uKTtcbiAgICAgICAgICAgIHBhcnNlUHJvZ3JhbSA9IHdyYXBUcmFja2luZyhleHRyYS5wYXJzZVByb2dyYW0pO1xuICAgICAgICAgICAgcGFyc2VQcm9wZXJ0eUZ1bmN0aW9uID0gd3JhcFRyYWNraW5nKGV4dHJhLnBhcnNlUHJvcGVydHlGdW5jdGlvbik7XG4gICAgICAgICAgICBwYXJzZVJlbGF0aW9uYWxFeHByZXNzaW9uID0gd3JhcFRyYWNraW5nKGV4dHJhLnBhcnNlUmVsYXRpb25hbEV4cHJlc3Npb24pO1xuICAgICAgICAgICAgcGFyc2VTdGF0ZW1lbnQgPSB3cmFwVHJhY2tpbmcoZXh0cmEucGFyc2VTdGF0ZW1lbnQpO1xuICAgICAgICAgICAgcGFyc2VTaGlmdEV4cHJlc3Npb24gPSB3cmFwVHJhY2tpbmcoZXh0cmEucGFyc2VTaGlmdEV4cHJlc3Npb24pO1xuICAgICAgICAgICAgcGFyc2VTd2l0Y2hDYXNlID0gd3JhcFRyYWNraW5nKGV4dHJhLnBhcnNlU3dpdGNoQ2FzZSk7XG4gICAgICAgICAgICBwYXJzZVVuYXJ5RXhwcmVzc2lvbiA9IHdyYXBUcmFja2luZyhleHRyYS5wYXJzZVVuYXJ5RXhwcmVzc2lvbik7XG4gICAgICAgICAgICBwYXJzZVZhcmlhYmxlRGVjbGFyYXRpb24gPSB3cmFwVHJhY2tpbmcoZXh0cmEucGFyc2VWYXJpYWJsZURlY2xhcmF0aW9uKTtcbiAgICAgICAgICAgIHBhcnNlVmFyaWFibGVJZGVudGlmaWVyID0gd3JhcFRyYWNraW5nKGV4dHJhLnBhcnNlVmFyaWFibGVJZGVudGlmaWVyKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0eXBlb2YgZXh0cmEudG9rZW5zICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgZXh0cmEuYWR2YW5jZSA9IGFkdmFuY2U7XG4gICAgICAgICAgICBleHRyYS5zY2FuUmVnRXhwID0gc2NhblJlZ0V4cDtcblxuICAgICAgICAgICAgYWR2YW5jZSA9IGNvbGxlY3RUb2tlbjtcbiAgICAgICAgICAgIHNjYW5SZWdFeHAgPSBjb2xsZWN0UmVnZXg7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiB1bnBhdGNoKCkge1xuICAgICAgICBpZiAodHlwZW9mIGV4dHJhLnNraXBDb21tZW50ID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICBza2lwQ29tbWVudCA9IGV4dHJhLnNraXBDb21tZW50O1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGV4dHJhLnJhdykge1xuICAgICAgICAgICAgY3JlYXRlTGl0ZXJhbCA9IGV4dHJhLmNyZWF0ZUxpdGVyYWw7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoZXh0cmEucmFuZ2UgfHwgZXh0cmEubG9jKSB7XG4gICAgICAgICAgICBwYXJzZUFkZGl0aXZlRXhwcmVzc2lvbiA9IGV4dHJhLnBhcnNlQWRkaXRpdmVFeHByZXNzaW9uO1xuICAgICAgICAgICAgcGFyc2VBc3NpZ25tZW50RXhwcmVzc2lvbiA9IGV4dHJhLnBhcnNlQXNzaWdubWVudEV4cHJlc3Npb247XG4gICAgICAgICAgICBwYXJzZUJpdHdpc2VBTkRFeHByZXNzaW9uID0gZXh0cmEucGFyc2VCaXR3aXNlQU5ERXhwcmVzc2lvbjtcbiAgICAgICAgICAgIHBhcnNlQml0d2lzZU9SRXhwcmVzc2lvbiA9IGV4dHJhLnBhcnNlQml0d2lzZU9SRXhwcmVzc2lvbjtcbiAgICAgICAgICAgIHBhcnNlQml0d2lzZVhPUkV4cHJlc3Npb24gPSBleHRyYS5wYXJzZUJpdHdpc2VYT1JFeHByZXNzaW9uO1xuICAgICAgICAgICAgcGFyc2VCbG9jayA9IGV4dHJhLnBhcnNlQmxvY2s7XG4gICAgICAgICAgICBwYXJzZUZ1bmN0aW9uU291cmNlRWxlbWVudHMgPSBleHRyYS5wYXJzZUZ1bmN0aW9uU291cmNlRWxlbWVudHM7XG4gICAgICAgICAgICBwYXJzZUNhdGNoQ2xhdXNlID0gZXh0cmEucGFyc2VDYXRjaENsYXVzZTtcbiAgICAgICAgICAgIHBhcnNlQ29tcHV0ZWRNZW1iZXIgPSBleHRyYS5wYXJzZUNvbXB1dGVkTWVtYmVyO1xuICAgICAgICAgICAgcGFyc2VDb25kaXRpb25hbEV4cHJlc3Npb24gPSBleHRyYS5wYXJzZUNvbmRpdGlvbmFsRXhwcmVzc2lvbjtcbiAgICAgICAgICAgIHBhcnNlQ29uc3RMZXREZWNsYXJhdGlvbiA9IGV4dHJhLnBhcnNlQ29uc3RMZXREZWNsYXJhdGlvbjtcbiAgICAgICAgICAgIHBhcnNlRXF1YWxpdHlFeHByZXNzaW9uID0gZXh0cmEucGFyc2VFcXVhbGl0eUV4cHJlc3Npb247XG4gICAgICAgICAgICBwYXJzZUV4cHJlc3Npb24gPSBleHRyYS5wYXJzZUV4cHJlc3Npb247XG4gICAgICAgICAgICBwYXJzZUZvclZhcmlhYmxlRGVjbGFyYXRpb24gPSBleHRyYS5wYXJzZUZvclZhcmlhYmxlRGVjbGFyYXRpb247XG4gICAgICAgICAgICBwYXJzZUZ1bmN0aW9uRGVjbGFyYXRpb24gPSBleHRyYS5wYXJzZUZ1bmN0aW9uRGVjbGFyYXRpb247XG4gICAgICAgICAgICBwYXJzZUZ1bmN0aW9uRXhwcmVzc2lvbiA9IGV4dHJhLnBhcnNlRnVuY3Rpb25FeHByZXNzaW9uO1xuICAgICAgICAgICAgcGFyc2VHcm91cEV4cHJlc3Npb24gPSBleHRyYS5wYXJzZUdyb3VwRXhwcmVzc2lvbjtcbiAgICAgICAgICAgIHBhcnNlTGVmdEhhbmRTaWRlRXhwcmVzc2lvbiA9IGV4dHJhLnBhcnNlTGVmdEhhbmRTaWRlRXhwcmVzc2lvbjtcbiAgICAgICAgICAgIHBhcnNlTGVmdEhhbmRTaWRlRXhwcmVzc2lvbkFsbG93Q2FsbCA9IGV4dHJhLnBhcnNlTGVmdEhhbmRTaWRlRXhwcmVzc2lvbkFsbG93Q2FsbDtcbiAgICAgICAgICAgIHBhcnNlTG9naWNhbEFOREV4cHJlc3Npb24gPSBleHRyYS5wYXJzZUxvZ2ljYWxBTkRFeHByZXNzaW9uO1xuICAgICAgICAgICAgcGFyc2VMb2dpY2FsT1JFeHByZXNzaW9uID0gZXh0cmEucGFyc2VMb2dpY2FsT1JFeHByZXNzaW9uO1xuICAgICAgICAgICAgcGFyc2VNdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb24gPSBleHRyYS5wYXJzZU11bHRpcGxpY2F0aXZlRXhwcmVzc2lvbjtcbiAgICAgICAgICAgIHBhcnNlTmV3RXhwcmVzc2lvbiA9IGV4dHJhLnBhcnNlTmV3RXhwcmVzc2lvbjtcbiAgICAgICAgICAgIHBhcnNlTm9uQ29tcHV0ZWRQcm9wZXJ0eSA9IGV4dHJhLnBhcnNlTm9uQ29tcHV0ZWRQcm9wZXJ0eTtcbiAgICAgICAgICAgIHBhcnNlT2JqZWN0UHJvcGVydHkgPSBleHRyYS5wYXJzZU9iamVjdFByb3BlcnR5O1xuICAgICAgICAgICAgcGFyc2VPYmplY3RQcm9wZXJ0eUtleSA9IGV4dHJhLnBhcnNlT2JqZWN0UHJvcGVydHlLZXk7XG4gICAgICAgICAgICBwYXJzZVByaW1hcnlFeHByZXNzaW9uID0gZXh0cmEucGFyc2VQcmltYXJ5RXhwcmVzc2lvbjtcbiAgICAgICAgICAgIHBhcnNlUG9zdGZpeEV4cHJlc3Npb24gPSBleHRyYS5wYXJzZVBvc3RmaXhFeHByZXNzaW9uO1xuICAgICAgICAgICAgcGFyc2VQcm9ncmFtID0gZXh0cmEucGFyc2VQcm9ncmFtO1xuICAgICAgICAgICAgcGFyc2VQcm9wZXJ0eUZ1bmN0aW9uID0gZXh0cmEucGFyc2VQcm9wZXJ0eUZ1bmN0aW9uO1xuICAgICAgICAgICAgcGFyc2VSZWxhdGlvbmFsRXhwcmVzc2lvbiA9IGV4dHJhLnBhcnNlUmVsYXRpb25hbEV4cHJlc3Npb247XG4gICAgICAgICAgICBwYXJzZVN0YXRlbWVudCA9IGV4dHJhLnBhcnNlU3RhdGVtZW50O1xuICAgICAgICAgICAgcGFyc2VTaGlmdEV4cHJlc3Npb24gPSBleHRyYS5wYXJzZVNoaWZ0RXhwcmVzc2lvbjtcbiAgICAgICAgICAgIHBhcnNlU3dpdGNoQ2FzZSA9IGV4dHJhLnBhcnNlU3dpdGNoQ2FzZTtcbiAgICAgICAgICAgIHBhcnNlVW5hcnlFeHByZXNzaW9uID0gZXh0cmEucGFyc2VVbmFyeUV4cHJlc3Npb247XG4gICAgICAgICAgICBwYXJzZVZhcmlhYmxlRGVjbGFyYXRpb24gPSBleHRyYS5wYXJzZVZhcmlhYmxlRGVjbGFyYXRpb247XG4gICAgICAgICAgICBwYXJzZVZhcmlhYmxlSWRlbnRpZmllciA9IGV4dHJhLnBhcnNlVmFyaWFibGVJZGVudGlmaWVyO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHR5cGVvZiBleHRyYS5zY2FuUmVnRXhwID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICBhZHZhbmNlID0gZXh0cmEuYWR2YW5jZTtcbiAgICAgICAgICAgIHNjYW5SZWdFeHAgPSBleHRyYS5zY2FuUmVnRXhwO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gc3RyaW5nVG9BcnJheShzdHIpIHtcbiAgICAgICAgdmFyIGxlbmd0aCA9IHN0ci5sZW5ndGgsXG4gICAgICAgICAgICByZXN1bHQgPSBbXSxcbiAgICAgICAgICAgIGk7XG4gICAgICAgIGZvciAoaSA9IDA7IGkgPCBsZW5ndGg7ICsraSkge1xuICAgICAgICAgICAgcmVzdWx0W2ldID0gc3RyLmNoYXJBdChpKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHBhcnNlKGNvZGUsIG9wdGlvbnMpIHtcbiAgICAgICAgdmFyIHByb2dyYW0sIHRvU3RyaW5nO1xuXG4gICAgICAgIHRvU3RyaW5nID0gU3RyaW5nO1xuICAgICAgICBpZiAodHlwZW9mIGNvZGUgIT09ICdzdHJpbmcnICYmICEoY29kZSBpbnN0YW5jZW9mIFN0cmluZykpIHtcbiAgICAgICAgICAgIGNvZGUgPSB0b1N0cmluZyhjb2RlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHNvdXJjZSA9IGNvZGU7XG4gICAgICAgIGluZGV4ID0gMDtcbiAgICAgICAgbGluZU51bWJlciA9IChzb3VyY2UubGVuZ3RoID4gMCkgPyAxIDogMDtcbiAgICAgICAgbGluZVN0YXJ0ID0gMDtcbiAgICAgICAgbGVuZ3RoID0gc291cmNlLmxlbmd0aDtcbiAgICAgICAgYnVmZmVyID0gbnVsbDtcbiAgICAgICAgc3RhdGUgPSB7XG4gICAgICAgICAgICBhbGxvd0luOiB0cnVlLFxuICAgICAgICAgICAgbGFiZWxTZXQ6IHt9LFxuICAgICAgICAgICAgaW5GdW5jdGlvbkJvZHk6IGZhbHNlLFxuICAgICAgICAgICAgaW5JdGVyYXRpb246IGZhbHNlLFxuICAgICAgICAgICAgaW5Td2l0Y2g6IGZhbHNlXG4gICAgICAgIH07XG5cbiAgICAgICAgZXh0cmEgPSB7fTtcbiAgICAgICAgaWYgKHR5cGVvZiBvcHRpb25zICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgZXh0cmEucmFuZ2UgPSAodHlwZW9mIG9wdGlvbnMucmFuZ2UgPT09ICdib29sZWFuJykgJiYgb3B0aW9ucy5yYW5nZTtcbiAgICAgICAgICAgIGV4dHJhLmxvYyA9ICh0eXBlb2Ygb3B0aW9ucy5sb2MgPT09ICdib29sZWFuJykgJiYgb3B0aW9ucy5sb2M7XG4gICAgICAgICAgICBleHRyYS5yYXcgPSAodHlwZW9mIG9wdGlvbnMucmF3ID09PSAnYm9vbGVhbicpICYmIG9wdGlvbnMucmF3O1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBvcHRpb25zLnRva2VucyA9PT0gJ2Jvb2xlYW4nICYmIG9wdGlvbnMudG9rZW5zKSB7XG4gICAgICAgICAgICAgICAgZXh0cmEudG9rZW5zID0gW107XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodHlwZW9mIG9wdGlvbnMuY29tbWVudCA9PT0gJ2Jvb2xlYW4nICYmIG9wdGlvbnMuY29tbWVudCkge1xuICAgICAgICAgICAgICAgIGV4dHJhLmNvbW1lbnRzID0gW107XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodHlwZW9mIG9wdGlvbnMudG9sZXJhbnQgPT09ICdib29sZWFuJyAmJiBvcHRpb25zLnRvbGVyYW50KSB7XG4gICAgICAgICAgICAgICAgZXh0cmEuZXJyb3JzID0gW107XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAobGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBzb3VyY2VbMF0gPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgLy8gVHJ5IGZpcnN0IHRvIGNvbnZlcnQgdG8gYSBzdHJpbmcuIFRoaXMgaXMgZ29vZCBhcyBmYXN0IHBhdGhcbiAgICAgICAgICAgICAgICAvLyBmb3Igb2xkIElFIHdoaWNoIHVuZGVyc3RhbmRzIHN0cmluZyBpbmRleGluZyBmb3Igc3RyaW5nXG4gICAgICAgICAgICAgICAgLy8gbGl0ZXJhbHMgb25seSBhbmQgbm90IGZvciBzdHJpbmcgb2JqZWN0LlxuICAgICAgICAgICAgICAgIGlmIChjb2RlIGluc3RhbmNlb2YgU3RyaW5nKSB7XG4gICAgICAgICAgICAgICAgICAgIHNvdXJjZSA9IGNvZGUudmFsdWVPZigpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIEZvcmNlIGFjY2Vzc2luZyB0aGUgY2hhcmFjdGVycyB2aWEgYW4gYXJyYXkuXG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBzb3VyY2VbMF0gPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgICAgIHNvdXJjZSA9IHN0cmluZ1RvQXJyYXkoY29kZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcGF0Y2goKTtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIHByb2dyYW0gPSBwYXJzZVByb2dyYW0oKTtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgZXh0cmEuY29tbWVudHMgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgZmlsdGVyQ29tbWVudExvY2F0aW9uKCk7XG4gICAgICAgICAgICAgICAgcHJvZ3JhbS5jb21tZW50cyA9IGV4dHJhLmNvbW1lbnRzO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHR5cGVvZiBleHRyYS50b2tlbnMgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgZmlsdGVyVG9rZW5Mb2NhdGlvbigpO1xuICAgICAgICAgICAgICAgIHByb2dyYW0udG9rZW5zID0gZXh0cmEudG9rZW5zO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHR5cGVvZiBleHRyYS5lcnJvcnMgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgcHJvZ3JhbS5lcnJvcnMgPSBleHRyYS5lcnJvcnM7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoZXh0cmEucmFuZ2UgfHwgZXh0cmEubG9jKSB7XG4gICAgICAgICAgICAgICAgcHJvZ3JhbS5ib2R5ID0gZmlsdGVyR3JvdXAocHJvZ3JhbS5ib2R5KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgdGhyb3cgZTtcbiAgICAgICAgfSBmaW5hbGx5IHtcbiAgICAgICAgICAgIHVucGF0Y2goKTtcbiAgICAgICAgICAgIGV4dHJhID0ge307XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gcHJvZ3JhbTtcbiAgICB9XG5cbiAgICAvLyBTeW5jIHdpdGggcGFja2FnZS5qc29uLlxuICAgIGV4cG9ydHMudmVyc2lvbiA9ICcxLjAuMyc7XG5cbiAgICBleHBvcnRzLnBhcnNlID0gcGFyc2U7XG5cbiAgICAvLyBEZWVwIGNvcHkuXG4gICAgZXhwb3J0cy5TeW50YXggPSAoZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgbmFtZSwgdHlwZXMgPSB7fTtcblxuICAgICAgICBpZiAodHlwZW9mIE9iamVjdC5jcmVhdGUgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIHR5cGVzID0gT2JqZWN0LmNyZWF0ZShudWxsKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZvciAobmFtZSBpbiBTeW50YXgpIHtcbiAgICAgICAgICAgIGlmIChTeW50YXguaGFzT3duUHJvcGVydHkobmFtZSkpIHtcbiAgICAgICAgICAgICAgICB0eXBlc1tuYW1lXSA9IFN5bnRheFtuYW1lXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0eXBlb2YgT2JqZWN0LmZyZWV6ZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgT2JqZWN0LmZyZWV6ZSh0eXBlcyk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdHlwZXM7XG4gICAgfSgpKTtcblxufSkpO1xuLyogdmltOiBzZXQgc3c9NCB0cz00IGV0IHR3PTgwIDogKi9cbiIsIi8qXG4gIENvcHlyaWdodCAoQykgMjAxMiBZdXN1a2UgU3V6dWtpIDx1dGF0YW5lLnRlYUBnbWFpbC5jb20+XG4gIENvcHlyaWdodCAoQykgMjAxMiBBcml5YSBIaWRheWF0IDxhcml5YS5oaWRheWF0QGdtYWlsLmNvbT5cblxuICBSZWRpc3RyaWJ1dGlvbiBhbmQgdXNlIGluIHNvdXJjZSBhbmQgYmluYXJ5IGZvcm1zLCB3aXRoIG9yIHdpdGhvdXRcbiAgbW9kaWZpY2F0aW9uLCBhcmUgcGVybWl0dGVkIHByb3ZpZGVkIHRoYXQgdGhlIGZvbGxvd2luZyBjb25kaXRpb25zIGFyZSBtZXQ6XG5cbiAgICAqIFJlZGlzdHJpYnV0aW9ucyBvZiBzb3VyY2UgY29kZSBtdXN0IHJldGFpbiB0aGUgYWJvdmUgY29weXJpZ2h0XG4gICAgICBub3RpY2UsIHRoaXMgbGlzdCBvZiBjb25kaXRpb25zIGFuZCB0aGUgZm9sbG93aW5nIGRpc2NsYWltZXIuXG4gICAgKiBSZWRpc3RyaWJ1dGlvbnMgaW4gYmluYXJ5IGZvcm0gbXVzdCByZXByb2R1Y2UgdGhlIGFib3ZlIGNvcHlyaWdodFxuICAgICAgbm90aWNlLCB0aGlzIGxpc3Qgb2YgY29uZGl0aW9ucyBhbmQgdGhlIGZvbGxvd2luZyBkaXNjbGFpbWVyIGluIHRoZVxuICAgICAgZG9jdW1lbnRhdGlvbiBhbmQvb3Igb3RoZXIgbWF0ZXJpYWxzIHByb3ZpZGVkIHdpdGggdGhlIGRpc3RyaWJ1dGlvbi5cblxuICBUSElTIFNPRlRXQVJFIElTIFBST1ZJREVEIEJZIFRIRSBDT1BZUklHSFQgSE9MREVSUyBBTkQgQ09OVFJJQlVUT1JTIFwiQVMgSVNcIlxuICBBTkQgQU5ZIEVYUFJFU1MgT1IgSU1QTElFRCBXQVJSQU5USUVTLCBJTkNMVURJTkcsIEJVVCBOT1QgTElNSVRFRCBUTywgVEhFXG4gIElNUExJRUQgV0FSUkFOVElFUyBPRiBNRVJDSEFOVEFCSUxJVFkgQU5EIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFXG4gIEFSRSBESVNDTEFJTUVELiBJTiBOTyBFVkVOVCBTSEFMTCA8Q09QWVJJR0hUIEhPTERFUj4gQkUgTElBQkxFIEZPUiBBTllcbiAgRElSRUNULCBJTkRJUkVDVCwgSU5DSURFTlRBTCwgU1BFQ0lBTCwgRVhFTVBMQVJZLCBPUiBDT05TRVFVRU5USUFMIERBTUFHRVNcbiAgKElOQ0xVRElORywgQlVUIE5PVCBMSU1JVEVEIFRPLCBQUk9DVVJFTUVOVCBPRiBTVUJTVElUVVRFIEdPT0RTIE9SIFNFUlZJQ0VTO1xuICBMT1NTIE9GIFVTRSwgREFUQSwgT1IgUFJPRklUUzsgT1IgQlVTSU5FU1MgSU5URVJSVVBUSU9OKSBIT1dFVkVSIENBVVNFRCBBTkRcbiAgT04gQU5ZIFRIRU9SWSBPRiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQ09OVFJBQ1QsIFNUUklDVCBMSUFCSUxJVFksIE9SIFRPUlRcbiAgKElOQ0xVRElORyBORUdMSUdFTkNFIE9SIE9USEVSV0lTRSkgQVJJU0lORyBJTiBBTlkgV0FZIE9VVCBPRiBUSEUgVVNFIE9GXG4gIFRISVMgU09GVFdBUkUsIEVWRU4gSUYgQURWSVNFRCBPRiBUSEUgUE9TU0lCSUxJVFkgT0YgU1VDSCBEQU1BR0UuXG4qL1xuXG4vKmpzbGludCBiaXR3aXNlOnRydWUgKi9cbi8qZ2xvYmFsIGV4cG9ydHM6dHJ1ZSwgZGVmaW5lOnRydWUsIHdpbmRvdzp0cnVlICovXG4oZnVuY3Rpb24gKGZhY3RvcnkpIHtcbiAgICAndXNlIHN0cmljdCc7XG5cbiAgICAvLyBVbml2ZXJzYWwgTW9kdWxlIERlZmluaXRpb24gKFVNRCkgdG8gc3VwcG9ydCBBTUQsIENvbW1vbkpTL05vZGUuanMsXG4gICAgLy8gYW5kIHBsYWluIGJyb3dzZXIgbG9hZGluZyxcbiAgICBpZiAodHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kKSB7XG4gICAgICAgIGRlZmluZShbJ2V4cG9ydHMnXSwgZmFjdG9yeSk7XG4gICAgfSBlbHNlIGlmICh0eXBlb2YgZXhwb3J0cyAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgZmFjdG9yeShleHBvcnRzKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBmYWN0b3J5KCh3aW5kb3cuZXN0cmF2ZXJzZSA9IHt9KSk7XG4gICAgfVxufShmdW5jdGlvbiAoZXhwb3J0cykge1xuICAgICd1c2Ugc3RyaWN0JztcblxuICAgIHZhciBTeW50YXgsXG4gICAgICAgIGlzQXJyYXksXG4gICAgICAgIFZpc2l0b3JPcHRpb24sXG4gICAgICAgIFZpc2l0b3JLZXlzLFxuICAgICAgICB3cmFwcGVycztcblxuICAgIFN5bnRheCA9IHtcbiAgICAgICAgQXNzaWdubWVudEV4cHJlc3Npb246ICdBc3NpZ25tZW50RXhwcmVzc2lvbicsXG4gICAgICAgIEFycmF5RXhwcmVzc2lvbjogJ0FycmF5RXhwcmVzc2lvbicsXG4gICAgICAgIEJsb2NrU3RhdGVtZW50OiAnQmxvY2tTdGF0ZW1lbnQnLFxuICAgICAgICBCaW5hcnlFeHByZXNzaW9uOiAnQmluYXJ5RXhwcmVzc2lvbicsXG4gICAgICAgIEJyZWFrU3RhdGVtZW50OiAnQnJlYWtTdGF0ZW1lbnQnLFxuICAgICAgICBDYWxsRXhwcmVzc2lvbjogJ0NhbGxFeHByZXNzaW9uJyxcbiAgICAgICAgQ2F0Y2hDbGF1c2U6ICdDYXRjaENsYXVzZScsXG4gICAgICAgIENvbmRpdGlvbmFsRXhwcmVzc2lvbjogJ0NvbmRpdGlvbmFsRXhwcmVzc2lvbicsXG4gICAgICAgIENvbnRpbnVlU3RhdGVtZW50OiAnQ29udGludWVTdGF0ZW1lbnQnLFxuICAgICAgICBEZWJ1Z2dlclN0YXRlbWVudDogJ0RlYnVnZ2VyU3RhdGVtZW50JyxcbiAgICAgICAgRGlyZWN0aXZlU3RhdGVtZW50OiAnRGlyZWN0aXZlU3RhdGVtZW50JyxcbiAgICAgICAgRG9XaGlsZVN0YXRlbWVudDogJ0RvV2hpbGVTdGF0ZW1lbnQnLFxuICAgICAgICBFbXB0eVN0YXRlbWVudDogJ0VtcHR5U3RhdGVtZW50JyxcbiAgICAgICAgRXhwcmVzc2lvblN0YXRlbWVudDogJ0V4cHJlc3Npb25TdGF0ZW1lbnQnLFxuICAgICAgICBGb3JTdGF0ZW1lbnQ6ICdGb3JTdGF0ZW1lbnQnLFxuICAgICAgICBGb3JJblN0YXRlbWVudDogJ0ZvckluU3RhdGVtZW50JyxcbiAgICAgICAgRnVuY3Rpb25EZWNsYXJhdGlvbjogJ0Z1bmN0aW9uRGVjbGFyYXRpb24nLFxuICAgICAgICBGdW5jdGlvbkV4cHJlc3Npb246ICdGdW5jdGlvbkV4cHJlc3Npb24nLFxuICAgICAgICBJZGVudGlmaWVyOiAnSWRlbnRpZmllcicsXG4gICAgICAgIElmU3RhdGVtZW50OiAnSWZTdGF0ZW1lbnQnLFxuICAgICAgICBMaXRlcmFsOiAnTGl0ZXJhbCcsXG4gICAgICAgIExhYmVsZWRTdGF0ZW1lbnQ6ICdMYWJlbGVkU3RhdGVtZW50JyxcbiAgICAgICAgTG9naWNhbEV4cHJlc3Npb246ICdMb2dpY2FsRXhwcmVzc2lvbicsXG4gICAgICAgIE1lbWJlckV4cHJlc3Npb246ICdNZW1iZXJFeHByZXNzaW9uJyxcbiAgICAgICAgTmV3RXhwcmVzc2lvbjogJ05ld0V4cHJlc3Npb24nLFxuICAgICAgICBPYmplY3RFeHByZXNzaW9uOiAnT2JqZWN0RXhwcmVzc2lvbicsXG4gICAgICAgIFByb2dyYW06ICdQcm9ncmFtJyxcbiAgICAgICAgUHJvcGVydHk6ICdQcm9wZXJ0eScsXG4gICAgICAgIFJldHVyblN0YXRlbWVudDogJ1JldHVyblN0YXRlbWVudCcsXG4gICAgICAgIFNlcXVlbmNlRXhwcmVzc2lvbjogJ1NlcXVlbmNlRXhwcmVzc2lvbicsXG4gICAgICAgIFN3aXRjaFN0YXRlbWVudDogJ1N3aXRjaFN0YXRlbWVudCcsXG4gICAgICAgIFN3aXRjaENhc2U6ICdTd2l0Y2hDYXNlJyxcbiAgICAgICAgVGhpc0V4cHJlc3Npb246ICdUaGlzRXhwcmVzc2lvbicsXG4gICAgICAgIFRocm93U3RhdGVtZW50OiAnVGhyb3dTdGF0ZW1lbnQnLFxuICAgICAgICBUcnlTdGF0ZW1lbnQ6ICdUcnlTdGF0ZW1lbnQnLFxuICAgICAgICBVbmFyeUV4cHJlc3Npb246ICdVbmFyeUV4cHJlc3Npb24nLFxuICAgICAgICBVcGRhdGVFeHByZXNzaW9uOiAnVXBkYXRlRXhwcmVzc2lvbicsXG4gICAgICAgIFZhcmlhYmxlRGVjbGFyYXRpb246ICdWYXJpYWJsZURlY2xhcmF0aW9uJyxcbiAgICAgICAgVmFyaWFibGVEZWNsYXJhdG9yOiAnVmFyaWFibGVEZWNsYXJhdG9yJyxcbiAgICAgICAgV2hpbGVTdGF0ZW1lbnQ6ICdXaGlsZVN0YXRlbWVudCcsXG4gICAgICAgIFdpdGhTdGF0ZW1lbnQ6ICdXaXRoU3RhdGVtZW50J1xuICAgIH07XG5cbiAgICBpc0FycmF5ID0gQXJyYXkuaXNBcnJheTtcbiAgICBpZiAoIWlzQXJyYXkpIHtcbiAgICAgICAgaXNBcnJheSA9IGZ1bmN0aW9uIGlzQXJyYXkoYXJyYXkpIHtcbiAgICAgICAgICAgIHJldHVybiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwoYXJyYXkpID09PSAnW29iamVjdCBBcnJheV0nO1xuICAgICAgICB9O1xuICAgIH1cblxuICAgIFZpc2l0b3JLZXlzID0ge1xuICAgICAgICBBc3NpZ25tZW50RXhwcmVzc2lvbjogWydsZWZ0JywgJ3JpZ2h0J10sXG4gICAgICAgIEFycmF5RXhwcmVzc2lvbjogWydlbGVtZW50cyddLFxuICAgICAgICBCbG9ja1N0YXRlbWVudDogWydib2R5J10sXG4gICAgICAgIEJpbmFyeUV4cHJlc3Npb246IFsnbGVmdCcsICdyaWdodCddLFxuICAgICAgICBCcmVha1N0YXRlbWVudDogWydsYWJlbCddLFxuICAgICAgICBDYWxsRXhwcmVzc2lvbjogWydjYWxsZWUnLCAnYXJndW1lbnRzJ10sXG4gICAgICAgIENhdGNoQ2xhdXNlOiBbJ3BhcmFtJywgJ2JvZHknXSxcbiAgICAgICAgQ29uZGl0aW9uYWxFeHByZXNzaW9uOiBbJ3Rlc3QnLCAnY29uc2VxdWVudCcsICdhbHRlcm5hdGUnXSxcbiAgICAgICAgQ29udGludWVTdGF0ZW1lbnQ6IFsnbGFiZWwnXSxcbiAgICAgICAgRGVidWdnZXJTdGF0ZW1lbnQ6IFtdLFxuICAgICAgICBEaXJlY3RpdmVTdGF0ZW1lbnQ6IFtdLFxuICAgICAgICBEb1doaWxlU3RhdGVtZW50OiBbJ2JvZHknLCAndGVzdCddLFxuICAgICAgICBFbXB0eVN0YXRlbWVudDogW10sXG4gICAgICAgIEV4cHJlc3Npb25TdGF0ZW1lbnQ6IFsnZXhwcmVzc2lvbiddLFxuICAgICAgICBGb3JTdGF0ZW1lbnQ6IFsnaW5pdCcsICd0ZXN0JywgJ3VwZGF0ZScsICdib2R5J10sXG4gICAgICAgIEZvckluU3RhdGVtZW50OiBbJ2xlZnQnLCAncmlnaHQnLCAnYm9keSddLFxuICAgICAgICBGdW5jdGlvbkRlY2xhcmF0aW9uOiBbJ2lkJywgJ3BhcmFtcycsICdib2R5J10sXG4gICAgICAgIEZ1bmN0aW9uRXhwcmVzc2lvbjogWydpZCcsICdwYXJhbXMnLCAnYm9keSddLFxuICAgICAgICBJZGVudGlmaWVyOiBbXSxcbiAgICAgICAgSWZTdGF0ZW1lbnQ6IFsndGVzdCcsICdjb25zZXF1ZW50JywgJ2FsdGVybmF0ZSddLFxuICAgICAgICBMaXRlcmFsOiBbXSxcbiAgICAgICAgTGFiZWxlZFN0YXRlbWVudDogWydsYWJlbCcsICdib2R5J10sXG4gICAgICAgIExvZ2ljYWxFeHByZXNzaW9uOiBbJ2xlZnQnLCAncmlnaHQnXSxcbiAgICAgICAgTWVtYmVyRXhwcmVzc2lvbjogWydvYmplY3QnLCAncHJvcGVydHknXSxcbiAgICAgICAgTmV3RXhwcmVzc2lvbjogWydjYWxsZWUnLCAnYXJndW1lbnRzJ10sXG4gICAgICAgIE9iamVjdEV4cHJlc3Npb246IFsncHJvcGVydGllcyddLFxuICAgICAgICBQcm9ncmFtOiBbJ2JvZHknXSxcbiAgICAgICAgUHJvcGVydHk6IFsna2V5JywgJ3ZhbHVlJ10sXG4gICAgICAgIFJldHVyblN0YXRlbWVudDogWydhcmd1bWVudCddLFxuICAgICAgICBTZXF1ZW5jZUV4cHJlc3Npb246IFsnZXhwcmVzc2lvbnMnXSxcbiAgICAgICAgU3dpdGNoU3RhdGVtZW50OiBbJ2Rpc2NyaW1pbmFudCcsICdjYXNlcyddLFxuICAgICAgICBTd2l0Y2hDYXNlOiBbJ3Rlc3QnLCAnY29uc2VxdWVudCddLFxuICAgICAgICBUaGlzRXhwcmVzc2lvbjogW10sXG4gICAgICAgIFRocm93U3RhdGVtZW50OiBbJ2FyZ3VtZW50J10sXG4gICAgICAgIFRyeVN0YXRlbWVudDogWydibG9jaycsICdoYW5kbGVycycsICdmaW5hbGl6ZXInXSxcbiAgICAgICAgVW5hcnlFeHByZXNzaW9uOiBbJ2FyZ3VtZW50J10sXG4gICAgICAgIFVwZGF0ZUV4cHJlc3Npb246IFsnYXJndW1lbnQnXSxcbiAgICAgICAgVmFyaWFibGVEZWNsYXJhdGlvbjogWydkZWNsYXJhdGlvbnMnXSxcbiAgICAgICAgVmFyaWFibGVEZWNsYXJhdG9yOiBbJ2lkJywgJ2luaXQnXSxcbiAgICAgICAgV2hpbGVTdGF0ZW1lbnQ6IFsndGVzdCcsICdib2R5J10sXG4gICAgICAgIFdpdGhTdGF0ZW1lbnQ6IFsnb2JqZWN0JywgJ2JvZHknXVxuICAgIH07XG5cbiAgICBWaXNpdG9yT3B0aW9uID0ge1xuICAgICAgICBCcmVhazogMSxcbiAgICAgICAgU2tpcDogMlxuICAgIH07XG5cbiAgICB3cmFwcGVycyA9IHtcbiAgICAgICAgUHJvcGVydHlXcmFwcGVyOiAnUHJvcGVydHknXG4gICAgfTtcblxuICAgIGZ1bmN0aW9uIHRyYXZlcnNlKHRvcCwgdmlzaXRvcikge1xuICAgICAgICB2YXIgd29ya2xpc3QsIGxlYXZlbGlzdCwgbm9kZSwgbm9kZVR5cGUsIHJldCwgY3VycmVudCwgY3VycmVudDIsIGNhbmRpZGF0ZXMsIGNhbmRpZGF0ZSwgbWFya2VyID0ge307XG5cbiAgICAgICAgd29ya2xpc3QgPSBbIHRvcCBdO1xuICAgICAgICBsZWF2ZWxpc3QgPSBbIG51bGwgXTtcblxuICAgICAgICB3aGlsZSAod29ya2xpc3QubGVuZ3RoKSB7XG4gICAgICAgICAgICBub2RlID0gd29ya2xpc3QucG9wKCk7XG4gICAgICAgICAgICBub2RlVHlwZSA9IG5vZGUudHlwZTtcblxuICAgICAgICAgICAgaWYgKG5vZGUgPT09IG1hcmtlcikge1xuICAgICAgICAgICAgICAgIG5vZGUgPSBsZWF2ZWxpc3QucG9wKCk7XG4gICAgICAgICAgICAgICAgaWYgKHZpc2l0b3IubGVhdmUpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0ID0gdmlzaXRvci5sZWF2ZShub2RlLCBsZWF2ZWxpc3RbbGVhdmVsaXN0Lmxlbmd0aCAtIDFdKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICByZXQgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChyZXQgPT09IFZpc2l0b3JPcHRpb24uQnJlYWspIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSBpZiAobm9kZSkge1xuICAgICAgICAgICAgICAgIGlmICh3cmFwcGVycy5oYXNPd25Qcm9wZXJ0eShub2RlVHlwZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgbm9kZSA9IG5vZGUubm9kZTtcbiAgICAgICAgICAgICAgICAgICAgbm9kZVR5cGUgPSB3cmFwcGVyc1tub2RlVHlwZV07XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaWYgKHZpc2l0b3IuZW50ZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0ID0gdmlzaXRvci5lbnRlcihub2RlLCBsZWF2ZWxpc3RbbGVhdmVsaXN0Lmxlbmd0aCAtIDFdKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICByZXQgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaWYgKHJldCA9PT0gVmlzaXRvck9wdGlvbi5CcmVhaykge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgd29ya2xpc3QucHVzaChtYXJrZXIpO1xuICAgICAgICAgICAgICAgIGxlYXZlbGlzdC5wdXNoKG5vZGUpO1xuXG4gICAgICAgICAgICAgICAgaWYgKHJldCAhPT0gVmlzaXRvck9wdGlvbi5Ta2lwKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhbmRpZGF0ZXMgPSBWaXNpdG9yS2V5c1tub2RlVHlwZV07XG4gICAgICAgICAgICAgICAgICAgIGN1cnJlbnQgPSBjYW5kaWRhdGVzLmxlbmd0aDtcbiAgICAgICAgICAgICAgICAgICAgd2hpbGUgKChjdXJyZW50IC09IDEpID49IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhbmRpZGF0ZSA9IG5vZGVbY2FuZGlkYXRlc1tjdXJyZW50XV07XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoY2FuZGlkYXRlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGlzQXJyYXkoY2FuZGlkYXRlKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjdXJyZW50MiA9IGNhbmRpZGF0ZS5sZW5ndGg7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdoaWxlICgoY3VycmVudDIgLT0gMSkgPj0gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGNhbmRpZGF0ZVtjdXJyZW50Ml0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZihub2RlVHlwZSA9PT0gU3ludGF4Lk9iamVjdEV4cHJlc3Npb24gJiYgJ3Byb3BlcnRpZXMnID09PSBjYW5kaWRhdGVzW2N1cnJlbnRdICYmIG51bGwgPT0gY2FuZGlkYXRlc1tjdXJyZW50XS50eXBlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdvcmtsaXN0LnB1c2goe3R5cGU6ICdQcm9wZXJ0eVdyYXBwZXInLCBub2RlOiBjYW5kaWRhdGVbY3VycmVudDJdfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgd29ya2xpc3QucHVzaChjYW5kaWRhdGVbY3VycmVudDJdKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB3b3JrbGlzdC5wdXNoKGNhbmRpZGF0ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcmVwbGFjZSh0b3AsIHZpc2l0b3IpIHtcbiAgICAgICAgdmFyIHdvcmtsaXN0LCBsZWF2ZWxpc3QsIG5vZGUsIG5vZGVUeXBlLCB0YXJnZXQsIHR1cGxlLCByZXQsIGN1cnJlbnQsIGN1cnJlbnQyLCBjYW5kaWRhdGVzLCBjYW5kaWRhdGUsIG1hcmtlciA9IHt9LCByZXN1bHQ7XG5cbiAgICAgICAgcmVzdWx0ID0ge1xuICAgICAgICAgICAgdG9wOiB0b3BcbiAgICAgICAgfTtcblxuICAgICAgICB0dXBsZSA9IFsgdG9wLCByZXN1bHQsICd0b3AnIF07XG4gICAgICAgIHdvcmtsaXN0ID0gWyB0dXBsZSBdO1xuICAgICAgICBsZWF2ZWxpc3QgPSBbIHR1cGxlIF07XG5cbiAgICAgICAgZnVuY3Rpb24gbm90aWZ5KHYpIHtcbiAgICAgICAgICAgIHJldCA9IHY7XG4gICAgICAgIH1cblxuICAgICAgICB3aGlsZSAod29ya2xpc3QubGVuZ3RoKSB7XG4gICAgICAgICAgICB0dXBsZSA9IHdvcmtsaXN0LnBvcCgpO1xuXG4gICAgICAgICAgICBpZiAodHVwbGUgPT09IG1hcmtlcikge1xuICAgICAgICAgICAgICAgIHR1cGxlID0gbGVhdmVsaXN0LnBvcCgpO1xuICAgICAgICAgICAgICAgIHJldCA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgICAgICBpZiAodmlzaXRvci5sZWF2ZSkge1xuICAgICAgICAgICAgICAgICAgICBub2RlID0gdHVwbGVbMF07XG4gICAgICAgICAgICAgICAgICAgIHRhcmdldCA9IHZpc2l0b3IubGVhdmUodHVwbGVbMF0sIGxlYXZlbGlzdFtsZWF2ZWxpc3QubGVuZ3RoIC0gMV1bMF0sIG5vdGlmeSk7XG4gICAgICAgICAgICAgICAgICAgIGlmICh0YXJnZXQgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgbm9kZSA9IHRhcmdldDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB0dXBsZVsxXVt0dXBsZVsyXV0gPSBub2RlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAocmV0ID09PSBWaXNpdG9yT3B0aW9uLkJyZWFrKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiByZXN1bHQudG9wO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSBpZiAodHVwbGVbMF0pIHtcbiAgICAgICAgICAgICAgICByZXQgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICAgICAgbm9kZSA9IHR1cGxlWzBdO1xuXG4gICAgICAgICAgICAgICAgbm9kZVR5cGUgPSBub2RlLnR5cGU7XG4gICAgICAgICAgICAgICAgaWYgKHdyYXBwZXJzLmhhc093blByb3BlcnR5KG5vZGVUeXBlKSkge1xuICAgICAgICAgICAgICAgICAgICB0dXBsZVswXSA9IG5vZGUgPSBub2RlLm5vZGU7XG4gICAgICAgICAgICAgICAgICAgIG5vZGVUeXBlID0gd3JhcHBlcnNbbm9kZVR5cGVdO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGlmICh2aXNpdG9yLmVudGVyKSB7XG4gICAgICAgICAgICAgICAgICAgIHRhcmdldCA9IHZpc2l0b3IuZW50ZXIodHVwbGVbMF0sIGxlYXZlbGlzdFtsZWF2ZWxpc3QubGVuZ3RoIC0gMV1bMF0sIG5vdGlmeSk7XG4gICAgICAgICAgICAgICAgICAgIGlmICh0YXJnZXQgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgbm9kZSA9IHRhcmdldDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB0dXBsZVsxXVt0dXBsZVsyXV0gPSBub2RlO1xuICAgICAgICAgICAgICAgICAgICB0dXBsZVswXSA9IG5vZGU7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaWYgKHJldCA9PT0gVmlzaXRvck9wdGlvbi5CcmVhaykge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcmVzdWx0LnRvcDtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBpZiAodHVwbGVbMF0pIHtcbiAgICAgICAgICAgICAgICAgICAgd29ya2xpc3QucHVzaChtYXJrZXIpO1xuICAgICAgICAgICAgICAgICAgICBsZWF2ZWxpc3QucHVzaCh0dXBsZSk7XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKHJldCAhPT0gVmlzaXRvck9wdGlvbi5Ta2lwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjYW5kaWRhdGVzID0gVmlzaXRvcktleXNbbm9kZVR5cGVdO1xuICAgICAgICAgICAgICAgICAgICAgICAgY3VycmVudCA9IGNhbmRpZGF0ZXMubGVuZ3RoO1xuICAgICAgICAgICAgICAgICAgICAgICAgd2hpbGUgKChjdXJyZW50IC09IDEpID49IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYW5kaWRhdGUgPSBub2RlW2NhbmRpZGF0ZXNbY3VycmVudF1dO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjYW5kaWRhdGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGlzQXJyYXkoY2FuZGlkYXRlKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY3VycmVudDIgPSBjYW5kaWRhdGUubGVuZ3RoO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgd2hpbGUgKChjdXJyZW50MiAtPSAxKSA+PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGNhbmRpZGF0ZVtjdXJyZW50Ml0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYobm9kZVR5cGUgPT09IFN5bnRheC5PYmplY3RFeHByZXNzaW9uICYmICdwcm9wZXJ0aWVzJyA9PT0gY2FuZGlkYXRlc1tjdXJyZW50XSAmJiBudWxsID09IGNhbmRpZGF0ZXNbY3VycmVudF0udHlwZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgd29ya2xpc3QucHVzaChbe3R5cGU6ICdQcm9wZXJ0eVdyYXBwZXInLCBub2RlOiBjYW5kaWRhdGVbY3VycmVudDJdfSwgY2FuZGlkYXRlLCBjdXJyZW50Ml0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgd29ya2xpc3QucHVzaChbY2FuZGlkYXRlW2N1cnJlbnQyXSwgY2FuZGlkYXRlLCBjdXJyZW50Ml0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgd29ya2xpc3QucHVzaChbY2FuZGlkYXRlLCBub2RlLCBjYW5kaWRhdGVzW2N1cnJlbnRdXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gcmVzdWx0LnRvcDtcbiAgICB9XG5cbiAgICBleHBvcnRzLnZlcnNpb24gPSAnMC4wLjQnO1xuICAgIGV4cG9ydHMuU3ludGF4ID0gU3ludGF4O1xuICAgIGV4cG9ydHMudHJhdmVyc2UgPSB0cmF2ZXJzZTtcbiAgICBleHBvcnRzLnJlcGxhY2UgPSByZXBsYWNlO1xuICAgIGV4cG9ydHMuVmlzaXRvcktleXMgPSBWaXNpdG9yS2V5cztcbiAgICBleHBvcnRzLlZpc2l0b3JPcHRpb24gPSBWaXNpdG9yT3B0aW9uO1xufSkpO1xuLyogdmltOiBzZXQgc3c9NCB0cz00IGV0IHR3PTgwIDogKi9cbiIsIihmdW5jdGlvbiAobnMpIHtcblxuICAgIHZhciB3YWxrID0gcmVxdWlyZSgnZXN0cmF2ZXJzZScpLFxuICAgICAgICBDb250ZXh0ID0gcmVxdWlyZShcIi4vLi4vYmFzZS9jb250ZXh0LmpzXCIpLmdldENvbnRleHQobnVsbCksXG4gICAgICAgIFN5bnRheCA9IHdhbGsuU3ludGF4O1xuXG4gICAgdmFyIGZpbmRQYXJhbWV0ZXJzSW5Qcm9ncmFtID0gZnVuY3Rpb24gKHByb2dyYW0sIGNvbnRleHROYW1lLCBwYXJhbSwgYW5hbHl6ZWRDYWxscykge1xuICAgICAgICB2YXIgY29udGV4dFN0YWNrID0gW25ldyBDb250ZXh0KHByb2dyYW0sIG51bGwsIHtuYW1lOiBcImdsb2JhbFwifSldO1xuICAgICAgICB2YXIgZm91bmRQYXJhbXMgPSBbXTtcbiAgICAgICAgYW5hbHl6ZWRDYWxscyA9IGFuYWx5emVkQ2FsbHMgfHwge307XG4gICAgICAgIC8vY29uc29sZS5sb2coXCJMb29raW5nIGZvcjogXCIsIGNvbnRleHROYW1lLCBwYXJhbSk7XG5cbiAgICAgICAgdmFyIGFjdGl2ZVBhcmFtID0gbnVsbDtcbiAgICAgICAgd2Fsay50cmF2ZXJzZShwcm9ncmFtLCB7XG4gICAgICAgICAgICBlbnRlcjogZnVuY3Rpb24gKG5vZGUpIHtcbiAgICAgICAgICAgICAgICB2YXIgdHlwZSA9IG5vZGUudHlwZSxcbiAgICAgICAgICAgICAgICAgICAgY29udGV4dDtcbiAgICAgICAgICAgICAgICBzd2l0Y2ggKHR5cGUpIHtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBTeW50YXguRnVuY3Rpb25EZWNsYXJhdGlvbjpcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBwYXJlbnRDb250ZXh0ID0gY29udGV4dFN0YWNrW2NvbnRleHRTdGFjay5sZW5ndGggLSAxXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhcmVudENvbnRleHQuZGVjbGFyZVZhcmlhYmxlKG5vZGUuaWQubmFtZSwgZmFsc2UpO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29udGV4dCA9IG5ldyBDb250ZXh0KG5vZGUsIHBhcmVudENvbnRleHQsIHtuYW1lOiBub2RlLmlkLm5hbWUgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb250ZXh0U3RhY2sucHVzaChjb250ZXh0KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjb250ZXh0LnN0cigpID09IGNvbnRleHROYW1lKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG5vZGUucGFyYW1zLmxlbmd0aCA+IHBhcmFtKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFjdGl2ZVBhcmFtID0gbm9kZS5wYXJhbXNbcGFyYW1dLm5hbWU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgU3ludGF4LkNhbGxFeHByZXNzaW9uOlxuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHBvcyA9IG5vZGUuYXJndW1lbnRzLnJlZHVjZShmdW5jdGlvbiAocHJldiwgY3VyciwgaW5kZXgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoY3Vyci5uYW1lID09IGFjdGl2ZVBhcmFtKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gaW5kZXg7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHByZXY7XG4gICAgICAgICAgICAgICAgICAgICAgICB9LCAtMSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAocG9zICE9IC0xKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29udGV4dCA9IGNvbnRleHRTdGFja1tjb250ZXh0U3RhY2subGVuZ3RoIC0gMV07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGlkID0gY29udGV4dC5nZXRWYXJpYWJsZUlkZW50aWZpZXIobm9kZS5jYWxsZWUubmFtZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFhbmFseXplZENhbGxzW2lkXSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhbmFseXplZENhbGxzW2lkXSA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZvdW5kUGFyYW1zID0gZm91bmRQYXJhbXMuY29uY2F0KGZpbmRQYXJhbWV0ZXJzSW5Qcm9ncmFtKHByb2dyYW0sIGlkLCBwb3MsIGFuYWx5emVkQ2FsbHMpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBsZWF2ZTogZnVuY3Rpb24gKG5vZGUpIHtcbiAgICAgICAgICAgICAgICB2YXIgdHlwZSA9IG5vZGUudHlwZTtcbiAgICAgICAgICAgICAgICBzd2l0Y2ggKHR5cGUpIHtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBTeW50YXguRnVuY3Rpb25EZWNsYXJhdGlvbjpcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRleHRTdGFjay5wb3AoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFjdGl2ZVBhcmFtID0gbnVsbDtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlIFN5bnRheC5NZW1iZXJFeHByZXNzaW9uOlxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGFjdGl2ZVBhcmFtICYmIG5vZGUub2JqZWN0Lm5hbWUgPT0gYWN0aXZlUGFyYW0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgcGFyYW1ldGVyTmFtZSA9IG5vZGUucHJvcGVydHkubmFtZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZm91bmRQYXJhbXMuaW5kZXhPZihwYXJhbWV0ZXJOYW1lKSA9PSAtMSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZm91bmRQYXJhbXMucHVzaChwYXJhbWV0ZXJOYW1lKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgcmV0dXJuIGZvdW5kUGFyYW1zO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBAcGFyYW0ge29iamVjdCF9IHByb2dyYW1cbiAgICAgKiBAcGFyYW0ge29iamVjdD99IG9wdFxuICAgICAqL1xuICAgIG5zLmV4dHJhY3RQYXJhbWV0ZXJzID0gZnVuY3Rpb24gKHByb2dyYW0sIG9wdCkge1xuICAgICAgICBvcHQgPSBvcHQgfHwge307XG4gICAgICAgIHZhciBjb250ZXh0ID0gb3B0LmNvbnRleHQgfHwgXCJnbG9iYWwuc2hhZGVcIjtcbiAgICAgICAgdmFyIHBhcmFtID0gb3B0LnBhcmFtIHx8IDA7XG5cbiAgICAgICAgcmV0dXJuIGZpbmRQYXJhbWV0ZXJzSW5Qcm9ncmFtKHByb2dyYW0sIGNvbnRleHQsIHBhcmFtKTtcbiAgICB9O1xuXG5cbn0oZXhwb3J0cykpO1xuIiwiKGZ1bmN0aW9uIChucykge1xuXG4gICAgdmFyIFN5bnRheCA9IHJlcXVpcmUoJ2VzdHJhdmVyc2UnKS5TeW50YXgsXG4gICAgICAgIFZpc2l0b3JPcHRpb24gPSByZXF1aXJlKCdlc3RyYXZlcnNlJykuVmlzaXRvck9wdGlvbixcbiAgICAgICAgU2hhZGUgPSByZXF1aXJlKFwiLi4vLi4vaW50ZXJmYWNlcy5qc1wiKSxcbiAgICAgICAgVFlQRVMgPSBTaGFkZS5UWVBFUyxcbiAgICAgICAgQW5ub3RhdGlvbiA9IHJlcXVpcmUoXCIuLy4uLy4uL2Jhc2UvYW5ub3RhdGlvbi5qc1wiKS5Bbm5vdGF0aW9uLFxuICAgICAgICBCYXNlID0gcmVxdWlyZShcIi4vLi4vLi4vYmFzZS9pbmRleC5qc1wiKTtcblxuXG4gICAgdmFyIEJpbmFyeUZ1bmN0aW9ucyA9IHtcbiAgICAgICAgXCIrXCIgOiBmdW5jdGlvbihhLGIpIHsgcmV0dXJuIGEgKyBiOyB9LFxuICAgICAgICBcIi1cIiA6IGZ1bmN0aW9uKGEsYikgeyByZXR1cm4gYSAtIGI7IH0sXG4gICAgICAgIFwiL1wiIDogZnVuY3Rpb24oYSxiKSB7IHJldHVybiBhIC8gYjsgfSxcbiAgICAgICAgXCIqXCIgOiBmdW5jdGlvbihhLGIpIHsgcmV0dXJuIGEgKiBiOyB9LFxuICAgICAgICBcIiVcIiA6IGZ1bmN0aW9uKGEsYikgeyByZXR1cm4gYSAlIGI7IH0sXG5cbiAgICAgICAgXCI9PVwiIDogZnVuY3Rpb24oYSxiKSB7IHJldHVybiBhID09IGI7IH0sXG4gICAgICAgIFwiIT1cIiA6IGZ1bmN0aW9uKGEsYikgeyByZXR1cm4gYSAhPSBiOyB9LFxuICAgICAgICBcIj09PVwiIDogZnVuY3Rpb24oYSxiKSB7IHJldHVybiBhID09PSBiOyB9LFxuICAgICAgICBcIiE9PVwiIDogZnVuY3Rpb24oYSxiKSB7IHJldHVybiBhICE9PSBiOyB9LFxuICAgICAgICBcIjxcIiA6IGZ1bmN0aW9uKGEsYikgeyByZXR1cm4gYSA8IGI7IH0sXG4gICAgICAgIFwiPD1cIiA6IGZ1bmN0aW9uKGEsYikgeyByZXR1cm4gYSA8PSBiOyB9LFxuICAgICAgICBcIj5cIiA6IGZ1bmN0aW9uKGEsYikgeyByZXR1cm4gYSA+IGI7IH0sXG4gICAgICAgIFwiPj1cIiA6IGZ1bmN0aW9uKGEsYikgeyByZXR1cm4gYSA+PSBiOyB9XG4gICAgICAgIH07XG5cbiAgICB2YXIgVW5hcnlGdW5jdGlvbnMgPSB7XG4gICAgICAgICAgICAgICAgXCIhXCI6IGZ1bmN0aW9uKGEpIHsgcmV0dXJuICFhOyB9LFxuICAgICAgICAgICAgICAgIFwiLVwiOiBmdW5jdGlvbihhKSB7IHJldHVybiAtYTsgfSxcbiAgICAgICAgICAgICAgICBcIitcIjogZnVuY3Rpb24oYSkgeyByZXR1cm4gK2E7IH0sXG4gICAgICAgICAgICAgICAgXCJ0eXBlb2ZcIjogZnVuY3Rpb24oYSkgeyByZXR1cm4gdHlwZW9mIGE7IH0sXG4gICAgICAgICAgICAgICAgXCJ2b2lkXCI6IGZ1bmN0aW9uKGEpIHsgcmV0dXJuIHZvaWQgYTsgfSxcbiAgICAgICAgICAgICAgICBcImRlbGV0ZVwiOiBmdW5jdGlvbihhKSB7IHJldHVybiBkZWxldGUgYTsgfVxuXG4gICAgfTtcblxuXG4gICAgZnVuY3Rpb24gZ2V0T2JqZWN0UmVmZXJlbmNlRnJvbU5vZGUob2JqZWN0LCBjb250ZXh0KSB7XG4gICAgICAgIHN3aXRjaCAob2JqZWN0LnR5cGUpIHtcbiAgICAgICAgICAgIGNhc2UgU3ludGF4Lk5ld0V4cHJlc3Npb246XG4gICAgICAgICAgICBjYXNlIFN5bnRheC5DYWxsRXhwcmVzc2lvbjpcbiAgICAgICAgICAgIGNhc2UgU3ludGF4Lk1lbWJlckV4cHJlc3Npb246XG4gICAgICAgICAgICAgICAgcmV0dXJuIGNvbnRleHQuY3JlYXRlVHlwZUluZm8ob2JqZWN0KTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgU3ludGF4LklkZW50aWZpZXI6XG4gICAgICAgICAgICAgICAgcmV0dXJuIGNvbnRleHQuZ2V0QmluZGluZ0J5TmFtZShvYmplY3QubmFtZSk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIFN5bnRheC5UaGlzRXhwcmVzc2lvbjpcbiAgICAgICAgICAgICAgICByZXR1cm4gY29udGV4dC5nZXRCaW5kaW5nQnlOYW1lKFwidGhpc1wiKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiVW5oYW5kbGVkIG9iamVjdCB0eXBlIGluIFR5cGVJbmZlcmVuY2U6IFwiICsgb2JqZWN0LnR5cGUpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgdmFyIGV2YWx1YXRlVHJ1dGggPSBmdW5jdGlvbihleHApIHtcbiAgICAgICAgcmV0dXJuICEhZXhwO1xuICAgIH1cblxuICAgIHZhciBsb2cgPSBmdW5jdGlvbihzdHIpIHt9O1xuICAgIC8vdmFyIGxvZyA9IGZ1bmN0aW9uKCkgeyBjb25zb2xlLmxvZy5hcHBseShjb25zb2xlLCBhcmd1bWVudHMpOyB9O1xuXG5cbiAgICB2YXIgZW50ZXJIYW5kbGVycyA9IHtcbiAgICAgICAgLy8gT24gZW50ZXJcbiAgICAgICAgQ29uZGl0aW9uYWxFeHByZXNzaW9uOiBmdW5jdGlvbiAobm9kZSwgcGFyZW50LCBjdHgsIHJvb3QpIHtcbiAgICAgICAgICAgIHZhciByZXN1bHQgPSBuZXcgQW5ub3RhdGlvbihub2RlKTtcblxuICAgICAgICAgICAgcm9vdC50cmF2ZXJzZShub2RlLnRlc3QpO1xuICAgICAgICAgICAgdmFyIHRlc3QgPSBjdHguY3JlYXRlVHlwZUluZm8obm9kZS50ZXN0KTtcblxuICAgICAgICAgICAgLy8gY29uc29sZS5sb2cobm9kZS50ZXN0LCBub2RlLmNvbnNlcXVlbnQsIG5vZGUuYWx0ZXJuYXRlKTtcbiAgICAgICAgICAgIGlmICh0ZXN0Lmhhc1N0YXRpY1ZhbHVlKCkgfHwgdGVzdC5pc09iamVjdCgpKSB7XG4gICAgICAgICAgICAgICAgdmFyIHRlc3RSZXN1bHQgPSB0ZXN0Lmhhc1N0YXRpY1ZhbHVlKCkgPyBldmFsdWF0ZVRydXRoKHRlc3QuZ2V0U3RhdGljVmFsdWUoKSkgOiB0cnVlO1xuICAgICAgICAgICAgICAgIGlmICh0ZXN0UmVzdWx0ID09PSB0cnVlKSB7XG4gICAgICAgICAgICAgICAgICAgIHJvb3QudHJhdmVyc2Uobm9kZS5jb25zZXF1ZW50KTtcbiAgICAgICAgICAgICAgICAgICAgY29uc2VxdWVudCA9IGN0eC5jcmVhdGVUeXBlSW5mbyhub2RlLmNvbnNlcXVlbnQpO1xuICAgICAgICAgICAgICAgICAgICByZXN1bHQuY29weShjb25zZXF1ZW50KTtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGFsdGVybmF0ZSA9IG5ldyBBbm5vdGF0aW9uKG5vZGUuYWx0ZXJuYXRlKTtcbiAgICAgICAgICAgICAgICAgICAgYWx0ZXJuYXRlLmVsaW1pbmF0ZSgpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHJvb3QudHJhdmVyc2Uobm9kZS5hbHRlcm5hdGUpO1xuICAgICAgICAgICAgICAgICAgICB2YXIgYWx0ZXJuYXRlID0gY3R4LmNyZWF0ZVR5cGVJbmZvKG5vZGUuYWx0ZXJuYXRlKTtcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0LmNvcHkoYWx0ZXJuYXRlKTtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGNvbnNlcXVlbnQgPSBuZXcgQW5ub3RhdGlvbihub2RlLmNvbnNlcXVlbnQpO1xuICAgICAgICAgICAgICAgICAgICBjb25zZXF1ZW50LmVsaW1pbmF0ZSgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gV2UgY2FuJ3QgZGVjaWRlLCB0aHVzIHRyYXZlcnNlIGJvdGg7XG4gICAgICAgICAgICAgICAgcm9vdC50cmF2ZXJzZShub2RlLmNvbnNlcXVlbnQpO1xuICAgICAgICAgICAgICAgIHJvb3QudHJhdmVyc2Uobm9kZS5hbHRlcm5hdGUpO1xuICAgICAgICAgICAgICAgIHZhciBjb25zZXF1ZW50ID0gY3R4LmNyZWF0ZVR5cGVJbmZvKG5vZGUuY29uc2VxdWVudCksXG4gICAgICAgICAgICAgICAgICAgIGFsdGVybmF0ZSA9IGN0eC5jcmVhdGVUeXBlSW5mbyhub2RlLmFsdGVybmF0ZSk7XG5cblxuICAgICAgICAgICAgICAgIGlmIChjb25zZXF1ZW50LmVxdWFscyhhbHRlcm5hdGUpKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdC5jb3B5KGNvbnNlcXVlbnQpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoY29uc2VxdWVudC5jYW5OdW1iZXIoKSAmJiBhbHRlcm5hdGUuY2FuTnVtYmVyKCkpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0LnNldFR5cGUoVFlQRVMuTlVNQkVSKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSBpZiAodGVzdC5pc051bGxPclVuZGVmaW5lZCgpKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdC5zZXRUeXBlKGFsdGVybmF0ZS5nZXRUeXBlKCkpXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gV2UgZG9uJ3QgYWxsb3cgZHluYW1pYyB0eXBlcyAodGhlIHR5cGUgb2YgdGhlIHJlc3VsdCBkZXBlbmRzIG9uIHRoZSB2YWx1ZSBvZiBpdCdzIG9wZXJhbmRzKS5cbiAgICAgICAgICAgICAgICAgICAgLy8gQXQgdGhpcyBwb2ludCwgdGhlIGV4cHJlc3Npb24gbmVlZHMgdG8gZXZhbHVhdGUgdG8gYSByZXN1bHQsIG90aGVyd2lzZSBpdCdzIGFuIGVycm9yXG4gICAgICAgICAgICAgICAgICAgIHRocm93IFNoYWRlLnRocm93RXJyb3Iobm9kZSwgXCJTdGF0aWMgZXZhbHVhdGlvbiBub3QgaW1wbGVtZW50ZWQgeWV0XCIpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBWaXNpdG9yT3B0aW9uLlNraXA7XG5cbiAgICAgICAgfSxcbiAgICAgICAgTGl0ZXJhbDogZnVuY3Rpb24gKGxpdGVyYWwpIHtcbiAgICAgICAgICAgIC8vY29uc29sZS5sb2cobGl0ZXJhbCk7XG4gICAgICAgICAgICB2YXIgdmFsdWUgPSBsaXRlcmFsLnJhdyAhPT0gdW5kZWZpbmVkID8gbGl0ZXJhbC5yYXcgOiBsaXRlcmFsLnZhbHVlLFxuICAgICAgICAgICAgICAgIHJlc3VsdCA9IG5ldyBBbm5vdGF0aW9uKGxpdGVyYWwpO1xuXG4gICAgICAgICAgICB2YXIgbnVtYmVyID0gcGFyc2VGbG9hdCh2YWx1ZSk7XG5cbiAgICAgICAgICAgIGlmICghaXNOYU4obnVtYmVyKSkge1xuICAgICAgICAgICAgICAgIGlmICh2YWx1ZS5pbmRleE9mKFwiLlwiKSA9PSAtMSkge1xuICAgICAgICAgICAgICAgICAgICByZXN1bHQuc2V0VHlwZShUWVBFUy5JTlQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0LnNldFR5cGUoVFlQRVMuTlVNQkVSKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmVzdWx0LnNldFN0YXRpY1ZhbHVlKG51bWJlcik7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHZhbHVlID09PSAndHJ1ZScpIHtcbiAgICAgICAgICAgICAgICByZXN1bHQuc2V0VHlwZShUWVBFUy5CT09MRUFOKTtcbiAgICAgICAgICAgICAgICByZXN1bHQuc2V0U3RhdGljVmFsdWUodHJ1ZSk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHZhbHVlID09PSAnZmFsc2UnKSB7XG4gICAgICAgICAgICAgICAgcmVzdWx0LnNldFR5cGUoVFlQRVMuQk9PTEVBTik7XG4gICAgICAgICAgICAgICAgcmVzdWx0LnNldFN0YXRpY1ZhbHVlKGZhbHNlKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAodmFsdWUgPT09ICdudWxsJykge1xuICAgICAgICAgICAgICAgIHJlc3VsdC5zZXRUeXBlKFRZUEVTLk5VTEwpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXN1bHQuc2V0VHlwZShUWVBFUy5TVFJJTkcpO1xuICAgICAgICAgICAgICAgIHJlc3VsdC5zZXRTdGF0aWNWYWx1ZSh2YWx1ZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICB2YXIgaGFuZGxlcnMgPSB7XG4gICAgICAgIEFzc2lnbm1lbnRFeHByZXNzaW9uOiBmdW5jdGlvbiAobm9kZSwgY3R4KSB7XG4gICAgICAgICAgICB2YXIgcmlnaHQgPSBjdHguY3JlYXRlVHlwZUluZm8obm9kZS5yaWdodCksXG4gICAgICAgICAgICAgICAgcmVzdWx0ID0gbmV3IEFubm90YXRpb24obm9kZSk7XG5cbiAgICAgICAgICAgIHJlc3VsdC5jb3B5KHJpZ2h0KTtcbiAgICAgICAgICAgIGlmIChub2RlLmxlZnQudHlwZSA9PSBTeW50YXguSWRlbnRpZmllcikge1xuICAgICAgICAgICAgICAgIHZhciBuYW1lID0gbm9kZS5sZWZ0Lm5hbWU7XG4gICAgICAgICAgICAgICAgaWYgKGN0eC5pbkRlY2xhcmF0aW9uID09PSB0cnVlKSB7XG4gICAgICAgICAgICAgICAgICAgIGN0eC5kZWNsYXJlVmFyaWFibGUobmFtZSwgdHJ1ZSwgcmVzdWx0KVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjdHgudXBkYXRlRXhwcmVzc2lvbihuYW1lLCByaWdodCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIkFzc2lnbm1lbnQgZXhwcmVzc2lvblwiKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcblxuXG4gICAgICAgIE5ld0V4cHJlc3Npb246IGZ1bmN0aW9uKG5vZGUsIHBhcmVudCwgY3R4KSB7XG4gICAgICAgICAgICB2YXIgcmVzdWx0ID0gbmV3IEFubm90YXRpb24obm9kZSk7XG5cbiAgICAgICAgICAgIHZhciBlbnRyeSA9IGN0eC5nZXRCaW5kaW5nQnlOYW1lKG5vZGUuY2FsbGVlLm5hbWUpO1xuICAgICAgICAgICAgLy9jb25zb2xlLmVycm9yKGVudHJ5KTtcbiAgICAgICAgICAgIGlmIChlbnRyeSAmJiBlbnRyeS5oYXNDb25zdHJ1Y3RvcigpKSB7XG4gICAgICAgICAgICAgICAgdmFyIGNvbnN0cnVjdG9yID0gZW50cnkuZ2V0Q29uc3RydWN0b3IoKTtcbiAgICAgICAgICAgICAgICB2YXIgYXJncyA9IEFubm90YXRpb24uY3JlYXRlQW5ub3RhdGVkTm9kZUFycmF5KG5vZGUuYXJndW1lbnRzLCBjdHgpO1xuICAgICAgICAgICAgICAgIHZhciBleHRyYSA9IGNvbnN0cnVjdG9yLmV2YWx1YXRlKHJlc3VsdCwgYXJncywgY3R4KTtcbiAgICAgICAgICAgICAgICByZXN1bHQuc2V0RnJvbUV4dHJhKGV4dHJhKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiUmVmZXJlbmNlRXJyb3I6IFwiICsgbm9kZS5jYWxsZWUubmFtZSArIFwiIGlzIG5vdCBkZWZpbmVkXCIpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuXG4gICAgICAgIFVuYXJ5RXhwcmVzc2lvbjogZnVuY3Rpb24gKG5vZGUsIGN0eCkge1xuICAgICAgICAgICAgdmFyIHJlc3VsdCA9IG5ldyBBbm5vdGF0aW9uKG5vZGUpLFxuICAgICAgICAgICAgICAgIGFyZ3VtZW50ID0gY3R4LmNyZWF0ZVR5cGVJbmZvKG5vZGUuYXJndW1lbnQpLFxuICAgICAgICAgICAgICAgIG9wZXJhdG9yID0gbm9kZS5vcGVyYXRvcixcbiAgICAgICAgICAgICAgICBmdW5jID0gVW5hcnlGdW5jdGlvbnNbb3BlcmF0b3JdO1xuXG4gICAgICAgICAgICBzd2l0Y2ggKG9wZXJhdG9yKSB7XG4gICAgICAgICAgICAgICAgY2FzZSBcIiFcIjpcblxuICAgICAgICAgICAgICAgICAgICByZXN1bHQuc2V0VHlwZShUWVBFUy5CT09MRUFOKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSBcIitcIjpcbiAgICAgICAgICAgICAgICBjYXNlIFwiLVwiOlxuICAgICAgICAgICAgICAgICAgICBpZiAoYXJndW1lbnQuY2FuSW50KCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc3VsdC5zZXRUeXBlKFRZUEVTLklOVCk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoYXJndW1lbnQuY2FuTnVtYmVyKCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc3VsdC5zZXRUeXBlKFRZUEVTLk5VTUJFUik7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJDYW4ndCBldmFsdWF0ZSAnXCIgKyBvcGVyYXRvciArICdcIiBmb3IgJyArIGFyZ3VtZW50KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIFwiflwiOlxuICAgICAgICAgICAgICAgIGNhc2UgXCJ0eXBlb2ZcIjpcbiAgICAgICAgICAgICAgICBjYXNlIFwidm9pZFwiOlxuICAgICAgICAgICAgICAgIGNhc2UgXCJkZWxldGVcIjpcbiAgICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJPcGVyYXRvciBub3QgeWV0IHN1cHBvcnRlZDogXCIgKyBvcGVyYXRvcik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoYXJndW1lbnQuaGFzU3RhdGljVmFsdWUoKSkge1xuICAgICAgICAgICAgICAgIHJlc3VsdC5zZXRTdGF0aWNWYWx1ZShmdW5jKGFyZ3VtZW50LmdldFN0YXRpY1ZhbHVlKCkpKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmVzdWx0LnNldER5bmFtaWNWYWx1ZSgpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgIH0sXG5cblxuICAgICAgICBJZGVudGlmaWVyOiBmdW5jdGlvbiAobm9kZSwgY3R4KSB7XG4gICAgICAgICAgICB2YXIgcmVzdWx0ID0gbmV3IEFubm90YXRpb24obm9kZSksXG4gICAgICAgICAgICAgICAgbmFtZSA9IG5vZGUubmFtZTtcblxuICAgICAgICAgICAgaWYgKG5hbWUgPT09IFwidW5kZWZpbmVkXCIpIHtcbiAgICAgICAgICAgICAgICByZXN1bHQuc2V0VHlwZShUWVBFUy5VTkRFRklORUQpO1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcblxuXG5cbiAgICAgICAgTG9naWNhbEV4cHJlc3Npb246IGZ1bmN0aW9uIChub2RlLCBjdHgpIHtcbiAgICAgICAgICAgIHZhciBsZWZ0ID0gY3R4LmNyZWF0ZVR5cGVJbmZvKG5vZGUubGVmdCksXG4gICAgICAgICAgICAgICAgcmlnaHQgPSBjdHguY3JlYXRlVHlwZUluZm8obm9kZS5yaWdodCksXG4gICAgICAgICAgICAgICAgcmVzdWx0ID0gbmV3IEFubm90YXRpb24obm9kZSksXG4gICAgICAgICAgICAgICAgb3BlcmF0b3IgPSBub2RlLm9wZXJhdG9yO1xuXG4gICAgICAgICAgICBpZiAoIShvcGVyYXRvciA9PSBcIiYmXCIgfHwgb3BlcmF0b3IgPT0gXCJ8fFwiKSlcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJPcGVyYXRvciBub3Qgc3VwcG9ydGVkOiBcIiArIG5vZGUub3BlcmF0b3IpO1xuXG4gICAgICAgICAgICBpZiAobGVmdC5pc051bGxPclVuZGVmaW5lZCgpKSB7ICAvLyBldmFsdWF0ZXMgdG8gZmFsc2VcbiAgICAgICAgICAgICAgICBpZiAob3BlcmF0b3IgPT0gXCJ8fFwiKSB7ICAgICAgLy8gZmFsc2UgfHwgeCA9IHhcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0LmNvcHkocmlnaHQpO1xuICAgICAgICAgICAgICAgICAgICBsZWZ0LmVsaW1pbmF0ZSgpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7ICAgICAgICAgICAgICAgICAgICAgLy8gZmFsc2UgJiYgeCA9IGZhbHNlXG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdC5jb3B5KGxlZnQpO1xuICAgICAgICAgICAgICAgICAgICByaWdodC5lbGltaW5hdGUoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGxlZnQuaXNPYmplY3QoKSAmJiBvcGVyYXRvciA9PSBcInx8XCIpIHsgLy8gQW4gb2JqZWN0IHRoYXQgaXMgbm90IG51bGwgZXZhbHVhdGVzIHRvIHRydWVcbiAgICAgICAgICAgICAgICByZXN1bHQuY29weShsZWZ0KTtcbiAgICAgICAgICAgICAgICByaWdodC5lbGltaW5hdGUoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKGxlZnQuZ2V0VHlwZSgpID09IHJpZ2h0LmdldFR5cGUoKSkge1xuICAgICAgICAgICAgICAgIGlmIChsZWZ0LmlzT2JqZWN0KCkgJiYgbGVmdC5nZXRLaW5kKCkgIT0gcmlnaHQuZ2V0S2luZCgpKSB7XG4gICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIkNhbid0IGV2YWx1YXRlIGxvZ2ljYWwgZXhwcmVzc2lvbiB3aXRoIHR3byBkaWZmZXJlbnQga2luZCBvZiBvYmplY3RzXCIpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXN1bHQuY29weShsZWZ0KTsgLy8gVE9ETzogU3RhdGljIHZhbHVlP1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gV2UgZG9uJ3QgYWxsb3cgZHluYW1pYyB0eXBlcyAodGhlIHR5cGUgb2YgdGhlIHJlc3VsdCBkZXBlbmRzIG9uIHRoZSB2YWx1ZSBvZiBpdCdzIG9wZXJhbmRzKS5cbiAgICAgICAgICAgICAgICAvLyBBdCB0aGlzIHBvaW50LCB0aGUgZXhwcmVzc2lvbiBuZWVkcyB0byBldmFsdWF0ZSB0byBhIHJlc3VsdCwgb3RoZXJ3aXNlIGl0J3MgYW4gZXJyb3JcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJTdGF0aWMgZXZhbHVhdGlvbiBub3QgaW1wbGVtZW50ZWQgeWV0XCIpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuXG5cbiAgICAgICAgQmluYXJ5RXhwcmVzc2lvbjogZnVuY3Rpb24gKG5vZGUsIGN0eCkge1xuICAgICAgICAgICAgLy9jb25zb2xlLmxvZyhub2RlLmxlZnQsIG5vZGUucmlnaHQpO1xuICAgICAgICAgICAgdmFyIGxlZnQgPSBjdHguY3JlYXRlVHlwZUluZm8obm9kZS5sZWZ0KSxcbiAgICAgICAgICAgICAgICByaWdodCA9IGN0eC5jcmVhdGVUeXBlSW5mbyhub2RlLnJpZ2h0KSxcbiAgICAgICAgICAgICAgICByZXN1bHQgPSBuZXcgQW5ub3RhdGlvbihub2RlKSxcbiAgICAgICAgICAgICAgICBvcGVyYXRvciA9IG5vZGUub3BlcmF0b3IsXG4gICAgICAgICAgICAgICAgZnVuYyA9IEJpbmFyeUZ1bmN0aW9uc1tvcGVyYXRvcl07XG5cbiAgICAgICAgICAgIHN3aXRjaCAob3BlcmF0b3IpIHtcbiAgICAgICAgICAgICAgICBjYXNlIFwiK1wiOlxuICAgICAgICAgICAgICAgIGNhc2UgXCItXCI6XG4gICAgICAgICAgICAgICAgY2FzZSBcIipcIjpcbiAgICAgICAgICAgICAgICBjYXNlIFwiL1wiOlxuICAgICAgICAgICAgICAgIGNhc2UgXCIlXCI6XG4gICAgICAgICAgICAgICAgICAgIC8vIGludCAnb3AnIGludCA9PiBpbnRcbiAgICAgICAgICAgICAgICAgICAgLy8gaW50IC8gaW50ID0+IG51bWJlclxuICAgICAgICAgICAgICAgICAgICBpZiAobGVmdC5pc0ludCgpICYmIHJpZ2h0LmlzSW50KCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChvcGVyYXRvciA9PSBcIi9cIilcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXN1bHQuc2V0VHlwZShUWVBFUy5OVU1CRVIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc3VsdC5zZXRUeXBlKFRZUEVTLklOVCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgLy8gaW50ICdvcCcgbnVtYmVyID0+IG51bWJlclxuICAgICAgICAgICAgICAgICAgICBlbHNlIGlmIChsZWZ0LmlzSW50KCkgJiYgcmlnaHQuaXNOdW1iZXIoKSB8fCByaWdodC5pc0ludCgpICYmIGxlZnQuaXNOdW1iZXIoKSlcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc3VsdC5zZXRUeXBlKFRZUEVTLk5VTUJFUik7XG4gICAgICAgICAgICAgICAgICAgIC8vIG51bWJlciAnb3AnIG51bWJlciA9PiBudW1iZXJcbiAgICAgICAgICAgICAgICAgICAgZWxzZSBpZiAobGVmdC5pc051bWJlcigpICYmIHJpZ2h0LmlzTnVtYmVyKCkpXG4gICAgICAgICAgICAgICAgICAgICAgICByZXN1bHQuc2V0VHlwZShUWVBFUy5OVU1CRVIpO1xuICAgICAgICAgICAgICAgICAgICAvLyBpbnQgJ29wJyBudWxsID0+IGludFxuICAgICAgICAgICAgICAgICAgICBlbHNlIGlmIChsZWZ0LmlzSW50KCkgJiYgcmlnaHQuaXNOdWxsT3JVbmRlZmluZWQoKSB8fCByaWdodC5pc0ludCgpICYmIGxlZnQuaXNOdWxsT3JVbmRlZmluZWQoKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVzdWx0LnNldFR5cGUoVFlQRVMuSU5UKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAvLyBudW1iZXIgJ29wJyBudWxsID0+IG51bWJlclxuICAgICAgICAgICAgICAgICAgICBlbHNlIGlmICgobGVmdC5pc051bWJlcigpICYmIHJpZ2h0LmlzTnVsbE9yVW5kZWZpbmVkKCkpIHx8IChyaWdodC5pc051bWJlcigpICYmIGxlZnQuaXNOdWxsT3JVbmRlZmluZWQoKSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc3VsdC5zZXRUeXBlKFRZUEVTLk5VTUJFUik7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvL2NvbnNvbGUuZXJyb3Iobm9kZSwgbGVmdC5nZXRUeXBlKCksIG9wZXJhdG9yLCByaWdodC5nZXRUeXBlKCkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgU2hhZGUudGhyb3dFcnJvcihub2RlLCBcIkV2YWx1YXRlcyB0byBOYU46IFwiICsgbGVmdC5nZXRUeXBlU3RyaW5nKCkgKyBcIiBcIiArIG9wZXJhdG9yICsgXCIgXCIgKyByaWdodC5nZXRUeXBlU3RyaW5nKCkpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgXCI9PT1cIjpcbiAgICAgICAgICAgICAgICBjYXNlIFwiIT09XCI6XG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdC5zZXRUeXBlKFRZUEVTLkJPT0xFQU4pO1xuICAgICAgICAgICAgICAgICAgICBpZiAobGVmdC5pc1VuZGVmaW5lZCgpIHx8IHJpZ2h0LmlzVW5kZWZpbmVkKCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciB2YWx1ZSA9IGxlZnQuaXNVbmRlZmluZWQoKSAmJiByaWdodC5pc1VuZGVmaW5lZCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVzdWx0LnNldFN0YXRpY1ZhbHVlKG9wZXJhdG9yID09IFwiPT09XCIgPyB2YWx1ZSA6ICF2YWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSBcIj09XCI6IC8vIGNvbXBhcmlzb25cbiAgICAgICAgICAgICAgICBjYXNlIFwiIT1cIjpcbiAgICAgICAgICAgICAgICBjYXNlIFwiPlwiOlxuICAgICAgICAgICAgICAgIGNhc2UgXCI8XCI6XG4gICAgICAgICAgICAgICAgY2FzZSBcIj49XCI6XG4gICAgICAgICAgICAgICAgY2FzZSBcIjw9XCI6XG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdC5zZXRUeXBlKFRZUEVTLkJPT0xFQU4pO1xuICAgICAgICAgICAgICAgICAgICBpZiAobGVmdC5pc1VuZGVmaW5lZCgpIHx8IHJpZ2h0LmlzVW5kZWZpbmVkKCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciB2YWx1ZSA9IGxlZnQuaXNVbmRlZmluZWQoKSAmJiByaWdodC5pc1VuZGVmaW5lZCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVzdWx0LnNldFN0YXRpY1ZhbHVlKG9wZXJhdG9yID09IFwiIT1cIiA/ICF2YWx1ZSA6IHZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJPcGVyYXRvciBub3Qgc3VwcG9ydGVkOiBcIiArIG9wZXJhdG9yKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChsZWZ0Lmhhc1N0YXRpY1ZhbHVlKCkgJiYgcmlnaHQuaGFzU3RhdGljVmFsdWUoKSkge1xuICAgICAgICAgICAgICAgIC8vY29uc29sZS5sb2cobGVmdC5nZXRTdGF0aWNWYWx1ZSgpLCBvcGVyYXRvciwgcmlnaHQuZ2V0U3RhdGljVmFsdWUoKSk7XG4gICAgICAgICAgICAgICAgcmVzdWx0LnNldFN0YXRpY1ZhbHVlKGZ1bmMobGVmdC5nZXRTdGF0aWNWYWx1ZSgpLCByaWdodC5nZXRTdGF0aWNWYWx1ZSgpKSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJlc3VsdC5zZXREeW5hbWljVmFsdWUoKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICB9LFxuXG5cbiAgICAgICAgTWVtYmVyRXhwcmVzc2lvbjogZnVuY3Rpb24gKG5vZGUsIHBhcmVudCwgY3R4LCByb290KSB7XG4gICAgICAgICAgICB2YXIgcmVzdWx0VHlwZSA9IGN0eC5jcmVhdGVUeXBlSW5mbyhub2RlKSxcbiAgICAgICAgICAgICAgICBvYmplY3RBbm5vdGF0aW9uID0gbmV3IEFubm90YXRpb24obm9kZS5vYmplY3QpLFxuICAgICAgICAgICAgICAgIHByb3BlcnR5QW5ub3RhdGlvbiA9IG5ldyBBbm5vdGF0aW9uKG5vZGUucHJvcGVydHkpLFxuICAgICAgICAgICAgICAgIHByb3BlcnR5TmFtZSA9IG5vZGUucHJvcGVydHkubmFtZTtcblxuICAgICAgICAgICAgLy9jb25zb2xlLmxvZyhcIk1lbWJlclwiLCBub2RlLm9iamVjdC5uYW1lLCBub2RlLnByb3BlcnR5Lm5hbWUpO1xuICAgICAgICAgICAgaWYgKG5vZGUuY29tcHV0ZWQpIHtcbiAgICAgICAgICAgICAgICBpZiAob2JqZWN0QW5ub3RhdGlvbi5pc0FycmF5KCkpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gUHJvcGVydHkgaXMgY29tcHV0ZWQsIHRodXMgaXQgY291bGQgYmUgYSB2YXJpYWJsZVxuICAgICAgICAgICAgICAgICAgICB2YXIgcHJvcGVydHlUeXBlID0gIGN0eC5jcmVhdGVUeXBlSW5mbyhub2RlLnByb3BlcnR5KTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFwcm9wZXJ0eVR5cGUuY2FuSW50KCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIFNoYWRlLnRocm93RXJyb3Iobm9kZSwgXCJFeHBlY3RlZCAnaW50JyB0eXBlIGZvciBhcnJheSBhY2Nlc3NvclwiKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB2YXIgZWxlbWVudEluZm8gPSBvYmplY3RBbm5vdGF0aW9uLmdldEFycmF5RWxlbWVudFR5cGUoKTtcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0VHlwZS5zZXRUeXBlKGVsZW1lbnRJbmZvLnR5cGUsIGVsZW1lbnRJbmZvLmtpbmQpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBTaGFkZS50aHJvd0Vycm9yKG5vZGUsIFwiVHlwZUVycm9yOiBDYW5ub3QgcmVhZCBwcm9wZXJ0eSAnXCIrIHByb3BlcnR5TmFtZSArIFwiJyBvZiBcIiArIG9iamVjdEFubm90YXRpb24uZ2V0VHlwZVN0cmluZygpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHZhciBvYmplY3RPZkludGVyZXN0ID0gZ2V0T2JqZWN0UmVmZXJlbmNlRnJvbU5vZGUobm9kZS5vYmplY3QsIGN0eCk7XG5cbiAgICAgICAgICAgIG9iamVjdE9mSW50ZXJlc3QgfHwgU2hhZGUudGhyb3dFcnJvcihub2RlLFwiUmVmZXJlbmNlRXJyb3I6IFwiICsgbm9kZS5vYmplY3QubmFtZSArIFwiIGlzIG5vdCBkZWZpbmVkLiBDb250ZXh0OiBcIiArIGN0eC5zdHIoKSk7XG5cbiAgICAgICAgICAgIGlmIChvYmplY3RPZkludGVyZXN0LmdldFR5cGUoKSA9PSBUWVBFUy5VTkRFRklORUQpIHsgIC8vIGUuZy4gdmFyIGEgPSB1bmRlZmluZWQ7IGEudW5rbm93bjtcbiAgICAgICAgICAgICAgICBTaGFkZS50aHJvd0Vycm9yKG5vZGUsIFwiVHlwZUVycm9yOiBDYW5ub3QgcmVhZCBwcm9wZXJ0eSAnXCIrIHByb3BlcnR5TmFtZSArXCInIG9mIHVuZGVmaW5lZFwiKVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKG9iamVjdE9mSW50ZXJlc3QuZ2V0VHlwZSgpICE9IFRZUEVTLk9CSkVDVCkgeyAvLyBlLmcuIHZhciBhID0gNTsgYS51bmtub3duO1xuICAgICAgICAgICAgICAgIHJlc3VsdFR5cGUuc2V0VHlwZShUWVBFUy5VTkRFRklORUQpO1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdmFyIG9iamVjdEluZm8gPSBjdHguZ2V0T2JqZWN0SW5mb0ZvcihvYmplY3RPZkludGVyZXN0KTtcbiAgICAgICAgICAgIGlmKCFvYmplY3RJbmZvKVxuICAgICAgICAgICAgICAgIFNoYWRlLnRocm93RXJyb3Iobm9kZSwgXCJJbnRlcm5hbDogSW5jb21wbGV0ZSByZWdpc3RyYXRpb24gZm9yIG9iamVjdDogXCIgKyBvYmplY3RPZkludGVyZXN0LmdldFR5cGVTdHJpbmcoKSArIFwiLCBcIiArIEpTT04uc3RyaW5naWZ5KG5vZGUub2JqZWN0KSk7XG5cbiAgICAgICAgICAgIG9iamVjdEFubm90YXRpb24uY29weShvYmplY3RPZkludGVyZXN0KTtcbiAgICAgICAgICAgIGlmICghb2JqZWN0SW5mby5oYXNPd25Qcm9wZXJ0eShwcm9wZXJ0eU5hbWUpKSB7XG4gICAgICAgICAgICAgICAgcmVzdWx0VHlwZS5zZXRUeXBlKFRZUEVTLlVOREVGSU5FRCk7XG4gICAgICAgICAgICAgICAgcHJvcGVydHlBbm5vdGF0aW9uLnNldFR5cGUoVFlQRVMuVU5ERUZJTkVEKTtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHZhciBwcm9wZXJ0eVR5cGVJbmZvID0gb2JqZWN0SW5mb1twcm9wZXJ0eU5hbWVdO1xuICAgICAgICAgICAgcHJvcGVydHlBbm5vdGF0aW9uLnNldEZyb21FeHRyYShwcm9wZXJ0eVR5cGVJbmZvKTtcbiAgICAgICAgICAgIHJlc3VsdFR5cGUuc2V0RnJvbUV4dHJhKHByb3BlcnR5VHlwZUluZm8pO1xuICAgICAgICB9LFxuXG4gICAgICAgIENhbGxFeHByZXNzaW9uOiBmdW5jdGlvbiAobm9kZSwgY3R4LCByb290KSB7XG4gICAgICAgICAgICB2YXIgcmVzdWx0ID0gbmV3IEFubm90YXRpb24obm9kZSk7XG5cbiAgICAgICAgICAgIC8vIENhbGwgb24gYW4gb2JqZWN0LCBlLmcuIE1hdGguY29zKClcbiAgICAgICAgICAgIGlmIChub2RlLmNhbGxlZS50eXBlID09IFN5bnRheC5NZW1iZXJFeHByZXNzaW9uKSB7XG4gICAgICAgICAgICAgICAgdmFyIGNhbGxpbmdPYmplY3QgPSBnZXRPYmplY3RSZWZlcmVuY2VGcm9tTm9kZShub2RlLmNhbGxlZSwgY3R4KTtcblxuICAgICAgICAgICAgICAgIGlmICghY2FsbGluZ09iamVjdC5pc0Z1bmN0aW9uKCkpIHsgLy8gZS5nLiBNYXRoLlBJKClcbiAgICAgICAgICAgICAgICAgICAgU2hhZGUudGhyb3dFcnJvcihub2RlLCBcIlR5cGVFcnJvcjogT2JqZWN0ICM8XCIgKyBjYWxsaW5nT2JqZWN0LmdldFR5cGUoKSsgXCI+IGhhcyBubyBtZXRob2QgJ1wiKyBub2RlLmNhbGxlZS5wcm9wZXJ0eS5uYW1lICsgXCInXCIpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHZhciBvYmplY3QgPSBub2RlLmNhbGxlZS5vYmplY3QsXG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnR5TmFtZSA9IG5vZGUuY2FsbGVlLnByb3BlcnR5Lm5hbWU7XG5cbiAgICAgICAgICAgICAgICB2YXIgb2JqZWN0UmVmZXJlbmNlID0gZ2V0T2JqZWN0UmVmZXJlbmNlRnJvbU5vZGUob2JqZWN0LCBjdHgpO1xuICAgICAgICAgICAgICAgIGlmKCFvYmplY3RSZWZlcmVuY2UpICB7XG4gICAgICAgICAgICAgICAgICAgIFNoYWRlLnRocm93RXJyb3Iobm9kZSwgXCJJbnRlcm5hbDogTm8gb2JqZWN0IGluZm8gZm9yOiBcIiArIG9iamVjdCk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgdmFyIG9iamVjdEluZm8gPSBjdHguZ2V0T2JqZWN0SW5mb0ZvcihvYmplY3RSZWZlcmVuY2UpO1xuICAgICAgICAgICAgICAgIGlmKCFvYmplY3RJbmZvKSB7IC8vIEV2ZXJ5IG9iamVjdCBuZWVkcyBhbiBpbmZvLCBvdGhlcndpc2Ugd2UgZGlkIHNvbWV0aGluZyB3cm9uZ1xuICAgICAgICAgICAgICAgICAgICBTaGFkZS50aHJvd0Vycm9yKG5vZGUsIFwiSW50ZXJuYWwgRXJyb3I6IE5vIG9iamVjdCByZWdpc3RlcmVkIGZvcjogXCIgKyBvYmplY3RSZWZlcmVuY2UuZ2V0VHlwZVN0cmluZygpICsgSlNPTi5zdHJpbmdpZnkobm9kZS5vYmplY3QpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKG9iamVjdEluZm8uaGFzT3duUHJvcGVydHkocHJvcGVydHlOYW1lKSkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgcHJvcGVydHlIYW5kbGVyID0gb2JqZWN0SW5mb1twcm9wZXJ0eU5hbWVdO1xuICAgICAgICAgICAgICAgICAgICBpZiAodHlwZW9mIHByb3BlcnR5SGFuZGxlci5ldmFsdWF0ZSA9PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBhcmdzID0gQW5ub3RhdGlvbi5jcmVhdGVBbm5vdGF0ZWROb2RlQXJyYXkobm9kZS5hcmd1bWVudHMsIGN0eCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgZXh0cmEgPSBwcm9wZXJ0eUhhbmRsZXIuZXZhbHVhdGUocmVzdWx0LCBhcmdzLCBjdHgsIG9iamVjdFJlZmVyZW5jZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXN1bHQuc2V0RnJvbUV4dHJhKGV4dHJhKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gIGVsc2UgaWYgKG5vZGUuY2FsbGVlLnR5cGUgPT0gU3ludGF4LklkZW50aWZpZXIpIHtcbiAgICAgICAgICAgICAgICB2YXIgZnVuY3Rpb25OYW1lID0gbm9kZS5jYWxsZWUubmFtZTtcbiAgICAgICAgICAgICAgICB2YXIgZnVuYyA9IGN0eC5nZXRCaW5kaW5nQnlOYW1lKGZ1bmN0aW9uTmFtZSk7XG4gICAgICAgICAgICAgICAgaWYgKCFmdW5jKSB7XG4gICAgICAgICAgICAgICAgICAgIFNoYWRlLnRocm93RXJyb3Iobm9kZSwgXCJSZWZlcmVuY2VFcnJvcjogXCIgKyBmdW5jdGlvbk5hbWUgKyBcIiBpcyBub3QgZGVmaW5lZFwiKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYoIWZ1bmMuaXNGdW5jdGlvbigpKSB7XG4gICAgICAgICAgICAgICAgICAgIFNoYWRlLnRocm93RXJyb3Iobm9kZSwgXCJUeXBlRXJyb3I6IFwiICsgZnVuYy5nZXRUeXBlU3RyaW5nKCkgKyBcIiBpcyBub3QgYSBmdW5jdGlvblwiKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdmFyIGFyZ3MgPSBBbm5vdGF0aW9uLmNyZWF0ZUFubm90YXRlZE5vZGVBcnJheShub2RlLmFyZ3VtZW50cywgY3R4KTtcbiAgICAgICAgICAgICAgICB2YXIgZGVmaW5pbmdDb250ZXh0ID0gY3R4LmdldENvbnRleHRGb3JOYW1lKGZ1bmN0aW9uTmFtZSk7XG4gICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICB2YXIgZXh0cmEgPSByb290LmdldEZ1bmN0aW9uSW5mb3JtYXRpb25Gb3IoY3R4LmdldFZhcmlhYmxlSWRlbnRpZmllcihmdW5jdGlvbk5hbWUpLCBhcmdzLCBkZWZpbmluZ0NvbnRleHQpO1xuICAgICAgICAgICAgICAgIH0gY2F0Y2goZSkge1xuICAgICAgICAgICAgICAgICAgICBTaGFkZS50aHJvd0Vycm9yKG5vZGUsIFwiRmFpbHVyZSBpbiBmdW5jdGlvbiBjYWxsOiBcIiArIGUubWVzc2FnZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGV4dHJhICYmIHJlc3VsdC5zZXRGcm9tRXh0cmEoZXh0cmEpO1xuICAgICAgICAgICAgICAgIG5vZGUuY2FsbGVlLm5hbWUgPSBleHRyYS5uZXdOYW1lO1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8qY2FzZSBTeW50YXguSWRlbnRpZmllcjpcbiAgICAgICAgICAgICAgICAgICAgdmFyIGZ1bmN0aW9uTmFtZSA9IG5vZGUuY2FsbGVlLm5hbWU7XG4gICAgICAgICAgICAgICAgICAgIHZhciBmdW5jID0gY3R4LmdldEJpbmRpbmdCeU5hbWUoZnVuY3Rpb25OYW1lKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCEoZnVuYyAmJiBmdW5jLmlzSW5pdGlhbGl6ZWQoKSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihmdW5jdGlvbk5hbWUgKyBcIiBpcyBub3QgZGVmaW5lZC4gQ29udGV4dDogXCIgKyBjdHguc3RyKCkpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKGZ1bmMpO1xuICAgICAgICAgICAgICAgICAgICAvL3Rocm93IG5ldyBFcnJvcihcIkNhbid0IGNhbGwgXCIgKyBmdW5jdGlvbk5hbWUgKyBcIigpIGluIHRoaXMgY29udGV4dDogXCIgKyBjdHguc3RyKCkpO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBkZWZhdWx0OiAgICovXG4gICAgICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJVbmhhbmRsZWQgQ2FsbEV4cHJlc3Npb246XCIgKyBub2RlLmNhbGxlZS50eXBlKTtcblxuICAgICAgICB9XG4gICAgfTtcblxuICAgIHZhciBlbnRlckV4cHJlc3Npb24gPSBmdW5jdGlvbiAobm9kZSwgcGFyZW50LCBjdHgpIHtcbiAgICAgICAgaWYgKGVudGVySGFuZGxlcnMuaGFzT3duUHJvcGVydHkobm9kZS50eXBlKSkge1xuICAgICAgICAgICAgcmV0dXJuIGVudGVySGFuZGxlcnNbbm9kZS50eXBlXShub2RlLCBwYXJlbnQsIGN0eCwgdGhpcyk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgdmFyIGV4aXRFeHByZXNzaW9uID0gZnVuY3Rpb24gKG5vZGUsIHBhcmVudCwgY3R4KSB7XG5cbiAgICAgICAgc3dpdGNoIChub2RlLnR5cGUpIHtcbiAgICAgICAgICAgIGNhc2UgU3ludGF4LkFzc2lnbm1lbnRFeHByZXNzaW9uOlxuICAgICAgICAgICAgICAgIGhhbmRsZXJzLkFzc2lnbm1lbnRFeHByZXNzaW9uKG5vZGUsIGN0eCk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIFN5bnRheC5BcnJheUV4cHJlc3Npb246XG4gICAgICAgICAgICAgICAgbG9nKG5vZGUudHlwZSArIFwiIGlzIG5vdCBoYW5kbGUgeWV0LlwiKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgU3ludGF4LkFycmF5UGF0dGVybjpcbiAgICAgICAgICAgICAgICBsb2cobm9kZS50eXBlICsgXCIgaXMgbm90IGhhbmRsZSB5ZXQuXCIpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBTeW50YXguQmluYXJ5RXhwcmVzc2lvbjpcbiAgICAgICAgICAgICAgICBoYW5kbGVycy5CaW5hcnlFeHByZXNzaW9uKG5vZGUsIGN0eCk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIFN5bnRheC5DYWxsRXhwcmVzc2lvbjpcbiAgICAgICAgICAgICAgICBoYW5kbGVycy5DYWxsRXhwcmVzc2lvbihub2RlLCBjdHgsIHRoaXMpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBTeW50YXguQ29uZGl0aW9uYWxFeHByZXNzaW9uOlxuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBTeW50YXguRnVuY3Rpb25FeHByZXNzaW9uOlxuICAgICAgICAgICAgICAgIGxvZyhub2RlLnR5cGUgKyBcIiBpcyBub3QgaGFuZGxlIHlldC5cIik7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIFN5bnRheC5JZGVudGlmaWVyOlxuICAgICAgICAgICAgICAgIGhhbmRsZXJzLklkZW50aWZpZXIobm9kZSwgY3R4KTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgU3ludGF4LkxpdGVyYWw6XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIFN5bnRheC5Mb2dpY2FsRXhwcmVzc2lvbjpcbiAgICAgICAgICAgICAgICBoYW5kbGVycy5Mb2dpY2FsRXhwcmVzc2lvbihub2RlLCBjdHgpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBTeW50YXguTWVtYmVyRXhwcmVzc2lvbjpcbiAgICAgICAgICAgICAgICBoYW5kbGVycy5NZW1iZXJFeHByZXNzaW9uKG5vZGUsIHBhcmVudCwgY3R4LCB0aGlzKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgU3ludGF4Lk5ld0V4cHJlc3Npb246XG4gICAgICAgICAgICAgICAgaGFuZGxlcnMuTmV3RXhwcmVzc2lvbihub2RlLCBwYXJlbnQsIGN0eCk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIFN5bnRheC5PYmplY3RFeHByZXNzaW9uOlxuICAgICAgICAgICAgICAgIGxvZyhub2RlLnR5cGUgKyBcIiBpcyBub3QgaGFuZGxlIHlldC5cIik7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIFN5bnRheC5PYmplY3RQYXR0ZXJuOlxuICAgICAgICAgICAgICAgIGxvZyhub2RlLnR5cGUgKyBcIiBpcyBub3QgaGFuZGxlIHlldC5cIik7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIFN5bnRheC5Qcm9wZXJ0eTpcbiAgICAgICAgICAgICAgICBsb2cobm9kZS50eXBlICsgXCIgaXMgbm90IGhhbmRsZSB5ZXQuXCIpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBTeW50YXguU2VxdWVuY2VFeHByZXNzaW9uOlxuICAgICAgICAgICAgICAgIGxvZyhub2RlLnR5cGUgKyBcIiBpcyBub3QgaGFuZGxlIHlldC5cIik7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIFN5bnRheC5UaGlzRXhwcmVzc2lvbjpcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgU3ludGF4LlVuYXJ5RXhwcmVzc2lvbjpcbiAgICAgICAgICAgICAgICBoYW5kbGVycy5VbmFyeUV4cHJlc3Npb24obm9kZSwgY3R4KTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgU3ludGF4LlVwZGF0ZUV4cHJlc3Npb246XG4gICAgICAgICAgICAgICAgbG9nKG5vZGUudHlwZSArIFwiIGlzIG5vdCBoYW5kbGUgeWV0LlwiKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgU3ludGF4LllpZWxkRXhwcmVzc2lvbjpcbiAgICAgICAgICAgICAgICBsb2cobm9kZS50eXBlICsgXCIgaXMgbm90IGhhbmRsZSB5ZXQuXCIpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1Vua25vd24gbm9kZSB0eXBlOiAnICsgbm9kZS50eXBlKTtcblxuXG4gICAgICAgIH1cblxuICAgIH07XG5cblxuICAgIG5zLmVudGVyRXhwcmVzc2lvbiA9IGVudGVyRXhwcmVzc2lvbjtcbiAgICBucy5leGl0RXhwcmVzc2lvbiA9IGV4aXRFeHByZXNzaW9uO1xufShleHBvcnRzKSk7XG4iLCIoZnVuY3Rpb24gKG5zKSB7XG5cbiAgICB2YXIgd2FsayA9IHJlcXVpcmUoJ2VzdHJhdmVyc2UnKSxcbiAgICAgICAgZW50ZXJFeHByZXNzaW9uID0gcmVxdWlyZSgnLi9pbmZlcl9leHByZXNzaW9uLmpzJykuZW50ZXJFeHByZXNzaW9uLFxuICAgICAgICBleGl0RXhwcmVzc2lvbiA9IHJlcXVpcmUoJy4vaW5mZXJfZXhwcmVzc2lvbi5qcycpLmV4aXRFeHByZXNzaW9uLFxuICAgICAgICBTeW50YXggPSByZXF1aXJlKCdlc3RyYXZlcnNlJykuU3ludGF4LFxuICAgICAgICBUWVBFUyA9IHJlcXVpcmUoXCIuLi8uLi9pbnRlcmZhY2VzLmpzXCIpLlRZUEVTLFxuICAgICAgICBBbm5vdGF0aW9uID0gcmVxdWlyZShcIi4vLi4vLi4vYmFzZS9hbm5vdGF0aW9uLmpzXCIpLkFubm90YXRpb24sXG4gICAgICAgIEZ1bmN0aW9uQW5ub3RhdGlvbiA9IHJlcXVpcmUoXCIuLy4uLy4uL2Jhc2UvYW5ub3RhdGlvbi5qc1wiKS5GdW5jdGlvbkFubm90YXRpb247XG5cbiAgICB2YXIgbG9nID0gZnVuY3Rpb24oc3RyKSB7fTtcbiAgICAvL3ZhciBsb2cgPSBmdW5jdGlvbigpIHsgY29uc29sZS5sb2cuYXBwbHkoY29uc29sZSwgYXJndW1lbnRzKTsgfTtcblxuICAgIHZhciBlbnRlckhhbmRsZXIgPSB7XG4gICAgICAgIEZvclN0YXRlbWVudDogZnVuY3Rpb24obm9kZSwgY3R4LCByb290KSB7XG4gICAgICAgICAgICB2YXIgY3R4ID0gcm9vdC5jcmVhdGVDb250ZXh0KG5vZGUsIGN0eCk7XG4gICAgICAgICAgICByb290LnB1c2hDb250ZXh0KGN0eCk7XG5cbiAgICAgICAgICAgIHJvb3QudHJhdmVyc2Uobm9kZS5pbml0KTtcbiAgICAgICAgICAgIHJvb3QudHJhdmVyc2Uobm9kZS50ZXN0KTtcblxuICAgICAgICAgICAgdmFyIHRlc3QgPSBuZXcgQW5ub3RhdGlvbihub2RlLnRlc3QpO1xuICAgICAgICAgICAgaWYgKHRlc3QuaGFzU3RhdGljVmFsdWUoKSkgeyAvLyBHcmVhdCEgV2UgY2FuIGV2YWx1YXRlIGl0IVxuICAgICAgICAgICAgICAgIC8vIFRPRE9cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcm9vdC50cmF2ZXJzZShub2RlLnVwZGF0ZSk7XG4gICAgICAgICAgICByb290LnRyYXZlcnNlKG5vZGUuYm9keSk7XG4gICAgICAgICAgICByb290LnBvcENvbnRleHQoKTtcbiAgICAgICAgICAgIHJldHVybiB3YWxrLlZpc2l0b3JPcHRpb24uU2tpcDtcbiAgICAgICAgfSxcblxuICAgICAgICBJZlN0YXRlbWVudDogKGZ1bmN0aW9uKCkge1xuXG4gICAgICAgICAgICB2YXIgY19ldmFsdWF0ZSA9IGZ1bmN0aW9uKGV4cCkge1xuICAgICAgICAgICAgICAgIHJldHVybiAhIWV4cDtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKG5vZGUsIGN0eCwgcm9vdCkge1xuICAgICAgICAgICAgICAgIHJvb3QudHJhdmVyc2Uobm9kZS50ZXN0KTtcbiAgICAgICAgICAgICAgICB2YXIgdGVzdCA9IG5ldyBBbm5vdGF0aW9uKG5vZGUudGVzdCk7XG4gICAgICAgICAgICAgICAgaWYgKHRlc3QuaGFzU3RhdGljVmFsdWUoKSkgeyAvLyBHcmVhdCEgV2UgY2FuIGV2YWx1YXRlIGl0IVxuICAgICAgICAgICAgICAgICAgICAvL2NvbnNvbGUubG9nKFwiU3RhdGljIHZhbHVlIGluIGlmIHRlc3QhXCIpO1xuICAgICAgICAgICAgICAgICAgICB2YXIgdGVzdFJlc3VsdCA9IGNfZXZhbHVhdGUodGVzdC5nZXRTdGF0aWNWYWx1ZSgpKTtcbiAgICAgICAgICAgICAgICAgICAgaWYoIXRlc3RSZXN1bHQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChub2RlLmFsdGVybmF0ZSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByb290LnRyYXZlcnNlKG5vZGUuYWx0ZXJuYXRlKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGNvbnNlcXVlbnQgPSBuZXcgQW5ub3RhdGlvbihub2RlLmNvbnNlcXVlbnQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc2VxdWVudC5lbGltaW5hdGUoKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJvb3QudHJhdmVyc2Uobm9kZS5jb25zZXF1ZW50KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmKG5vZGUuYWx0ZXJuYXRlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGFsdGVybmF0ZSA9IG5ldyBBbm5vdGF0aW9uKG5vZGUuYWx0ZXJuYXRlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhbHRlcm5hdGUuZWxpbWluYXRlKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHdhbGsuVmlzaXRvck9wdGlvbi5Ta2lwO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSgpKSxcblxuICAgICAgICBWYXJpYWJsZURlY2xhcmF0aW9uOiBmdW5jdGlvbihub2RlLCBjdHgpIHtcbiAgICAgICAgICAgIGN0eC5pbkRlY2xhcmF0aW9uID0gdHJ1ZTtcbiAgICAgICAgfSxcblxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBAcGFyYW0ge09iamVjdH0gbm9kZVxuICAgICAgICAgKiBAcGFyYW0ge0NvbnRleHR9IHBhcmVudENvbnRleHRcbiAgICAgICAgICogQHBhcmFtIHtUeXBlSW5mZXJlbmNlfSByb290XG4gICAgICAgICAqL1xuICAgICAgICBGdW5jdGlvbkRlY2xhcmF0aW9uOiBmdW5jdGlvbihub2RlLCBwYXJlbnRDb250ZXh0LCByb290KSB7XG4gICAgICAgICAgICB2YXIgcmVzdWx0ID0gbmV3IEZ1bmN0aW9uQW5ub3RhdGlvbihub2RlKTtcblxuICAgICAgICAgICAgaWYgKG5vZGUuaWQudHlwZSAhPSBTeW50YXguSWRlbnRpZmllcikge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIkR5bmFtaWMgdmFyaWFibGUgbmFtZXMgYXJlIG5vdCB5ZXQgc3VwcG9ydGVkXCIpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFyIGZ1bmN0aW9uTmFtZSA9IG5vZGUuaWQubmFtZTtcbiAgICAgICAgICAgIHZhciBmdW5jdGlvbkNvbnRleHQgPSByb290LmNyZWF0ZUNvbnRleHQobm9kZSwgcGFyZW50Q29udGV4dCwgZnVuY3Rpb25OYW1lKTtcbiAgICAgICAgICAgIGZ1bmN0aW9uQ29udGV4dC5kZWNsYXJlUGFyYW1ldGVycyhub2RlLnBhcmFtcyk7XG4gICAgICAgICAgICByb290LnB1c2hDb250ZXh0KGZ1bmN0aW9uQ29udGV4dCk7XG4gICAgICAgICAgICBpZihmdW5jdGlvbkNvbnRleHQuc3RyKCkgIT0gcm9vdC5lbnRyeVBvaW50KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHdhbGsuVmlzaXRvck9wdGlvbi5Ta2lwO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgdmFyIGV4aXRIYW5kbGVyID0ge1xuICAgICAgICAvKipcbiAgICAgICAgICogQHBhcmFtIG5vZGVcbiAgICAgICAgICogQHBhcmFtIHtDb250ZXh0fSBjdHhcbiAgICAgICAgICogQHBhcmFtIHtUeXBlSW5mZXJlbmNlfSByb290XG4gICAgICAgICAqL1xuICAgICAgICBGdW5jdGlvbkRlY2xhcmF0aW9uOiBmdW5jdGlvbihub2RlLCBjdHgsIHJvb3QpIHtcbiAgICAgICAgICAgIHZhciByZXN1bHQgPSBuZXcgRnVuY3Rpb25Bbm5vdGF0aW9uKG5vZGUpO1xuICAgICAgICAgICAgdmFyIHJldHVybkluZm8gPSBjdHguZ2V0UmV0dXJuSW5mbygpO1xuICAgICAgICAgICAgcmVzdWx0LnNldFJldHVybkluZm8ocmV0dXJuSW5mbyB8fCB7IHR5cGU6IFRZUEVTLlVOREVGSU5FRCB9KTtcbiAgICAgICAgICAgIHJvb3QucG9wQ29udGV4dCgpO1xuICAgICAgICB9LFxuICAgICAgICBWYXJpYWJsZURlY2xhcmF0aW9uOiBmdW5jdGlvbihub2RlLCBjdHgpIHtcbiAgICAgICAgICAgIGN0eC5pbkRlY2xhcmF0aW9uID0gZmFsc2U7XG4gICAgICAgIH0sXG4gICAgICAgIFZhcmlhYmxlRGVjbGFyYXRvcjogZnVuY3Rpb24obm9kZSwgY3R4KSB7XG4gICAgICAgICAgICB2YXIgcmVzdWx0ID0gbmV3IEFubm90YXRpb24obm9kZSk7XG5cbiAgICAgICAgICAgIGlmIChub2RlLmlkLnR5cGUgIT0gU3ludGF4LklkZW50aWZpZXIpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJEeW5hbWljIHZhcmlhYmxlIG5hbWVzIGFyZSBub3QgeWV0IHN1cHBvcnRlZFwiKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZhciB2YXJpYWJsZU5hbWUgPSBub2RlLmlkLm5hbWU7XG4gICAgICAgICAgICBjdHguZGVjbGFyZVZhcmlhYmxlKHZhcmlhYmxlTmFtZSwgdHJ1ZSwgcmVzdWx0KTtcblxuICAgICAgICAgICAgaWYgKG5vZGUuaW5pdCkge1xuICAgICAgICAgICAgICAgIHZhciBpbml0ID0gY3R4LmNyZWF0ZVR5cGVJbmZvKG5vZGUuaW5pdCk7XG4gICAgICAgICAgICAgICAgcmVzdWx0LmNvcHkoaW5pdCk7XG4gICAgICAgICAgICAgICAgY3R4LnVwZGF0ZUV4cHJlc3Npb24odmFyaWFibGVOYW1lLCBpbml0KTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmVzdWx0LnNldFR5cGUoVFlQRVMuVU5ERUZJTkVEKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIFRPRE86IHJlc3VsdC5zZXRUeXBlKGluaXQuZ2V0VHlwZSgpKTtcbiAgICAgICAgfSxcbiAgICAgICAgUmV0dXJuU3RhdGVtZW50OiBmdW5jdGlvbihub2RlLCBwYXJlbnQsIGN0eCkge1xuICAgICAgICAgICAgdmFyIHJlc3VsdCA9IG5ldyBBbm5vdGF0aW9uKG5vZGUpLFxuICAgICAgICAgICAgICAgIGFyZ3VtZW50ID0gbm9kZS5hcmd1bWVudCA/IGN0eC5jcmVhdGVUeXBlSW5mbyhub2RlLmFyZ3VtZW50KSA6IG51bGw7XG5cbiAgICAgICAgICAgIGlmIChhcmd1bWVudCkge1xuICAgICAgICAgICAgICAgIHJlc3VsdC5jb3B5KGFyZ3VtZW50KTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmVzdWx0LnNldFR5cGUoVFlQRVMuVU5ERUZJTkVEKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGN0eC51cGRhdGVSZXR1cm5JbmZvKHJlc3VsdCk7XG4gICAgICAgIH1cblxuICAgIH1cblxuXG5cblxuICAgIHZhciBlbnRlclN0YXRlbWVudCA9IGZ1bmN0aW9uIChub2RlLCBwYXJlbnQsIGN0eCkge1xuICAgICAgICBzd2l0Y2ggKG5vZGUudHlwZSkge1xuICAgICAgICAgICAgY2FzZSBTeW50YXguRm9yU3RhdGVtZW50OlxuICAgICAgICAgICAgICAgIHJldHVybiBlbnRlckhhbmRsZXIuRm9yU3RhdGVtZW50KG5vZGUsIGN0eCwgdGhpcyk7XG4gICAgICAgICAgICBjYXNlIFN5bnRheC5JZlN0YXRlbWVudDpcbiAgICAgICAgICAgICAgICByZXR1cm4gZW50ZXJIYW5kbGVyLklmU3RhdGVtZW50KG5vZGUsIGN0eCwgdGhpcyk7XG4gICAgICAgICAgICBjYXNlIFN5bnRheC5WYXJpYWJsZURlY2xhcmF0aW9uOlxuICAgICAgICAgICAgICAgIHJldHVybiBlbnRlckhhbmRsZXIuVmFyaWFibGVEZWNsYXJhdGlvbihub2RlLCBjdHgpO1xuICAgICAgICAgICAgY2FzZSBTeW50YXguRnVuY3Rpb25EZWNsYXJhdGlvbjpcbiAgICAgICAgICAgICAgICByZXR1cm4gZW50ZXJIYW5kbGVyLkZ1bmN0aW9uRGVjbGFyYXRpb24obm9kZSwgY3R4LCB0aGlzKTtcblxuICAgICAgICB9XG4gICAgICAgIHJldHVybjtcblxuXG4gICAgfTtcblxuICAgIHZhciBleGl0U3RhdGVtZW50ID0gZnVuY3Rpb24gKG5vZGUsIHBhcmVudCwgY3R4KSB7XG5cbiAgICAgICAgc3dpdGNoIChub2RlLnR5cGUpIHtcbiAgICAgICAgICAgIGNhc2UgU3ludGF4LkV4cHJlc3Npb25TdGF0ZW1lbnQ6XG4gICAgICAgICAgICAgICAgdmFyIHJlc3VsdCA9IG5ldyBBbm5vdGF0aW9uKG5vZGUpLFxuICAgICAgICAgICAgICAgICAgICBleHByZXNzaW9uID0gbmV3IEFubm90YXRpb24obm9kZS5leHByZXNzaW9uKTtcblxuICAgICAgICAgICAgICAgIHJlc3VsdC5jb3B5KGV4cHJlc3Npb24pO1xuXG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIFN5bnRheC5CbG9ja1N0YXRlbWVudDpcbiAgICAgICAgICAgICAgICBsb2cobm9kZS50eXBlICsgXCIgaXMgbm90IGhhbmRsZSB5ZXQuXCIpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBTeW50YXguQnJlYWtTdGF0ZW1lbnQ6XG4gICAgICAgICAgICAgICAgbG9nKG5vZGUudHlwZSArIFwiIGlzIG5vdCBoYW5kbGUgeWV0LlwiKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgU3ludGF4LkNhdGNoQ2xhdXNlOlxuICAgICAgICAgICAgICAgIGxvZyhub2RlLnR5cGUgKyBcIiBpcyBub3QgaGFuZGxlIHlldC5cIik7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIFN5bnRheC5Db250aW51ZVN0YXRlbWVudDpcbiAgICAgICAgICAgICAgICBsb2cobm9kZS50eXBlICsgXCIgaXMgbm90IGhhbmRsZSB5ZXQuXCIpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBTeW50YXguRGlyZWN0aXZlU3RhdGVtZW50OlxuICAgICAgICAgICAgICAgIGxvZyhub2RlLnR5cGUgKyBcIiBpcyBub3QgaGFuZGxlIHlldC5cIik7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIFN5bnRheC5Eb1doaWxlU3RhdGVtZW50OlxuICAgICAgICAgICAgICAgIGxvZyhub2RlLnR5cGUgKyBcIiBpcyBub3QgaGFuZGxlIHlldC5cIik7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIFN5bnRheC5EZWJ1Z2dlclN0YXRlbWVudDpcbiAgICAgICAgICAgICAgICBsb2cobm9kZS50eXBlICsgXCIgaXMgbm90IGhhbmRsZSB5ZXQuXCIpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBTeW50YXguRW1wdHlTdGF0ZW1lbnQ6XG4gICAgICAgICAgICAgICAgbG9nKG5vZGUudHlwZSArIFwiIGlzIG5vdCBoYW5kbGUgeWV0LlwiKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgU3ludGF4LkZvclN0YXRlbWVudDpcbiAgICAgICAgICAgICAgICBsb2cobm9kZS50eXBlICsgXCIgaXMgbm90IGhhbmRsZSB5ZXQuXCIpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBTeW50YXguRm9ySW5TdGF0ZW1lbnQ6XG4gICAgICAgICAgICAgICAgbG9nKG5vZGUudHlwZSArIFwiIGlzIG5vdCBoYW5kbGUgeWV0LlwiKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgU3ludGF4LkZ1bmN0aW9uRGVjbGFyYXRpb246XG4gICAgICAgICAgICAgICAgcmV0dXJuIGV4aXRIYW5kbGVyLkZ1bmN0aW9uRGVjbGFyYXRpb24obm9kZSwgY3R4LCB0aGlzKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgU3ludGF4LklmU3RhdGVtZW50OlxuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBTeW50YXguTGFiZWxlZFN0YXRlbWVudDpcbiAgICAgICAgICAgICAgICBsb2cobm9kZS50eXBlICsgXCIgaXMgbm90IGhhbmRsZSB5ZXQuXCIpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBTeW50YXguUHJvZ3JhbTpcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgU3ludGF4LlJldHVyblN0YXRlbWVudDpcbiAgICAgICAgICAgICAgICByZXR1cm4gZXhpdEhhbmRsZXIuUmV0dXJuU3RhdGVtZW50KG5vZGUsIHBhcmVudCwgY3R4KTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgU3ludGF4LlN3aXRjaFN0YXRlbWVudDpcbiAgICAgICAgICAgICAgICBsb2cobm9kZS50eXBlICsgXCIgaXMgbm90IGhhbmRsZSB5ZXQuXCIpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBTeW50YXguU3dpdGNoQ2FzZTpcbiAgICAgICAgICAgICAgICBsb2cobm9kZS50eXBlICsgXCIgaXMgbm90IGhhbmRsZSB5ZXQuXCIpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBTeW50YXguVGhyb3dTdGF0ZW1lbnQ6XG4gICAgICAgICAgICAgICAgbG9nKG5vZGUudHlwZSArIFwiIGlzIG5vdCBoYW5kbGUgeWV0LlwiKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgU3ludGF4LlRyeVN0YXRlbWVudDpcbiAgICAgICAgICAgICAgICBsb2cobm9kZS50eXBlICsgXCIgaXMgbm90IGhhbmRsZSB5ZXQuXCIpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBTeW50YXguVmFyaWFibGVEZWNsYXJhdGlvbjpcbiAgICAgICAgICAgICAgICByZXR1cm4gZXhpdEhhbmRsZXIuVmFyaWFibGVEZWNsYXJhdGlvbihub2RlLCBjdHgpO1xuICAgICAgICAgICAgY2FzZSBTeW50YXguVmFyaWFibGVEZWNsYXJhdG9yOlxuICAgICAgICAgICAgICAgIGV4aXRIYW5kbGVyLlZhcmlhYmxlRGVjbGFyYXRvcihub2RlLCBjdHgpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBTeW50YXguV2hpbGVTdGF0ZW1lbnQ6XG4gICAgICAgICAgICAgICAgbG9nKG5vZGUudHlwZSArIFwiIGlzIG5vdCBoYW5kbGUgeWV0LlwiKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgU3ludGF4LldpdGhTdGF0ZW1lbnQ6XG4gICAgICAgICAgICAgICAgbG9nKG5vZGUudHlwZSArIFwiIGlzIG5vdCBoYW5kbGUgeWV0LlwiKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdVbmtub3duIG5vZGUgdHlwZTogJyArIG5vZGUudHlwZSk7XG4gICAgICAgIH1cblxuICAgIH07XG5cbiAgICBucy5lbnRlclN0YXRlbWVudCA9IGVudGVyU3RhdGVtZW50O1xuICAgIG5zLmV4aXRTdGF0ZW1lbnQgPSBleGl0U3RhdGVtZW50O1xufShleHBvcnRzKSk7XG4iLCIoZnVuY3Rpb24obnMpe1xuXG4gICAgdmFyIFNoYWRlID0gcmVxdWlyZShcIi4uLy4uLy4uL2ludGVyZmFjZXMuanNcIiksXG4gICAgICAgIFRZUEVTID0gU2hhZGUuVFlQRVMsXG4gICAgICAgIEtJTkRTID0gU2hhZGUuT0JKRUNUX0tJTkRTLFxuICAgICAgICBUb29scyA9IHJlcXVpcmUoXCIuL3Rvb2xzLmpzXCIpO1xuXG4gICAgdmFyIENvbG9yQ2xvc3VyZUluc3RhbmNlID0ge1xuICAgICAgICBtdWx0aXBseToge1xuICAgICAgICAgICAgdHlwZTogVFlQRVMuRlVOQ1RJT04sXG4gICAgICAgICAgICBldmFsdWF0ZTogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogVFlQRVMuT0JKRUNULFxuICAgICAgICAgICAgICAgICAgICBraW5kOiBLSU5EUy5DT0xPUl9DTE9TVVJFXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgYWRkOiB7XG4gICAgICAgICAgICB0eXBlOiBUWVBFUy5GVU5DVElPTixcbiAgICAgICAgICAgIGV2YWx1YXRlOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiBUWVBFUy5PQkpFQ1QsXG4gICAgICAgICAgICAgICAgICAgIGtpbmQ6IEtJTkRTLkNPTE9SX0NMT1NVUkVcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfTtcblxuICAgIFRvb2xzLmV4dGVuZChucywge1xuICAgICAgICBpZDogXCJDb2xvckNsb3N1cmVcIixcbiAgICAgICAga2luZDogS0lORFMuQ09MT1JfQ0xPU1VSRSxcbiAgICAgICAgb2JqZWN0OiBudWxsLFxuICAgICAgICBpbnN0YW5jZTogQ29sb3JDbG9zdXJlSW5zdGFuY2VcbiAgICB9KTtcblxuXG59KGV4cG9ydHMpKTtcbiIsIihmdW5jdGlvbiAobnMpIHtcblxuICAgIHZhciBvYmplY3RzID0ge1xuICAgICAgICBTaGFkZSA6IHJlcXVpcmUoXCIuL3NoYWRlLmpzXCIpLFxuICAgICAgICBNYXRyaXg0IDogcmVxdWlyZShcIi4vbWF0cml4LmpzXCIpLFxuICAgICAgICBNYXRoIDogcmVxdWlyZShcIi4vbWF0aC5qc1wiKSxcbiAgICAgICAgVmVjMiA6IHJlcXVpcmUoXCIuL3ZlYzIuanNcIiksXG4gICAgICAgIFZlYzMgOiByZXF1aXJlKFwiLi92ZWMzLmpzXCIpLFxuICAgICAgICBDb2xvcjogcmVxdWlyZShcIi4vdmVjMy5qc1wiKSxcbiAgICAgICAgVmVjNCA6IHJlcXVpcmUoXCIuL3ZlYzQuanNcIiksXG4gICAgICAgIFRleHR1cmUgOiByZXF1aXJlKFwiLi90ZXh0dXJlLmpzXCIpLFxuICAgICAgICBTeXN0ZW06IHJlcXVpcmUoXCIuL3N5c3RlbS5qc1wiKSxcbiAgICAgICAgQ29sb3JDbG9zdXJlOiByZXF1aXJlKFwiLi9jb2xvcmNsb3N1cmUuanNcIilcbiAgICB9O1xuXG4gICAgZXhwb3J0cy5SZWdpc3RyeSA9IHtcbiAgICAgICAgbmFtZTogXCJUeXBlSW5mZXJlbmNlXCIsXG4gICAgICAgIGdldEJ5TmFtZTogZnVuY3Rpb24obmFtZSkge1xuICAgICAgICAgICAgdmFyIHJlc3VsdCA9IG9iamVjdHNbbmFtZV07XG4gICAgICAgICAgICByZXR1cm4gcmVzdWx0IHx8IG51bGw7XG4gICAgICAgIH0sXG4gICAgICAgIGdldEluc3RhbmNlRm9yS2luZDogZnVuY3Rpb24oa2luZCkge1xuICAgICAgICAgICAgZm9yKHZhciBvYmogaW4gb2JqZWN0cykge1xuICAgICAgICAgICAgICAgIGlmIChvYmplY3RzW29ial0ua2luZCA9PSBraW5kKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBvYmplY3RzW29ial0uaW5zdGFuY2U7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH1cbiAgICB9XG5cbn0oZXhwb3J0cykpO1xuIiwiKGZ1bmN0aW9uIChucykge1xuXG4gICAgdmFyIFNoYWRlID0gcmVxdWlyZShcIi4uLy4uLy4uL2ludGVyZmFjZXMuanNcIiksXG4gICAgICAgIFRZUEVTID0gU2hhZGUuVFlQRVMsXG4gICAgICAgIEJhc2UgPSByZXF1aXJlKFwiLi4vLi4vLi4vYmFzZS9pbmRleC5qc1wiKSxcbiAgICAgICAgVG9vbHMgPSByZXF1aXJlKFwiLi90b29scy5qc1wiKTtcblxuXG4gICAgdmFyIGV2YWx1YXRlTWV0aG9kID0gZnVuY3Rpb24gKG5hbWUsIHBhcmFtQ291bnQsIHJldHVyblR5cGUpIHtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIEBwYXJhbSB7QW5ub3RhdGlvbn0gcmVzdWx0XG4gICAgICAgICAqIEBwYXJhbSB7QXJyYXkuPEFubm90YXRpb24+fSBhcmdzXG4gICAgICAgICAqIEBwYXJhbSB7Q29udGV4dH0gY3R4XG4gICAgICAgICAqL1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24gKHJlc3VsdCwgYXJncywgY3R4KSB7XG4gICAgICAgICAgICBpZiAocGFyYW1Db3VudCAhPSAtMSkgeyAvLyBBcmJpdHJhcnkgbnVtYmVyIG9mIGFyZ3VtZW50c1xuICAgICAgICAgICAgICAgIGlmICghYXJncyB8fCBhcmdzLmxlbmd0aCAhPSBwYXJhbUNvdW50KSB7XG4gICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIkludmFsaWQgbnVtYmVyIG9mIHBhcmFtZXRlcnMgZm9yIE1hdGguXCIgKyBuYW1lICsgXCIsIGV4cGVjdGVkIFwiICsgcGFyYW1Db3VudCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB2YXIgYXJnQXJyYXkgPSBbXTtcbiAgICAgICAgICAgIHZhciBpc1N0YXRpYyA9IHRydWU7XG4gICAgICAgICAgICBhcmdzLmZvckVhY2goZnVuY3Rpb24gKHBhcmFtLCBpbmRleCkge1xuICAgICAgICAgICAgICAgIGlmICghcGFyYW0uY2FuTnVtYmVyKCkpXG4gICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIlBhcmFtZXRlciBcIiArIGluZGV4ICsgXCIgaGFzIGludmFsaWQgdHlwZSBmb3IgTWF0aC5cIiArIG5hbWUgKyBcIiwgZXhwZWN0ZWQgJ251bWJlcicsIGJ1dCBnb3QgXCIgKyBwYXJhbS5nZXRUeXBlKCkpO1xuICAgICAgICAgICAgICAgIGlzU3RhdGljID0gaXNTdGF0aWMgJiYgcGFyYW0uaGFzU3RhdGljVmFsdWUoKTtcbiAgICAgICAgICAgICAgICBpZiAoaXNTdGF0aWMpXG4gICAgICAgICAgICAgICAgICAgIGFyZ0FycmF5LnB1c2gocGFyYW0uZ2V0U3RhdGljVmFsdWUoKSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHZhciB0eXBlSW5mbyA9IHtcbiAgICAgICAgICAgICAgICB0eXBlOiByZXR1cm5UeXBlIHx8IFRZUEVTLk5VTUJFUlxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGlzU3RhdGljKSB7XG4gICAgICAgICAgICAgICAgdHlwZUluZm8uc3RhdGljVmFsdWUgPSBNYXRoW25hbWVdLmFwcGx5KHVuZGVmaW5lZCwgYXJnQXJyYXkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHR5cGVJbmZvO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgdmFyIE1hdGhPYmplY3QgPSB7XG4gICAgICAgIHJhbmRvbToge1xuICAgICAgICAgICAgdHlwZTogVFlQRVMuRlVOQ1RJT04sXG4gICAgICAgICAgICBldmFsdWF0ZTogZnVuY3Rpb24obm9kZSwgYXJncykge1xuICAgICAgICAgICAgICAgIGlmIChhcmdzLmxlbmd0aClcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiTWF0aC5yYW5kb20gaGFzIG5vIHBhcmFtZXRlcnMuXCIpO1xuICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IFRZUEVTLk5VTUJFUlxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgYWJzOiB7XG4gICAgICAgICAgICB0eXBlOiBUWVBFUy5GVU5DVElPTixcbiAgICAgICAgICAgIGV2YWx1YXRlOiBmdW5jdGlvbihyZXN1bHQsIGFyZ3MpIHtcbiAgICAgICAgICAgICAgICBUb29scy5jaGVja1BhcmFtQ291bnQocmVzdWx0Lm5vZGUsIFwiTWF0aC5hYnNcIiwgWzFdLCBhcmdzLmxlbmd0aCk7XG4gICAgICAgICAgICAgICAgdmFyIHR5cGVJbmZvID0ge307XG4gICAgICAgICAgICAgICAgc3dpdGNoKGFyZ3NbMF0uZ2V0VHlwZSgpKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgVFlQRVMuTlVNQkVSOlxuICAgICAgICAgICAgICAgICAgICBjYXNlIFRZUEVTLklOVDpcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGVJbmZvLnR5cGUgPSBhcmdzWzBdLmdldFR5cGUoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgICAgICAgICAgU2hhZGUudGhyb3dFcnJvcihyZXN1bHQubm9kZSwgXCJJbnZhbGlkVHlwZSBmb3IgTWF0aC5hYnNcIik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiB0eXBlSW5mbztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH07XG5cbiAgICB2YXIgTWF0aENvbnN0YW50cyA9IFtcIkVcIiwgXCJQSVwiLCBcIkxOMlwiLCBcIkxPRzJFXCIsIFwiTE9HMTBFXCIsIFwiUElcIiwgXCJTUVJUMV8yXCIsIFwiU1FSVDJcIl07XG4gICAgdmFyIE9uZVBhcmFtZXRlck51bWJlck1ldGhvZHMgPSBbXCJhY29zXCIsIFwiYXNpblwiLCBcImF0YW5cIiwgXCJjb3NcIiwgXCJleHBcIiwgXCJsb2dcIiwgXCJyb3VuZFwiLCBcInNpblwiLCBcInNxcnRcIiwgXCJ0YW5cIl07XG4gICAgdmFyIE9uZVBhcmFtZXRlckludE1ldGhvZHMgPSBbXCJjZWlsXCIsIFwiZmxvb3JcIl07XG4gICAgdmFyIFR3b1BhcmFtZXRlck51bWJlck1ldGhvZHMgPSBbXCJhdGFuMlwiLCBcInBvd1wiXTtcbiAgICB2YXIgQXJiaXRyYXJ5UGFyYW1ldGVyTnVtYmVyTWV0aG9kcyA9IFtcIm1heFwiLCBcIm1pblwiXTtcblxuICAgIE1hdGhDb25zdGFudHMuZm9yRWFjaChmdW5jdGlvbiAoY29uc3RhbnQpIHtcbiAgICAgICAgTWF0aE9iamVjdFtjb25zdGFudF0gPSB7IHR5cGU6IFRZUEVTLk5VTUJFUiwgc3RhdGljVmFsdWU6IE1hdGhbY29uc3RhbnRdIH07XG4gICAgfSk7XG5cbiAgICBPbmVQYXJhbWV0ZXJOdW1iZXJNZXRob2RzLmZvckVhY2goZnVuY3Rpb24gKG1ldGhvZCkge1xuICAgICAgICBNYXRoT2JqZWN0W21ldGhvZF0gPSB7IHR5cGU6IFRZUEVTLkZVTkNUSU9OLCBldmFsdWF0ZTogZXZhbHVhdGVNZXRob2QobWV0aG9kLCAxKSB9O1xuICAgIH0pO1xuXG4gICAgVHdvUGFyYW1ldGVyTnVtYmVyTWV0aG9kcy5mb3JFYWNoKGZ1bmN0aW9uIChtZXRob2QpIHtcbiAgICAgICAgTWF0aE9iamVjdFttZXRob2RdID0geyB0eXBlOiBUWVBFUy5GVU5DVElPTiwgZXZhbHVhdGU6IGV2YWx1YXRlTWV0aG9kKG1ldGhvZCwgMikgfTtcbiAgICB9KTtcblxuICAgIE9uZVBhcmFtZXRlckludE1ldGhvZHMuZm9yRWFjaChmdW5jdGlvbiAobWV0aG9kKSB7XG4gICAgICAgIE1hdGhPYmplY3RbbWV0aG9kXSA9IHsgdHlwZTogVFlQRVMuRlVOQ1RJT04sIGV2YWx1YXRlOiBldmFsdWF0ZU1ldGhvZChtZXRob2QsIDEsIFRZUEVTLklOVCkgfTtcbiAgICB9KTtcblxuICAgIEFyYml0cmFyeVBhcmFtZXRlck51bWJlck1ldGhvZHMuZm9yRWFjaChmdW5jdGlvbiAobWV0aG9kKSB7XG4gICAgICAgIE1hdGhPYmplY3RbbWV0aG9kXSA9IHsgdHlwZTogVFlQRVMuRlVOQ1RJT04sIGV2YWx1YXRlOiBldmFsdWF0ZU1ldGhvZChtZXRob2QsIC0xKSB9O1xuICAgIH0pO1xuXG4gICAgQmFzZS5leHRlbmQobnMsIHtcbiAgICAgICAgaWQ6IFwiTWF0aFwiLFxuICAgICAgICBvYmplY3Q6IHtcbiAgICAgICAgICAgIGNvbnN0cnVjdG9yOiBudWxsLFxuICAgICAgICAgICAgc3RhdGljOiBNYXRoT2JqZWN0XG4gICAgICAgIH0sXG4gICAgICAgIGluc3RhbmNlOiBNYXRoT2JqZWN0XG4gICAgfSk7XG5cblxufShleHBvcnRzKSk7XG4iLCIoZnVuY3Rpb24gKG5zKSB7XG5cbiAgICB2YXIgaW50ZXJmYWNlcyA9IHJlcXVpcmUoXCIuLi8uLi8uLi9pbnRlcmZhY2VzLmpzXCIpLFxuICAgIFRvb2xzID0gcmVxdWlyZShcIi4vdG9vbHMuanNcIik7XG5cbiAgICB2YXIgVFlQRVMgPSBpbnRlcmZhY2VzLlRZUEVTLFxuICAgICAgICBLSU5EUyA9IGludGVyZmFjZXMuT0JKRUNUX0tJTkRTO1xuXG4gICAgdmFyIE1hdHJpeEluc3RhbmNlID0ge1xuICAgICAgICB0cmFuc2Zvcm1Qb2ludDoge1xuICAgICAgICAgICAgdHlwZTogVFlQRVMuVU5ERUZJTkVELFxuICAgICAgICAgICAgZXZhbHVhdGU6IGZ1bmN0aW9uKHJlc3VsdCwgYXJncykge1xuICAgICAgICAgICAgICAgIFRvb2xzLmNoZWNrUGFyYW1Db3VudChyZXN1bHQubm9kZSwgXCJNYXRyaXg6OnRyYW5zZm9ybVBvaW50XCIsIFsxLDJdLCBhcmdzLmxlbmd0aCk7XG4gICAgICAgICAgICAgICAgdmFyIHNvdXJjZVBvaW50ID0gdGFyZ2V0UG9pbnQgPSBhcmdzWzBdO1xuICAgICAgICAgICAgICAgIGlmICghKHNvdXJjZVBvaW50LmlzT2JqZWN0KCkgJiYgc291cmNlUG9pbnQuY2FuTm9ybWFsKCkpKSB7XG4gICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIkZpcnN0IGFyZ3VtZW50IG9mIE1hdHJpeDo6dHJhbnNmb3JtUG9pbnQgbXVzdCBldmFsdWF0ZSB0byBhIHBvaW50LCBmb3VuZDogXCIgKyBzb3VyY2VQb2ludC5nZXRUeXBlU3RyaW5nKCkpO1xuICAgICAgICAgICAgICAgIH1cblxuXG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBUb29scy5leHRlbmQobnMsIHtcbiAgICAgICAgaWQ6IFwiTWF0cml4NFwiLFxuICAgICAgICBraW5kOiBcIm1hdHJpeDRcIixcbiAgICAgICAgb2JqZWN0OiB7XG4gICAgICAgICAgICBjb25zdHJ1Y3RvcjogbnVsbCxcbiAgICAgICAgICAgIHN0YXRpYzogbnVsbFxuICAgICAgICB9LFxuICAgICAgICBpbnN0YW5jZTogTWF0cml4SW5zdGFuY2VcbiAgICB9KTtcblxufShleHBvcnRzKSk7XG4iLCIoZnVuY3Rpb24obnMpe1xuXG4gICAgdmFyIFNoYWRlID0gcmVxdWlyZShcIi4uLy4uLy4uL2ludGVyZmFjZXMuanNcIiksXG4gICAgICAgIFRZUEVTID0gU2hhZGUuVFlQRVMsXG4gICAgICAgIEtJTkRTID0gU2hhZGUuT0JKRUNUX0tJTkRTLFxuICAgICAgICBCYXNlID0gcmVxdWlyZShcIi4uLy4uLy4uL2Jhc2UvaW5kZXguanNcIiksXG4gICAgICAgIFRvb2xzID0gcmVxdWlyZShcIi4vdG9vbHMuanNcIik7XG5cbiAgICB2YXIgU2hhZGVPYmplY3QgPSB7XG4gICAgICAgIGRpZmZ1c2U6IHtcbiAgICAgICAgICAgIHR5cGU6IFRZUEVTLkZVTkNUSU9OLFxuICAgICAgICAgICAgZXZhbHVhdGU6IGZ1bmN0aW9uKHJlc3VsdCwgYXJncywgY3R4KSB7XG4gICAgICAgICAgICAgICAgaWYgKGFyZ3MubGVuZ3RoIDwgMSlcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiU2hhZGUuZGlmZnVzZSBleHBlY3RzIGF0IGxlYXN0IDEgcGFyYW1ldGVyLlwiKVxuICAgICAgICAgICAgICAgIHZhciBub3JtYWwgPSBhcmdzWzBdO1xuICAgICAgICAgICAgICAgIGlmKCEobm9ybWFsICYmIG5vcm1hbC5jYW5Ob3JtYWwoKSkpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiRmlyc3QgYXJndW1lbnQgb2YgU2hhZGUuZGlmZnVzZSBtdXN0IGV2YWx1YXRlIHRvIGEgbm9ybWFsXCIpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoYXJncy5sZW5ndGggPiAxKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBjb2xvciA9IGFyZ3NbMV07XG4gICAgICAgICAgICAgICAgICAgIC8vY29uc29sZS5sb2coXCJDb2xvcjogXCIsIGNvbG9yLnN0cigpLCBjb2xvci5nZXRUeXBlKGN0eCkpO1xuICAgICAgICAgICAgICAgICAgICBpZighY29sb3IuY2FuQ29sb3IoKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiU2Vjb25kIGFyZ3VtZW50IG9mIFNoYWRlLmRpZmZ1c2UgbXVzdCBldmFsdWF0ZSB0byBhIGNvbG9yLiBGb3VuZDogXCIgKyBjb2xvci5zdHIoKSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogVFlQRVMuT0JKRUNULFxuICAgICAgICAgICAgICAgICAgICBraW5kOiBLSU5EUy5DT0xPUl9DTE9TVVJFXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgcGhvbmc6IHtcbiAgICAgICAgICAgIHR5cGU6IFRZUEVTLkZVTkNUSU9OLFxuICAgICAgICAgICAgZXZhbHVhdGU6IGZ1bmN0aW9uKHJlc3VsdCwgYXJncywgY3R4KSB7XG4gICAgICAgICAgICAgICAgaWYgKGFyZ3MubGVuZ3RoIDwgMSlcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiU2hhZGUucGhvbmcgZXhwZWN0cyBhdCBsZWFzdCAxIHBhcmFtZXRlci5cIilcbiAgICAgICAgICAgICAgICB2YXIgbm9ybWFsID0gYXJnc1swXTtcbiAgICAgICAgICAgICAgICBpZighKG5vcm1hbCAmJiBub3JtYWwuY2FuTm9ybWFsKCkpKSB7XG4gICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIkZpcnN0IGFyZ3VtZW50IG9mIFNoYWRlLnBob25nIG11c3QgZXZhbHVhdGUgdG8gYSBub3JtYWxcIik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChhcmdzLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHNoaW5pbmVzcyA9IGFyZ3NbMV07XG4gICAgICAgICAgICAgICAgICAgIC8vY29uc29sZS5sb2coXCJDb2xvcjogXCIsIGNvbG9yLnN0cigpLCBjb2xvci5nZXRUeXBlKGN0eCkpO1xuICAgICAgICAgICAgICAgICAgICBpZighc2hpbmluZXNzLmNhbk51bWJlcigpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJTZWNvbmQgYXJndW1lbnQgb2YgU2hhZGUucGhvbmcgbXVzdCBldmFsdWF0ZSB0byBhIG51bWJlci4gRm91bmQ6IFwiICsgY29sb3Iuc3RyKCkpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IFRZUEVTLk9CSkVDVCxcbiAgICAgICAgICAgICAgICAgICAga2luZDogS0lORFMuQ09MT1JfQ0xPU1VSRVxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIGNsYW1wOiB7XG4gICAgICAgICAgICB0eXBlOiBUWVBFUy5GVU5DVElPTixcbiAgICAgICAgICAgIGV2YWx1YXRlOiBmdW5jdGlvbihyZXN1bHQsIGFyZ3MpIHtcbiAgICAgICAgICAgICAgICBUb29scy5jaGVja1BhcmFtQ291bnQocmVzdWx0Lm5vZGUsIFwiU2hhZGUuY2xhbXBcIiwgWzNdLCBhcmdzLmxlbmd0aCk7XG5cbiAgICAgICAgICAgICAgICBpZiAoYXJncy5ldmVyeShmdW5jdGlvbihlKSB7IHJldHVybiBlLmNhbk51bWJlcigpOyB9KSkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgdHlwZUluZm8gPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiBUWVBFUy5OVU1CRVJcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBpZiAoVG9vbHMuYWxsQXJndW1lbnRzQXJlU3RhdGljKGFyZ3MpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgY2FsbEFyZ3MgPSBhcmdzLm1hcChmdW5jdGlvbihhKSB7cmV0dXJuIGEuZ2V0U3RhdGljVmFsdWUoKTsgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlSW5mby5zdGF0aWNWYWx1ZSA9IFNoYWRlLlNoYWRlLmNsYW1wLmFwcGx5KG51bGwsIGNhbGxBcmdzKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHlwZUluZm87XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFNoYWRlLnRocm93RXJyb3IocmVzdWx0Lm5vZGUsIFwiU2hhZGUuY2xhbXAgbm90IHN1cHBvcnRlZCB3aXRoIGFyZ3VtZW50IHR5cGVzOiBcIiArIGFyZ3MubWFwKGZ1bmN0aW9uKGFyZykgeyByZXR1cm4gYXJnLmdldFR5cGVTdHJpbmcoKTsgfSkuam9pbihcIiwgXCIpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgc21vb3Roc3RlcDoge1xuICAgICAgICAgICAgdHlwZTogVFlQRVMuRlVOQ1RJT04sXG4gICAgICAgICAgICBldmFsdWF0ZTogZnVuY3Rpb24ocmVzdWx0LCBhcmdzLCBjdHgpIHtcbiAgICAgICAgICAgICAgICBUb29scy5jaGVja1BhcmFtQ291bnQocmVzdWx0Lm5vZGUsIFwiU2hhZGUuc21vb3Roc3RlcFwiLCBbM10sIGFyZ3MubGVuZ3RoKTtcblxuICAgICAgICAgICAgICAgIGlmIChhcmdzLmV2ZXJ5KGZ1bmN0aW9uKGUpIHsgcmV0dXJuIGUuY2FuTnVtYmVyKCk7IH0pKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciB0eXBlSW5mbyA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6IFRZUEVTLk5VTUJFUlxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGlmIChUb29scy5hbGxBcmd1bWVudHNBcmVTdGF0aWMoYXJncykpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBjYWxsQXJncyA9IGFyZ3MubWFwKGZ1bmN0aW9uKGEpIHtyZXR1cm4gYS5nZXRTdGF0aWNWYWx1ZSgpOyB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGVJbmZvLnN0YXRpY1ZhbHVlID0gU2hhZGUuU2hhZGUuc21vb3Roc3RlcC5hcHBseShudWxsLCBjYWxsQXJncyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHR5cGVJbmZvO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBTaGFkZS50aHJvd0Vycm9yKHJlc3VsdC5ub2RlLCBcIlNoYWRlLnNtb290aHN0ZXAgbm90IHN1cHBvcnRlZCB3aXRoIGFyZ3VtZW50IHR5cGVzOiBcIiArIGFyZ3MubWFwKGZ1bmN0aW9uKGFyZykgeyByZXR1cm4gYXJnLmdldFR5cGVTdHJpbmcoKTsgfSkuam9pbihcIiwgXCIpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgc3RlcDoge1xuICAgICAgICAgICAgdHlwZTogVFlQRVMuRlVOQ1RJT04sXG4gICAgICAgICAgICBldmFsdWF0ZTogZnVuY3Rpb24ocmVzdWx0LCBhcmdzLCBjdHgpIHtcbiAgICAgICAgICAgICAgICBUb29scy5jaGVja1BhcmFtQ291bnQocmVzdWx0Lm5vZGUsIFwiU2hhZGUuc3RlcFwiLCBbMl0sIGFyZ3MubGVuZ3RoKTtcblxuICAgICAgICAgICAgICAgIGlmIChhcmdzLmV2ZXJ5KGZ1bmN0aW9uKGUpIHsgcmV0dXJuIGUuY2FuTnVtYmVyKCk7IH0pKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciB0eXBlSW5mbyA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6IFRZUEVTLk5VTUJFUlxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGlmIChUb29scy5hbGxBcmd1bWVudHNBcmVTdGF0aWMoYXJncykpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBjYWxsQXJncyA9IGFyZ3MubWFwKGZ1bmN0aW9uKGEpIHtyZXR1cm4gYS5nZXRTdGF0aWNWYWx1ZSgpOyB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGVJbmZvLnN0YXRpY1ZhbHVlID0gU2hhZGUuU2hhZGUuc3RlcC5hcHBseShudWxsLCBjYWxsQXJncyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHR5cGVJbmZvO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBTaGFkZS50aHJvd0Vycm9yKHJlc3VsdC5ub2RlLCBcIlNoYWRlLnN0ZXAgbm90IHN1cHBvcnRlZCB3aXRoIGFyZ3VtZW50IHR5cGVzOiBcIiArIGFyZ3MubWFwKGZ1bmN0aW9uKGFyZykgeyByZXR1cm4gYXJnLmdldFR5cGVTdHJpbmcoKTsgfSkuam9pbihcIiwgXCIpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgZnJhY3Q6IHtcbiAgICAgICAgICAgIHR5cGU6IFRZUEVTLkZVTkNUSU9OLFxuICAgICAgICAgICAgZXZhbHVhdGU6IFRvb2xzLlZlYy5hbnlWZWNBcmd1bWVudEV2YWx1YXRlLmJpbmQobnVsbCwgXCJTaGFkZS5mcmFjdFwiKVxuICAgICAgICB9LFxuICAgICAgICBtaXg6IHtcbiAgICAgICAgICAgIHR5cGU6IFRZUEVTLkZVTkNUSU9OLFxuICAgICAgICAgICAgZXZhbHVhdGU6IGZ1bmN0aW9uKHJlc3VsdCwgYXJncywgY3R4KSB7XG4gICAgICAgICAgICAgICAgVG9vbHMuY2hlY2tQYXJhbUNvdW50KHJlc3VsdC5ub2RlLCBcIlNoYWRlLm1peFwiLCBbM10sIGFyZ3MubGVuZ3RoKTtcblxuICAgICAgICAgICAgICAgIHZhciBhcmcgPSBhcmdzWzBdO1xuXG4gICAgICAgICAgICAgICAgdmFyIHR5cGVJbmZvID0ge307XG4gICAgICAgICAgICAgICAgdmFyIGNudCA9IFRvb2xzLlZlYy5jaGVja0FueVZlY0FyZ3VtZW50KFwiU2hhZGUubWl4XCIsIGFyZ3NbMF0pO1xuICAgICAgICAgICAgICAgIEJhc2UuZXh0ZW5kKHR5cGVJbmZvLCBUb29scy5WZWMuZ2V0VHlwZShjbnQpKTtcblxuICAgICAgICAgICAgICAgIGlmKCFhcmdzWzFdLmVxdWFscyhhcmdzWzBdKSlcbiAgICAgICAgICAgICAgICAgICAgU2hhZGUudGhyb3dFcnJvcihyZXN1bHQubm9kZSwgXCJTaGFkZS5taXggdHlwZXMgb2YgZmlyc3QgdHdvIGFyZ3VtZW50cyBkbyBubyBtYXRjaDogZ290IFwiICsgYXJnWzBdLmdldFR5cGVTdHJpbmcoKSArXG4gICAgICAgICAgICAgICAgICAgICAgICBcIiBhbmQgXCIgKyBhcmdbMV0uZ2V0VHlwZVN0cmluZygpICk7XG4gICAgICAgICAgICAgICAgaWYoIWFyZ3NbMl0uY2FuTnVtYmVyKCkpXG4gICAgICAgICAgICAgICAgICAgIFNoYWRlLnRocm93RXJyb3IocmVzdWx0Lm5vZGUsIFwiU2hhZGUubWl4IHRoaXJkIGFyZ3VtZW50IGlzIG5vdCBhIG51bWJlci5cIik7XG5cbiAgICAgICAgICAgICAgICByZXR1cm4gdHlwZUluZm87XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgQmFzZS5leHRlbmQobnMsIHtcbiAgICAgICAgaWQ6IFwiU2hhZGVcIixcbiAgICAgICAgb2JqZWN0OiB7XG4gICAgICAgICAgICBjb25zdHJ1Y3RvcjogbnVsbCxcbiAgICAgICAgICAgIHN0YXRpYzogU2hhZGVPYmplY3RcbiAgICAgICAgfSxcbiAgICAgICAgaW5zdGFuY2U6IG51bGxcbiAgICB9KTtcblxufShleHBvcnRzKSk7XG4iLCIoZnVuY3Rpb24obnMpe1xuXG4gICAgdmFyIFNoYWRlID0gcmVxdWlyZShcIi4uLy4uLy4uL2ludGVyZmFjZXMuanNcIiksXG4gICAgICAgIFRZUEVTID0gU2hhZGUuVFlQRVMsXG4gICAgICAgIEtJTkRTID0gU2hhZGUuT0JKRUNUX0tJTkRTLFxuICAgICAgICBCYXNlID0gcmVxdWlyZShcIi4uLy4uLy4uL2Jhc2UvaW5kZXguanNcIik7XG5cbiAgICB2YXIgU3lzdGVtT2JqZWN0ID0ge1xuICAgICAgICBjb29yZHM6IHtcbiAgICAgICAgICAgIHR5cGU6IFRZUEVTLk9CSkVDVCxcbiAgICAgICAgICAgIGtpbmQ6IEtJTkRTLkZMT0FUM1xuICAgICAgICB9LFxuICAgICAgICBub3JtYWxpemVkQ29vcmRzOiB7XG4gICAgICAgICAgICB0eXBlOiBUWVBFUy5PQkpFQ1QsXG4gICAgICAgICAgICBraW5kOiBLSU5EUy5GTE9BVDNcbiAgICAgICAgfSxcbiAgICAgICAgaGVpZ2h0OiB7XG4gICAgICAgICAgICB0eXBlOiBUWVBFUy5JTlRcbiAgICAgICAgfSxcbiAgICAgICAgd2lkdGg6IHtcbiAgICAgICAgICAgIHR5cGU6IFRZUEVTLklOVFxuICAgICAgICB9XG5cbiAgICB9O1xuXG4gICAgQmFzZS5leHRlbmQobnMsIHtcbiAgICAgICAgaWQ6IFwiU3lzdGVtXCIsXG4gICAgICAgIG9iamVjdDoge1xuICAgICAgICAgICAgY29uc3RydWN0b3I6IG51bGwsXG4gICAgICAgICAgICBzdGF0aWM6IFN5c3RlbU9iamVjdFxuICAgICAgICB9LFxuICAgICAgICBpbnN0YW5jZTogbnVsbFxuICAgIH0pO1xuXG59KGV4cG9ydHMpKTtcbiIsIihmdW5jdGlvbihucyl7XG5cbiAgICB2YXIgU2hhZGUgPSByZXF1aXJlKFwiLi4vLi4vLi4vaW50ZXJmYWNlcy5qc1wiKSxcbiAgICAgICAgVFlQRVMgPSBTaGFkZS5UWVBFUyxcbiAgICAgICAgS0lORFMgPSBTaGFkZS5PQkpFQ1RfS0lORFMsXG4gICAgICAgIFRvb2xzID0gcmVxdWlyZShcIi4vdG9vbHMuanNcIik7XG5cbiAgICB2YXIgVGV4dHVyZUNvbnN0cnVjdG9yID0gIHtcbiAgICAgICAgdHlwZTogVFlQRVMuT0JKRUNULFxuICAgICAgICBraW5kOiBLSU5EUy5URVhUVVJFLFxuICAgICAgICAvKipcbiAgICAgICAgICogQHBhcmFtIHtBbm5vdGF0aW9ufSByZXN1bHRcbiAgICAgICAgICogQHBhcmFtIHtBcnJheS48QW5ub3RhdGlvbj59IGFyZ3NcbiAgICAgICAgICogQHBhcmFtIHtDb250ZXh0fSBjdHhcbiAgICAgICAgICovXG4gICAgICAgIGV2YWx1YXRlOiBmdW5jdGlvbihyZXN1bHQsIGFyZ3MsIGN0eCkge1xuICAgICAgICAgICAgU2hhZGUudGhyb3dFcnJvcihyZXN1bHQubm9kZSwgXCJDb25zdHJ1Y3Rpb24gb2YgVGV4dHVyZXMgaXMgbm90IHN1cHBvcnRlZC5cIiApO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIHZhciBUZXh0dXJlU3RhdGljT2JqZWN0ID0ge1xuICAgIH07XG5cbiAgICB2YXIgVGV4dHVyZUluc3RhbmNlID0ge1xuICAgIH07XG4gICAgVG9vbHMuVmVjLmF0dGFjaFZlY01ldGhvZHMoVGV4dHVyZUluc3RhbmNlLCBcIlRleHR1cmVcIiwgNCwgMiwgWydzYW1wbGUyRCddKTtcblxuXG4gICAgVG9vbHMuZXh0ZW5kKG5zLCB7XG4gICAgICAgIGlkOiBcIlRleHR1cmVcIixcbiAgICAgICAga2luZDogS0lORFMuVEVYVFVSRSxcbiAgICAgICAgb2JqZWN0OiB7XG4gICAgICAgICAgICBjb25zdHJ1Y3RvcjogVGV4dHVyZUNvbnN0cnVjdG9yLFxuICAgICAgICAgICAgc3RhdGljOiBUZXh0dXJlU3RhdGljT2JqZWN0XG4gICAgICAgIH0sXG4gICAgICAgIGluc3RhbmNlOiBUZXh0dXJlSW5zdGFuY2VcbiAgICB9KTtcblxuXG59KGV4cG9ydHMpKTtcbiIsIihmdW5jdGlvbihucyl7XG4gICAgdmFyIEJhc2UgPSByZXF1aXJlKFwiLi4vLi4vLi4vYmFzZS9pbmRleC5qc1wiKTtcbiAgICB2YXIgU2hhZGUgPSByZXF1aXJlKFwiLi4vLi4vLi4vaW50ZXJmYWNlcy5qc1wiKSxcbiAgICAgICAgVFlQRVMgPSBTaGFkZS5UWVBFUyxcbiAgICAgICAgS0lORFMgPSBTaGFkZS5PQkpFQ1RfS0lORFMsXG4gICAgICAgIFZlY0Jhc2UgPSByZXF1aXJlKFwiLi4vLi4vLi4vYmFzZS92ZWMuanNcIik7XG5cbiAgICB2YXIgYWxsQXJndW1lbnRzQXJlU3RhdGljID0gZnVuY3Rpb24gKGFyZ3MpIHtcbiAgICAgICAgcmV0dXJuIGFyZ3MuZXZlcnkoZnVuY3Rpb24gKGFyZykge1xuICAgICAgICAgICAgcmV0dXJuIGFyZy5oYXNTdGF0aWNWYWx1ZSgpXG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIG5zLmNoZWNrUGFyYW1Db3VudCA9IGZ1bmN0aW9uKG5vZGUsIG5hbWUsIGFsbG93ZWQsIGlzKSB7XG4gICAgICAgIGlmIChhbGxvd2VkLmluZGV4T2YoaXMpID09IC0xKSB7XG4gICAgICAgICAgICBTaGFkZS50aHJvd0Vycm9yKG5vZGUsIFwiSW52YWxpZCBudW1iZXIgb2YgcGFyYW1ldGVycyBmb3IgXCIgKyBuYW1lICsgXCIsIGV4cGVjdGVkIFwiICsgYWxsb3dlZC5qb2luKFwiIG9yIFwiKSArIFwiLCBmb3VuZDogXCIgKyBpcyk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBucy5zaW5nbGVBY2Nlc3NvciA9IGZ1bmN0aW9uIChuYW1lLCBvYmosIHZhbGlkQXJnQ291bnRzLCBzdGF0aWNWYWx1ZUZ1bmN0aW9uKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB0eXBlOiBUWVBFUy5GVU5DVElPTixcbiAgICAgICAgICAgIGV2YWx1YXRlOiBmdW5jdGlvbiAocmVzdWx0LCBhcmdzLCBjdHgsIGNhbGxPYmplY3QpIHtcbiAgICAgICAgICAgICAgICBucy5jaGVja1BhcmFtQ291bnQocmVzdWx0Lm5vZGUsIG5hbWUsIHZhbGlkQXJnQ291bnRzLCBhcmdzLmxlbmd0aCk7XG4gICAgICAgICAgICAgICAgdmFyIHR5cGVJbmZvID0gIGFyZ3MubGVuZ3RoID8gb2JqIDogeyB0eXBlOiBUWVBFUy5OVU1CRVIgfTtcblxuICAgICAgICAgICAgICAgIGlmIChzdGF0aWNWYWx1ZUZ1bmN0aW9uICYmIGNhbGxPYmplY3QuaGFzU3RhdGljVmFsdWUoKSAmJiBhcmdzLmV2ZXJ5KGZ1bmN0aW9uKGEpIHtyZXR1cm4gYS5oYXNTdGF0aWNWYWx1ZSgpOyB9KSkge1xuICAgICAgICAgICAgICAgICAgICB0eXBlSW5mby5zdGF0aWNWYWx1ZSA9IHN0YXRpY1ZhbHVlRnVuY3Rpb24oY2FsbE9iamVjdC5nZXRTdGF0aWNWYWx1ZSgpLCBhcmdzKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIHR5cGVJbmZvO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfTtcblxuICAgIG5zLmV4dGVuZCA9IEJhc2UuZXh0ZW5kO1xuXG4gICAgdmFyIFZlYyA9IHtcbiAgICAgICAgVFlQRVM6IHtcbiAgICAgICAgICAgIDE6IHsgdHlwZTogVFlQRVMuTlVNQkVSIH0sXG4gICAgICAgICAgICAyOiB7IHR5cGU6IFRZUEVTLk9CSkVDVCwga2luZDogS0lORFMuRkxPQVQyIH0sXG4gICAgICAgICAgICAzOiB7IHR5cGU6IFRZUEVTLk9CSkVDVCwga2luZDogS0lORFMuRkxPQVQzIH0sXG4gICAgICAgICAgICA0OiB7IHR5cGU6IFRZUEVTLk9CSkVDVCwga2luZDogS0lORFMuRkxPQVQ0IH1cbiAgICAgICAgfSxcbiAgICAgICAgZ2V0VHlwZTogZnVuY3Rpb24oZGVzdFZlY3Rvcil7XG4gICAgICAgICAgICByZXR1cm4gVmVjLlRZUEVTW2Rlc3RWZWN0b3JdO1xuICAgICAgICB9LFxuICAgICAgICBnZXRTdGF0aWNWYWx1ZTogZnVuY3Rpb24odHlwZUluZm8sIG1ldGhvZE5hbWUsIGFyZ3MsIGNhbGxPYmplY3Qpe1xuICAgICAgICAgICAgaWYoY2FsbE9iamVjdC5oYXNTdGF0aWNWYWx1ZSgpICYmIGFsbEFyZ3VtZW50c0FyZVN0YXRpYyhhcmdzKSl7XG4gICAgICAgICAgICAgICAgdmFyIG9iamVjdCA9IGNhbGxPYmplY3QuZ2V0U3RhdGljVmFsdWUoKTtcbiAgICAgICAgICAgICAgICB2YXIgY2FsbEFyZ3MgPSBhcmdzLm1hcChmdW5jdGlvbihhKSB7cmV0dXJuIGEuZ2V0U3RhdGljVmFsdWUoKTsgfSk7XG4gICAgICAgICAgICAgICAgdmFyIG1ldGhvZCA9IG9iamVjdFttZXRob2ROYW1lXTtcbiAgICAgICAgICAgICAgICBpZihtZXRob2QpXG4gICAgICAgICAgICAgICAgICAgIHR5cGVJbmZvLnN0YXRpY1ZhbHVlID0gbWV0aG9kLmFwcGx5KG9iamVjdCwgY2FsbEFyZ3MpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBjaGVja0FueVZlY0FyZ3VtZW50OiBmdW5jdGlvbihtZXRob2ROYW1lLCBhcmcpe1xuICAgICAgICAgICAgdmFyIGNudDtcblxuICAgICAgICAgICAgaWYoYXJnLmNhbk51bWJlcigpKSBjbnQgPSAxO1xuICAgICAgICAgICAgZWxzZSBpZihhcmcuaXNPZktpbmQoS0lORFMuRkxPQVQyKSkgY250ID0gMjtcbiAgICAgICAgICAgIGVsc2UgaWYoYXJnLmlzT2ZLaW5kKEtJTkRTLkZMT0FUMykpIGNudCA9IDM7XG4gICAgICAgICAgICBlbHNlIGlmKGFyZy5pc09mS2luZChLSU5EUy5GTE9BVDQpKSBjbnQgPSA0O1xuICAgICAgICAgICAgZWxzZSBTaGFkZS50aHJvd0Vycm9yKHJlc3VsdC5ub2RlLCBcIkludmFsaWQgcGFyYW1ldGVyIGZvciBcIiArIG1ldGhvZE5hbWUgKyBcIiwgdHlwZSAnXCIgK1xuICAgICAgICAgICAgICAgICAgICBhcmcuZ2V0VHlwZVN0cmluZygpICsgXCInIGlzIG5vdCBzdXBwb3J0ZWRcIik7XG4gICAgICAgICAgICByZXR1cm4gY250O1xuICAgICAgICB9LFxuICAgICAgICBjaGVja1ZlY0FyZ3VtZW50czogZnVuY3Rpb24obWV0aG9kTmFtZSwgdmVjU2l6ZSwgd2l0aEVtcHR5LCBhcmdTdGFydCwgcmVzdWx0LCBhcmdzKXtcbiAgICAgICAgICAgIHdpdGhFbXB0eSA9ICh3aXRoRW1wdHkgfHwgdmVjU2l6ZSA9PSAwKTtcbiAgICAgICAgICAgIHZhciBhbGxvd2VkID0gW107XG4gICAgICAgICAgICBmb3IodmFyIGkgPSB3aXRoRW1wdHkgPyAwIDogMTsgaSA8PSB2ZWNTaXplOyArK2kpIGFsbG93ZWQucHVzaChpICsgYXJnU3RhcnQpO1xuICAgICAgICAgICAgbnMuY2hlY2tQYXJhbUNvdW50KHJlc3VsdC5ub2RlLCBtZXRob2ROYW1lLCBhbGxvd2VkLCBhcmdzLmxlbmd0aCk7XG5cbiAgICAgICAgICAgIGlmKHdpdGhFbXB0eSAmJiBhcmdzLmxlbmd0aCAtIGFyZ1N0YXJ0ID09IDApXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuXG4gICAgICAgICAgICBpZihhcmdzLmxlbmd0aCAtIGFyZ1N0YXJ0PT0gMSAmJiBhcmdzWzBdLmNhbk51bWJlcigpKVxuICAgICAgICAgICAgICAgIHJldHVybjtcblxuICAgICAgICAgICAgdmFyIGlkeCA9IDA7XG4gICAgICAgICAgICBmb3IodmFyIGkgPSBhcmdTdGFydDsgaWR4IDwgdmVjU2l6ZSAmJiBpIDwgYXJncy5sZW5ndGg7ICsraSl7XG4gICAgICAgICAgICAgICAgdmFyIGFyZz0gYXJnc1tpXSwgY250O1xuICAgICAgICAgICAgICAgIGlmKGFyZy5jYW5OdW1iZXIoKSkgY250ID0gMTtcbiAgICAgICAgICAgICAgICBlbHNlIGlmKGFyZy5pc09mS2luZChLSU5EUy5GTE9BVDIpKSBjbnQgPSAyO1xuICAgICAgICAgICAgICAgIGVsc2UgaWYoYXJnLmlzT2ZLaW5kKEtJTkRTLkZMT0FUMykpIGNudCA9IDM7XG4gICAgICAgICAgICAgICAgZWxzZSBpZihhcmcuaXNPZktpbmQoS0lORFMuRkxPQVQ0KSkgY250ID0gNDtcbiAgICAgICAgICAgICAgICBlbHNlIGlmKGFyZy5pc09mS2luZChLSU5EUy5NQVRSSVgzKSkgY250ID0gOTtcbiAgICAgICAgICAgICAgICBlbHNlIGlmKGFyZy5pc09mS2luZChLSU5EUy5NQVRSSVg0KSkgY250ID0gMTY7XG4gICAgICAgICAgICAgICAgZWxzZSBTaGFkZS50aHJvd0Vycm9yKHJlc3VsdC5ub2RlLCBcIkludmFsaWQgcGFyYW1ldGVyIGZvciBcIiArIG1ldGhvZE5hbWUgKyBcIiwgdHlwZSAnXCIgKyBhcmcuZ2V0VHlwZVN0cmluZygpICsgXCInIGlzIG5vdCBzdXBwb3J0ZWRcIik7XG4gICAgICAgICAgICAgICAgaWR4ICs9IGNudDtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYoaWR4IDwgdmVjU2l6ZSlcbiAgICAgICAgICAgICAgICBTaGFkZS50aHJvd0Vycm9yKHJlc3VsdC5ub2RlLCBcIkludmFsaWQgcGFyYW1ldGVycyBmb3IgXCIgKyBtZXRob2ROYW1lICsgXCIsIGV4cGVjdGVkIFwiICsgdmVjU2l6ZSArIFwiIHNjYWxhciB2YWx1ZXMsIGdvdCBcIiArIGlkeCk7XG4gICAgICAgICAgICBlbHNlIGlmKGkgPCBhcmdzLmxlbmd0aCl7XG4gICAgICAgICAgICAgICAgU2hhZGUudGhyb3dFcnJvcihyZXN1bHQubm9kZSwgXCJJbnZhbGlkIHBhcmFtZXRlcnMgZm9yIFwiICsgbWV0aG9kTmFtZSArIFwiLCB0b28gbWFueSBwYXJhbWV0ZXJzXCIpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuXG4gICAgICAgIHZlY0V2YWx1YXRlOiBmdW5jdGlvbihvYmplY3ROYW1lLCBtZXRob2ROYW1lLCBkZXN0VmVjU2l6ZSwgc3JjVmVjU2l6ZSwgcmVzdWx0LCBhcmdzLCBjdHgsIGNhbGxPYmplY3Qpe1xuICAgICAgICAgICAgVmVjLmNoZWNrVmVjQXJndW1lbnRzKG9iamVjdE5hbWUgKyBcIi5cIiArIG1ldGhvZE5hbWUsIHNyY1ZlY1NpemUsIGZhbHNlLCAwLCByZXN1bHQsIGFyZ3MpO1xuXG4gICAgICAgICAgICB2YXIgdHlwZUluZm8gPSB7fTtcbiAgICAgICAgICAgIEJhc2UuZXh0ZW5kKHR5cGVJbmZvLCBWZWMuZ2V0VHlwZShkZXN0VmVjU2l6ZSkpO1xuXG4gICAgICAgICAgICBWZWMuZ2V0U3RhdGljVmFsdWUodHlwZUluZm8sIG1ldGhvZE5hbWUsIGFyZ3MsIGNhbGxPYmplY3QpO1xuICAgICAgICAgICAgcmV0dXJuIHR5cGVJbmZvO1xuICAgICAgICB9LFxuICAgICAgICBhbnlWZWNBcmd1bWVudEV2YWx1YXRlOiBmdW5jdGlvbihtZXRob2ROYW1lLCByZXN1bHQsIGFyZ3MsIGN0eCwgY2FsbE9iamVjdCl7XG4gICAgICAgICAgICBucy5jaGVja1BhcmFtQ291bnQocmVzdWx0Lm5vZGUsIG1ldGhvZE5hbWUsIFsxXSwgYXJncy5sZW5ndGgpO1xuICAgICAgICAgICAgdmFyIGFyZyA9IGFyZ3NbMF07XG5cbiAgICAgICAgICAgIHZhciB0eXBlSW5mbyA9IHt9O1xuICAgICAgICAgICAgdmFyIGNudCA9IFZlYy5jaGVja0FueVZlY0FyZ3VtZW50KG1ldGhvZE5hbWUsIGFyZyk7XG4gICAgICAgICAgICBCYXNlLmV4dGVuZCh0eXBlSW5mbywgVmVjLmdldFR5cGUoY250KSk7XG5cbiAgICAgICAgICAgIFZlYy5nZXRTdGF0aWNWYWx1ZSh0eXBlSW5mbywgbWV0aG9kTmFtZSwgYXJncywgY2FsbE9iamVjdCk7XG4gICAgICAgICAgICByZXR1cm4gdHlwZUluZm87XG4gICAgICAgIH0sXG5cbiAgICAgICAgb3B0aW9uYWxaZXJvRXZhbHVhdGU6IGZ1bmN0aW9uKG9iamVjdE5hbWUsIG1ldGhvZE5hbWUsIGRlc3RWZWNTaXplLCB6ZXJvRGVzdFZlY1NpemUsIHNyY1ZlY1NpemUsIHJlc3VsdCwgYXJncywgY3R4LCBjYWxsT2JqZWN0KSB7XG4gICAgICAgICAgICB2YXIgcXVhbGlmaWVkTmFtZSA9IG9iamVjdE5hbWUgKyBcIi5cIiArIG1ldGhvZE5hbWU7XG4gICAgICAgICAgICB2YXIgdHlwZUluZm8gPSB7fTtcblxuICAgICAgICAgICAgaWYoYXJncy5sZW5ndGggPT0gMCl7XG4gICAgICAgICAgICAgICAgQmFzZS5leHRlbmQodHlwZUluZm8sIFZlYy5nZXRUeXBlKHplcm9EZXN0VmVjU2l6ZSkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZXtcbiAgICAgICAgICAgICAgICBWZWMuY2hlY2tWZWNBcmd1bWVudHMocXVhbGlmaWVkTmFtZSwgc3JjVmVjU2l6ZSwgdHJ1ZSwgMCwgcmVzdWx0LCBhcmdzKTtcbiAgICAgICAgICAgICAgICBCYXNlLmV4dGVuZCh0eXBlSW5mbywgVmVjLmdldFR5cGUoZGVzdFZlY1NpemUpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFZlYy5nZXRTdGF0aWNWYWx1ZSh0eXBlSW5mbywgbWV0aG9kTmFtZSwgYXJncywgY2FsbE9iamVjdCk7XG5cbiAgICAgICAgICAgIHJldHVybiB0eXBlSW5mbztcbiAgICAgICAgfSxcblxuICAgICAgICBzd2l6emxlRXZhbHVhdGU6IGZ1bmN0aW9uKG9iamVjdE5hbWUsIHZlY1NpemUsIHN3aXp6bGUsIHdpdGhTZXR0ZXIsIHJlc3VsdCwgYXJncywgY3R4LCBjYWxsT2JqZWN0KSB7XG4gICAgICAgICAgICBpZih3aXRoU2V0dGVyKXtcbiAgICAgICAgICAgICAgICByZXR1cm4gVmVjLm9wdGlvbmFsWmVyb0V2YWx1YXRlKG9iamVjdE5hbWUsIHN3aXp6bGUsIHZlY1NpemUsIHN3aXp6bGUubGVuZ3RoLCBzd2l6emxlLmxlbmd0aCxcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0LCBhcmdzLCBjdHgsIGNhbGxPYmplY3QpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZXtcbiAgICAgICAgICAgICAgICByZXR1cm4gVmVjLnZlY0V2YWx1YXRlKG9iamVjdE5hbWUsIHN3aXp6bGUsIHN3aXp6bGUubGVuZ3RoLCAwLCByZXN1bHQsIGFyZ3MsIGN0eCwgY2FsbE9iamVjdCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIGdldFN3aXp6bGVFdmFsdWF0ZTogZnVuY3Rpb24ob2JqZWN0TmFtZSwgdmVjU2l6ZSwgc3dpenpsZSl7XG4gICAgICAgICAgICB2YXIgaW5kaWNlcyA9IFtdLCB3aXRoU2V0dGVyID0gKHN3aXp6bGUubGVuZ3RoIDw9IHZlY1NpemUpO1xuICAgICAgICAgICAgZm9yKHZhciBpID0gMDsgd2l0aFNldHRlciAmJiBpIDwgc3dpenpsZS5sZW5ndGg7ICsraSl7XG4gICAgICAgICAgICAgICAgdmFyIGlkeCA9IFZlY0Jhc2Uuc3dpenpsZVRvSW5kZXgoc3dpenpsZS5jaGFyQXQoaSkpO1xuICAgICAgICAgICAgICAgIGlmKGluZGljZXNbaWR4XSlcbiAgICAgICAgICAgICAgICAgICAgd2l0aFNldHRlciA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgICAgICAgaW5kaWNlc1tpZHhdID0gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiAge1xuICAgICAgICAgICAgICAgIHR5cGU6IFRZUEVTLkZVTkNUSU9OLFxuICAgICAgICAgICAgICAgIGV2YWx1YXRlOiBWZWMuc3dpenpsZUV2YWx1YXRlLmJpbmQobnVsbCwgb2JqZWN0TmFtZSwgdmVjU2l6ZSwgc3dpenpsZSwgd2l0aFNldHRlcilcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgYXR0YWNoU3dpenpsZXM6IGZ1bmN0aW9uIChpbnN0YW5jZSwgb2JqZWN0TmFtZSwgdmVjQ291bnQpe1xuICAgICAgICAgICAgZm9yKHZhciBzID0gMDsgcyA8IFZlY0Jhc2Uuc3dpenpsZVNldHMubGVuZ3RoOyArK3Mpe1xuICAgICAgICAgICAgICAgIGZvcih2YXIgY291bnQgPSAxOyBjb3VudCA8PSA0OyArK2NvdW50KXtcbiAgICAgICAgICAgICAgICAgICAgdmFyIG1heCA9IE1hdGgucG93KHZlY0NvdW50LCBjb3VudCk7XG4gICAgICAgICAgICAgICAgICAgICBmb3IodmFyIGkgPSAwOyBpIDwgbWF4OyArK2kpe1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHZhbCA9IGk7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIga2V5ID0gXCJcIjtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvcih2YXIgIGogPSAwOyBqIDwgY291bnQ7ICsrail7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGlkeCA9IHZhbCAlIHZlY0NvdW50O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhbCA9IE1hdGguZmxvb3IodmFsIC8gdmVjQ291bnQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGtleSs9IFZlY0Jhc2Uuc3dpenpsZVNldHNbc11baWR4XTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGluc3RhbmNlW2tleV0gPSBWZWMuZ2V0U3dpenpsZUV2YWx1YXRlKG9iamVjdE5hbWUsIHZlY0NvdW50LCBrZXkpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBhdHRhY2hWZWNNZXRob2RzOiBmdW5jdGlvbihpbnN0YW5jZSwgb2JqZWN0TmFtZSwgZGVzdFZlY1NpemUsIHNyY1ZlY1NpemUsIG1ldGhvZE5hbWVzKXtcbiAgICAgICAgICAgIGZvcih2YXIgaSA9IDA7IGkgPCBtZXRob2ROYW1lcy5sZW5ndGg7ICsraSl7XG4gICAgICAgICAgICAgICAgdmFyIG1ldGhvZE5hbWUgPSBtZXRob2ROYW1lc1tpXTtcbiAgICAgICAgICAgICAgICBpbnN0YW5jZVttZXRob2ROYW1lXSA9IHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogVFlQRVMuRlVOQ1RJT04sXG4gICAgICAgICAgICAgICAgICAgIGV2YWx1YXRlOiBWZWMudmVjRXZhbHVhdGUuYmluZChudWxsLCBvYmplY3ROYW1lLCBtZXRob2ROYW1lLCBkZXN0VmVjU2l6ZSwgc3JjVmVjU2l6ZSlcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG5cbiAgICAgICAgZ2V0Q29uc3RydWN0b3JUeXBlSW5mbzogZnVuY3Rpb24ob2JqZWN0TmFtZSwgdmVjU2l6ZSwgdHlwZSwgcmVzdWx0LCBhcmdzKXtcbiAgICAgICAgICAgIHZhciBhcmdBcnJheSA9IFtdO1xuICAgICAgICAgICAgdmFyIGlzU3RhdGljID0gdHJ1ZTtcbiAgICAgICAgICAgIGFyZ3MuZm9yRWFjaChmdW5jdGlvbiAocGFyYW0sIGluZGV4KSB7XG4gICAgICAgICAgICAgICAgaXNTdGF0aWMgPSBpc1N0YXRpYyAmJiBwYXJhbS5oYXNTdGF0aWNWYWx1ZSgpO1xuICAgICAgICAgICAgICAgIGlmIChpc1N0YXRpYylcbiAgICAgICAgICAgICAgICAgICAgYXJnQXJyYXkucHVzaChwYXJhbS5nZXRTdGF0aWNWYWx1ZSgpKTtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICB2YXIgdHlwZUluZm8gPSBCYXNlLmV4dGVuZCh7fSwgdHlwZSk7XG5cbiAgICAgICAgICAgIGlmIChpc1N0YXRpYykge1xuICAgICAgICAgICAgICAgIHZhciB2ID0gbmV3IFNoYWRlW29iamVjdE5hbWVdKCk7XG4gICAgICAgICAgICAgICAgU2hhZGVbb2JqZWN0TmFtZV0uYXBwbHkodiwgYXJnQXJyYXkpO1xuICAgICAgICAgICAgICAgIHR5cGVJbmZvLnN0YXRpY1ZhbHVlID0gdjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB0eXBlSW5mbztcbiAgICAgICAgfSxcblxuICAgICAgICBjb25zdHJ1Y3RvckV2YWx1YXRlOiBmdW5jdGlvbihvYmplY3ROYW1lLCB2ZWNTaXplLCByZXN1bHQsIGFyZ3MsIGN0eCkge1xuICAgICAgICAgICAgVmVjLmNoZWNrVmVjQXJndW1lbnRzKG9iamVjdE5hbWUsIHZlY1NpemUsIHRydWUsIDAsIHJlc3VsdCwgYXJncyk7XG4gICAgICAgICAgICByZXR1cm4gVmVjLmdldENvbnN0cnVjdG9yVHlwZUluZm8ob2JqZWN0TmFtZSwgdmVjU2l6ZSwgVmVjLmdldFR5cGUodmVjU2l6ZSksIHJlc3VsdCwgYXJncyk7XG4gICAgICAgIH1cblxuICAgIH07XG5cbiAgICB2YXIgTWF0ID0ge1xuICAgICAgICBUWVBFUzoge1xuICAgICAgICAgICAgXCJNYXQzXCI6IHsgdHlwZTogeyB0eXBlOiBUWVBFUy5PQkpFQ1QsIGtpbmQ6IEtJTkRTLk1BVFJJWDMgfSwgY29sczogMywgcm93czogMyB9LFxuICAgICAgICAgICAgXCJNYXQ0XCI6IHsgdHlwZTogeyB0eXBlOiBUWVBFUy5PQkpFQ1QsIGtpbmQ6IEtJTkRTLk1BVFJJWDQgfSwgY29sczogNCwgcm93czogNCB9XG4gICAgICAgIH0sXG4gICAgICAgIGdldFR5cGU6IGZ1bmN0aW9uKG1hdE5hbWUpe1xuICAgICAgICAgICAgcmV0dXJuIE1hdC5UWVBFU1ttYXROYW1lXS50eXBlO1xuICAgICAgICB9LFxuICAgICAgICBnZXRWZWNTaXplOiBmdW5jdGlvbihtYXROYW1lKXtcbiAgICAgICAgICAgIHJldHVybiBNYXQuVFlQRVNbbWF0TmFtZV0uY29scyAqIE1hdC5UWVBFU1ttYXROYW1lXS5yb3dzO1xuICAgICAgICB9LFxuICAgICAgICBjaGVja01hdEFyZ3VtZW50czogZnVuY3Rpb24obWV0aG9kTmFtZSwgbWF0TmFtZSwgd2l0aEVtcHR5LCByZXN1bHQsIGFyZ3Mpe1xuICAgICAgICAgICAgaWYoYXJncy5sZW5ndGggPT0gMSAmJiAoYXJnc1swXS5pc09mS2luZChLSU5EUy5NQVRSSVgzKSB8fCBhcmdzWzBdLmlzT2ZLaW5kKEtJTkRTLk1BVFJJWDQpKSlcbiAgICAgICAgICAgICAgICByZXR1cm47XG5cbiAgICAgICAgICAgIGZvcih2YXIgaSA9IDA7IGkgPCBhcmdzLmxlbmd0aDsgKytpKXtcbiAgICAgICAgICAgICAgICBpZihhcmdzW2ldLmlzT2ZLaW5kKEtJTkRTLk1BVFJJWDMpIHx8IGFyZ3NbaV0uaXNPZktpbmQoS0lORFMuTUFUUklYNCkpXG4gICAgICAgICAgICAgICAgICAgIFNoYWRlLnRocm93RXJyb3IocmVzdWx0Lm5vZGUsIFwiSW52YWxpZCBwYXJhbWV0ZXIgZm9yIFwiICsgbWV0aG9kTmFtZSArIFwiOiBDb25zdHJ1Y3RpbmcgTWF0cml4IGZyb20gTWF0cml4IGNhbiBvbmx5IHRha2Ugb25lIGFyZ3VtZW50XCIpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgVmVjLmNoZWNrVmVjQXJndW1lbnRzKG1ldGhvZE5hbWUsIE1hdC5nZXRWZWNTaXplKG1hdE5hbWUpLCB3aXRoRW1wdHksIDAsIHJlc3VsdCwgYXJncyk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgbWF0RXZhbHVhdGU6IGZ1bmN0aW9uKG1hdE5hbWUsIG1ldGhvZE5hbWUsIHJlc3VsdCwgYXJncywgY3R4LCBjYWxsT2JqZWN0KXtcbiAgICAgICAgICAgIE1hdC5jaGVja01hdEFyZ3VtZW50cyhtYXROYW1lICsgXCIuXCIgKyBtZXRob2ROYW1lLCBtYXROYW1lLCBmYWxzZSwgcmVzdWx0LCBhcmdzKTtcblxuICAgICAgICAgICAgdmFyIHR5cGVJbmZvID0ge307XG4gICAgICAgICAgICBCYXNlLmV4dGVuZCh0eXBlSW5mbywgTWF0LmdldFR5cGUobWF0TmFtZSkpO1xuXG4gICAgICAgICAgICBWZWMuZ2V0U3RhdGljVmFsdWUodHlwZUluZm8sIG1ldGhvZE5hbWUsIGFyZ3MsIGNhbGxPYmplY3QpO1xuICAgICAgICAgICAgcmV0dXJuIHR5cGVJbmZvO1xuICAgICAgICB9LFxuXG4gICAgICAgIG1hdENvbnN0cnVjdG9yRXZhbHVhdGU6IGZ1bmN0aW9uKG1hdE5hbWUsIHJlc3VsdCwgYXJncywgY3R4KXtcbiAgICAgICAgICAgIE1hdC5jaGVja01hdEFyZ3VtZW50cyhtYXROYW1lLCBtYXROYW1lLCB0cnVlLCByZXN1bHQsIGFyZ3MpO1xuICAgICAgICAgICAgcmV0dXJuIFZlYy5nZXRDb25zdHJ1Y3RvclR5cGVJbmZvKG1hdE5hbWUsIE1hdC5nZXRWZWNTaXplKG1hdE5hbWUpLCBNYXQuZ2V0VHlwZShtYXROYW1lKSwgcmVzdWx0LCBhcmdzKTtcbiAgICAgICAgfSxcblxuICAgICAgICBhdHRhY2hNYXRNZXRob2RzOiBmdW5jdGlvbihpbnN0YW5jZSwgbWF0TmFtZSwgbWV0aG9kTmFtZXMpe1xuICAgICAgICAgICAgZm9yKHZhciBpID0gMDsgaSA8IG1ldGhvZE5hbWVzLmxlbmd0aDsgKytpKXtcbiAgICAgICAgICAgICAgICB2YXIgbWV0aG9kTmFtZSA9IG1ldGhvZE5hbWVzW2ldO1xuICAgICAgICAgICAgICAgIGluc3RhbmNlW21ldGhvZE5hbWVdID0ge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiBUWVBFUy5GVU5DVElPTixcbiAgICAgICAgICAgICAgICAgICAgZXZhbHVhdGU6IE1hdC5tYXRFdmFsdWF0ZS5iaW5kKG51bGwsIG1hdE5hbWUsIG1ldGhvZE5hbWUpXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBjb2xFdmFsdWF0ZTogZnVuY3Rpb24obWF0TmFtZSwgcmVzdWx0LCBhcmdzLCBjdHgsIGNhbGxPYmplY3QpIHtcbiAgICAgICAgICAgIHZhciBxdWFsaWZpZWROYW1lID0gbWF0TmFtZSArIFwiLmNvbFwiO1xuICAgICAgICAgICAgdmFyIHR5cGVJbmZvID0ge307XG5cbiAgICAgICAgICAgIHZhciBjb2xzID0gTWF0LlRZUEVTW21hdE5hbWVdLmNvbHMsIHJvd3MgPSBNYXQuVFlQRVNbbWF0TmFtZV0ucm93cztcblxuICAgICAgICAgICAgaWYoYXJncy5sZW5ndGggPiAxKXtcbiAgICAgICAgICAgICAgICBWZWMuY2hlY2tWZWNBcmd1bWVudHMocXVhbGlmaWVkTmFtZSwgcm93cywgdHJ1ZSwgMSwgcmVzdWx0LCBhcmdzKTtcbiAgICAgICAgICAgICAgICBCYXNlLmV4dGVuZCh0eXBlSW5mbywgTWF0LmdldFR5cGUobWF0TmFtZSkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZXtcbiAgICAgICAgICAgICAgICBucy5jaGVja1BhcmFtQ291bnQocmVzdWx0Lm5vZGUsIHF1YWxpZmllZE5hbWUsIFsxXSwgYXJncy5sZW5ndGgpO1xuICAgICAgICAgICAgICAgIEJhc2UuZXh0ZW5kKHR5cGVJbmZvLCBWZWMuZ2V0VHlwZShyb3dzKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZighYXJnc1swXS5jYW5OdW1iZXIoKSl7XG4gICAgICAgICAgICAgICAgU2hhZGUudGhyb3dFcnJvcihyZXN1bHQubm9kZSwgXCJJbnZhbGlkIHBhcmFtZXRlciBmb3IgXCIgKyBxdWFsaWZpZWROYW1lICsgXCIsIGZpcnN0IHBhcmFtZXRlciBtdXN0IGJlIGEgbnVtYmVyLlwiKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgVmVjLmdldFN0YXRpY1ZhbHVlKHR5cGVJbmZvLCBcImNvbFwiLCBhcmdzLCBjYWxsT2JqZWN0KTtcblxuICAgICAgICAgICAgcmV0dXJuIHR5cGVJbmZvO1xuICAgICAgICB9XG5cbiAgICB9XG5cbiAgICBucy5WZWMgPSBWZWM7XG4gICAgbnMuTWF0ID0gTWF0O1xuICAgIG5zLmFsbEFyZ3VtZW50c0FyZVN0YXRpYyA9IGFsbEFyZ3VtZW50c0FyZVN0YXRpYztcblxuXG59KGV4cG9ydHMpKTtcbiIsIihmdW5jdGlvbihucyl7XG5cbiAgICB2YXIgU2hhZGUgPSByZXF1aXJlKFwiLi4vLi4vLi4vaW50ZXJmYWNlcy5qc1wiKSxcbiAgICAgICAgVFlQRVMgPSBTaGFkZS5UWVBFUyxcbiAgICAgICAgS0lORFMgPSBTaGFkZS5PQkpFQ1RfS0lORFMsXG4gICAgICAgIFRvb2xzID0gcmVxdWlyZShcIi4vdG9vbHMuanNcIik7XG5cbiAgICB2YXIgVmVjdG9yMkNvbnN0cnVjdG9yID0gIHtcbiAgICAgICAgdHlwZTogVFlQRVMuT0JKRUNULFxuICAgICAgICBraW5kOiBLSU5EUy5GTE9BVDIsXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBAcGFyYW0ge0Fubm90YXRpb259IHJlc3VsdFxuICAgICAgICAgKiBAcGFyYW0ge0FycmF5LjxBbm5vdGF0aW9uPn0gYXJnc1xuICAgICAgICAgKiBAcGFyYW0ge0NvbnRleHR9IGN0eFxuICAgICAgICAgKi9cbiAgICAgICAgZXZhbHVhdGU6IFRvb2xzLlZlYy5jb25zdHJ1Y3RvckV2YWx1YXRlLmJpbmQobnVsbCwgXCJWZWMyXCIsIDIpXG4gICAgfTtcblxuICAgIHZhciBWZWN0b3IyU3RhdGljT2JqZWN0ID0ge1xuICAgIH07XG5cbiAgICB2YXIgVmVjdG9yMkluc3RhbmNlID0ge1xuICAgICAgICBsZW5ndGg6IHtcbiAgICAgICAgICAgIHR5cGU6IFRZUEVTLkZVTkNUSU9OLFxuICAgICAgICAgICAgZXZhbHVhdGU6IFRvb2xzLlZlYy5vcHRpb25hbFplcm9FdmFsdWF0ZS5iaW5kKG51bGwsXCJWZWMyXCIsIFwibGVuZ3RoXCIsIDIsIDEsIDEpXG4gICAgICAgIH1cbiAgICB9O1xuICAgIFRvb2xzLlZlYy5hdHRhY2hTd2l6emxlcyhWZWN0b3IySW5zdGFuY2UsIFwiVmVjMlwiLCAyKTtcbiAgICBUb29scy5WZWMuYXR0YWNoVmVjTWV0aG9kcyhWZWN0b3IySW5zdGFuY2UsIFwiVmVjMlwiLCAyLCAyLCBbJ2FkZCcsICdzdWInLCAnbXVsJywgJ2RpdicsICdtb2QnXSk7XG4gICAgVG9vbHMuVmVjLmF0dGFjaFZlY01ldGhvZHMoVmVjdG9yMkluc3RhbmNlLCBcIlZlYzJcIiwgMSwgMiwgWydkb3QnXSk7XG4gICAgVG9vbHMuVmVjLmF0dGFjaFZlY01ldGhvZHMoVmVjdG9yMkluc3RhbmNlLCBcIlZlYzJcIiwgMiwgMCwgWydub3JtYWxpemUnXSk7XG5cblxuICAgIFRvb2xzLmV4dGVuZChucywge1xuICAgICAgICBpZDogXCJWZWMyXCIsXG4gICAgICAgIGtpbmQ6IEtJTkRTLkZMT0FUMixcbiAgICAgICAgb2JqZWN0OiB7XG4gICAgICAgICAgICBjb25zdHJ1Y3RvcjogVmVjdG9yMkNvbnN0cnVjdG9yLFxuICAgICAgICAgICAgc3RhdGljOiBWZWN0b3IyU3RhdGljT2JqZWN0XG4gICAgICAgIH0sXG4gICAgICAgIGluc3RhbmNlOiBWZWN0b3IySW5zdGFuY2VcbiAgICB9KTtcblxuXG59KGV4cG9ydHMpKTtcbiIsIihmdW5jdGlvbihucyl7XG5cbiAgICB2YXIgU2hhZGUgPSByZXF1aXJlKFwiLi4vLi4vLi4vaW50ZXJmYWNlcy5qc1wiKSxcbiAgICAgICAgVFlQRVMgPSBTaGFkZS5UWVBFUyxcbiAgICAgICAgS0lORFMgPSBTaGFkZS5PQkpFQ1RfS0lORFMsXG4gICAgICAgIFRvb2xzID0gcmVxdWlyZShcIi4vdG9vbHMuanNcIik7XG5cbiAgICB2YXIgVmVjdG9yM0NvbnN0cnVjdG9yID0gIHtcbiAgICAgICAgdHlwZTogVFlQRVMuT0JKRUNULFxuICAgICAgICBraW5kOiBLSU5EUy5GTE9BVDMsXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBAcGFyYW0ge0Fubm90YXRpb259IHJlc3VsdFxuICAgICAgICAgKiBAcGFyYW0ge0FycmF5LjxBbm5vdGF0aW9uPn0gYXJnc1xuICAgICAgICAgKiBAcGFyYW0ge0NvbnRleHR9IGN0eFxuICAgICAgICAgKi9cbiAgICAgICAgZXZhbHVhdGU6IFRvb2xzLlZlYy5jb25zdHJ1Y3RvckV2YWx1YXRlLmJpbmQobnVsbCwgXCJWZWMzXCIsIDMpXG4gICAgfTtcblxuICAgIHZhciBWZWN0b3IzU3RhdGljT2JqZWN0ID0ge1xuICAgIH07XG5cbiAgICB2YXIgVmVjdG9yM0luc3RhbmNlID0ge1xuICAgICAgICBsZW5ndGg6IHtcbiAgICAgICAgICAgIHR5cGU6IFRZUEVTLkZVTkNUSU9OLFxuICAgICAgICAgICAgZXZhbHVhdGU6IFRvb2xzLlZlYy5vcHRpb25hbFplcm9FdmFsdWF0ZS5iaW5kKG51bGwsXCJWZWMzXCIsIFwibGVuZ3RoXCIsIDMsIDEsIDEpXG4gICAgICAgIH1cbiAgICB9O1xuICAgIFRvb2xzLlZlYy5hdHRhY2hTd2l6emxlcyhWZWN0b3IzSW5zdGFuY2UsIFwiVmVjM1wiLCAzKTtcbiAgICBUb29scy5WZWMuYXR0YWNoVmVjTWV0aG9kcyhWZWN0b3IzSW5zdGFuY2UsIFwiVmVjM1wiLCAzLCAzLCBbJ2FkZCcsICdzdWInLCAnbXVsJywgJ2RpdicsICdtb2QnXSk7XG4gICAgVG9vbHMuVmVjLmF0dGFjaFZlY01ldGhvZHMoVmVjdG9yM0luc3RhbmNlLCBcIlZlYzNcIiwgMSwgMywgWydkb3QnXSk7XG4gICAgVG9vbHMuVmVjLmF0dGFjaFZlY01ldGhvZHMoVmVjdG9yM0luc3RhbmNlLCBcIlZlYzNcIiwgMywgMCwgWydub3JtYWxpemUnXSk7XG5cblxuICAgIFRvb2xzLmV4dGVuZChucywge1xuICAgICAgICBpZDogXCJWZWMzXCIsXG4gICAgICAgIGtpbmQ6IEtJTkRTLkZMT0FUMyxcbiAgICAgICAgb2JqZWN0OiB7XG4gICAgICAgICAgICBjb25zdHJ1Y3RvcjogVmVjdG9yM0NvbnN0cnVjdG9yLFxuICAgICAgICAgICAgc3RhdGljOiBWZWN0b3IzU3RhdGljT2JqZWN0XG4gICAgICAgIH0sXG4gICAgICAgIGluc3RhbmNlOiBWZWN0b3IzSW5zdGFuY2VcbiAgICB9KTtcblxuXG59KGV4cG9ydHMpKTtcbiIsIihmdW5jdGlvbihucyl7XG5cbiAgICB2YXIgU2hhZGUgPSByZXF1aXJlKFwiLi4vLi4vLi4vaW50ZXJmYWNlcy5qc1wiKSxcbiAgICAgICAgVFlQRVMgPSBTaGFkZS5UWVBFUyxcbiAgICAgICAgS0lORFMgPSBTaGFkZS5PQkpFQ1RfS0lORFMsXG4gICAgICAgIFRvb2xzID0gcmVxdWlyZShcIi4vdG9vbHMuanNcIik7XG5cbiAgICB2YXIgVmVjdG9yNENvbnN0cnVjdG9yID0gIHtcbiAgICAgICAgdHlwZTogVFlQRVMuT0JKRUNULFxuICAgICAgICBraW5kOiBLSU5EUy5GTE9BVDQsXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBAcGFyYW0ge0Fubm90YXRpb259IHJlc3VsdFxuICAgICAgICAgKiBAcGFyYW0ge0FycmF5LjxBbm5vdGF0aW9uPn0gYXJnc1xuICAgICAgICAgKiBAcGFyYW0ge0NvbnRleHR9IGN0eFxuICAgICAgICAgKi9cbiAgICAgICAgZXZhbHVhdGU6IFRvb2xzLlZlYy5jb25zdHJ1Y3RvckV2YWx1YXRlLmJpbmQobnVsbCwgXCJWZWM0XCIsIDQpXG4gICAgfTtcblxuICAgIHZhciBWZWN0b3I0U3RhdGljT2JqZWN0ID0ge1xuICAgIH07XG5cbiAgICB2YXIgVmVjdG9yNEluc3RhbmNlID0ge1xuICAgICAgICBsZW5ndGg6IHtcbiAgICAgICAgICAgIHR5cGU6IFRZUEVTLkZVTkNUSU9OLFxuICAgICAgICAgICAgZXZhbHVhdGU6IFRvb2xzLlZlYy5vcHRpb25hbFplcm9FdmFsdWF0ZS5iaW5kKG51bGwsXCJWZWM0XCIsIFwibGVuZ3RoXCIsIDQsIDEsIDEpXG4gICAgICAgIH1cbiAgICB9O1xuICAgIFRvb2xzLlZlYy5hdHRhY2hTd2l6emxlcyhWZWN0b3I0SW5zdGFuY2UsIFwiVmVjNFwiLCA0KTtcbiAgICBUb29scy5WZWMuYXR0YWNoVmVjTWV0aG9kcyhWZWN0b3I0SW5zdGFuY2UsIFwiVmVjNFwiLCA0LCA0LCBbJ2FkZCcsICdzdWInLCAnbXVsJywgJ2RpdicsICdtb2QnXSk7XG4gICAgVG9vbHMuVmVjLmF0dGFjaFZlY01ldGhvZHMoVmVjdG9yNEluc3RhbmNlLCBcIlZlYzRcIiwgMSwgNCwgWydkb3QnXSk7XG4gICAgVG9vbHMuVmVjLmF0dGFjaFZlY01ldGhvZHMoVmVjdG9yNEluc3RhbmNlLCBcIlZlYzRcIiwgNCwgMCwgWydub3JtYWxpemUnXSk7XG5cblxuICAgIFRvb2xzLmV4dGVuZChucywge1xuICAgICAgICBpZDogXCJWZWM0XCIsXG4gICAgICAgIGtpbmQ6IEtJTkRTLkZMT0FUNCxcbiAgICAgICAgb2JqZWN0OiB7XG4gICAgICAgICAgICBjb25zdHJ1Y3RvcjogVmVjdG9yNENvbnN0cnVjdG9yLFxuICAgICAgICAgICAgc3RhdGljOiBWZWN0b3I0U3RhdGljT2JqZWN0XG4gICAgICAgIH0sXG4gICAgICAgIGluc3RhbmNlOiBWZWN0b3I0SW5zdGFuY2VcbiAgICB9KTtcblxuXG59KGV4cG9ydHMpKTtcbiIsIihmdW5jdGlvbiAobnMpIHtcbiAgICAvKipcbiAgICAgKiBTaGFkZS5qcyBzcGVjaWZpYyB0eXBlIGluZmVyZW5jZSB0aGF0IGlzIGFsc28gaW5mZXJyaW5nXG4gICAgICogdmlydHVhbCB0eXBlcyB7QGxpbmsgU2hhZGUuVFlQRVMgfVxuICAgICAqL1xuXG4gICAgdmFyIHdhbGsgPSByZXF1aXJlKCdlc3RyYXZlcnNlJyksXG4gICAgICAgIGVudGVyRXhwcmVzc2lvbiA9IHJlcXVpcmUoJy4vaW5mZXJfZXhwcmVzc2lvbi5qcycpLmVudGVyRXhwcmVzc2lvbixcbiAgICAgICAgZXhpdEV4cHJlc3Npb24gPSByZXF1aXJlKCcuL2luZmVyX2V4cHJlc3Npb24uanMnKS5leGl0RXhwcmVzc2lvbixcbiAgICAgICAgZW50ZXJTdGF0ZW1lbnQgPSByZXF1aXJlKCcuL2luZmVyX3N0YXRlbWVudC5qcycpLmVudGVyU3RhdGVtZW50LFxuICAgICAgICBleGl0U3RhdGVtZW50ID0gcmVxdWlyZSgnLi9pbmZlcl9zdGF0ZW1lbnQuanMnKS5leGl0U3RhdGVtZW50LFxuXG4gICAgICAgIE9iamVjdFJlZ2lzdHJ5ID0gcmVxdWlyZShcIi4vcmVnaXN0cnkvaW5kZXguanNcIikuUmVnaXN0cnksXG4gICAgICAgIENvbnRleHQgPSByZXF1aXJlKFwiLi8uLi8uLi9iYXNlL2NvbnRleHQuanNcIikuZ2V0Q29udGV4dChPYmplY3RSZWdpc3RyeSksXG4gICAgICAgIEJhc2UgPSByZXF1aXJlKFwiLi4vLi4vYmFzZS9pbmRleC5qc1wiKSxcbiAgICAgICAgQW5ub3RhdGlvbiA9IHJlcXVpcmUoXCIuLy4uLy4uL2Jhc2UvYW5ub3RhdGlvbi5qc1wiKS5Bbm5vdGF0aW9uLFxuICAgICAgICBGdW5jdGlvbkFubm90YXRpb24gPSByZXF1aXJlKFwiLi8uLi8uLi9iYXNlL2Fubm90YXRpb24uanNcIikuRnVuY3Rpb25Bbm5vdGF0aW9uO1xuXG5cblxuICAgIHZhciBTeW50YXggPSB3YWxrLlN5bnRheDtcblxuXG4gICAgdmFyIHJlZ2lzdGVyR2xvYmFsQ29udGV4dCA9IGZ1bmN0aW9uIChwcm9ncmFtKSB7XG4gICAgICAgIHZhciBjdHggPSBuZXcgQ29udGV4dChwcm9ncmFtLCBudWxsLCB7bmFtZTogXCJnbG9iYWxcIn0pO1xuICAgICAgICBjdHgucmVnaXN0ZXJPYmplY3QoXCJNYXRoXCIsIE9iamVjdFJlZ2lzdHJ5LmdldEJ5TmFtZShcIk1hdGhcIikpO1xuICAgICAgICBjdHgucmVnaXN0ZXJPYmplY3QoXCJDb2xvclwiLCBPYmplY3RSZWdpc3RyeS5nZXRCeU5hbWUoXCJDb2xvclwiKSk7XG4gICAgICAgIGN0eC5yZWdpc3Rlck9iamVjdChcIlZlYzJcIiwgT2JqZWN0UmVnaXN0cnkuZ2V0QnlOYW1lKFwiVmVjMlwiKSk7XG4gICAgICAgIGN0eC5yZWdpc3Rlck9iamVjdChcIlZlYzNcIiwgT2JqZWN0UmVnaXN0cnkuZ2V0QnlOYW1lKFwiVmVjM1wiKSk7XG4gICAgICAgIGN0eC5yZWdpc3Rlck9iamVjdChcIlZlYzRcIiwgT2JqZWN0UmVnaXN0cnkuZ2V0QnlOYW1lKFwiVmVjNFwiKSk7XG4gICAgICAgIGN0eC5yZWdpc3Rlck9iamVjdChcIlRleHR1cmVcIiwgT2JqZWN0UmVnaXN0cnkuZ2V0QnlOYW1lKFwiVGV4dHVyZVwiKSk7XG4gICAgICAgIGN0eC5yZWdpc3Rlck9iamVjdChcIlNoYWRlXCIsIE9iamVjdFJlZ2lzdHJ5LmdldEJ5TmFtZShcIlNoYWRlXCIpKTtcbiAgICAgICAgY3R4LnJlZ2lzdGVyT2JqZWN0KFwidGhpc1wiLCBPYmplY3RSZWdpc3RyeS5nZXRCeU5hbWUoXCJTeXN0ZW1cIikpO1xuICAgICAgICByZXR1cm4gY3R4O1xuICAgIH1cblxuICAgIHZhciBUeXBlSW5mZXJlbmNlID0gZnVuY3Rpb24gKHJvb3QsIG9wdCkge1xuICAgICAgICBvcHQgPSBvcHQgfHwge307XG4gICAgICAgIHRoaXMucm9vdCA9IHJvb3Q7XG4gICAgICAgIHRoaXMuY29udGV4dCA9IFtdO1xuICAgICAgICAvKiogQHR5cGUge09iamVjdC48U3RyaW5nLCBBcnJheS48VHlwZUluZm8+fSAqKi9cbiAgICAgICAgdGhpcy5pbmplY3Rpb25zID0ge307XG4gICAgICAgIHRoaXMuZW50cnlQb2ludCA9IG9wdC5lbnRyeSB8fCBcImdsb2JhbC5zaGFkZVwiO1xuICAgICAgICB0aGlzLnJvb3QuaW5qZWN0aW9ucyA9IHRoaXMuaW5qZWN0aW9ucztcbiAgICAgICAgdGhpcy5mdW5jdGlvbnMgPSB7XG4gICAgICAgICAgICBvcmlnOiB7fSxcbiAgICAgICAgICAgIGRlcml2ZWQ6IHt9XG4gICAgICAgIH1cblxuICAgIH1cblxuICAgIEJhc2UuZXh0ZW5kKFR5cGVJbmZlcmVuY2UucHJvdG90eXBlLCB7XG4gICAgICAgIHB1c2hDb250ZXh0OiBmdW5jdGlvbiAoY29udGV4dCkge1xuICAgICAgICAgICAgdGhpcy5jb250ZXh0LnB1c2goY29udGV4dCk7XG4gICAgICAgICAgICB2YXIgaW5qZWN0aW9uID0gdGhpcy5pbmplY3Rpb25zW2NvbnRleHQuc3RyKCldO1xuICAgICAgICAgICAgaWYgKGluamVjdGlvbikge1xuICAgICAgICAgICAgICAgIGNvbnRleHQuaW5qZWN0UGFyYW1ldGVycyhpbmplY3Rpb24pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBwb3BDb250ZXh0OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB0aGlzLmNvbnRleHQucG9wKCk7XG4gICAgICAgIH0sXG4gICAgICAgIHBlZWtDb250ZXh0OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5jb250ZXh0W3RoaXMuY29udGV4dC5sZW5ndGggLSAxXTtcbiAgICAgICAgfSxcbiAgICAgICAgY3JlYXRlQ29udGV4dDogZnVuY3Rpb24gKG5vZGUsIHBhcmVudENvbnRleHQsIG5hbWUpIHtcbiAgICAgICAgICAgdmFyIHJlc3VsdCA9IG5ldyBDb250ZXh0KG5vZGUsIHBhcmVudENvbnRleHQsIHtuYW1lOiBuYW1lIH0gKTtcbiAgICAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgfSxcblxuICAgICAgICBhbm5vdGF0ZVBhcmFtZXRlcnM6IGZ1bmN0aW9uKGFycikge1xuICAgICAgICAgICAgcmV0dXJuIGFyciA/IGFyci5tYXAoZnVuY3Rpb24ocGFyYW0pIHtcbiAgICAgICAgICAgICAgICB2YXIgYW5ub3RhdGVkID0gIG5ldyBBbm5vdGF0aW9uKHBhcmFtKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gYW5ub3RhdGVkO1xuICAgICAgICAgICAgfSkgOiBbXTtcbiAgICAgICAgfSxcblxuXG4gICAgICAgIGJ1aWxkRnVuY3Rpb25NYXA6IGZ1bmN0aW9uKHByZykge1xuICAgICAgICAgICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgICAgICAgICAgd2Fsay5yZXBsYWNlKHByZywge1xuICAgICAgICAgICAgICAgIGVudGVyOiBmdW5jdGlvbihub2RlKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChub2RlLnR5cGUgPT0gU3ludGF4LkZ1bmN0aW9uRGVjbGFyYXRpb24pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciByZXN1bHQgPSBuZXcgRnVuY3Rpb25Bbm5vdGF0aW9uKG5vZGUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGZ1bmN0aW9uTmFtZSA9IG5vZGUuaWQubmFtZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBwYXJlbnRDb250ZXh0ID0gdGhhdC5wZWVrQ29udGV4dCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGZ1bmN0aW9uQ29udGV4dCA9IHRoYXQuY3JlYXRlQ29udGV4dChub2RlLCBwYXJlbnRDb250ZXh0LCBmdW5jdGlvbk5hbWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb25Db250ZXh0LmRlY2xhcmVQYXJhbWV0ZXJzKG5vZGUucGFyYW1zKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhcmVudENvbnRleHQuZGVjbGFyZVZhcmlhYmxlKGZ1bmN0aW9uTmFtZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBwYXJlbnRDb250ZXh0LnVwZGF0ZUV4cHJlc3Npb24oZnVuY3Rpb25OYW1lLCByZXN1bHQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC5wdXNoQ29udGV4dChmdW5jdGlvbkNvbnRleHQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC5mdW5jdGlvbnMub3JpZ1tmdW5jdGlvbkNvbnRleHQuc3RyKCldID0gbm9kZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgbGVhdmU6IGZ1bmN0aW9uKG5vZGUpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKG5vZGUudHlwZSA9PSBTeW50YXguRnVuY3Rpb25EZWNsYXJhdGlvbikge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC5wb3BDb250ZXh0KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4geyB0eXBlOiBTeW50YXguRW1wdHlTdGF0ZW1lbnQgfTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICBwcmcuYm9keSA9IHByZy5ib2R5LmZpbHRlcihmdW5jdGlvbihhKSB7IHJldHVybiBhLnR5cGUgIT0gU3ludGF4LkVtcHR5U3RhdGVtZW50OyB9KTtcbiAgICAgICAgfSxcblxuICAgICAgICB0cmF2ZXJzZTogZnVuY3Rpb24gKG5vZGUpIHtcbiAgICAgICAgICAgIHdhbGsudHJhdmVyc2Uobm9kZSwge1xuICAgICAgICAgICAgICAgIGVudGVyOiB0aGlzLmVudGVyTm9kZS5iaW5kKHRoaXMpLFxuICAgICAgICAgICAgICAgIGxlYXZlOiB0aGlzLmV4aXROb2RlLmJpbmQodGhpcylcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgcmV0dXJuIG5vZGU7XG4gICAgICAgIH0sXG5cbiAgICAgICAgZW50ZXJOb2RlOiBmdW5jdGlvbiAobm9kZSwgcGFyZW50KSB7XG4gICAgICAgICAgICB2YXIgY29udGV4dCA9IHRoaXMuY29udGV4dFt0aGlzLmNvbnRleHQubGVuZ3RoIC0gMV07XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5zd2l0Y2hLaW5kKG5vZGUsIHBhcmVudCwgY29udGV4dCwgZW50ZXJTdGF0ZW1lbnQsIGVudGVyRXhwcmVzc2lvbik7XG4gICAgICAgIH0sXG5cbiAgICAgICAgZXhpdE5vZGU6IGZ1bmN0aW9uIChub2RlLCBwYXJlbnQpIHtcbiAgICAgICAgICAgIHZhciBjb250ZXh0ID0gdGhpcy5jb250ZXh0W3RoaXMuY29udGV4dC5sZW5ndGggLSAxXTtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnN3aXRjaEtpbmQobm9kZSwgcGFyZW50LCBjb250ZXh0LCBleGl0U3RhdGVtZW50LCBleGl0RXhwcmVzc2lvbik7XG4gICAgICAgIH0sXG5cbiAgICAgICAgc3dpdGNoS2luZDogZnVuY3Rpb24gKG5vZGUsIHBhcmVudCwgY3R4LCBzdGF0ZW1lbnQsIGV4cHJlc3Npb24pIHtcbiAgICAgICAgICAgIHN3aXRjaCAobm9kZS50eXBlKSB7XG4gICAgICAgICAgICAgICAgY2FzZSBTeW50YXguQmxvY2tTdGF0ZW1lbnQ6XG4gICAgICAgICAgICAgICAgY2FzZSBTeW50YXguQnJlYWtTdGF0ZW1lbnQ6XG4gICAgICAgICAgICAgICAgY2FzZSBTeW50YXguQ2F0Y2hDbGF1c2U6XG4gICAgICAgICAgICAgICAgY2FzZSBTeW50YXguQ29udGludWVTdGF0ZW1lbnQ6XG4gICAgICAgICAgICAgICAgY2FzZSBTeW50YXguRGlyZWN0aXZlU3RhdGVtZW50OlxuICAgICAgICAgICAgICAgIGNhc2UgU3ludGF4LkRvV2hpbGVTdGF0ZW1lbnQ6XG4gICAgICAgICAgICAgICAgY2FzZSBTeW50YXguRGVidWdnZXJTdGF0ZW1lbnQ6XG4gICAgICAgICAgICAgICAgY2FzZSBTeW50YXguRW1wdHlTdGF0ZW1lbnQ6XG4gICAgICAgICAgICAgICAgY2FzZSBTeW50YXguRXhwcmVzc2lvblN0YXRlbWVudDpcbiAgICAgICAgICAgICAgICBjYXNlIFN5bnRheC5Gb3JTdGF0ZW1lbnQ6XG4gICAgICAgICAgICAgICAgY2FzZSBTeW50YXguRm9ySW5TdGF0ZW1lbnQ6XG4gICAgICAgICAgICAgICAgY2FzZSBTeW50YXguRnVuY3Rpb25EZWNsYXJhdGlvbjpcbiAgICAgICAgICAgICAgICBjYXNlIFN5bnRheC5JZlN0YXRlbWVudDpcbiAgICAgICAgICAgICAgICBjYXNlIFN5bnRheC5MYWJlbGVkU3RhdGVtZW50OlxuICAgICAgICAgICAgICAgIGNhc2UgU3ludGF4LlByb2dyYW06XG4gICAgICAgICAgICAgICAgY2FzZSBTeW50YXguUmV0dXJuU3RhdGVtZW50OlxuICAgICAgICAgICAgICAgIGNhc2UgU3ludGF4LlN3aXRjaFN0YXRlbWVudDpcbiAgICAgICAgICAgICAgICBjYXNlIFN5bnRheC5Td2l0Y2hDYXNlOlxuICAgICAgICAgICAgICAgIGNhc2UgU3ludGF4LlRocm93U3RhdGVtZW50OlxuICAgICAgICAgICAgICAgIGNhc2UgU3ludGF4LlRyeVN0YXRlbWVudDpcbiAgICAgICAgICAgICAgICBjYXNlIFN5bnRheC5WYXJpYWJsZURlY2xhcmF0aW9uOlxuICAgICAgICAgICAgICAgIGNhc2UgU3ludGF4LlZhcmlhYmxlRGVjbGFyYXRvcjpcbiAgICAgICAgICAgICAgICBjYXNlIFN5bnRheC5XaGlsZVN0YXRlbWVudDpcbiAgICAgICAgICAgICAgICBjYXNlIFN5bnRheC5XaXRoU3RhdGVtZW50OlxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gc3RhdGVtZW50LmNhbGwodGhpcywgbm9kZSwgcGFyZW50LCBjdHgpO1xuXG4gICAgICAgICAgICAgICAgY2FzZSBTeW50YXguQXNzaWdubWVudEV4cHJlc3Npb246XG4gICAgICAgICAgICAgICAgY2FzZSBTeW50YXguQXJyYXlFeHByZXNzaW9uOlxuICAgICAgICAgICAgICAgIGNhc2UgU3ludGF4LkFycmF5UGF0dGVybjpcbiAgICAgICAgICAgICAgICBjYXNlIFN5bnRheC5CaW5hcnlFeHByZXNzaW9uOlxuICAgICAgICAgICAgICAgIGNhc2UgU3ludGF4LkNhbGxFeHByZXNzaW9uOlxuICAgICAgICAgICAgICAgIGNhc2UgU3ludGF4LkNvbmRpdGlvbmFsRXhwcmVzc2lvbjpcbiAgICAgICAgICAgICAgICBjYXNlIFN5bnRheC5GdW5jdGlvbkV4cHJlc3Npb246XG4gICAgICAgICAgICAgICAgY2FzZSBTeW50YXguSWRlbnRpZmllcjpcbiAgICAgICAgICAgICAgICBjYXNlIFN5bnRheC5MaXRlcmFsOlxuICAgICAgICAgICAgICAgIGNhc2UgU3ludGF4LkxvZ2ljYWxFeHByZXNzaW9uOlxuICAgICAgICAgICAgICAgIGNhc2UgU3ludGF4Lk1lbWJlckV4cHJlc3Npb246XG4gICAgICAgICAgICAgICAgY2FzZSBTeW50YXguTmV3RXhwcmVzc2lvbjpcbiAgICAgICAgICAgICAgICBjYXNlIFN5bnRheC5PYmplY3RFeHByZXNzaW9uOlxuICAgICAgICAgICAgICAgIGNhc2UgU3ludGF4Lk9iamVjdFBhdHRlcm46XG4gICAgICAgICAgICAgICAgY2FzZSBTeW50YXguUHJvcGVydHk6XG4gICAgICAgICAgICAgICAgY2FzZSBTeW50YXguU2VxdWVuY2VFeHByZXNzaW9uOlxuICAgICAgICAgICAgICAgIGNhc2UgU3ludGF4LlRoaXNFeHByZXNzaW9uOlxuICAgICAgICAgICAgICAgIGNhc2UgU3ludGF4LlVuYXJ5RXhwcmVzc2lvbjpcbiAgICAgICAgICAgICAgICBjYXNlIFN5bnRheC5VcGRhdGVFeHByZXNzaW9uOlxuICAgICAgICAgICAgICAgIGNhc2UgU3ludGF4LllpZWxkRXhwcmVzc2lvbjpcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGV4cHJlc3Npb24uY2FsbCh0aGlzLCBub2RlLCBwYXJlbnQsIGN0eCk7XG5cbiAgICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1Vua25vd24gbm9kZSB0eXBlOiAnICsgbm9kZS50eXBlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcblxuICAgICAgICAvKipcbiAgICAgICAgICpcbiAgICAgICAgICogQHBhcmFtIHtPYmplY3R9IGZ1bmN0aW9uQVNUXG4gICAgICAgICAqIEBwYXJhbSB7QXJyYXkuPFR5cGVJbmZvPiBwYXJhbXNcbiAgICAgICAgICogQHBhcmFtIHtDb250ZXh0fSBwYXJlbnRDb250ZXh0XG4gICAgICAgICAqIEByZXR1cm5zIHsqfVxuICAgICAgICAgKi9cbiAgICAgICAgaW5mZXJGdW5jdGlvbjogZnVuY3Rpb24gKGZ1bmN0aW9uQVNULCBwYXJhbXMsIHBhcmVudENvbnRleHQpIHtcbiAgICAgICAgICAgIHZhciBmdW5jdGlvbk5hbWUgPSBmdW5jdGlvbkFTVC5pZC5uYW1lO1xuICAgICAgICAgICAgdmFyIHRhcmdldENvbnRleHROYW1lID0gcGFyZW50Q29udGV4dC5nZXRWYXJpYWJsZUlkZW50aWZpZXIoZnVuY3Rpb25OYW1lKTtcbiAgICAgICAgICAgIHRoaXMuaW5qZWN0aW9uc1t0YXJnZXRDb250ZXh0TmFtZV0gPSBwYXJhbXM7XG5cbiAgICAgICAgICAgIC8vIFdlIGhhdmUgYSBzcGVjaWZjIHR5cGUgc2V0IGluIHBhcmFtcyB0aGF0IHdlIGFubm90YXRlIHRvIHRoZVxuICAgICAgICAgICAgLy8gZnVuY3Rpb24gQVNUXG4gICAgICAgICAgICBmb3IodmFyIGkgPSAwOyBpIDwgcGFyYW1zLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgaWYgKGkgPT0gZnVuY3Rpb25BU1QucGFyYW1zLmxlbmd0aClcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgdmFyIGZ1bmNQYXJhbSA9IG5ldyBBbm5vdGF0aW9uKGZ1bmN0aW9uQVNULnBhcmFtc1tpXSk7XG4gICAgICAgICAgICAgICAgZnVuY1BhcmFtLnNldEZyb21FeHRyYShwYXJhbXNbaV0uZ2V0RXh0cmEoKSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHZhciBvbGRFbnRyeVBvaW50ID0gdGhpcy5lbnRyeVBvaW50O1xuICAgICAgICAgICAgdGhpcy5lbnRyeVBvaW50ID0gdGFyZ2V0Q29udGV4dE5hbWU7XG4gICAgICAgICAgICB0aGlzLnB1c2hDb250ZXh0KHBhcmVudENvbnRleHQpO1xuICAgICAgICAgICAgLy9jb25zb2xlLmxvZyhcIlN0YXJ0aW5nIHRvIHRyYXZlcnNlOiBcIiArIGZ1bmN0aW9uTmFtZSArIFwiIGluIGNvbnRleHQgXCIgKyBwYXJlbnRDb250ZXh0LnN0cigpKVxuICAgICAgICAgICAgdmFyIGFzdCA9IHRoaXMudHJhdmVyc2UoZnVuY3Rpb25BU1QpO1xuICAgICAgICAgICAgdGhpcy5wb3BDb250ZXh0KCk7XG4gICAgICAgICAgICB0aGlzLmVudHJ5UG9pbnQgPSBvbGRFbnRyeVBvaW50O1xuXG4gICAgICAgICAgICByZXR1cm4gYXN0O1xuICAgICAgICB9LFxuXG4gICAgICAgIGluZmVyUHJvZ3JhbTogZnVuY3Rpb24ocHJnLCBwYXJhbXMpIHtcbiAgICAgICAgICAgIHZhciBwYXJhbXMgPSBwYXJhbXMgfHwge307XG4gICAgICAgICAgICB2YXIgcHJvZ3JhbUNvbnRleHQgPSByZWdpc3Rlckdsb2JhbENvbnRleHQocHJnKTtcblxuICAgICAgICAgICAgdGhpcy5wdXNoQ29udGV4dChwcm9ncmFtQ29udGV4dCk7XG4gICAgICAgICAgICB0aGlzLmJ1aWxkRnVuY3Rpb25NYXAocHJnKTtcbiAgICAgICAgICAgIHRoaXMudHJhdmVyc2UocHJnKTtcbiAgICAgICAgICAgIHRoaXMucG9wQ29udGV4dCgpO1xuXG4gICAgICAgICAgICB2YXIgZW50cnlQb2ludCA9IHRoaXMuZW50cnlQb2ludDtcbiAgICAgICAgICAgIGlmICh0aGlzLmZ1bmN0aW9ucy5vcmlnLmhhc093blByb3BlcnR5KGVudHJ5UG9pbnQpKSB7XG4gICAgICAgICAgICAgICAgdmFyIGFzdCA9IHRoaXMuZnVuY3Rpb25zLm9yaWdbZW50cnlQb2ludF07XG4gICAgICAgICAgICAgICAgdmFyIHBhcmFtcyA9IHRoaXMuYW5ub3RhdGVQYXJhbWV0ZXJzKHBhcmFtc1tlbnRyeVBvaW50XSk7XG4gICAgICAgICAgICAgICAgdmFyIGFhc3QgPSB0aGlzLmluZmVyRnVuY3Rpb24oYXN0LCBwYXJhbXMsIHByb2dyYW1Db250ZXh0KTtcbiAgICAgICAgICAgICAgICBmb3IodmFyIGZ1bmMgaW4gdGhpcy5mdW5jdGlvbnMuZGVyaXZlZCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgdmFyaWF0aW9ucyA9IHRoaXMuZnVuY3Rpb25zLmRlcml2ZWRbZnVuY107XG4gICAgICAgICAgICAgICAgICAgIGZvciAodmFyIHNpZ25hdHVyZSBpbiB2YXJpYXRpb25zKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBwcmcuYm9keS5wdXNoKHZhcmlhdGlvbnNbc2lnbmF0dXJlXS5hc3QpO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcHJnLmJvZHkucHVzaChhYXN0KTtcblxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAodGhpcy5jb250ZXh0Lmxlbmd0aClcbiAgICAgICAgICAgICAgICB0aHJvdyBFcnJvcihcIlNvbWV0aGluZyB3ZW50IHdyb25nXCIpO1xuICAgICAgICAgICAgcmV0dXJuIHByZztcbiAgICAgICAgfSxcbiAgICAgICAgZ2V0RnVuY3Rpb25JbmZvcm1hdGlvbkZvcjogZnVuY3Rpb24obmFtZSwgYXJncywgZGVmaW5pbmdDb250ZXh0KSB7XG4gICAgICAgICAgICB2YXIgc2lnbmF0dXJlID0gYXJncy5yZWR1Y2UoZnVuY3Rpb24oc3RyLCBhcmcpIHsgcmV0dXJuIHN0ciArIGFyZy5nZXRUeXBlU3RyaW5nKCl9LCBcIlwiKTtcbiAgICAgICAgICAgIGlmICh0aGlzLmZ1bmN0aW9ucy5kZXJpdmVkLmhhc093blByb3BlcnR5KG5hbWUpKSB7XG4gICAgICAgICAgICAgICAgdmFyIGRlcml2ZWRGdW5jdGlvbiA9IHRoaXMuZnVuY3Rpb25zLmRlcml2ZWRbbmFtZV07XG4gICAgICAgICAgICAgICAgaWYgKGRlcml2ZWRGdW5jdGlvbi5oYXNPd25Qcm9wZXJ0eShzaWduYXR1cmUpKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBkZXJpdmVkRnVuY3Rpb25bc2lnbmF0dXJlXS5pbmZvO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh0aGlzLmZ1bmN0aW9ucy5vcmlnLmhhc093blByb3BlcnR5KG5hbWUpKSB7XG4gICAgICAgICAgICAgICAgdmFyIGFzdCA9IHRoaXMuZnVuY3Rpb25zLm9yaWdbbmFtZV07XG4gICAgICAgICAgICAgICAgdmFyIHZhcmlhdGlvbnMgPSB0aGlzLmZ1bmN0aW9ucy5kZXJpdmVkW25hbWVdID0gdGhpcy5mdW5jdGlvbnMuZGVyaXZlZFtuYW1lXSB8fCB7fTtcbiAgICAgICAgICAgICAgICB2YXIgZGVyaXZlZCA9IHZhcmlhdGlvbnNbc2lnbmF0dXJlXSA9IHt9O1xuICAgICAgICAgICAgICAgIGRlcml2ZWQuYXN0ID0gdGhpcy5pbmZlckZ1bmN0aW9uKEpTT04ucGFyc2UoSlNPTi5zdHJpbmdpZnkoYXN0KSksIGFyZ3MsIGRlZmluaW5nQ29udGV4dCk7XG4gICAgICAgICAgICAgICAgZGVyaXZlZC5pbmZvID0gZGVyaXZlZC5hc3QuZXh0cmEucmV0dXJuSW5mbztcbiAgICAgICAgICAgICAgICBkZXJpdmVkLmluZm8ubmV3TmFtZSA9IG5hbWUucmVwbGFjZSgvXFwuL2csICdfJykgKyBPYmplY3Qua2V5cyh2YXJpYXRpb25zKS5sZW5ndGg7XG4gICAgICAgICAgICAgICAgZGVyaXZlZC5hc3QuaWQubmFtZSA9IGRlcml2ZWQuaW5mby5uZXdOYW1lO1xuICAgICAgICAgICAgICAgIHJldHVybiBkZXJpdmVkLmluZm87XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJDb3VsZCBub3QgcmVzb2x2ZSBmdW5jdGlvbiBcIiArIG5hbWUpO1xuICAgICAgICB9XG5cbiAgICB9KTtcblxuXG4gICAgbnMuaW5mZXIgPSBmdW5jdGlvbiAoYXN0LCBvcHQpIHtcbiAgICAgICAgdmFyIHRpID0gbmV3IFR5cGVJbmZlcmVuY2UoYXN0LCBvcHQpO1xuICAgICAgICByZXR1cm4gdGkuaW5mZXJQcm9ncmFtKHRpLnJvb3QsIG9wdC5pbmplY3QpO1xuICAgIH07XG5cblxufShleHBvcnRzKSk7XG4iLCIoZnVuY3Rpb24obnMpe1xuXG4gICAgdmFyIFNoYWRlID0gcmVxdWlyZShcIi4uL2ludGVyZmFjZXMuanNcIiksXG4gICAgICAgIFN5bnRheCA9IHJlcXVpcmUoJ2VzdHJhdmVyc2UnKS5TeW50YXgsXG4gICAgICAgIEJhc2UgPSByZXF1aXJlKFwiLi9pbmRleC5qc1wiKSxcbiAgICAgICAgVHlwZUluZm8gPSByZXF1aXJlKFwiLi90eXBlaW5mby5qc1wiKS5UeXBlSW5mbztcblxuICAgIHZhciBUWVBFUyA9IFNoYWRlLlRZUEVTLFxuICAgICAgICBLSU5EUyA9IFNoYWRlLk9CSkVDVF9LSU5EUztcblxuXG4gICAgLyoqXG4gICAgICogQHBhcmFtIHtvYmplY3R9IG5vZGVcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gZXh0cmFcbiAgICAgKiBAZXh0ZW5kcyBUeXBlSW5mb1xuICAgICAqIEBjb25zdHJ1Y3RvclxuICAgICAqL1xuICAgIHZhciBBbm5vdGF0aW9uID0gZnVuY3Rpb24gKG5vZGUsIGV4dHJhKSB7XG4gICAgICAgIFR5cGVJbmZvLmNhbGwodGhpcywgbm9kZSwgZXh0cmEpO1xuICAgIH07XG5cbiAgICBCYXNlLmNyZWF0ZUNsYXNzKEFubm90YXRpb24sIFR5cGVJbmZvLCB7XG5cbiAgICAgICAgc2V0Q2FsbCA6IGZ1bmN0aW9uKGNhbGwpIHtcbiAgICAgICAgICAgIHZhciBleHRyYSA9IHRoaXMuZ2V0RXh0cmEoKTtcbiAgICAgICAgICAgIGV4dHJhLmV2YWx1YXRlID0gY2FsbDtcbiAgICAgICAgfSxcbiAgICAgICAgZ2V0Q2FsbCA6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuZ2V0RXh0cmEoKS5ldmFsdWF0ZTtcbiAgICAgICAgfSxcbiAgICAgICAgY2xlYXJDYWxsOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHZhciBleHRyYSA9IHRoaXMuZ2V0RXh0cmEoKTtcbiAgICAgICAgICAgIGRlbGV0ZSBleHRyYS5ldmFsdWF0ZTtcbiAgICAgICAgfSxcbiAgICAgICAgZWxpbWluYXRlIDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICB2YXIgZXh0cmEgPSB0aGlzLmdldEV4dHJhKCk7XG4gICAgICAgICAgICBleHRyYS5lbGltaW5hdGUgPSB0cnVlO1xuICAgICAgICB9LFxuICAgICAgICBjYW5FbGltaW5hdGUgOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHZhciBleHRyYSA9IHRoaXMuZ2V0RXh0cmEoKTtcbiAgICAgICAgICAgIHJldHVybiBleHRyYS5lbGltaW5hdGUgPT0gdHJ1ZTtcbiAgICAgICAgfVxuXG4gICAgfSk7XG5cbiAgICAvKipcbiAgICAgKiBAcGFyYW0ge0FycmF5LjxvYmplY3Q+fSBhcnIgQXJyYXkgb2Ygbm9kZXNcbiAgICAgKiBAcGFyYW0ge0NvbnRleHR9IGN0eFxuICAgICAqIEByZXR1cm5zIHtBcnJheS48QW5ub3RhdGlvbj59XG4gICAgICovXG4gICAgQW5ub3RhdGlvbi5jcmVhdGVBbm5vdGF0ZWROb2RlQXJyYXkgPSBmdW5jdGlvbihhcnIsIGN0eCkge1xuICAgICAgICByZXR1cm4gYXJyLm1hcChmdW5jdGlvbiAoYXJnKSB7XG4gICAgICAgICAgICByZXR1cm4gY3R4LmNyZWF0ZVR5cGVJbmZvKGFyZyk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuXG4gICAgLyoqXG4gICAgICogQHBhcmFtIHtvYmplY3R9IG5vZGVcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gZXh0cmFcbiAgICAgKiBAZXh0ZW5kcyBBbm5vdGF0aW9uXG4gICAgICogQGNvbnN0cnVjdG9yXG4gICAgICovXG4gICAgdmFyIEZ1bmN0aW9uQW5ub3RhdGlvbiA9IGZ1bmN0aW9uIChub2RlLCBleHRyYSkge1xuICAgICAgICBBbm5vdGF0aW9uLmNhbGwodGhpcywgbm9kZSwgZXh0cmEpO1xuICAgICAgICB0aGlzLnNldFR5cGUoVFlQRVMuRlVOQ1RJT04pO1xuICAgIH07XG5cbiAgICBCYXNlLmNyZWF0ZUNsYXNzKEZ1bmN0aW9uQW5ub3RhdGlvbiwgQW5ub3RhdGlvbiwge1xuICAgICAgICBnZXRSZXR1cm5JbmZvOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmdldEV4dHJhKCkucmV0dXJuSW5mbztcbiAgICAgICAgfSxcbiAgICAgICAgc2V0UmV0dXJuSW5mbzogZnVuY3Rpb24oaW5mbykge1xuICAgICAgICAgICAgdGhpcy5nZXRFeHRyYSgpLnJldHVybkluZm8gPSBpbmZvO1xuICAgICAgICB9LFxuICAgICAgICBpc1VzZWQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcmV0dXJuICEhdGhpcy5nZXRFeHRyYSgpLnVzZWQ7XG4gICAgICAgIH0sXG4gICAgICAgIHNldFVzZWQ6IGZ1bmN0aW9uKHYpIHtcbiAgICAgICAgICAgIHRoaXMuZ2V0RXh0cmEoKS51c2VkID0gdjtcbiAgICAgICAgfVxuICAgIH0pO1xuXG4gICAgbnMuQW5ub3RhdGlvbiA9IEFubm90YXRpb247XG4gICAgbnMuRnVuY3Rpb25Bbm5vdGF0aW9uID0gRnVuY3Rpb25Bbm5vdGF0aW9uO1xuICAgIG5zLkFOTk8gPSBmdW5jdGlvbihvYmplY3Qpe3JldHVybiBuZXcgQW5ub3RhdGlvbihvYmplY3QpfTtcblxufShleHBvcnRzKSk7XG4iLCIoZnVuY3Rpb24obnMpe1xuXG4gICAgdmFyIEJhc2UgPSByZXF1aXJlKFwiLi9pbmRleC5qc1wiKSxcbiAgICAgICAgU2hhZGUgPSByZXF1aXJlKFwiLi4vaW50ZXJmYWNlcy5qc1wiKSxcbiAgICAgICAgVFlQRVMgPSBTaGFkZS5UWVBFUyxcbiAgICAgICAgQW5ub3RhdGlvbiA9IHJlcXVpcmUoXCIuL2Fubm90YXRpb24uanNcIikuQW5ub3RhdGlvbixcbiAgICAgICAgVHlwZUluZm8gPSByZXF1aXJlKFwiLi90eXBlaW5mby5qc1wiKS5UeXBlSW5mbyxcbiAgICAgICAgU3ludGF4ID0gcmVxdWlyZSgnZXN0cmF2ZXJzZScpLlN5bnRheDtcblxuICAgIG5zLmdldENvbnRleHQgPSBmdW5jdGlvbihyZWdpc3RyeSkge1xuXG4gICAgLyoqXG4gICAgICpcbiAgICAgKiBAcGFyYW0gYmluZGluZ1xuICAgICAqIEBleHRlbmRzIFR5cGVJbmZvXG4gICAgICogQGNvbnN0cnVjdG9yXG4gICAgICovXG4gICAgdmFyIEJpbmRpbmcgPSBmdW5jdGlvbihiaW5kaW5nLCByZWdpc3RlcnkpIHtcbiAgICAgICAgVHlwZUluZm8uY2FsbCh0aGlzLCBiaW5kaW5nKTtcbiAgICAgICAgaWYodGhpcy5ub2RlLnJlZikge1xuICAgICAgICAgICAgaWYgKCFyZWdpc3RlcnlbdGhpcy5ub2RlLnJlZl0pXG4gICAgICAgICAgICAgICAgdGhyb3cgRXJyb3IoXCJObyBvYmplY3QgaGFzIGJlZW4gcmVnaXN0ZXJlZCBmb3I6IFwiICsgdGhpcy5ub2RlLnJlZik7XG4gICAgICAgICAgICB0aGlzLmdsb2JhbE9iamVjdCA9IHJlZ2lzdGVyeVt0aGlzLm5vZGUucmVmXS5vYmplY3Q7XG4gICAgICAgICAgICBpZiAodGhpcy5nbG9iYWxPYmplY3QpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnNldFR5cGUoVFlQRVMuT0JKRUNUKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH07XG5cblxuICAgIEJhc2UuY3JlYXRlQ2xhc3MoQmluZGluZywgVHlwZUluZm8sIHtcbiAgICAgICAgaGFzQ29uc3RydWN0b3I6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcmV0dXJuICEhdGhpcy5nZXRDb25zdHJ1Y3RvcigpO1xuICAgICAgICB9LFxuICAgICAgICBnZXRDb25zdHJ1Y3RvcjogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5nbG9iYWxPYmplY3QgJiYgdGhpcy5nbG9iYWxPYmplY3QuY29uc3RydWN0b3I7XG4gICAgICAgIH0sXG4gICAgICAgIGlzSW5pdGlhbGl6ZWQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMubm9kZS5pbml0aWFsaXplZDtcbiAgICAgICAgfSxcbiAgICAgICAgc2V0SW5pdGlhbGl6ZWQ6IGZ1bmN0aW9uKHYpIHtcbiAgICAgICAgICAgIHRoaXMubm9kZS5pbml0aWFsaXplZCA9IHY7XG4gICAgICAgIH0sXG4gICAgICAgIGhhc1N0YXRpY1ZhbHVlOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfSxcbiAgICAgICAgaXNHbG9iYWw6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMubm9kZS5pbmZvICYmIHRoaXMubm9kZS5pbmZvLl9nbG9iYWwgfHwgVHlwZUluZm8ucHJvdG90eXBlLmlzR2xvYmFsLmNhbGwodGhpcyk7XG4gICAgICAgIH0sXG4gICAgICAgIGdldFR5cGU6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuZ2xvYmFsT2JqZWN0PyBUWVBFUy5PQkpFQ1QgOiBUeXBlSW5mby5wcm90b3R5cGUuZ2V0VHlwZS5jYWxsKHRoaXMpO1xuICAgICAgICB9LFxuICAgICAgICBnZXRPYmplY3RJbmZvOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLmdsb2JhbE9iamVjdClcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5nbG9iYWxPYmplY3Quc3RhdGljO1xuICAgICAgICAgICAgaWYgKHRoaXMuaXNPYmplY3QoKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLm5vZGUuaW5mbyB8fCByZWdpc3RyeS5nZXRJbnN0YW5jZUZvcktpbmQodGhpcy5nZXRLaW5kKCkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH0sXG4gICAgICAgIGdldEluZm9Gb3JTaWduYXR1cmU6IGZ1bmN0aW9uKHNpZ25hdHVyZSkge1xuICAgICAgICAgICAgdmFyIGV4dHJhID0gdGhpcy5nZXRFeHRyYSgpO1xuICAgICAgICAgICAgaWYoIWV4dHJhLnNpZ25hdHVyZXMpXG4gICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgICByZXR1cm4gZXh0cmEuc2lnbmF0dXJlc1tzaWduYXR1cmVdO1xuICAgICAgICB9LFxuICAgICAgICBzZXRJbmZvRm9yU2lnbmF0dXJlOiBmdW5jdGlvbihzaWduYXR1cmUsIGluZm8pIHtcbiAgICAgICAgICAgIHZhciBleHRyYSA9IHRoaXMuZ2V0RXh0cmEoKTtcbiAgICAgICAgICAgIGlmKCFleHRyYS5zaWduYXR1cmVzKVxuICAgICAgICAgICAgICAgIGV4dHJhLnNpZ25hdHVyZXMgPSB7fTtcbiAgICAgICAgICAgIHJldHVybiBleHRyYS5zaWduYXR1cmVzW3NpZ25hdHVyZV0gPSBpbmZvO1xuICAgICAgICB9XG5cblxuICAgIH0pXG5cblxuICAgIC8qKlxuICAgICAqIEBwYXJhbSB7Q29udGV4dHxudWxsfSBwYXJlbnRcbiAgICAgKiBAcGFyYW0gb3B0XG4gICAgICogQGNvbnN0cnVjdG9yXG4gICAgICovXG4gICAgdmFyIENvbnRleHQgPSBmdW5jdGlvbihub2RlLCBwYXJlbnQsIG9wdCkge1xuICAgICAgICBvcHQgPSBvcHQgfHwge307XG5cbiAgICAgICAgLyoqIEB0eXBlIChDb250ZXh0fG51bGwpICovXG4gICAgICAgIHRoaXMucGFyZW50ID0gcGFyZW50IHx8IG9wdC5wYXJlbnQgfHwgbnVsbDtcbiAgICAgICAgdGhpcy5yZWdpc3RlcnkgPSBwYXJlbnQgPyBwYXJlbnQucmVnaXN0ZXJ5IDoge307XG5cbiAgICAgICAgdGhpcy5jb250ZXh0ID0gbm9kZS5jb250ZXh0ID0gbm9kZS5jb250ZXh0IHx8IHt9O1xuXG4gICAgICAgIC8qKiBAdHlwZSB7T2JqZWN0LjxzdHJpbmcsIHtpbml0aWFsaXplZDogYm9vbGVhbiwgYW5ub3RhdGlvbjogQW5ub3RhdGlvbn0+fSAqL1xuICAgICAgICB0aGlzLmNvbnRleHQuYmluZGluZ3MgPSB0aGlzLmNvbnRleHQuYmluZGluZ3MgfHwge307XG4gICAgICAgIGlmKG9wdC5iaW5kaW5ncykge1xuICAgICAgICAgICAgQmFzZS5leHRlbmQodGhpcy5jb250ZXh0LmJpbmRpbmdzLCBvcHQuYmluZGluZ3MpO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5jb250ZXh0Lm5hbWUgPSBvcHQubmFtZSB8fCBub2RlLm5hbWUgfHwgXCI8YW5vbnltb3VzPlwiO1xuXG4gICAgfTtcblxuICAgIEJhc2UuZXh0ZW5kKENvbnRleHQucHJvdG90eXBlLCB7XG5cbiAgICAgICAgZ2V0TmFtZTogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5jb250ZXh0Lm5hbWU7XG4gICAgICAgIH0sXG5cbiAgICAgICAgZ2V0QmluZGluZ3M6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuY29udGV4dC5iaW5kaW5ncztcbiAgICAgICAgfSxcblxuICAgICAgICB1cGRhdGVSZXR1cm5JbmZvOiBmdW5jdGlvbihhbm5vdGF0aW9uKSB7XG4gICAgICAgICAgICB0aGlzLmNvbnRleHQucmV0dXJuSW5mbyA9IGFubm90YXRpb24uZ2V0RXh0cmEoKTtcbiAgICAgICAgfSxcbiAgICAgICAgZ2V0UmV0dXJuSW5mbzogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5jb250ZXh0LnJldHVybkluZm87XG4gICAgICAgIH0sXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEBwYXJhbSB7c3RyaW5nfSBuYW1lXG4gICAgICAgICAqIEByZXR1cm5zIHsqfVxuICAgICAgICAgKi9cbiAgICAgICAgZ2V0QmluZGluZ0J5TmFtZTogZnVuY3Rpb24obmFtZSkge1xuICAgICAgICAgICAgdmFyIGJpbmRpbmdzID0gdGhpcy5nZXRCaW5kaW5ncygpO1xuICAgICAgICAgICAgdmFyIGJpbmRpbmcgPSBiaW5kaW5nc1tuYW1lXTtcbiAgICAgICAgICAgIGlmKGJpbmRpbmcgIT09IHVuZGVmaW5lZClcbiAgICAgICAgICAgICAgICByZXR1cm4gbmV3IEJpbmRpbmcoYmluZGluZywgdGhpcy5yZWdpc3RlcnkpO1xuICAgICAgICAgICAgaWYgKHRoaXMucGFyZW50KVxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLnBhcmVudC5nZXRCaW5kaW5nQnlOYW1lKG5hbWUpO1xuICAgICAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAgICAgfSxcblxuICAgICAgICAvKipcbiAgICAgICAgICogQHBhcmFtIHtzdHJpbmd9IG5hbWVcbiAgICAgICAgICogQHJldHVybnMge0NvbnRleHR8bnVsbH1cbiAgICAgICAgICovXG4gICAgICAgIGdldENvbnRleHRGb3JOYW1lOiBmdW5jdGlvbihuYW1lKSB7XG4gICAgICAgICAgICB2YXIgYmluZGluZ3MgPSB0aGlzLmdldEJpbmRpbmdzKCk7XG4gICAgICAgICAgICBpZihiaW5kaW5nc1tuYW1lXSAhPT0gdW5kZWZpbmVkKVxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICAgICAgaWYgKHRoaXMucGFyZW50KVxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLnBhcmVudC5nZXRDb250ZXh0Rm9yTmFtZShuYW1lKTtcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9LFxuXG4gICAgICAgIGdldFZhcmlhYmxlSWRlbnRpZmllcjogZnVuY3Rpb24obmFtZSkge1xuICAgICAgICAgICAgdmFyIGNvbnRleHQgPSB0aGlzLmdldENvbnRleHRGb3JOYW1lKG5hbWUpO1xuICAgICAgICAgICAgaWYoIWNvbnRleHQpXG4gICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgICByZXR1cm4gY29udGV4dC5zdHIoKSArIFwiLlwiICsgbmFtZTtcbiAgICAgICAgfSxcblxuICAgICAgICBkZWNsYXJlVmFyaWFibGU6IGZ1bmN0aW9uKG5hbWUsIGZhaWwsIHBvc2l0aW9uKSB7XG4gICAgICAgICAgICB2YXIgYmluZGluZ3MgPSB0aGlzLmdldEJpbmRpbmdzKCk7XG4gICAgICAgICAgICBmYWlsID0gKGZhaWwgPT0gdW5kZWZpbmVkKSA/IHRydWUgOiBmYWlsO1xuICAgICAgICAgICAgaWYgKGJpbmRpbmdzW25hbWVdKSB7XG4gICAgICAgICAgICAgICAgaWYgKGZhaWwpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKG5hbWUgKyBcIiB3YXMgYWxyZWFkeSBkZWNsYXJlZCBpbiB0aGlzIHNjb3BlLlwiKVxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHZhciBpbml0ID0ge1xuICAgICAgICAgICAgICAgIGluaXRpYWxpemVkIDogZmFsc2UsXG4gICAgICAgICAgICAgICAgaW5pdFBvc2l0aW9uOiBwb3NpdGlvbixcbiAgICAgICAgICAgICAgICBleHRyYToge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiBUWVBFUy5VTkRFRklORURcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgYmluZGluZ3NbbmFtZV0gPSBpbml0O1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH0sXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqXG4gICAgICAgICAqIEBwYXJhbSB7c3RyaW5nfSBuYW1lXG4gICAgICAgICAqIEBwYXJhbSB7VHlwZUluZm99IHR5cGVJbmZvXG4gICAgICAgICAqL1xuICAgICAgICB1cGRhdGVFeHByZXNzaW9uOiBmdW5jdGlvbiAobmFtZSwgdHlwZUluZm8pIHtcbiAgICAgICAgICAgIHZhciB2ID0gdGhpcy5nZXRCaW5kaW5nQnlOYW1lKG5hbWUpO1xuICAgICAgICAgICAgaWYgKCF2KSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiVmFyaWFibGUgd2FzIG5vdCBkZWNsYXJlZCBpbiB0aGlzIHNjb3BlOiBcIiArIG5hbWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHYuaXNJbml0aWFsaXplZCgpICYmIHYuZ2V0VHlwZSgpICE9PSB0eXBlSW5mby5nZXRUeXBlKCkpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJWYXJpYWJsZSBtYXkgbm90IGNoYW5nZSBpdCdzIHR5cGU6IFwiICsgbmFtZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoIXYuaXNJbml0aWFsaXplZCgpKSB7XG4gICAgICAgICAgICAgICAgLy8gQW5ub3RhdGUgdGhlIGRlY2xhcmF0aW9uLCBpZiBvbmUgaXMgZ2l2ZW5cbiAgICAgICAgICAgICAgICBpZih2Lm5vZGUuaW5pdFBvc2l0aW9uKVxuICAgICAgICAgICAgICAgICAgICB2Lm5vZGUuaW5pdFBvc2l0aW9uLmNvcHkodHlwZUluZm8pO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB2LmNvcHkodHlwZUluZm8pO1xuICAgICAgICAgICAgdi5zZXREeW5hbWljVmFsdWUoKTtcbiAgICAgICAgICAgIHYuc2V0SW5pdGlhbGl6ZWQoIXR5cGVJbmZvLmlzVW5kZWZpbmVkKCkpO1xuICAgICAgICB9LFxuXG4gICAgICAgIHJlZ2lzdGVyT2JqZWN0OiBmdW5jdGlvbihuYW1lLCBvYmopIHtcbiAgICAgICAgICAgIHRoaXMucmVnaXN0ZXJ5W29iai5pZF0gPSBvYmo7XG4gICAgICAgICAgICB2YXIgYmluZGluZ3MgPSB0aGlzLmdldEJpbmRpbmdzKCk7XG4gICAgICAgICAgICBiaW5kaW5nc1tuYW1lXSA9IHtcbiAgICAgICAgICAgICAgICBleHRyYToge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiBUWVBFUy5PQkpFQ1RcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHJlZjogb2JqLmlkXG4gICAgICAgICAgICB9O1xuICAgICAgICB9LFxuXG4gICAgICAgIGRlY2xhcmVQYXJhbWV0ZXJzOiBmdW5jdGlvbihwYXJhbXMpIHtcbiAgICAgICAgICAgIHZhciBiaW5kaW5ncyA9IHRoaXMuZ2V0QmluZGluZ3MoKTtcbiAgICAgICAgICAgIHRoaXMucGFyYW1zID0gW107XG4gICAgICAgICAgICBmb3IodmFyIGkgPSAwOyBpIDwgcGFyYW1zLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgdmFyIHBhcmFtZXRlciA9IHBhcmFtc1tpXTtcbiAgICAgICAgICAgICAgICB0aGlzLnBhcmFtc1tpXSA9IHBhcmFtZXRlci5uYW1lO1xuICAgICAgICAgICAgICAgIGJpbmRpbmdzW3BhcmFtZXRlci5uYW1lXSA9IHsgdHlwZTogVFlQRVMuVU5ERUZJTkVEIH07XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqXG4gICAgICAgICAqIEBwYXJhbSB7QXJyYXkuPFR5cGVJbmZvPn0gPHBhcmFtc1xuICAgICAgICAgKi9cbiAgICAgICAgaW5qZWN0UGFyYW1ldGVyczogZnVuY3Rpb24ocGFyYW1zKSB7XG4gICAgICAgICAgICBmb3IodmFyIGkgPSAwOyBpPCBwYXJhbXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICBpZiAoaSA9PSB0aGlzLnBhcmFtcy5sZW5ndGgpXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIHZhciBuYW1lID0gdGhpcy5wYXJhbXNbaV07XG4gICAgICAgICAgICAgICAgdmFyIGJpbmRpbmdzID0gdGhpcy5nZXRCaW5kaW5ncygpO1xuICAgICAgICAgICAgICAgIGJpbmRpbmdzW25hbWVdID0geyBleHRyYToge30gfTtcbiAgICAgICAgICAgICAgICBCYXNlLmRlZXBFeHRlbmQoYmluZGluZ3NbbmFtZV0uZXh0cmEsIHBhcmFtc1tpXS5nZXRFeHRyYSgpKTtcbiAgICAgICAgICAgICAgICBpZiAocGFyYW1zW2ldLmdldE5vZGVJbmZvKCkpIHtcbiAgICAgICAgICAgICAgICAgICAgYmluZGluZ3NbbmFtZV0uaW5mbyA9IHt9O1xuICAgICAgICAgICAgICAgICAgICBCYXNlLmRlZXBFeHRlbmQoYmluZGluZ3NbbmFtZV0uaW5mbywgcGFyYW1zW2ldLmdldE5vZGVJbmZvKCkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcblxuICAgICAgICBzdHI6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgdmFyIGN0eCA9IHRoaXM7XG4gICAgICAgICAgICB2YXIgbmFtZXMgPSBbXTtcbiAgICAgICAgICAgIHdoaWxlKGN0eCkge1xuICAgICAgICAgICAgICAgIG5hbWVzLnVuc2hpZnQoY3R4LmdldE5hbWUoKSk7XG4gICAgICAgICAgICAgICAgY3R4ID0gY3R4LnBhcmVudDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBuYW1lcy5qb2luKFwiLlwiKTtcbiAgICAgICAgfSxcblxuICAgICAgICBnZXRBbGxCaW5kaW5nczogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICB2YXIgcmVzdWx0ID0gT2JqZWN0LmtleXModGhpcy5nZXRCaW5kaW5ncygpKTtcbiAgICAgICAgICAgIGlmICh0aGlzLnBhcmVudCkge1xuICAgICAgICAgICAgICAgIHZhciBwYXJlbnRCaW5kaW5ncyA9IHRoaXMucGFyZW50LmdldEFsbEJpbmRpbmdzKCk7XG4gICAgICAgICAgICAgICAgZm9yKHZhciBpID0gMDsgaSA8IHBhcmVudEJpbmRpbmdzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChyZXN1bHQuaW5kZXhPZihwYXJlbnRCaW5kaW5nc1tpXSkgIT09IC0xKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXN1bHQucHVzaChwYXJlbnRCaW5kaW5nc1tpXSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgICB9LFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKlxuICAgICAgICAgKiBAcGFyYW0gbm9kZVxuICAgICAgICAgKiBAcmV0dXJucyB7VHlwZUluZm99XG4gICAgICAgICAqL1xuICAgICAgICBjcmVhdGVUeXBlSW5mbzogZnVuY3Rpb24gKG5vZGUpIHtcbiAgICAgICAgICAgIHZhciByZXN1bHQgPSBuZXcgQW5ub3RhdGlvbihub2RlKTtcbiAgICAgICAgICAgIGlmIChub2RlLnR5cGUgPT0gU3ludGF4LklkZW50aWZpZXIpIHtcbiAgICAgICAgICAgICAgICB2YXIgbmFtZSA9IG5vZGUubmFtZTtcbiAgICAgICAgICAgICAgICB2YXIgYmluZGluZyA9IHRoaXMuZ2V0QmluZGluZ0J5TmFtZShuYW1lKTtcbiAgICAgICAgICAgICAgICBpZiAoYmluZGluZykge1xuICAgICAgICAgICAgICAgICAgICByZXN1bHQuY29weShiaW5kaW5nKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGJpbmRpbmc7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgfSxcblxuICAgICAgICBnZXRPYmplY3RJbmZvRm9yOiBmdW5jdGlvbihvYmopIHtcbiAgICAgICAgICAgIGlmICghb2JqLmlzT2JqZWN0KCkpXG4gICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XG5cbiAgICAgICAgICAgIC8qIFRoZSBUeXBlSW5mbyBtaWdodCBrbm93IGFib3V0IGl0J3Mgb2JqZWN0IHR5cGUgKi9cbiAgICAgICAgICAgIGlmIChvYmouZ2V0T2JqZWN0SW5mbykge1xuICAgICAgICAgICAgICAgIHJldHVybiBvYmouZ2V0T2JqZWN0SW5mbygpO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgdmFyIG5vZGVJbmZvID0gb2JqLmdldE5vZGVJbmZvKCk7XG4gICAgICAgICAgICBpZiAobm9kZUluZm8pIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbm9kZUluZm87XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gcmVnaXN0cnkuZ2V0SW5zdGFuY2VGb3JLaW5kKG9iai5nZXRLaW5kKCkpXG4gICAgICAgIH1cblxuICAgIH0pO1xuXG5cbiAgICAgICAgcmV0dXJuIENvbnRleHQ7XG5cbiAgICB9O1xuXG5cblxufShleHBvcnRzKSk7XG4iLCIoZnVuY3Rpb24obnMpe1xuXG4gICAgbnMuZXh0ZW5kID0gZnVuY3Rpb24oYSwgYikge1xuICAgICAgICBmb3IgKCB2YXIgcHJvcCBpbiBiKSB7XG4gICAgICAgICAgICB2YXIgZyA9IGIuX19sb29rdXBHZXR0ZXJfXyhwcm9wKSwgcyA9IGIuX19sb29rdXBTZXR0ZXJfXyhwcm9wKTtcbiAgICAgICAgICAgIGlmIChnfHxzKSB7XG4gICAgICAgICAgICAgICAgaWYgKGcpIHtcbiAgICAgICAgICAgICAgICAgICAgYS5fX2RlZmluZUdldHRlcl9fKHByb3AsIGcpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAocykge1xuICAgICAgICAgICAgICAgICAgICBhLl9fZGVmaW5lU2V0dGVyX18ocHJvcCwgcyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBpZiAoYltwcm9wXSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgIGRlbGV0ZSBhW3Byb3BdO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAocHJvcCAhPT0gXCJjb25zdHJ1Y3RvclwiIHx8IGEgIT09IHdpbmRvdykge1xuICAgICAgICAgICAgICAgICAgICBhW3Byb3BdID0gYltwcm9wXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGE7XG4gICAgfTtcblxuICAgIG5zLmRlZXBFeHRlbmQgPSBmdW5jdGlvbihkZXN0aW5hdGlvbiwgc291cmNlKSB7XG4gICAgICAgIGZvciAodmFyIHByb3BlcnR5IGluIHNvdXJjZSkge1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBzb3VyY2VbcHJvcGVydHldID09PSBcIm9iamVjdFwiICYmIHNvdXJjZVtwcm9wZXJ0eV0gIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICBkZXN0aW5hdGlvbltwcm9wZXJ0eV0gPSBkZXN0aW5hdGlvbltwcm9wZXJ0eV0gfHwge307XG4gICAgICAgICAgICAgICAgbnMuZGVlcEV4dGVuZChkZXN0aW5hdGlvbltwcm9wZXJ0eV0sIHNvdXJjZVtwcm9wZXJ0eV0pO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBkZXN0aW5hdGlvbltwcm9wZXJ0eV0gPSBzb3VyY2VbcHJvcGVydHldO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqXG4gICAgICogQHBhcmFtIHtPYmplY3R9IGN0b3IgQ29uc3RydWN0b3JcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcGFyZW50IFBhcmVudCBjbGFzc1xuICAgICAqIEBwYXJhbSB7T2JqZWN0PX0gbWV0aG9kcyBNZXRob2RzIHRvIGFkZCB0byB0aGUgY2xhc3NcbiAgICAgKiBAcmV0dXJuIHtPYmplY3QhfVxuICAgICAqL1xuICAgIG5zLmNyZWF0ZUNsYXNzID0gZnVuY3Rpb24oY3RvciwgcGFyZW50LCBtZXRob2RzKSB7XG4gICAgICAgIG1ldGhvZHMgPSBtZXRob2RzIHx8IHt9O1xuICAgICAgICBpZiAocGFyZW50KSB7XG4gICAgICAgICAgICAvKiogQGNvbnN0cnVjdG9yICovXG4gICAgICAgICAgICB2YXIgRiA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIEYucHJvdG90eXBlID0gcGFyZW50LnByb3RvdHlwZTtcbiAgICAgICAgICAgIGN0b3IucHJvdG90eXBlID0gbmV3IEYoKTtcbiAgICAgICAgICAgIGN0b3IucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gY3RvcjtcbiAgICAgICAgICAgIGN0b3Iuc3VwZXJjbGFzcyA9IHBhcmVudC5wcm90b3R5cGU7XG4gICAgICAgIH1cbiAgICAgICAgZm9yICggdmFyIG0gaW4gbWV0aG9kcykge1xuICAgICAgICAgICAgY3Rvci5wcm90b3R5cGVbbV0gPSBtZXRob2RzW21dO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBjdG9yO1xuICAgIH07XG5cblxufShleHBvcnRzKSlcbiIsIihmdW5jdGlvbihucyl7XG5cbiAgICB2YXIgU2hhZGUgPSByZXF1aXJlKFwiLi4vaW50ZXJmYWNlcy5qc1wiKSxcbiAgICAgICAgU3ludGF4ID0gcmVxdWlyZSgnZXN0cmF2ZXJzZScpLlN5bnRheCxcbiAgICAgICAgQmFzZSA9IHJlcXVpcmUoXCIuL2luZGV4LmpzXCIpO1xuXG4gICAgdmFyIFRZUEVTID0gU2hhZGUuVFlQRVMsXG4gICAgICAgIEtJTkRTID0gU2hhZGUuT0JKRUNUX0tJTkRTO1xuXG5cbiAgICAvKipcbiAgICAgKiBAcGFyYW0geyp9IG5vZGUgQ2FycmllciBvYmplY3QgZm9yIHRoZSB0eXBlIGluZm8sIG9ubHkgbm9kZS5leHRyYSBnZXRzIHBvbGx1dGVkXG4gICAgICogQHBhcmFtIHtPYmplY3Q/fSBleHRyYVxuICAgICAqIEBjb25zdHJ1Y3RvclxuICAgICAqL1xuICAgIHZhciBUeXBlSW5mbyA9IGZ1bmN0aW9uIChub2RlLCBleHRyYSkge1xuICAgICAgICB0aGlzLm5vZGUgPSBub2RlO1xuICAgICAgICB0aGlzLm5vZGUuZXh0cmEgPSB0aGlzLm5vZGUuZXh0cmEgfHwge307XG4gICAgICAgIGlmIChleHRyYSkge1xuICAgICAgICAgICAgQmFzZS5kZWVwRXh0ZW5kKHRoaXMubm9kZS5leHRyYSwgZXh0cmEpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgVHlwZUluZm8uY3JlYXRlRm9yQ29udGV4dCA9IGZ1bmN0aW9uKG5vZGUsIGN0eCkge1xuICAgICAgICB2YXIgcmVzdWx0ID0gbmV3IFR5cGVJbmZvKG5vZGUpO1xuICAgICAgICBpZiAocmVzdWx0LmdldFR5cGUoKSAhPT0gVFlQRVMuQU5ZKSB7XG4gICAgICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKG5vZGUudHlwZSA9PSBTeW50YXguSWRlbnRpZmllcikge1xuICAgICAgICAgICAgdmFyIG5hbWUgPSBub2RlLm5hbWU7XG4gICAgICAgICAgICB2YXIgdmFyaWFibGUgPSBjdHguZ2V0QmluZGluZ0J5TmFtZShuYW1lKTtcbiAgICAgICAgICAgIHJldHVybiBuZXcgVHlwZUluZm8obm9kZSwgdmFyaWFibGUpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxuXG4gICAgVHlwZUluZm8ucHJvdG90eXBlID0ge1xuICAgICAgICBnZXRFeHRyYTogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMubm9kZS5leHRyYTtcbiAgICAgICAgfSxcbiAgICAgICAgZ2V0VHlwZTogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdmFyIGV4dHJhID0gdGhpcy5nZXRFeHRyYSgpO1xuICAgICAgICAgICAgaWYgKGV4dHJhLnR5cGUgIT0gdW5kZWZpbmVkKVxuICAgICAgICAgICAgICAgIHJldHVybiBleHRyYS50eXBlO1xuICAgICAgICAgICAgcmV0dXJuIFRZUEVTLkFOWTtcbiAgICAgICAgfSxcblxuICAgICAgICBzZXRLaW5kOiBmdW5jdGlvbiAoa2luZCkge1xuICAgICAgICAgICAgdmFyIGV4dHJhID0gdGhpcy5nZXRFeHRyYSgpO1xuICAgICAgICAgICAgZXh0cmEua2luZCA9IGtpbmQ7XG4gICAgICAgIH0sXG5cbiAgICAgICAgZ2V0S2luZDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgaWYgKCF0aGlzLmlzT2JqZWN0KCkpXG4gICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5nZXRFeHRyYSgpLmtpbmQgfHwgS0lORFMuQU5ZO1xuICAgICAgICB9LFxuXG4gICAgICAgIGdldEFycmF5RWxlbWVudFR5cGU6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGlmKCF0aGlzLmlzQXJyYXkoKSlcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJDYWxsZWQgZ2V0QXJyYXlFbGVtZW50VHlwZSBvbiBcIiArIHRoaXMuZ2V0VHlwZSgpKTtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmdldEV4dHJhKCkuZWxlbWVudHM7XG4gICAgICAgIH0sXG5cbiAgICAgICAgaXNPZktpbmQ6IGZ1bmN0aW9uKGtpbmQpIHtcbiAgICAgICAgICAgIGlmICghdGhpcy5pc09iamVjdCgpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuZ2V0S2luZCgpID09IGtpbmQ7XG4gICAgICAgIH0sXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEBwYXJhbSB7c3RyaW5nfSB0eXBlXG4gICAgICAgICAqIEBwYXJhbSB7c3RyaW5nP30ga2luZFxuICAgICAgICAgKi9cbiAgICAgICAgc2V0VHlwZTogZnVuY3Rpb24gKHR5cGUsIGtpbmQpIHtcbiAgICAgICAgICAgIHZhciBleHRyYSA9IHRoaXMuZ2V0RXh0cmEoKTtcbiAgICAgICAgICAgIGV4dHJhLnR5cGUgPSB0eXBlO1xuICAgICAgICAgICAgaWYgKGtpbmQpXG4gICAgICAgICAgICAgICAgdGhpcy5zZXRLaW5kKGtpbmQpO1xuICAgICAgICB9LFxuXG4gICAgICAgIGlzT2ZUeXBlOiBmdW5jdGlvbiAodHlwZSkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuZ2V0VHlwZSgpID09IHR5cGU7XG4gICAgICAgIH0sXG5cbiAgICAgICAgZXF1YWxzOiBmdW5jdGlvbiAob3RoZXIpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmdldFR5cGUoKSA9PSBvdGhlci5nZXRUeXBlKCkgJiYgdGhpcy5nZXRLaW5kKCkgPT0gb3RoZXIuZ2V0S2luZCgpO1xuICAgICAgICB9LFxuXG4gICAgICAgIGlzSW50OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5pc09mVHlwZShUWVBFUy5JTlQpO1xuICAgICAgICB9LFxuICAgICAgICBpc051bWJlcjogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuaXNPZlR5cGUoVFlQRVMuTlVNQkVSKTtcbiAgICAgICAgfSxcbiAgICAgICAgaXNOdWxsT3JVbmRlZmluZWQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmlzTnVsbCgpIHx8IHRoaXMuaXNVbmRlZmluZWQoKTtcbiAgICAgICAgfSxcbiAgICAgICAgaXNOdWxsOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5pc09mVHlwZShUWVBFUy5OVUxMKTtcbiAgICAgICAgfSxcbiAgICAgICAgaXNVbmRlZmluZWQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmlzT2ZUeXBlKFRZUEVTLlVOREVGSU5FRCk7XG4gICAgICAgIH0sXG4gICAgICAgIGlzQm9vbDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuaXNPZlR5cGUoVFlQRVMuQk9PTEVBTik7XG4gICAgICAgIH0sXG4gICAgICAgIGlzU3RyaW5nOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5pc09mVHlwZShUWVBFUy5TVFJJTkcpO1xuICAgICAgICB9LFxuICAgICAgICBpc0FycmF5OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5pc09mVHlwZShUWVBFUy5BUlJBWSk7XG4gICAgICAgIH0sXG4gICAgICAgIGlzRnVuY3Rpb246IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmlzT2ZUeXBlKFRZUEVTLkZVTkNUSU9OKTtcbiAgICAgICAgfSxcbiAgICAgICAgaXNPYmplY3Q6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmlzT2ZUeXBlKFRZUEVTLk9CSkVDVCk7XG4gICAgICAgIH0sXG4gICAgICAgIGlzR2xvYmFsOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHJldHVybiAhIXRoaXMuZ2V0RXh0cmEoKS5nbG9iYWw7XG4gICAgICAgIH0sXG4gICAgICAgIHNldEdsb2JhbDogZnVuY3Rpb24gKGdsb2JhbCkge1xuICAgICAgICAgICAgdmFyIGV4dHJhID0gdGhpcy5nZXRFeHRyYSgpO1xuICAgICAgICAgICAgZXh0cmEuZ2xvYmFsID0gZ2xvYmFsO1xuICAgICAgICB9LFxuICAgICAgICBjYW5OdW1iZXI6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmlzTnVtYmVyKCkgfHwgdGhpcy5pc0ludCgpIHx8IHRoaXMuaXNCb29sKCk7XG4gICAgICAgIH0sXG4gICAgICAgIGNhbkludDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuaXNJbnQoKSB8fCB0aGlzLmlzQm9vbCgpO1xuICAgICAgICB9LFxuICAgICAgICBoYXNTdGF0aWNWYWx1ZSA6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgdmFyIGV4dHJhID0gdGhpcy5nZXRFeHRyYSgpO1xuICAgICAgICAgICAgaWYgKHRoaXMuaXNOdWxsT3JVbmRlZmluZWQoKSlcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIHJldHVybiBleHRyYS5oYXNPd25Qcm9wZXJ0eShcInN0YXRpY1ZhbHVlXCIpO1xuICAgICAgICB9LFxuICAgICAgICBzZXRTdGF0aWNWYWx1ZSA6IGZ1bmN0aW9uKHYpIHtcbiAgICAgICAgICAgIHZhciBleHRyYSA9IHRoaXMuZ2V0RXh0cmEoKTtcbiAgICAgICAgICAgIGlmICh0aGlzLmlzTnVsbE9yVW5kZWZpbmVkKCkpXG4gICAgICAgICAgICAgICAgdGhyb3coXCJOdWxsIGFuZCB1bmRlZmluZWQgaGF2ZSBwcmVkZWZpbmVkIHZhbHVlcy5cIik7XG4gICAgICAgICAgICBleHRyYS5zdGF0aWNWYWx1ZSA9IHY7XG4gICAgICAgIH0sXG4gICAgICAgIGdldFN0YXRpY1ZhbHVlIDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBpZiAoIXRoaXMuaGFzU3RhdGljVmFsdWUoKSkge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIk5vZGUgaGFzIG5vIHN0YXRpYyB2YWx1ZTogXCIgKyB0aGlzLm5vZGUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHRoaXMuaXNOdWxsKCkpXG4gICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgICBpZiAodGhpcy5pc1VuZGVmaW5lZCgpKVxuICAgICAgICAgICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5nZXRFeHRyYSgpLnN0YXRpY1ZhbHVlO1xuICAgICAgICB9LFxuICAgICAgICBzZXREeW5hbWljVmFsdWUgOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGRlbGV0ZSB0aGlzLmdldEV4dHJhKCkuc3RhdGljVmFsdWU7XG4gICAgICAgIH0sXG4gICAgICAgIHNldENhbGwgOiBmdW5jdGlvbihjYWxsKSB7XG4gICAgICAgICAgICB2YXIgZXh0cmEgPSB0aGlzLmdldEV4dHJhKCk7XG4gICAgICAgICAgICBleHRyYS5ldmFsdWF0ZSA9IGNhbGw7XG4gICAgICAgIH0sXG4gICAgICAgIGdldENhbGwgOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmdldEV4dHJhKCkuZXZhbHVhdGU7XG4gICAgICAgIH0sXG4gICAgICAgIGNsZWFyQ2FsbDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICB2YXIgZXh0cmEgPSB0aGlzLmdldEV4dHJhKCk7XG4gICAgICAgICAgICBkZWxldGUgZXh0cmEuZXZhbHVhdGU7XG4gICAgICAgIH0sXG4gICAgICAgIGNvcHk6IGZ1bmN0aW9uKG90aGVyKSB7XG4gICAgICAgICAgICBCYXNlLmRlZXBFeHRlbmQodGhpcy5ub2RlLmV4dHJhLCBvdGhlci5nZXRFeHRyYSgpKTtcbiAgICAgICAgfSxcbiAgICAgICAgc3RyOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHZhciBleHRyYSA9IHRoaXMuZ2V0RXh0cmEoKTtcbiAgICAgICAgICAgIHJldHVybiBKU09OLnN0cmluZ2lmeShleHRyYSwgbnVsbCwgMSk7XG4gICAgICAgIH0sXG4gICAgICAgIGNhbk5vcm1hbDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5pc09iamVjdCgpICYmICh0aGlzLmlzT2ZLaW5kKEtJTkRTLk5PUk1BTCkgfHwgdGhpcy5pc09mS2luZChLSU5EUy5GTE9BVDMpKTtcbiAgICAgICAgfSxcbiAgICAgICAgY2FuQ29sb3I6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuaXNPYmplY3QoKSAmJiAodGhpcy5pc09mS2luZChLSU5EUy5GTE9BVDQpIHx8IHRoaXMuaXNPZktpbmQoS0lORFMuRkxPQVQzKSk7XG4gICAgICAgIH0sXG4gICAgICAgIGVsaW1pbmF0ZSA6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgdmFyIGV4dHJhID0gdGhpcy5nZXRFeHRyYSgpO1xuICAgICAgICAgICAgZXh0cmEuZWxpbWluYXRlID0gdHJ1ZTtcbiAgICAgICAgfSxcbiAgICAgICAgY2FuRWxpbWluYXRlIDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICB2YXIgZXh0cmEgPSB0aGlzLmdldEV4dHJhKCk7XG4gICAgICAgICAgICByZXR1cm4gZXh0cmEuZWxpbWluYXRlID09IHRydWU7XG4gICAgICAgIH0sXG4gICAgICAgIHNldEZyb21FeHRyYTogZnVuY3Rpb24oZXh0cmEpe1xuICAgICAgICAgICAgdGhpcy5zZXRUeXBlKGV4dHJhLnR5cGUpO1xuICAgICAgICAgICAgaWYgKGV4dHJhLmtpbmQgIT0gdW5kZWZpbmVkKVxuICAgICAgICAgICAgICAgIHRoaXMuc2V0S2luZChleHRyYS5raW5kKTtcbiAgICAgICAgICAgIHRoaXMuc2V0R2xvYmFsKGV4dHJhLmdsb2JhbCk7XG4gICAgICAgICAgICBpZiAoZXh0cmEuc3RhdGljVmFsdWUgIT0gdW5kZWZpbmVkKVxuICAgICAgICAgICAgICAgIHRoaXMuc2V0U3RhdGljVmFsdWUoZXh0cmEuc3RhdGljVmFsdWUpO1xuICAgICAgICAgICAgaWYgKGV4dHJhLmV2YWx1YXRlICE9IHVuZGVmaW5lZClcbiAgICAgICAgICAgICAgICB0aGlzLnNldENhbGwoZXh0cmEuZXZhbHVhdGUpO1xuICAgICAgICAgICAgaWYgKGV4dHJhLnNvdXJjZSAhPSB1bmRlZmluZWQpXG4gICAgICAgICAgICAgICAgdGhpcy5zZXRTb3VyY2UoZXh0cmEuc291cmNlKTtcbiAgICAgICAgfSxcbiAgICAgICAgZ2V0Tm9kZUluZm86IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgaWYgKHRoaXMuaXNPYmplY3QoKSlcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5nZXRFeHRyYSgpLmluZm87XG4gICAgICAgIH0sXG4gICAgICAgIGdldFR5cGVTdHJpbmc6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgaWYgKHRoaXMuaXNPYmplY3QoKSlcbiAgICAgICAgICAgICAgICByZXR1cm4gXCJPYmplY3QgIzxcIiArIHRoaXMuZ2V0S2luZCgpICsgXCI+XCI7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5nZXRUeXBlKCk7XG4gICAgICAgIH0sXG4gICAgICAgIHNldFNvdXJjZTogZnVuY3Rpb24oc291cmNlKSB7XG4gICAgICAgICAgICB2YXIgZXh0cmEgPSB0aGlzLmdldEV4dHJhKCk7XG4gICAgICAgICAgICBleHRyYS5zb3VyY2UgPSBzb3VyY2U7XG4gICAgICAgIH0sXG4gICAgICAgIGdldFNvdXJjZTogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5nZXRFeHRyYSgpLnNvdXJjZTtcbiAgICAgICAgfVxuXG4gICAgfVxuXG4gICAgbnMuVHlwZUluZm8gPSBUeXBlSW5mbztcblxufShleHBvcnRzKSk7XG4iLCIoZnVuY3Rpb24obnMpe1xuXG4gICAgbnMuc3dpenpsZVRvSW5kZXggPSBmdW5jdGlvbihzd2l6emxlS2V5KXtcbiAgICAgICAgc3dpdGNoKHN3aXp6bGVLZXkpe1xuICAgICAgICAgICAgY2FzZSAneCc6Y2FzZSAncicgOmNhc2UgJ3MnOiByZXR1cm4gMDtcbiAgICAgICAgICAgIGNhc2UgJ3knOmNhc2UgJ2cnIDpjYXNlICd0JzogcmV0dXJuIDE7XG4gICAgICAgICAgICBjYXNlICd6JzpjYXNlICdiJyA6Y2FzZSAncCc6IHJldHVybiAyO1xuICAgICAgICAgICAgY2FzZSAndyc6Y2FzZSAnYScgOmNhc2UgJ3EnOiByZXR1cm4gMztcbiAgICAgICAgfVxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJVbmtub3duIHN3aXp6bGUga2V5OiAnXCIgKyBzd2l6emxlS2V5ICsgXCInXCIpO1xuICAgIH07XG4gICAgbnMuaW5kZXhUb1N3aXp6bGUgPSBmdW5jdGlvbihpbmRleCl7XG4gICAgICAgIHN3aXRjaChpbmRleCl7XG4gICAgICAgICAgICBjYXNlIDA6IHJldHVybiAneCc7XG4gICAgICAgICAgICBjYXNlIDE6IHJldHVybiAneSc7XG4gICAgICAgICAgICBjYXNlIDI6IHJldHVybiAneic7XG4gICAgICAgICAgICBjYXNlIDM6IHJldHVybiAndyc7XG4gICAgICAgIH1cbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiVW5rbm93biBzd2l6emxlIGluZGV4OiAnXCIgKyBpbmRleCArIFwiJ1wiKTtcbiAgICB9O1xuICAgIG5zLnN3aXp6bGVTZXRzID0gW1xuICAgICAgICBbJ3gnLCAneScsICd6JywgJ3cnXSxcbiAgICAgICAgWydyJywgJ2cnLCAnYicsICdhJ10sXG4gICAgICAgIFsncycsICd0JywgJ3AnLCAncSddXG4gICAgXTtcblxufShleHBvcnRzKSlcbiIsIihmdW5jdGlvbiAobnMpIHtcblxuICAgIHZhciBCYXNlID0gcmVxdWlyZShcIi4uLy4uL2Jhc2UvaW5kZXguanNcIik7XG5cbiAgICB2YXIgVHJhbnNmb3JtZXIgPSByZXF1aXJlKFwiLi90cmFuc2Zvcm0uanNcIikuR0xBU1RUcmFuc2Zvcm1lcjtcbiAgICB2YXIgZ2VuZXJhdGUgPSByZXF1aXJlKFwiLi9nbHNsLWdlbmVyYXRlLmpzXCIpLmdlbmVyYXRlO1xuXG4gICAgdmFyIEdMU0xDb21waWxlciA9IGZ1bmN0aW9uICgpIHtcblxuICAgIH07XG5cbiAgICBCYXNlLmV4dGVuZChHTFNMQ29tcGlsZXIucHJvdG90eXBlLCB7XG5cbiAgICAgICAgY29tcGlsZUZyYWdtZW50U2hhZGVyOiBmdW5jdGlvbiAoYWFzdCwgb3B0KSB7XG5cbiAgICAgICAgICAgIHZhciB0cmFuc2Zvcm1lciA9IG5ldyBUcmFuc2Zvcm1lcihcImdsb2JhbC5zaGFkZVwiKTtcblxuICAgICAgICAgICAgLy9jb25zb2xlLmxvZyhKU09OLnN0cmluZ2lmeShhYXN0LCAwLCBcIiBcIikpO1xuXG4gICAgICAgICAgICB2YXIgdHJhbnNmb3JtZWQgPSB0cmFuc2Zvcm1lci50cmFuc2Zvcm1BQVNUKGFhc3QpO1xuXG4gICAgICAgICAgICAvL2NvbnNvbGUubG9nKEpTT04uc3RyaW5naWZ5KGFhc3QsIDAsIFwiIFwiKSk7XG5cbiAgICAgICAgICAgIHZhciBjb2RlID0gZ2VuZXJhdGUodHJhbnNmb3JtZWQsIG9wdCk7XG5cbiAgICAgICAgICAgIHJldHVybiBjb2RlO1xuICAgICAgICB9XG5cbiAgICB9KTtcblxuXG4gICAgbnMuR0xTTENvbXBpbGVyID0gR0xTTENvbXBpbGVyO1xuXG59KGV4cG9ydHMpKTtcbiIsIihmdW5jdGlvbiAobnMpIHtcblxuICAgIHZhciBGdW5jdGlvbkFubm90YXRpb24gPSByZXF1aXJlKFwiLi8uLi8uLi9iYXNlL2Fubm90YXRpb24uanNcIikuRnVuY3Rpb25Bbm5vdGF0aW9uO1xuICAgIHZhciBTaGFkZSA9IHJlcXVpcmUoXCIuLy4uLy4uL2ludGVyZmFjZXMuanNcIik7XG4gICAgdmFyIHdhbGsgPSByZXF1aXJlKCdlc3RyYXZlcnNlJyksXG4gICAgICAgIFN5bnRheCA9IHdhbGsuU3ludGF4LFxuICAgICAgICBWaXNpdG9yT3B0aW9uID0gd2Fsay5WaXNpdG9yT3B0aW9uO1xuXG4gICAgdmFyIFR5cGVzID0gU2hhZGUuVFlQRVMsXG4gICAgICAgIEtpbmRzID0gU2hhZGUuT0JKRUNUX0tJTkRTLFxuICAgICAgICBTb3VyY2VzID0gU2hhZGUuU09VUkNFUztcblxuXG5cbiAgICAvKipcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gb3B0XG4gICAgICovXG4gICAgdmFyIGdldEhlYWRlciA9IGZ1bmN0aW9uIChvcHQpIHtcbiAgICAgICAgaWYgKG9wdC5vbWl0SGVhZGVyID09IHRydWUpXG4gICAgICAgICAgICByZXR1cm4gW107XG4gICAgICAgIHZhciBoZWFkZXIgPSBbXG4gICAgICAgICAgICBcIi8vIEdlbmVyYXRlZCBieSBzaGFkZS5qc1wiXG4gICAgICAgIF07XG4gICAgICAgIHZhciBmbG9hdFByZWNpc2lvbiA9IG9wdC5mbG9hdFByZWNpc2lvbiB8fCBcIm1lZGl1bXBcIjtcbiAgICAgICAgaGVhZGVyLnB1c2goXCJwcmVjaXNpb24gXCIgKyBmbG9hdFByZWNpc2lvbiArIFwiIGZsb2F0O1wiKTtcbiAgICAgICAgcmV0dXJuIGhlYWRlcjtcbiAgICB9XG5cbiAgICB2YXIgdG9HTFNMVHlwZSA9IGZ1bmN0aW9uIChpbmZvLCBhbGxvd1VuZGVmaW5lZCkge1xuICAgICAgICBzd2l0Y2ggKGluZm8udHlwZSkge1xuICAgICAgICAgICAgY2FzZSBUeXBlcy5PQkpFQ1Q6XG4gICAgICAgICAgICAgICAgc3dpdGNoIChpbmZvLmtpbmQpIHtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBLaW5kcy5GTE9BVDQ6XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gXCJ2ZWM0XCI7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgS2luZHMuRkxPQVQzOlxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFwidmVjM1wiO1xuICAgICAgICAgICAgICAgICAgICBjYXNlIEtpbmRzLkZMT0FUMjpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBcInZlYzJcIjtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBLaW5kcy5URVhUVVJFOlxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFwic2FtcGxlcjJEXCJcbiAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBcIjx1bmRlZmluZWQ+XCI7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2FzZSBUeXBlcy5VTkRFRklORUQ6XG4gICAgICAgICAgICAgICAgaWYgKGFsbG93VW5kZWZpbmVkKVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gXCJ2b2lkXCI7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiQ291bGQgbm90IGRldGVybWluZSB0eXBlXCIpO1xuICAgICAgICAgICAgY2FzZSBUeXBlcy5OVU1CRVI6XG4gICAgICAgICAgICAgICAgcmV0dXJuIFwiZmxvYXRcIjtcbiAgICAgICAgICAgIGNhc2UgVHlwZXMuQk9PTEVBTjpcbiAgICAgICAgICAgICAgICByZXR1cm4gXCJib29sXCI7XG4gICAgICAgICAgICBjYXNlIFR5cGVzLklOVDpcbiAgICAgICAgICAgICAgICByZXR1cm4gXCJpbnRcIjtcbiAgICAgICAgICAgIGNhc2UgVHlwZXMuQk9PTEVBTjpcbiAgICAgICAgICAgICAgICByZXR1cm4gXCJib29sXCI7XG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcInRvR0xTTFR5cGU6IFVuaGFuZGxlZCB0eXBlOiBcIiArIGluZm8udHlwZSk7XG5cbiAgICAgICAgfVxuICAgIH1cblxuICAgIHZhciB0b0dMU0xTb3VyY2UgPSBmdW5jdGlvbihpbmZvKSB7XG4gICAgICAgIGlmICghaW5mby5zb3VyY2UpXG4gICAgICAgICAgICByZXR1cm4gXCJcIjtcbiAgICAgICAgaWYgKGluZm8uc291cmNlID09IFNvdXJjZXMuVkVSVEVYKVxuICAgICAgICAgICAgcmV0dXJuIFwidmFyeWluZ1wiO1xuICAgICAgICBpZiAoaW5mby5zb3VyY2UgPT0gU291cmNlcy5VTklGT1JNKVxuICAgICAgICAgICAgcmV0dXJuIFwidW5pZm9ybVwiO1xuICAgICAgICBpZiAoaW5mby5zb3VyY2UgPT0gU291cmNlcy5DT05TVEFOVClcbiAgICAgICAgICAgIHJldHVybiBcImNvbnN0XCI7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcInRvR0xTTFNvdXJjZTogVW5oYW5kbGVkIHR5cGU6IFwiICsgaW5mby5zb3VyY2UpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGNyZWF0ZUxpbmVTdGFjaygpIHtcbiAgICAgICAgdmFyIGFyciA9IFtdO1xuICAgICAgICBhcnIucHVzaC5hcHBseShhcnIsIGFyZ3VtZW50cyk7XG4gICAgICAgIHZhciBpbmRlbnQgPSBcIlwiO1xuICAgICAgICBhcnIuYXBwZW5kTGluZSA9IGZ1bmN0aW9uKGxpbmUpe1xuICAgICAgICAgICAgdGhpcy5wdXNoKGluZGVudCArIGxpbmUpO1xuICAgICAgICB9O1xuICAgICAgICBhcnIuY2hhbmdlSW5kZW50aW9uID0gZnVuY3Rpb24oYWRkKXtcbiAgICAgICAgICAgIHdoaWxlKGFkZCA+IDApe1xuICAgICAgICAgICAgICAgIGluZGVudCArPSBcIiAgICBcIjsgYWRkLS07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZihhZGQgPCAwKXtcbiAgICAgICAgICAgICAgICBpbmRlbnQgPSBpbmRlbnQuc3Vic3RyKDAsIGluZGVudC5sZW5ndGggKyBhZGQqNCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgICAgIGFyci5hcHBlbmQgPSBmdW5jdGlvbihzdHIpe1xuICAgICAgICAgICAgdGhpc1t0aGlzLmxlbmd0aC0xXSA9IHRoaXNbdGhpcy5sZW5ndGgtMV0gKyBzdHI7XG4gICAgICAgIH07XG4gICAgICAgIHJldHVybiBhcnI7XG4gICAgfTtcblxuXG4gICAgLypCYXNlLmV4dGVuZChMaW5lU3RhY2sucHJvdG90eXBlLCB7XG5cbiAgICB9KTsqL1xuXG4gICAgdmFyIGdlbmVyYXRlID0gZnVuY3Rpb24gKGFzdCwgb3B0KSB7XG5cbiAgICAgICAgb3B0ID0gb3B0IHx8IHt9O1xuXG4gICAgICAgIHZhciBsaW5lcyA9IGNyZWF0ZUxpbmVTdGFjaygpO1xuXG4gICAgICAgIHRyYXZlcnNlKGFzdCwgbGluZXMsIG9wdCk7XG5cbiAgICAgICAgcmV0dXJuIGxpbmVzLmpvaW4oXCJcXG5cIik7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gdHJhdmVyc2UoYXN0LCBsaW5lcywgb3B0KSB7XG4gICAgICAgIHZhciBpbnNpZGVNYWluID0gZmFsc2U7XG5cblxuICAgICAgICB3YWxrLnRyYXZlcnNlKGFzdCwge1xuICAgICAgICAgICAgICAgIGVudGVyOiBmdW5jdGlvbiAobm9kZSkge1xuICAgICAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHR5cGUgPSBub2RlLnR5cGU7XG4gICAgICAgICAgICAgICAgICAgICAgICBzd2l0Y2ggKHR5cGUpIHtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgU3ludGF4LlByb2dyYW06XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGdldEhlYWRlcihvcHQpLmZvckVhY2goZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxpbmVzLnB1c2goZSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuXG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXNlIFN5bnRheC5GdW5jdGlvbkRlY2xhcmF0aW9uOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgZnVuYyA9IG5ldyBGdW5jdGlvbkFubm90YXRpb24obm9kZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBtZXRob2RTdGFydCA9IFt0b0dMU0xUeXBlKGZ1bmMuZ2V0UmV0dXJuSW5mbygpLCB0cnVlKV07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1ldGhvZFN0YXJ0LnB1c2gobm9kZS5pZC5uYW1lLCAnKCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZihub2RlLmlkLm5hbWUgPT0gXCJtYWluXCIpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpbnNpZGVNYWluID0gdHJ1ZTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoIShub2RlLnBhcmFtcyAmJiBub2RlLnBhcmFtcy5sZW5ndGgpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtZXRob2RTdGFydC5wdXNoKFwidm9pZFwiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5vZGUucGFyYW1zLmZvckVhY2goZnVuY3Rpb24gKHBhcmFtKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbWV0aG9kU3RhcnQucHVzaCh0b0dMU0xUeXBlKHBhcmFtLmV4dHJhKSwgcGFyYW0ubmFtZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1ldGhvZFN0YXJ0LnB1c2goJykgeycpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsaW5lcy5hcHBlbmRMaW5lKG1ldGhvZFN0YXJ0LmpvaW4oXCIgXCIpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGluZXMuY2hhbmdlSW5kZW50aW9uKDEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG5cblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgU3ludGF4LlJldHVyblN0YXRlbWVudDpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGhhc0FyZ3VtZW50cyA9IG5vZGUuYXJndW1lbnQ7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxpbmVzLmFwcGVuZExpbmUoXCJyZXR1cm4gXCIgKyAoaGFzQXJndW1lbnRzID8gaGFuZGxlRXhwcmVzc2lvbihub2RlLmFyZ3VtZW50KSA6IFwiXCIpICsgXCI7XCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXNlIFN5bnRheC5WYXJpYWJsZURlY2xhcmF0b3IgOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBjb25zb2xlLmxvZyhcIk1lZXAhXCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgc291cmNlID0gIWluc2lkZU1haW4gPyB0b0dMU0xTb3VyY2Uobm9kZS5leHRyYSkgOiBudWxsO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgbGluZSA9IHNvdXJjZSA/IHNvdXJjZSArIFwiIFwiIDogXCJcIjtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGluZSArPSB0b0dMU0xUeXBlKG5vZGUuZXh0cmEpICsgXCIgXCIgKyBub2RlLmlkLm5hbWU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChub2RlLmluaXQpIGxpbmUgKz0gXCIgPSBcIiArIGhhbmRsZUV4cHJlc3Npb24obm9kZS5pbml0KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGluZXMuYXBwZW5kTGluZShsaW5lICsgXCI7XCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXNlIFN5bnRheC5Bc3NpZ25tZW50RXhwcmVzc2lvbjpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGluZXMuYXBwZW5kTGluZShoYW5kbGVFeHByZXNzaW9uKG5vZGUpICsgXCI7XCIpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgU3ludGF4LkV4cHJlc3Npb25TdGF0ZW1lbnQ6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxpbmVzLmFwcGVuZExpbmUoaGFuZGxlRXhwcmVzc2lvbihub2RlLmV4cHJlc3Npb24pICsgXCI7XCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gVmlzaXRvck9wdGlvbi5Ta2lwO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSBTeW50YXguSWZTdGF0ZW1lbnQ6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxpbmVzLmFwcGVuZExpbmUoXCJpZihcIiArIGhhbmRsZUV4cHJlc3Npb24obm9kZS50ZXN0KSArIFwiKSB7XCIpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxpbmVzLmNoYW5nZUluZGVudGlvbigxKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdHJhdmVyc2Uobm9kZS5jb25zZXF1ZW50LCBsaW5lcywgb3B0KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGluZXMuY2hhbmdlSW5kZW50aW9uKC0xKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAobm9kZS5hbHRlcm5hdGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxpbmVzLmFwcGVuZExpbmUoXCJ9IGVsc2Uge1wiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxpbmVzLmNoYW5nZUluZGVudGlvbigxKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRyYXZlcnNlKG5vZGUuYWx0ZXJuYXRlLCBsaW5lcywgb3B0KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxpbmVzLmNoYW5nZUluZGVudGlvbigtMSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGluZXMuYXBwZW5kTGluZShcIn1cIik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBWaXNpdG9yT3B0aW9uLlNraXA7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXNlIFN5bnRheC5Gb3JTdGF0ZW1lbnQ6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxpbmVzLmFwcGVuZExpbmUoXCJmb3IgKFwiICsgaGFuZGxlSW5saW5lRGVjbGFyYXRpb24obm9kZS5pbml0KSArIFwiOyBcIiArIGhhbmRsZUV4cHJlc3Npb24obm9kZS50ZXN0KSArXCI7IFwiICsgaGFuZGxlRXhwcmVzc2lvbihub2RlLnVwZGF0ZSkgKyBcIikge1wiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGluZXMuY2hhbmdlSW5kZW50aW9uKDEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0cmF2ZXJzZShub2RlLmJvZHksIGxpbmVzLCBvcHQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsaW5lcy5jaGFuZ2VJbmRlbnRpb24oLTEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsaW5lcy5hcHBlbmRMaW5lKFwifVwiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFZpc2l0b3JPcHRpb24uU2tpcDtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgU3ludGF4LkNvbnRpbnVlU3RhdGVtZW50OlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsaW5lcy5hcHBlbmRMaW5lKFwiY29udGludWU7XCIpO1xuXG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vY29uc29sZS5sb2coXCJVbmhhbmRsZWQ6IFwiICsgdHlwZSk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgU2hhZGUudGhyb3dFcnJvcihub2RlLCBlLm1lc3NhZ2UpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBsZWF2ZTogZnVuY3Rpb24gKG5vZGUpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHR5cGUgPSBub2RlLnR5cGU7XG4gICAgICAgICAgICAgICAgICAgIHN3aXRjaCAodHlwZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSBTeW50YXguUHJvZ3JhbTpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgU3ludGF4LkZ1bmN0aW9uRGVjbGFyYXRpb246XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGluZXMuY2hhbmdlSW5kZW50aW9uKC0xKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsaW5lcy5hcHBlbmRMaW5lKFwifVwiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgKTtcbiAgICB9XG5cbiAgICB2YXIgZ2VuZXJhdGVGbG9hdCA9IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgIGlmKGlzTmFOKHZhbHVlKSlcbiAgICAgICAgICAgIHRocm93IEVycm9yKFwiSW50ZXJuYWw6IEV4cHJlc3Npb24gZ2VuZXJhdGVkIE5hTiFcIik7XG4gICAgICAgIHZhciByZXN1bHQgPSAnJyArIHZhbHVlO1xuICAgICAgICBpZiAocmVzdWx0LmluZGV4T2YoXCIuXCIpID09IC0xKSB7XG4gICAgICAgICAgICByZXN1bHQgKz0gXCIuMFwiO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICpcbiAgICAgKiBAcGFyYW0gbm9kZVxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9XG4gICAgICovXG4gICAgdmFyIGhhbmRsZUV4cHJlc3Npb24gPSBmdW5jdGlvbihub2RlKSB7XG4gICAgICAgIHZhciByZXN1bHQgPSBcIjx1bmhhbmRsZWQ6IFwiICsgbm9kZS50eXBlKyBcIj5cIjtcbiAgICAgICAgc3dpdGNoKG5vZGUudHlwZSkge1xuICAgICAgICAgICAgY2FzZSBTeW50YXguTmV3RXhwcmVzc2lvbjpcbiAgICAgICAgICAgICAgICByZXN1bHQgPSB0b0dMU0xUeXBlKG5vZGUuZXh0cmEpO1xuICAgICAgICAgICAgICAgIHJlc3VsdCArPSBoYW5kbGVBcmd1bWVudHMobm9kZS5hcmd1bWVudHMpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICBjYXNlIFN5bnRheC5MaXRlcmFsOlxuICAgICAgICAgICAgICAgIHZhciB2YWx1ZSA9IG5vZGUuZXh0cmEuc3RhdGljVmFsdWUgIT09IHVuZGVmaW5lZCA/IG5vZGUuZXh0cmEuc3RhdGljVmFsdWUgOiBub2RlLnZhbHVlO1xuICAgICAgICAgICAgICAgIGlmIChub2RlLmV4dHJhLnR5cGUgPT0gVHlwZXMuTlVNQkVSKVxuICAgICAgICAgICAgICAgICAgICByZXN1bHQgPSBnZW5lcmF0ZUZsb2F0KHZhbHVlKTtcbiAgICAgICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdCA9IHZhbHVlO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuXG5cbiAgICAgICAgICAgIGNhc2UgU3ludGF4LklkZW50aWZpZXI6XG4gICAgICAgICAgICAgICAgcmVzdWx0ID0gbm9kZS5uYW1lO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICBjYXNlIFN5bnRheC5CaW5hcnlFeHByZXNzaW9uOlxuICAgICAgICAgICAgY2FzZSBTeW50YXguTG9naWNhbEV4cHJlc3Npb246XG4gICAgICAgICAgICBjYXNlIFN5bnRheC5Bc3NpZ25tZW50RXhwcmVzc2lvbjpcbiAgICAgICAgICAgICAgICByZXN1bHQgPSBoYW5kbGVCaW5hcnlBcmd1bWVudChub2RlLmxlZnQpO1xuICAgICAgICAgICAgICAgIHJlc3VsdCArPSBcIiBcIiArIG5vZGUub3BlcmF0b3IgKyBcIiBcIjtcbiAgICAgICAgICAgICAgICByZXN1bHQgKz0gaGFuZGxlQmluYXJ5QXJndW1lbnQobm9kZS5yaWdodCk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIFN5bnRheC5VbmFyeUV4cHJlc3Npb246XG4gICAgICAgICAgICAgICAgcmVzdWx0ID0gbm9kZS5vcGVyYXRvcjtcbiAgICAgICAgICAgICAgICByZXN1bHQgKz0gaGFuZGxlQmluYXJ5QXJndW1lbnQobm9kZS5hcmd1bWVudCk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgIGNhc2UgU3ludGF4LkNhbGxFeHByZXNzaW9uOlxuICAgICAgICAgICAgICAgIHJlc3VsdCA9IGhhbmRsZUV4cHJlc3Npb24obm9kZS5jYWxsZWUpO1xuICAgICAgICAgICAgICAgIHJlc3VsdCArPSBoYW5kbGVBcmd1bWVudHMobm9kZS5hcmd1bWVudHMpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICBjYXNlIFN5bnRheC5NZW1iZXJFeHByZXNzaW9uOlxuICAgICAgICAgICAgICAgIHJlc3VsdCA9IGhhbmRsZUV4cHJlc3Npb24obm9kZS5vYmplY3QpO1xuICAgICAgICAgICAgICAgIHJlc3VsdCArPSBcIi5cIjtcbiAgICAgICAgICAgICAgICByZXN1bHQgKz0gaGFuZGxlRXhwcmVzc2lvbihub2RlLnByb3BlcnR5KTtcbiAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgY2FzZSBTeW50YXguQ29uZGl0aW9uYWxFeHByZXNzaW9uOlxuICAgICAgICAgICAgICAgIHJlc3VsdCA9IGhhbmRsZUV4cHJlc3Npb24obm9kZS50ZXN0KTtcbiAgICAgICAgICAgICAgICByZXN1bHQgKz0gXCIgPyBcIjtcbiAgICAgICAgICAgICAgICByZXN1bHQgKz0gaGFuZGxlRXhwcmVzc2lvbihub2RlLmNvbnNlcXVlbnQpO1xuICAgICAgICAgICAgICAgIHJlc3VsdCArPSBcIiA6IFwiO1xuICAgICAgICAgICAgICAgIHJlc3VsdCArPSBoYW5kbGVFeHByZXNzaW9uKG5vZGUuYWx0ZXJuYXRlKTtcbiAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgY2FzZSBTeW50YXguVXBkYXRlRXhwcmVzc2lvbjpcbiAgICAgICAgICAgICAgICByZXN1bHQgPSBcIlwiO1xuICAgICAgICAgICAgICAgIGlmIChub2RlLmlzUHJlZml4KSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdCArPSBub2RlLm9wZXJhdG9yO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXN1bHQgKz0gaGFuZGxlRXhwcmVzc2lvbihub2RlLmFyZ3VtZW50KTtcbiAgICAgICAgICAgICAgICBpZiAoIW5vZGUuaXNQcmVmaXgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0ICs9IG5vZGUub3BlcmF0b3I7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAvL2NvbnNvbGUubG9nKFwiVW5oYW5kbGVkOiBcIiAsIG5vZGUudHlwZSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG5cblxuICAgIGZ1bmN0aW9uIGhhbmRsZUlubGluZURlY2xhcmF0aW9uKG5vZGUpIHtcbiAgICAgICAgaWYgKG5vZGUudHlwZSAhPSBTeW50YXguVmFyaWFibGVEZWNsYXJhdGlvbilcbiAgICAgICAgICAgIFNoYWRlLnRocm93RXJyb3Iobm9kZSwgXCJJbnRlcm5hbCBlcnJvciBpbiBHTFNMOjpoYW5kbGVJbmxpbmVEZWNsYXJhdGlvblwiKTtcbiAgICAgICAgdmFyIHJlc3VsdCA9IG5vZGUuZGVjbGFyYXRpb25zLnJlZHVjZShmdW5jdGlvbihkZWNsU3RyaW5nLCBkZWNsYXJhdGlvbil7XG4gICAgICAgICAgICB2YXIgZGVjbCA9IHRvR0xTTFR5cGUoZGVjbGFyYXRpb24uZXh0cmEpICsgXCIgXCIgKyBkZWNsYXJhdGlvbi5pZC5uYW1lO1xuICAgICAgICAgICAgaWYgKGRlY2xhcmF0aW9uLmluaXQpIHtcbiAgICAgICAgICAgICAgICBkZWNsICs9IFwiID0gXCIgKyBoYW5kbGVFeHByZXNzaW9uKGRlY2xhcmF0aW9uLmluaXQpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIGRlY2xTdHJpbmcgKyBkZWNsO1xuICAgICAgICB9LCBcIlwiKTtcbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBoYW5kbGVCaW5hcnlBcmd1bWVudChub2RlKXtcbiAgICAgICAgdmFyIHJlc3VsdCA9IGhhbmRsZUV4cHJlc3Npb24obm9kZSk7XG4gICAgICAgIHN3aXRjaChub2RlLnR5cGUpIHtcbiAgICAgICAgICAgIGNhc2UgU3ludGF4LkJpbmFyeUV4cHJlc3Npb246XG4gICAgICAgICAgICBjYXNlIFN5bnRheC5Mb2dpY2FsRXhwcmVzc2lvbjpcbiAgICAgICAgICAgIGNhc2UgU3ludGF4LkFzc2lnbm1lbnRFeHByZXNzaW9uOiByZXN1bHQgPSBcIiggXCIgKyByZXN1bHQgKyBcIiApXCI7IGJyZWFrO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gaGFuZGxlQXJndW1lbnRzKGNvbnRhaW5lcikge1xuICAgICAgICB2YXIgcmVzdWx0ID0gXCIoXCI7XG4gICAgICAgIGNvbnRhaW5lci5mb3JFYWNoKGZ1bmN0aW9uIChhcmcsIGluZGV4KSB7XG4gICAgICAgICAgICByZXN1bHQgKz0gaGFuZGxlRXhwcmVzc2lvbihhcmcpO1xuICAgICAgICAgICAgaWYgKGluZGV4IDwgY29udGFpbmVyLmxlbmd0aCAtIDEpIHtcbiAgICAgICAgICAgICAgICByZXN1bHQgKz0gXCIsIFwiO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIHJlc3VsdCArIFwiKVwiO1xuICAgIH1cblxuXG4gICAgZXhwb3J0cy5nZW5lcmF0ZSA9IGdlbmVyYXRlO1xuXG5cbn0oZXhwb3J0cykpO1xuIiwiKGZ1bmN0aW9uKG5zKXtcblxuICAgIHZhciBTaGFkZSA9IHJlcXVpcmUoXCIuLi8uLi8uLi9pbnRlcmZhY2VzLmpzXCIpO1xuICAgIHZhciBUb29scyA9IHJlcXVpcmUoXCIuL3Rvb2xzLmpzXCIpO1xuXG4gICAgdmFyIENvbG9yQ2xvc3VyZUluc3RhbmNlID0ge1xuXG4gICAgfTtcblxuICAgIFRvb2xzLmV4dGVuZChucywge1xuICAgICAgICBpZDogXCJDb2xvckNsb3N1cmVcIixcbiAgICAgICAga2luZDogU2hhZGUuT0JKRUNUX0tJTkRTLkNPTE9SX0NMT1NVUkUsXG4gICAgICAgIG9iamVjdDoge1xuICAgICAgICAgICAgY29uc3RydWN0b3I6IG51bGwsXG4gICAgICAgICAgICBzdGF0aWM6IHt9XG4gICAgICAgIH0sXG4gICAgICAgIGluc3RhbmNlOiBDb2xvckNsb3N1cmVJbnN0YW5jZVxuICAgIH0pO1xufShleHBvcnRzKSk7XG4iLCIoZnVuY3Rpb24obnMpIHtcblxuICAgIHZhciBvYmplY3RzID0ge1xuICAgICAgICAvL0NvbG9yIDogcmVxdWlyZShcIi4vY29sb3IuanNcIiksXG4gICAgICAgIFNoYWRlIDogcmVxdWlyZShcIi4vc2hhZGUuanNcIiksXG4gICAgICAgIC8vTWF0cml4NCA6IHJlcXVpcmUoXCIuL21hdHJpeC5qc1wiKSxcbiAgICAgICAgTWF0aCA6IHJlcXVpcmUoXCIuL21hdGguanNcIiksXG4gICAgICAgIFN5c3RlbSA6IHJlcXVpcmUoXCIuL3N5c3RlbS5qc1wiKSxcbiAgICAgICAgVmVjMiA6IHJlcXVpcmUoXCIuL3ZlYzIuanNcIiksXG4gICAgICAgIFZlYzMgOiByZXF1aXJlKFwiLi92ZWMzLmpzXCIpLFxuICAgICAgICBDb2xvcjogcmVxdWlyZShcIi4vdmVjMy5qc1wiKSxcbiAgICAgICAgVmVjNCA6IHJlcXVpcmUoXCIuL3ZlYzQuanNcIiksXG4gICAgICAgIFRleHR1cmUgOiByZXF1aXJlKFwiLi90ZXh0dXJlLmpzXCIpLFxuICAgICAgICBDb2xvckNsb3N1cmU6IHJlcXVpcmUoXCIuL2NvbG9yY2xvc3VyZS5qc1wiKVxuICAgIH07XG5cbiAgICBucy5SZWdpc3RyeSA9IHtcbiAgICAgICAgbmFtZTogXCJHTFNMVHJhbnNmb3JtUmVnaXN0cnlcIixcbiAgICAgICAgZ2V0QnlOYW1lOiBmdW5jdGlvbihuYW1lKSB7XG4gICAgICAgICAgICB2YXIgcmVzdWx0ID0gb2JqZWN0c1tuYW1lXTtcbiAgICAgICAgICAgIHJldHVybiByZXN1bHQgfHwgbnVsbDtcbiAgICAgICAgfSxcbiAgICAgICAgZ2V0SW5zdGFuY2VGb3JLaW5kOiBmdW5jdGlvbihraW5kKSB7XG4gICAgICAgICAgICBmb3IodmFyIG9iaiBpbiBvYmplY3RzKSB7XG4gICAgICAgICAgICAgICAgaWYgKG9iamVjdHNbb2JqXS5raW5kID09IGtpbmQpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG9iamVjdHNbb2JqXS5pbnN0YW5jZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgfVxuICAgIH1cblxuXG59KGV4cG9ydHMpKTtcbiIsIihmdW5jdGlvbihucyl7XG5cbiAgIHZhciBTaGFkZSA9IHJlcXVpcmUoXCIuLi8uLi8uLi9pbnRlcmZhY2VzLmpzXCIpO1xuICAgdmFyIFN5bnRheCA9IHJlcXVpcmUoJ2VzdHJhdmVyc2UnKS5TeW50YXg7XG4gICB2YXIgVG9vbHMgPSByZXF1aXJlKCcuL3Rvb2xzLmpzJyk7XG5cbiAgICB2YXIgTWF0aENvbnN0YW50cyA9IFtcIkVcIiwgXCJQSVwiLCBcIkxOMlwiLCBcIkxPRzJFXCIsIFwiTE9HMTBFXCIsIFwiUElcIiwgXCJTUVJUMV8yXCIsIFwiU1FSVDJcIl07XG5cblxuICAgIHZhciBoYW5kbGVJbnRWZXJzaW9uID0gZnVuY3Rpb24obm9kZSkge1xuICAgICAgICBub2RlLmV4dHJhLnR5cGUgPSBTaGFkZS5UWVBFUy5OVU1CRVI7XG4gICAgICAgIG5vZGUuY2FsbGVlID0gVG9vbHMucmVtb3ZlTWVtYmVyRnJvbUV4cHJlc3Npb24obm9kZS5jYWxsZWUpO1xuICAgICAgICByZXR1cm4gbm9kZTtcbiAgICB9O1xuXG4gICAgdmFyIGhhbmRsZU1hdGhDYWxsID0gZnVuY3Rpb24ob3B0KSB7XG4gICAgICAgIG9wdCA9IG9wdCB8fHt9O1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24obm9kZSkge1xuICAgICAgICAgICAgaWYgKG5vZGUudHlwZSAhPT0gU3ludGF4LkNhbGxFeHByZXNzaW9uKSB7XG4gICAgICAgICAgICAgICAgU2hhZGUudGhyb3dFcnJvcihub2RlLCBcIkludGVybmFsIEVycm9yIGluIE1hdGggb2JqZWN0XCIpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gQ2FzdCBhbGwgYXJndW1lbnRzIG9mIHRoZSBtYXRoIGZ1bmN0aW9uIHRvIGZsb2F0LCBhcyB0aGV5IGFyZVxuICAgICAgICAgICAgLy8gbm90IGRlZmluZWQgZm9yIG90aGVyIHR5cGVzIChpbnQsIGJvb2wpXG4gICAgICAgICAgICAvLyBEb24ndCByZXBsYWNlIHRoZSBhcmd1bWVudHMgYXJyYXksIGl0J3MgYWxyZWFkeSBjYWNoZWQgYnkgdGhlIHRyYXZlcnNhbFxuICAgICAgICAgICAgZm9yKHZhciBpID0gMDsgaSA8IG5vZGUuYXJndW1lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgbm9kZS5hcmd1bWVudHNbaV0gPSBUb29scy5jYXN0VG9GbG9hdChub2RlLmFyZ3VtZW50c1tpXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBub2RlLmNhbGxlZSA9IFRvb2xzLnJlbW92ZU1lbWJlckZyb21FeHByZXNzaW9uKG5vZGUuY2FsbGVlKTtcbiAgICAgICAgICAgIGlmIChvcHQubmFtZSkge1xuICAgICAgICAgICAgICAgIG5vZGUuY2FsbGVlLm5hbWUgPSBvcHQubmFtZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBub2RlO1xuICAgICAgICB9XG4gICAgfTtcblxuXG5cbiAgICB2YXIgTWF0aEVudHJ5ICA9IHtcbiAgICAgICAgYWJzOiB7IGNhbGxFeHA6IGhhbmRsZU1hdGhDYWxsKCkgfSxcbiAgICAgICAgYWNvczogeyBjYWxsRXhwOiBoYW5kbGVNYXRoQ2FsbCgpIH0sXG4gICAgICAgIGFzaW46IHsgY2FsbEV4cDogaGFuZGxlTWF0aENhbGwoKSB9LFxuICAgICAgICBhdGFuOiB7IGNhbGxFeHA6IGhhbmRsZU1hdGhDYWxsKCkgfSxcbiAgICAgICAgYXRhbjI6IHsgY2FsbEV4cDogaGFuZGxlTWF0aENhbGwoeyBuYW1lOiBcImF0YW5cIiB9ICkgfSxcbiAgICAgICAgY2VpbDogeyBjYWxsRXhwOiBoYW5kbGVJbnRWZXJzaW9uIH0sXG4gICAgICAgIGNvczogIHsgY2FsbEV4cDogaGFuZGxlTWF0aENhbGwoKSB9LFxuICAgICAgICBleHA6IHsgY2FsbEV4cDogaGFuZGxlTWF0aENhbGwoKSB9LFxuICAgICAgICBmbG9vcjogeyBjYWxsRXhwOiBoYW5kbGVJbnRWZXJzaW9uIH0sXG4gICAgICAgIC8vIGltdWw6IHsgY2FsbEV4cDogaGFuZGxlTWF0aENhbGwgfSxcbiAgICAgICAgbG9nOiB7IGNhbGxFeHA6IGhhbmRsZU1hdGhDYWxsKCkgfSxcbiAgICAgICAgbWF4OiB7IGNhbGxFeHA6IGhhbmRsZU1hdGhDYWxsKCkgfSxcbiAgICAgICAgbWluOiB7IGNhbGxFeHA6IGhhbmRsZU1hdGhDYWxsKCkgfSxcbiAgICAgICAgcG93OiB7IGNhbGxFeHA6IGhhbmRsZU1hdGhDYWxsKCkgfSxcbiAgICAgICAgLy8gcmFuZG9tOiBmdW5jdGlvbiByYW5kb20oKSB7IFtuYXRpdmUgY29kZV0gfVxuICAgICAgICByb3VuZDogeyBjYWxsRXhwOiBoYW5kbGVNYXRoQ2FsbCgpIH0sIC8vIFNpbmNlIEdMU0wgMS4zLCB3aGF0IGRvZXMgV2ViR0wgdXNlP1xuICAgICAgICBzaW46ICB7IGNhbGxFeHA6IGhhbmRsZU1hdGhDYWxsKCkgfSxcbiAgICAgICAgc3FydDogeyBjYWxsRXhwOiBoYW5kbGVNYXRoQ2FsbCgpIH0sXG4gICAgICAgIHRhbjogeyBjYWxsRXhwOiBoYW5kbGVNYXRoQ2FsbCgpIH1cbiAgICB9O1xuXG4gICAgTWF0aENvbnN0YW50cy5mb3JFYWNoKGZ1bmN0aW9uIChjb25zdGFudCkge1xuICAgICAgICBNYXRoRW50cnlbY29uc3RhbnRdID0ge1xuICAgICAgICAgICAgcHJvcGVydHk6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gIHsgdHlwZTogU3ludGF4LkxpdGVyYWwsIHZhbHVlOiBNYXRoW2NvbnN0YW50XSwgZXh0cmE6IHsgdHlwZTogU2hhZGUuVFlQRVMuTlVNQkVSIH0gfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0pO1xuXG4gICAgVG9vbHMuZXh0ZW5kKG5zLCB7XG4gICAgICAgIGlkOiBcIk1hdGhcIixcbiAgICAgICAgb2JqZWN0OiB7XG4gICAgICAgICAgICBjb25zdHJ1Y3RvcjogbnVsbCxcbiAgICAgICAgICAgIHN0YXRpYzogTWF0aEVudHJ5XG4gICAgICAgIH0sXG4gICAgICAgIGluc3RhbmNlOiBNYXRoRW50cnlcbiAgICB9KTtcblxufShleHBvcnRzKSk7XG4iLCIoZnVuY3Rpb24obnMpe1xuXG4gICAgdmFyIFNoYWRlID0gcmVxdWlyZShcIi4uLy4uLy4uL2ludGVyZmFjZXMuanNcIik7XG4gICAgdmFyIFN5bnRheCA9IHJlcXVpcmUoJ2VzdHJhdmVyc2UnKS5TeW50YXg7XG4gICAgdmFyIFRvb2xzID0gcmVxdWlyZSgnLi90b29scy5qcycpO1xuXG4gICAgdmFyIFNoYWRlT2JqZWN0ID0ge1xuICAgICAgICBkaWZmdXNlOiB7fSxcbiAgICAgICAgcGhvbmc6IHt9LFxuICAgICAgICBmcmFjdDogeyBwcm9wZXJ0eTogVG9vbHMucmVtb3ZlTWVtYmVyRnJvbUV4cHJlc3Npb24gfSxcbiAgICAgICAgY2xhbXA6IHsgcHJvcGVydHk6IFRvb2xzLnJlbW92ZU1lbWJlckZyb21FeHByZXNzaW9uIH0sXG4gICAgICAgIHN0ZXA6IHsgcHJvcGVydHk6IFRvb2xzLnJlbW92ZU1lbWJlckZyb21FeHByZXNzaW9uIH0sXG4gICAgICAgIG1peDogeyBwcm9wZXJ0eTogVG9vbHMucmVtb3ZlTWVtYmVyRnJvbUV4cHJlc3Npb24gfSxcbiAgICAgICAgc21vb3Roc3RlcDogeyBwcm9wZXJ0eTogVG9vbHMucmVtb3ZlTWVtYmVyRnJvbUV4cHJlc3Npb24gfVxuICAgIH1cblxuICAgIFRvb2xzLmV4dGVuZChucywge1xuICAgIGlkOiBcIlNoYWRlXCIsXG4gICAgb2JqZWN0OiB7XG4gICAgICAgIGNvbnN0cnVjdG9yOiBudWxsLFxuICAgICAgICBzdGF0aWM6IFNoYWRlT2JqZWN0XG4gICAgfSxcbiAgICBpbnN0YW5jZTogbnVsbFxufSk7XG5cbn0oZXhwb3J0cykpO1xuIiwiKGZ1bmN0aW9uIChucykge1xuXG4gICAgdmFyIEJhc2UgPSByZXF1aXJlKFwiLi4vLi4vLi4vYmFzZS9pbmRleC5qc1wiKSxcbiAgICAgICAgU2hhZGUgPSByZXF1aXJlKFwiLi4vLi4vLi4vaW50ZXJmYWNlcy5qc1wiKSxcbiAgICAgICAgU3ludGF4ID0gcmVxdWlyZSgnZXN0cmF2ZXJzZScpLlN5bnRheDtcblxuXG4gICAgdmFyIFN5c3RlbVBhcmFtZXRlck5hbWVzID0ge1xuICAgICAgICBcImNvb3Jkc1wiIDogXCJfc3lzX2Nvb3Jkc1wiLFxuICAgICAgICBcImhlaWdodFwiOiBcIl9zeXNfaGVpZ2h0XCIsXG4gICAgICAgIFwid2lkdGhcIjogXCJfc3lzX3dpZHRoXCJcbiAgICB9XG5cbiAgICB2YXIgQ29vcmRzVHlwZSA9ICB7XG4gICAgICAgIHR5cGU6IFNoYWRlLlRZUEVTLk9CSkVDVCxcbiAgICAgICAga2luZDogU2hhZGUuT0JKRUNUX0tJTkRTLkZMT0FUMyxcbiAgICAgICAgc291cmNlOiBTaGFkZS5TT1VSQ0VTLlVOSUZPUk1cbiAgICB9O1xuXG4gICAgdmFyIFN5c3RlbUVudHJ5ID0ge1xuICAgICAgICBjb29yZHM6IHtcbiAgICAgICAgICAgIHByb3BlcnR5OiBmdW5jdGlvbiAobm9kZSkge1xuICAgICAgICAgICAgICAgIG5vZGUucHJvcGVydHkubmFtZSA9IFwiZ2xfRnJhZ0Nvb3JkXCI7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG5vZGUucHJvcGVydHk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIG5vcm1hbGl6ZWRDb29yZHM6IHtcbiAgICAgICAgICAgIHByb3BlcnR5OiBmdW5jdGlvbiAobm9kZSwgcGFyZW50LCBjb250ZXh0LCBzdGF0ZSkge1xuICAgICAgICAgICAgICAgIHN0YXRlLnN5c3RlbVBhcmFtZXRlcnNbU3lzdGVtUGFyYW1ldGVyTmFtZXMuY29vcmRzXSA9IENvb3Jkc1R5cGU7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogU3ludGF4Lk5ld0V4cHJlc3Npb24sXG4gICAgICAgICAgICAgICAgICAgIGNhbGxlZToge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogU3ludGF4LklkZW50aWZpZXIsXG4gICAgICAgICAgICAgICAgICAgICAgICBuYW1lOiBcIlZlYzNcIlxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBhcmd1bWVudHM6IFtcbiAgICAgICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiBTeW50YXguQmluYXJ5RXhwcmVzc2lvbixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZWZ0OiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6IFN5bnRheC5NZW1iZXJFeHByZXNzaW9uLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvYmplY3Q6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6IFN5bnRheC5JZGVudGlmaWVyLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbmFtZTogXCJnbF9GcmFnQ29vcmRcIlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0eToge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogU3ludGF4LklkZW50aWZpZXIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBuYW1lOiBcInh5elwiXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJpZ2h0OiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6IFN5bnRheC5JZGVudGlmaWVyLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBuYW1lOiBTeXN0ZW1QYXJhbWV0ZXJOYW1lcy5jb29yZHNcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9wZXJhdG9yOiBcIi9cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBleHRyYToge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiBTaGFkZS5UWVBFUy5PQkpFQ1QsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGtpbmQ6IFNoYWRlLk9CSkVDVF9LSU5EUy5GTE9BVDNcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgICAgIGV4dHJhOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiBTaGFkZS5UWVBFUy5PQkpFQ1QsXG4gICAgICAgICAgICAgICAgICAgICAgICBraW5kOiBTaGFkZS5PQkpFQ1RfS0lORFMuRkxPQVQzXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIGhlaWdodDoge1xuICAgICAgICAgICAgcHJvcGVydHk6IGZ1bmN0aW9uIChub2RlLCBwYXJlbnQsIGNvbnRleHQsIHN0YXRlKSB7XG4gICAgICAgICAgICAgICAgc3RhdGUuc3lzdGVtUGFyYW1ldGVyc1tTeXN0ZW1QYXJhbWV0ZXJOYW1lcy5jb29yZHNdID0gQ29vcmRzVHlwZTtcbiAgICAgICAgICAgICAgICBub2RlLnByb3BlcnR5Lm5hbWUgPSBTeXN0ZW1QYXJhbWV0ZXJOYW1lcy5jb29yZHMgKyBcIi55XCI7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG5vZGUucHJvcGVydHk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIHdpZHRoOiB7XG4gICAgICAgICAgICBwcm9wZXJ0eTogZnVuY3Rpb24gKG5vZGUsIHBhcmVudCwgY29udGV4dCwgc3RhdGUpIHtcbiAgICAgICAgICAgICAgICBzdGF0ZS5zeXN0ZW1QYXJhbWV0ZXJzW1N5c3RlbVBhcmFtZXRlck5hbWVzLmNvb3Jkc10gPSBDb29yZHNUeXBlO1xuICAgICAgICAgICAgICAgIG5vZGUucHJvcGVydHkubmFtZSA9IFN5c3RlbVBhcmFtZXRlck5hbWVzLmNvb3JkcyArIFwiLnhcIjtcbiAgICAgICAgICAgICAgICByZXR1cm4gbm9kZS5wcm9wZXJ0eTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgfTtcblxuICAgIEJhc2UuZXh0ZW5kKG5zLCB7XG4gICAgICAgIGlkOiBcIlN5c3RlbVwiLFxuICAgICAgICBvYmplY3Q6IHtcbiAgICAgICAgICAgIGNvbnN0cnVjdG9yOiBudWxsLFxuICAgICAgICAgICAgc3RhdGljOiBTeXN0ZW1FbnRyeVxuICAgICAgICB9LFxuICAgICAgICBpbnN0YW5jZTogbnVsbFxuICAgIH0pO1xufShleHBvcnRzKSk7XG4iLCIoZnVuY3Rpb24obnMpe1xuXG4gICAgdmFyIFNoYWRlID0gcmVxdWlyZShcIi4uLy4uLy4uL2ludGVyZmFjZXMuanNcIik7XG4gICAgdmFyIFN5bnRheCA9IHJlcXVpcmUoJ2VzdHJhdmVyc2UnKS5TeW50YXg7XG4gICAgdmFyIFRvb2xzID0gcmVxdWlyZShcIi4vdG9vbHMuanNcIik7XG4gICAgdmFyIEFOTk8gPSByZXF1aXJlKFwiLi4vLi4vLi4vYmFzZS9hbm5vdGF0aW9uLmpzXCIpLkFOTk87XG5cbiAgICB2YXIgVFlQRVMgPSBTaGFkZS5UWVBFUyxcbiAgICAgICAgS0lORFMgPSBTaGFkZS5PQkpFQ1RfS0lORFM7XG5cbiAgICB2YXIgVGV4dHVyZUluc3RhbmNlID0ge1xuICAgICAgICBzYW1wbGUyRDoge1xuICAgICAgICAgICAgY2FsbEV4cDogVG9vbHMuVmVjLmNyZWF0ZUZ1bmN0aW9uQ2FsbC5iaW5kKG51bGwsICd0ZXh0dXJlMkQnLCAyKVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgVG9vbHMuZXh0ZW5kKG5zLCB7XG4gICAgICAgIGlkOiBcIlRleHR1cmVcIixcbiAgICAgICAga2luZDogS0lORFMuVEVYVFVSRSxcbiAgICAgICAgb2JqZWN0OiB7XG4gICAgICAgICAgICBjb25zdHJ1Y3RvcjogbnVsbCxcbiAgICAgICAgICAgIHN0YXRpYzoge31cbiAgICAgICAgfSxcbiAgICAgICAgaW5zdGFuY2U6IFRleHR1cmVJbnN0YW5jZVxuICAgIH0pO1xuXG59KGV4cG9ydHMpKTtcbiIsIihmdW5jdGlvbiAobnMpIHtcblxuICAgIHZhciBTeW50YXggPSByZXF1aXJlKCdlc3RyYXZlcnNlJykuU3ludGF4O1xuICAgIHZhciBCYXNlID0gcmVxdWlyZShcIi4uLy4uLy4uL2Jhc2UvaW5kZXguanNcIik7XG4gICAgdmFyIEFOTk8gPSByZXF1aXJlKFwiLi4vLi4vLi4vYmFzZS9hbm5vdGF0aW9uLmpzXCIpLkFOTk87XG4gICAgdmFyIFNoYWRlID0gcmVxdWlyZShcIi4uLy4uLy4uL2ludGVyZmFjZXMuanNcIiksXG4gICAgICAgIFRZUEVTID0gU2hhZGUuVFlQRVMsXG4gICAgICAgIEtJTkRTID0gU2hhZGUuT0JKRUNUX0tJTkRTLFxuICAgICAgICBWZWNCYXNlID0gcmVxdWlyZShcIi4uLy4uLy4uL2Jhc2UvdmVjLmpzXCIpO1xuXG5cbiAgICBucy5yZW1vdmVNZW1iZXJGcm9tRXhwcmVzc2lvbiA9IGZ1bmN0aW9uIChub2RlKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB0eXBlOiBTeW50YXguSWRlbnRpZmllcixcbiAgICAgICAgICAgIG5hbWU6IG5vZGUucHJvcGVydHkubmFtZVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgdmFyIFZlYyA9IHtcbiAgICAgICAgZ2V0VmVjQXJnczogZnVuY3Rpb24oYXJncyl7XG4gICAgICAgICAgICBpZihhcmdzLmxlbmd0aCA9PSAwKXtcbiAgICAgICAgICAgICAgICB2YXIgcmVzdWx0ID0gW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiBcIkxpdGVyYWxcIixcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlOiBcIjBcIlxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXTtcbiAgICAgICAgICAgICAgICBBTk5PKHJlc3VsdFswXSkuc2V0VHlwZShUWVBFUy5OVU1CRVIpO1xuICAgICAgICAgICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNle1xuICAgICAgICAgICAgICAgIHJldHVybiBhcmdzO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuXG4gICAgICAgIGdlbmVyYXRlVmVjRnJvbUFyZ3M6IGZ1bmN0aW9uKHZlY0NvdW50LCBhcmdzKXtcbiAgICAgICAgICAgIGlmKHZlY0NvdW50ID09IDEpXG4gICAgICAgICAgICAgICAgcmV0dXJuIGFyZ3NbMF07XG4gICAgICAgICAgICBpZihhcmdzLmxlbmd0aCA9PSAwKXtcbiAgICAgICAgICAgICAgICBhcmdzID0gVmVjLmdldFZlY0FyZ3MoYXJncyk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmKGFyZ3MubGVuZ3RoID09IDEgJiYgQU5OTyhhcmdzWzBdKS5pc09mS2luZChLSU5EU1snRkxPQVQnICsgdmVjQ291bnRdKSlcbiAgICAgICAgICAgICAgICByZXR1cm4gYXJnc1swXTtcbiAgICAgICAgICAgIHZhciByZXN1bHQgPSB7XG4gICAgICAgICAgICAgICAgdHlwZTogU3ludGF4Lk5ld0V4cHJlc3Npb24sXG4gICAgICAgICAgICAgICAgY2FsbGVlOiB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IFN5bnRheC5JZGVudGlmaWVyLFxuICAgICAgICAgICAgICAgICAgICBuYW1lOiBcIlZlY1wiICsgdmVjQ291bnRcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIGFyZ3VtZW50czogYXJnc1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIEFOTk8ocmVzdWx0KS5zZXRUeXBlKFRZUEVTLk9CSkVDVCwgS0lORFNbJ0ZMT0FUJyArIHZlY0NvdW50XSk7XG4gICAgICAgICAgICBBTk5PKHJlc3VsdC5jYWxsZWUpLnNldFR5cGUoVFlQRVMuRlVOQ1RJT04pO1xuICAgICAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgfSxcblxuICAgICAgICBjcmVhdGVTd2l6emxlOiBmdW5jdGlvbih2ZWNDb3VudCwgc3dpenpsZSwgbm9kZSwgYXJncywgcGFyZW50KXtcbiAgICAgICAgICAgIGlmIChhcmdzLmxlbmd0aCA9PSAwKSB7XG4gICAgICAgICAgICAgICAgbm9kZS5jYWxsZWUuZXh0cmEgPSBub2RlLmV4dHJhO1xuICAgICAgICAgICAgICAgIHJldHVybiBub2RlLmNhbGxlZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZhciBzaW5ndWxhciA9IHN3aXp6bGUubGVuZ3RoID09IDE7XG4gICAgICAgICAgICB2YXIgYXJnT2JqZWN0ID0gc2luZ3VsYXIgPyBub2RlLmFyZ3VtZW50c1swXSA6IFZlYy5nZW5lcmF0ZVZlY0Zyb21BcmdzKHN3aXp6bGUubGVuZ3RoLCBub2RlLmFyZ3VtZW50cyk7XG4gICAgICAgICAgICB2YXIgcmVwbGFjZSA9IHtcbiAgICAgICAgICAgICAgICB0eXBlOiBTeW50YXguTmV3RXhwcmVzc2lvbixcbiAgICAgICAgICAgICAgICBjYWxsZWU6IHtcbiAgICAgICAgICAgICAgICAgICB0eXBlOiBTeW50YXguSWRlbnRpZmllcixcbiAgICAgICAgICAgICAgICAgICBuYW1lOiBcIlZlY1wiICsgdmVjQ291bnRcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIGFyZ3VtZW50czogW11cbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICB2YXIgaW5kaWNlcyA9IFtdO1xuICAgICAgICAgICAgZm9yKHZhciBpID0gMDsgaSA8IHN3aXp6bGUubGVuZ3RoOyArK2kpe1xuICAgICAgICAgICAgICAgIHZhciBpZHggPSBWZWNCYXNlLnN3aXp6bGVUb0luZGV4KHN3aXp6bGUuY2hhckF0KGkpKTtcbiAgICAgICAgICAgICAgICBpbmRpY2VzW2lkeF0gPSBpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZm9yKHZhciBpID0gMDsgaSA8IHZlY0NvdW50OyArK2kpe1xuICAgICAgICAgICAgICAgIGlmKGluZGljZXNbaV0gIT09IHVuZGVmaW5lZCl7XG4gICAgICAgICAgICAgICAgICAgIHJlcGxhY2UuYXJndW1lbnRzW2ldID0gc2luZ3VsYXIgPyBhcmdPYmplY3QgOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiBTeW50YXguTWVtYmVyRXhwcmVzc2lvbixcbiAgICAgICAgICAgICAgICAgICAgICAgIG9iamVjdDogYXJnT2JqZWN0LFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvcGVydHk6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiBTeW50YXguSWRlbnRpZmllcixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBuYW1lOiBWZWNCYXNlLmluZGV4VG9Td2l6emxlKGluZGljZXNbaV0pXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2V7XG4gICAgICAgICAgICAgICAgICAgcmVwbGFjZS5hcmd1bWVudHNbaV0gPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiBTeW50YXguTWVtYmVyRXhwcmVzc2lvbixcbiAgICAgICAgICAgICAgICAgICAgICAgIG9iamVjdDogbm9kZS5jYWxsZWUub2JqZWN0LFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvcGVydHk6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiBTeW50YXguSWRlbnRpZmllcixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBuYW1lOiBWZWNCYXNlLmluZGV4VG9Td2l6emxlKGkpXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgQU5OTyhyZXBsYWNlKS5jb3B5KEFOTk8obm9kZSkpO1xuICAgICAgICAgICAgcmV0dXJuIHJlcGxhY2U7XG4gICAgICAgIH0sXG5cbiAgICAgICAgYXR0YWNoU3dpenpsZXM6IGZ1bmN0aW9uIChpbnN0YW5jZSwgdmVjQ291bnQpe1xuICAgICAgICAgICAgZm9yKHZhciBzID0gMDsgcyA8IFZlY0Jhc2Uuc3dpenpsZVNldHMubGVuZ3RoOyArK3Mpe1xuICAgICAgICAgICAgICAgIGZvcih2YXIgY291bnQgPSAxOyBjb3VudCA8PSA0OyArK2NvdW50KXtcbiAgICAgICAgICAgICAgICAgICAgdmFyIG1heCA9IE1hdGgucG93KHZlY0NvdW50LCBjb3VudCk7XG4gICAgICAgICAgICAgICAgICAgICBmb3IodmFyIGkgPSAwOyBpIDwgbWF4OyArK2kpe1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHZhbCA9IGk7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIga2V5ID0gXCJcIjtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvcih2YXIgIGogPSAwOyBqIDwgY291bnQ7ICsrail7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGlkeCA9IHZhbCAlIHZlY0NvdW50O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhbCA9IE1hdGguZmxvb3IodmFsIC8gdmVjQ291bnQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGtleSs9IFZlY0Jhc2Uuc3dpenpsZVNldHNbc11baWR4XTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGluc3RhbmNlW2tleV0gPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FsbEV4cDogVmVjLmNyZWF0ZVN3aXp6bGUuYmluZChudWxsLCB2ZWNDb3VudCwga2V5KVxuICAgICAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcblxuICAgICAgICBjcmVhdGVPcGVyYXRvcjogZnVuY3Rpb24odmVjQ291bnQsIG9wZXJhdG9yLCBub2RlLCBhcmdzLCBwYXJlbnQpIHtcbiAgICAgICAgICAgIHZhciBvdGhlciA9IFZlYy5nZW5lcmF0ZVZlY0Zyb21BcmdzKHZlY0NvdW50LCBub2RlLmFyZ3VtZW50cyk7XG4gICAgICAgICAgICB2YXIgcmVwbGFjZSA9IHtcbiAgICAgICAgICAgICAgICB0eXBlOiBTeW50YXguQmluYXJ5RXhwcmVzc2lvbixcbiAgICAgICAgICAgICAgICBvcGVyYXRvcjogb3BlcmF0b3IsXG4gICAgICAgICAgICAgICAgbGVmdDogbm9kZS5jYWxsZWUub2JqZWN0LFxuICAgICAgICAgICAgICAgIHJpZ2h0OiBvdGhlclxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIEFOTk8ocmVwbGFjZSkuY29weShBTk5PKG5vZGUpKTtcbiAgICAgICAgICAgIHJldHVybiByZXBsYWNlO1xuICAgICAgICB9LFxuXG4gICAgICAgIGF0dGFjaE9wZXJhdG9yczogZnVuY3Rpb24oaW5zdGFuY2UsIHZlY0NvdW50LCBvcGVyYXRvcnMpe1xuICAgICAgICAgICAgZm9yKHZhciBuYW1lIGluIG9wZXJhdG9ycyl7XG4gICAgICAgICAgICAgICAgdmFyIG9wZXJhdG9yID0gb3BlcmF0b3JzW25hbWVdO1xuICAgICAgICAgICAgICAgIGluc3RhbmNlW25hbWVdID0ge1xuICAgICAgICAgICAgICAgICAgICBjYWxsRXhwOiBWZWMuY3JlYXRlT3BlcmF0b3IuYmluZChudWxsLCB2ZWNDb3VudCwgb3BlcmF0b3IpXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuXG4gICAgICAgIGNyZWF0ZUZ1bmN0aW9uQ2FsbDogZnVuY3Rpb24oZnVuY3Rpb25OYW1lLCBzZWNvbmRWZWNTaXplLCBub2RlLCBhcmdzLCBwYXJlbnQpIHtcbiAgICAgICAgICAgIHZhciByZXBsYWNlID0ge1xuICAgICAgICAgICAgICAgIHR5cGU6IFN5bnRheC5DYWxsRXhwcmVzc2lvbixcbiAgICAgICAgICAgICAgICBjYWxsZWU6IHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogU3ludGF4LklkZW50aWZpZXIsXG4gICAgICAgICAgICAgICAgICAgIG5hbWU6IGZ1bmN0aW9uTmFtZVxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgYXJndW1lbnRzOiBbXG4gICAgICAgICAgICAgICAgICAgIG5vZGUuY2FsbGVlLm9iamVjdFxuICAgICAgICAgICAgICAgIF1cbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBpZihzZWNvbmRWZWNTaXplKXtcbiAgICAgICAgICAgICAgICB2YXIgb3RoZXIgPSBWZWMuZ2VuZXJhdGVWZWNGcm9tQXJncyhzZWNvbmRWZWNTaXplLCBub2RlLmFyZ3VtZW50cyk7XG4gICAgICAgICAgICAgICAgcmVwbGFjZS5hcmd1bWVudHMucHVzaChvdGhlcik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBBTk5PKHJlcGxhY2UpLmNvcHkoQU5OTyhub2RlKSk7XG4gICAgICAgICAgICByZXR1cm4gcmVwbGFjZTtcbiAgICAgICAgfSxcblxuICAgICAgICBnZW5lcmF0ZUxlbmd0aENhbGw6IGZ1bmN0aW9uKG5vZGUsIGFyZ3MsIHBhcmVudCl7XG4gICAgICAgICAgICBpZihhcmdzLmxlbmd0aCA9PSAwKXtcbiAgICAgICAgICAgICAgICByZXR1cm4gVmVjLmNyZWF0ZUZ1bmN0aW9uQ2FsbCgnbGVuZ3RoJywgMCwgbm9kZSwgYXJncywgcGFyZW50KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2V7XG4gICAgICAgICAgICAgICAgIHZhciByZXBsYWNlID0ge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiBTeW50YXguQmluYXJ5RXhwcmVzc2lvbixcbiAgICAgICAgICAgICAgICAgICAgb3BlcmF0b3I6ICcqJyxcbiAgICAgICAgICAgICAgICAgICAgbGVmdDogbm9kZS5jYWxsZWUub2JqZWN0LFxuICAgICAgICAgICAgICAgICAgICByaWdodDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogU3ludGF4LkJpbmFyeUV4cHJlc3Npb24sXG4gICAgICAgICAgICAgICAgICAgICAgICBvcGVyYXRvcjogJy8nLFxuICAgICAgICAgICAgICAgICAgICAgICAgbGVmdDogbm9kZS5hcmd1bWVudHNbMF0sXG4gICAgICAgICAgICAgICAgICAgICAgICByaWdodDogVmVjLmNyZWF0ZUZ1bmN0aW9uQ2FsbCgnbGVuZ3RoJywgMCwgbm9kZSwgYXJncywgcGFyZW50KVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICBBTk5PKHJlcGxhY2UucmlnaHQpLnNldFR5cGUoVFlQRVMuTlVNQkVSKTtcbiAgICAgICAgICAgICAgICBBTk5PKHJlcGxhY2UpLmNvcHkoQU5OTyhub2RlKSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHJlcGxhY2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG5cbiAgICAgICAgZ2VuZXJhdGVDb25zdHJ1Y3RvcjogZnVuY3Rpb24obm9kZSl7XG4gICAgICAgICAgICBub2RlLmFyZ3VtZW50cyA9IFZlYy5nZXRWZWNBcmdzKG5vZGUuYXJndW1lbnRzKTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICB2YXIgTWF0ID0ge1xuICAgICAgICBUWVBFUzoge1xuICAgICAgICAgICAgXCJNYXQzXCIgOiB7a2luZDogS0lORFMuTUFUUklYMywgY29sS2luZDogS0lORFMuRkxPQVQzfSxcbiAgICAgICAgICAgIFwiTWF0NFwiIDoge2tpbmQ6IEtJTkRTLk1BVFJJWDQsIGNvbEtpbmQ6IEtJTkRTLkZMT0FUNH1cbiAgICAgICAgfSxcblxuICAgICAgICBnZW5lcmF0ZU1hdEZyb21BcmdzOiBmdW5jdGlvbihtYXROYW1lLCBhcmdzKXtcbiAgICAgICAgICAgIGlmKGFyZ3MubGVuZ3RoID09IDApe1xuICAgICAgICAgICAgICAgIGFyZ3MgPSBWZWMuZ2V0VmVjQXJncyhhcmdzKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYoYXJncy5sZW5ndGggPT0gMSAmJiBBTk5PKGFyZ3NbMF0pLmlzT2ZLaW5kKCBNYXQuVFlQRVNbbWF0TmFtZV0ua2luZCkpXG4gICAgICAgICAgICAgICAgcmV0dXJuIGFyZ3NbMF07XG4gICAgICAgICAgICB2YXIgcmVzdWx0ID0ge1xuICAgICAgICAgICAgICAgIHR5cGU6IFN5bnRheC5OZXdFeHByZXNzaW9uLFxuICAgICAgICAgICAgICAgIGNhbGxlZToge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiBTeW50YXguSWRlbnRpZmllcixcbiAgICAgICAgICAgICAgICAgICAgbmFtZTogbWF0TmFtZVxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgYXJndW1lbnRzOiBhcmdzXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgQU5OTyhyZXN1bHQpLnNldFR5cGUoVFlQRVMuT0JKRUNULCBNYXQuVFlQRVNbbWF0TmFtZV0ua2luZCk7XG4gICAgICAgICAgICBBTk5PKHJlc3VsdC5jYWxsZWUpLnNldFR5cGUoVFlQRVMuRlVOQ1RJT04pO1xuICAgICAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgfSxcblxuICAgICAgICBjcmVhdGVPcGVyYXRvcjogZnVuY3Rpb24obWF0TmFtZSwgb3BlcmF0b3IsIG5vZGUsIGFyZ3MsIHBhcmVudCkge1xuICAgICAgICAgICAgdmFyIG90aGVyID0gTWF0LmdlbmVyYXRlTWF0RnJvbUFyZ3MobWF0TmFtZSwgbm9kZS5hcmd1bWVudHMpO1xuICAgICAgICAgICAgdmFyIHJlcGxhY2UgPSB7XG4gICAgICAgICAgICAgICAgdHlwZTogU3ludGF4LkJpbmFyeUV4cHJlc3Npb24sXG4gICAgICAgICAgICAgICAgb3BlcmF0b3I6IG9wZXJhdG9yLFxuICAgICAgICAgICAgICAgIGxlZnQ6IG5vZGUuY2FsbGVlLm9iamVjdCxcbiAgICAgICAgICAgICAgICByaWdodDogb3RoZXJcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBBTk5PKHJlcGxhY2UpLmNvcHkoQU5OTyhub2RlKSk7XG4gICAgICAgICAgICByZXR1cm4gcmVwbGFjZTtcbiAgICAgICAgfSxcblxuICAgICAgICBhdHRhY2hPcGVyYXRvcnM6IGZ1bmN0aW9uKGluc3RhbmNlLCBtYXROYW1lLCBvcGVyYXRvcnMpe1xuICAgICAgICAgICAgZm9yKHZhciBuYW1lIGluIG9wZXJhdG9ycyl7XG4gICAgICAgICAgICAgICAgdmFyIG9wZXJhdG9yID0gb3BlcmF0b3JzW25hbWVdO1xuICAgICAgICAgICAgICAgIGluc3RhbmNlW25hbWVdID0ge1xuICAgICAgICAgICAgICAgICAgICBjYWxsRXhwOiBNYXQuY3JlYXRlT3BlcmF0b3IuYmluZChudWxsLCBtYXROYW1lLCBvcGVyYXRvcilcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG5cbiAgICAgICAgZ2VuZXJhdGVDb2xDYWxsOiBmdW5jdGlvbihtYXROYW1lLCBub2RlLCBhcmdzLCBwYXJlbnQpe1xuICAgICAgICAgICAgdmFyIG1lbWJlckFjY2VzcyA9IHtcbiAgICAgICAgICAgICAgICB0eXBlOiBTeW50YXguTWVtYmVyRXhwcmVzc2lvbixcbiAgICAgICAgICAgICAgICBvYmplY3Q6IG5vZGUuY2FsbGVlLm9iamVjdCxcbiAgICAgICAgICAgICAgICBwcm9wZXJ0eTogbm9kZS5hcmd1bWVudHNbMF0sXG4gICAgICAgICAgICAgICAgY29tcHV0ZWQ6IHRydWVcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBBTk5PKG1lbWJlckFjY2Vzcykuc2V0VHlwZShUWVBFUy5PQkpFQ1QsIE1hdC5UWVBFU1ttYXROYW1lXS5jb2xLaW5kKTtcblxuICAgICAgICAgICAgaWYoYXJncy5sZW5ndGggPT0gMSl7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG1lbWJlckFjY2VzcztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2V7XG4gICAgICAgICAgICAgICAgIHZhciByZXBsYWNlID0ge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiBTeW50YXguQmluYXJ5RXhwcmVzc2lvbixcbiAgICAgICAgICAgICAgICAgICAgb3BlcmF0b3I6ICcqJyxcbiAgICAgICAgICAgICAgICAgICAgbGVmdDogbm9kZS5jYWxsZWUub2JqZWN0LFxuICAgICAgICAgICAgICAgICAgICByaWdodDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogU3ludGF4LkJpbmFyeUV4cHJlc3Npb24sXG4gICAgICAgICAgICAgICAgICAgICAgICBvcGVyYXRvcjogJy8nLFxuICAgICAgICAgICAgICAgICAgICAgICAgbGVmdDogbm9kZS5hcmd1bWVudHNbMF0sXG4gICAgICAgICAgICAgICAgICAgICAgICByaWdodDogVmVjLmNyZWF0ZUZ1bmN0aW9uQ2FsbCgnbGVuZ3RoJywgMCwgbm9kZSwgYXJncywgcGFyZW50KVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICBBTk5PKHJlcGxhY2UucmlnaHQpLnNldFR5cGUoVFlQRVMuTlVNQkVSKTtcbiAgICAgICAgICAgICAgICBBTk5PKHJlcGxhY2UpLmNvcHkoQU5OTyhub2RlKSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHJlcGxhY2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgIH1cblxuXG4gICAgbnMuVmVjID0gVmVjO1xuXG4gICAgbnMuY2FzdFRvRmxvYXQgPSBmdW5jdGlvbiAoYXN0KSB7XG4gICAgICAgIHZhciBleHAgPSBBTk5PKGFzdCk7XG5cbiAgICAgICAgaWYgKCFleHAuaXNOdW1iZXIoKSkgeyAgIC8vIENhc3RcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgdHlwZTogU3ludGF4LkNhbGxFeHByZXNzaW9uLFxuICAgICAgICAgICAgICAgIGNhbGxlZToge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiBTeW50YXguSWRlbnRpZmllcixcbiAgICAgICAgICAgICAgICAgICAgbmFtZTogXCJmbG9hdFwiXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBhcmd1bWVudHM6IFthc3RdXG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGFzdDtcbiAgICB9XG5cbiAgICBucy5leHRlbmQgPSBCYXNlLmV4dGVuZDtcblxuXG59KGV4cG9ydHMpKTtcbiIsIihmdW5jdGlvbihucyl7XG5cbiAgICB2YXIgU2hhZGUgPSByZXF1aXJlKFwiLi4vLi4vLi4vaW50ZXJmYWNlcy5qc1wiKTtcbiAgICB2YXIgU3ludGF4ID0gcmVxdWlyZSgnZXN0cmF2ZXJzZScpLlN5bnRheDtcbiAgICB2YXIgVG9vbHMgPSByZXF1aXJlKFwiLi90b29scy5qc1wiKTtcbiAgICB2YXIgQU5OTyA9IHJlcXVpcmUoXCIuLi8uLi8uLi9iYXNlL2Fubm90YXRpb24uanNcIikuQU5OTztcblxuICAgIHZhciBUWVBFUyA9IFNoYWRlLlRZUEVTLFxuICAgICAgICBLSU5EUyA9IFNoYWRlLk9CSkVDVF9LSU5EUztcblxuICAgIHZhciBWZWMySW5zdGFuY2UgPSB7XG4gICAgICAgIG5vcm1hbGl6ZToge1xuICAgICAgICAgICAgY2FsbEV4cDogVG9vbHMuVmVjLmNyZWF0ZUZ1bmN0aW9uQ2FsbC5iaW5kKG51bGwsICdub3JtYWxpemUnLCAwKVxuICAgICAgICB9LFxuICAgICAgICBkb3Q6IHtcbiAgICAgICAgICAgIGNhbGxFeHA6IFRvb2xzLlZlYy5jcmVhdGVGdW5jdGlvbkNhbGwuYmluZChudWxsLCAnZG90JywgMilcbiAgICAgICAgfSxcbiAgICAgICAgbGVuZ3RoOiB7XG4gICAgICAgICAgICBjYWxsRXhwOiBUb29scy5WZWMuZ2VuZXJhdGVMZW5ndGhDYWxsXG4gICAgICAgIH1cbiAgICB9XG4gICAgVG9vbHMuVmVjLmF0dGFjaFN3aXp6bGVzKFZlYzJJbnN0YW5jZSwgMik7XG4gICAgVG9vbHMuVmVjLmF0dGFjaE9wZXJhdG9ycyhWZWMySW5zdGFuY2UsIDIsIHtcbiAgICAgICAgYWRkOiAnKycsXG4gICAgICAgIHN1YjogJy0nLFxuICAgICAgICBtdWw6ICcqJyxcbiAgICAgICAgZGl2OiAnLycsXG4gICAgICAgIG1vZDogJyUnXG4gICAgfSlcblxuXG4gICAgVG9vbHMuZXh0ZW5kKG5zLCB7XG4gICAgICAgIGlkOiBcIlZlYzJcIixcbiAgICAgICAga2luZDogS0lORFMuRkxPQVQyLFxuICAgICAgICBvYmplY3Q6IHtcbiAgICAgICAgICAgIGNvbnN0cnVjdG9yOiBUb29scy5WZWMuZ2VuZXJhdGVDb25zdHJ1Y3RvcixcbiAgICAgICAgICAgIHN0YXRpYzoge31cbiAgICAgICAgfSxcbiAgICAgICAgaW5zdGFuY2U6IFZlYzJJbnN0YW5jZVxuICAgIH0pO1xuXG59KGV4cG9ydHMpKTtcbiIsIihmdW5jdGlvbihucyl7XG5cbiAgICB2YXIgU2hhZGUgPSByZXF1aXJlKFwiLi4vLi4vLi4vaW50ZXJmYWNlcy5qc1wiKTtcbiAgICB2YXIgU3ludGF4ID0gcmVxdWlyZSgnZXN0cmF2ZXJzZScpLlN5bnRheDtcbiAgICB2YXIgVG9vbHMgPSByZXF1aXJlKFwiLi90b29scy5qc1wiKTtcbiAgICB2YXIgQU5OTyA9IHJlcXVpcmUoXCIuLi8uLi8uLi9iYXNlL2Fubm90YXRpb24uanNcIikuQU5OTztcblxuICAgIHZhciBUWVBFUyA9IFNoYWRlLlRZUEVTLFxuICAgICAgICBLSU5EUyA9IFNoYWRlLk9CSkVDVF9LSU5EUztcblxuICAgIHZhciBWZWMzSW5zdGFuY2UgPSB7XG4gICAgICAgIG5vcm1hbGl6ZToge1xuICAgICAgICAgICAgY2FsbEV4cDogVG9vbHMuVmVjLmNyZWF0ZUZ1bmN0aW9uQ2FsbC5iaW5kKG51bGwsICdub3JtYWxpemUnLCAwKVxuICAgICAgICB9LFxuICAgICAgICBkb3Q6IHtcbiAgICAgICAgICAgIGNhbGxFeHA6IFRvb2xzLlZlYy5jcmVhdGVGdW5jdGlvbkNhbGwuYmluZChudWxsLCAnZG90JywgMylcbiAgICAgICAgfSxcbiAgICAgICAgbGVuZ3RoOiB7XG4gICAgICAgICAgICBjYWxsRXhwOiBUb29scy5WZWMuZ2VuZXJhdGVMZW5ndGhDYWxsXG4gICAgICAgIH1cbiAgICB9XG4gICAgVG9vbHMuVmVjLmF0dGFjaFN3aXp6bGVzKFZlYzNJbnN0YW5jZSwgMyk7XG4gICAgVG9vbHMuVmVjLmF0dGFjaE9wZXJhdG9ycyhWZWMzSW5zdGFuY2UsIDMsIHtcbiAgICAgICAgYWRkOiAnKycsXG4gICAgICAgIHN1YjogJy0nLFxuICAgICAgICBtdWw6ICcqJyxcbiAgICAgICAgZGl2OiAnLycsXG4gICAgICAgIG1vZDogJyUnXG4gICAgfSlcblxuXG4gICAgVG9vbHMuZXh0ZW5kKG5zLCB7XG4gICAgICAgIGlkOiBcIlZlYzNcIixcbiAgICAgICAga2luZDogS0lORFMuRkxPQVQzLFxuICAgICAgICBvYmplY3Q6IHtcbiAgICAgICAgICAgIGNvbnN0cnVjdG9yOiBUb29scy5WZWMuZ2VuZXJhdGVDb25zdHJ1Y3RvcixcbiAgICAgICAgICAgIHN0YXRpYzoge31cbiAgICAgICAgfSxcbiAgICAgICAgaW5zdGFuY2U6IFZlYzNJbnN0YW5jZVxuICAgIH0pO1xuXG59KGV4cG9ydHMpKTtcbiIsIihmdW5jdGlvbihucyl7XG5cbiAgICB2YXIgU2hhZGUgPSByZXF1aXJlKFwiLi4vLi4vLi4vaW50ZXJmYWNlcy5qc1wiKTtcbiAgICB2YXIgU3ludGF4ID0gcmVxdWlyZSgnZXN0cmF2ZXJzZScpLlN5bnRheDtcbiAgICB2YXIgVG9vbHMgPSByZXF1aXJlKFwiLi90b29scy5qc1wiKTtcbiAgICB2YXIgQU5OTyA9IHJlcXVpcmUoXCIuLi8uLi8uLi9iYXNlL2Fubm90YXRpb24uanNcIikuQU5OTztcblxuICAgIHZhciBUWVBFUyA9IFNoYWRlLlRZUEVTLFxuICAgICAgICBLSU5EUyA9IFNoYWRlLk9CSkVDVF9LSU5EUztcblxuICAgIHZhciBWZWM0SW5zdGFuY2UgPSB7XG4gICAgICAgIG5vcm1hbGl6ZToge1xuICAgICAgICAgICAgY2FsbEV4cDogVG9vbHMuVmVjLmNyZWF0ZUZ1bmN0aW9uQ2FsbC5iaW5kKG51bGwsICdub3JtYWxpemUnLCAwKVxuICAgICAgICB9LFxuICAgICAgICBkb3Q6IHtcbiAgICAgICAgICAgIGNhbGxFeHA6IFRvb2xzLlZlYy5jcmVhdGVGdW5jdGlvbkNhbGwuYmluZChudWxsLCAnZG90JywgNClcbiAgICAgICAgfSxcbiAgICAgICAgbGVuZ3RoOiB7XG4gICAgICAgICAgICBjYWxsRXhwOiBUb29scy5WZWMuZ2VuZXJhdGVMZW5ndGhDYWxsXG4gICAgICAgIH1cbiAgICB9XG4gICAgVG9vbHMuVmVjLmF0dGFjaFN3aXp6bGVzKFZlYzRJbnN0YW5jZSwgNCk7XG4gICAgVG9vbHMuVmVjLmF0dGFjaE9wZXJhdG9ycyhWZWM0SW5zdGFuY2UsIDQsIHtcbiAgICAgICAgYWRkOiAnKycsXG4gICAgICAgIHN1YjogJy0nLFxuICAgICAgICBtdWw6ICcqJyxcbiAgICAgICAgZGl2OiAnLycsXG4gICAgICAgIG1vZDogJyUnXG4gICAgfSlcblxuXG4gICAgVG9vbHMuZXh0ZW5kKG5zLCB7XG4gICAgICAgIGlkOiBcIlZlYzRcIixcbiAgICAgICAga2luZDogS0lORFMuRkxPQVQ0LFxuICAgICAgICBvYmplY3Q6IHtcbiAgICAgICAgICAgIGNvbnN0cnVjdG9yOiBUb29scy5WZWMuZ2VuZXJhdGVDb25zdHJ1Y3RvcixcbiAgICAgICAgICAgIHN0YXRpYzoge31cbiAgICAgICAgfSxcbiAgICAgICAgaW5zdGFuY2U6IFZlYzRJbnN0YW5jZVxuICAgIH0pO1xuXG59KGV4cG9ydHMpKTtcbiIsIihmdW5jdGlvbiAobnMpIHtcblxuICAgIHZhciBCYXNlID0gcmVxdWlyZShcIi4uLy4uL2Jhc2UvaW5kZXguanNcIiksXG4gICAgICAgIEFOTk8gPSByZXF1aXJlKFwiLi4vLi4vYmFzZS9hbm5vdGF0aW9uLmpzXCIpLkFOTk8sXG4gICAgICAgIEFubm90YXRpb24gPSByZXF1aXJlKFwiLi4vLi4vYmFzZS9hbm5vdGF0aW9uLmpzXCIpLkFubm90YXRpb24sXG4gICAgICAgIEZ1bmN0aW9uQW5ub3RhdGlvbiA9IHJlcXVpcmUoXCIuLi8uLi9iYXNlL2Fubm90YXRpb24uanNcIikuRnVuY3Rpb25Bbm5vdGF0aW9uLFxuICAgICAgICBUeXBlSW5mbyA9IHJlcXVpcmUoXCIuLi8uLi9iYXNlL3R5cGVpbmZvLmpzXCIpLlR5cGVJbmZvLFxuICAgICAgICBTaGFkZSA9IHJlcXVpcmUoXCIuLy4uLy4uL2ludGVyZmFjZXMuanNcIiksXG4gICAgICAgIFR5cGVzID0gU2hhZGUuVFlQRVMsXG4gICAgICAgIEtpbmRzID0gU2hhZGUuT0JKRUNUX0tJTkRTLFxuICAgICAgICBTb3VyY2VzID0gcmVxdWlyZShcIi4vLi4vLi4vaW50ZXJmYWNlcy5qc1wiKS5TT1VSQ0VTLFxuICAgICAgICBUb29scyA9IHJlcXVpcmUoJy4vcmVnaXN0cnkvdG9vbHMuanMnKTtcblxuICAgIHZhciBPYmplY3RSZWdpc3RyeSA9IHJlcXVpcmUoXCIuL3JlZ2lzdHJ5L2luZGV4LmpzXCIpLlJlZ2lzdHJ5LFxuICAgICAgICBDb250ZXh0ID0gcmVxdWlyZShcIi4uLy4uL2Jhc2UvY29udGV4dC5qc1wiKS5nZXRDb250ZXh0KE9iamVjdFJlZ2lzdHJ5KTtcblxuXG4gICAgdmFyIHdhbGsgPSByZXF1aXJlKCdlc3RyYXZlcnNlJyk7XG4gICAgdmFyIFN5bnRheCA9IHdhbGsuU3ludGF4O1xuICAgIHZhciBWaXNpdG9yT3B0aW9uID0gd2Fsay5WaXNpdG9yT3B0aW9uO1xuXG5cbiAgICAvKipcbiAgICAgKiBUcmFuc2Zvcm1zIHRoZSBKUyBBU1QgdG8gYW4gQVNUIHJlcHJlc2VudGF0aW9uIGNvbnZlbmllbnRcbiAgICAgKiBmb3IgY29kZSBnZW5lcmF0aW9uXG4gICAgICogQGNvbnN0cnVjdG9yXG4gICAgICovXG4gICAgdmFyIEdMQVNUVHJhbnNmb3JtZXIgPSBmdW5jdGlvbiAobWFpbklkKSB7XG4gICAgICAgIHRoaXMubWFpbklkID0gbWFpbklkO1xuICAgIH07XG5cbiAgICBCYXNlLmV4dGVuZChHTEFTVFRyYW5zZm9ybWVyLnByb3RvdHlwZSwge1xuICAgICAgICByZWdpc3Rlckdsb2JhbENvbnRleHQgOiBmdW5jdGlvbiAocHJvZ3JhbSkge1xuICAgICAgICAgICAgdmFyIGN0eCA9IG5ldyBDb250ZXh0KHByb2dyYW0sIG51bGwsIHtuYW1lOiBcImdsb2JhbFwifSk7XG4gICAgICAgICAgICBjdHgucmVnaXN0ZXJPYmplY3QoXCJNYXRoXCIsIE9iamVjdFJlZ2lzdHJ5LmdldEJ5TmFtZShcIk1hdGhcIikpO1xuICAgICAgICAgICAgY3R4LnJlZ2lzdGVyT2JqZWN0KFwidGhpc1wiLCBPYmplY3RSZWdpc3RyeS5nZXRCeU5hbWUoXCJTeXN0ZW1cIikpO1xuICAgICAgICAgICAgY3R4LnJlZ2lzdGVyT2JqZWN0KFwiU2hhZGVcIiwgT2JqZWN0UmVnaXN0cnkuZ2V0QnlOYW1lKFwiU2hhZGVcIikpO1xuICAgICAgICAgICAgY3R4LnJlZ2lzdGVyT2JqZWN0KFwiVmVjMlwiLCBPYmplY3RSZWdpc3RyeS5nZXRCeU5hbWUoXCJWZWMyXCIpKTtcbiAgICAgICAgICAgIGN0eC5yZWdpc3Rlck9iamVjdChcIlZlYzNcIiwgT2JqZWN0UmVnaXN0cnkuZ2V0QnlOYW1lKFwiVmVjM1wiKSk7XG4gICAgICAgICAgICBjdHgucmVnaXN0ZXJPYmplY3QoXCJWZWM0XCIsIE9iamVjdFJlZ2lzdHJ5LmdldEJ5TmFtZShcIlZlYzRcIikpO1xuICAgICAgICAgICAgY3R4LnJlZ2lzdGVyT2JqZWN0KFwiQ29sb3JcIiwgT2JqZWN0UmVnaXN0cnkuZ2V0QnlOYW1lKFwiVmVjM1wiKSk7XG4gICAgICAgICAgICBjdHgucmVnaXN0ZXJPYmplY3QoXCJUZXh0dXJlXCIsIE9iamVjdFJlZ2lzdHJ5LmdldEJ5TmFtZShcIlRleHR1cmVcIikpO1xuICAgICAgICAgICAgY3R4LmRlY2xhcmVWYXJpYWJsZShcImdsX0ZyYWdDb29yZFwiLCBmYWxzZSk7XG4gICAgICAgICAgICBjdHgudXBkYXRlRXhwcmVzc2lvbihcImdsX0ZyYWdDb29yZFwiLCBuZXcgVHlwZUluZm8oe1xuICAgICAgICAgICAgICAgIGV4dHJhOiB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IFR5cGVzLk9CSkVDVCxcbiAgICAgICAgICAgICAgICAgICAga2luZDogS2luZHMuRkxPQVQzXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSkpO1xuICAgICAgICAgICAgY3R4LmRlY2xhcmVWYXJpYWJsZShcIl9zeXNfbm9ybWFsaXplZENvb3Jkc1wiLCBmYWxzZSk7XG4gICAgICAgICAgICBjdHgudXBkYXRlRXhwcmVzc2lvbihcIl9zeXNfbm9ybWFsaXplZENvb3Jkc1wiLCBuZXcgVHlwZUluZm8oe1xuICAgICAgICAgICAgICAgIGV4dHJhOiB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IFR5cGVzLk9CSkVDVCxcbiAgICAgICAgICAgICAgICAgICAga2luZDogS2luZHMuRkxPQVQzXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSkpO1xuXG4gICAgICAgICAgICByZXR1cm4gY3R4O1xuICAgICAgICB9LFxuICAgICAgICB0cmFuc2Zvcm1BQVNUOiBmdW5jdGlvbiAocHJvZ3JhbSkge1xuICAgICAgICAgICAgdGhpcy5yb290ID0gcHJvZ3JhbTtcbiAgICAgICAgICAgIHZhciBjb250ZXh0ID0gdGhpcy5yZWdpc3Rlckdsb2JhbENvbnRleHQocHJvZ3JhbSk7XG5cbiAgICAgICAgICAgIHZhciBzdGF0ZSA9IHtcbiAgICAgICAgICAgICAgICAgY29udGV4dDogY29udGV4dCxcbiAgICAgICAgICAgICAgICAgY29udGV4dFN0YWNrOiBbY29udGV4dF0sXG4gICAgICAgICAgICAgICAgIGluTWFpbjogIHRoaXMubWFpbklkID09IGNvbnRleHQuc3RyKCksXG4gICAgICAgICAgICAgICAgIGdsb2JhbFBhcmFtZXRlcnMgOiBwcm9ncmFtLmluamVjdGlvbnNbdGhpcy5tYWluSWRdICYmIHByb2dyYW0uaW5qZWN0aW9uc1t0aGlzLm1haW5JZF1bMF0gPyBwcm9ncmFtLmluamVjdGlvbnNbdGhpcy5tYWluSWRdWzBdLm5vZGUuZXh0cmEuaW5mbyA6IHt9LFxuICAgICAgICAgICAgICAgICBzeXN0ZW1QYXJhbWV0ZXJzOiB7fSxcbiAgICAgICAgICAgICAgICAgYmxvY2tlZE5hbWVzIDogW10sXG4gICAgICAgICAgICAgICAgIHRvcERlY2xhcmF0aW9ucyA6IFtdLFxuICAgICAgICAgICAgICAgICBpZE5hbWVNYXAgOiB7fVxuICAgICAgICAgICAgfVxuXG5cbiAgICAgICAgICAgIC8vIFRPRE86IFdlIHNob3VsZCBhbHNvIGJsb2NrIHN5c3RlbVBhcmFtZXRlcnMgaGVyZS4gV2UgY2FuIGJsb2NrIGFsbCBzeXN0ZW0gbmFtZXMsIGV2ZW4gaWYgbm90IHVzZWQuXG4gICAgICAgICAgICBmb3IodmFyIG5hbWUgaW4gc3RhdGUuZ2xvYmFsUGFyYW1ldGVycyl7XG4gICAgICAgICAgICAgICAgc3RhdGUuYmxvY2tlZE5hbWVzLnB1c2goIGdldE5hbWVGb3JHbG9iYWwobmFtZSkgKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdGhpcy5yZXBsYWNlKHByb2dyYW0sIHN0YXRlKTtcblxuICAgICAgICAgICAgZm9yKHZhciBuYW1lIGluIHN0YXRlLnN5c3RlbVBhcmFtZXRlcnMpe1xuICAgICAgICAgICAgICAgIHZhciBkZWNsID0gaGFuZGxlVG9wRGVjbGFyYXRpb24obmFtZSwgc3RhdGUuc3lzdGVtUGFyYW1ldGVyc1tuYW1lXSk7XG4gICAgICAgICAgICAgICAgZGVjbCAmJiBwcm9ncmFtLmJvZHkudW5zaGlmdChkZWNsKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgZm9yKHZhciBuYW1lIGluIHN0YXRlLmdsb2JhbFBhcmFtZXRlcnMpe1xuICAgICAgICAgICAgICAgIHZhciBkZWNsID0gaGFuZGxlVG9wRGVjbGFyYXRpb24oZ2V0TmFtZUZvckdsb2JhbChuYW1lKSwgc3RhdGUuZ2xvYmFsUGFyYW1ldGVyc1tuYW1lXSk7XG4gICAgICAgICAgICAgICAgZGVjbCAmJiBwcm9ncmFtLmJvZHkudW5zaGlmdChkZWNsKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIHByb2dyYW07XG4gICAgICAgIH0sXG4gICAgICAgIC8qKlxuICAgICAgICAgKlxuICAgICAgICAgKiBAcGFyYW0ge09iamVjdCF9IGFzdFxuICAgICAgICAgKiBAcGFyYW0ge09iamVjdCF9IHN0YXRlXG4gICAgICAgICAqIEByZXR1cm5zIHsqfVxuICAgICAgICAgKi9cbiAgICAgICAgcmVwbGFjZTogZnVuY3Rpb24oYXN0LCBzdGF0ZSkge1xuICAgICAgICAgICAgYXN0ID0gd2Fsay5yZXBsYWNlKGFzdCwge1xuXG4gICAgICAgICAgICAgICAgZW50ZXI6IGZ1bmN0aW9uIChub2RlLCBwYXJlbnQsIGNiKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vY29uc29sZS5sb2coXCJFbnRlcjpcIiwgbm9kZS50eXBlKTtcbiAgICAgICAgICAgICAgICAgICAgc3dpdGNoIChub2RlLnR5cGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgU3ludGF4LklkZW50aWZpZXI6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGhhbmRsZUlkZW50aWZpZXIobm9kZSwgcGFyZW50LCBzdGF0ZS5ibG9ja2VkTmFtZXMsIHN0YXRlLmlkTmFtZU1hcCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjYXNlIFN5bnRheC5JZlN0YXRlbWVudDpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gaGFuZGxlSWZTdGF0ZW1lbnQobm9kZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjYXNlIFN5bnRheC5Db25kaXRpb25hbEV4cHJlc3Npb246XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGhhbmRsZUNvbmRpdGlvbmFsRXhwcmVzc2lvbihub2RlLCBzdGF0ZSwgdGhpcywgY2IpO1xuICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSBTeW50YXguTG9naWNhbEV4cHJlc3Npb246XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGhhbmRsZUVudGVyTG9naWNhbEV4cHJlc3Npb24obm9kZSwgdGhpcywgc3RhdGUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSBTeW50YXguRnVuY3Rpb25EZWNsYXJhdGlvbjpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBObyBuZWVkIHRvIGRlY2xhcmUsIHRoaXMgaGFzIGJlZW4gYW5ub3RhdGVkIGFscmVhZHlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgcGFyZW50Q29udGV4dCA9IHN0YXRlLmNvbnRleHRTdGFja1tzdGF0ZS5jb250ZXh0U3RhY2subGVuZ3RoIC0gMV07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGNvbnRleHQgPSBuZXcgQ29udGV4dChub2RlLCBwYXJlbnRDb250ZXh0LCB7bmFtZTogbm9kZS5pZC5uYW1lIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0YXRlLmNvbnRleHQgPSBjb250ZXh0O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0YXRlLmNvbnRleHRTdGFjay5wdXNoKGNvbnRleHQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0YXRlLmluTWFpbiA9IHRoaXMubWFpbklkID09IGNvbnRleHQuc3RyKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9LmJpbmQodGhpcyksXG5cbiAgICAgICAgICAgICAgICBsZWF2ZTogZnVuY3Rpb24obm9kZSwgcGFyZW50KSB7XG4gICAgICAgICAgICAgICAgICAgIHN3aXRjaChub2RlLnR5cGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgU3ludGF4Lk1lbWJlckV4cHJlc3Npb246XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGhhbmRsZU1lbWJlckV4cHJlc3Npb24obm9kZSwgcGFyZW50LCBzdGF0ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjYXNlIFN5bnRheC5OZXdFeHByZXNzaW9uOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBoYW5kbGVOZXdFeHByZXNzaW9uKG5vZGUsIHBhcmVudCwgc3RhdGUuY29udGV4dCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjYXNlIFN5bnRheC5Mb2dpY2FsRXhwcmVzc2lvbjpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gaGFuZGxlRXhpdExvZ2ljYWxFeHByZXNzaW9uKG5vZGUsIHRoaXMsIHN0YXRlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgU3ludGF4LkNhbGxFeHByZXNzaW9uOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBoYW5kbGVDYWxsRXhwcmVzc2lvbihub2RlLCBwYXJlbnQsIHN0YXRlLnRvcERlY2xhcmF0aW9ucywgc3RhdGUuY29udGV4dCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjYXNlIFN5bnRheC5GdW5jdGlvbkRlY2xhcmF0aW9uOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0YXRlLmNvbnRleHQgPSBzdGF0ZS5jb250ZXh0U3RhY2sucG9wKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RhdGUuaW5NYWluID0gc3RhdGUuY29udGV4dC5zdHIoKSA9PSB0aGlzLm1haW5JZDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoc3RhdGUuaW5NYWluKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gaGFuZGxlTWFpbkZ1bmN0aW9uKG5vZGUsIHBhcmVudCwgc3RhdGUuY29udGV4dCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjYXNlIFN5bnRheC5SZXR1cm5TdGF0ZW1lbnQ6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYoc3RhdGUuaW5NYWluKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBoYW5kbGVSZXR1cm5Jbk1haW4obm9kZSwgc3RhdGUuY29udGV4dCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSBTeW50YXguQmluYXJ5RXhwcmVzc2lvbjpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gaGFuZGxlQmluYXJ5RXhwcmVzc2lvbihub2RlLCBwYXJlbnQpO1xuXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9LmJpbmQodGhpcylcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgcmV0dXJuIGFzdDtcbiAgICAgICAgfVxuICAgIH0pO1xuXG4gICAgdmFyIGhhbmRsZVRvcERlY2xhcmF0aW9uID0gZnVuY3Rpb24obmFtZSwgdHlwZUluZm8pe1xuICAgICAgICB2YXIgcHJvcGVydHlMaXRlcmFsID0gIHsgdHlwZTogU3ludGF4LklkZW50aWZpZXIsIG5hbWU6IG5hbWV9O1xuICAgICAgICB2YXIgcHJvcGVydHlBbm5vdGF0aW9uID0gIEFOTk8ocHJvcGVydHlMaXRlcmFsKTtcbiAgICAgICAgcHJvcGVydHlBbm5vdGF0aW9uLnNldEZyb21FeHRyYSh0eXBlSW5mbyk7XG5cbiAgICAgICAgaWYgKHByb3BlcnR5QW5ub3RhdGlvbi5pc051bGxPclVuZGVmaW5lZCgpKVxuICAgICAgICAgICAgcmV0dXJuO1xuXG4gICAgICAgIHZhciBkZWNsID0ge1xuICAgICAgICAgICAgdHlwZTogU3ludGF4LlZhcmlhYmxlRGVjbGFyYXRpb24sXG4gICAgICAgICAgICBkZWNsYXJhdGlvbnM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IFN5bnRheC5WYXJpYWJsZURlY2xhcmF0b3IsXG4gICAgICAgICAgICAgICAgICAgIGlkOiBwcm9wZXJ0eUxpdGVyYWwsXG4gICAgICAgICAgICAgICAgICAgIGluaXQ6IG51bGxcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAga2luZDogXCJ2YXJcIlxuICAgICAgICB9O1xuICAgICAgICB2YXIgZGVjbEFubm90YXRpb24gPSAgQU5OTyhkZWNsLmRlY2xhcmF0aW9uc1swXSk7XG4gICAgICAgIGRlY2xBbm5vdGF0aW9uLmNvcHkocHJvcGVydHlBbm5vdGF0aW9uKTtcbiAgICAgICAgcmV0dXJuIGRlY2w7XG4gICAgfVxuXG4gICAgdmFyIGhhbmRsZUlkZW50aWZpZXIgPSBmdW5jdGlvbihub2RlLCBwYXJlbnQsIGJsb2NrZWROYW1lcywgaWROYW1lTWFwKXtcbiAgICAgICAgaWYocGFyZW50LnR5cGUgPT0gU3ludGF4Lk1lbWJlckV4cHJlc3Npb24pXG4gICAgICAgICAgICByZXR1cm4gbm9kZTtcblxuICAgICAgICB2YXIgbmFtZSA9IG5vZGUubmFtZTtcbiAgICAgICAgaWYoaWROYW1lTWFwW25hbWVdKSBub2RlLm5hbWUgPSBpZE5hbWVNYXBbbmFtZV07XG4gICAgICAgIHZhciBuZXdOYW1lID0gbmFtZS5yZXBsYWNlKC9fKy9nLCBcIl9cIiksIGkgPSAxO1xuICAgICAgICB3aGlsZShibG9ja2VkTmFtZXMuaW5kZXhPZihuZXdOYW1lKSAhPSAtMSl7XG4gICAgICAgICAgICBuZXdOYW1lID0gbmFtZSArIFwiX1wiICsgKCsraSk7XG4gICAgICAgIH1cbiAgICAgICAgaWROYW1lTWFwW25hbWVdID0gbmV3TmFtZTtcbiAgICAgICAgbm9kZS5uYW1lID0gbmV3TmFtZTtcbiAgICAgICAgcmV0dXJuIG5vZGU7XG4gICAgfVxuXG5cbiAgICB2YXIgaGFuZGxlUmV0dXJuSW5NYWluID0gZnVuY3Rpb24obm9kZSwgY29udGV4dCkge1xuICAgICAgICBpZiAobm9kZS5hcmd1bWVudCkge1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICB0eXBlOiBTeW50YXguQmxvY2tTdGF0ZW1lbnQsXG4gICAgICAgICAgICAgICAgYm9keTogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiBTeW50YXguQXNzaWdubWVudEV4cHJlc3Npb24sXG4gICAgICAgICAgICAgICAgICAgICAgICBvcGVyYXRvcjogXCI9XCIsXG4gICAgICAgICAgICAgICAgICAgICAgICBsZWZ0OiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogU3ludGF4LklkZW50aWZpZXIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbmFtZTogXCJnbF9GcmFnQ29sb3JcIlxuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHJpZ2h0OiBjYXN0VG9WZWM0KG5vZGUuYXJndW1lbnQsIGNvbnRleHQpXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6IFN5bnRheC5SZXR1cm5TdGF0ZW1lbnRcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIF1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgdHlwZTogU3ludGF4LkV4cHJlc3Npb25TdGF0ZW1lbnQsXG4gICAgICAgICAgICAgICAgZXhwcmVzc2lvbiA6IHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogU3ludGF4LklkZW50aWZpZXIsXG4gICAgICAgICAgICAgICAgICAgIG5hbWU6IFwiZGlzY2FyZFwiXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfTtcblxuICAgIHZhciBoYW5kbGVNYWluRnVuY3Rpb24gPSBmdW5jdGlvbihub2RlLCBwYXJlbnQsIGNvbnRleHQpIHtcbiAgICAgICAgdmFyIGFubm8gPSBuZXcgRnVuY3Rpb25Bbm5vdGF0aW9uKG5vZGUpO1xuICAgICAgICBhbm5vLnNldFJldHVybkluZm8oeyB0eXBlOiBUeXBlcy5VTkRFRklORUQgfSk7XG5cbiAgICAgICAgLy8gTWFpbiBoYXMgbm8gcGFyYW1ldGVyc1xuICAgICAgICBub2RlLnBhcmFtcyA9IFtdO1xuICAgICAgICAvLyBSZW5hbWUgdG8gJ21haW4nXG4gICAgICAgIG5vZGUuaWQubmFtZSA9IFwibWFpblwiO1xuICAgICAgICAvL2NvbnNvbGUubG9nKG5vZGUpO1xuICAgIH1cblxuXG4gICAgZnVuY3Rpb24gZ2V0TmFtZU9mTm9kZShub2RlKSB7XG4gICAgICAgIHN3aXRjaCAobm9kZS50eXBlKSB7XG4gICAgICAgICAgICBjYXNlIFN5bnRheC5JZGVudGlmaWVyOlxuICAgICAgICAgICAgICAgIHJldHVybiBub2RlLm5hbWU7XG4gICAgICAgICAgICBjYXNlIFN5bnRheC5NZW1iZXJFeHByZXNzaW9uOlxuICAgICAgICAgICAgICAgIHJldHVybiBnZXROYW1lT2ZOb2RlKG5vZGUub2JqZWN0KSArIFwiLlwiICsgZ2V0TmFtZU9mTm9kZShub2RlLnByb3BlcnR5KTtcbiAgICAgICAgICAgIGNhc2UgU3ludGF4Lk5ld0V4cHJlc3Npb246XG4gICAgICAgICAgICAgICAgcmV0dXJuIGdldE5hbWVPZk5vZGUobm9kZS5jYWxsZWUpO1xuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICByZXR1cm4gXCJ1bmtub3duKFwiICsgbm9kZS50eXBlICsgXCIpXCI7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgZnVuY3Rpb24gZ2V0T2JqZWN0UmVmZXJlbmNlRnJvbU5vZGUob2JqZWN0LCBjb250ZXh0KSB7XG4gICAgICAgIHN3aXRjaCAob2JqZWN0LnR5cGUpIHtcbiAgICAgICAgICAgIGNhc2UgU3ludGF4Lk5ld0V4cHJlc3Npb246XG4gICAgICAgICAgICBjYXNlIFN5bnRheC5DYWxsRXhwcmVzc2lvbjpcbiAgICAgICAgICAgIGNhc2UgU3ludGF4Lk1lbWJlckV4cHJlc3Npb246XG4gICAgICAgICAgICBjYXNlIFN5bnRheC5CaW5hcnlFeHByZXNzaW9uOlxuICAgICAgICAgICAgY2FzZSBTeW50YXguSWRlbnRpZmllcjpcbiAgICAgICAgICAgICAgICByZXR1cm4gY29udGV4dC5jcmVhdGVUeXBlSW5mbyhvYmplY3QpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBTeW50YXguVGhpc0V4cHJlc3Npb246XG4gICAgICAgICAgICAgICAgcmV0dXJuIGNvbnRleHQuZ2V0QmluZGluZ0J5TmFtZShcInRoaXNcIik7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIlVuaGFuZGxlZCBvYmplY3QgdHlwZSBpbiBHTFNMIGdlbmVyYXRpb246IFwiICsgb2JqZWN0LnR5cGUpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgdmFyIGhhbmRsZUNhbGxFeHByZXNzaW9uID0gZnVuY3Rpb24gKGNhbGxFeHByZXNzaW9uLCBwYXJlbnQsIHRvcERlY2xhcmF0aW9ucywgY29udGV4dCkge1xuXG4gICAgICAgIC8vIElzIHRoaXMgYSBjYWxsIG9uIGFuIG9iamVjdD9cbiAgICAgICAgaWYgKGNhbGxFeHByZXNzaW9uLmNhbGxlZS50eXBlID09IFN5bnRheC5NZW1iZXJFeHByZXNzaW9uKSB7XG4gICAgICAgICAgICB2YXIgY2FsbGVlUmVmZXJlbmNlID0gZ2V0T2JqZWN0UmVmZXJlbmNlRnJvbU5vZGUoY2FsbEV4cHJlc3Npb24uY2FsbGVlLCBjb250ZXh0KTtcbiAgICAgICAgICAgIGlmKCEoY2FsbGVlUmVmZXJlbmNlICYmIGNhbGxlZVJlZmVyZW5jZS5pc0Z1bmN0aW9uKCkpKVxuICAgICAgICAgICAgICAgIFNoYWRlLnRocm93RXJyb3IoY2FsbEV4cHJlc3Npb24sIFwiU29tZXRoaW5nIHdlbnQgd3JvbmcgaW4gdHlwZSBpbmZlcmVuY2UsIFwiICsgY2FsbEV4cHJlc3Npb24uY2FsbGVlLm9iamVjdC5uYW1lKTtcblxuICAgICAgICAgICAgdmFyIG9iamVjdCA9IGNhbGxFeHByZXNzaW9uLmNhbGxlZS5vYmplY3QsXG4gICAgICAgICAgICAgICAgcHJvcGVydHlOYW1lID0gY2FsbEV4cHJlc3Npb24uY2FsbGVlLnByb3BlcnR5Lm5hbWU7XG5cbiAgICAgICAgICAgIHZhciBvYmplY3RSZWZlcmVuY2UgPSBnZXRPYmplY3RSZWZlcmVuY2VGcm9tTm9kZShvYmplY3QsIGNvbnRleHQpO1xuICAgICAgICAgICAgaWYoIW9iamVjdFJlZmVyZW5jZSkgIHtcbiAgICAgICAgICAgICAgICBTaGFkZS50aHJvd0Vycm9yKGNhbGxFeHByZXNzaW9uLCBcIkludGVybmFsOiBObyBvYmplY3QgaW5mbyBmb3I6IFwiICsgb2JqZWN0KTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdmFyIG9iamVjdEluZm8gPSBjb250ZXh0LmdldE9iamVjdEluZm9Gb3Iob2JqZWN0UmVmZXJlbmNlKTtcbiAgICAgICAgICAgIGlmKCFvYmplY3RJbmZvKSB7IC8vIEV2ZXJ5IG9iamVjdCBuZWVkcyBhbiBpbmZvLCBvdGhlcndpc2Ugd2UgZGlkIHNvbWV0aGluZyB3cm9uZ1xuICAgICAgICAgICAgICAgIFNoYWRlLnRocm93RXJyb3IoY2FsbEV4cHJlc3Npb24sIFwiSW50ZXJuYWwgRXJyb3I6IE5vIG9iamVjdCByZWdpc3RlcmVkIGZvcjogXCIgKyBvYmplY3RSZWZlcmVuY2UuZ2V0VHlwZVN0cmluZygpICsgXCIsIFwiICsgZ2V0TmFtZU9mTm9kZShjYWxsRXhwcmVzc2lvbi5jYWxsZWUub2JqZWN0KStcIiwgXCIrY2FsbEV4cHJlc3Npb24uY2FsbGVlLm9iamVjdC50eXBlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChvYmplY3RJbmZvLmhhc093blByb3BlcnR5KHByb3BlcnR5TmFtZSkpIHtcbiAgICAgICAgICAgICAgICB2YXIgcHJvcGVydHlIYW5kbGVyID0gb2JqZWN0SW5mb1twcm9wZXJ0eU5hbWVdO1xuICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgcHJvcGVydHlIYW5kbGVyLmNhbGxFeHAgPT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBhcmdzID0gQW5ub3RhdGlvbi5jcmVhdGVBbm5vdGF0ZWROb2RlQXJyYXkoY2FsbEV4cHJlc3Npb24uYXJndW1lbnRzLCBjb250ZXh0KTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHByb3BlcnR5SGFuZGxlci5jYWxsRXhwKGNhbGxFeHByZXNzaW9uLCBhcmdzLCBwYXJlbnQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIHZhciBoYW5kbGVOZXdFeHByZXNzaW9uID0gZnVuY3Rpb24obmV3RXhwcmVzc2lvbiwgcGFyZW50LCBjb250ZXh0KXtcbiAgICAgICAgdmFyIGVudHJ5ID0gY29udGV4dC5nZXRCaW5kaW5nQnlOYW1lKG5ld0V4cHJlc3Npb24uY2FsbGVlLm5hbWUpO1xuICAgICAgICAvL2NvbnNvbGUuZXJyb3IoZW50cnkpO1xuICAgICAgICBpZiAoZW50cnkgJiYgZW50cnkuaGFzQ29uc3RydWN0b3IoKSkge1xuICAgICAgICAgICAgdmFyIGNvbnN0cnVjdG9yID0gZW50cnkuZ2V0Q29uc3RydWN0b3IoKTtcbiAgICAgICAgICAgIHJldHVybiBjb25zdHJ1Y3RvcihuZXdFeHByZXNzaW9uKTtcbiAgICAgICAgfVxuICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiUmVmZXJlbmNlRXJyb3I6IFwiICsgbm9kZS5jYWxsZWUubmFtZSArIFwiIGlzIG5vdCBkZWZpbmVkXCIpO1xuICAgICAgICB9XG4gICAgfVxuXG5cbiAgICB2YXIgaGFuZGxlTWVtYmVyRXhwcmVzc2lvbiA9IGZ1bmN0aW9uIChtZW1iZXJFeHByZXNzaW9uLCBwYXJlbnQsIHN0YXRlKSB7XG4gICAgICAgIHZhciBwcm9wZXJ0eU5hbWUgPSBtZW1iZXJFeHByZXNzaW9uLnByb3BlcnR5Lm5hbWUsXG4gICAgICAgICAgICBjb250ZXh0ID0gc3RhdGUuY29udGV4dDtcblxuICAgICAgICB2YXIgb2JqZWN0UmVmZXJlbmNlID0gZ2V0T2JqZWN0UmVmZXJlbmNlRnJvbU5vZGUobWVtYmVyRXhwcmVzc2lvbi5vYmplY3QsIGNvbnRleHQpO1xuXG4gICAgICAgIGlmICghb2JqZWN0UmVmZXJlbmNlIHx8ICFvYmplY3RSZWZlcmVuY2UuaXNPYmplY3QoKSlcbiAgICAgICAgICAgIFNoYWRlLnRocm93RXJyb3IobWVtYmVyRXhwcmVzc2lvbiwgXCJJbnRlcm5hbCBFcnJvcjogT2JqZWN0IG9mIE1lbWJlciBleHByZXNzaW9uIGlzIG5vIG9iamVjdC5cIik7XG5cbiAgICAgICAgdmFyIG9iamVjdEluZm8gPSBjb250ZXh0LmdldE9iamVjdEluZm9Gb3Iob2JqZWN0UmVmZXJlbmNlKTtcbiAgICAgICAgaWYoIW9iamVjdEluZm8pIHsvLyBFdmVyeSBvYmplY3QgbmVlZHMgYW4gaW5mbywgb3RoZXJ3aXNlIHdlIGRpZCBzb21ldGhpbmcgd3JvbmdcbiAgICAgICAgICAgIFNoYWRlLnRocm93RXJyb3IobWVtYmVyRXhwcmVzc2lvbiwgXCJJbnRlcm5hbCBFcnJvcjogTm8gb2JqZWN0IHJlZ2lzdGVyZWQgZm9yOiBcIiArIG9iamVjdFJlZmVyZW5jZS5nZXRUeXBlU3RyaW5nKCkgKyBKU09OLnN0cmluZ2lmeShtZW1iZXJFeHByZXNzaW9uLm9iamVjdCkpO1xuICAgICAgICB9XG4gICAgICAgIGlmICghb2JqZWN0SW5mby5oYXNPd25Qcm9wZXJ0eShwcm9wZXJ0eU5hbWUpKVxuICAgICAgICAgICAgU2hhZGUudGhyb3dFcnJvcihtZW1iZXJFeHByZXNzaW9uLCBcIkludGVybmFsIEVycm9yOiBPYmplY3Qgb2YgdHlwZSBcIiArIG9iamVjdFJlZmVyZW5jZS5nZXRUeXBlU3RyaW5nKCkgKyBcIiBoYXMgbm8gcHJvcGVydHkgJ1wiICsgcHJvcGVydHlOYW1lICtcIidcIik7XG5cbiAgICAgICAgdmFyIHByb3BlcnR5SGFuZGxlciA9IG9iamVjdEluZm9bcHJvcGVydHlOYW1lXTtcbiAgICAgICAgaWYgKHR5cGVvZiBwcm9wZXJ0eUhhbmRsZXIucHJvcGVydHkgPT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAgICAgICB2YXIgcmVzdWx0ID0gcHJvcGVydHlIYW5kbGVyLnByb3BlcnR5KG1lbWJlckV4cHJlc3Npb24sIHBhcmVudCwgY29udGV4dCwgc3RhdGUpO1xuICAgICAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmKG9iamVjdFJlZmVyZW5jZS5pc0dsb2JhbCgpKSB7XG4gICAgICAgICAgICB2YXIgcHJvcGVydHlMaXRlcmFsID0gIHsgdHlwZTogU3ludGF4LklkZW50aWZpZXIsIG5hbWU6IGdldE5hbWVGb3JHbG9iYWwocHJvcGVydHlOYW1lKX07XG4gICAgICAgICAgICBBTk5PKHByb3BlcnR5TGl0ZXJhbCkuY29weShBTk5PKG1lbWJlckV4cHJlc3Npb24pKTtcbiAgICAgICAgICAgIHJldHVybiBwcm9wZXJ0eUxpdGVyYWw7XG4gICAgICAgIH1cblxuICAgIH07XG5cbiAgICB2YXIgZ2V0TmFtZUZvckdsb2JhbCA9IGZ1bmN0aW9uKGJhc2VOYW1lKSB7XG4gICAgICAgIHZhciBuYW1lID0gXCJfZW52X1wiICsgYmFzZU5hbWU7XG4gICAgICAgIHJldHVybiBuYW1lLnJlcGxhY2UoL18rL2csIFwiX1wiKTtcbiAgICB9XG5cbiAgICB2YXIgaGFuZGxlQmluYXJ5RXhwcmVzc2lvbiA9IGZ1bmN0aW9uIChiaW5hcnlFeHByZXNzaW9uLCBwYXJlbnQsIGNiKSB7XG4gICAgICAgIC8vIEluIEdMLCB3ZSBjYW4ndCBtaXggdXAgZmxvYXRzLCBpbnRzIGFuZCBib29sZCBmb3IgYmluYXJ5IGV4cHJlc3Npb25zXG4gICAgICAgIHZhciBsZWZ0ID0gQU5OTyhiaW5hcnlFeHByZXNzaW9uLmxlZnQpLFxuICAgICAgICAgICAgcmlnaHQgPSBBTk5PKGJpbmFyeUV4cHJlc3Npb24ucmlnaHQpO1xuXG4gICAgICAgIGlmIChsZWZ0LmlzTnVtYmVyKCkgJiYgcmlnaHQuaXNJbnQoKSkge1xuICAgICAgICAgICAgYmluYXJ5RXhwcmVzc2lvbi5yaWdodCA9IFRvb2xzLmNhc3RUb0Zsb2F0KGJpbmFyeUV4cHJlc3Npb24ucmlnaHQpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKHJpZ2h0LmlzTnVtYmVyKCkgJiYgbGVmdC5pc0ludCgpKSB7XG4gICAgICAgICAgICBiaW5hcnlFeHByZXNzaW9uLmxlZnQgPSBUb29scy5jYXN0VG9GbG9hdChiaW5hcnlFeHByZXNzaW9uLmxlZnQpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGJpbmFyeUV4cHJlc3Npb24ub3BlcmF0b3IgPT0gXCIlXCIpIHtcbiAgICAgICAgICAgIHJldHVybiBoYW5kbGVNb2R1bG8oYmluYXJ5RXhwcmVzc2lvbik7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGJpbmFyeUV4cHJlc3Npb247XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gY2FzdFRvSW50KGFzdCwgZm9yY2UpIHtcbiAgICAgICAgdmFyIGV4cCA9IEFOTk8oYXN0KTtcblxuICAgICAgICBpZiAoIWV4cC5pc0ludCgpIHx8IGZvcmNlKSB7ICAgLy8gQ2FzdFxuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICB0eXBlOiBTeW50YXguQ2FsbEV4cHJlc3Npb24sXG4gICAgICAgICAgICAgICAgY2FsbGVlOiB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IFN5bnRheC5JZGVudGlmaWVyLFxuICAgICAgICAgICAgICAgICAgICBuYW1lOiBcImludFwiXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBhcmd1bWVudHM6IFthc3RdXG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGFzdDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBjYXN0VG9WZWM0KGFzdCwgY29udGV4dCkge1xuICAgICAgICB2YXIgZXhwID0gVHlwZUluZm8uY3JlYXRlRm9yQ29udGV4dChhc3QsIGNvbnRleHQpO1xuXG4gICAgICAgIGlmIChleHAuaXNPZktpbmQoS2luZHMuRkxPQVQ0KSlcbiAgICAgICAgICAgIHJldHVybiBhc3Q7XG5cbiAgICAgICAgaWYgKGV4cC5pc09mS2luZChLaW5kcy5GTE9BVDMpKSB7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHR5cGU6IFN5bnRheC5DYWxsRXhwcmVzc2lvbixcbiAgICAgICAgICAgICAgICBjYWxsZWU6IHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogU3ludGF4LklkZW50aWZpZXIsXG4gICAgICAgICAgICAgICAgICAgIG5hbWU6IFwidmVjNFwiXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBhcmd1bWVudHM6IFthc3QsIHsgdHlwZTogU3ludGF4LkxpdGVyYWwsIHZhbHVlOiAxLjAsIGV4dHJhOiB7IHR5cGU6IFR5cGVzLk5VTUJFUn0gfV1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBTaGFkZS50aHJvd0Vycm9yKGFzdCwgXCJDYW4ndCBjYXN0IGZyb20gJ1wiICsgZXhwLmdldFR5cGVTdHJpbmcoKSArIFwiJyB0byB2ZWM0XCIpO1xuICAgIH1cblxuICAgIHZhciBoYW5kbGVNb2R1bG8gPSBmdW5jdGlvbiAoYmluYXJ5RXhwcmVzc2lvbikge1xuICAgICAgICBiaW5hcnlFeHByZXNzaW9uLnJpZ2h0ID0gVG9vbHMuY2FzdFRvRmxvYXQoYmluYXJ5RXhwcmVzc2lvbi5yaWdodCk7XG4gICAgICAgIGJpbmFyeUV4cHJlc3Npb24ubGVmdCA9IFRvb2xzLmNhc3RUb0Zsb2F0KGJpbmFyeUV4cHJlc3Npb24ubGVmdCk7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB0eXBlOiBTeW50YXguQ2FsbEV4cHJlc3Npb24sXG4gICAgICAgICAgICBjYWxsZWU6IHtcbiAgICAgICAgICAgICAgICB0eXBlOiBTeW50YXguSWRlbnRpZmllcixcbiAgICAgICAgICAgICAgICBuYW1lOiBcIm1vZFwiXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgYXJndW1lbnRzOiBbXG4gICAgICAgICAgICAgICAgYmluYXJ5RXhwcmVzc2lvbi5sZWZ0LFxuICAgICAgICAgICAgICAgIGJpbmFyeUV4cHJlc3Npb24ucmlnaHRcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBleHRyYToge1xuICAgICAgICAgICAgICAgIHR5cGU6IFR5cGVzLk5VTUJFUlxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgdmFyIGhhbmRsZUNvbmRpdGlvbmFsRXhwcmVzc2lvbiA9IGZ1bmN0aW9uKG5vZGUsIHN0YXRlLCByb290LCBjYikge1xuICAgICAgICB2YXIgY29uc2VxdWVudCA9IEFOTk8obm9kZS5jb25zZXF1ZW50KTtcbiAgICAgICAgdmFyIGFsdGVybmF0ZSA9IEFOTk8obm9kZS5hbHRlcm5hdGUpO1xuICAgICAgICBpZiAoY29uc2VxdWVudC5jYW5FbGltaW5hdGUoKSB8fCBhbHRlcm5hdGUuY2FuRWxpbWluYXRlKCkpIHtcbiAgICAgICAgICAgIC8vIEluIHRoaXMgY2FzZSwgd2UgcmVwbGFjZSB0aGUgd2hvbGUgY29uZGl0aW9uYWwgZXhwcmVzc2lvbiBieSB0aGVcbiAgICAgICAgICAgIC8vIHJlc3VsdGluZyBleHByZXNzaW9uLiBXZSBoYXZlIHRvIGRvIHRoZSB0cmF2ZXJzYWwgbWFudWFsbHkgYW5kIHNraXAgdGhlXG4gICAgICAgICAgICAvLyBzdWJ0cmVlIGZvciB0aGUgcGFyZW50IHRyYXZlcnNhbC5cbiAgICAgICAgICAgIGNiKFZpc2l0b3JPcHRpb24uU2tpcCk7XG4gICAgICAgICAgICByZXR1cm4gcm9vdC5yZXBsYWNlKGNvbnNlcXVlbnQuY2FuRWxpbWluYXRlKCkgPyBub2RlLmFsdGVybmF0ZSA6IG5vZGUuY29uc2VxdWVudCAsIHN0YXRlKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHZhciBoYW5kbGVJZlN0YXRlbWVudCA9IGZ1bmN0aW9uIChub2RlKSB7XG4gICAgICAgIHZhciBjb25zZXF1ZW50ID0gQU5OTyhub2RlLmNvbnNlcXVlbnQpO1xuICAgICAgICB2YXIgYWx0ZXJuYXRlID0gbm9kZS5hbHRlcm5hdGUgPyBBTk5PKG5vZGUuYWx0ZXJuYXRlKSA6IG51bGw7XG4gICAgICAgIGlmIChjb25zZXF1ZW50LmNhbkVsaW1pbmF0ZSgpKSB7XG4gICAgICAgICAgICBpZiAoYWx0ZXJuYXRlKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG5vZGUuYWx0ZXJuYXRlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICB0eXBlOiBTeW50YXguRW1wdHlTdGF0ZW1lbnRcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmIChhbHRlcm5hdGUgJiYgYWx0ZXJuYXRlLmNhbkVsaW1pbmF0ZSgpKSB7XG4gICAgICAgICAgICByZXR1cm4gbm9kZS5jb25zZXF1ZW50O1xuICAgICAgICB9XG4gICAgICAgIC8vIFdlIHN0aWxsIGhhdmUgYSByZWFsIGlmIHN0YXRlbWVudFxuICAgICAgIHZhciB0ZXN0ID0gQU5OTyhub2RlLnRlc3QpO1xuICAgICAgIHN3aXRjaCh0ZXN0LmdldFR5cGUoKSkge1xuICAgICAgICAgICBjYXNlIFR5cGVzLklOVDpcbiAgICAgICAgICAgY2FzZSBUeXBlcy5OVU1CRVI6XG4gICAgICAgICAgICAgICBub2RlLnRlc3QgPSB7XG4gICAgICAgICAgICAgICAgICAgdHlwZTogU3ludGF4LkJpbmFyeUV4cHJlc3Npb24sXG4gICAgICAgICAgICAgICAgICAgb3BlcmF0b3I6IFwiIT1cIixcbiAgICAgICAgICAgICAgICAgICBsZWZ0OiBub2RlLnRlc3QsXG4gICAgICAgICAgICAgICAgICAgcmlnaHQ6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogU3ludGF4LkxpdGVyYWwsXG4gICAgICAgICAgICAgICAgICAgICAgIHZhbHVlOiAwLFxuICAgICAgICAgICAgICAgICAgICAgICBleHRyYToge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogdGVzdC5nZXRUeXBlKClcbiAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgIH1cbiAgICAgICB9XG5cblxuICAgIH07XG5cbiAgICB2YXIgaGFuZGxlRW50ZXJMb2dpY2FsRXhwcmVzc2lvbiA9IGZ1bmN0aW9uIChub2RlLCByb290LCBzdGF0ZSkge1xuICAgICAgICB2YXIgbGVmdCA9IEFOTk8obm9kZS5sZWZ0KTtcbiAgICAgICAgdmFyIHJpZ2h0ID0gQU5OTyhub2RlLnJpZ2h0KTtcbiAgICAgICAgaWYgKGxlZnQuY2FuRWxpbWluYXRlKCkpXG4gICAgICAgICAgICByZXR1cm4gcm9vdC5yZXBsYWNlKG5vZGUucmlnaHQsIHN0YXRlKTtcbiAgICAgICAgaWYgKHJpZ2h0LmNhbkVsaW1pbmF0ZSgpKVxuICAgICAgICAgICAgcmV0dXJuIHJvb3QucmVwbGFjZShub2RlLmxlZnQsIHN0YXRlKTtcbiAgICB9XG5cbiAgICB2YXIgaGFuZGxlRXhpdExvZ2ljYWxFeHByZXNzaW9uID0gZnVuY3Rpb24obm9kZSwgcm9vdCwgc3RhdGUpIHtcbiAgICAgICAgdmFyIGxlZnQgPSBBTk5PKG5vZGUubGVmdCk7XG4gICAgICAgIHZhciByaWdodCA9IEFOTk8obm9kZS5yaWdodCk7XG5cbiAgICAgICAgaWYgKGxlZnQuaXNCb29sKCkgJiYgcmlnaHQuaXNCb29sKCkpIHtcbiAgICAgICAgICAgIC8vIEV2ZXJ5dGhpbmcgaXMgb2theSwgbm8gbmVlZCB0byBtb2RpZnkgYW55dGhpbmdcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIE5vdyB3ZSBoYXZlIHRvIGltcGxlbWVudCB0aGUgSlMgYm9vbGVhbiBzZW1hbnRpYyBmb3IgR0xTTFxuICAgICAgICBpZiAobGVmdC5jYW5OdW1iZXIoKSkge1xuICAgICAgICAgICAgdmFyIHRlc3QgPSAgbm9kZS5sZWZ0O1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICB0eXBlOiBTeW50YXguQ29uZGl0aW9uYWxFeHByZXNzaW9uLFxuICAgICAgICAgICAgICAgIHRlc3Q6IHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogU3ludGF4LkJpbmFyeUV4cHJlc3Npb24sXG4gICAgICAgICAgICAgICAgICAgIG9wZXJhdG9yOiBcIj09XCIsXG4gICAgICAgICAgICAgICAgICAgIGxlZnQ6IHRlc3QsXG4gICAgICAgICAgICAgICAgICAgIHJpZ2h0OiB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiBTeW50YXguTGl0ZXJhbCxcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlOiBsZWZ0LmlzTnVtYmVyKCkgPyAwLjAgOiBsZWZ0LmlzSW50KCkgPyAwIDogXCJmYWxzZVwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgZXh0cmE6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlIDogbGVmdC5nZXRUeXBlKCksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RhdGljVmFsdWU6IGxlZnQuaXNOdW1iZXIoKSA/IDAuMCA6IGxlZnQuaXNJbnQoKSA/IDAgOiBcImZhbHNlXCJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgZXh0cmE6IHsgdHlwZTogVHlwZXMuQk9PTEVBTiB9XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBjb25zZXF1ZW50OiBub2RlLnJpZ2h0LFxuICAgICAgICAgICAgICAgIGFsdGVybmF0ZTogdGVzdFxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG5cbiAgICAvLyBFeHBvcnRzXG4gICAgbnMuR0xBU1RUcmFuc2Zvcm1lciA9IEdMQVNUVHJhbnNmb3JtZXI7XG5cblxufShleHBvcnRzKSk7XG4iLCIoZnVuY3Rpb24gKG5zKSB7XG4gICAgdmFyIEJhc2UgPSByZXF1aXJlKFwiLi9iYXNlL2luZGV4LmpzXCIpO1xuICAgIC8qKlxuICAgICAqIEBlbnVtIHtzdHJpbmd9XG4gICAgICovXG4gICAgbnMuVFlQRVMgPSB7XG4gICAgICAgIEFOWTogXCJhbnlcIixcbiAgICAgICAgSU5UOiBcImludFwiLFxuICAgICAgICBOVU1CRVI6IFwibnVtYmVyXCIsXG4gICAgICAgIEJPT0xFQU46IFwiYm9vbGVhblwiLFxuICAgICAgICBPQkpFQ1Q6IFwib2JqZWN0XCIsXG4gICAgICAgIEFSUkFZOiBcImFycmF5XCIsXG4gICAgICAgIE5VTEw6IFwibnVsbFwiLFxuICAgICAgICBVTkRFRklORUQ6IFwidW5kZWZpbmVkXCIsXG4gICAgICAgIEZVTkNUSU9OOiBcImZ1bmN0aW9uXCIsXG4gICAgICAgIFNUUklORzogXCJzdHJpbmdcIlxuICAgIH1cblxuICAgIG5zLk9CSkVDVF9LSU5EUyA9IHtcbiAgICAgICAgQU5ZOiBcImFueVwiLFxuICAgICAgICBGTE9BVDI6IFwiZmxvYXQyXCIsIC8vIHZpcnR1YWwga2luZHNcbiAgICAgICAgRkxPQVQzOiBcImZsb2F0M1wiLCAvLyB2aXJ0dWFsIGtpbmRzXG4gICAgICAgIEZMT0FUNDogXCJmbG9hdDRcIiwgLy8gdmlydHVhbCBraW5kc1xuICAgICAgICBOT1JNQUw6IFwibm9ybWFsXCIsXG4gICAgICAgIE1BVFJJWDM6IFwibWF0cml4M1wiLFxuICAgICAgICBNQVRSSVg0OiBcIm1hdHJpeDRcIixcbiAgICAgICAgVEVYVFVSRTogXCJ0ZXh0dXJlXCIsXG4gICAgICAgIENPTE9SX0NMT1NVUkU6IFwiY29sb3JfY2xvc3VyZVwiXG4gICAgfVxuXG4gICAgbnMuU09VUkNFUyA9IHtcbiAgICAgICAgVU5JRk9STTogXCJ1bmlmb3JtXCIsXG4gICAgICAgIFZFUlRFWDogXCJ2ZXJ0ZXhcIixcbiAgICAgICAgQ09OU1RBTlQ6IFwiY29uc3RhbnRcIlxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGNvbnN0cnVjdEZyb21NYXRyaXgoZGVzdCwgbWF0U2l6ZSwgYXJncyl7XG4gICAgICAgIGlmKGFyZ3MubGVuZ3RoID4gMSl7XG4gICAgICAgICAgICBmb3IodmFyIGkgPSAwOyBpIDwgYXJncy5sZW5ndGg7ICsraSl7XG4gICAgICAgICAgICAgICAgaWYoYXJnc1tpXSBpbnN0YW5jZW9mIE1hdDMgfHwgYXJnc1tpXSBpbnN0YW5jZW9mIE1hdDQpXG4gICAgICAgICAgICAgICAgICAgIHRocm93IFwiQ29uc3RydWN0aW5nIE1hdHJpeCBmcm9tIE1hdHJpeCBjYW4gb25seSB0YWtlIG9uZSBhcmd1bWVudFwiO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmKGFyZ3MubGVuZ3RoIDwgMSlcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgaWYoYXJncy5sZW5ndGggPT0gMSl7XG4gICAgICAgICAgICB2YXIgc3JjTWF0ID0gYXJnc1swXTtcbiAgICAgICAgICAgIHZhciBzcmNTaXplID0gMDtcblxuICAgICAgICAgICAgaWYoc3JjTWF0IGluc3RhbmNlb2YgTWF0Mykgc3JjU2l6ZSA9IDM7XG4gICAgICAgICAgICBlbHNlIGlmKHNyY01hdCBpbnN0YW5jZW9mIE1hdDQpIHNyY1NpemUgPSA0O1xuICAgICAgICAgICAgZWxzZSByZXR1cm4gZmFsc2U7XG5cbiAgICAgICAgICAgIGZvcih2YXIgeSA9IDA7IHkgPCBtYXRTaXplOyB5KyspXG4gICAgICAgICAgICAgICAgZm9yKHZhciB4ID0gMDsgeCA8IG1hdFNpemU7IHgrKyl7XG4gICAgICAgICAgICAgICAgICAgIHZhciBkZXN0SWR4ID0geSptYXRTaXplICsgeDtcbiAgICAgICAgICAgICAgICAgICAgaWYoeCA8IHNyY1NpemUgJiYgeSA8IHNyY1NpemUpe1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHNyY0lkeCA9IHkqc3JjU2l6ZSArIHg7XG4gICAgICAgICAgICAgICAgICAgICAgICBkZXN0W2Rlc3RJZHhdID0gc3JjTWF0W3NyY0lkeF07XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZWxzZSBkZXN0W2Rlc3RJZHhdID0geCA9PSB5ID8gMSA6IDA7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cblxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGZpbGxWZWN0b3IoZGVzdCwgdmVjU2l6ZSwgYXJndW1lbnRzKXtcbiAgICAgICAgdmFyIGNvbG9yID0gZmFsc2U7XG4gICAgICAgIGlmKGFyZ3VtZW50cy5sZW5ndGggPT0gMCApe1xuICAgICAgICAgICAgZm9yKHZhciBpID0gMDsgaSA8IHZlY1NpemU7ICsraSlcbiAgICAgICAgICAgICAgICBkZXN0W2ldID0gMDtcbiAgICAgICAgICAgIGlmKGNvbG9yKSBkZXN0WzNdID0gMTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBpZihhcmd1bWVudHMubGVuZ3RoID09IDEgJiYgIWlzTmFOKGFyZ3VtZW50c1swXSkpe1xuICAgICAgICAgICAgZm9yKHZhciBpID0gMDsgaSA8IHZlY1NpemU7ICsraSlcbiAgICAgICAgICAgICAgICBkZXN0W2ldID0gYXJndW1lbnRzWzBdO1xuICAgICAgICAgICAgaWYoY29sb3IpIGRlc3RbM10gPSAxO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIGlkeCA9IDA7XG4gICAgICAgIGZvcih2YXIgaSA9IDA7IGlkeCA8IHZlY1NpemUgJiYgaSA8IGFyZ3VtZW50cy5sZW5ndGg7ICsraSl7XG4gICAgICAgICAgICB2YXIgYXJnPSBhcmd1bWVudHNbaV0sIGNudCA9IDE7XG4gICAgICAgICAgICBpZihhcmcgaW5zdGFuY2VvZiBWZWMyKSBjbnQgPSAyO1xuICAgICAgICAgICAgZWxzZSBpZihhcmcgaW5zdGFuY2VvZiBWZWMzKSBjbnQgPSAzO1xuICAgICAgICAgICAgZWxzZSBpZihhcmcgaW5zdGFuY2VvZiBWZWM0KSBjbnQgPSA0O1xuICAgICAgICAgICAgZWxzZSBpZihhcmcgaW5zdGFuY2VvZiBNYXQzKSBjbnQgPSA5O1xuICAgICAgICAgICAgZWxzZSBpZihhcmcgaW5zdGFuY2VvZiBNYXQ0KSBjbnQgPSAxNjtcblxuICAgICAgICAgICAgaWYoY250ID09IDEpXG4gICAgICAgICAgICAgICAgZGVzdFtpZHgrK10gPSBhcmcgfHwgMDtcbiAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgICBmb3IodmFyIGogPSAwOyBpZHggPCB2ZWNTaXplICYmIGogPCBjbnQ7ICsrail7XG4gICAgICAgICAgICAgICAgICAgIGRlc3RbaWR4KytdID0gYXJnW2pdO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZihpIDwgYXJndW1lbnRzLmxlbmd0aClcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIlRvbyBtYW55IGFyZ3VtZW50cyBmb3IgXCIgKyAoY29sb3IgPyBcIkNvbG9yXCIgOiBcIlZlY1wiICsgdmVjU2l6ZSkgKyBcIi5cIik7XG4gICAgICAgIGlmKGlkeCA8IHZlY1NpemUpe1xuICAgICAgICAgICAgaWYoY29sb3IgJiYgKGlkeCA9PSAzKSlcbiAgICAgICAgICAgICAgICBkZXN0WzNdID0gMTtcbiAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJOb3QgZW5vdWdoIGFyZ3VtZW50cyBmb3IgXCIgKyAoY29sb3IgPyBcIkNvbG9yXCIgOiBcIlZlY1wiICsgdmVjU2l6ZSkgKyBcIi5cIik7XG4gICAgICAgIH1cbiAgICB9XG5cblxuICAgIC8vIFRPRE86IEdlbmVyYXRlIFN3aXp6bGUgZnVuY3Rpb25zXG4gICAgdmFyIFNXSVpaTEVfS0VZUyA9IFtcbiAgICAgICAgWyd4JywneScsJ3onLCd3J10sXG4gICAgICAgIFsncicsICdnJywgJ2InLCAnYSddLFxuICAgICAgICBbJ3MnLCAndCcsICdwJywgJ3EnXVxuICAgIF1cblxuICAgIGZ1bmN0aW9uIGFkZFN3aXp6bGVzKHByb3RvdHlwZSwgdmVjQ291bnQsIG1hc2tDb3VudCwgd2l0aFNldHRlcil7XG4gICAgICAgIHZhciBtYXggPSBNYXRoLnBvdyh2ZWNDb3VudCwgbWFza0NvdW50KTtcbiAgICAgICAgZm9yKHZhciBpID0gMDsgaSA8IG1heDsgKytpKXtcbiAgICAgICAgICAgIHZhciBpbmRpY2VzID0gW10sIGtleXMgPSBbXCJcIiwgXCJcIiwgXCJcIl0sIHZhbCA9IGksIGFyZ3MgPSBbXTtcbiAgICAgICAgICAgIHZhciBzZXR0ZXJBcmdzID0gW10sIGdlbmVyYXRlU2V0dGVyID0gd2l0aFNldHRlcjtcbiAgICAgICAgICAgIGZvcih2YXIgaiA9IDA7IGogPCBtYXNrQ291bnQ7ICsrail7XG4gICAgICAgICAgICAgICAgdmFyIGlkeCA9IHZhbCAlIHZlY0NvdW50O1xuICAgICAgICAgICAgICAgIGluZGljZXMucHVzaChpZHgpO1xuICAgICAgICAgICAgICAgIGlmKGdlbmVyYXRlU2V0dGVyKXtcbiAgICAgICAgICAgICAgICAgICAgaWYoc2V0dGVyQXJnc1tpZHhdID09PSB1bmRlZmluZWQpXG4gICAgICAgICAgICAgICAgICAgICAgICBzZXR0ZXJBcmdzW2lkeF0gPSAnb3RoZXJbJyArIGogKyAnXSc7XG4gICAgICAgICAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgICAgICAgICAgIGdlbmVyYXRlU2V0dGVyID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGZvcih2YXIgayA9IDA7IGsgPCBTV0laWkxFX0tFWVMubGVuZ3RoOyArK2spe1xuICAgICAgICAgICAgICAgICAgICBrZXlzW2tdICs9IFNXSVpaTEVfS0VZU1trXVtpZHhdO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB2YWwgPSBNYXRoLmZsb29yKHZhbCAvIHZlY0NvdW50KTtcbiAgICAgICAgICAgICAgICBhcmdzLnB1c2goJ3RoaXNbJysgaWR4ICsgJ10nICk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHZhciBmdW5jQXJncyA9IFwiXCI7XG4gICAgICAgICAgICB2YXIgYm9keSA9ICcgIHJldHVybiBnZXRWZWMnICsgbWFza0NvdW50ICsgJy5hcHBseShudWxsLCBhcmd1bWVudHMpO1xcbic7XG4gICAgICAgICAgICBpZihnZW5lcmF0ZVNldHRlcil7XG4gICAgICAgICAgICAgICAgZm9yKHZhciBqID0gMDsgaiA8IHZlY0NvdW50OyArK2ope1xuICAgICAgICAgICAgICAgICAgICBpZihzZXR0ZXJBcmdzW2pdID09PSB1bmRlZmluZWQpXG4gICAgICAgICAgICAgICAgICAgICAgICBzZXR0ZXJBcmdzW2pdID0gJ3RoaXNbJyArIGogKyAnXSc7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHN3aXRjaChtYXNrQ291bnQpe1xuICAgICAgICAgICAgICAgICAgICBjYXNlIDIgOiBmdW5jQXJncyA9IFwieCwgeVwiOyBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAzIDogZnVuY0FyZ3MgPSBcIngsIHksIHpcIjsgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgNCA6IGZ1bmNBcmdzID0gXCJ4LCB5LCB6LCB3XCI7IGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGJvZHkgPSBcIiAgaWYoYXJndW1lbnRzLmxlbmd0aCA9PSAwKVxcbiAgXCIgKyBib2R5ICtcbiAgICAgICAgICAgICAgICAgICAgICAgXCIgIGVsc2V7XFxuXCIgK1xuICAgICAgICAgICAgICAgICAgICAgICBcIiAgICB2YXIgb3RoZXI9Z2V0VmVjXCIgKyBtYXNrQ291bnQgKyAnLmFwcGx5KG51bGwsIGFyZ3VtZW50cyk7XFxuJyArXG4gICAgICAgICAgICAgICAgICAgICAgIFwiICAgIHJldHVybiBnZXRWZWNcIiArIHZlY0NvdW50ICsgJygnICsgc2V0dGVyQXJncy5qb2luKFwiLCBcIikgKyAnKTtcXG4nICtcbiAgICAgICAgICAgICAgICAgICAgICAgXCIgIH1cXG5cIjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZhciBmdW5jdGlvbkNvZGUgPSAnZnVuY3Rpb24oJyArIGZ1bmNBcmdzICsgICcpe1xcbicgKyBib2R5ICsgJ30nO1xuICAgICAgICAgICAgdHJ5e1xuICAgICAgICAgICAgICAgIHZhciByZXN1bHQgPSBldmFsKFwiKFwiICsgZnVuY3Rpb25Db2RlICsgXCIpXCIpO1xuICAgICAgICAgICAgICAgIGZvcih2YXIgaiA9IDA7IGogPCBrZXlzLmxlbmd0aDsgKytqKVxuICAgICAgICAgICAgICAgICAgICBwcm90b3R5cGVba2V5c1tqXV0gPSByZXN1bHQ7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjYXRjaChlKXtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKFwiRXJyb3IgQ29tcGlsaW5nIENvZGU6XFxuXCIgKyBmdW5jdGlvbkNvZGUpO1xuICAgICAgICAgICAgICAgIHRocm93IGU7XG5cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuXG4gICAgLyoqXG4gICAgKiBUaGUgdmlydHVhbCBWZWMyIHR5cGVcbiAgICAqIEBjb25zdHJ1Y3RvclxuICAgICovXG4gICAgdmFyIFZlYzIgPSBmdW5jdGlvbih4LCB5KSB7XG4gICAgICAgIGZpbGxWZWN0b3IodGhpcywgMiwgYXJndW1lbnRzKTtcbiAgICB9XG5cblxuICAgIGZ1bmN0aW9uIGdldFZlYzIoKSB7XG4gICAgICAgIGlmKGFyZ3VtZW50c1swXSBpbnN0YW5jZW9mIFZlYzIpXG4gICAgICAgICAgICByZXR1cm4gYXJndW1lbnRzWzBdO1xuICAgICAgICB2YXIgb2JqID0gbmV3IFZlYzIoKTtcbiAgICAgICAgVmVjMi5hcHBseShvYmosIGFyZ3VtZW50cyk7XG4gICAgICAgIHJldHVybiBvYmo7XG4gICAgfVxuXG4gICAgVmVjMi5wcm90b3R5cGUuYWRkID0gZnVuY3Rpb24oeCwgeSkgeyAvLyAwIGFyZ3VtZW50cyA9PiBpZGVudGl0eSBvciBlcnJvcj9cbiAgICAgICAgdmFyIGFkZCA9IGdldFZlYzIuYXBwbHkobnVsbCwgYXJndW1lbnRzKTtcbiAgICAgICAgcmV0dXJuIG5ldyBWZWMyKHRoaXNbMF0gKyBhZGRbMF0sIHRoaXNbMV0gKyBhZGRbMV0pO1xuICAgIH1cbiAgICBWZWMyLnByb3RvdHlwZS5zdWIgPSBmdW5jdGlvbih4LCB5KSB7XG4gICAgICAgIHZhciBzdWIgPSBnZXRWZWMyLmFwcGx5KG51bGwsIGFyZ3VtZW50cyk7XG4gICAgICAgIHJldHVybiBuZXcgVmVjMih0aGlzWzBdIC0gc3ViWzBdLCB0aGlzWzFdIC0gc3ViWzFdKTtcbiAgICB9XG4gICAgVmVjMi5wcm90b3R5cGUubXVsID0gZnVuY3Rpb24oeCwgeSkge1xuICAgICAgICB2YXIgb3RoZXIgPSBnZXRWZWMyLmFwcGx5KG51bGwsIGFyZ3VtZW50cyk7XG4gICAgICAgIHJldHVybiBuZXcgVmVjMih0aGlzWzBdICogb3RoZXJbMF0sIHRoaXNbMV0gKiBvdGhlclsxXSk7XG4gICAgfVxuICAgIFZlYzIucHJvdG90eXBlLmRpdiA9IGZ1bmN0aW9uKHgsIHkpIHtcbiAgICAgICAgdmFyIG90aGVyID0gZ2V0VmVjMi5hcHBseShudWxsLCBhcmd1bWVudHMpO1xuICAgICAgICByZXR1cm4gbmV3IFZlYzIodGhpc1swXSAvIG90aGVyWzBdLCB0aGlzWzFdIC8gb3RoZXJbMV0pO1xuICAgIH1cbiAgICBWZWMyLnByb3RvdHlwZS5tb2QgPSBmdW5jdGlvbih4LCB5KSB7XG4gICAgICAgIHZhciBvdGhlciA9IGdldFZlYzIuYXBwbHkobnVsbCwgYXJndW1lbnRzKTtcbiAgICAgICAgcmV0dXJuIG5ldyBWZWMyKHRoaXNbMF0gJSBvdGhlclswXSwgdGhpc1sxXSAlIG90aGVyWzFdKTtcbiAgICB9XG4gICAgVmVjMi5wcm90b3R5cGUuZG90ID0gZnVuY3Rpb24oeCwgeSkge1xuICAgICAgICB2YXIgb3RoZXIgPSBnZXRWZWMyLmFwcGx5KG51bGwsIGFyZ3VtZW50cyk7XG4gICAgICAgIHJldHVybiB0aGlzWzBdICogb3RoZXJbMF0gKyB0aGlzWzFdICogb3RoZXJbMV07XG4gICAgfVxuICAgIFZlYzIucHJvdG90eXBlLmFicyA9IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gbmV3IFZlYzIoTWF0aC5hYnModGhpc1swXSksIE1hdGguYWJzKHRoaXNbMV0pKTtcbiAgICB9XG4gICAgVmVjMi5wcm90b3R5cGUubGVuZ3RoID0gZnVuY3Rpb24obGVuZ3RoKSB7XG4gICAgICAgIGlmKGFyZ3VtZW50cy5sZW5ndGggPT0gMClcbiAgICAgICAgICAgIHJldHVybiBNYXRoLnNxcnQodGhpcy5kb3QodGhpcykpO1xuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLm11bChsZW5ndGggLyB0aGlzLmxlbmd0aCgpKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBWZWMyLnByb3RvdHlwZS5ub3JtYWxpemUgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMubGVuZ3RoKDEpO1xuICAgIH1cblxuICAgIFZlYzIucHJvdG90eXBlLnh5ID0gVmVjMi5wcm90b3R5cGUucmcgPSBWZWMyLnByb3RvdHlwZS5zdCA9IGZ1bmN0aW9uKHgsIHkpIHtcbiAgICAgICAgaWYoYXJndW1lbnRzLmxlbmd0aCA9PSAwKVxuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIGdldFZlYzIuYXBwbHkobnVsbCwgYXJndW1lbnRzKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBWZWMyLnByb3RvdHlwZS54ID0gVmVjMi5wcm90b3R5cGUuciA9IFZlYzIucHJvdG90eXBlLnMgPSBmdW5jdGlvbih4KSB7XG4gICAgICAgIGlmKGFyZ3VtZW50cy5sZW5ndGggPT0gMClcbiAgICAgICAgICAgIHJldHVybiB0aGlzWzBdO1xuICAgICAgICBlbHNlXG4gICAgICAgICAgICByZXR1cm4gdGhpcy54eSh4LCB0aGlzWzFdKTtcbiAgICB9XG4gICAgVmVjMi5wcm90b3R5cGUueSA9IFZlYzIucHJvdG90eXBlLmcgPSBWZWMyLnByb3RvdHlwZS50ID0gZnVuY3Rpb24oeSkge1xuICAgICAgICBpZihhcmd1bWVudHMubGVuZ3RoID09IDApXG4gICAgICAgICAgICByZXR1cm4gdGhpc1sxXTtcbiAgICAgICAgZWxzZVxuICAgICAgICAgICAgcmV0dXJuIHRoaXMueHkodGhpc1swXSwgeSk7XG4gICAgfVxuXG4gICAgYWRkU3dpenpsZXMoVmVjMi5wcm90b3R5cGUsIDIsIDIsIHRydWUpO1xuICAgIGFkZFN3aXp6bGVzKFZlYzIucHJvdG90eXBlLCAyLCAzLCBmYWxzZSk7XG4gICAgYWRkU3dpenpsZXMoVmVjMi5wcm90b3R5cGUsIDIsIDQsIGZhbHNlKTtcblxuXG4gICAgLyoqXG4gICAgICogVGhlIHZpcnR1YWwgVmVjMyB0eXBlXG4gICAgICogQGNvbnN0cnVjdG9yXG4gICAgICovXG4gICAgdmFyIFZlYzMgPSBmdW5jdGlvbih4LCB5LCB6KSB7XG4gICAgICAgIGZpbGxWZWN0b3IodGhpcywgMywgYXJndW1lbnRzKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBnZXRWZWMzKCkge1xuICAgICAgICBpZihhcmd1bWVudHNbMF0gaW5zdGFuY2VvZiBWZWMzKVxuICAgICAgICAgICAgcmV0dXJuIGFyZ3VtZW50c1swXTtcbiAgICAgICAgdmFyIG9iaiA9IG5ldyBWZWMzKCk7XG4gICAgICAgIFZlYzMuYXBwbHkob2JqLCBhcmd1bWVudHMpO1xuICAgICAgICByZXR1cm4gb2JqO1xuICAgIH1cblxuICAgIFZlYzMucHJvdG90eXBlLmFkZCA9IGZ1bmN0aW9uKHgsIHksIHopIHtcbiAgICAgICAgdmFyIG90aGVyID0gZ2V0VmVjMy5hcHBseShudWxsLCBhcmd1bWVudHMpO1xuICAgICAgICByZXR1cm4gbmV3IFZlYzModGhpc1swXSArIG90aGVyWzBdLCB0aGlzWzFdICsgb3RoZXJbMV0sIHRoaXNbMl0gKyBvdGhlclsyXSk7XG4gICAgfVxuICAgIFZlYzMucHJvdG90eXBlLnN1YiA9IGZ1bmN0aW9uKHgsIHksIHopIHtcbiAgICAgICAgdmFyIG90aGVyID0gZ2V0VmVjMy5hcHBseShudWxsLCBhcmd1bWVudHMpO1xuICAgICAgICByZXR1cm4gbmV3IFZlYzModGhpc1swXSAtIG90aGVyWzBdLCB0aGlzWzFdIC0gb3RoZXJbMV0sIHRoaXNbMl0gLSBvdGhlclsyXSk7XG4gICAgfVxuICAgIFZlYzMucHJvdG90eXBlLm11bCA9IGZ1bmN0aW9uKHgsIHksIHopIHtcbiAgICAgICAgdmFyIG90aGVyID0gZ2V0VmVjMy5hcHBseShudWxsLCBhcmd1bWVudHMpO1xuICAgICAgICByZXR1cm4gbmV3IFZlYzModGhpc1swXSAqIG90aGVyWzBdLCB0aGlzWzFdICogb3RoZXJbMV0sIHRoaXNbMl0gKiBvdGhlclsyXSk7XG4gICAgfVxuICAgIFZlYzMucHJvdG90eXBlLmRpdiA9IGZ1bmN0aW9uKHgsIHksIHopIHtcbiAgICAgICAgdmFyIG90aGVyID0gZ2V0VmVjMy5hcHBseShudWxsLCBhcmd1bWVudHMpO1xuICAgICAgICByZXR1cm4gbmV3IFZlYzModGhpc1swXSAvIG90aGVyWzBdLCB0aGlzWzFdIC8gb3RoZXJbMV0sIHRoaXNbMl0gLyBvdGhlclsyXSk7XG4gICAgfVxuICAgIFZlYzMucHJvdG90eXBlLm1vZCA9IGZ1bmN0aW9uKHgsIHksIHopIHtcbiAgICAgICAgdmFyIG90aGVyID0gZ2V0VmVjMy5hcHBseShudWxsLCBhcmd1bWVudHMpO1xuICAgICAgICByZXR1cm4gbmV3IFZlYzModGhpc1swXSAlIG90aGVyWzBdLCB0aGlzWzFdICUgb3RoZXJbMV0sIHRoaXNbMl0gJSBvdGhlclsyXSk7XG4gICAgfVxuICAgIFZlYzMucHJvdG90eXBlLmFicyA9IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gbmV3IFZlYzMoTWF0aC5hYnModGhpc1swXSksIE1hdGguYWJzKHRoaXNbMV0pLCBNYXRoLmFicyh0aGlzWzJdKSk7XG4gICAgfVxuICAgIFZlYzMucHJvdG90eXBlLmRvdCA9IGZ1bmN0aW9uKHgsIHksIHopIHtcbiAgICAgICAgdmFyIG90aGVyID0gZ2V0VmVjMy5hcHBseShudWxsLCBhcmd1bWVudHMpO1xuICAgICAgICByZXR1cm4gdGhpc1swXSAqIG90aGVyWzBdICsgdGhpc1sxXSAqIG90aGVyWzFdICsgdGhpc1syXSAqIG90aGVyWzJdO1xuICAgIH1cbiAgICBWZWMzLnByb3RvdHlwZS5jcm9zcyA9IGZ1bmN0aW9uKHgsIHksIHopIHtcbiAgICAgICAgdmFyIG90aGVyID0gZ2V0VmVjMy5hcHBseShudWxsLCBhcmd1bWVudHMpO1xuICAgICAgICB2YXIgeCA9IHRoaXNbMV0gKiBvdGhlclsyXSAtIG90aGVyWzFdICogdGhpc1syXTtcbiAgICAgICAgdmFyIHkgPSB0aGlzWzJdICogb3RoZXJbMF0gLSBvdGhlclsyXSAqIHRoaXNbMF07XG4gICAgICAgIHZhciB6ID0gdGhpc1swXSAqIG90aGVyWzFdIC0gb3RoZXJbMF0gKiB0aGlzWzFdO1xuICAgICAgICByZXR1cm4gbmV3IFZlYzMoeCwgeSwgeik7XG4gICAgfVxuICAgIFZlYzMucHJvdG90eXBlLmxlbmd0aCA9IGZ1bmN0aW9uKGxlbmd0aCkge1xuICAgICAgICBpZihhcmd1bWVudHMubGVuZ3RoID09IDApXG4gICAgICAgICAgICByZXR1cm4gTWF0aC5zcXJ0KHRoaXMuZG90KHRoaXMpKTtcbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5tdWwobGVuZ3RoIC8gdGhpcy5sZW5ndGgoKSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgVmVjMy5wcm90b3R5cGUubm9ybWFsaXplID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmxlbmd0aCgxKTtcbiAgICB9XG4gICAgVmVjMy5wcm90b3R5cGUueHl6ID0gVmVjMy5wcm90b3R5cGUucmdiID0gVmVjMy5wcm90b3R5cGUuc3RwID0gZnVuY3Rpb24oeCwgeSwgeikge1xuICAgICAgICBpZihhcmd1bWVudHMubGVuZ3RoID09IDApXG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgZWxzZVxuICAgICAgICAgICAgcmV0dXJuIG5ldyBWZWMzKHgsIHksIHopO1xuICAgIH1cbiAgICBWZWMzLnByb3RvdHlwZS54ID0gVmVjMy5wcm90b3R5cGUuciA9IFZlYzMucHJvdG90eXBlLnMgPSBmdW5jdGlvbih4KSB7XG4gICAgICAgIGlmKGFyZ3VtZW50cy5sZW5ndGggPT0gMClcbiAgICAgICAgICAgIHJldHVybiB0aGlzWzBdO1xuICAgICAgICBlbHNlXG4gICAgICAgICAgICByZXR1cm4gbmV3IFZlYzMoeCwgdGhpc1sxXSwgdGhpc1syXSk7XG4gICAgfVxuICAgIFZlYzMucHJvdG90eXBlLnkgPSBWZWMzLnByb3RvdHlwZS5nID0gVmVjMy5wcm90b3R5cGUudCA9IGZ1bmN0aW9uKHkpIHtcbiAgICAgICAgaWYoYXJndW1lbnRzLmxlbmd0aCA9PSAwKVxuICAgICAgICAgICAgcmV0dXJuIHRoaXNbMV07XG4gICAgICAgIGVsc2VcbiAgICAgICAgICAgIHJldHVybiBuZXcgVmVjMyh0aGlzWzBdLCB5LCB0aGlzWzJdKTtcbiAgICB9XG4gICAgVmVjMy5wcm90b3R5cGUueiA9IFZlYzMucHJvdG90eXBlLmIgPSBWZWMzLnByb3RvdHlwZS5wID0gZnVuY3Rpb24oeikge1xuICAgICAgICBpZihhcmd1bWVudHMubGVuZ3RoID09IDApXG4gICAgICAgICAgICByZXR1cm4gdGhpc1syXTtcbiAgICAgICAgZWxzZVxuICAgICAgICAgICAgcmV0dXJuIG5ldyBWZWMzKHRoaXNbMF0sIHRoaXNbMV0sIHopO1xuICAgIH1cbiAgICBhZGRTd2l6emxlcyhWZWMzLnByb3RvdHlwZSwgMywgMiwgdHJ1ZSk7XG4gICAgYWRkU3dpenpsZXMoVmVjMy5wcm90b3R5cGUsIDMsIDMsIHRydWUpO1xuICAgIGFkZFN3aXp6bGVzKFZlYzMucHJvdG90eXBlLCAzLCA0LCBmYWxzZSk7XG5cblxuICAgIC8qKlxuICAgICAqIFRoZSB2aXJ0dWFsIFZlYzQgdHlwZVxuICAgICAqIEBjb25zdHJ1Y3RvclxuICAgICAqL1xuICAgIHZhciBWZWM0ID0gZnVuY3Rpb24oeCwgeSwgeiwgdykge1xuICAgICAgICBmaWxsVmVjdG9yKHRoaXMsIDQsIGFyZ3VtZW50cylcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBnZXRWZWM0KCkge1xuICAgICAgICBpZihhcmd1bWVudHNbMF0gaW5zdGFuY2VvZiBWZWM0KVxuICAgICAgICAgICAgcmV0dXJuIGFyZ3VtZW50c1swXTtcbiAgICAgICAgdmFyIG9iaiA9IG5ldyBWZWM0KCk7XG4gICAgICAgIFZlYzQuYXBwbHkob2JqLCBhcmd1bWVudHMpO1xuICAgICAgICByZXR1cm4gb2JqO1xuICAgIH1cblxuICAgIFZlYzQucHJvdG90eXBlLmFkZCA9IGZ1bmN0aW9uKHgsIHksIHosIHcpIHtcbiAgICAgICAgdmFyIG90aGVyID0gZ2V0VmVjNC5hcHBseShudWxsLCBhcmd1bWVudHMpO1xuICAgICAgICByZXR1cm4gbmV3IFZlYzQodGhpc1swXSArIG90aGVyWzBdLCB0aGlzWzFdICsgb3RoZXJbMV0sIHRoaXNbMl0gKyBvdGhlclsyXSwgdGhpc1szXSArIG90aGVyWzNdKTtcbiAgICB9XG4gICAgVmVjNC5wcm90b3R5cGUuc3ViID0gZnVuY3Rpb24oeCwgeSwgeiwgdykge1xuICAgICAgICB2YXIgb3RoZXIgPSBnZXRWZWM0LmFwcGx5KG51bGwsIGFyZ3VtZW50cyk7XG4gICAgICAgIHJldHVybiBuZXcgVmVjNCh0aGlzWzBdIC0gb3RoZXJbMF0sIHRoaXNbMV0gLSBvdGhlclsxXSwgdGhpc1syXSAtIG90aGVyWzJdLCB0aGlzWzNdIC0gb3RoZXJbM10pO1xuICAgIH1cbiAgICBWZWM0LnByb3RvdHlwZS5tdWwgPSBmdW5jdGlvbih4LCB5LCB6LCB3KSB7XG4gICAgICAgIHZhciBvdGhlciA9IGdldFZlYzQuYXBwbHkobnVsbCwgYXJndW1lbnRzKTtcbiAgICAgICAgcmV0dXJuIG5ldyBWZWM0KHRoaXNbMF0gKiBvdGhlclswXSwgdGhpc1sxXSAqIG90aGVyWzFdLCB0aGlzWzJdICogb3RoZXJbMl0sIHRoaXNbM10gKiBvdGhlclszXSk7XG4gICAgfVxuICAgIFZlYzQucHJvdG90eXBlLmRpdiA9IGZ1bmN0aW9uKHgsIHksIHosIHcpIHtcbiAgICAgICAgdmFyIG90aGVyID0gZ2V0VmVjNC5hcHBseShudWxsLCBhcmd1bWVudHMpO1xuICAgICAgICByZXR1cm4gbmV3IFZlYzQodGhpc1swXSAvIG90aGVyWzBdLCB0aGlzWzFdIC8gb3RoZXJbMV0sIHRoaXNbMl0gLyBvdGhlclsyXSwgdGhpc1szXSAvIG90aGVyWzNdKTtcbiAgICB9XG4gICAgVmVjNC5wcm90b3R5cGUubW9kID0gZnVuY3Rpb24oeCwgeSwgeiwgdykge1xuICAgICAgICB2YXIgb3RoZXIgPSBnZXRWZWM0LmFwcGx5KG51bGwsIGFyZ3VtZW50cyk7XG4gICAgICAgIHJldHVybiBuZXcgVmVjNCh0aGlzWzBdICUgb3RoZXJbMF0sIHRoaXNbMV0gJSBvdGhlclsxXSwgdGhpc1syXSAlIG90aGVyWzJdLCB0aGlzWzNdICUgb3RoZXJbM10pO1xuICAgIH1cbiAgICBWZWM0LnByb3RvdHlwZS5hYnMgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBWZWM0KE1hdGguYWJzKHRoaXNbMF0pLCBNYXRoLmFicyh0aGlzWzFdKSwgTWF0aC5hYnModGhpc1syXSksIE1hdGguYWJzKHRoaXNbM10pKTtcbiAgICB9XG4gICAgVmVjNC5wcm90b3R5cGUuZG90ID0gZnVuY3Rpb24oeCwgeSwgeiwgdykge1xuICAgICAgICB2YXIgb3RoZXIgPSBnZXRWZWM0LmFwcGx5KG51bGwsIGFyZ3VtZW50cyk7XG4gICAgICAgIHJldHVybiB0aGlzWzBdICogb3RoZXJbMF0gKyB0aGlzWzFdICogb3RoZXJbMV0gKyB0aGlzWzJdICogb3RoZXJbMl0gKyB0aGlzWzNdICogb3RoZXJbM107XG4gICAgfVxuICAgIFZlYzQucHJvdG90eXBlLmxlbmd0aCA9IGZ1bmN0aW9uKGxlbmd0aCkge1xuICAgICAgICBpZihhcmd1bWVudHMubGVuZ3RoID09IDApXG4gICAgICAgICAgICByZXR1cm4gTWF0aC5zcXJ0KHRoaXMuZG90KHRoaXMpKTtcbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5tdWwobGVuZ3RoIC8gdGhpcy5sZW5ndGgoKSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgVmVjNC5wcm90b3R5cGUubm9ybWFsaXplID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmxlbmd0aCgxKTtcbiAgICB9XG4gICAgVmVjNC5wcm90b3R5cGUueHl6dyA9IFZlYzQucHJvdG90eXBlLnJnYmEgPSBWZWM0LnByb3RvdHlwZS5zdHBxID0gZnVuY3Rpb24oeCwgeSwgeiwgdykge1xuICAgICAgICBpZihhcmd1bWVudHMubGVuZ3RoID09IDApXG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgZWxzZVxuICAgICAgICAgICAgcmV0dXJuIGdldFZlYzQuYXBwbHkobnVsbCwgYXJndW1lbnRzKTtcbiAgICB9XG4gICAgVmVjNC5wcm90b3R5cGUueCA9IFZlYzQucHJvdG90eXBlLnIgPSBWZWM0LnByb3RvdHlwZS5zID0gZnVuY3Rpb24oeCkge1xuICAgICAgICBpZihhcmd1bWVudHMubGVuZ3RoID09IDApXG4gICAgICAgICAgICByZXR1cm4gdGhpc1swXTtcbiAgICAgICAgZWxzZVxuICAgICAgICAgICAgcmV0dXJuIGdldFZlYzQoeCwgdGhpc1sxXSwgdGhpc1syXSwgdGhpc1szXSk7XG4gICAgfVxuXG4gICAgVmVjNC5wcm90b3R5cGUueSA9IFZlYzQucHJvdG90eXBlLmcgPSBWZWM0LnByb3RvdHlwZS50ID0gZnVuY3Rpb24oeSkge1xuICAgICAgICBpZihhcmd1bWVudHMubGVuZ3RoID09IDApXG4gICAgICAgICAgICByZXR1cm4gdGhpc1sxXTtcbiAgICAgICAgZWxzZVxuICAgICAgICAgICAgcmV0dXJuIGdldFZlYzQodGhpc1swXSwgeSwgdGhpc1syXSwgdGhpc1szXSk7XG4gICAgfVxuICAgIFZlYzQucHJvdG90eXBlLnogPSBWZWM0LnByb3RvdHlwZS5iID0gVmVjNC5wcm90b3R5cGUucCA9IGZ1bmN0aW9uKHopIHtcbiAgICAgICAgaWYoYXJndW1lbnRzLmxlbmd0aCA9PSAwKVxuICAgICAgICAgICAgcmV0dXJuIHRoaXNbMl07XG4gICAgICAgIGVsc2VcbiAgICAgICAgICAgIHJldHVybiBnZXRWZWM0KHRoaXNbMF0sIHRoaXNbMV0sIHosIHRoaXNbM10pO1xuICAgIH1cbiAgICBWZWM0LnByb3RvdHlwZS53ID0gVmVjNC5wcm90b3R5cGUuYSA9IFZlYzQucHJvdG90eXBlLnEgPSBmdW5jdGlvbih3KSB7XG4gICAgICAgIGlmKGFyZ3VtZW50cy5sZW5ndGggPT0gMClcbiAgICAgICAgICAgIHJldHVybiB0aGlzWzNdO1xuICAgICAgICBlbHNlXG4gICAgICAgICAgICByZXR1cm4gZ2V0VmVjNCh0aGlzWzBdLCB0aGlzWzFdLCB0aGlzWzJdLCB3KTtcbiAgICB9XG4gICAgYWRkU3dpenpsZXMoVmVjNC5wcm90b3R5cGUsIDQsIDIsIHRydWUpO1xuICAgIGFkZFN3aXp6bGVzKFZlYzQucHJvdG90eXBlLCA0LCAzLCB0cnVlKTtcbiAgICBhZGRTd2l6emxlcyhWZWM0LnByb3RvdHlwZSwgNCwgNCwgdHJ1ZSk7XG5cbiAgICAvKipcbiAgICAgKiBUaGUgdmlydHVhbCBDb2xvciB0eXBlXG4gICAgICogQGNvbnN0cnVjdG9yXG4gICAgICovXG4gICAgdmFyIENvbG9yID0gVmVjNDtcblxuICAgIC8qKlxuICAgICAqIFRoZSB2aXJ0dWFsIE1hdDMgdHlwZVxuICAgICAqIEBjb25zdHJ1Y3RvclxuICAgICAqL1xuICAgIHZhciBNYXQzID0gZnVuY3Rpb24obTExLCBtMTIsIG0xMywgbTIxLCBtMjIsIG0yMywgbTMxLCBtMzIsIG0zMykge1xuICAgICAgICBjb25zdHJ1Y3RGcm9tTWF0cml4KHRoaXMsIDMsIGFyZ3VtZW50cykgfHwgZmlsbFZlY3Rvcih0aGlzLCA5LCBhcmd1bWVudHMpXG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZ2V0TWF0MygpIHtcbiAgICAgICAgaWYoYXJndW1lbnRzWzBdIGluc3RhbmNlb2YgTWF0MylcbiAgICAgICAgICAgIHJldHVybiBhcmd1bWVudHNbMF07XG4gICAgICAgIHZhciBvYmogPSBuZXcgTWF0MygpO1xuICAgICAgICBNYXQzLmFwcGx5KG9iaiwgYXJndW1lbnRzKTtcbiAgICAgICAgcmV0dXJuIG9iajtcbiAgICB9XG5cbiAgICBNYXQzLnByb3RvdHlwZS5hZGQgPSBmdW5jdGlvbihtMTEsIG0xMiwgbTEzLCBtMjEsIG0yMiwgbTIzLCBtMzEsIG0zMiwgbTMzKSB7XG4gICAgICAgIHZhciBvdGhlciA9IGdldE1hdDMuYXBwbHkobnVsbCwgYXJndW1lbnRzKTtcbiAgICAgICAgcmV0dXJuIG5ldyBNYXQzKHRoaXNbMF0gKyBvdGhlclswXSwgdGhpc1sxXSArIG90aGVyWzFdLCB0aGlzWzJdICsgb3RoZXJbMl0sXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzWzNdICsgb3RoZXJbM10sIHRoaXNbNF0gKyBvdGhlcls0XSwgdGhpc1s1XSArIG90aGVyWzVdLFxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpc1s2XSArIG90aGVyWzZdLCB0aGlzWzddICsgb3RoZXJbN10sIHRoaXNbOF0gKyBvdGhlcls4XSk7XG4gICAgfVxuICAgIE1hdDMucHJvdG90eXBlLnN1YiA9IGZ1bmN0aW9uKG0xMSwgbTEyLCBtMTMsIG0yMSwgbTIyLCBtMjMsIG0zMSwgbTMyLCBtMzMpIHtcbiAgICAgICAgdmFyIG90aGVyID0gZ2V0TWF0My5hcHBseShudWxsLCBhcmd1bWVudHMpO1xuICAgICAgICByZXR1cm4gbmV3IE1hdDModGhpc1swXSAtIG90aGVyWzBdLCB0aGlzWzFdIC0gb3RoZXJbMV0sIHRoaXNbMl0gLSBvdGhlclsyXSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXNbM10gLSBvdGhlclszXSwgdGhpc1s0XSAtIG90aGVyWzRdLCB0aGlzWzVdIC0gb3RoZXJbNV0sXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzWzZdIC0gb3RoZXJbNl0sIHRoaXNbN10gLSBvdGhlcls3XSwgdGhpc1s4XSAtIG90aGVyWzhdKTtcbiAgICB9XG4gICAgTWF0My5wcm90b3R5cGUubXVsID0gZnVuY3Rpb24obTExLCBtMTIsIG0xMywgbTIxLCBtMjIsIG0yMywgbTMxLCBtMzIsIG0zMykge1xuICAgICAgICB2YXIgb3RoZXIgPSBnZXRNYXQzLmFwcGx5KG51bGwsIGFyZ3VtZW50cyk7XG4gICAgICAgIC8vIFRPRE86IERvIGNvcnJlY3QgbWF0cml4IG11bHRpcGxpY2F0aW9uLi4uXG4gICAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICBNYXQzLnByb3RvdHlwZS5kaXYgPSBmdW5jdGlvbihtMTEsIG0xMiwgbTEzLCBtMjEsIG0yMiwgbTIzLCBtMzEsIG0zMiwgbTMzKSB7XG4gICAgICAgIHZhciBvdGhlciA9IGdldE1hdDMuYXBwbHkobnVsbCwgYXJndW1lbnRzKTtcbiAgICAgICAgcmV0dXJuIG5ldyBNYXQzKHRoaXNbMF0gLyBvdGhlclswXSwgdGhpc1sxXSAvIG90aGVyWzFdLCB0aGlzWzJdIC8gb3RoZXJbMl0sXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzWzNdIC8gb3RoZXJbM10sIHRoaXNbNF0gLyBvdGhlcls0XSwgdGhpc1s1XSAvIG90aGVyWzVdLFxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpc1s2XSAvIG90aGVyWzZdLCB0aGlzWzddIC8gb3RoZXJbN10sIHRoaXNbOF0gLyBvdGhlcls4XSk7XG4gICAgfVxuXG4gICAgTWF0My5wcm90b3R5cGUuY29sID0gZnVuY3Rpb24oaWR4LCB4LCB5LCB6KXtcbiAgICAgICAgaWYoYXJndW1lbnRzLmxlbmd0aCA9PSAxKXtcbiAgICAgICAgICAgIHJldHVybiBuZXcgVmVjMyh0aGlzWzMqaWR4ICsgMF0sIHRoaXNbMyppZHggKyAxXSwgdGhpc1szKmlkeCArIDJdKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNle1xuICAgICAgICAgICAgdmFyIGlucHV0ID0gZ2V0VmVjMy5hcHBseShudWxsLCBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpKTtcbiAgICAgICAgICAgIHZhciBjb3B5ID0gbmV3IE1hdDModGhpcyk7XG4gICAgICAgICAgICBjb3B5WzMqaWR4ICsgMF0gPSBpbnB1dFswXTtcbiAgICAgICAgICAgIGNvcHlbMyppZHggKyAxXSA9IGlucHV0WzFdO1xuICAgICAgICAgICAgY29weVszKmlkeCArIDJdID0gaW5wdXRbMl07XG4gICAgICAgIH1cbiAgICB9XG4gICAgTWF0My5wcm90b3R5cGUubXVsVmVjID0gZnVuY3Rpb24oeCwgeSwgeil7XG4gICAgICAgIHZhciBvdGhlciA9IGdldFZlYzMuYXBwbHkobnVsbCwgYXJndW1lbnRzKTtcbiAgICAgICAgcmV0dXJuIG5ldyBWZWMzKFxuICAgICAgICAgICAgb3RoZXIuZG90KHRoaXNbMF0sIHRoaXNbMV0sIHRoaXNbMl0pLFxuICAgICAgICAgICAgb3RoZXIuZG90KHRoaXNbM10sIHRoaXNbNF0sIHRoaXNbNV0pLFxuICAgICAgICAgICAgb3RoZXIuZG90KHRoaXNbNl0sIHRoaXNbN10sIHRoaXNbOF0pXG4gICAgICAgIClcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBUaGUgdmlydHVhbCBNYXQzIHR5cGVcbiAgICAgKiBAY29uc3RydWN0b3JcbiAgICAgKi9cbiAgICB2YXIgTWF0NCA9IGZ1bmN0aW9uKG0xMSwgbTEyLCBtMTMsIG0xNCwgbTIxLCBtMjIsIG0yMywgbTI0LCBtMzEsIG0zMiwgbTMzLCBtMzQsIG00MSwgbTQyLCBtNDMsIG00NCkge1xuICAgICAgICBjb25zdHJ1Y3RGcm9tTWF0cml4KHRoaXMsIDQsIGFyZ3VtZW50cykgfHwgZmlsbFZlY3Rvcih0aGlzLCAxNiwgYXJndW1lbnRzKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBnZXRNYXQ0KCkge1xuICAgICAgICBpZihhcmd1bWVudHNbMF0gaW5zdGFuY2VvZiBNYXQ0KVxuICAgICAgICAgICAgcmV0dXJuIGFyZ3VtZW50c1swXTtcbiAgICAgICAgdmFyIG9iaiA9IG5ldyBNYXQ0KCk7XG4gICAgICAgIE1hdDQuYXBwbHkob2JqLCBhcmd1bWVudHMpO1xuICAgICAgICByZXR1cm4gb2JqO1xuICAgIH1cblxuICAgIE1hdDQucHJvdG90eXBlLmFkZCA9IGZ1bmN0aW9uKG0xMSwgbTEyLCBtMTMsIG0xNCwgbTIxLCBtMjIsIG0yMywgbTI0LCBtMzEsIG0zMiwgbTMzLCBtMzQsIG00MSwgbTQyLCBtNDMsIG00NCkge1xuICAgICAgICB2YXIgb3RoZXIgPSBnZXRNYXQ0LmFwcGx5KG51bGwsIGFyZ3VtZW50cyk7XG4gICAgICAgIHJldHVybiBuZXcgTWF0Myh0aGlzWzBdICsgb3RoZXJbMF0sIHRoaXNbMV0gKyBvdGhlclsxXSwgdGhpc1syXSArIG90aGVyWzJdLCB0aGlzWzNdICsgb3RoZXJbM10sXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzWzRdICsgb3RoZXJbNF0sIHRoaXNbNV0gKyBvdGhlcls1XSwgdGhpc1s2XSArIG90aGVyWzZdLCB0aGlzWzddICsgb3RoZXJbN10sXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzWzhdICsgb3RoZXJbOF0sIHRoaXNbOV0gKyBvdGhlcls5XSwgdGhpc1sxMF0gKyBvdGhlclsxMF0sIHRoaXNbMTFdICsgb3RoZXJbMTFdLFxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpc1sxMl0gKyBvdGhlclsxMl0sIHRoaXNbMTNdICsgb3RoZXJbMTNdLCB0aGlzWzE0XSArIG90aGVyWzE0XSwgdGhpc1sxNV0gKyBvdGhlclsxNV0pO1xuICAgIH1cbiAgICBNYXQ0LnByb3RvdHlwZS5zdWIgPSBmdW5jdGlvbihtMTEsIG0xMiwgbTEzLCBtMTQsIG0yMSwgbTIyLCBtMjMsIG0yNCwgbTMxLCBtMzIsIG0zMywgbTM0LCBtNDEsIG00MiwgbTQzLCBtNDQpIHtcbiAgICAgICAgdmFyIG90aGVyID0gZ2V0TWF0NC5hcHBseShudWxsLCBhcmd1bWVudHMpO1xuICAgICAgICByZXR1cm4gbmV3IE1hdDModGhpc1swXSAtIG90aGVyWzBdLCB0aGlzWzFdIC0gb3RoZXJbMV0sIHRoaXNbMl0gLSBvdGhlclsyXSwgdGhpc1szXSAtIG90aGVyWzNdLFxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpc1s0XSAtIG90aGVyWzRdLCB0aGlzWzVdIC0gb3RoZXJbNV0sIHRoaXNbNl0gLSBvdGhlcls2XSwgdGhpc1s3XSAtIG90aGVyWzddLFxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpc1s4XSAtIG90aGVyWzhdLCB0aGlzWzldIC0gb3RoZXJbOV0sIHRoaXNbMTBdIC0gb3RoZXJbMTBdLCB0aGlzWzExXSAtIG90aGVyWzExXSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXNbMTJdIC0gb3RoZXJbMTJdLCB0aGlzWzEzXSAtIG90aGVyWzEzXSwgdGhpc1sxNF0gLSBvdGhlclsxNF0sIHRoaXNbMTVdIC0gb3RoZXJbMTVdKTtcbiAgICB9XG4gICAgTWF0NC5wcm90b3R5cGUubXVsID0gZnVuY3Rpb24obTExLCBtMTIsIG0xMywgbTE0LCBtMjEsIG0yMiwgbTIzLCBtMjQsIG0zMSwgbTMyLCBtMzMsIG0zNCwgbTQxLCBtNDIsIG00MywgbTQ0KSB7XG4gICAgICAgIHZhciBvdGhlciA9IGdldE1hdDQuYXBwbHkobnVsbCwgYXJndW1lbnRzKTtcbiAgICAgICAgLy8gVE9ETzogRG8gY29ycmVjdCBtYXRyaXggbXVsdGlwbGljYXRpb24uLi5cbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIE1hdDQucHJvdG90eXBlLmRpdiA9IGZ1bmN0aW9uKG0xMSwgbTEyLCBtMTMsIG0xNCwgbTIxLCBtMjIsIG0yMywgbTI0LCBtMzEsIG0zMiwgbTMzLCBtMzQsIG00MSwgbTQyLCBtNDMsIG00NCkge1xuICAgICAgICB2YXIgb3RoZXIgPSBnZXRNYXQ0LmFwcGx5KG51bGwsIGFyZ3VtZW50cyk7XG4gICAgICAgIHJldHVybiBuZXcgTWF0Myh0aGlzWzBdIC8gb3RoZXJbMF0sIHRoaXNbMV0gLyBvdGhlclsxXSwgdGhpc1syXSAvIG90aGVyWzJdLCB0aGlzWzNdIC8gb3RoZXJbM10sXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzWzRdIC8gb3RoZXJbNF0sIHRoaXNbNV0gLyBvdGhlcls1XSwgdGhpc1s2XSAvIG90aGVyWzZdLCB0aGlzWzddIC8gb3RoZXJbN10sXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzWzhdIC8gb3RoZXJbOF0sIHRoaXNbOV0gLyBvdGhlcls5XSwgdGhpc1sxMF0gLyBvdGhlclsxMF0sIHRoaXNbMTFdIC8gb3RoZXJbMTFdLFxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpc1sxMl0gLyBvdGhlclsxMl0sIHRoaXNbMTNdIC8gb3RoZXJbMTNdLCB0aGlzWzE0XSAvIG90aGVyWzE0XSwgdGhpc1sxNV0gLyBvdGhlclsxNV0pO1xuICAgIH1cblxuICAgIE1hdDQucHJvdG90eXBlLmNvbCA9IGZ1bmN0aW9uKGlkeCwgeCwgeSwgeiwgdyl7XG4gICAgICAgIGlmKGFyZ3VtZW50cy5sZW5ndGggPT0gMSl7XG4gICAgICAgICAgICByZXR1cm4gbmV3IFZlYzQodGhpc1s0KmlkeCArIDBdLCB0aGlzWzQqaWR4ICsgMV0sIHRoaXNbNCppZHggKyAyXSwgdGhpc1s0KmlkeCArIDNdKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNle1xuICAgICAgICAgICAgdmFyIGlucHV0ID0gZ2V0VmVjNC5hcHBseShudWxsLCBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpKTtcbiAgICAgICAgICAgIHZhciBjb3B5ID0gbmV3IE1hdDQodGhpcyk7XG4gICAgICAgICAgICBjb3B5WzQqaWR4ICsgMF0gPSBpbnB1dFswXTtcbiAgICAgICAgICAgIGNvcHlbNCppZHggKyAxXSA9IGlucHV0WzFdO1xuICAgICAgICAgICAgY29weVs0KmlkeCArIDJdID0gaW5wdXRbMl07XG4gICAgICAgICAgICBjb3B5WzQqaWR4ICsgM10gPSBpbnB1dFszXTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBNYXQ0LnByb3RvdHlwZS5tdWxWZWMgPSBmdW5jdGlvbih4LCB5LCB6LCB3KXtcbiAgICAgICAgdmFyIG90aGVyID0gZ2V0VmVjNC5hcHBseShudWxsLCBhcmd1bWVudHMpO1xuICAgICAgICByZXR1cm4gbmV3IFZlYzMoXG4gICAgICAgICAgICBvdGhlci5kb3QodGhpc1swXSwgdGhpc1sxXSwgdGhpc1syXSwgdGhpc1szXSksXG4gICAgICAgICAgICBvdGhlci5kb3QodGhpc1s0XSwgdGhpc1s1XSwgdGhpc1s2XSwgdGhpc1s3XSksXG4gICAgICAgICAgICBvdGhlci5kb3QodGhpc1s4XSwgdGhpc1s5XSwgdGhpc1sxMF0sIHRoaXNbMTFdKSxcbiAgICAgICAgICAgIG90aGVyLmRvdCh0aGlzWzEyXSwgdGhpc1sxM10sIHRoaXNbMTRdLCB0aGlzWzE1XSlcbiAgICAgICAgKTtcbiAgICB9XG5cblxuICAgIC8qKlxuICAgICAqIFRoZSB2aXJ0dWFsIFRldHVyZSB0eXBlXG4gICAgICogQGNvbnN0cnVjdG9yXG4gICAgICovXG4gICAgdmFyIFRleHR1cmUgPSBmdW5jdGlvbihpbWFnZSkge1xuICAgICAgICB0aGlzLmltYWdlID0gaW1hZ2U7XG4gICAgfVxuXG4gICAgVGV4dHVyZS5wcm90b3R5cGUuc2FtcGxlMkQgPSBmdW5jdGlvbih4LCB5KSB7XG4gICAgICAgIHJldHVybiBuZXcgVmVjNCgwLCAwLCAwLCAwKTtcbiAgICB9XG5cblxuXG5cblxuICAgIHZhciBTaGFkZSA9IHt9O1xuXG4gICAgU2hhZGUuY2xhbXAgPSBmdW5jdGlvbih4LCBtaW5WYWwsIG1heFZhbCkge1xuICAgICAgICByZXR1cm4gTWF0aC5taW4oTWF0aC5tYXgoeCwgbWluVmFsKSwgbWF4VmFsKTtcbiAgICB9O1xuXG4gICAgU2hhZGUuc21vb3Roc3RlcCA9IGZ1bmN0aW9uKGVkZ2UxLCBlZGdlMiwgeCkge1xuICAgICAgICB2YXIgdCA9IFNoYWRlLmNsYW1wKCh4IC0gZWRnZTEpIC8gKGVkZ2UyIC0gZWRnZTEpLCAwLjAsIDEuMCk7XG4gICAgICAgIHJldHVybiB0ICogdCAqICgzLjAgLSAyLjAgKiB0KTtcbiAgICB9O1xuXG4gICAgU2hhZGUuc3RlcCA9IGZ1bmN0aW9uKGVkZ2UsIHgpIHtcbiAgICAgICAgcmV0dXJuIHggPCBlZGdlID8gMCA6IDE7XG4gICAgfTtcblxuICAgIFNoYWRlLmZyYWN0ID0gZnVuY3Rpb24oeCkge1xuICAgICAgICByZXR1cm4geCAtIE1hdGguZmxvb3IoeCk7XG4gICAgfVxuXG5cbiAgICAvKipcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gbm9kZVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBtc2dcbiAgICAgKi9cbiAgICBucy50aHJvd0Vycm9yID0gZnVuY3Rpb24obm9kZSwgbXNnKSB7XG4gICAgICAgIHZhciBsb2MgPSBub2RlICYmIG5vZGUubG9jO1xuICAgICAgICBpZiAobG9jICYmIGxvYy5zdGFydC5saW5lKSB7XG4gICAgICAgICAgICBtc2cgPSBcIkxpbmUgXCIgKyBsb2Muc3RhcnQubGluZSArIFwiOiBcIiArIG1zZztcbiAgICAgICAgfVxuICAgICAgICB2YXIgZXJyb3IgPSBuZXcgRXJyb3IobXNnKTtcbiAgICAgICAgZXJyb3IubG9jID0gbG9jO1xuICAgICAgICB0aHJvdyBlcnJvcjtcbiAgICB9XG5cbiAgICBucy5WZWMyID0gVmVjMjtcbiAgICBucy5WZWMzID0gVmVjMztcbiAgICBucy5WZWM0ID0gVmVjNDtcbiAgICBucy5Db2xvciA9IENvbG9yO1xuICAgIG5zLlNoYWRlID0gU2hhZGU7XG5cbn0oZXhwb3J0cykpO1xuIiwiKGZ1bmN0aW9uIChucykge1xuICAgIHZhciBwYXJzZXIgPSByZXF1aXJlKCdlc3ByaW1hJyksXG4gICAgICAgIHBhcmFtZXRlcnMgPSByZXF1aXJlKFwiLi9hbmFseXplL3BhcmFtZXRlcnMuanNcIiksXG4gICAgICAgIGludGVyZmFjZXMgPSByZXF1aXJlKFwiLi9pbnRlcmZhY2VzLmpzXCIpLFxuICAgICAgICBpbmZlcmVuY2UgPSByZXF1aXJlKFwiLi9hbmFseXplL3R5cGVpbmZlcmVuY2UvdHlwZWluZmVyZW5jZS5qc1wiKSxcbiAgICAgICAgQmFzZSA9IHJlcXVpcmUoXCIuL2Jhc2UvaW5kZXguanNcIiksXG4gICAgICAgIEdMU0xDb21waWxlciA9IHJlcXVpcmUoXCIuL2dlbmVyYXRlL2dsc2wvY29tcGlsZXIuanNcIikuR0xTTENvbXBpbGVyO1xuXG5cblxuICAgIEJhc2UuZXh0ZW5kKG5zLCB7XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEFuYWx5emVzIGEgamF2YXNjcmlwdCBwcm9ncmFtIGFuZCByZXR1cm5zIGEgbGlzdCBvZiBwYXJhbWV0ZXJzXG4gICAgICAgICAqIEBwYXJhbSB7ZnVuY3Rpb24oKXxzdHJpbmcpIGZ1bmNcbiAgICAgICAgICogQHJldHVybnMge29iamVjdCF9XG4gICAgICAgICAqL1xuICAgICAgICBleHRyYWN0UGFyYW1ldGVyczogZnVuY3Rpb24gKGZ1bmMsIG9wdCkge1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBmdW5jID09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgICAgICBmdW5jID0gZnVuYy50b1N0cmluZygpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFyIGFzdCA9IHBhcnNlci5wYXJzZShmdW5jKTtcblxuICAgICAgICAgICAgcmV0dXJuIHBhcmFtZXRlcnMuZXh0cmFjdFBhcmFtZXRlcnMoYXN0LCBvcHQpO1xuICAgICAgICB9LFxuXG4gICAgICAgIHBhcnNlQW5kSW5mZXJlbmNlRXhwcmVzc2lvbjogZnVuY3Rpb24gKHN0ciwgb3B0KSB7XG4gICAgICAgICAgICBvcHQgPSBvcHQgfHwge307XG4gICAgICAgICAgICB2YXIgYXN0ID0gcGFyc2VyLnBhcnNlKHN0ciwge3JhdzogdHJ1ZSwgbG9jOiBvcHQubG9jIHx8IGZhbHNlIH0pO1xuICAgICAgICAgICAgdmFyIGFhc3QgPSBpbmZlcmVuY2UuaW5mZXIoYXN0LCBvcHQpO1xuICAgICAgICAgICAgcmV0dXJuIGFhc3Q7XG4gICAgICAgIH0sXG5cbiAgICAgICAgY29tcGlsZUZyYWdtZW50U2hhZGVyOiBmdW5jdGlvbihhYXN0KXtcbiAgICAgICAgICAgIHJldHVybiBuZXcgR0xTTENvbXBpbGVyKCkuY29tcGlsZUZyYWdtZW50U2hhZGVyKGFhc3QpO1xuICAgICAgICB9LFxuXG4gICAgICAgIFRZUEVTIDogaW50ZXJmYWNlcy5UWVBFUyxcbiAgICAgICAgT0JKRUNUX0tJTkRTIDogaW50ZXJmYWNlcy5PQkpFQ1RfS0lORFMsXG4gICAgICAgIFNPVVJDRVM6IGludGVyZmFjZXMuU09VUkNFUyxcbiAgICAgICAgVmVjMjogaW50ZXJmYWNlcy5WZWMyLFxuICAgICAgICBWZWMzOiBpbnRlcmZhY2VzLlZlYzMsXG4gICAgICAgIFZlYzQ6IGludGVyZmFjZXMuVmVjNCxcbiAgICAgICAgVGV4dHVyZTogaW50ZXJmYWNlcy5UZXh0dXJlLFxuICAgICAgICBDb2xvcjogaW50ZXJmYWNlcy5Db2xvclxuXG59KTtcbiAgICAvKipcbiAgICAgKiBMaWJyYXJ5IHZlcnNpb246XG4gICAgICovXG4gICAgbnMudmVyc2lvbiA9ICcwLjAuMSc7XG5cbn0oZXhwb3J0cykpO1xuIl19
;