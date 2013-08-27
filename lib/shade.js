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
            if (test.hasStaticValue()) {
                var testResult = evaluateTruth(test.getStaticValue());
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
                case "==": // comparison
                case "!=":
                case "===":
                case "!==":
                case ">":
                case "<":
                case ">=":
                case "<=":
                    result.setType(TYPES.BOOLEAN);
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

            default:
                //console.log("Unhandled: " , node.type);
        }
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
            walk.replace(ast, {

                enter: function (node, parent) {
                    //console.log("Enter:", node.type);
                    switch (node.type) {
                        case Syntax.Identifier:
                            return handleIdentifier(node, parent, state.blockedNames, state.idNameMap);
                        case Syntax.IfStatement:
                            return handleIfStatement(node);
                        case Syntax.ConditionalExpression:
                            return handleConditionalExpression(node, state, this);
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

        // console.log(context);
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
                throw new Error("Something went wrong in type inference");

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

    var handleConditionalExpression = function(node, state, root) {
        var consequent = ANNO(node.consequent);
        var alternate = ANNO(node.alternate);
        if (consequent.canEliminate()) {
            return root.replace(node.alternate, state);
        }
        if (alternate.canEliminate()) {
            return root.replace(node.consequent, state);
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
//@ sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyJlOlxcQ29kZVxcaHRkb2NzXFxzaGFkZWpzXFxidWlsZFxcc2hhZGUuanMiLCJlOlxcQ29kZVxcaHRkb2NzXFxzaGFkZWpzXFxpbmRleC5qcyIsImU6XFxDb2RlXFxodGRvY3NcXHNoYWRlanNcXG5vZGVfbW9kdWxlc1xcZXNwcmltYVxcZXNwcmltYS5qcyIsImU6XFxDb2RlXFxodGRvY3NcXHNoYWRlanNcXG5vZGVfbW9kdWxlc1xcZXN0cmF2ZXJzZVxcZXN0cmF2ZXJzZS5qcyIsImU6XFxDb2RlXFxodGRvY3NcXHNoYWRlanNcXHNyY1xcYW5hbHl6ZVxccGFyYW1ldGVycy5qcyIsImU6XFxDb2RlXFxodGRvY3NcXHNoYWRlanNcXHNyY1xcYW5hbHl6ZVxcdHlwZWluZmVyZW5jZVxcaW5mZXJfZXhwcmVzc2lvbi5qcyIsImU6XFxDb2RlXFxodGRvY3NcXHNoYWRlanNcXHNyY1xcYW5hbHl6ZVxcdHlwZWluZmVyZW5jZVxcaW5mZXJfc3RhdGVtZW50LmpzIiwiZTpcXENvZGVcXGh0ZG9jc1xcc2hhZGVqc1xcc3JjXFxhbmFseXplXFx0eXBlaW5mZXJlbmNlXFxyZWdpc3RyeVxcY29sb3JjbG9zdXJlLmpzIiwiZTpcXENvZGVcXGh0ZG9jc1xcc2hhZGVqc1xcc3JjXFxhbmFseXplXFx0eXBlaW5mZXJlbmNlXFxyZWdpc3RyeVxcaW5kZXguanMiLCJlOlxcQ29kZVxcaHRkb2NzXFxzaGFkZWpzXFxzcmNcXGFuYWx5emVcXHR5cGVpbmZlcmVuY2VcXHJlZ2lzdHJ5XFxtYXRoLmpzIiwiZTpcXENvZGVcXGh0ZG9jc1xcc2hhZGVqc1xcc3JjXFxhbmFseXplXFx0eXBlaW5mZXJlbmNlXFxyZWdpc3RyeVxcbWF0cml4LmpzIiwiZTpcXENvZGVcXGh0ZG9jc1xcc2hhZGVqc1xcc3JjXFxhbmFseXplXFx0eXBlaW5mZXJlbmNlXFxyZWdpc3RyeVxcc2hhZGUuanMiLCJlOlxcQ29kZVxcaHRkb2NzXFxzaGFkZWpzXFxzcmNcXGFuYWx5emVcXHR5cGVpbmZlcmVuY2VcXHJlZ2lzdHJ5XFxzeXN0ZW0uanMiLCJlOlxcQ29kZVxcaHRkb2NzXFxzaGFkZWpzXFxzcmNcXGFuYWx5emVcXHR5cGVpbmZlcmVuY2VcXHJlZ2lzdHJ5XFx0ZXh0dXJlLmpzIiwiZTpcXENvZGVcXGh0ZG9jc1xcc2hhZGVqc1xcc3JjXFxhbmFseXplXFx0eXBlaW5mZXJlbmNlXFxyZWdpc3RyeVxcdG9vbHMuanMiLCJlOlxcQ29kZVxcaHRkb2NzXFxzaGFkZWpzXFxzcmNcXGFuYWx5emVcXHR5cGVpbmZlcmVuY2VcXHJlZ2lzdHJ5XFx2ZWMyLmpzIiwiZTpcXENvZGVcXGh0ZG9jc1xcc2hhZGVqc1xcc3JjXFxhbmFseXplXFx0eXBlaW5mZXJlbmNlXFxyZWdpc3RyeVxcdmVjMy5qcyIsImU6XFxDb2RlXFxodGRvY3NcXHNoYWRlanNcXHNyY1xcYW5hbHl6ZVxcdHlwZWluZmVyZW5jZVxccmVnaXN0cnlcXHZlYzQuanMiLCJlOlxcQ29kZVxcaHRkb2NzXFxzaGFkZWpzXFxzcmNcXGFuYWx5emVcXHR5cGVpbmZlcmVuY2VcXHR5cGVpbmZlcmVuY2UuanMiLCJlOlxcQ29kZVxcaHRkb2NzXFxzaGFkZWpzXFxzcmNcXGJhc2VcXGFubm90YXRpb24uanMiLCJlOlxcQ29kZVxcaHRkb2NzXFxzaGFkZWpzXFxzcmNcXGJhc2VcXGNvbnRleHQuanMiLCJlOlxcQ29kZVxcaHRkb2NzXFxzaGFkZWpzXFxzcmNcXGJhc2VcXGluZGV4LmpzIiwiZTpcXENvZGVcXGh0ZG9jc1xcc2hhZGVqc1xcc3JjXFxiYXNlXFx0eXBlaW5mby5qcyIsImU6XFxDb2RlXFxodGRvY3NcXHNoYWRlanNcXHNyY1xcYmFzZVxcdmVjLmpzIiwiZTpcXENvZGVcXGh0ZG9jc1xcc2hhZGVqc1xcc3JjXFxnZW5lcmF0ZVxcZ2xzbFxcY29tcGlsZXIuanMiLCJlOlxcQ29kZVxcaHRkb2NzXFxzaGFkZWpzXFxzcmNcXGdlbmVyYXRlXFxnbHNsXFxnbHNsLWdlbmVyYXRlLmpzIiwiZTpcXENvZGVcXGh0ZG9jc1xcc2hhZGVqc1xcc3JjXFxnZW5lcmF0ZVxcZ2xzbFxccmVnaXN0cnlcXGNvbG9yY2xvc3VyZS5qcyIsImU6XFxDb2RlXFxodGRvY3NcXHNoYWRlanNcXHNyY1xcZ2VuZXJhdGVcXGdsc2xcXHJlZ2lzdHJ5XFxpbmRleC5qcyIsImU6XFxDb2RlXFxodGRvY3NcXHNoYWRlanNcXHNyY1xcZ2VuZXJhdGVcXGdsc2xcXHJlZ2lzdHJ5XFxtYXRoLmpzIiwiZTpcXENvZGVcXGh0ZG9jc1xcc2hhZGVqc1xcc3JjXFxnZW5lcmF0ZVxcZ2xzbFxccmVnaXN0cnlcXHNoYWRlLmpzIiwiZTpcXENvZGVcXGh0ZG9jc1xcc2hhZGVqc1xcc3JjXFxnZW5lcmF0ZVxcZ2xzbFxccmVnaXN0cnlcXHN5c3RlbS5qcyIsImU6XFxDb2RlXFxodGRvY3NcXHNoYWRlanNcXHNyY1xcZ2VuZXJhdGVcXGdsc2xcXHJlZ2lzdHJ5XFx0ZXh0dXJlLmpzIiwiZTpcXENvZGVcXGh0ZG9jc1xcc2hhZGVqc1xcc3JjXFxnZW5lcmF0ZVxcZ2xzbFxccmVnaXN0cnlcXHRvb2xzLmpzIiwiZTpcXENvZGVcXGh0ZG9jc1xcc2hhZGVqc1xcc3JjXFxnZW5lcmF0ZVxcZ2xzbFxccmVnaXN0cnlcXHZlYzIuanMiLCJlOlxcQ29kZVxcaHRkb2NzXFxzaGFkZWpzXFxzcmNcXGdlbmVyYXRlXFxnbHNsXFxyZWdpc3RyeVxcdmVjMy5qcyIsImU6XFxDb2RlXFxodGRvY3NcXHNoYWRlanNcXHNyY1xcZ2VuZXJhdGVcXGdsc2xcXHJlZ2lzdHJ5XFx2ZWM0LmpzIiwiZTpcXENvZGVcXGh0ZG9jc1xcc2hhZGVqc1xcc3JjXFxnZW5lcmF0ZVxcZ2xzbFxcdHJhbnNmb3JtLmpzIiwiZTpcXENvZGVcXGh0ZG9jc1xcc2hhZGVqc1xcc3JjXFxpbnRlcmZhY2VzLmpzIiwiZTpcXENvZGVcXGh0ZG9jc1xcc2hhZGVqc1xcc3JjXFxzaGFkZS5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNKQTs7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcDBIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzVEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pnQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaFBBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9JQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hTQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN1FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqVEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNURBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pPQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BUQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0VBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BTQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMWZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM21CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gKCkge1xyXG4gICAgdmFyIGdsb2JhbCA9IHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnID8gd2luZG93IDoge307XHJcbiAgICBnbG9iYWwuU2hhZGUgPSByZXF1aXJlKFwiLi4vaW5kZXguanNcIik7XHJcbn0oKSk7XHJcbiIsIm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZSgnLi9zcmMvc2hhZGUuanMnKTsiLCIvKlxuICBDb3B5cmlnaHQgKEMpIDIwMTIgQXJpeWEgSGlkYXlhdCA8YXJpeWEuaGlkYXlhdEBnbWFpbC5jb20+XG4gIENvcHlyaWdodCAoQykgMjAxMiBNYXRoaWFzIEJ5bmVucyA8bWF0aGlhc0BxaXdpLmJlPlxuICBDb3B5cmlnaHQgKEMpIDIwMTIgSm9vc3QtV2ltIEJvZWtlc3RlaWpuIDxqb29zdC13aW1AYm9la2VzdGVpam4ubmw+XG4gIENvcHlyaWdodCAoQykgMjAxMiBLcmlzIEtvd2FsIDxrcmlzLmtvd2FsQGNpeGFyLmNvbT5cbiAgQ29weXJpZ2h0IChDKSAyMDEyIFl1c3VrZSBTdXp1a2kgPHV0YXRhbmUudGVhQGdtYWlsLmNvbT5cbiAgQ29weXJpZ2h0IChDKSAyMDEyIEFycGFkIEJvcnNvcyA8YXJwYWQuYm9yc29zQGdvb2dsZW1haWwuY29tPlxuICBDb3B5cmlnaHQgKEMpIDIwMTEgQXJpeWEgSGlkYXlhdCA8YXJpeWEuaGlkYXlhdEBnbWFpbC5jb20+XG5cbiAgUmVkaXN0cmlidXRpb24gYW5kIHVzZSBpbiBzb3VyY2UgYW5kIGJpbmFyeSBmb3Jtcywgd2l0aCBvciB3aXRob3V0XG4gIG1vZGlmaWNhdGlvbiwgYXJlIHBlcm1pdHRlZCBwcm92aWRlZCB0aGF0IHRoZSBmb2xsb3dpbmcgY29uZGl0aW9ucyBhcmUgbWV0OlxuXG4gICAgKiBSZWRpc3RyaWJ1dGlvbnMgb2Ygc291cmNlIGNvZGUgbXVzdCByZXRhaW4gdGhlIGFib3ZlIGNvcHlyaWdodFxuICAgICAgbm90aWNlLCB0aGlzIGxpc3Qgb2YgY29uZGl0aW9ucyBhbmQgdGhlIGZvbGxvd2luZyBkaXNjbGFpbWVyLlxuICAgICogUmVkaXN0cmlidXRpb25zIGluIGJpbmFyeSBmb3JtIG11c3QgcmVwcm9kdWNlIHRoZSBhYm92ZSBjb3B5cmlnaHRcbiAgICAgIG5vdGljZSwgdGhpcyBsaXN0IG9mIGNvbmRpdGlvbnMgYW5kIHRoZSBmb2xsb3dpbmcgZGlzY2xhaW1lciBpbiB0aGVcbiAgICAgIGRvY3VtZW50YXRpb24gYW5kL29yIG90aGVyIG1hdGVyaWFscyBwcm92aWRlZCB3aXRoIHRoZSBkaXN0cmlidXRpb24uXG5cbiAgVEhJUyBTT0ZUV0FSRSBJUyBQUk9WSURFRCBCWSBUSEUgQ09QWVJJR0hUIEhPTERFUlMgQU5EIENPTlRSSUJVVE9SUyBcIkFTIElTXCJcbiAgQU5EIEFOWSBFWFBSRVNTIE9SIElNUExJRUQgV0FSUkFOVElFUywgSU5DTFVESU5HLCBCVVQgTk9UIExJTUlURUQgVE8sIFRIRVxuICBJTVBMSUVEIFdBUlJBTlRJRVMgT0YgTUVSQ0hBTlRBQklMSVRZIEFORCBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRVxuICBBUkUgRElTQ0xBSU1FRC4gSU4gTk8gRVZFTlQgU0hBTEwgPENPUFlSSUdIVCBIT0xERVI+IEJFIExJQUJMRSBGT1IgQU5ZXG4gIERJUkVDVCwgSU5ESVJFQ1QsIElOQ0lERU5UQUwsIFNQRUNJQUwsIEVYRU1QTEFSWSwgT1IgQ09OU0VRVUVOVElBTCBEQU1BR0VTXG4gIChJTkNMVURJTkcsIEJVVCBOT1QgTElNSVRFRCBUTywgUFJPQ1VSRU1FTlQgT0YgU1VCU1RJVFVURSBHT09EUyBPUiBTRVJWSUNFUztcbiAgTE9TUyBPRiBVU0UsIERBVEEsIE9SIFBST0ZJVFM7IE9SIEJVU0lORVNTIElOVEVSUlVQVElPTikgSE9XRVZFUiBDQVVTRUQgQU5EXG4gIE9OIEFOWSBUSEVPUlkgT0YgTElBQklMSVRZLCBXSEVUSEVSIElOIENPTlRSQUNULCBTVFJJQ1QgTElBQklMSVRZLCBPUiBUT1JUXG4gIChJTkNMVURJTkcgTkVHTElHRU5DRSBPUiBPVEhFUldJU0UpIEFSSVNJTkcgSU4gQU5ZIFdBWSBPVVQgT0YgVEhFIFVTRSBPRlxuICBUSElTIFNPRlRXQVJFLCBFVkVOIElGIEFEVklTRUQgT0YgVEhFIFBPU1NJQklMSVRZIE9GIFNVQ0ggREFNQUdFLlxuKi9cblxuLypqc2xpbnQgYml0d2lzZTp0cnVlIHBsdXNwbHVzOnRydWUgKi9cbi8qZ2xvYmFsIGVzcHJpbWE6dHJ1ZSwgZGVmaW5lOnRydWUsIGV4cG9ydHM6dHJ1ZSwgd2luZG93OiB0cnVlLFxudGhyb3dFcnJvcjogdHJ1ZSwgY3JlYXRlTGl0ZXJhbDogdHJ1ZSwgZ2VuZXJhdGVTdGF0ZW1lbnQ6IHRydWUsXG5wYXJzZUFzc2lnbm1lbnRFeHByZXNzaW9uOiB0cnVlLCBwYXJzZUJsb2NrOiB0cnVlLCBwYXJzZUV4cHJlc3Npb246IHRydWUsXG5wYXJzZUZ1bmN0aW9uRGVjbGFyYXRpb246IHRydWUsIHBhcnNlRnVuY3Rpb25FeHByZXNzaW9uOiB0cnVlLFxucGFyc2VGdW5jdGlvblNvdXJjZUVsZW1lbnRzOiB0cnVlLCBwYXJzZVZhcmlhYmxlSWRlbnRpZmllcjogdHJ1ZSxcbnBhcnNlTGVmdEhhbmRTaWRlRXhwcmVzc2lvbjogdHJ1ZSxcbnBhcnNlU3RhdGVtZW50OiB0cnVlLCBwYXJzZVNvdXJjZUVsZW1lbnQ6IHRydWUgKi9cblxuKGZ1bmN0aW9uIChyb290LCBmYWN0b3J5KSB7XG4gICAgJ3VzZSBzdHJpY3QnO1xuXG4gICAgLy8gVW5pdmVyc2FsIE1vZHVsZSBEZWZpbml0aW9uIChVTUQpIHRvIHN1cHBvcnQgQU1ELCBDb21tb25KUy9Ob2RlLmpzLFxuICAgIC8vIFJoaW5vLCBhbmQgcGxhaW4gYnJvd3NlciBsb2FkaW5nLlxuICAgIGlmICh0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQpIHtcbiAgICAgICAgZGVmaW5lKFsnZXhwb3J0cyddLCBmYWN0b3J5KTtcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiBleHBvcnRzICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICBmYWN0b3J5KGV4cG9ydHMpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGZhY3RvcnkoKHJvb3QuZXNwcmltYSA9IHt9KSk7XG4gICAgfVxufSh0aGlzLCBmdW5jdGlvbiAoZXhwb3J0cykge1xuICAgICd1c2Ugc3RyaWN0JztcblxuICAgIHZhciBUb2tlbixcbiAgICAgICAgVG9rZW5OYW1lLFxuICAgICAgICBTeW50YXgsXG4gICAgICAgIFByb3BlcnR5S2luZCxcbiAgICAgICAgTWVzc2FnZXMsXG4gICAgICAgIFJlZ2V4LFxuICAgICAgICBzb3VyY2UsXG4gICAgICAgIHN0cmljdCxcbiAgICAgICAgaW5kZXgsXG4gICAgICAgIGxpbmVOdW1iZXIsXG4gICAgICAgIGxpbmVTdGFydCxcbiAgICAgICAgbGVuZ3RoLFxuICAgICAgICBidWZmZXIsXG4gICAgICAgIHN0YXRlLFxuICAgICAgICBleHRyYTtcblxuICAgIFRva2VuID0ge1xuICAgICAgICBCb29sZWFuTGl0ZXJhbDogMSxcbiAgICAgICAgRU9GOiAyLFxuICAgICAgICBJZGVudGlmaWVyOiAzLFxuICAgICAgICBLZXl3b3JkOiA0LFxuICAgICAgICBOdWxsTGl0ZXJhbDogNSxcbiAgICAgICAgTnVtZXJpY0xpdGVyYWw6IDYsXG4gICAgICAgIFB1bmN0dWF0b3I6IDcsXG4gICAgICAgIFN0cmluZ0xpdGVyYWw6IDhcbiAgICB9O1xuXG4gICAgVG9rZW5OYW1lID0ge307XG4gICAgVG9rZW5OYW1lW1Rva2VuLkJvb2xlYW5MaXRlcmFsXSA9ICdCb29sZWFuJztcbiAgICBUb2tlbk5hbWVbVG9rZW4uRU9GXSA9ICc8ZW5kPic7XG4gICAgVG9rZW5OYW1lW1Rva2VuLklkZW50aWZpZXJdID0gJ0lkZW50aWZpZXInO1xuICAgIFRva2VuTmFtZVtUb2tlbi5LZXl3b3JkXSA9ICdLZXl3b3JkJztcbiAgICBUb2tlbk5hbWVbVG9rZW4uTnVsbExpdGVyYWxdID0gJ051bGwnO1xuICAgIFRva2VuTmFtZVtUb2tlbi5OdW1lcmljTGl0ZXJhbF0gPSAnTnVtZXJpYyc7XG4gICAgVG9rZW5OYW1lW1Rva2VuLlB1bmN0dWF0b3JdID0gJ1B1bmN0dWF0b3InO1xuICAgIFRva2VuTmFtZVtUb2tlbi5TdHJpbmdMaXRlcmFsXSA9ICdTdHJpbmcnO1xuXG4gICAgU3ludGF4ID0ge1xuICAgICAgICBBc3NpZ25tZW50RXhwcmVzc2lvbjogJ0Fzc2lnbm1lbnRFeHByZXNzaW9uJyxcbiAgICAgICAgQXJyYXlFeHByZXNzaW9uOiAnQXJyYXlFeHByZXNzaW9uJyxcbiAgICAgICAgQmxvY2tTdGF0ZW1lbnQ6ICdCbG9ja1N0YXRlbWVudCcsXG4gICAgICAgIEJpbmFyeUV4cHJlc3Npb246ICdCaW5hcnlFeHByZXNzaW9uJyxcbiAgICAgICAgQnJlYWtTdGF0ZW1lbnQ6ICdCcmVha1N0YXRlbWVudCcsXG4gICAgICAgIENhbGxFeHByZXNzaW9uOiAnQ2FsbEV4cHJlc3Npb24nLFxuICAgICAgICBDYXRjaENsYXVzZTogJ0NhdGNoQ2xhdXNlJyxcbiAgICAgICAgQ29uZGl0aW9uYWxFeHByZXNzaW9uOiAnQ29uZGl0aW9uYWxFeHByZXNzaW9uJyxcbiAgICAgICAgQ29udGludWVTdGF0ZW1lbnQ6ICdDb250aW51ZVN0YXRlbWVudCcsXG4gICAgICAgIERvV2hpbGVTdGF0ZW1lbnQ6ICdEb1doaWxlU3RhdGVtZW50JyxcbiAgICAgICAgRGVidWdnZXJTdGF0ZW1lbnQ6ICdEZWJ1Z2dlclN0YXRlbWVudCcsXG4gICAgICAgIEVtcHR5U3RhdGVtZW50OiAnRW1wdHlTdGF0ZW1lbnQnLFxuICAgICAgICBFeHByZXNzaW9uU3RhdGVtZW50OiAnRXhwcmVzc2lvblN0YXRlbWVudCcsXG4gICAgICAgIEZvclN0YXRlbWVudDogJ0ZvclN0YXRlbWVudCcsXG4gICAgICAgIEZvckluU3RhdGVtZW50OiAnRm9ySW5TdGF0ZW1lbnQnLFxuICAgICAgICBGdW5jdGlvbkRlY2xhcmF0aW9uOiAnRnVuY3Rpb25EZWNsYXJhdGlvbicsXG4gICAgICAgIEZ1bmN0aW9uRXhwcmVzc2lvbjogJ0Z1bmN0aW9uRXhwcmVzc2lvbicsXG4gICAgICAgIElkZW50aWZpZXI6ICdJZGVudGlmaWVyJyxcbiAgICAgICAgSWZTdGF0ZW1lbnQ6ICdJZlN0YXRlbWVudCcsXG4gICAgICAgIExpdGVyYWw6ICdMaXRlcmFsJyxcbiAgICAgICAgTGFiZWxlZFN0YXRlbWVudDogJ0xhYmVsZWRTdGF0ZW1lbnQnLFxuICAgICAgICBMb2dpY2FsRXhwcmVzc2lvbjogJ0xvZ2ljYWxFeHByZXNzaW9uJyxcbiAgICAgICAgTWVtYmVyRXhwcmVzc2lvbjogJ01lbWJlckV4cHJlc3Npb24nLFxuICAgICAgICBOZXdFeHByZXNzaW9uOiAnTmV3RXhwcmVzc2lvbicsXG4gICAgICAgIE9iamVjdEV4cHJlc3Npb246ICdPYmplY3RFeHByZXNzaW9uJyxcbiAgICAgICAgUHJvZ3JhbTogJ1Byb2dyYW0nLFxuICAgICAgICBQcm9wZXJ0eTogJ1Byb3BlcnR5JyxcbiAgICAgICAgUmV0dXJuU3RhdGVtZW50OiAnUmV0dXJuU3RhdGVtZW50JyxcbiAgICAgICAgU2VxdWVuY2VFeHByZXNzaW9uOiAnU2VxdWVuY2VFeHByZXNzaW9uJyxcbiAgICAgICAgU3dpdGNoU3RhdGVtZW50OiAnU3dpdGNoU3RhdGVtZW50JyxcbiAgICAgICAgU3dpdGNoQ2FzZTogJ1N3aXRjaENhc2UnLFxuICAgICAgICBUaGlzRXhwcmVzc2lvbjogJ1RoaXNFeHByZXNzaW9uJyxcbiAgICAgICAgVGhyb3dTdGF0ZW1lbnQ6ICdUaHJvd1N0YXRlbWVudCcsXG4gICAgICAgIFRyeVN0YXRlbWVudDogJ1RyeVN0YXRlbWVudCcsXG4gICAgICAgIFVuYXJ5RXhwcmVzc2lvbjogJ1VuYXJ5RXhwcmVzc2lvbicsXG4gICAgICAgIFVwZGF0ZUV4cHJlc3Npb246ICdVcGRhdGVFeHByZXNzaW9uJyxcbiAgICAgICAgVmFyaWFibGVEZWNsYXJhdGlvbjogJ1ZhcmlhYmxlRGVjbGFyYXRpb24nLFxuICAgICAgICBWYXJpYWJsZURlY2xhcmF0b3I6ICdWYXJpYWJsZURlY2xhcmF0b3InLFxuICAgICAgICBXaGlsZVN0YXRlbWVudDogJ1doaWxlU3RhdGVtZW50JyxcbiAgICAgICAgV2l0aFN0YXRlbWVudDogJ1dpdGhTdGF0ZW1lbnQnXG4gICAgfTtcblxuICAgIFByb3BlcnR5S2luZCA9IHtcbiAgICAgICAgRGF0YTogMSxcbiAgICAgICAgR2V0OiAyLFxuICAgICAgICBTZXQ6IDRcbiAgICB9O1xuXG4gICAgLy8gRXJyb3IgbWVzc2FnZXMgc2hvdWxkIGJlIGlkZW50aWNhbCB0byBWOC5cbiAgICBNZXNzYWdlcyA9IHtcbiAgICAgICAgVW5leHBlY3RlZFRva2VuOiAgJ1VuZXhwZWN0ZWQgdG9rZW4gJTAnLFxuICAgICAgICBVbmV4cGVjdGVkTnVtYmVyOiAgJ1VuZXhwZWN0ZWQgbnVtYmVyJyxcbiAgICAgICAgVW5leHBlY3RlZFN0cmluZzogICdVbmV4cGVjdGVkIHN0cmluZycsXG4gICAgICAgIFVuZXhwZWN0ZWRJZGVudGlmaWVyOiAgJ1VuZXhwZWN0ZWQgaWRlbnRpZmllcicsXG4gICAgICAgIFVuZXhwZWN0ZWRSZXNlcnZlZDogICdVbmV4cGVjdGVkIHJlc2VydmVkIHdvcmQnLFxuICAgICAgICBVbmV4cGVjdGVkRU9TOiAgJ1VuZXhwZWN0ZWQgZW5kIG9mIGlucHV0JyxcbiAgICAgICAgTmV3bGluZUFmdGVyVGhyb3c6ICAnSWxsZWdhbCBuZXdsaW5lIGFmdGVyIHRocm93JyxcbiAgICAgICAgSW52YWxpZFJlZ0V4cDogJ0ludmFsaWQgcmVndWxhciBleHByZXNzaW9uJyxcbiAgICAgICAgVW50ZXJtaW5hdGVkUmVnRXhwOiAgJ0ludmFsaWQgcmVndWxhciBleHByZXNzaW9uOiBtaXNzaW5nIC8nLFxuICAgICAgICBJbnZhbGlkTEhTSW5Bc3NpZ25tZW50OiAgJ0ludmFsaWQgbGVmdC1oYW5kIHNpZGUgaW4gYXNzaWdubWVudCcsXG4gICAgICAgIEludmFsaWRMSFNJbkZvckluOiAgJ0ludmFsaWQgbGVmdC1oYW5kIHNpZGUgaW4gZm9yLWluJyxcbiAgICAgICAgTXVsdGlwbGVEZWZhdWx0c0luU3dpdGNoOiAnTW9yZSB0aGFuIG9uZSBkZWZhdWx0IGNsYXVzZSBpbiBzd2l0Y2ggc3RhdGVtZW50JyxcbiAgICAgICAgTm9DYXRjaE9yRmluYWxseTogICdNaXNzaW5nIGNhdGNoIG9yIGZpbmFsbHkgYWZ0ZXIgdHJ5JyxcbiAgICAgICAgVW5rbm93bkxhYmVsOiAnVW5kZWZpbmVkIGxhYmVsIFxcJyUwXFwnJyxcbiAgICAgICAgUmVkZWNsYXJhdGlvbjogJyUwIFxcJyUxXFwnIGhhcyBhbHJlYWR5IGJlZW4gZGVjbGFyZWQnLFxuICAgICAgICBJbGxlZ2FsQ29udGludWU6ICdJbGxlZ2FsIGNvbnRpbnVlIHN0YXRlbWVudCcsXG4gICAgICAgIElsbGVnYWxCcmVhazogJ0lsbGVnYWwgYnJlYWsgc3RhdGVtZW50JyxcbiAgICAgICAgSWxsZWdhbFJldHVybjogJ0lsbGVnYWwgcmV0dXJuIHN0YXRlbWVudCcsXG4gICAgICAgIFN0cmljdE1vZGVXaXRoOiAgJ1N0cmljdCBtb2RlIGNvZGUgbWF5IG5vdCBpbmNsdWRlIGEgd2l0aCBzdGF0ZW1lbnQnLFxuICAgICAgICBTdHJpY3RDYXRjaFZhcmlhYmxlOiAgJ0NhdGNoIHZhcmlhYmxlIG1heSBub3QgYmUgZXZhbCBvciBhcmd1bWVudHMgaW4gc3RyaWN0IG1vZGUnLFxuICAgICAgICBTdHJpY3RWYXJOYW1lOiAgJ1ZhcmlhYmxlIG5hbWUgbWF5IG5vdCBiZSBldmFsIG9yIGFyZ3VtZW50cyBpbiBzdHJpY3QgbW9kZScsXG4gICAgICAgIFN0cmljdFBhcmFtTmFtZTogICdQYXJhbWV0ZXIgbmFtZSBldmFsIG9yIGFyZ3VtZW50cyBpcyBub3QgYWxsb3dlZCBpbiBzdHJpY3QgbW9kZScsXG4gICAgICAgIFN0cmljdFBhcmFtRHVwZTogJ1N0cmljdCBtb2RlIGZ1bmN0aW9uIG1heSBub3QgaGF2ZSBkdXBsaWNhdGUgcGFyYW1ldGVyIG5hbWVzJyxcbiAgICAgICAgU3RyaWN0RnVuY3Rpb25OYW1lOiAgJ0Z1bmN0aW9uIG5hbWUgbWF5IG5vdCBiZSBldmFsIG9yIGFyZ3VtZW50cyBpbiBzdHJpY3QgbW9kZScsXG4gICAgICAgIFN0cmljdE9jdGFsTGl0ZXJhbDogICdPY3RhbCBsaXRlcmFscyBhcmUgbm90IGFsbG93ZWQgaW4gc3RyaWN0IG1vZGUuJyxcbiAgICAgICAgU3RyaWN0RGVsZXRlOiAgJ0RlbGV0ZSBvZiBhbiB1bnF1YWxpZmllZCBpZGVudGlmaWVyIGluIHN0cmljdCBtb2RlLicsXG4gICAgICAgIFN0cmljdER1cGxpY2F0ZVByb3BlcnR5OiAgJ0R1cGxpY2F0ZSBkYXRhIHByb3BlcnR5IGluIG9iamVjdCBsaXRlcmFsIG5vdCBhbGxvd2VkIGluIHN0cmljdCBtb2RlJyxcbiAgICAgICAgQWNjZXNzb3JEYXRhUHJvcGVydHk6ICAnT2JqZWN0IGxpdGVyYWwgbWF5IG5vdCBoYXZlIGRhdGEgYW5kIGFjY2Vzc29yIHByb3BlcnR5IHdpdGggdGhlIHNhbWUgbmFtZScsXG4gICAgICAgIEFjY2Vzc29yR2V0U2V0OiAgJ09iamVjdCBsaXRlcmFsIG1heSBub3QgaGF2ZSBtdWx0aXBsZSBnZXQvc2V0IGFjY2Vzc29ycyB3aXRoIHRoZSBzYW1lIG5hbWUnLFxuICAgICAgICBTdHJpY3RMSFNBc3NpZ25tZW50OiAgJ0Fzc2lnbm1lbnQgdG8gZXZhbCBvciBhcmd1bWVudHMgaXMgbm90IGFsbG93ZWQgaW4gc3RyaWN0IG1vZGUnLFxuICAgICAgICBTdHJpY3RMSFNQb3N0Zml4OiAgJ1Bvc3RmaXggaW5jcmVtZW50L2RlY3JlbWVudCBtYXkgbm90IGhhdmUgZXZhbCBvciBhcmd1bWVudHMgb3BlcmFuZCBpbiBzdHJpY3QgbW9kZScsXG4gICAgICAgIFN0cmljdExIU1ByZWZpeDogICdQcmVmaXggaW5jcmVtZW50L2RlY3JlbWVudCBtYXkgbm90IGhhdmUgZXZhbCBvciBhcmd1bWVudHMgb3BlcmFuZCBpbiBzdHJpY3QgbW9kZScsXG4gICAgICAgIFN0cmljdFJlc2VydmVkV29yZDogICdVc2Ugb2YgZnV0dXJlIHJlc2VydmVkIHdvcmQgaW4gc3RyaWN0IG1vZGUnXG4gICAgfTtcblxuICAgIC8vIFNlZSBhbHNvIHRvb2xzL2dlbmVyYXRlLXVuaWNvZGUtcmVnZXgucHkuXG4gICAgUmVnZXggPSB7XG4gICAgICAgIE5vbkFzY2lpSWRlbnRpZmllclN0YXJ0OiBuZXcgUmVnRXhwKCdbXFx4YWFcXHhiNVxceGJhXFx4YzAtXFx4ZDZcXHhkOC1cXHhmNlxceGY4LVxcdTAyYzFcXHUwMmM2LVxcdTAyZDFcXHUwMmUwLVxcdTAyZTRcXHUwMmVjXFx1MDJlZVxcdTAzNzAtXFx1MDM3NFxcdTAzNzZcXHUwMzc3XFx1MDM3YS1cXHUwMzdkXFx1MDM4NlxcdTAzODgtXFx1MDM4YVxcdTAzOGNcXHUwMzhlLVxcdTAzYTFcXHUwM2EzLVxcdTAzZjVcXHUwM2Y3LVxcdTA0ODFcXHUwNDhhLVxcdTA1MjdcXHUwNTMxLVxcdTA1NTZcXHUwNTU5XFx1MDU2MS1cXHUwNTg3XFx1MDVkMC1cXHUwNWVhXFx1MDVmMC1cXHUwNWYyXFx1MDYyMC1cXHUwNjRhXFx1MDY2ZVxcdTA2NmZcXHUwNjcxLVxcdTA2ZDNcXHUwNmQ1XFx1MDZlNVxcdTA2ZTZcXHUwNmVlXFx1MDZlZlxcdTA2ZmEtXFx1MDZmY1xcdTA2ZmZcXHUwNzEwXFx1MDcxMi1cXHUwNzJmXFx1MDc0ZC1cXHUwN2E1XFx1MDdiMVxcdTA3Y2EtXFx1MDdlYVxcdTA3ZjRcXHUwN2Y1XFx1MDdmYVxcdTA4MDAtXFx1MDgxNVxcdTA4MWFcXHUwODI0XFx1MDgyOFxcdTA4NDAtXFx1MDg1OFxcdTA4YTBcXHUwOGEyLVxcdTA4YWNcXHUwOTA0LVxcdTA5MzlcXHUwOTNkXFx1MDk1MFxcdTA5NTgtXFx1MDk2MVxcdTA5NzEtXFx1MDk3N1xcdTA5NzktXFx1MDk3ZlxcdTA5ODUtXFx1MDk4Y1xcdTA5OGZcXHUwOTkwXFx1MDk5My1cXHUwOWE4XFx1MDlhYS1cXHUwOWIwXFx1MDliMlxcdTA5YjYtXFx1MDliOVxcdTA5YmRcXHUwOWNlXFx1MDlkY1xcdTA5ZGRcXHUwOWRmLVxcdTA5ZTFcXHUwOWYwXFx1MDlmMVxcdTBhMDUtXFx1MGEwYVxcdTBhMGZcXHUwYTEwXFx1MGExMy1cXHUwYTI4XFx1MGEyYS1cXHUwYTMwXFx1MGEzMlxcdTBhMzNcXHUwYTM1XFx1MGEzNlxcdTBhMzhcXHUwYTM5XFx1MGE1OS1cXHUwYTVjXFx1MGE1ZVxcdTBhNzItXFx1MGE3NFxcdTBhODUtXFx1MGE4ZFxcdTBhOGYtXFx1MGE5MVxcdTBhOTMtXFx1MGFhOFxcdTBhYWEtXFx1MGFiMFxcdTBhYjJcXHUwYWIzXFx1MGFiNS1cXHUwYWI5XFx1MGFiZFxcdTBhZDBcXHUwYWUwXFx1MGFlMVxcdTBiMDUtXFx1MGIwY1xcdTBiMGZcXHUwYjEwXFx1MGIxMy1cXHUwYjI4XFx1MGIyYS1cXHUwYjMwXFx1MGIzMlxcdTBiMzNcXHUwYjM1LVxcdTBiMzlcXHUwYjNkXFx1MGI1Y1xcdTBiNWRcXHUwYjVmLVxcdTBiNjFcXHUwYjcxXFx1MGI4M1xcdTBiODUtXFx1MGI4YVxcdTBiOGUtXFx1MGI5MFxcdTBiOTItXFx1MGI5NVxcdTBiOTlcXHUwYjlhXFx1MGI5Y1xcdTBiOWVcXHUwYjlmXFx1MGJhM1xcdTBiYTRcXHUwYmE4LVxcdTBiYWFcXHUwYmFlLVxcdTBiYjlcXHUwYmQwXFx1MGMwNS1cXHUwYzBjXFx1MGMwZS1cXHUwYzEwXFx1MGMxMi1cXHUwYzI4XFx1MGMyYS1cXHUwYzMzXFx1MGMzNS1cXHUwYzM5XFx1MGMzZFxcdTBjNThcXHUwYzU5XFx1MGM2MFxcdTBjNjFcXHUwYzg1LVxcdTBjOGNcXHUwYzhlLVxcdTBjOTBcXHUwYzkyLVxcdTBjYThcXHUwY2FhLVxcdTBjYjNcXHUwY2I1LVxcdTBjYjlcXHUwY2JkXFx1MGNkZVxcdTBjZTBcXHUwY2UxXFx1MGNmMVxcdTBjZjJcXHUwZDA1LVxcdTBkMGNcXHUwZDBlLVxcdTBkMTBcXHUwZDEyLVxcdTBkM2FcXHUwZDNkXFx1MGQ0ZVxcdTBkNjBcXHUwZDYxXFx1MGQ3YS1cXHUwZDdmXFx1MGQ4NS1cXHUwZDk2XFx1MGQ5YS1cXHUwZGIxXFx1MGRiMy1cXHUwZGJiXFx1MGRiZFxcdTBkYzAtXFx1MGRjNlxcdTBlMDEtXFx1MGUzMFxcdTBlMzJcXHUwZTMzXFx1MGU0MC1cXHUwZTQ2XFx1MGU4MVxcdTBlODJcXHUwZTg0XFx1MGU4N1xcdTBlODhcXHUwZThhXFx1MGU4ZFxcdTBlOTQtXFx1MGU5N1xcdTBlOTktXFx1MGU5ZlxcdTBlYTEtXFx1MGVhM1xcdTBlYTVcXHUwZWE3XFx1MGVhYVxcdTBlYWJcXHUwZWFkLVxcdTBlYjBcXHUwZWIyXFx1MGViM1xcdTBlYmRcXHUwZWMwLVxcdTBlYzRcXHUwZWM2XFx1MGVkYy1cXHUwZWRmXFx1MGYwMFxcdTBmNDAtXFx1MGY0N1xcdTBmNDktXFx1MGY2Y1xcdTBmODgtXFx1MGY4Y1xcdTEwMDAtXFx1MTAyYVxcdTEwM2ZcXHUxMDUwLVxcdTEwNTVcXHUxMDVhLVxcdTEwNWRcXHUxMDYxXFx1MTA2NVxcdTEwNjZcXHUxMDZlLVxcdTEwNzBcXHUxMDc1LVxcdTEwODFcXHUxMDhlXFx1MTBhMC1cXHUxMGM1XFx1MTBjN1xcdTEwY2RcXHUxMGQwLVxcdTEwZmFcXHUxMGZjLVxcdTEyNDhcXHUxMjRhLVxcdTEyNGRcXHUxMjUwLVxcdTEyNTZcXHUxMjU4XFx1MTI1YS1cXHUxMjVkXFx1MTI2MC1cXHUxMjg4XFx1MTI4YS1cXHUxMjhkXFx1MTI5MC1cXHUxMmIwXFx1MTJiMi1cXHUxMmI1XFx1MTJiOC1cXHUxMmJlXFx1MTJjMFxcdTEyYzItXFx1MTJjNVxcdTEyYzgtXFx1MTJkNlxcdTEyZDgtXFx1MTMxMFxcdTEzMTItXFx1MTMxNVxcdTEzMTgtXFx1MTM1YVxcdTEzODAtXFx1MTM4ZlxcdTEzYTAtXFx1MTNmNFxcdTE0MDEtXFx1MTY2Y1xcdTE2NmYtXFx1MTY3ZlxcdTE2ODEtXFx1MTY5YVxcdTE2YTAtXFx1MTZlYVxcdTE2ZWUtXFx1MTZmMFxcdTE3MDAtXFx1MTcwY1xcdTE3MGUtXFx1MTcxMVxcdTE3MjAtXFx1MTczMVxcdTE3NDAtXFx1MTc1MVxcdTE3NjAtXFx1MTc2Y1xcdTE3NmUtXFx1MTc3MFxcdTE3ODAtXFx1MTdiM1xcdTE3ZDdcXHUxN2RjXFx1MTgyMC1cXHUxODc3XFx1MTg4MC1cXHUxOGE4XFx1MThhYVxcdTE4YjAtXFx1MThmNVxcdTE5MDAtXFx1MTkxY1xcdTE5NTAtXFx1MTk2ZFxcdTE5NzAtXFx1MTk3NFxcdTE5ODAtXFx1MTlhYlxcdTE5YzEtXFx1MTljN1xcdTFhMDAtXFx1MWExNlxcdTFhMjAtXFx1MWE1NFxcdTFhYTdcXHUxYjA1LVxcdTFiMzNcXHUxYjQ1LVxcdTFiNGJcXHUxYjgzLVxcdTFiYTBcXHUxYmFlXFx1MWJhZlxcdTFiYmEtXFx1MWJlNVxcdTFjMDAtXFx1MWMyM1xcdTFjNGQtXFx1MWM0ZlxcdTFjNWEtXFx1MWM3ZFxcdTFjZTktXFx1MWNlY1xcdTFjZWUtXFx1MWNmMVxcdTFjZjVcXHUxY2Y2XFx1MWQwMC1cXHUxZGJmXFx1MWUwMC1cXHUxZjE1XFx1MWYxOC1cXHUxZjFkXFx1MWYyMC1cXHUxZjQ1XFx1MWY0OC1cXHUxZjRkXFx1MWY1MC1cXHUxZjU3XFx1MWY1OVxcdTFmNWJcXHUxZjVkXFx1MWY1Zi1cXHUxZjdkXFx1MWY4MC1cXHUxZmI0XFx1MWZiNi1cXHUxZmJjXFx1MWZiZVxcdTFmYzItXFx1MWZjNFxcdTFmYzYtXFx1MWZjY1xcdTFmZDAtXFx1MWZkM1xcdTFmZDYtXFx1MWZkYlxcdTFmZTAtXFx1MWZlY1xcdTFmZjItXFx1MWZmNFxcdTFmZjYtXFx1MWZmY1xcdTIwNzFcXHUyMDdmXFx1MjA5MC1cXHUyMDljXFx1MjEwMlxcdTIxMDdcXHUyMTBhLVxcdTIxMTNcXHUyMTE1XFx1MjExOS1cXHUyMTFkXFx1MjEyNFxcdTIxMjZcXHUyMTI4XFx1MjEyYS1cXHUyMTJkXFx1MjEyZi1cXHUyMTM5XFx1MjEzYy1cXHUyMTNmXFx1MjE0NS1cXHUyMTQ5XFx1MjE0ZVxcdTIxNjAtXFx1MjE4OFxcdTJjMDAtXFx1MmMyZVxcdTJjMzAtXFx1MmM1ZVxcdTJjNjAtXFx1MmNlNFxcdTJjZWItXFx1MmNlZVxcdTJjZjJcXHUyY2YzXFx1MmQwMC1cXHUyZDI1XFx1MmQyN1xcdTJkMmRcXHUyZDMwLVxcdTJkNjdcXHUyZDZmXFx1MmQ4MC1cXHUyZDk2XFx1MmRhMC1cXHUyZGE2XFx1MmRhOC1cXHUyZGFlXFx1MmRiMC1cXHUyZGI2XFx1MmRiOC1cXHUyZGJlXFx1MmRjMC1cXHUyZGM2XFx1MmRjOC1cXHUyZGNlXFx1MmRkMC1cXHUyZGQ2XFx1MmRkOC1cXHUyZGRlXFx1MmUyZlxcdTMwMDUtXFx1MzAwN1xcdTMwMjEtXFx1MzAyOVxcdTMwMzEtXFx1MzAzNVxcdTMwMzgtXFx1MzAzY1xcdTMwNDEtXFx1MzA5NlxcdTMwOWQtXFx1MzA5ZlxcdTMwYTEtXFx1MzBmYVxcdTMwZmMtXFx1MzBmZlxcdTMxMDUtXFx1MzEyZFxcdTMxMzEtXFx1MzE4ZVxcdTMxYTAtXFx1MzFiYVxcdTMxZjAtXFx1MzFmZlxcdTM0MDAtXFx1NGRiNVxcdTRlMDAtXFx1OWZjY1xcdWEwMDAtXFx1YTQ4Y1xcdWE0ZDAtXFx1YTRmZFxcdWE1MDAtXFx1YTYwY1xcdWE2MTAtXFx1YTYxZlxcdWE2MmFcXHVhNjJiXFx1YTY0MC1cXHVhNjZlXFx1YTY3Zi1cXHVhNjk3XFx1YTZhMC1cXHVhNmVmXFx1YTcxNy1cXHVhNzFmXFx1YTcyMi1cXHVhNzg4XFx1YTc4Yi1cXHVhNzhlXFx1YTc5MC1cXHVhNzkzXFx1YTdhMC1cXHVhN2FhXFx1YTdmOC1cXHVhODAxXFx1YTgwMy1cXHVhODA1XFx1YTgwNy1cXHVhODBhXFx1YTgwYy1cXHVhODIyXFx1YTg0MC1cXHVhODczXFx1YTg4Mi1cXHVhOGIzXFx1YThmMi1cXHVhOGY3XFx1YThmYlxcdWE5MGEtXFx1YTkyNVxcdWE5MzAtXFx1YTk0NlxcdWE5NjAtXFx1YTk3Y1xcdWE5ODQtXFx1YTliMlxcdWE5Y2ZcXHVhYTAwLVxcdWFhMjhcXHVhYTQwLVxcdWFhNDJcXHVhYTQ0LVxcdWFhNGJcXHVhYTYwLVxcdWFhNzZcXHVhYTdhXFx1YWE4MC1cXHVhYWFmXFx1YWFiMVxcdWFhYjVcXHVhYWI2XFx1YWFiOS1cXHVhYWJkXFx1YWFjMFxcdWFhYzJcXHVhYWRiLVxcdWFhZGRcXHVhYWUwLVxcdWFhZWFcXHVhYWYyLVxcdWFhZjRcXHVhYjAxLVxcdWFiMDZcXHVhYjA5LVxcdWFiMGVcXHVhYjExLVxcdWFiMTZcXHVhYjIwLVxcdWFiMjZcXHVhYjI4LVxcdWFiMmVcXHVhYmMwLVxcdWFiZTJcXHVhYzAwLVxcdWQ3YTNcXHVkN2IwLVxcdWQ3YzZcXHVkN2NiLVxcdWQ3ZmJcXHVmOTAwLVxcdWZhNmRcXHVmYTcwLVxcdWZhZDlcXHVmYjAwLVxcdWZiMDZcXHVmYjEzLVxcdWZiMTdcXHVmYjFkXFx1ZmIxZi1cXHVmYjI4XFx1ZmIyYS1cXHVmYjM2XFx1ZmIzOC1cXHVmYjNjXFx1ZmIzZVxcdWZiNDBcXHVmYjQxXFx1ZmI0M1xcdWZiNDRcXHVmYjQ2LVxcdWZiYjFcXHVmYmQzLVxcdWZkM2RcXHVmZDUwLVxcdWZkOGZcXHVmZDkyLVxcdWZkYzdcXHVmZGYwLVxcdWZkZmJcXHVmZTcwLVxcdWZlNzRcXHVmZTc2LVxcdWZlZmNcXHVmZjIxLVxcdWZmM2FcXHVmZjQxLVxcdWZmNWFcXHVmZjY2LVxcdWZmYmVcXHVmZmMyLVxcdWZmYzdcXHVmZmNhLVxcdWZmY2ZcXHVmZmQyLVxcdWZmZDdcXHVmZmRhLVxcdWZmZGNdJyksXG4gICAgICAgIE5vbkFzY2lpSWRlbnRpZmllclBhcnQ6IG5ldyBSZWdFeHAoJ1tcXHhhYVxceGI1XFx4YmFcXHhjMC1cXHhkNlxceGQ4LVxceGY2XFx4ZjgtXFx1MDJjMVxcdTAyYzYtXFx1MDJkMVxcdTAyZTAtXFx1MDJlNFxcdTAyZWNcXHUwMmVlXFx1MDMwMC1cXHUwMzc0XFx1MDM3NlxcdTAzNzdcXHUwMzdhLVxcdTAzN2RcXHUwMzg2XFx1MDM4OC1cXHUwMzhhXFx1MDM4Y1xcdTAzOGUtXFx1MDNhMVxcdTAzYTMtXFx1MDNmNVxcdTAzZjctXFx1MDQ4MVxcdTA0ODMtXFx1MDQ4N1xcdTA0OGEtXFx1MDUyN1xcdTA1MzEtXFx1MDU1NlxcdTA1NTlcXHUwNTYxLVxcdTA1ODdcXHUwNTkxLVxcdTA1YmRcXHUwNWJmXFx1MDVjMVxcdTA1YzJcXHUwNWM0XFx1MDVjNVxcdTA1YzdcXHUwNWQwLVxcdTA1ZWFcXHUwNWYwLVxcdTA1ZjJcXHUwNjEwLVxcdTA2MWFcXHUwNjIwLVxcdTA2NjlcXHUwNjZlLVxcdTA2ZDNcXHUwNmQ1LVxcdTA2ZGNcXHUwNmRmLVxcdTA2ZThcXHUwNmVhLVxcdTA2ZmNcXHUwNmZmXFx1MDcxMC1cXHUwNzRhXFx1MDc0ZC1cXHUwN2IxXFx1MDdjMC1cXHUwN2Y1XFx1MDdmYVxcdTA4MDAtXFx1MDgyZFxcdTA4NDAtXFx1MDg1YlxcdTA4YTBcXHUwOGEyLVxcdTA4YWNcXHUwOGU0LVxcdTA4ZmVcXHUwOTAwLVxcdTA5NjNcXHUwOTY2LVxcdTA5NmZcXHUwOTcxLVxcdTA5NzdcXHUwOTc5LVxcdTA5N2ZcXHUwOTgxLVxcdTA5ODNcXHUwOTg1LVxcdTA5OGNcXHUwOThmXFx1MDk5MFxcdTA5OTMtXFx1MDlhOFxcdTA5YWEtXFx1MDliMFxcdTA5YjJcXHUwOWI2LVxcdTA5YjlcXHUwOWJjLVxcdTA5YzRcXHUwOWM3XFx1MDljOFxcdTA5Y2ItXFx1MDljZVxcdTA5ZDdcXHUwOWRjXFx1MDlkZFxcdTA5ZGYtXFx1MDllM1xcdTA5ZTYtXFx1MDlmMVxcdTBhMDEtXFx1MGEwM1xcdTBhMDUtXFx1MGEwYVxcdTBhMGZcXHUwYTEwXFx1MGExMy1cXHUwYTI4XFx1MGEyYS1cXHUwYTMwXFx1MGEzMlxcdTBhMzNcXHUwYTM1XFx1MGEzNlxcdTBhMzhcXHUwYTM5XFx1MGEzY1xcdTBhM2UtXFx1MGE0MlxcdTBhNDdcXHUwYTQ4XFx1MGE0Yi1cXHUwYTRkXFx1MGE1MVxcdTBhNTktXFx1MGE1Y1xcdTBhNWVcXHUwYTY2LVxcdTBhNzVcXHUwYTgxLVxcdTBhODNcXHUwYTg1LVxcdTBhOGRcXHUwYThmLVxcdTBhOTFcXHUwYTkzLVxcdTBhYThcXHUwYWFhLVxcdTBhYjBcXHUwYWIyXFx1MGFiM1xcdTBhYjUtXFx1MGFiOVxcdTBhYmMtXFx1MGFjNVxcdTBhYzctXFx1MGFjOVxcdTBhY2ItXFx1MGFjZFxcdTBhZDBcXHUwYWUwLVxcdTBhZTNcXHUwYWU2LVxcdTBhZWZcXHUwYjAxLVxcdTBiMDNcXHUwYjA1LVxcdTBiMGNcXHUwYjBmXFx1MGIxMFxcdTBiMTMtXFx1MGIyOFxcdTBiMmEtXFx1MGIzMFxcdTBiMzJcXHUwYjMzXFx1MGIzNS1cXHUwYjM5XFx1MGIzYy1cXHUwYjQ0XFx1MGI0N1xcdTBiNDhcXHUwYjRiLVxcdTBiNGRcXHUwYjU2XFx1MGI1N1xcdTBiNWNcXHUwYjVkXFx1MGI1Zi1cXHUwYjYzXFx1MGI2Ni1cXHUwYjZmXFx1MGI3MVxcdTBiODJcXHUwYjgzXFx1MGI4NS1cXHUwYjhhXFx1MGI4ZS1cXHUwYjkwXFx1MGI5Mi1cXHUwYjk1XFx1MGI5OVxcdTBiOWFcXHUwYjljXFx1MGI5ZVxcdTBiOWZcXHUwYmEzXFx1MGJhNFxcdTBiYTgtXFx1MGJhYVxcdTBiYWUtXFx1MGJiOVxcdTBiYmUtXFx1MGJjMlxcdTBiYzYtXFx1MGJjOFxcdTBiY2EtXFx1MGJjZFxcdTBiZDBcXHUwYmQ3XFx1MGJlNi1cXHUwYmVmXFx1MGMwMS1cXHUwYzAzXFx1MGMwNS1cXHUwYzBjXFx1MGMwZS1cXHUwYzEwXFx1MGMxMi1cXHUwYzI4XFx1MGMyYS1cXHUwYzMzXFx1MGMzNS1cXHUwYzM5XFx1MGMzZC1cXHUwYzQ0XFx1MGM0Ni1cXHUwYzQ4XFx1MGM0YS1cXHUwYzRkXFx1MGM1NVxcdTBjNTZcXHUwYzU4XFx1MGM1OVxcdTBjNjAtXFx1MGM2M1xcdTBjNjYtXFx1MGM2ZlxcdTBjODJcXHUwYzgzXFx1MGM4NS1cXHUwYzhjXFx1MGM4ZS1cXHUwYzkwXFx1MGM5Mi1cXHUwY2E4XFx1MGNhYS1cXHUwY2IzXFx1MGNiNS1cXHUwY2I5XFx1MGNiYy1cXHUwY2M0XFx1MGNjNi1cXHUwY2M4XFx1MGNjYS1cXHUwY2NkXFx1MGNkNVxcdTBjZDZcXHUwY2RlXFx1MGNlMC1cXHUwY2UzXFx1MGNlNi1cXHUwY2VmXFx1MGNmMVxcdTBjZjJcXHUwZDAyXFx1MGQwM1xcdTBkMDUtXFx1MGQwY1xcdTBkMGUtXFx1MGQxMFxcdTBkMTItXFx1MGQzYVxcdTBkM2QtXFx1MGQ0NFxcdTBkNDYtXFx1MGQ0OFxcdTBkNGEtXFx1MGQ0ZVxcdTBkNTdcXHUwZDYwLVxcdTBkNjNcXHUwZDY2LVxcdTBkNmZcXHUwZDdhLVxcdTBkN2ZcXHUwZDgyXFx1MGQ4M1xcdTBkODUtXFx1MGQ5NlxcdTBkOWEtXFx1MGRiMVxcdTBkYjMtXFx1MGRiYlxcdTBkYmRcXHUwZGMwLVxcdTBkYzZcXHUwZGNhXFx1MGRjZi1cXHUwZGQ0XFx1MGRkNlxcdTBkZDgtXFx1MGRkZlxcdTBkZjJcXHUwZGYzXFx1MGUwMS1cXHUwZTNhXFx1MGU0MC1cXHUwZTRlXFx1MGU1MC1cXHUwZTU5XFx1MGU4MVxcdTBlODJcXHUwZTg0XFx1MGU4N1xcdTBlODhcXHUwZThhXFx1MGU4ZFxcdTBlOTQtXFx1MGU5N1xcdTBlOTktXFx1MGU5ZlxcdTBlYTEtXFx1MGVhM1xcdTBlYTVcXHUwZWE3XFx1MGVhYVxcdTBlYWJcXHUwZWFkLVxcdTBlYjlcXHUwZWJiLVxcdTBlYmRcXHUwZWMwLVxcdTBlYzRcXHUwZWM2XFx1MGVjOC1cXHUwZWNkXFx1MGVkMC1cXHUwZWQ5XFx1MGVkYy1cXHUwZWRmXFx1MGYwMFxcdTBmMThcXHUwZjE5XFx1MGYyMC1cXHUwZjI5XFx1MGYzNVxcdTBmMzdcXHUwZjM5XFx1MGYzZS1cXHUwZjQ3XFx1MGY0OS1cXHUwZjZjXFx1MGY3MS1cXHUwZjg0XFx1MGY4Ni1cXHUwZjk3XFx1MGY5OS1cXHUwZmJjXFx1MGZjNlxcdTEwMDAtXFx1MTA0OVxcdTEwNTAtXFx1MTA5ZFxcdTEwYTAtXFx1MTBjNVxcdTEwYzdcXHUxMGNkXFx1MTBkMC1cXHUxMGZhXFx1MTBmYy1cXHUxMjQ4XFx1MTI0YS1cXHUxMjRkXFx1MTI1MC1cXHUxMjU2XFx1MTI1OFxcdTEyNWEtXFx1MTI1ZFxcdTEyNjAtXFx1MTI4OFxcdTEyOGEtXFx1MTI4ZFxcdTEyOTAtXFx1MTJiMFxcdTEyYjItXFx1MTJiNVxcdTEyYjgtXFx1MTJiZVxcdTEyYzBcXHUxMmMyLVxcdTEyYzVcXHUxMmM4LVxcdTEyZDZcXHUxMmQ4LVxcdTEzMTBcXHUxMzEyLVxcdTEzMTVcXHUxMzE4LVxcdTEzNWFcXHUxMzVkLVxcdTEzNWZcXHUxMzgwLVxcdTEzOGZcXHUxM2EwLVxcdTEzZjRcXHUxNDAxLVxcdTE2NmNcXHUxNjZmLVxcdTE2N2ZcXHUxNjgxLVxcdTE2OWFcXHUxNmEwLVxcdTE2ZWFcXHUxNmVlLVxcdTE2ZjBcXHUxNzAwLVxcdTE3MGNcXHUxNzBlLVxcdTE3MTRcXHUxNzIwLVxcdTE3MzRcXHUxNzQwLVxcdTE3NTNcXHUxNzYwLVxcdTE3NmNcXHUxNzZlLVxcdTE3NzBcXHUxNzcyXFx1MTc3M1xcdTE3ODAtXFx1MTdkM1xcdTE3ZDdcXHUxN2RjXFx1MTdkZFxcdTE3ZTAtXFx1MTdlOVxcdTE4MGItXFx1MTgwZFxcdTE4MTAtXFx1MTgxOVxcdTE4MjAtXFx1MTg3N1xcdTE4ODAtXFx1MThhYVxcdTE4YjAtXFx1MThmNVxcdTE5MDAtXFx1MTkxY1xcdTE5MjAtXFx1MTkyYlxcdTE5MzAtXFx1MTkzYlxcdTE5NDYtXFx1MTk2ZFxcdTE5NzAtXFx1MTk3NFxcdTE5ODAtXFx1MTlhYlxcdTE5YjAtXFx1MTljOVxcdTE5ZDAtXFx1MTlkOVxcdTFhMDAtXFx1MWExYlxcdTFhMjAtXFx1MWE1ZVxcdTFhNjAtXFx1MWE3Y1xcdTFhN2YtXFx1MWE4OVxcdTFhOTAtXFx1MWE5OVxcdTFhYTdcXHUxYjAwLVxcdTFiNGJcXHUxYjUwLVxcdTFiNTlcXHUxYjZiLVxcdTFiNzNcXHUxYjgwLVxcdTFiZjNcXHUxYzAwLVxcdTFjMzdcXHUxYzQwLVxcdTFjNDlcXHUxYzRkLVxcdTFjN2RcXHUxY2QwLVxcdTFjZDJcXHUxY2Q0LVxcdTFjZjZcXHUxZDAwLVxcdTFkZTZcXHUxZGZjLVxcdTFmMTVcXHUxZjE4LVxcdTFmMWRcXHUxZjIwLVxcdTFmNDVcXHUxZjQ4LVxcdTFmNGRcXHUxZjUwLVxcdTFmNTdcXHUxZjU5XFx1MWY1YlxcdTFmNWRcXHUxZjVmLVxcdTFmN2RcXHUxZjgwLVxcdTFmYjRcXHUxZmI2LVxcdTFmYmNcXHUxZmJlXFx1MWZjMi1cXHUxZmM0XFx1MWZjNi1cXHUxZmNjXFx1MWZkMC1cXHUxZmQzXFx1MWZkNi1cXHUxZmRiXFx1MWZlMC1cXHUxZmVjXFx1MWZmMi1cXHUxZmY0XFx1MWZmNi1cXHUxZmZjXFx1MjAwY1xcdTIwMGRcXHUyMDNmXFx1MjA0MFxcdTIwNTRcXHUyMDcxXFx1MjA3ZlxcdTIwOTAtXFx1MjA5Y1xcdTIwZDAtXFx1MjBkY1xcdTIwZTFcXHUyMGU1LVxcdTIwZjBcXHUyMTAyXFx1MjEwN1xcdTIxMGEtXFx1MjExM1xcdTIxMTVcXHUyMTE5LVxcdTIxMWRcXHUyMTI0XFx1MjEyNlxcdTIxMjhcXHUyMTJhLVxcdTIxMmRcXHUyMTJmLVxcdTIxMzlcXHUyMTNjLVxcdTIxM2ZcXHUyMTQ1LVxcdTIxNDlcXHUyMTRlXFx1MjE2MC1cXHUyMTg4XFx1MmMwMC1cXHUyYzJlXFx1MmMzMC1cXHUyYzVlXFx1MmM2MC1cXHUyY2U0XFx1MmNlYi1cXHUyY2YzXFx1MmQwMC1cXHUyZDI1XFx1MmQyN1xcdTJkMmRcXHUyZDMwLVxcdTJkNjdcXHUyZDZmXFx1MmQ3Zi1cXHUyZDk2XFx1MmRhMC1cXHUyZGE2XFx1MmRhOC1cXHUyZGFlXFx1MmRiMC1cXHUyZGI2XFx1MmRiOC1cXHUyZGJlXFx1MmRjMC1cXHUyZGM2XFx1MmRjOC1cXHUyZGNlXFx1MmRkMC1cXHUyZGQ2XFx1MmRkOC1cXHUyZGRlXFx1MmRlMC1cXHUyZGZmXFx1MmUyZlxcdTMwMDUtXFx1MzAwN1xcdTMwMjEtXFx1MzAyZlxcdTMwMzEtXFx1MzAzNVxcdTMwMzgtXFx1MzAzY1xcdTMwNDEtXFx1MzA5NlxcdTMwOTlcXHUzMDlhXFx1MzA5ZC1cXHUzMDlmXFx1MzBhMS1cXHUzMGZhXFx1MzBmYy1cXHUzMGZmXFx1MzEwNS1cXHUzMTJkXFx1MzEzMS1cXHUzMThlXFx1MzFhMC1cXHUzMWJhXFx1MzFmMC1cXHUzMWZmXFx1MzQwMC1cXHU0ZGI1XFx1NGUwMC1cXHU5ZmNjXFx1YTAwMC1cXHVhNDhjXFx1YTRkMC1cXHVhNGZkXFx1YTUwMC1cXHVhNjBjXFx1YTYxMC1cXHVhNjJiXFx1YTY0MC1cXHVhNjZmXFx1YTY3NC1cXHVhNjdkXFx1YTY3Zi1cXHVhNjk3XFx1YTY5Zi1cXHVhNmYxXFx1YTcxNy1cXHVhNzFmXFx1YTcyMi1cXHVhNzg4XFx1YTc4Yi1cXHVhNzhlXFx1YTc5MC1cXHVhNzkzXFx1YTdhMC1cXHVhN2FhXFx1YTdmOC1cXHVhODI3XFx1YTg0MC1cXHVhODczXFx1YTg4MC1cXHVhOGM0XFx1YThkMC1cXHVhOGQ5XFx1YThlMC1cXHVhOGY3XFx1YThmYlxcdWE5MDAtXFx1YTkyZFxcdWE5MzAtXFx1YTk1M1xcdWE5NjAtXFx1YTk3Y1xcdWE5ODAtXFx1YTljMFxcdWE5Y2YtXFx1YTlkOVxcdWFhMDAtXFx1YWEzNlxcdWFhNDAtXFx1YWE0ZFxcdWFhNTAtXFx1YWE1OVxcdWFhNjAtXFx1YWE3NlxcdWFhN2FcXHVhYTdiXFx1YWE4MC1cXHVhYWMyXFx1YWFkYi1cXHVhYWRkXFx1YWFlMC1cXHVhYWVmXFx1YWFmMi1cXHVhYWY2XFx1YWIwMS1cXHVhYjA2XFx1YWIwOS1cXHVhYjBlXFx1YWIxMS1cXHVhYjE2XFx1YWIyMC1cXHVhYjI2XFx1YWIyOC1cXHVhYjJlXFx1YWJjMC1cXHVhYmVhXFx1YWJlY1xcdWFiZWRcXHVhYmYwLVxcdWFiZjlcXHVhYzAwLVxcdWQ3YTNcXHVkN2IwLVxcdWQ3YzZcXHVkN2NiLVxcdWQ3ZmJcXHVmOTAwLVxcdWZhNmRcXHVmYTcwLVxcdWZhZDlcXHVmYjAwLVxcdWZiMDZcXHVmYjEzLVxcdWZiMTdcXHVmYjFkLVxcdWZiMjhcXHVmYjJhLVxcdWZiMzZcXHVmYjM4LVxcdWZiM2NcXHVmYjNlXFx1ZmI0MFxcdWZiNDFcXHVmYjQzXFx1ZmI0NFxcdWZiNDYtXFx1ZmJiMVxcdWZiZDMtXFx1ZmQzZFxcdWZkNTAtXFx1ZmQ4ZlxcdWZkOTItXFx1ZmRjN1xcdWZkZjAtXFx1ZmRmYlxcdWZlMDAtXFx1ZmUwZlxcdWZlMjAtXFx1ZmUyNlxcdWZlMzNcXHVmZTM0XFx1ZmU0ZC1cXHVmZTRmXFx1ZmU3MC1cXHVmZTc0XFx1ZmU3Ni1cXHVmZWZjXFx1ZmYxMC1cXHVmZjE5XFx1ZmYyMS1cXHVmZjNhXFx1ZmYzZlxcdWZmNDEtXFx1ZmY1YVxcdWZmNjYtXFx1ZmZiZVxcdWZmYzItXFx1ZmZjN1xcdWZmY2EtXFx1ZmZjZlxcdWZmZDItXFx1ZmZkN1xcdWZmZGEtXFx1ZmZkY10nKVxuICAgIH07XG5cbiAgICAvLyBFbnN1cmUgdGhlIGNvbmRpdGlvbiBpcyB0cnVlLCBvdGhlcndpc2UgdGhyb3cgYW4gZXJyb3IuXG4gICAgLy8gVGhpcyBpcyBvbmx5IHRvIGhhdmUgYSBiZXR0ZXIgY29udHJhY3Qgc2VtYW50aWMsIGkuZS4gYW5vdGhlciBzYWZldHkgbmV0XG4gICAgLy8gdG8gY2F0Y2ggYSBsb2dpYyBlcnJvci4gVGhlIGNvbmRpdGlvbiBzaGFsbCBiZSBmdWxmaWxsZWQgaW4gbm9ybWFsIGNhc2UuXG4gICAgLy8gRG8gTk9UIHVzZSB0aGlzIHRvIGVuZm9yY2UgYSBjZXJ0YWluIGNvbmRpdGlvbiBvbiBhbnkgdXNlciBpbnB1dC5cblxuICAgIGZ1bmN0aW9uIGFzc2VydChjb25kaXRpb24sIG1lc3NhZ2UpIHtcbiAgICAgICAgaWYgKCFjb25kaXRpb24pIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignQVNTRVJUOiAnICsgbWVzc2FnZSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBzbGljZVNvdXJjZShmcm9tLCB0bykge1xuICAgICAgICByZXR1cm4gc291cmNlLnNsaWNlKGZyb20sIHRvKTtcbiAgICB9XG5cbiAgICBpZiAodHlwZW9mICdlc3ByaW1hJ1swXSA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgc2xpY2VTb3VyY2UgPSBmdW5jdGlvbiBzbGljZUFycmF5U291cmNlKGZyb20sIHRvKSB7XG4gICAgICAgICAgICByZXR1cm4gc291cmNlLnNsaWNlKGZyb20sIHRvKS5qb2luKCcnKTtcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBpc0RlY2ltYWxEaWdpdChjaCkge1xuICAgICAgICByZXR1cm4gJzAxMjM0NTY3ODknLmluZGV4T2YoY2gpID49IDA7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gaXNIZXhEaWdpdChjaCkge1xuICAgICAgICByZXR1cm4gJzAxMjM0NTY3ODlhYmNkZWZBQkNERUYnLmluZGV4T2YoY2gpID49IDA7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gaXNPY3RhbERpZ2l0KGNoKSB7XG4gICAgICAgIHJldHVybiAnMDEyMzQ1NjcnLmluZGV4T2YoY2gpID49IDA7XG4gICAgfVxuXG5cbiAgICAvLyA3LjIgV2hpdGUgU3BhY2VcblxuICAgIGZ1bmN0aW9uIGlzV2hpdGVTcGFjZShjaCkge1xuICAgICAgICByZXR1cm4gKGNoID09PSAnICcpIHx8IChjaCA9PT0gJ1xcdTAwMDknKSB8fCAoY2ggPT09ICdcXHUwMDBCJykgfHxcbiAgICAgICAgICAgIChjaCA9PT0gJ1xcdTAwMEMnKSB8fCAoY2ggPT09ICdcXHUwMEEwJykgfHxcbiAgICAgICAgICAgIChjaC5jaGFyQ29kZUF0KDApID49IDB4MTY4MCAmJlxuICAgICAgICAgICAgICdcXHUxNjgwXFx1MTgwRVxcdTIwMDBcXHUyMDAxXFx1MjAwMlxcdTIwMDNcXHUyMDA0XFx1MjAwNVxcdTIwMDZcXHUyMDA3XFx1MjAwOFxcdTIwMDlcXHUyMDBBXFx1MjAyRlxcdTIwNUZcXHUzMDAwXFx1RkVGRicuaW5kZXhPZihjaCkgPj0gMCk7XG4gICAgfVxuXG4gICAgLy8gNy4zIExpbmUgVGVybWluYXRvcnNcblxuICAgIGZ1bmN0aW9uIGlzTGluZVRlcm1pbmF0b3IoY2gpIHtcbiAgICAgICAgcmV0dXJuIChjaCA9PT0gJ1xcbicgfHwgY2ggPT09ICdcXHInIHx8IGNoID09PSAnXFx1MjAyOCcgfHwgY2ggPT09ICdcXHUyMDI5Jyk7XG4gICAgfVxuXG4gICAgLy8gNy42IElkZW50aWZpZXIgTmFtZXMgYW5kIElkZW50aWZpZXJzXG5cbiAgICBmdW5jdGlvbiBpc0lkZW50aWZpZXJTdGFydChjaCkge1xuICAgICAgICByZXR1cm4gKGNoID09PSAnJCcpIHx8IChjaCA9PT0gJ18nKSB8fCAoY2ggPT09ICdcXFxcJykgfHxcbiAgICAgICAgICAgIChjaCA+PSAnYScgJiYgY2ggPD0gJ3onKSB8fCAoY2ggPj0gJ0EnICYmIGNoIDw9ICdaJykgfHxcbiAgICAgICAgICAgICgoY2guY2hhckNvZGVBdCgwKSA+PSAweDgwKSAmJiBSZWdleC5Ob25Bc2NpaUlkZW50aWZpZXJTdGFydC50ZXN0KGNoKSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gaXNJZGVudGlmaWVyUGFydChjaCkge1xuICAgICAgICByZXR1cm4gKGNoID09PSAnJCcpIHx8IChjaCA9PT0gJ18nKSB8fCAoY2ggPT09ICdcXFxcJykgfHxcbiAgICAgICAgICAgIChjaCA+PSAnYScgJiYgY2ggPD0gJ3onKSB8fCAoY2ggPj0gJ0EnICYmIGNoIDw9ICdaJykgfHxcbiAgICAgICAgICAgICgoY2ggPj0gJzAnKSAmJiAoY2ggPD0gJzknKSkgfHxcbiAgICAgICAgICAgICgoY2guY2hhckNvZGVBdCgwKSA+PSAweDgwKSAmJiBSZWdleC5Ob25Bc2NpaUlkZW50aWZpZXJQYXJ0LnRlc3QoY2gpKTtcbiAgICB9XG5cbiAgICAvLyA3LjYuMS4yIEZ1dHVyZSBSZXNlcnZlZCBXb3Jkc1xuXG4gICAgZnVuY3Rpb24gaXNGdXR1cmVSZXNlcnZlZFdvcmQoaWQpIHtcbiAgICAgICAgc3dpdGNoIChpZCkge1xuXG4gICAgICAgIC8vIEZ1dHVyZSByZXNlcnZlZCB3b3Jkcy5cbiAgICAgICAgY2FzZSAnY2xhc3MnOlxuICAgICAgICBjYXNlICdlbnVtJzpcbiAgICAgICAgY2FzZSAnZXhwb3J0JzpcbiAgICAgICAgY2FzZSAnZXh0ZW5kcyc6XG4gICAgICAgIGNhc2UgJ2ltcG9ydCc6XG4gICAgICAgIGNhc2UgJ3N1cGVyJzpcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGlzU3RyaWN0TW9kZVJlc2VydmVkV29yZChpZCkge1xuICAgICAgICBzd2l0Y2ggKGlkKSB7XG5cbiAgICAgICAgLy8gU3RyaWN0IE1vZGUgcmVzZXJ2ZWQgd29yZHMuXG4gICAgICAgIGNhc2UgJ2ltcGxlbWVudHMnOlxuICAgICAgICBjYXNlICdpbnRlcmZhY2UnOlxuICAgICAgICBjYXNlICdwYWNrYWdlJzpcbiAgICAgICAgY2FzZSAncHJpdmF0ZSc6XG4gICAgICAgIGNhc2UgJ3Byb3RlY3RlZCc6XG4gICAgICAgIGNhc2UgJ3B1YmxpYyc6XG4gICAgICAgIGNhc2UgJ3N0YXRpYyc6XG4gICAgICAgIGNhc2UgJ3lpZWxkJzpcbiAgICAgICAgY2FzZSAnbGV0JzpcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGlzUmVzdHJpY3RlZFdvcmQoaWQpIHtcbiAgICAgICAgcmV0dXJuIGlkID09PSAnZXZhbCcgfHwgaWQgPT09ICdhcmd1bWVudHMnO1xuICAgIH1cblxuICAgIC8vIDcuNi4xLjEgS2V5d29yZHNcblxuICAgIGZ1bmN0aW9uIGlzS2V5d29yZChpZCkge1xuICAgICAgICB2YXIga2V5d29yZCA9IGZhbHNlO1xuICAgICAgICBzd2l0Y2ggKGlkLmxlbmd0aCkge1xuICAgICAgICBjYXNlIDI6XG4gICAgICAgICAgICBrZXl3b3JkID0gKGlkID09PSAnaWYnKSB8fCAoaWQgPT09ICdpbicpIHx8IChpZCA9PT0gJ2RvJyk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAzOlxuICAgICAgICAgICAga2V5d29yZCA9IChpZCA9PT0gJ3ZhcicpIHx8IChpZCA9PT0gJ2ZvcicpIHx8IChpZCA9PT0gJ25ldycpIHx8IChpZCA9PT0gJ3RyeScpO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgNDpcbiAgICAgICAgICAgIGtleXdvcmQgPSAoaWQgPT09ICd0aGlzJykgfHwgKGlkID09PSAnZWxzZScpIHx8IChpZCA9PT0gJ2Nhc2UnKSB8fCAoaWQgPT09ICd2b2lkJykgfHwgKGlkID09PSAnd2l0aCcpO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgNTpcbiAgICAgICAgICAgIGtleXdvcmQgPSAoaWQgPT09ICd3aGlsZScpIHx8IChpZCA9PT0gJ2JyZWFrJykgfHwgKGlkID09PSAnY2F0Y2gnKSB8fCAoaWQgPT09ICd0aHJvdycpO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgNjpcbiAgICAgICAgICAgIGtleXdvcmQgPSAoaWQgPT09ICdyZXR1cm4nKSB8fCAoaWQgPT09ICd0eXBlb2YnKSB8fCAoaWQgPT09ICdkZWxldGUnKSB8fCAoaWQgPT09ICdzd2l0Y2gnKTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIDc6XG4gICAgICAgICAgICBrZXl3b3JkID0gKGlkID09PSAnZGVmYXVsdCcpIHx8IChpZCA9PT0gJ2ZpbmFsbHknKTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIDg6XG4gICAgICAgICAgICBrZXl3b3JkID0gKGlkID09PSAnZnVuY3Rpb24nKSB8fCAoaWQgPT09ICdjb250aW51ZScpIHx8IChpZCA9PT0gJ2RlYnVnZ2VyJyk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAxMDpcbiAgICAgICAgICAgIGtleXdvcmQgPSAoaWQgPT09ICdpbnN0YW5jZW9mJyk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChrZXl3b3JkKSB7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIHN3aXRjaCAoaWQpIHtcbiAgICAgICAgLy8gRnV0dXJlIHJlc2VydmVkIHdvcmRzLlxuICAgICAgICAvLyAnY29uc3QnIGlzIHNwZWNpYWxpemVkIGFzIEtleXdvcmQgaW4gVjguXG4gICAgICAgIGNhc2UgJ2NvbnN0JzpcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuXG4gICAgICAgIC8vIEZvciBjb21wYXRpYmxpdHkgdG8gU3BpZGVyTW9ua2V5IGFuZCBFUy5uZXh0XG4gICAgICAgIGNhc2UgJ3lpZWxkJzpcbiAgICAgICAgY2FzZSAnbGV0JzpcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHN0cmljdCAmJiBpc1N0cmljdE1vZGVSZXNlcnZlZFdvcmQoaWQpKSB7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBpc0Z1dHVyZVJlc2VydmVkV29yZChpZCk7XG4gICAgfVxuXG4gICAgLy8gNy40IENvbW1lbnRzXG5cbiAgICBmdW5jdGlvbiBza2lwQ29tbWVudCgpIHtcbiAgICAgICAgdmFyIGNoLCBibG9ja0NvbW1lbnQsIGxpbmVDb21tZW50O1xuXG4gICAgICAgIGJsb2NrQ29tbWVudCA9IGZhbHNlO1xuICAgICAgICBsaW5lQ29tbWVudCA9IGZhbHNlO1xuXG4gICAgICAgIHdoaWxlIChpbmRleCA8IGxlbmd0aCkge1xuICAgICAgICAgICAgY2ggPSBzb3VyY2VbaW5kZXhdO1xuXG4gICAgICAgICAgICBpZiAobGluZUNvbW1lbnQpIHtcbiAgICAgICAgICAgICAgICBjaCA9IHNvdXJjZVtpbmRleCsrXTtcbiAgICAgICAgICAgICAgICBpZiAoaXNMaW5lVGVybWluYXRvcihjaCkpIHtcbiAgICAgICAgICAgICAgICAgICAgbGluZUNvbW1lbnQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGNoID09PSAnXFxyJyAmJiBzb3VyY2VbaW5kZXhdID09PSAnXFxuJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgKytpbmRleDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICArK2xpbmVOdW1iZXI7XG4gICAgICAgICAgICAgICAgICAgIGxpbmVTdGFydCA9IGluZGV4O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSBpZiAoYmxvY2tDb21tZW50KSB7XG4gICAgICAgICAgICAgICAgaWYgKGlzTGluZVRlcm1pbmF0b3IoY2gpKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChjaCA9PT0gJ1xccicgJiYgc291cmNlW2luZGV4ICsgMV0gPT09ICdcXG4nKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICArK2luZGV4O1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICsrbGluZU51bWJlcjtcbiAgICAgICAgICAgICAgICAgICAgKytpbmRleDtcbiAgICAgICAgICAgICAgICAgICAgbGluZVN0YXJ0ID0gaW5kZXg7XG4gICAgICAgICAgICAgICAgICAgIGlmIChpbmRleCA+PSBsZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRocm93RXJyb3Ioe30sIE1lc3NhZ2VzLlVuZXhwZWN0ZWRUb2tlbiwgJ0lMTEVHQUwnKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGNoID0gc291cmNlW2luZGV4KytdO1xuICAgICAgICAgICAgICAgICAgICBpZiAoaW5kZXggPj0gbGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aHJvd0Vycm9yKHt9LCBNZXNzYWdlcy5VbmV4cGVjdGVkVG9rZW4sICdJTExFR0FMJyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgaWYgKGNoID09PSAnKicpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNoID0gc291cmNlW2luZGV4XTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjaCA9PT0gJy8nKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgKytpbmRleDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBibG9ja0NvbW1lbnQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSBpZiAoY2ggPT09ICcvJykge1xuICAgICAgICAgICAgICAgIGNoID0gc291cmNlW2luZGV4ICsgMV07XG4gICAgICAgICAgICAgICAgaWYgKGNoID09PSAnLycpIHtcbiAgICAgICAgICAgICAgICAgICAgaW5kZXggKz0gMjtcbiAgICAgICAgICAgICAgICAgICAgbGluZUNvbW1lbnQgPSB0cnVlO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoY2ggPT09ICcqJykge1xuICAgICAgICAgICAgICAgICAgICBpbmRleCArPSAyO1xuICAgICAgICAgICAgICAgICAgICBibG9ja0NvbW1lbnQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICBpZiAoaW5kZXggPj0gbGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aHJvd0Vycm9yKHt9LCBNZXNzYWdlcy5VbmV4cGVjdGVkVG9rZW4sICdJTExFR0FMJyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGlzV2hpdGVTcGFjZShjaCkpIHtcbiAgICAgICAgICAgICAgICArK2luZGV4O1xuICAgICAgICAgICAgfSBlbHNlIGlmIChpc0xpbmVUZXJtaW5hdG9yKGNoKSkge1xuICAgICAgICAgICAgICAgICsraW5kZXg7XG4gICAgICAgICAgICAgICAgaWYgKGNoID09PSAgJ1xccicgJiYgc291cmNlW2luZGV4XSA9PT0gJ1xcbicpIHtcbiAgICAgICAgICAgICAgICAgICAgKytpbmRleDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgKytsaW5lTnVtYmVyO1xuICAgICAgICAgICAgICAgIGxpbmVTdGFydCA9IGluZGV4O1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIHNjYW5IZXhFc2NhcGUocHJlZml4KSB7XG4gICAgICAgIHZhciBpLCBsZW4sIGNoLCBjb2RlID0gMDtcblxuICAgICAgICBsZW4gPSAocHJlZml4ID09PSAndScpID8gNCA6IDI7XG4gICAgICAgIGZvciAoaSA9IDA7IGkgPCBsZW47ICsraSkge1xuICAgICAgICAgICAgaWYgKGluZGV4IDwgbGVuZ3RoICYmIGlzSGV4RGlnaXQoc291cmNlW2luZGV4XSkpIHtcbiAgICAgICAgICAgICAgICBjaCA9IHNvdXJjZVtpbmRleCsrXTtcbiAgICAgICAgICAgICAgICBjb2RlID0gY29kZSAqIDE2ICsgJzAxMjM0NTY3ODlhYmNkZWYnLmluZGV4T2YoY2gudG9Mb3dlckNhc2UoKSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiAnJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gU3RyaW5nLmZyb21DaGFyQ29kZShjb2RlKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBzY2FuSWRlbnRpZmllcigpIHtcbiAgICAgICAgdmFyIGNoLCBzdGFydCwgaWQsIHJlc3RvcmU7XG5cbiAgICAgICAgY2ggPSBzb3VyY2VbaW5kZXhdO1xuICAgICAgICBpZiAoIWlzSWRlbnRpZmllclN0YXJ0KGNoKSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgc3RhcnQgPSBpbmRleDtcbiAgICAgICAgaWYgKGNoID09PSAnXFxcXCcpIHtcbiAgICAgICAgICAgICsraW5kZXg7XG4gICAgICAgICAgICBpZiAoc291cmNlW2luZGV4XSAhPT0gJ3UnKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgKytpbmRleDtcbiAgICAgICAgICAgIHJlc3RvcmUgPSBpbmRleDtcbiAgICAgICAgICAgIGNoID0gc2NhbkhleEVzY2FwZSgndScpO1xuICAgICAgICAgICAgaWYgKGNoKSB7XG4gICAgICAgICAgICAgICAgaWYgKGNoID09PSAnXFxcXCcgfHwgIWlzSWRlbnRpZmllclN0YXJ0KGNoKSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlkID0gY2g7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGluZGV4ID0gcmVzdG9yZTtcbiAgICAgICAgICAgICAgICBpZCA9ICd1JztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGlkID0gc291cmNlW2luZGV4KytdO1xuICAgICAgICB9XG5cbiAgICAgICAgd2hpbGUgKGluZGV4IDwgbGVuZ3RoKSB7XG4gICAgICAgICAgICBjaCA9IHNvdXJjZVtpbmRleF07XG4gICAgICAgICAgICBpZiAoIWlzSWRlbnRpZmllclBhcnQoY2gpKSB7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoY2ggPT09ICdcXFxcJykge1xuICAgICAgICAgICAgICAgICsraW5kZXg7XG4gICAgICAgICAgICAgICAgaWYgKHNvdXJjZVtpbmRleF0gIT09ICd1Jykge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICsraW5kZXg7XG4gICAgICAgICAgICAgICAgcmVzdG9yZSA9IGluZGV4O1xuICAgICAgICAgICAgICAgIGNoID0gc2NhbkhleEVzY2FwZSgndScpO1xuICAgICAgICAgICAgICAgIGlmIChjaCkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoY2ggPT09ICdcXFxcJyB8fCAhaXNJZGVudGlmaWVyUGFydChjaCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBpZCArPSBjaDtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBpbmRleCA9IHJlc3RvcmU7XG4gICAgICAgICAgICAgICAgICAgIGlkICs9ICd1JztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGlkICs9IHNvdXJjZVtpbmRleCsrXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFRoZXJlIGlzIG5vIGtleXdvcmQgb3IgbGl0ZXJhbCB3aXRoIG9ubHkgb25lIGNoYXJhY3Rlci5cbiAgICAgICAgLy8gVGh1cywgaXQgbXVzdCBiZSBhbiBpZGVudGlmaWVyLlxuICAgICAgICBpZiAoaWQubGVuZ3RoID09PSAxKSB7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHR5cGU6IFRva2VuLklkZW50aWZpZXIsXG4gICAgICAgICAgICAgICAgdmFsdWU6IGlkLFxuICAgICAgICAgICAgICAgIGxpbmVOdW1iZXI6IGxpbmVOdW1iZXIsXG4gICAgICAgICAgICAgICAgbGluZVN0YXJ0OiBsaW5lU3RhcnQsXG4gICAgICAgICAgICAgICAgcmFuZ2U6IFtzdGFydCwgaW5kZXhdXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGlzS2V5d29yZChpZCkpIHtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgdHlwZTogVG9rZW4uS2V5d29yZCxcbiAgICAgICAgICAgICAgICB2YWx1ZTogaWQsXG4gICAgICAgICAgICAgICAgbGluZU51bWJlcjogbGluZU51bWJlcixcbiAgICAgICAgICAgICAgICBsaW5lU3RhcnQ6IGxpbmVTdGFydCxcbiAgICAgICAgICAgICAgICByYW5nZTogW3N0YXJ0LCBpbmRleF1cbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cblxuICAgICAgICAvLyA3LjguMSBOdWxsIExpdGVyYWxzXG5cbiAgICAgICAgaWYgKGlkID09PSAnbnVsbCcpIHtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgdHlwZTogVG9rZW4uTnVsbExpdGVyYWwsXG4gICAgICAgICAgICAgICAgdmFsdWU6IGlkLFxuICAgICAgICAgICAgICAgIGxpbmVOdW1iZXI6IGxpbmVOdW1iZXIsXG4gICAgICAgICAgICAgICAgbGluZVN0YXJ0OiBsaW5lU3RhcnQsXG4gICAgICAgICAgICAgICAgcmFuZ2U6IFtzdGFydCwgaW5kZXhdXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gNy44LjIgQm9vbGVhbiBMaXRlcmFsc1xuXG4gICAgICAgIGlmIChpZCA9PT0gJ3RydWUnIHx8IGlkID09PSAnZmFsc2UnKSB7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHR5cGU6IFRva2VuLkJvb2xlYW5MaXRlcmFsLFxuICAgICAgICAgICAgICAgIHZhbHVlOiBpZCxcbiAgICAgICAgICAgICAgICBsaW5lTnVtYmVyOiBsaW5lTnVtYmVyLFxuICAgICAgICAgICAgICAgIGxpbmVTdGFydDogbGluZVN0YXJ0LFxuICAgICAgICAgICAgICAgIHJhbmdlOiBbc3RhcnQsIGluZGV4XVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB0eXBlOiBUb2tlbi5JZGVudGlmaWVyLFxuICAgICAgICAgICAgdmFsdWU6IGlkLFxuICAgICAgICAgICAgbGluZU51bWJlcjogbGluZU51bWJlcixcbiAgICAgICAgICAgIGxpbmVTdGFydDogbGluZVN0YXJ0LFxuICAgICAgICAgICAgcmFuZ2U6IFtzdGFydCwgaW5kZXhdXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLy8gNy43IFB1bmN0dWF0b3JzXG5cbiAgICBmdW5jdGlvbiBzY2FuUHVuY3R1YXRvcigpIHtcbiAgICAgICAgdmFyIHN0YXJ0ID0gaW5kZXgsXG4gICAgICAgICAgICBjaDEgPSBzb3VyY2VbaW5kZXhdLFxuICAgICAgICAgICAgY2gyLFxuICAgICAgICAgICAgY2gzLFxuICAgICAgICAgICAgY2g0O1xuXG4gICAgICAgIC8vIENoZWNrIGZvciBtb3N0IGNvbW1vbiBzaW5nbGUtY2hhcmFjdGVyIHB1bmN0dWF0b3JzLlxuXG4gICAgICAgIGlmIChjaDEgPT09ICc7JyB8fCBjaDEgPT09ICd7JyB8fCBjaDEgPT09ICd9Jykge1xuICAgICAgICAgICAgKytpbmRleDtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgdHlwZTogVG9rZW4uUHVuY3R1YXRvcixcbiAgICAgICAgICAgICAgICB2YWx1ZTogY2gxLFxuICAgICAgICAgICAgICAgIGxpbmVOdW1iZXI6IGxpbmVOdW1iZXIsXG4gICAgICAgICAgICAgICAgbGluZVN0YXJ0OiBsaW5lU3RhcnQsXG4gICAgICAgICAgICAgICAgcmFuZ2U6IFtzdGFydCwgaW5kZXhdXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGNoMSA9PT0gJywnIHx8IGNoMSA9PT0gJygnIHx8IGNoMSA9PT0gJyknKSB7XG4gICAgICAgICAgICArK2luZGV4O1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICB0eXBlOiBUb2tlbi5QdW5jdHVhdG9yLFxuICAgICAgICAgICAgICAgIHZhbHVlOiBjaDEsXG4gICAgICAgICAgICAgICAgbGluZU51bWJlcjogbGluZU51bWJlcixcbiAgICAgICAgICAgICAgICBsaW5lU3RhcnQ6IGxpbmVTdGFydCxcbiAgICAgICAgICAgICAgICByYW5nZTogW3N0YXJ0LCBpbmRleF1cbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cblxuICAgICAgICAvLyBEb3QgKC4pIGNhbiBhbHNvIHN0YXJ0IGEgZmxvYXRpbmctcG9pbnQgbnVtYmVyLCBoZW5jZSB0aGUgbmVlZFxuICAgICAgICAvLyB0byBjaGVjayB0aGUgbmV4dCBjaGFyYWN0ZXIuXG5cbiAgICAgICAgY2gyID0gc291cmNlW2luZGV4ICsgMV07XG4gICAgICAgIGlmIChjaDEgPT09ICcuJyAmJiAhaXNEZWNpbWFsRGlnaXQoY2gyKSkge1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICB0eXBlOiBUb2tlbi5QdW5jdHVhdG9yLFxuICAgICAgICAgICAgICAgIHZhbHVlOiBzb3VyY2VbaW5kZXgrK10sXG4gICAgICAgICAgICAgICAgbGluZU51bWJlcjogbGluZU51bWJlcixcbiAgICAgICAgICAgICAgICBsaW5lU3RhcnQ6IGxpbmVTdGFydCxcbiAgICAgICAgICAgICAgICByYW5nZTogW3N0YXJ0LCBpbmRleF1cbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cblxuICAgICAgICAvLyBQZWVrIG1vcmUgY2hhcmFjdGVycy5cblxuICAgICAgICBjaDMgPSBzb3VyY2VbaW5kZXggKyAyXTtcbiAgICAgICAgY2g0ID0gc291cmNlW2luZGV4ICsgM107XG5cbiAgICAgICAgLy8gNC1jaGFyYWN0ZXIgcHVuY3R1YXRvcjogPj4+PVxuXG4gICAgICAgIGlmIChjaDEgPT09ICc+JyAmJiBjaDIgPT09ICc+JyAmJiBjaDMgPT09ICc+Jykge1xuICAgICAgICAgICAgaWYgKGNoNCA9PT0gJz0nKSB7XG4gICAgICAgICAgICAgICAgaW5kZXggKz0gNDtcbiAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiBUb2tlbi5QdW5jdHVhdG9yLFxuICAgICAgICAgICAgICAgICAgICB2YWx1ZTogJz4+Pj0nLFxuICAgICAgICAgICAgICAgICAgICBsaW5lTnVtYmVyOiBsaW5lTnVtYmVyLFxuICAgICAgICAgICAgICAgICAgICBsaW5lU3RhcnQ6IGxpbmVTdGFydCxcbiAgICAgICAgICAgICAgICAgICAgcmFuZ2U6IFtzdGFydCwgaW5kZXhdXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIDMtY2hhcmFjdGVyIHB1bmN0dWF0b3JzOiA9PT0gIT09ID4+PiA8PD0gPj49XG5cbiAgICAgICAgaWYgKGNoMSA9PT0gJz0nICYmIGNoMiA9PT0gJz0nICYmIGNoMyA9PT0gJz0nKSB7XG4gICAgICAgICAgICBpbmRleCArPSAzO1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICB0eXBlOiBUb2tlbi5QdW5jdHVhdG9yLFxuICAgICAgICAgICAgICAgIHZhbHVlOiAnPT09JyxcbiAgICAgICAgICAgICAgICBsaW5lTnVtYmVyOiBsaW5lTnVtYmVyLFxuICAgICAgICAgICAgICAgIGxpbmVTdGFydDogbGluZVN0YXJ0LFxuICAgICAgICAgICAgICAgIHJhbmdlOiBbc3RhcnQsIGluZGV4XVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChjaDEgPT09ICchJyAmJiBjaDIgPT09ICc9JyAmJiBjaDMgPT09ICc9Jykge1xuICAgICAgICAgICAgaW5kZXggKz0gMztcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgdHlwZTogVG9rZW4uUHVuY3R1YXRvcixcbiAgICAgICAgICAgICAgICB2YWx1ZTogJyE9PScsXG4gICAgICAgICAgICAgICAgbGluZU51bWJlcjogbGluZU51bWJlcixcbiAgICAgICAgICAgICAgICBsaW5lU3RhcnQ6IGxpbmVTdGFydCxcbiAgICAgICAgICAgICAgICByYW5nZTogW3N0YXJ0LCBpbmRleF1cbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoY2gxID09PSAnPicgJiYgY2gyID09PSAnPicgJiYgY2gzID09PSAnPicpIHtcbiAgICAgICAgICAgIGluZGV4ICs9IDM7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHR5cGU6IFRva2VuLlB1bmN0dWF0b3IsXG4gICAgICAgICAgICAgICAgdmFsdWU6ICc+Pj4nLFxuICAgICAgICAgICAgICAgIGxpbmVOdW1iZXI6IGxpbmVOdW1iZXIsXG4gICAgICAgICAgICAgICAgbGluZVN0YXJ0OiBsaW5lU3RhcnQsXG4gICAgICAgICAgICAgICAgcmFuZ2U6IFtzdGFydCwgaW5kZXhdXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGNoMSA9PT0gJzwnICYmIGNoMiA9PT0gJzwnICYmIGNoMyA9PT0gJz0nKSB7XG4gICAgICAgICAgICBpbmRleCArPSAzO1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICB0eXBlOiBUb2tlbi5QdW5jdHVhdG9yLFxuICAgICAgICAgICAgICAgIHZhbHVlOiAnPDw9JyxcbiAgICAgICAgICAgICAgICBsaW5lTnVtYmVyOiBsaW5lTnVtYmVyLFxuICAgICAgICAgICAgICAgIGxpbmVTdGFydDogbGluZVN0YXJ0LFxuICAgICAgICAgICAgICAgIHJhbmdlOiBbc3RhcnQsIGluZGV4XVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChjaDEgPT09ICc+JyAmJiBjaDIgPT09ICc+JyAmJiBjaDMgPT09ICc9Jykge1xuICAgICAgICAgICAgaW5kZXggKz0gMztcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgdHlwZTogVG9rZW4uUHVuY3R1YXRvcixcbiAgICAgICAgICAgICAgICB2YWx1ZTogJz4+PScsXG4gICAgICAgICAgICAgICAgbGluZU51bWJlcjogbGluZU51bWJlcixcbiAgICAgICAgICAgICAgICBsaW5lU3RhcnQ6IGxpbmVTdGFydCxcbiAgICAgICAgICAgICAgICByYW5nZTogW3N0YXJ0LCBpbmRleF1cbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cblxuICAgICAgICAvLyAyLWNoYXJhY3RlciBwdW5jdHVhdG9yczogPD0gPj0gPT0gIT0gKysgLS0gPDwgPj4gJiYgfHxcbiAgICAgICAgLy8gKz0gLT0gKj0gJT0gJj0gfD0gXj0gLz1cblxuICAgICAgICBpZiAoY2gyID09PSAnPScpIHtcbiAgICAgICAgICAgIGlmICgnPD49ISstKiUmfF4vJy5pbmRleE9mKGNoMSkgPj0gMCkge1xuICAgICAgICAgICAgICAgIGluZGV4ICs9IDI7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogVG9rZW4uUHVuY3R1YXRvcixcbiAgICAgICAgICAgICAgICAgICAgdmFsdWU6IGNoMSArIGNoMixcbiAgICAgICAgICAgICAgICAgICAgbGluZU51bWJlcjogbGluZU51bWJlcixcbiAgICAgICAgICAgICAgICAgICAgbGluZVN0YXJ0OiBsaW5lU3RhcnQsXG4gICAgICAgICAgICAgICAgICAgIHJhbmdlOiBbc3RhcnQsIGluZGV4XVxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoY2gxID09PSBjaDIgJiYgKCcrLTw+JnwnLmluZGV4T2YoY2gxKSA+PSAwKSkge1xuICAgICAgICAgICAgaWYgKCcrLTw+JnwnLmluZGV4T2YoY2gyKSA+PSAwKSB7XG4gICAgICAgICAgICAgICAgaW5kZXggKz0gMjtcbiAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiBUb2tlbi5QdW5jdHVhdG9yLFxuICAgICAgICAgICAgICAgICAgICB2YWx1ZTogY2gxICsgY2gyLFxuICAgICAgICAgICAgICAgICAgICBsaW5lTnVtYmVyOiBsaW5lTnVtYmVyLFxuICAgICAgICAgICAgICAgICAgICBsaW5lU3RhcnQ6IGxpbmVTdGFydCxcbiAgICAgICAgICAgICAgICAgICAgcmFuZ2U6IFtzdGFydCwgaW5kZXhdXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFRoZSByZW1haW5pbmcgMS1jaGFyYWN0ZXIgcHVuY3R1YXRvcnMuXG5cbiAgICAgICAgaWYgKCdbXTw+Ky0qJSZ8XiF+Pzo9LycuaW5kZXhPZihjaDEpID49IDApIHtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgdHlwZTogVG9rZW4uUHVuY3R1YXRvcixcbiAgICAgICAgICAgICAgICB2YWx1ZTogc291cmNlW2luZGV4KytdLFxuICAgICAgICAgICAgICAgIGxpbmVOdW1iZXI6IGxpbmVOdW1iZXIsXG4gICAgICAgICAgICAgICAgbGluZVN0YXJ0OiBsaW5lU3RhcnQsXG4gICAgICAgICAgICAgICAgcmFuZ2U6IFtzdGFydCwgaW5kZXhdXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy8gNy44LjMgTnVtZXJpYyBMaXRlcmFsc1xuXG4gICAgZnVuY3Rpb24gc2Nhbk51bWVyaWNMaXRlcmFsKCkge1xuICAgICAgICB2YXIgbnVtYmVyLCBzdGFydCwgY2g7XG5cbiAgICAgICAgY2ggPSBzb3VyY2VbaW5kZXhdO1xuICAgICAgICBhc3NlcnQoaXNEZWNpbWFsRGlnaXQoY2gpIHx8IChjaCA9PT0gJy4nKSxcbiAgICAgICAgICAgICdOdW1lcmljIGxpdGVyYWwgbXVzdCBzdGFydCB3aXRoIGEgZGVjaW1hbCBkaWdpdCBvciBhIGRlY2ltYWwgcG9pbnQnKTtcblxuICAgICAgICBzdGFydCA9IGluZGV4O1xuICAgICAgICBudW1iZXIgPSAnJztcbiAgICAgICAgaWYgKGNoICE9PSAnLicpIHtcbiAgICAgICAgICAgIG51bWJlciA9IHNvdXJjZVtpbmRleCsrXTtcbiAgICAgICAgICAgIGNoID0gc291cmNlW2luZGV4XTtcblxuICAgICAgICAgICAgLy8gSGV4IG51bWJlciBzdGFydHMgd2l0aCAnMHgnLlxuICAgICAgICAgICAgLy8gT2N0YWwgbnVtYmVyIHN0YXJ0cyB3aXRoICcwJy5cbiAgICAgICAgICAgIGlmIChudW1iZXIgPT09ICcwJykge1xuICAgICAgICAgICAgICAgIGlmIChjaCA9PT0gJ3gnIHx8IGNoID09PSAnWCcpIHtcbiAgICAgICAgICAgICAgICAgICAgbnVtYmVyICs9IHNvdXJjZVtpbmRleCsrXTtcbiAgICAgICAgICAgICAgICAgICAgd2hpbGUgKGluZGV4IDwgbGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjaCA9IHNvdXJjZVtpbmRleF07XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIWlzSGV4RGlnaXQoY2gpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBudW1iZXIgKz0gc291cmNlW2luZGV4KytdO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKG51bWJlci5sZW5ndGggPD0gMikge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gb25seSAweFxuICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3dFcnJvcih7fSwgTWVzc2FnZXMuVW5leHBlY3RlZFRva2VuLCAnSUxMRUdBTCcpO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKGluZGV4IDwgbGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjaCA9IHNvdXJjZVtpbmRleF07XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoaXNJZGVudGlmaWVyU3RhcnQoY2gpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3dFcnJvcih7fSwgTWVzc2FnZXMuVW5leHBlY3RlZFRva2VuLCAnSUxMRUdBTCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiBUb2tlbi5OdW1lcmljTGl0ZXJhbCxcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlOiBwYXJzZUludChudW1iZXIsIDE2KSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGxpbmVOdW1iZXI6IGxpbmVOdW1iZXIsXG4gICAgICAgICAgICAgICAgICAgICAgICBsaW5lU3RhcnQ6IGxpbmVTdGFydCxcbiAgICAgICAgICAgICAgICAgICAgICAgIHJhbmdlOiBbc3RhcnQsIGluZGV4XVxuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoaXNPY3RhbERpZ2l0KGNoKSkge1xuICAgICAgICAgICAgICAgICAgICBudW1iZXIgKz0gc291cmNlW2luZGV4KytdO1xuICAgICAgICAgICAgICAgICAgICB3aGlsZSAoaW5kZXggPCBsZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNoID0gc291cmNlW2luZGV4XTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghaXNPY3RhbERpZ2l0KGNoKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgbnVtYmVyICs9IHNvdXJjZVtpbmRleCsrXTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIGlmIChpbmRleCA8IGxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY2ggPSBzb3VyY2VbaW5kZXhdO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGlzSWRlbnRpZmllclN0YXJ0KGNoKSB8fCBpc0RlY2ltYWxEaWdpdChjaCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aHJvd0Vycm9yKHt9LCBNZXNzYWdlcy5VbmV4cGVjdGVkVG9rZW4sICdJTExFR0FMJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6IFRva2VuLk51bWVyaWNMaXRlcmFsLFxuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6IHBhcnNlSW50KG51bWJlciwgOCksXG4gICAgICAgICAgICAgICAgICAgICAgICBvY3RhbDogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGxpbmVOdW1iZXI6IGxpbmVOdW1iZXIsXG4gICAgICAgICAgICAgICAgICAgICAgICBsaW5lU3RhcnQ6IGxpbmVTdGFydCxcbiAgICAgICAgICAgICAgICAgICAgICAgIHJhbmdlOiBbc3RhcnQsIGluZGV4XVxuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIGRlY2ltYWwgbnVtYmVyIHN0YXJ0cyB3aXRoICcwJyBzdWNoIGFzICcwOScgaXMgaWxsZWdhbC5cbiAgICAgICAgICAgICAgICBpZiAoaXNEZWNpbWFsRGlnaXQoY2gpKSB7XG4gICAgICAgICAgICAgICAgICAgIHRocm93RXJyb3Ioe30sIE1lc3NhZ2VzLlVuZXhwZWN0ZWRUb2tlbiwgJ0lMTEVHQUwnKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHdoaWxlIChpbmRleCA8IGxlbmd0aCkge1xuICAgICAgICAgICAgICAgIGNoID0gc291cmNlW2luZGV4XTtcbiAgICAgICAgICAgICAgICBpZiAoIWlzRGVjaW1hbERpZ2l0KGNoKSkge1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgbnVtYmVyICs9IHNvdXJjZVtpbmRleCsrXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChjaCA9PT0gJy4nKSB7XG4gICAgICAgICAgICBudW1iZXIgKz0gc291cmNlW2luZGV4KytdO1xuICAgICAgICAgICAgd2hpbGUgKGluZGV4IDwgbGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgY2ggPSBzb3VyY2VbaW5kZXhdO1xuICAgICAgICAgICAgICAgIGlmICghaXNEZWNpbWFsRGlnaXQoY2gpKSB7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBudW1iZXIgKz0gc291cmNlW2luZGV4KytdO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGNoID09PSAnZScgfHwgY2ggPT09ICdFJykge1xuICAgICAgICAgICAgbnVtYmVyICs9IHNvdXJjZVtpbmRleCsrXTtcblxuICAgICAgICAgICAgY2ggPSBzb3VyY2VbaW5kZXhdO1xuICAgICAgICAgICAgaWYgKGNoID09PSAnKycgfHwgY2ggPT09ICctJykge1xuICAgICAgICAgICAgICAgIG51bWJlciArPSBzb3VyY2VbaW5kZXgrK107XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNoID0gc291cmNlW2luZGV4XTtcbiAgICAgICAgICAgIGlmIChpc0RlY2ltYWxEaWdpdChjaCkpIHtcbiAgICAgICAgICAgICAgICBudW1iZXIgKz0gc291cmNlW2luZGV4KytdO1xuICAgICAgICAgICAgICAgIHdoaWxlIChpbmRleCA8IGxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICBjaCA9IHNvdXJjZVtpbmRleF07XG4gICAgICAgICAgICAgICAgICAgIGlmICghaXNEZWNpbWFsRGlnaXQoY2gpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBudW1iZXIgKz0gc291cmNlW2luZGV4KytdO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgY2ggPSAnY2hhcmFjdGVyICcgKyBjaDtcbiAgICAgICAgICAgICAgICBpZiAoaW5kZXggPj0gbGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgIGNoID0gJzxlbmQ+JztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdGhyb3dFcnJvcih7fSwgTWVzc2FnZXMuVW5leHBlY3RlZFRva2VuLCAnSUxMRUdBTCcpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGluZGV4IDwgbGVuZ3RoKSB7XG4gICAgICAgICAgICBjaCA9IHNvdXJjZVtpbmRleF07XG4gICAgICAgICAgICBpZiAoaXNJZGVudGlmaWVyU3RhcnQoY2gpKSB7XG4gICAgICAgICAgICAgICAgdGhyb3dFcnJvcih7fSwgTWVzc2FnZXMuVW5leHBlY3RlZFRva2VuLCAnSUxMRUdBTCcpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHR5cGU6IFRva2VuLk51bWVyaWNMaXRlcmFsLFxuICAgICAgICAgICAgdmFsdWU6IHBhcnNlRmxvYXQobnVtYmVyKSxcbiAgICAgICAgICAgIGxpbmVOdW1iZXI6IGxpbmVOdW1iZXIsXG4gICAgICAgICAgICBsaW5lU3RhcnQ6IGxpbmVTdGFydCxcbiAgICAgICAgICAgIHJhbmdlOiBbc3RhcnQsIGluZGV4XVxuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8vIDcuOC40IFN0cmluZyBMaXRlcmFsc1xuXG4gICAgZnVuY3Rpb24gc2NhblN0cmluZ0xpdGVyYWwoKSB7XG4gICAgICAgIHZhciBzdHIgPSAnJywgcXVvdGUsIHN0YXJ0LCBjaCwgY29kZSwgdW5lc2NhcGVkLCByZXN0b3JlLCBvY3RhbCA9IGZhbHNlO1xuXG4gICAgICAgIHF1b3RlID0gc291cmNlW2luZGV4XTtcbiAgICAgICAgYXNzZXJ0KChxdW90ZSA9PT0gJ1xcJycgfHwgcXVvdGUgPT09ICdcIicpLFxuICAgICAgICAgICAgJ1N0cmluZyBsaXRlcmFsIG11c3Qgc3RhcnRzIHdpdGggYSBxdW90ZScpO1xuXG4gICAgICAgIHN0YXJ0ID0gaW5kZXg7XG4gICAgICAgICsraW5kZXg7XG5cbiAgICAgICAgd2hpbGUgKGluZGV4IDwgbGVuZ3RoKSB7XG4gICAgICAgICAgICBjaCA9IHNvdXJjZVtpbmRleCsrXTtcblxuICAgICAgICAgICAgaWYgKGNoID09PSBxdW90ZSkge1xuICAgICAgICAgICAgICAgIHF1b3RlID0gJyc7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGNoID09PSAnXFxcXCcpIHtcbiAgICAgICAgICAgICAgICBjaCA9IHNvdXJjZVtpbmRleCsrXTtcbiAgICAgICAgICAgICAgICBpZiAoIWlzTGluZVRlcm1pbmF0b3IoY2gpKSB7XG4gICAgICAgICAgICAgICAgICAgIHN3aXRjaCAoY2gpIHtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnbic6XG4gICAgICAgICAgICAgICAgICAgICAgICBzdHIgKz0gJ1xcbic7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAncic6XG4gICAgICAgICAgICAgICAgICAgICAgICBzdHIgKz0gJ1xccic7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAndCc6XG4gICAgICAgICAgICAgICAgICAgICAgICBzdHIgKz0gJ1xcdCc7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAndSc6XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ3gnOlxuICAgICAgICAgICAgICAgICAgICAgICAgcmVzdG9yZSA9IGluZGV4O1xuICAgICAgICAgICAgICAgICAgICAgICAgdW5lc2NhcGVkID0gc2NhbkhleEVzY2FwZShjaCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodW5lc2NhcGVkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RyICs9IHVuZXNjYXBlZDtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaW5kZXggPSByZXN0b3JlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0ciArPSBjaDtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdiJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0ciArPSAnXFxiJztcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdmJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0ciArPSAnXFxmJztcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlICd2JzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0ciArPSAnXFx4MEInO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpc09jdGFsRGlnaXQoY2gpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29kZSA9ICcwMTIzNDU2NycuaW5kZXhPZihjaCk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBcXDAgaXMgbm90IG9jdGFsIGVzY2FwZSBzZXF1ZW5jZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjb2RlICE9PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9jdGFsID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoaW5kZXggPCBsZW5ndGggJiYgaXNPY3RhbERpZ2l0KHNvdXJjZVtpbmRleF0pKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9jdGFsID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29kZSA9IGNvZGUgKiA4ICsgJzAxMjM0NTY3Jy5pbmRleE9mKHNvdXJjZVtpbmRleCsrXSk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gMyBkaWdpdHMgYXJlIG9ubHkgYWxsb3dlZCB3aGVuIHN0cmluZyBzdGFydHNcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gd2l0aCAwLCAxLCAyLCAzXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICgnMDEyMycuaW5kZXhPZihjaCkgPj0gMCAmJlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGluZGV4IDwgbGVuZ3RoICYmXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaXNPY3RhbERpZ2l0KHNvdXJjZVtpbmRleF0pKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb2RlID0gY29kZSAqIDggKyAnMDEyMzQ1NjcnLmluZGV4T2Yoc291cmNlW2luZGV4KytdKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdHIgKz0gU3RyaW5nLmZyb21DaGFyQ29kZShjb2RlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RyICs9IGNoO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICArK2xpbmVOdW1iZXI7XG4gICAgICAgICAgICAgICAgICAgIGlmIChjaCA9PT0gICdcXHInICYmIHNvdXJjZVtpbmRleF0gPT09ICdcXG4nKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICArK2luZGV4O1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIGlmIChpc0xpbmVUZXJtaW5hdG9yKGNoKSkge1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBzdHIgKz0gY2g7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAocXVvdGUgIT09ICcnKSB7XG4gICAgICAgICAgICB0aHJvd0Vycm9yKHt9LCBNZXNzYWdlcy5VbmV4cGVjdGVkVG9rZW4sICdJTExFR0FMJyk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgdHlwZTogVG9rZW4uU3RyaW5nTGl0ZXJhbCxcbiAgICAgICAgICAgIHZhbHVlOiBzdHIsXG4gICAgICAgICAgICBvY3RhbDogb2N0YWwsXG4gICAgICAgICAgICBsaW5lTnVtYmVyOiBsaW5lTnVtYmVyLFxuICAgICAgICAgICAgbGluZVN0YXJ0OiBsaW5lU3RhcnQsXG4gICAgICAgICAgICByYW5nZTogW3N0YXJ0LCBpbmRleF1cbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBzY2FuUmVnRXhwKCkge1xuICAgICAgICB2YXIgc3RyLCBjaCwgc3RhcnQsIHBhdHRlcm4sIGZsYWdzLCB2YWx1ZSwgY2xhc3NNYXJrZXIgPSBmYWxzZSwgcmVzdG9yZSwgdGVybWluYXRlZCA9IGZhbHNlO1xuXG4gICAgICAgIGJ1ZmZlciA9IG51bGw7XG4gICAgICAgIHNraXBDb21tZW50KCk7XG5cbiAgICAgICAgc3RhcnQgPSBpbmRleDtcbiAgICAgICAgY2ggPSBzb3VyY2VbaW5kZXhdO1xuICAgICAgICBhc3NlcnQoY2ggPT09ICcvJywgJ1JlZ3VsYXIgZXhwcmVzc2lvbiBsaXRlcmFsIG11c3Qgc3RhcnQgd2l0aCBhIHNsYXNoJyk7XG4gICAgICAgIHN0ciA9IHNvdXJjZVtpbmRleCsrXTtcblxuICAgICAgICB3aGlsZSAoaW5kZXggPCBsZW5ndGgpIHtcbiAgICAgICAgICAgIGNoID0gc291cmNlW2luZGV4KytdO1xuICAgICAgICAgICAgc3RyICs9IGNoO1xuICAgICAgICAgICAgaWYgKGNsYXNzTWFya2VyKSB7XG4gICAgICAgICAgICAgICAgaWYgKGNoID09PSAnXScpIHtcbiAgICAgICAgICAgICAgICAgICAgY2xhc3NNYXJrZXIgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGlmIChjaCA9PT0gJ1xcXFwnKSB7XG4gICAgICAgICAgICAgICAgICAgIGNoID0gc291cmNlW2luZGV4KytdO1xuICAgICAgICAgICAgICAgICAgICAvLyBFQ01BLTI2MiA3LjguNVxuICAgICAgICAgICAgICAgICAgICBpZiAoaXNMaW5lVGVybWluYXRvcihjaCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRocm93RXJyb3Ioe30sIE1lc3NhZ2VzLlVudGVybWluYXRlZFJlZ0V4cCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgc3RyICs9IGNoO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoY2ggPT09ICcvJykge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtaW5hdGVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChjaCA9PT0gJ1snKSB7XG4gICAgICAgICAgICAgICAgICAgIGNsYXNzTWFya2VyID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGlzTGluZVRlcm1pbmF0b3IoY2gpKSB7XG4gICAgICAgICAgICAgICAgICAgIHRocm93RXJyb3Ioe30sIE1lc3NhZ2VzLlVudGVybWluYXRlZFJlZ0V4cCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCF0ZXJtaW5hdGVkKSB7XG4gICAgICAgICAgICB0aHJvd0Vycm9yKHt9LCBNZXNzYWdlcy5VbnRlcm1pbmF0ZWRSZWdFeHApO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gRXhjbHVkZSBsZWFkaW5nIGFuZCB0cmFpbGluZyBzbGFzaC5cbiAgICAgICAgcGF0dGVybiA9IHN0ci5zdWJzdHIoMSwgc3RyLmxlbmd0aCAtIDIpO1xuXG4gICAgICAgIGZsYWdzID0gJyc7XG4gICAgICAgIHdoaWxlIChpbmRleCA8IGxlbmd0aCkge1xuICAgICAgICAgICAgY2ggPSBzb3VyY2VbaW5kZXhdO1xuICAgICAgICAgICAgaWYgKCFpc0lkZW50aWZpZXJQYXJ0KGNoKSkge1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICArK2luZGV4O1xuICAgICAgICAgICAgaWYgKGNoID09PSAnXFxcXCcgJiYgaW5kZXggPCBsZW5ndGgpIHtcbiAgICAgICAgICAgICAgICBjaCA9IHNvdXJjZVtpbmRleF07XG4gICAgICAgICAgICAgICAgaWYgKGNoID09PSAndScpIHtcbiAgICAgICAgICAgICAgICAgICAgKytpbmRleDtcbiAgICAgICAgICAgICAgICAgICAgcmVzdG9yZSA9IGluZGV4O1xuICAgICAgICAgICAgICAgICAgICBjaCA9IHNjYW5IZXhFc2NhcGUoJ3UnKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGNoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBmbGFncyArPSBjaDtcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0ciArPSAnXFxcXHUnO1xuICAgICAgICAgICAgICAgICAgICAgICAgZm9yICg7IHJlc3RvcmUgPCBpbmRleDsgKytyZXN0b3JlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RyICs9IHNvdXJjZVtyZXN0b3JlXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGluZGV4ID0gcmVzdG9yZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZsYWdzICs9ICd1JztcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0ciArPSAnXFxcXHUnO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgc3RyICs9ICdcXFxcJztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGZsYWdzICs9IGNoO1xuICAgICAgICAgICAgICAgIHN0ciArPSBjaDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICB2YWx1ZSA9IG5ldyBSZWdFeHAocGF0dGVybiwgZmxhZ3MpO1xuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICB0aHJvd0Vycm9yKHt9LCBNZXNzYWdlcy5JbnZhbGlkUmVnRXhwKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBsaXRlcmFsOiBzdHIsXG4gICAgICAgICAgICB2YWx1ZTogdmFsdWUsXG4gICAgICAgICAgICByYW5nZTogW3N0YXJ0LCBpbmRleF1cbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBpc0lkZW50aWZpZXJOYW1lKHRva2VuKSB7XG4gICAgICAgIHJldHVybiB0b2tlbi50eXBlID09PSBUb2tlbi5JZGVudGlmaWVyIHx8XG4gICAgICAgICAgICB0b2tlbi50eXBlID09PSBUb2tlbi5LZXl3b3JkIHx8XG4gICAgICAgICAgICB0b2tlbi50eXBlID09PSBUb2tlbi5Cb29sZWFuTGl0ZXJhbCB8fFxuICAgICAgICAgICAgdG9rZW4udHlwZSA9PT0gVG9rZW4uTnVsbExpdGVyYWw7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gYWR2YW5jZSgpIHtcbiAgICAgICAgdmFyIGNoLCB0b2tlbjtcblxuICAgICAgICBza2lwQ29tbWVudCgpO1xuXG4gICAgICAgIGlmIChpbmRleCA+PSBsZW5ndGgpIHtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgdHlwZTogVG9rZW4uRU9GLFxuICAgICAgICAgICAgICAgIGxpbmVOdW1iZXI6IGxpbmVOdW1iZXIsXG4gICAgICAgICAgICAgICAgbGluZVN0YXJ0OiBsaW5lU3RhcnQsXG4gICAgICAgICAgICAgICAgcmFuZ2U6IFtpbmRleCwgaW5kZXhdXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG5cbiAgICAgICAgdG9rZW4gPSBzY2FuUHVuY3R1YXRvcigpO1xuICAgICAgICBpZiAodHlwZW9mIHRva2VuICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgcmV0dXJuIHRva2VuO1xuICAgICAgICB9XG5cbiAgICAgICAgY2ggPSBzb3VyY2VbaW5kZXhdO1xuXG4gICAgICAgIGlmIChjaCA9PT0gJ1xcJycgfHwgY2ggPT09ICdcIicpIHtcbiAgICAgICAgICAgIHJldHVybiBzY2FuU3RyaW5nTGl0ZXJhbCgpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGNoID09PSAnLicgfHwgaXNEZWNpbWFsRGlnaXQoY2gpKSB7XG4gICAgICAgICAgICByZXR1cm4gc2Nhbk51bWVyaWNMaXRlcmFsKCk7XG4gICAgICAgIH1cblxuICAgICAgICB0b2tlbiA9IHNjYW5JZGVudGlmaWVyKCk7XG4gICAgICAgIGlmICh0eXBlb2YgdG9rZW4gIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICByZXR1cm4gdG9rZW47XG4gICAgICAgIH1cblxuICAgICAgICB0aHJvd0Vycm9yKHt9LCBNZXNzYWdlcy5VbmV4cGVjdGVkVG9rZW4sICdJTExFR0FMJyk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gbGV4KCkge1xuICAgICAgICB2YXIgdG9rZW47XG5cbiAgICAgICAgaWYgKGJ1ZmZlcikge1xuICAgICAgICAgICAgaW5kZXggPSBidWZmZXIucmFuZ2VbMV07XG4gICAgICAgICAgICBsaW5lTnVtYmVyID0gYnVmZmVyLmxpbmVOdW1iZXI7XG4gICAgICAgICAgICBsaW5lU3RhcnQgPSBidWZmZXIubGluZVN0YXJ0O1xuICAgICAgICAgICAgdG9rZW4gPSBidWZmZXI7XG4gICAgICAgICAgICBidWZmZXIgPSBudWxsO1xuICAgICAgICAgICAgcmV0dXJuIHRva2VuO1xuICAgICAgICB9XG5cbiAgICAgICAgYnVmZmVyID0gbnVsbDtcbiAgICAgICAgcmV0dXJuIGFkdmFuY2UoKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBsb29rYWhlYWQoKSB7XG4gICAgICAgIHZhciBwb3MsIGxpbmUsIHN0YXJ0O1xuXG4gICAgICAgIGlmIChidWZmZXIgIT09IG51bGwpIHtcbiAgICAgICAgICAgIHJldHVybiBidWZmZXI7XG4gICAgICAgIH1cblxuICAgICAgICBwb3MgPSBpbmRleDtcbiAgICAgICAgbGluZSA9IGxpbmVOdW1iZXI7XG4gICAgICAgIHN0YXJ0ID0gbGluZVN0YXJ0O1xuICAgICAgICBidWZmZXIgPSBhZHZhbmNlKCk7XG4gICAgICAgIGluZGV4ID0gcG9zO1xuICAgICAgICBsaW5lTnVtYmVyID0gbGluZTtcbiAgICAgICAgbGluZVN0YXJ0ID0gc3RhcnQ7XG5cbiAgICAgICAgcmV0dXJuIGJ1ZmZlcjtcbiAgICB9XG5cbiAgICAvLyBSZXR1cm4gdHJ1ZSBpZiB0aGVyZSBpcyBhIGxpbmUgdGVybWluYXRvciBiZWZvcmUgdGhlIG5leHQgdG9rZW4uXG5cbiAgICBmdW5jdGlvbiBwZWVrTGluZVRlcm1pbmF0b3IoKSB7XG4gICAgICAgIHZhciBwb3MsIGxpbmUsIHN0YXJ0LCBmb3VuZDtcblxuICAgICAgICBwb3MgPSBpbmRleDtcbiAgICAgICAgbGluZSA9IGxpbmVOdW1iZXI7XG4gICAgICAgIHN0YXJ0ID0gbGluZVN0YXJ0O1xuICAgICAgICBza2lwQ29tbWVudCgpO1xuICAgICAgICBmb3VuZCA9IGxpbmVOdW1iZXIgIT09IGxpbmU7XG4gICAgICAgIGluZGV4ID0gcG9zO1xuICAgICAgICBsaW5lTnVtYmVyID0gbGluZTtcbiAgICAgICAgbGluZVN0YXJ0ID0gc3RhcnQ7XG5cbiAgICAgICAgcmV0dXJuIGZvdW5kO1xuICAgIH1cblxuICAgIC8vIFRocm93IGFuIGV4Y2VwdGlvblxuXG4gICAgZnVuY3Rpb24gdGhyb3dFcnJvcih0b2tlbiwgbWVzc2FnZUZvcm1hdCkge1xuICAgICAgICB2YXIgZXJyb3IsXG4gICAgICAgICAgICBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAyKSxcbiAgICAgICAgICAgIG1zZyA9IG1lc3NhZ2VGb3JtYXQucmVwbGFjZShcbiAgICAgICAgICAgICAgICAvJShcXGQpL2csXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gKHdob2xlLCBpbmRleCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gYXJnc1tpbmRleF0gfHwgJyc7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgKTtcblxuICAgICAgICBpZiAodHlwZW9mIHRva2VuLmxpbmVOdW1iZXIgPT09ICdudW1iZXInKSB7XG4gICAgICAgICAgICBlcnJvciA9IG5ldyBFcnJvcignTGluZSAnICsgdG9rZW4ubGluZU51bWJlciArICc6ICcgKyBtc2cpO1xuICAgICAgICAgICAgZXJyb3IuaW5kZXggPSB0b2tlbi5yYW5nZVswXTtcbiAgICAgICAgICAgIGVycm9yLmxpbmVOdW1iZXIgPSB0b2tlbi5saW5lTnVtYmVyO1xuICAgICAgICAgICAgZXJyb3IuY29sdW1uID0gdG9rZW4ucmFuZ2VbMF0gLSBsaW5lU3RhcnQgKyAxO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZXJyb3IgPSBuZXcgRXJyb3IoJ0xpbmUgJyArIGxpbmVOdW1iZXIgKyAnOiAnICsgbXNnKTtcbiAgICAgICAgICAgIGVycm9yLmluZGV4ID0gaW5kZXg7XG4gICAgICAgICAgICBlcnJvci5saW5lTnVtYmVyID0gbGluZU51bWJlcjtcbiAgICAgICAgICAgIGVycm9yLmNvbHVtbiA9IGluZGV4IC0gbGluZVN0YXJ0ICsgMTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRocm93IGVycm9yO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHRocm93RXJyb3JUb2xlcmFudCgpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIHRocm93RXJyb3IuYXBwbHkobnVsbCwgYXJndW1lbnRzKTtcbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgaWYgKGV4dHJhLmVycm9ycykge1xuICAgICAgICAgICAgICAgIGV4dHJhLmVycm9ycy5wdXNoKGUpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG5cbiAgICAvLyBUaHJvdyBhbiBleGNlcHRpb24gYmVjYXVzZSBvZiB0aGUgdG9rZW4uXG5cbiAgICBmdW5jdGlvbiB0aHJvd1VuZXhwZWN0ZWQodG9rZW4pIHtcbiAgICAgICAgaWYgKHRva2VuLnR5cGUgPT09IFRva2VuLkVPRikge1xuICAgICAgICAgICAgdGhyb3dFcnJvcih0b2tlbiwgTWVzc2FnZXMuVW5leHBlY3RlZEVPUyk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodG9rZW4udHlwZSA9PT0gVG9rZW4uTnVtZXJpY0xpdGVyYWwpIHtcbiAgICAgICAgICAgIHRocm93RXJyb3IodG9rZW4sIE1lc3NhZ2VzLlVuZXhwZWN0ZWROdW1iZXIpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHRva2VuLnR5cGUgPT09IFRva2VuLlN0cmluZ0xpdGVyYWwpIHtcbiAgICAgICAgICAgIHRocm93RXJyb3IodG9rZW4sIE1lc3NhZ2VzLlVuZXhwZWN0ZWRTdHJpbmcpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHRva2VuLnR5cGUgPT09IFRva2VuLklkZW50aWZpZXIpIHtcbiAgICAgICAgICAgIHRocm93RXJyb3IodG9rZW4sIE1lc3NhZ2VzLlVuZXhwZWN0ZWRJZGVudGlmaWVyKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0b2tlbi50eXBlID09PSBUb2tlbi5LZXl3b3JkKSB7XG4gICAgICAgICAgICBpZiAoaXNGdXR1cmVSZXNlcnZlZFdvcmQodG9rZW4udmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgdGhyb3dFcnJvcih0b2tlbiwgTWVzc2FnZXMuVW5leHBlY3RlZFJlc2VydmVkKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoc3RyaWN0ICYmIGlzU3RyaWN0TW9kZVJlc2VydmVkV29yZCh0b2tlbi52YWx1ZSkpIHtcbiAgICAgICAgICAgICAgICB0aHJvd0Vycm9yVG9sZXJhbnQodG9rZW4sIE1lc3NhZ2VzLlN0cmljdFJlc2VydmVkV29yZCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhyb3dFcnJvcih0b2tlbiwgTWVzc2FnZXMuVW5leHBlY3RlZFRva2VuLCB0b2tlbi52YWx1ZSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBCb29sZWFuTGl0ZXJhbCwgTnVsbExpdGVyYWwsIG9yIFB1bmN0dWF0b3IuXG4gICAgICAgIHRocm93RXJyb3IodG9rZW4sIE1lc3NhZ2VzLlVuZXhwZWN0ZWRUb2tlbiwgdG9rZW4udmFsdWUpO1xuICAgIH1cblxuICAgIC8vIEV4cGVjdCB0aGUgbmV4dCB0b2tlbiB0byBtYXRjaCB0aGUgc3BlY2lmaWVkIHB1bmN0dWF0b3IuXG4gICAgLy8gSWYgbm90LCBhbiBleGNlcHRpb24gd2lsbCBiZSB0aHJvd24uXG5cbiAgICBmdW5jdGlvbiBleHBlY3QodmFsdWUpIHtcbiAgICAgICAgdmFyIHRva2VuID0gbGV4KCk7XG4gICAgICAgIGlmICh0b2tlbi50eXBlICE9PSBUb2tlbi5QdW5jdHVhdG9yIHx8IHRva2VuLnZhbHVlICE9PSB2YWx1ZSkge1xuICAgICAgICAgICAgdGhyb3dVbmV4cGVjdGVkKHRva2VuKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8vIEV4cGVjdCB0aGUgbmV4dCB0b2tlbiB0byBtYXRjaCB0aGUgc3BlY2lmaWVkIGtleXdvcmQuXG4gICAgLy8gSWYgbm90LCBhbiBleGNlcHRpb24gd2lsbCBiZSB0aHJvd24uXG5cbiAgICBmdW5jdGlvbiBleHBlY3RLZXl3b3JkKGtleXdvcmQpIHtcbiAgICAgICAgdmFyIHRva2VuID0gbGV4KCk7XG4gICAgICAgIGlmICh0b2tlbi50eXBlICE9PSBUb2tlbi5LZXl3b3JkIHx8IHRva2VuLnZhbHVlICE9PSBrZXl3b3JkKSB7XG4gICAgICAgICAgICB0aHJvd1VuZXhwZWN0ZWQodG9rZW4pO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy8gUmV0dXJuIHRydWUgaWYgdGhlIG5leHQgdG9rZW4gbWF0Y2hlcyB0aGUgc3BlY2lmaWVkIHB1bmN0dWF0b3IuXG5cbiAgICBmdW5jdGlvbiBtYXRjaCh2YWx1ZSkge1xuICAgICAgICB2YXIgdG9rZW4gPSBsb29rYWhlYWQoKTtcbiAgICAgICAgcmV0dXJuIHRva2VuLnR5cGUgPT09IFRva2VuLlB1bmN0dWF0b3IgJiYgdG9rZW4udmFsdWUgPT09IHZhbHVlO1xuICAgIH1cblxuICAgIC8vIFJldHVybiB0cnVlIGlmIHRoZSBuZXh0IHRva2VuIG1hdGNoZXMgdGhlIHNwZWNpZmllZCBrZXl3b3JkXG5cbiAgICBmdW5jdGlvbiBtYXRjaEtleXdvcmQoa2V5d29yZCkge1xuICAgICAgICB2YXIgdG9rZW4gPSBsb29rYWhlYWQoKTtcbiAgICAgICAgcmV0dXJuIHRva2VuLnR5cGUgPT09IFRva2VuLktleXdvcmQgJiYgdG9rZW4udmFsdWUgPT09IGtleXdvcmQ7XG4gICAgfVxuXG4gICAgLy8gUmV0dXJuIHRydWUgaWYgdGhlIG5leHQgdG9rZW4gaXMgYW4gYXNzaWdubWVudCBvcGVyYXRvclxuXG4gICAgZnVuY3Rpb24gbWF0Y2hBc3NpZ24oKSB7XG4gICAgICAgIHZhciB0b2tlbiA9IGxvb2thaGVhZCgpLFxuICAgICAgICAgICAgb3AgPSB0b2tlbi52YWx1ZTtcblxuICAgICAgICBpZiAodG9rZW4udHlwZSAhPT0gVG9rZW4uUHVuY3R1YXRvcikge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBvcCA9PT0gJz0nIHx8XG4gICAgICAgICAgICBvcCA9PT0gJyo9JyB8fFxuICAgICAgICAgICAgb3AgPT09ICcvPScgfHxcbiAgICAgICAgICAgIG9wID09PSAnJT0nIHx8XG4gICAgICAgICAgICBvcCA9PT0gJys9JyB8fFxuICAgICAgICAgICAgb3AgPT09ICctPScgfHxcbiAgICAgICAgICAgIG9wID09PSAnPDw9JyB8fFxuICAgICAgICAgICAgb3AgPT09ICc+Pj0nIHx8XG4gICAgICAgICAgICBvcCA9PT0gJz4+Pj0nIHx8XG4gICAgICAgICAgICBvcCA9PT0gJyY9JyB8fFxuICAgICAgICAgICAgb3AgPT09ICdePScgfHxcbiAgICAgICAgICAgIG9wID09PSAnfD0nO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGNvbnN1bWVTZW1pY29sb24oKSB7XG4gICAgICAgIHZhciB0b2tlbiwgbGluZTtcblxuICAgICAgICAvLyBDYXRjaCB0aGUgdmVyeSBjb21tb24gY2FzZSBmaXJzdC5cbiAgICAgICAgaWYgKHNvdXJjZVtpbmRleF0gPT09ICc7Jykge1xuICAgICAgICAgICAgbGV4KCk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBsaW5lID0gbGluZU51bWJlcjtcbiAgICAgICAgc2tpcENvbW1lbnQoKTtcbiAgICAgICAgaWYgKGxpbmVOdW1iZXIgIT09IGxpbmUpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChtYXRjaCgnOycpKSB7XG4gICAgICAgICAgICBsZXgoKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIHRva2VuID0gbG9va2FoZWFkKCk7XG4gICAgICAgIGlmICh0b2tlbi50eXBlICE9PSBUb2tlbi5FT0YgJiYgIW1hdGNoKCd9JykpIHtcbiAgICAgICAgICAgIHRocm93VW5leHBlY3RlZCh0b2tlbik7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBSZXR1cm4gdHJ1ZSBpZiBwcm92aWRlZCBleHByZXNzaW9uIGlzIExlZnRIYW5kU2lkZUV4cHJlc3Npb25cblxuICAgIGZ1bmN0aW9uIGlzTGVmdEhhbmRTaWRlKGV4cHIpIHtcbiAgICAgICAgcmV0dXJuIGV4cHIudHlwZSA9PT0gU3ludGF4LklkZW50aWZpZXIgfHwgZXhwci50eXBlID09PSBTeW50YXguTWVtYmVyRXhwcmVzc2lvbjtcbiAgICB9XG5cbiAgICAvLyAxMS4xLjQgQXJyYXkgSW5pdGlhbGlzZXJcblxuICAgIGZ1bmN0aW9uIHBhcnNlQXJyYXlJbml0aWFsaXNlcigpIHtcbiAgICAgICAgdmFyIGVsZW1lbnRzID0gW107XG5cbiAgICAgICAgZXhwZWN0KCdbJyk7XG5cbiAgICAgICAgd2hpbGUgKCFtYXRjaCgnXScpKSB7XG4gICAgICAgICAgICBpZiAobWF0Y2goJywnKSkge1xuICAgICAgICAgICAgICAgIGxleCgpO1xuICAgICAgICAgICAgICAgIGVsZW1lbnRzLnB1c2gobnVsbCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGVsZW1lbnRzLnB1c2gocGFyc2VBc3NpZ25tZW50RXhwcmVzc2lvbigpKTtcblxuICAgICAgICAgICAgICAgIGlmICghbWF0Y2goJ10nKSkge1xuICAgICAgICAgICAgICAgICAgICBleHBlY3QoJywnKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBleHBlY3QoJ10nKTtcblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgdHlwZTogU3ludGF4LkFycmF5RXhwcmVzc2lvbixcbiAgICAgICAgICAgIGVsZW1lbnRzOiBlbGVtZW50c1xuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8vIDExLjEuNSBPYmplY3QgSW5pdGlhbGlzZXJcblxuICAgIGZ1bmN0aW9uIHBhcnNlUHJvcGVydHlGdW5jdGlvbihwYXJhbSwgZmlyc3QpIHtcbiAgICAgICAgdmFyIHByZXZpb3VzU3RyaWN0LCBib2R5O1xuXG4gICAgICAgIHByZXZpb3VzU3RyaWN0ID0gc3RyaWN0O1xuICAgICAgICBib2R5ID0gcGFyc2VGdW5jdGlvblNvdXJjZUVsZW1lbnRzKCk7XG4gICAgICAgIGlmIChmaXJzdCAmJiBzdHJpY3QgJiYgaXNSZXN0cmljdGVkV29yZChwYXJhbVswXS5uYW1lKSkge1xuICAgICAgICAgICAgdGhyb3dFcnJvclRvbGVyYW50KGZpcnN0LCBNZXNzYWdlcy5TdHJpY3RQYXJhbU5hbWUpO1xuICAgICAgICB9XG4gICAgICAgIHN0cmljdCA9IHByZXZpb3VzU3RyaWN0O1xuXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB0eXBlOiBTeW50YXguRnVuY3Rpb25FeHByZXNzaW9uLFxuICAgICAgICAgICAgaWQ6IG51bGwsXG4gICAgICAgICAgICBwYXJhbXM6IHBhcmFtLFxuICAgICAgICAgICAgZGVmYXVsdHM6IFtdLFxuICAgICAgICAgICAgYm9keTogYm9keSxcbiAgICAgICAgICAgIHJlc3Q6IG51bGwsXG4gICAgICAgICAgICBnZW5lcmF0b3I6IGZhbHNlLFxuICAgICAgICAgICAgZXhwcmVzc2lvbjogZmFsc2VcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBwYXJzZU9iamVjdFByb3BlcnR5S2V5KCkge1xuICAgICAgICB2YXIgdG9rZW4gPSBsZXgoKTtcblxuICAgICAgICAvLyBOb3RlOiBUaGlzIGZ1bmN0aW9uIGlzIGNhbGxlZCBvbmx5IGZyb20gcGFyc2VPYmplY3RQcm9wZXJ0eSgpLCB3aGVyZVxuICAgICAgICAvLyBFT0YgYW5kIFB1bmN0dWF0b3IgdG9rZW5zIGFyZSBhbHJlYWR5IGZpbHRlcmVkIG91dC5cblxuICAgICAgICBpZiAodG9rZW4udHlwZSA9PT0gVG9rZW4uU3RyaW5nTGl0ZXJhbCB8fCB0b2tlbi50eXBlID09PSBUb2tlbi5OdW1lcmljTGl0ZXJhbCkge1xuICAgICAgICAgICAgaWYgKHN0cmljdCAmJiB0b2tlbi5vY3RhbCkge1xuICAgICAgICAgICAgICAgIHRocm93RXJyb3JUb2xlcmFudCh0b2tlbiwgTWVzc2FnZXMuU3RyaWN0T2N0YWxMaXRlcmFsKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBjcmVhdGVMaXRlcmFsKHRva2VuKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB0eXBlOiBTeW50YXguSWRlbnRpZmllcixcbiAgICAgICAgICAgIG5hbWU6IHRva2VuLnZhbHVlXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcGFyc2VPYmplY3RQcm9wZXJ0eSgpIHtcbiAgICAgICAgdmFyIHRva2VuLCBrZXksIGlkLCBwYXJhbTtcblxuICAgICAgICB0b2tlbiA9IGxvb2thaGVhZCgpO1xuXG4gICAgICAgIGlmICh0b2tlbi50eXBlID09PSBUb2tlbi5JZGVudGlmaWVyKSB7XG5cbiAgICAgICAgICAgIGlkID0gcGFyc2VPYmplY3RQcm9wZXJ0eUtleSgpO1xuXG4gICAgICAgICAgICAvLyBQcm9wZXJ0eSBBc3NpZ25tZW50OiBHZXR0ZXIgYW5kIFNldHRlci5cblxuICAgICAgICAgICAgaWYgKHRva2VuLnZhbHVlID09PSAnZ2V0JyAmJiAhbWF0Y2goJzonKSkge1xuICAgICAgICAgICAgICAgIGtleSA9IHBhcnNlT2JqZWN0UHJvcGVydHlLZXkoKTtcbiAgICAgICAgICAgICAgICBleHBlY3QoJygnKTtcbiAgICAgICAgICAgICAgICBleHBlY3QoJyknKTtcbiAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiBTeW50YXguUHJvcGVydHksXG4gICAgICAgICAgICAgICAgICAgIGtleToga2V5LFxuICAgICAgICAgICAgICAgICAgICB2YWx1ZTogcGFyc2VQcm9wZXJ0eUZ1bmN0aW9uKFtdKSxcbiAgICAgICAgICAgICAgICAgICAga2luZDogJ2dldCdcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfSBlbHNlIGlmICh0b2tlbi52YWx1ZSA9PT0gJ3NldCcgJiYgIW1hdGNoKCc6JykpIHtcbiAgICAgICAgICAgICAgICBrZXkgPSBwYXJzZU9iamVjdFByb3BlcnR5S2V5KCk7XG4gICAgICAgICAgICAgICAgZXhwZWN0KCcoJyk7XG4gICAgICAgICAgICAgICAgdG9rZW4gPSBsb29rYWhlYWQoKTtcbiAgICAgICAgICAgICAgICBpZiAodG9rZW4udHlwZSAhPT0gVG9rZW4uSWRlbnRpZmllcikge1xuICAgICAgICAgICAgICAgICAgICBleHBlY3QoJyknKTtcbiAgICAgICAgICAgICAgICAgICAgdGhyb3dFcnJvclRvbGVyYW50KHRva2VuLCBNZXNzYWdlcy5VbmV4cGVjdGVkVG9rZW4sIHRva2VuLnZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6IFN5bnRheC5Qcm9wZXJ0eSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGtleToga2V5LFxuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6IHBhcnNlUHJvcGVydHlGdW5jdGlvbihbXSksXG4gICAgICAgICAgICAgICAgICAgICAgICBraW5kOiAnc2V0J1xuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHBhcmFtID0gWyBwYXJzZVZhcmlhYmxlSWRlbnRpZmllcigpIF07XG4gICAgICAgICAgICAgICAgICAgIGV4cGVjdCgnKScpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogU3ludGF4LlByb3BlcnR5LFxuICAgICAgICAgICAgICAgICAgICAgICAga2V5OiBrZXksXG4gICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZTogcGFyc2VQcm9wZXJ0eUZ1bmN0aW9uKHBhcmFtLCB0b2tlbiksXG4gICAgICAgICAgICAgICAgICAgICAgICBraW5kOiAnc2V0J1xuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgZXhwZWN0KCc6Jyk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogU3ludGF4LlByb3BlcnR5LFxuICAgICAgICAgICAgICAgICAgICBrZXk6IGlkLFxuICAgICAgICAgICAgICAgICAgICB2YWx1ZTogcGFyc2VBc3NpZ25tZW50RXhwcmVzc2lvbigpLFxuICAgICAgICAgICAgICAgICAgICBraW5kOiAnaW5pdCdcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKHRva2VuLnR5cGUgPT09IFRva2VuLkVPRiB8fCB0b2tlbi50eXBlID09PSBUb2tlbi5QdW5jdHVhdG9yKSB7XG4gICAgICAgICAgICB0aHJvd1VuZXhwZWN0ZWQodG9rZW4pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAga2V5ID0gcGFyc2VPYmplY3RQcm9wZXJ0eUtleSgpO1xuICAgICAgICAgICAgZXhwZWN0KCc6Jyk7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHR5cGU6IFN5bnRheC5Qcm9wZXJ0eSxcbiAgICAgICAgICAgICAgICBrZXk6IGtleSxcbiAgICAgICAgICAgICAgICB2YWx1ZTogcGFyc2VBc3NpZ25tZW50RXhwcmVzc2lvbigpLFxuICAgICAgICAgICAgICAgIGtpbmQ6ICdpbml0J1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIHBhcnNlT2JqZWN0SW5pdGlhbGlzZXIoKSB7XG4gICAgICAgIHZhciBwcm9wZXJ0aWVzID0gW10sIHByb3BlcnR5LCBuYW1lLCBraW5kLCBtYXAgPSB7fSwgdG9TdHJpbmcgPSBTdHJpbmc7XG5cbiAgICAgICAgZXhwZWN0KCd7Jyk7XG5cbiAgICAgICAgd2hpbGUgKCFtYXRjaCgnfScpKSB7XG4gICAgICAgICAgICBwcm9wZXJ0eSA9IHBhcnNlT2JqZWN0UHJvcGVydHkoKTtcblxuICAgICAgICAgICAgaWYgKHByb3BlcnR5LmtleS50eXBlID09PSBTeW50YXguSWRlbnRpZmllcikge1xuICAgICAgICAgICAgICAgIG5hbWUgPSBwcm9wZXJ0eS5rZXkubmFtZTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgbmFtZSA9IHRvU3RyaW5nKHByb3BlcnR5LmtleS52YWx1ZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBraW5kID0gKHByb3BlcnR5LmtpbmQgPT09ICdpbml0JykgPyBQcm9wZXJ0eUtpbmQuRGF0YSA6IChwcm9wZXJ0eS5raW5kID09PSAnZ2V0JykgPyBQcm9wZXJ0eUtpbmQuR2V0IDogUHJvcGVydHlLaW5kLlNldDtcbiAgICAgICAgICAgIGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwobWFwLCBuYW1lKSkge1xuICAgICAgICAgICAgICAgIGlmIChtYXBbbmFtZV0gPT09IFByb3BlcnR5S2luZC5EYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChzdHJpY3QgJiYga2luZCA9PT0gUHJvcGVydHlLaW5kLkRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRocm93RXJyb3JUb2xlcmFudCh7fSwgTWVzc2FnZXMuU3RyaWN0RHVwbGljYXRlUHJvcGVydHkpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGtpbmQgIT09IFByb3BlcnR5S2luZC5EYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aHJvd0Vycm9yVG9sZXJhbnQoe30sIE1lc3NhZ2VzLkFjY2Vzc29yRGF0YVByb3BlcnR5KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChraW5kID09PSBQcm9wZXJ0eUtpbmQuRGF0YSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3dFcnJvclRvbGVyYW50KHt9LCBNZXNzYWdlcy5BY2Nlc3NvckRhdGFQcm9wZXJ0eSk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAobWFwW25hbWVdICYga2luZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3dFcnJvclRvbGVyYW50KHt9LCBNZXNzYWdlcy5BY2Nlc3NvckdldFNldCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgbWFwW25hbWVdIHw9IGtpbmQ7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIG1hcFtuYW1lXSA9IGtpbmQ7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHByb3BlcnRpZXMucHVzaChwcm9wZXJ0eSk7XG5cbiAgICAgICAgICAgIGlmICghbWF0Y2goJ30nKSkge1xuICAgICAgICAgICAgICAgIGV4cGVjdCgnLCcpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgZXhwZWN0KCd9Jyk7XG5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHR5cGU6IFN5bnRheC5PYmplY3RFeHByZXNzaW9uLFxuICAgICAgICAgICAgcHJvcGVydGllczogcHJvcGVydGllc1xuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8vIDExLjEuNiBUaGUgR3JvdXBpbmcgT3BlcmF0b3JcblxuICAgIGZ1bmN0aW9uIHBhcnNlR3JvdXBFeHByZXNzaW9uKCkge1xuICAgICAgICB2YXIgZXhwcjtcblxuICAgICAgICBleHBlY3QoJygnKTtcblxuICAgICAgICBleHByID0gcGFyc2VFeHByZXNzaW9uKCk7XG5cbiAgICAgICAgZXhwZWN0KCcpJyk7XG5cbiAgICAgICAgcmV0dXJuIGV4cHI7XG4gICAgfVxuXG5cbiAgICAvLyAxMS4xIFByaW1hcnkgRXhwcmVzc2lvbnNcblxuICAgIGZ1bmN0aW9uIHBhcnNlUHJpbWFyeUV4cHJlc3Npb24oKSB7XG4gICAgICAgIHZhciB0b2tlbiA9IGxvb2thaGVhZCgpLFxuICAgICAgICAgICAgdHlwZSA9IHRva2VuLnR5cGU7XG5cbiAgICAgICAgaWYgKHR5cGUgPT09IFRva2VuLklkZW50aWZpZXIpIHtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgdHlwZTogU3ludGF4LklkZW50aWZpZXIsXG4gICAgICAgICAgICAgICAgbmFtZTogbGV4KCkudmFsdWVcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodHlwZSA9PT0gVG9rZW4uU3RyaW5nTGl0ZXJhbCB8fCB0eXBlID09PSBUb2tlbi5OdW1lcmljTGl0ZXJhbCkge1xuICAgICAgICAgICAgaWYgKHN0cmljdCAmJiB0b2tlbi5vY3RhbCkge1xuICAgICAgICAgICAgICAgIHRocm93RXJyb3JUb2xlcmFudCh0b2tlbiwgTWVzc2FnZXMuU3RyaWN0T2N0YWxMaXRlcmFsKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBjcmVhdGVMaXRlcmFsKGxleCgpKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0eXBlID09PSBUb2tlbi5LZXl3b3JkKSB7XG4gICAgICAgICAgICBpZiAobWF0Y2hLZXl3b3JkKCd0aGlzJykpIHtcbiAgICAgICAgICAgICAgICBsZXgoKTtcbiAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiBTeW50YXguVGhpc0V4cHJlc3Npb25cbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAobWF0Y2hLZXl3b3JkKCdmdW5jdGlvbicpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHBhcnNlRnVuY3Rpb25FeHByZXNzaW9uKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodHlwZSA9PT0gVG9rZW4uQm9vbGVhbkxpdGVyYWwpIHtcbiAgICAgICAgICAgIGxleCgpO1xuICAgICAgICAgICAgdG9rZW4udmFsdWUgPSAodG9rZW4udmFsdWUgPT09ICd0cnVlJyk7XG4gICAgICAgICAgICByZXR1cm4gY3JlYXRlTGl0ZXJhbCh0b2tlbik7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodHlwZSA9PT0gVG9rZW4uTnVsbExpdGVyYWwpIHtcbiAgICAgICAgICAgIGxleCgpO1xuICAgICAgICAgICAgdG9rZW4udmFsdWUgPSBudWxsO1xuICAgICAgICAgICAgcmV0dXJuIGNyZWF0ZUxpdGVyYWwodG9rZW4pO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKG1hdGNoKCdbJykpIHtcbiAgICAgICAgICAgIHJldHVybiBwYXJzZUFycmF5SW5pdGlhbGlzZXIoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChtYXRjaCgneycpKSB7XG4gICAgICAgICAgICByZXR1cm4gcGFyc2VPYmplY3RJbml0aWFsaXNlcigpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKG1hdGNoKCcoJykpIHtcbiAgICAgICAgICAgIHJldHVybiBwYXJzZUdyb3VwRXhwcmVzc2lvbigpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKG1hdGNoKCcvJykgfHwgbWF0Y2goJy89JykpIHtcbiAgICAgICAgICAgIHJldHVybiBjcmVhdGVMaXRlcmFsKHNjYW5SZWdFeHAoKSk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdGhyb3dVbmV4cGVjdGVkKGxleCgpKTtcbiAgICB9XG5cbiAgICAvLyAxMS4yIExlZnQtSGFuZC1TaWRlIEV4cHJlc3Npb25zXG5cbiAgICBmdW5jdGlvbiBwYXJzZUFyZ3VtZW50cygpIHtcbiAgICAgICAgdmFyIGFyZ3MgPSBbXTtcblxuICAgICAgICBleHBlY3QoJygnKTtcblxuICAgICAgICBpZiAoIW1hdGNoKCcpJykpIHtcbiAgICAgICAgICAgIHdoaWxlIChpbmRleCA8IGxlbmd0aCkge1xuICAgICAgICAgICAgICAgIGFyZ3MucHVzaChwYXJzZUFzc2lnbm1lbnRFeHByZXNzaW9uKCkpO1xuICAgICAgICAgICAgICAgIGlmIChtYXRjaCgnKScpKSB7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBleHBlY3QoJywnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGV4cGVjdCgnKScpO1xuXG4gICAgICAgIHJldHVybiBhcmdzO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHBhcnNlTm9uQ29tcHV0ZWRQcm9wZXJ0eSgpIHtcbiAgICAgICAgdmFyIHRva2VuID0gbGV4KCk7XG5cbiAgICAgICAgaWYgKCFpc0lkZW50aWZpZXJOYW1lKHRva2VuKSkge1xuICAgICAgICAgICAgdGhyb3dVbmV4cGVjdGVkKHRva2VuKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB0eXBlOiBTeW50YXguSWRlbnRpZmllcixcbiAgICAgICAgICAgIG5hbWU6IHRva2VuLnZhbHVlXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcGFyc2VOb25Db21wdXRlZE1lbWJlcigpIHtcbiAgICAgICAgZXhwZWN0KCcuJyk7XG5cbiAgICAgICAgcmV0dXJuIHBhcnNlTm9uQ29tcHV0ZWRQcm9wZXJ0eSgpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHBhcnNlQ29tcHV0ZWRNZW1iZXIoKSB7XG4gICAgICAgIHZhciBleHByO1xuXG4gICAgICAgIGV4cGVjdCgnWycpO1xuXG4gICAgICAgIGV4cHIgPSBwYXJzZUV4cHJlc3Npb24oKTtcblxuICAgICAgICBleHBlY3QoJ10nKTtcblxuICAgICAgICByZXR1cm4gZXhwcjtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBwYXJzZU5ld0V4cHJlc3Npb24oKSB7XG4gICAgICAgIHZhciBleHByO1xuXG4gICAgICAgIGV4cGVjdEtleXdvcmQoJ25ldycpO1xuXG4gICAgICAgIGV4cHIgPSB7XG4gICAgICAgICAgICB0eXBlOiBTeW50YXguTmV3RXhwcmVzc2lvbixcbiAgICAgICAgICAgIGNhbGxlZTogcGFyc2VMZWZ0SGFuZFNpZGVFeHByZXNzaW9uKCksXG4gICAgICAgICAgICAnYXJndW1lbnRzJzogW11cbiAgICAgICAgfTtcblxuICAgICAgICBpZiAobWF0Y2goJygnKSkge1xuICAgICAgICAgICAgZXhwclsnYXJndW1lbnRzJ10gPSBwYXJzZUFyZ3VtZW50cygpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGV4cHI7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcGFyc2VMZWZ0SGFuZFNpZGVFeHByZXNzaW9uQWxsb3dDYWxsKCkge1xuICAgICAgICB2YXIgZXhwcjtcblxuICAgICAgICBleHByID0gbWF0Y2hLZXl3b3JkKCduZXcnKSA/IHBhcnNlTmV3RXhwcmVzc2lvbigpIDogcGFyc2VQcmltYXJ5RXhwcmVzc2lvbigpO1xuXG4gICAgICAgIHdoaWxlIChtYXRjaCgnLicpIHx8IG1hdGNoKCdbJykgfHwgbWF0Y2goJygnKSkge1xuICAgICAgICAgICAgaWYgKG1hdGNoKCcoJykpIHtcbiAgICAgICAgICAgICAgICBleHByID0ge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiBTeW50YXguQ2FsbEV4cHJlc3Npb24sXG4gICAgICAgICAgICAgICAgICAgIGNhbGxlZTogZXhwcixcbiAgICAgICAgICAgICAgICAgICAgJ2FyZ3VtZW50cyc6IHBhcnNlQXJndW1lbnRzKClcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfSBlbHNlIGlmIChtYXRjaCgnWycpKSB7XG4gICAgICAgICAgICAgICAgZXhwciA9IHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogU3ludGF4Lk1lbWJlckV4cHJlc3Npb24sXG4gICAgICAgICAgICAgICAgICAgIGNvbXB1dGVkOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICBvYmplY3Q6IGV4cHIsXG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnR5OiBwYXJzZUNvbXB1dGVkTWVtYmVyKClcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBleHByID0ge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiBTeW50YXguTWVtYmVyRXhwcmVzc2lvbixcbiAgICAgICAgICAgICAgICAgICAgY29tcHV0ZWQ6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICBvYmplY3Q6IGV4cHIsXG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnR5OiBwYXJzZU5vbkNvbXB1dGVkTWVtYmVyKClcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGV4cHI7XG4gICAgfVxuXG5cbiAgICBmdW5jdGlvbiBwYXJzZUxlZnRIYW5kU2lkZUV4cHJlc3Npb24oKSB7XG4gICAgICAgIHZhciBleHByO1xuXG4gICAgICAgIGV4cHIgPSBtYXRjaEtleXdvcmQoJ25ldycpID8gcGFyc2VOZXdFeHByZXNzaW9uKCkgOiBwYXJzZVByaW1hcnlFeHByZXNzaW9uKCk7XG5cbiAgICAgICAgd2hpbGUgKG1hdGNoKCcuJykgfHwgbWF0Y2goJ1snKSkge1xuICAgICAgICAgICAgaWYgKG1hdGNoKCdbJykpIHtcbiAgICAgICAgICAgICAgICBleHByID0ge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiBTeW50YXguTWVtYmVyRXhwcmVzc2lvbixcbiAgICAgICAgICAgICAgICAgICAgY29tcHV0ZWQ6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIG9iamVjdDogZXhwcixcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydHk6IHBhcnNlQ29tcHV0ZWRNZW1iZXIoKVxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGV4cHIgPSB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IFN5bnRheC5NZW1iZXJFeHByZXNzaW9uLFxuICAgICAgICAgICAgICAgICAgICBjb21wdXRlZDogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgIG9iamVjdDogZXhwcixcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydHk6IHBhcnNlTm9uQ29tcHV0ZWRNZW1iZXIoKVxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gZXhwcjtcbiAgICB9XG5cbiAgICAvLyAxMS4zIFBvc3RmaXggRXhwcmVzc2lvbnNcblxuICAgIGZ1bmN0aW9uIHBhcnNlUG9zdGZpeEV4cHJlc3Npb24oKSB7XG4gICAgICAgIHZhciBleHByID0gcGFyc2VMZWZ0SGFuZFNpZGVFeHByZXNzaW9uQWxsb3dDYWxsKCksIHRva2VuO1xuXG4gICAgICAgIHRva2VuID0gbG9va2FoZWFkKCk7XG4gICAgICAgIGlmICh0b2tlbi50eXBlICE9PSBUb2tlbi5QdW5jdHVhdG9yKSB7XG4gICAgICAgICAgICByZXR1cm4gZXhwcjtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICgobWF0Y2goJysrJykgfHwgbWF0Y2goJy0tJykpICYmICFwZWVrTGluZVRlcm1pbmF0b3IoKSkge1xuICAgICAgICAgICAgLy8gMTEuMy4xLCAxMS4zLjJcbiAgICAgICAgICAgIGlmIChzdHJpY3QgJiYgZXhwci50eXBlID09PSBTeW50YXguSWRlbnRpZmllciAmJiBpc1Jlc3RyaWN0ZWRXb3JkKGV4cHIubmFtZSkpIHtcbiAgICAgICAgICAgICAgICB0aHJvd0Vycm9yVG9sZXJhbnQoe30sIE1lc3NhZ2VzLlN0cmljdExIU1Bvc3RmaXgpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoIWlzTGVmdEhhbmRTaWRlKGV4cHIpKSB7XG4gICAgICAgICAgICAgICAgdGhyb3dFcnJvcih7fSwgTWVzc2FnZXMuSW52YWxpZExIU0luQXNzaWdubWVudCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGV4cHIgPSB7XG4gICAgICAgICAgICAgICAgdHlwZTogU3ludGF4LlVwZGF0ZUV4cHJlc3Npb24sXG4gICAgICAgICAgICAgICAgb3BlcmF0b3I6IGxleCgpLnZhbHVlLFxuICAgICAgICAgICAgICAgIGFyZ3VtZW50OiBleHByLFxuICAgICAgICAgICAgICAgIHByZWZpeDogZmFsc2VcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gZXhwcjtcbiAgICB9XG5cbiAgICAvLyAxMS40IFVuYXJ5IE9wZXJhdG9yc1xuXG4gICAgZnVuY3Rpb24gcGFyc2VVbmFyeUV4cHJlc3Npb24oKSB7XG4gICAgICAgIHZhciB0b2tlbiwgZXhwcjtcblxuICAgICAgICB0b2tlbiA9IGxvb2thaGVhZCgpO1xuICAgICAgICBpZiAodG9rZW4udHlwZSAhPT0gVG9rZW4uUHVuY3R1YXRvciAmJiB0b2tlbi50eXBlICE9PSBUb2tlbi5LZXl3b3JkKSB7XG4gICAgICAgICAgICByZXR1cm4gcGFyc2VQb3N0Zml4RXhwcmVzc2lvbigpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKG1hdGNoKCcrKycpIHx8IG1hdGNoKCctLScpKSB7XG4gICAgICAgICAgICB0b2tlbiA9IGxleCgpO1xuICAgICAgICAgICAgZXhwciA9IHBhcnNlVW5hcnlFeHByZXNzaW9uKCk7XG4gICAgICAgICAgICAvLyAxMS40LjQsIDExLjQuNVxuICAgICAgICAgICAgaWYgKHN0cmljdCAmJiBleHByLnR5cGUgPT09IFN5bnRheC5JZGVudGlmaWVyICYmIGlzUmVzdHJpY3RlZFdvcmQoZXhwci5uYW1lKSkge1xuICAgICAgICAgICAgICAgIHRocm93RXJyb3JUb2xlcmFudCh7fSwgTWVzc2FnZXMuU3RyaWN0TEhTUHJlZml4KTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKCFpc0xlZnRIYW5kU2lkZShleHByKSkge1xuICAgICAgICAgICAgICAgIHRocm93RXJyb3Ioe30sIE1lc3NhZ2VzLkludmFsaWRMSFNJbkFzc2lnbm1lbnQpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBleHByID0ge1xuICAgICAgICAgICAgICAgIHR5cGU6IFN5bnRheC5VcGRhdGVFeHByZXNzaW9uLFxuICAgICAgICAgICAgICAgIG9wZXJhdG9yOiB0b2tlbi52YWx1ZSxcbiAgICAgICAgICAgICAgICBhcmd1bWVudDogZXhwcixcbiAgICAgICAgICAgICAgICBwcmVmaXg6IHRydWVcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICByZXR1cm4gZXhwcjtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChtYXRjaCgnKycpIHx8IG1hdGNoKCctJykgfHwgbWF0Y2goJ34nKSB8fCBtYXRjaCgnIScpKSB7XG4gICAgICAgICAgICBleHByID0ge1xuICAgICAgICAgICAgICAgIHR5cGU6IFN5bnRheC5VbmFyeUV4cHJlc3Npb24sXG4gICAgICAgICAgICAgICAgb3BlcmF0b3I6IGxleCgpLnZhbHVlLFxuICAgICAgICAgICAgICAgIGFyZ3VtZW50OiBwYXJzZVVuYXJ5RXhwcmVzc2lvbigpLFxuICAgICAgICAgICAgICAgIHByZWZpeDogdHJ1ZVxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIHJldHVybiBleHByO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKG1hdGNoS2V5d29yZCgnZGVsZXRlJykgfHwgbWF0Y2hLZXl3b3JkKCd2b2lkJykgfHwgbWF0Y2hLZXl3b3JkKCd0eXBlb2YnKSkge1xuICAgICAgICAgICAgZXhwciA9IHtcbiAgICAgICAgICAgICAgICB0eXBlOiBTeW50YXguVW5hcnlFeHByZXNzaW9uLFxuICAgICAgICAgICAgICAgIG9wZXJhdG9yOiBsZXgoKS52YWx1ZSxcbiAgICAgICAgICAgICAgICBhcmd1bWVudDogcGFyc2VVbmFyeUV4cHJlc3Npb24oKSxcbiAgICAgICAgICAgICAgICBwcmVmaXg6IHRydWVcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBpZiAoc3RyaWN0ICYmIGV4cHIub3BlcmF0b3IgPT09ICdkZWxldGUnICYmIGV4cHIuYXJndW1lbnQudHlwZSA9PT0gU3ludGF4LklkZW50aWZpZXIpIHtcbiAgICAgICAgICAgICAgICB0aHJvd0Vycm9yVG9sZXJhbnQoe30sIE1lc3NhZ2VzLlN0cmljdERlbGV0ZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gZXhwcjtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBwYXJzZVBvc3RmaXhFeHByZXNzaW9uKCk7XG4gICAgfVxuXG4gICAgLy8gMTEuNSBNdWx0aXBsaWNhdGl2ZSBPcGVyYXRvcnNcblxuICAgIGZ1bmN0aW9uIHBhcnNlTXVsdGlwbGljYXRpdmVFeHByZXNzaW9uKCkge1xuICAgICAgICB2YXIgZXhwciA9IHBhcnNlVW5hcnlFeHByZXNzaW9uKCk7XG5cbiAgICAgICAgd2hpbGUgKG1hdGNoKCcqJykgfHwgbWF0Y2goJy8nKSB8fCBtYXRjaCgnJScpKSB7XG4gICAgICAgICAgICBleHByID0ge1xuICAgICAgICAgICAgICAgIHR5cGU6IFN5bnRheC5CaW5hcnlFeHByZXNzaW9uLFxuICAgICAgICAgICAgICAgIG9wZXJhdG9yOiBsZXgoKS52YWx1ZSxcbiAgICAgICAgICAgICAgICBsZWZ0OiBleHByLFxuICAgICAgICAgICAgICAgIHJpZ2h0OiBwYXJzZVVuYXJ5RXhwcmVzc2lvbigpXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGV4cHI7XG4gICAgfVxuXG4gICAgLy8gMTEuNiBBZGRpdGl2ZSBPcGVyYXRvcnNcblxuICAgIGZ1bmN0aW9uIHBhcnNlQWRkaXRpdmVFeHByZXNzaW9uKCkge1xuICAgICAgICB2YXIgZXhwciA9IHBhcnNlTXVsdGlwbGljYXRpdmVFeHByZXNzaW9uKCk7XG5cbiAgICAgICAgd2hpbGUgKG1hdGNoKCcrJykgfHwgbWF0Y2goJy0nKSkge1xuICAgICAgICAgICAgZXhwciA9IHtcbiAgICAgICAgICAgICAgICB0eXBlOiBTeW50YXguQmluYXJ5RXhwcmVzc2lvbixcbiAgICAgICAgICAgICAgICBvcGVyYXRvcjogbGV4KCkudmFsdWUsXG4gICAgICAgICAgICAgICAgbGVmdDogZXhwcixcbiAgICAgICAgICAgICAgICByaWdodDogcGFyc2VNdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb24oKVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBleHByO1xuICAgIH1cblxuICAgIC8vIDExLjcgQml0d2lzZSBTaGlmdCBPcGVyYXRvcnNcblxuICAgIGZ1bmN0aW9uIHBhcnNlU2hpZnRFeHByZXNzaW9uKCkge1xuICAgICAgICB2YXIgZXhwciA9IHBhcnNlQWRkaXRpdmVFeHByZXNzaW9uKCk7XG5cbiAgICAgICAgd2hpbGUgKG1hdGNoKCc8PCcpIHx8IG1hdGNoKCc+PicpIHx8IG1hdGNoKCc+Pj4nKSkge1xuICAgICAgICAgICAgZXhwciA9IHtcbiAgICAgICAgICAgICAgICB0eXBlOiBTeW50YXguQmluYXJ5RXhwcmVzc2lvbixcbiAgICAgICAgICAgICAgICBvcGVyYXRvcjogbGV4KCkudmFsdWUsXG4gICAgICAgICAgICAgICAgbGVmdDogZXhwcixcbiAgICAgICAgICAgICAgICByaWdodDogcGFyc2VBZGRpdGl2ZUV4cHJlc3Npb24oKVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBleHByO1xuICAgIH1cbiAgICAvLyAxMS44IFJlbGF0aW9uYWwgT3BlcmF0b3JzXG5cbiAgICBmdW5jdGlvbiBwYXJzZVJlbGF0aW9uYWxFeHByZXNzaW9uKCkge1xuICAgICAgICB2YXIgZXhwciwgcHJldmlvdXNBbGxvd0luO1xuXG4gICAgICAgIHByZXZpb3VzQWxsb3dJbiA9IHN0YXRlLmFsbG93SW47XG4gICAgICAgIHN0YXRlLmFsbG93SW4gPSB0cnVlO1xuXG4gICAgICAgIGV4cHIgPSBwYXJzZVNoaWZ0RXhwcmVzc2lvbigpO1xuXG4gICAgICAgIHdoaWxlIChtYXRjaCgnPCcpIHx8IG1hdGNoKCc+JykgfHwgbWF0Y2goJzw9JykgfHwgbWF0Y2goJz49JykgfHwgKHByZXZpb3VzQWxsb3dJbiAmJiBtYXRjaEtleXdvcmQoJ2luJykpIHx8IG1hdGNoS2V5d29yZCgnaW5zdGFuY2VvZicpKSB7XG4gICAgICAgICAgICBleHByID0ge1xuICAgICAgICAgICAgICAgIHR5cGU6IFN5bnRheC5CaW5hcnlFeHByZXNzaW9uLFxuICAgICAgICAgICAgICAgIG9wZXJhdG9yOiBsZXgoKS52YWx1ZSxcbiAgICAgICAgICAgICAgICBsZWZ0OiBleHByLFxuICAgICAgICAgICAgICAgIHJpZ2h0OiBwYXJzZVNoaWZ0RXhwcmVzc2lvbigpXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG5cbiAgICAgICAgc3RhdGUuYWxsb3dJbiA9IHByZXZpb3VzQWxsb3dJbjtcbiAgICAgICAgcmV0dXJuIGV4cHI7XG4gICAgfVxuXG4gICAgLy8gMTEuOSBFcXVhbGl0eSBPcGVyYXRvcnNcblxuICAgIGZ1bmN0aW9uIHBhcnNlRXF1YWxpdHlFeHByZXNzaW9uKCkge1xuICAgICAgICB2YXIgZXhwciA9IHBhcnNlUmVsYXRpb25hbEV4cHJlc3Npb24oKTtcblxuICAgICAgICB3aGlsZSAobWF0Y2goJz09JykgfHwgbWF0Y2goJyE9JykgfHwgbWF0Y2goJz09PScpIHx8IG1hdGNoKCchPT0nKSkge1xuICAgICAgICAgICAgZXhwciA9IHtcbiAgICAgICAgICAgICAgICB0eXBlOiBTeW50YXguQmluYXJ5RXhwcmVzc2lvbixcbiAgICAgICAgICAgICAgICBvcGVyYXRvcjogbGV4KCkudmFsdWUsXG4gICAgICAgICAgICAgICAgbGVmdDogZXhwcixcbiAgICAgICAgICAgICAgICByaWdodDogcGFyc2VSZWxhdGlvbmFsRXhwcmVzc2lvbigpXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGV4cHI7XG4gICAgfVxuXG4gICAgLy8gMTEuMTAgQmluYXJ5IEJpdHdpc2UgT3BlcmF0b3JzXG5cbiAgICBmdW5jdGlvbiBwYXJzZUJpdHdpc2VBTkRFeHByZXNzaW9uKCkge1xuICAgICAgICB2YXIgZXhwciA9IHBhcnNlRXF1YWxpdHlFeHByZXNzaW9uKCk7XG5cbiAgICAgICAgd2hpbGUgKG1hdGNoKCcmJykpIHtcbiAgICAgICAgICAgIGxleCgpO1xuICAgICAgICAgICAgZXhwciA9IHtcbiAgICAgICAgICAgICAgICB0eXBlOiBTeW50YXguQmluYXJ5RXhwcmVzc2lvbixcbiAgICAgICAgICAgICAgICBvcGVyYXRvcjogJyYnLFxuICAgICAgICAgICAgICAgIGxlZnQ6IGV4cHIsXG4gICAgICAgICAgICAgICAgcmlnaHQ6IHBhcnNlRXF1YWxpdHlFeHByZXNzaW9uKClcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gZXhwcjtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBwYXJzZUJpdHdpc2VYT1JFeHByZXNzaW9uKCkge1xuICAgICAgICB2YXIgZXhwciA9IHBhcnNlQml0d2lzZUFOREV4cHJlc3Npb24oKTtcblxuICAgICAgICB3aGlsZSAobWF0Y2goJ14nKSkge1xuICAgICAgICAgICAgbGV4KCk7XG4gICAgICAgICAgICBleHByID0ge1xuICAgICAgICAgICAgICAgIHR5cGU6IFN5bnRheC5CaW5hcnlFeHByZXNzaW9uLFxuICAgICAgICAgICAgICAgIG9wZXJhdG9yOiAnXicsXG4gICAgICAgICAgICAgICAgbGVmdDogZXhwcixcbiAgICAgICAgICAgICAgICByaWdodDogcGFyc2VCaXR3aXNlQU5ERXhwcmVzc2lvbigpXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGV4cHI7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcGFyc2VCaXR3aXNlT1JFeHByZXNzaW9uKCkge1xuICAgICAgICB2YXIgZXhwciA9IHBhcnNlQml0d2lzZVhPUkV4cHJlc3Npb24oKTtcblxuICAgICAgICB3aGlsZSAobWF0Y2goJ3wnKSkge1xuICAgICAgICAgICAgbGV4KCk7XG4gICAgICAgICAgICBleHByID0ge1xuICAgICAgICAgICAgICAgIHR5cGU6IFN5bnRheC5CaW5hcnlFeHByZXNzaW9uLFxuICAgICAgICAgICAgICAgIG9wZXJhdG9yOiAnfCcsXG4gICAgICAgICAgICAgICAgbGVmdDogZXhwcixcbiAgICAgICAgICAgICAgICByaWdodDogcGFyc2VCaXR3aXNlWE9SRXhwcmVzc2lvbigpXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGV4cHI7XG4gICAgfVxuXG4gICAgLy8gMTEuMTEgQmluYXJ5IExvZ2ljYWwgT3BlcmF0b3JzXG5cbiAgICBmdW5jdGlvbiBwYXJzZUxvZ2ljYWxBTkRFeHByZXNzaW9uKCkge1xuICAgICAgICB2YXIgZXhwciA9IHBhcnNlQml0d2lzZU9SRXhwcmVzc2lvbigpO1xuXG4gICAgICAgIHdoaWxlIChtYXRjaCgnJiYnKSkge1xuICAgICAgICAgICAgbGV4KCk7XG4gICAgICAgICAgICBleHByID0ge1xuICAgICAgICAgICAgICAgIHR5cGU6IFN5bnRheC5Mb2dpY2FsRXhwcmVzc2lvbixcbiAgICAgICAgICAgICAgICBvcGVyYXRvcjogJyYmJyxcbiAgICAgICAgICAgICAgICBsZWZ0OiBleHByLFxuICAgICAgICAgICAgICAgIHJpZ2h0OiBwYXJzZUJpdHdpc2VPUkV4cHJlc3Npb24oKVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBleHByO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHBhcnNlTG9naWNhbE9SRXhwcmVzc2lvbigpIHtcbiAgICAgICAgdmFyIGV4cHIgPSBwYXJzZUxvZ2ljYWxBTkRFeHByZXNzaW9uKCk7XG5cbiAgICAgICAgd2hpbGUgKG1hdGNoKCd8fCcpKSB7XG4gICAgICAgICAgICBsZXgoKTtcbiAgICAgICAgICAgIGV4cHIgPSB7XG4gICAgICAgICAgICAgICAgdHlwZTogU3ludGF4LkxvZ2ljYWxFeHByZXNzaW9uLFxuICAgICAgICAgICAgICAgIG9wZXJhdG9yOiAnfHwnLFxuICAgICAgICAgICAgICAgIGxlZnQ6IGV4cHIsXG4gICAgICAgICAgICAgICAgcmlnaHQ6IHBhcnNlTG9naWNhbEFOREV4cHJlc3Npb24oKVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBleHByO1xuICAgIH1cblxuICAgIC8vIDExLjEyIENvbmRpdGlvbmFsIE9wZXJhdG9yXG5cbiAgICBmdW5jdGlvbiBwYXJzZUNvbmRpdGlvbmFsRXhwcmVzc2lvbigpIHtcbiAgICAgICAgdmFyIGV4cHIsIHByZXZpb3VzQWxsb3dJbiwgY29uc2VxdWVudDtcblxuICAgICAgICBleHByID0gcGFyc2VMb2dpY2FsT1JFeHByZXNzaW9uKCk7XG5cbiAgICAgICAgaWYgKG1hdGNoKCc/JykpIHtcbiAgICAgICAgICAgIGxleCgpO1xuICAgICAgICAgICAgcHJldmlvdXNBbGxvd0luID0gc3RhdGUuYWxsb3dJbjtcbiAgICAgICAgICAgIHN0YXRlLmFsbG93SW4gPSB0cnVlO1xuICAgICAgICAgICAgY29uc2VxdWVudCA9IHBhcnNlQXNzaWdubWVudEV4cHJlc3Npb24oKTtcbiAgICAgICAgICAgIHN0YXRlLmFsbG93SW4gPSBwcmV2aW91c0FsbG93SW47XG4gICAgICAgICAgICBleHBlY3QoJzonKTtcblxuICAgICAgICAgICAgZXhwciA9IHtcbiAgICAgICAgICAgICAgICB0eXBlOiBTeW50YXguQ29uZGl0aW9uYWxFeHByZXNzaW9uLFxuICAgICAgICAgICAgICAgIHRlc3Q6IGV4cHIsXG4gICAgICAgICAgICAgICAgY29uc2VxdWVudDogY29uc2VxdWVudCxcbiAgICAgICAgICAgICAgICBhbHRlcm5hdGU6IHBhcnNlQXNzaWdubWVudEV4cHJlc3Npb24oKVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBleHByO1xuICAgIH1cblxuICAgIC8vIDExLjEzIEFzc2lnbm1lbnQgT3BlcmF0b3JzXG5cbiAgICBmdW5jdGlvbiBwYXJzZUFzc2lnbm1lbnRFeHByZXNzaW9uKCkge1xuICAgICAgICB2YXIgdG9rZW4sIGV4cHI7XG5cbiAgICAgICAgdG9rZW4gPSBsb29rYWhlYWQoKTtcbiAgICAgICAgZXhwciA9IHBhcnNlQ29uZGl0aW9uYWxFeHByZXNzaW9uKCk7XG5cbiAgICAgICAgaWYgKG1hdGNoQXNzaWduKCkpIHtcbiAgICAgICAgICAgIC8vIExlZnRIYW5kU2lkZUV4cHJlc3Npb25cbiAgICAgICAgICAgIGlmICghaXNMZWZ0SGFuZFNpZGUoZXhwcikpIHtcbiAgICAgICAgICAgICAgICB0aHJvd0Vycm9yKHt9LCBNZXNzYWdlcy5JbnZhbGlkTEhTSW5Bc3NpZ25tZW50KTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gMTEuMTMuMVxuICAgICAgICAgICAgaWYgKHN0cmljdCAmJiBleHByLnR5cGUgPT09IFN5bnRheC5JZGVudGlmaWVyICYmIGlzUmVzdHJpY3RlZFdvcmQoZXhwci5uYW1lKSkge1xuICAgICAgICAgICAgICAgIHRocm93RXJyb3JUb2xlcmFudCh0b2tlbiwgTWVzc2FnZXMuU3RyaWN0TEhTQXNzaWdubWVudCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGV4cHIgPSB7XG4gICAgICAgICAgICAgICAgdHlwZTogU3ludGF4LkFzc2lnbm1lbnRFeHByZXNzaW9uLFxuICAgICAgICAgICAgICAgIG9wZXJhdG9yOiBsZXgoKS52YWx1ZSxcbiAgICAgICAgICAgICAgICBsZWZ0OiBleHByLFxuICAgICAgICAgICAgICAgIHJpZ2h0OiBwYXJzZUFzc2lnbm1lbnRFeHByZXNzaW9uKClcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gZXhwcjtcbiAgICB9XG5cbiAgICAvLyAxMS4xNCBDb21tYSBPcGVyYXRvclxuXG4gICAgZnVuY3Rpb24gcGFyc2VFeHByZXNzaW9uKCkge1xuICAgICAgICB2YXIgZXhwciA9IHBhcnNlQXNzaWdubWVudEV4cHJlc3Npb24oKTtcblxuICAgICAgICBpZiAobWF0Y2goJywnKSkge1xuICAgICAgICAgICAgZXhwciA9IHtcbiAgICAgICAgICAgICAgICB0eXBlOiBTeW50YXguU2VxdWVuY2VFeHByZXNzaW9uLFxuICAgICAgICAgICAgICAgIGV4cHJlc3Npb25zOiBbIGV4cHIgXVxuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgd2hpbGUgKGluZGV4IDwgbGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgaWYgKCFtYXRjaCgnLCcpKSB7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBsZXgoKTtcbiAgICAgICAgICAgICAgICBleHByLmV4cHJlc3Npb25zLnB1c2gocGFyc2VBc3NpZ25tZW50RXhwcmVzc2lvbigpKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBleHByO1xuICAgIH1cblxuICAgIC8vIDEyLjEgQmxvY2tcblxuICAgIGZ1bmN0aW9uIHBhcnNlU3RhdGVtZW50TGlzdCgpIHtcbiAgICAgICAgdmFyIGxpc3QgPSBbXSxcbiAgICAgICAgICAgIHN0YXRlbWVudDtcblxuICAgICAgICB3aGlsZSAoaW5kZXggPCBsZW5ndGgpIHtcbiAgICAgICAgICAgIGlmIChtYXRjaCgnfScpKSB7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBzdGF0ZW1lbnQgPSBwYXJzZVNvdXJjZUVsZW1lbnQoKTtcbiAgICAgICAgICAgIGlmICh0eXBlb2Ygc3RhdGVtZW50ID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgbGlzdC5wdXNoKHN0YXRlbWVudCk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gbGlzdDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBwYXJzZUJsb2NrKCkge1xuICAgICAgICB2YXIgYmxvY2s7XG5cbiAgICAgICAgZXhwZWN0KCd7Jyk7XG5cbiAgICAgICAgYmxvY2sgPSBwYXJzZVN0YXRlbWVudExpc3QoKTtcblxuICAgICAgICBleHBlY3QoJ30nKTtcblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgdHlwZTogU3ludGF4LkJsb2NrU3RhdGVtZW50LFxuICAgICAgICAgICAgYm9keTogYmxvY2tcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvLyAxMi4yIFZhcmlhYmxlIFN0YXRlbWVudFxuXG4gICAgZnVuY3Rpb24gcGFyc2VWYXJpYWJsZUlkZW50aWZpZXIoKSB7XG4gICAgICAgIHZhciB0b2tlbiA9IGxleCgpO1xuXG4gICAgICAgIGlmICh0b2tlbi50eXBlICE9PSBUb2tlbi5JZGVudGlmaWVyKSB7XG4gICAgICAgICAgICB0aHJvd1VuZXhwZWN0ZWQodG9rZW4pO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHR5cGU6IFN5bnRheC5JZGVudGlmaWVyLFxuICAgICAgICAgICAgbmFtZTogdG9rZW4udmFsdWVcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBwYXJzZVZhcmlhYmxlRGVjbGFyYXRpb24oa2luZCkge1xuICAgICAgICB2YXIgaWQgPSBwYXJzZVZhcmlhYmxlSWRlbnRpZmllcigpLFxuICAgICAgICAgICAgaW5pdCA9IG51bGw7XG5cbiAgICAgICAgLy8gMTIuMi4xXG4gICAgICAgIGlmIChzdHJpY3QgJiYgaXNSZXN0cmljdGVkV29yZChpZC5uYW1lKSkge1xuICAgICAgICAgICAgdGhyb3dFcnJvclRvbGVyYW50KHt9LCBNZXNzYWdlcy5TdHJpY3RWYXJOYW1lKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChraW5kID09PSAnY29uc3QnKSB7XG4gICAgICAgICAgICBleHBlY3QoJz0nKTtcbiAgICAgICAgICAgIGluaXQgPSBwYXJzZUFzc2lnbm1lbnRFeHByZXNzaW9uKCk7XG4gICAgICAgIH0gZWxzZSBpZiAobWF0Y2goJz0nKSkge1xuICAgICAgICAgICAgbGV4KCk7XG4gICAgICAgICAgICBpbml0ID0gcGFyc2VBc3NpZ25tZW50RXhwcmVzc2lvbigpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHR5cGU6IFN5bnRheC5WYXJpYWJsZURlY2xhcmF0b3IsXG4gICAgICAgICAgICBpZDogaWQsXG4gICAgICAgICAgICBpbml0OiBpbml0XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcGFyc2VWYXJpYWJsZURlY2xhcmF0aW9uTGlzdChraW5kKSB7XG4gICAgICAgIHZhciBsaXN0ID0gW107XG5cbiAgICAgICAgZG8ge1xuICAgICAgICAgICAgbGlzdC5wdXNoKHBhcnNlVmFyaWFibGVEZWNsYXJhdGlvbihraW5kKSk7XG4gICAgICAgICAgICBpZiAoIW1hdGNoKCcsJykpIHtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGxleCgpO1xuICAgICAgICB9IHdoaWxlIChpbmRleCA8IGxlbmd0aCk7XG5cbiAgICAgICAgcmV0dXJuIGxpc3Q7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcGFyc2VWYXJpYWJsZVN0YXRlbWVudCgpIHtcbiAgICAgICAgdmFyIGRlY2xhcmF0aW9ucztcblxuICAgICAgICBleHBlY3RLZXl3b3JkKCd2YXInKTtcblxuICAgICAgICBkZWNsYXJhdGlvbnMgPSBwYXJzZVZhcmlhYmxlRGVjbGFyYXRpb25MaXN0KCk7XG5cbiAgICAgICAgY29uc3VtZVNlbWljb2xvbigpO1xuXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB0eXBlOiBTeW50YXguVmFyaWFibGVEZWNsYXJhdGlvbixcbiAgICAgICAgICAgIGRlY2xhcmF0aW9uczogZGVjbGFyYXRpb25zLFxuICAgICAgICAgICAga2luZDogJ3ZhcidcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvLyBraW5kIG1heSBiZSBgY29uc3RgIG9yIGBsZXRgXG4gICAgLy8gQm90aCBhcmUgZXhwZXJpbWVudGFsIGFuZCBub3QgaW4gdGhlIHNwZWNpZmljYXRpb24geWV0LlxuICAgIC8vIHNlZSBodHRwOi8vd2lraS5lY21hc2NyaXB0Lm9yZy9kb2t1LnBocD9pZD1oYXJtb255OmNvbnN0XG4gICAgLy8gYW5kIGh0dHA6Ly93aWtpLmVjbWFzY3JpcHQub3JnL2Rva3UucGhwP2lkPWhhcm1vbnk6bGV0XG4gICAgZnVuY3Rpb24gcGFyc2VDb25zdExldERlY2xhcmF0aW9uKGtpbmQpIHtcbiAgICAgICAgdmFyIGRlY2xhcmF0aW9ucztcblxuICAgICAgICBleHBlY3RLZXl3b3JkKGtpbmQpO1xuXG4gICAgICAgIGRlY2xhcmF0aW9ucyA9IHBhcnNlVmFyaWFibGVEZWNsYXJhdGlvbkxpc3Qoa2luZCk7XG5cbiAgICAgICAgY29uc3VtZVNlbWljb2xvbigpO1xuXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB0eXBlOiBTeW50YXguVmFyaWFibGVEZWNsYXJhdGlvbixcbiAgICAgICAgICAgIGRlY2xhcmF0aW9uczogZGVjbGFyYXRpb25zLFxuICAgICAgICAgICAga2luZDoga2luZFxuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8vIDEyLjMgRW1wdHkgU3RhdGVtZW50XG5cbiAgICBmdW5jdGlvbiBwYXJzZUVtcHR5U3RhdGVtZW50KCkge1xuICAgICAgICBleHBlY3QoJzsnKTtcblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgdHlwZTogU3ludGF4LkVtcHR5U3RhdGVtZW50XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLy8gMTIuNCBFeHByZXNzaW9uIFN0YXRlbWVudFxuXG4gICAgZnVuY3Rpb24gcGFyc2VFeHByZXNzaW9uU3RhdGVtZW50KCkge1xuICAgICAgICB2YXIgZXhwciA9IHBhcnNlRXhwcmVzc2lvbigpO1xuXG4gICAgICAgIGNvbnN1bWVTZW1pY29sb24oKTtcblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgdHlwZTogU3ludGF4LkV4cHJlc3Npb25TdGF0ZW1lbnQsXG4gICAgICAgICAgICBleHByZXNzaW9uOiBleHByXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLy8gMTIuNSBJZiBzdGF0ZW1lbnRcblxuICAgIGZ1bmN0aW9uIHBhcnNlSWZTdGF0ZW1lbnQoKSB7XG4gICAgICAgIHZhciB0ZXN0LCBjb25zZXF1ZW50LCBhbHRlcm5hdGU7XG5cbiAgICAgICAgZXhwZWN0S2V5d29yZCgnaWYnKTtcblxuICAgICAgICBleHBlY3QoJygnKTtcblxuICAgICAgICB0ZXN0ID0gcGFyc2VFeHByZXNzaW9uKCk7XG5cbiAgICAgICAgZXhwZWN0KCcpJyk7XG5cbiAgICAgICAgY29uc2VxdWVudCA9IHBhcnNlU3RhdGVtZW50KCk7XG5cbiAgICAgICAgaWYgKG1hdGNoS2V5d29yZCgnZWxzZScpKSB7XG4gICAgICAgICAgICBsZXgoKTtcbiAgICAgICAgICAgIGFsdGVybmF0ZSA9IHBhcnNlU3RhdGVtZW50KCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBhbHRlcm5hdGUgPSBudWxsO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHR5cGU6IFN5bnRheC5JZlN0YXRlbWVudCxcbiAgICAgICAgICAgIHRlc3Q6IHRlc3QsXG4gICAgICAgICAgICBjb25zZXF1ZW50OiBjb25zZXF1ZW50LFxuICAgICAgICAgICAgYWx0ZXJuYXRlOiBhbHRlcm5hdGVcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvLyAxMi42IEl0ZXJhdGlvbiBTdGF0ZW1lbnRzXG5cbiAgICBmdW5jdGlvbiBwYXJzZURvV2hpbGVTdGF0ZW1lbnQoKSB7XG4gICAgICAgIHZhciBib2R5LCB0ZXN0LCBvbGRJbkl0ZXJhdGlvbjtcblxuICAgICAgICBleHBlY3RLZXl3b3JkKCdkbycpO1xuXG4gICAgICAgIG9sZEluSXRlcmF0aW9uID0gc3RhdGUuaW5JdGVyYXRpb247XG4gICAgICAgIHN0YXRlLmluSXRlcmF0aW9uID0gdHJ1ZTtcblxuICAgICAgICBib2R5ID0gcGFyc2VTdGF0ZW1lbnQoKTtcblxuICAgICAgICBzdGF0ZS5pbkl0ZXJhdGlvbiA9IG9sZEluSXRlcmF0aW9uO1xuXG4gICAgICAgIGV4cGVjdEtleXdvcmQoJ3doaWxlJyk7XG5cbiAgICAgICAgZXhwZWN0KCcoJyk7XG5cbiAgICAgICAgdGVzdCA9IHBhcnNlRXhwcmVzc2lvbigpO1xuXG4gICAgICAgIGV4cGVjdCgnKScpO1xuXG4gICAgICAgIGlmIChtYXRjaCgnOycpKSB7XG4gICAgICAgICAgICBsZXgoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB0eXBlOiBTeW50YXguRG9XaGlsZVN0YXRlbWVudCxcbiAgICAgICAgICAgIGJvZHk6IGJvZHksXG4gICAgICAgICAgICB0ZXN0OiB0ZXN0XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcGFyc2VXaGlsZVN0YXRlbWVudCgpIHtcbiAgICAgICAgdmFyIHRlc3QsIGJvZHksIG9sZEluSXRlcmF0aW9uO1xuXG4gICAgICAgIGV4cGVjdEtleXdvcmQoJ3doaWxlJyk7XG5cbiAgICAgICAgZXhwZWN0KCcoJyk7XG5cbiAgICAgICAgdGVzdCA9IHBhcnNlRXhwcmVzc2lvbigpO1xuXG4gICAgICAgIGV4cGVjdCgnKScpO1xuXG4gICAgICAgIG9sZEluSXRlcmF0aW9uID0gc3RhdGUuaW5JdGVyYXRpb247XG4gICAgICAgIHN0YXRlLmluSXRlcmF0aW9uID0gdHJ1ZTtcblxuICAgICAgICBib2R5ID0gcGFyc2VTdGF0ZW1lbnQoKTtcblxuICAgICAgICBzdGF0ZS5pbkl0ZXJhdGlvbiA9IG9sZEluSXRlcmF0aW9uO1xuXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB0eXBlOiBTeW50YXguV2hpbGVTdGF0ZW1lbnQsXG4gICAgICAgICAgICB0ZXN0OiB0ZXN0LFxuICAgICAgICAgICAgYm9keTogYm9keVxuICAgICAgICB9O1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHBhcnNlRm9yVmFyaWFibGVEZWNsYXJhdGlvbigpIHtcbiAgICAgICAgdmFyIHRva2VuID0gbGV4KCk7XG5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHR5cGU6IFN5bnRheC5WYXJpYWJsZURlY2xhcmF0aW9uLFxuICAgICAgICAgICAgZGVjbGFyYXRpb25zOiBwYXJzZVZhcmlhYmxlRGVjbGFyYXRpb25MaXN0KCksXG4gICAgICAgICAgICBraW5kOiB0b2tlbi52YWx1ZVxuICAgICAgICB9O1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHBhcnNlRm9yU3RhdGVtZW50KCkge1xuICAgICAgICB2YXIgaW5pdCwgdGVzdCwgdXBkYXRlLCBsZWZ0LCByaWdodCwgYm9keSwgb2xkSW5JdGVyYXRpb247XG5cbiAgICAgICAgaW5pdCA9IHRlc3QgPSB1cGRhdGUgPSBudWxsO1xuXG4gICAgICAgIGV4cGVjdEtleXdvcmQoJ2ZvcicpO1xuXG4gICAgICAgIGV4cGVjdCgnKCcpO1xuXG4gICAgICAgIGlmIChtYXRjaCgnOycpKSB7XG4gICAgICAgICAgICBsZXgoKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGlmIChtYXRjaEtleXdvcmQoJ3ZhcicpIHx8IG1hdGNoS2V5d29yZCgnbGV0JykpIHtcbiAgICAgICAgICAgICAgICBzdGF0ZS5hbGxvd0luID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgaW5pdCA9IHBhcnNlRm9yVmFyaWFibGVEZWNsYXJhdGlvbigpO1xuICAgICAgICAgICAgICAgIHN0YXRlLmFsbG93SW4gPSB0cnVlO1xuXG4gICAgICAgICAgICAgICAgaWYgKGluaXQuZGVjbGFyYXRpb25zLmxlbmd0aCA9PT0gMSAmJiBtYXRjaEtleXdvcmQoJ2luJykpIHtcbiAgICAgICAgICAgICAgICAgICAgbGV4KCk7XG4gICAgICAgICAgICAgICAgICAgIGxlZnQgPSBpbml0O1xuICAgICAgICAgICAgICAgICAgICByaWdodCA9IHBhcnNlRXhwcmVzc2lvbigpO1xuICAgICAgICAgICAgICAgICAgICBpbml0ID0gbnVsbDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHN0YXRlLmFsbG93SW4gPSBmYWxzZTtcbiAgICAgICAgICAgICAgICBpbml0ID0gcGFyc2VFeHByZXNzaW9uKCk7XG4gICAgICAgICAgICAgICAgc3RhdGUuYWxsb3dJbiA9IHRydWU7XG5cbiAgICAgICAgICAgICAgICBpZiAobWF0Y2hLZXl3b3JkKCdpbicpKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIExlZnRIYW5kU2lkZUV4cHJlc3Npb25cbiAgICAgICAgICAgICAgICAgICAgaWYgKCFpc0xlZnRIYW5kU2lkZShpbml0KSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3dFcnJvcih7fSwgTWVzc2FnZXMuSW52YWxpZExIU0luRm9ySW4pO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgbGV4KCk7XG4gICAgICAgICAgICAgICAgICAgIGxlZnQgPSBpbml0O1xuICAgICAgICAgICAgICAgICAgICByaWdodCA9IHBhcnNlRXhwcmVzc2lvbigpO1xuICAgICAgICAgICAgICAgICAgICBpbml0ID0gbnVsbDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmICh0eXBlb2YgbGVmdCA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgICBleHBlY3QoJzsnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0eXBlb2YgbGVmdCA9PT0gJ3VuZGVmaW5lZCcpIHtcblxuICAgICAgICAgICAgaWYgKCFtYXRjaCgnOycpKSB7XG4gICAgICAgICAgICAgICAgdGVzdCA9IHBhcnNlRXhwcmVzc2lvbigpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZXhwZWN0KCc7Jyk7XG5cbiAgICAgICAgICAgIGlmICghbWF0Y2goJyknKSkge1xuICAgICAgICAgICAgICAgIHVwZGF0ZSA9IHBhcnNlRXhwcmVzc2lvbigpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgZXhwZWN0KCcpJyk7XG5cbiAgICAgICAgb2xkSW5JdGVyYXRpb24gPSBzdGF0ZS5pbkl0ZXJhdGlvbjtcbiAgICAgICAgc3RhdGUuaW5JdGVyYXRpb24gPSB0cnVlO1xuXG4gICAgICAgIGJvZHkgPSBwYXJzZVN0YXRlbWVudCgpO1xuXG4gICAgICAgIHN0YXRlLmluSXRlcmF0aW9uID0gb2xkSW5JdGVyYXRpb247XG5cbiAgICAgICAgaWYgKHR5cGVvZiBsZWZ0ID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICB0eXBlOiBTeW50YXguRm9yU3RhdGVtZW50LFxuICAgICAgICAgICAgICAgIGluaXQ6IGluaXQsXG4gICAgICAgICAgICAgICAgdGVzdDogdGVzdCxcbiAgICAgICAgICAgICAgICB1cGRhdGU6IHVwZGF0ZSxcbiAgICAgICAgICAgICAgICBib2R5OiBib2R5XG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHR5cGU6IFN5bnRheC5Gb3JJblN0YXRlbWVudCxcbiAgICAgICAgICAgIGxlZnQ6IGxlZnQsXG4gICAgICAgICAgICByaWdodDogcmlnaHQsXG4gICAgICAgICAgICBib2R5OiBib2R5LFxuICAgICAgICAgICAgZWFjaDogZmFsc2VcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvLyAxMi43IFRoZSBjb250aW51ZSBzdGF0ZW1lbnRcblxuICAgIGZ1bmN0aW9uIHBhcnNlQ29udGludWVTdGF0ZW1lbnQoKSB7XG4gICAgICAgIHZhciB0b2tlbiwgbGFiZWwgPSBudWxsO1xuXG4gICAgICAgIGV4cGVjdEtleXdvcmQoJ2NvbnRpbnVlJyk7XG5cbiAgICAgICAgLy8gT3B0aW1pemUgdGhlIG1vc3QgY29tbW9uIGZvcm06ICdjb250aW51ZTsnLlxuICAgICAgICBpZiAoc291cmNlW2luZGV4XSA9PT0gJzsnKSB7XG4gICAgICAgICAgICBsZXgoKTtcblxuICAgICAgICAgICAgaWYgKCFzdGF0ZS5pbkl0ZXJhdGlvbikge1xuICAgICAgICAgICAgICAgIHRocm93RXJyb3Ioe30sIE1lc3NhZ2VzLklsbGVnYWxDb250aW51ZSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgdHlwZTogU3ludGF4LkNvbnRpbnVlU3RhdGVtZW50LFxuICAgICAgICAgICAgICAgIGxhYmVsOiBudWxsXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHBlZWtMaW5lVGVybWluYXRvcigpKSB7XG4gICAgICAgICAgICBpZiAoIXN0YXRlLmluSXRlcmF0aW9uKSB7XG4gICAgICAgICAgICAgICAgdGhyb3dFcnJvcih7fSwgTWVzc2FnZXMuSWxsZWdhbENvbnRpbnVlKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICB0eXBlOiBTeW50YXguQ29udGludWVTdGF0ZW1lbnQsXG4gICAgICAgICAgICAgICAgbGFiZWw6IG51bGxcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cblxuICAgICAgICB0b2tlbiA9IGxvb2thaGVhZCgpO1xuICAgICAgICBpZiAodG9rZW4udHlwZSA9PT0gVG9rZW4uSWRlbnRpZmllcikge1xuICAgICAgICAgICAgbGFiZWwgPSBwYXJzZVZhcmlhYmxlSWRlbnRpZmllcigpO1xuXG4gICAgICAgICAgICBpZiAoIU9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChzdGF0ZS5sYWJlbFNldCwgbGFiZWwubmFtZSkpIHtcbiAgICAgICAgICAgICAgICB0aHJvd0Vycm9yKHt9LCBNZXNzYWdlcy5Vbmtub3duTGFiZWwsIGxhYmVsLm5hbWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgY29uc3VtZVNlbWljb2xvbigpO1xuXG4gICAgICAgIGlmIChsYWJlbCA9PT0gbnVsbCAmJiAhc3RhdGUuaW5JdGVyYXRpb24pIHtcbiAgICAgICAgICAgIHRocm93RXJyb3Ioe30sIE1lc3NhZ2VzLklsbGVnYWxDb250aW51ZSk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgdHlwZTogU3ludGF4LkNvbnRpbnVlU3RhdGVtZW50LFxuICAgICAgICAgICAgbGFiZWw6IGxhYmVsXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLy8gMTIuOCBUaGUgYnJlYWsgc3RhdGVtZW50XG5cbiAgICBmdW5jdGlvbiBwYXJzZUJyZWFrU3RhdGVtZW50KCkge1xuICAgICAgICB2YXIgdG9rZW4sIGxhYmVsID0gbnVsbDtcblxuICAgICAgICBleHBlY3RLZXl3b3JkKCdicmVhaycpO1xuXG4gICAgICAgIC8vIE9wdGltaXplIHRoZSBtb3N0IGNvbW1vbiBmb3JtOiAnYnJlYWs7Jy5cbiAgICAgICAgaWYgKHNvdXJjZVtpbmRleF0gPT09ICc7Jykge1xuICAgICAgICAgICAgbGV4KCk7XG5cbiAgICAgICAgICAgIGlmICghKHN0YXRlLmluSXRlcmF0aW9uIHx8IHN0YXRlLmluU3dpdGNoKSkge1xuICAgICAgICAgICAgICAgIHRocm93RXJyb3Ioe30sIE1lc3NhZ2VzLklsbGVnYWxCcmVhayk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgdHlwZTogU3ludGF4LkJyZWFrU3RhdGVtZW50LFxuICAgICAgICAgICAgICAgIGxhYmVsOiBudWxsXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHBlZWtMaW5lVGVybWluYXRvcigpKSB7XG4gICAgICAgICAgICBpZiAoIShzdGF0ZS5pbkl0ZXJhdGlvbiB8fCBzdGF0ZS5pblN3aXRjaCkpIHtcbiAgICAgICAgICAgICAgICB0aHJvd0Vycm9yKHt9LCBNZXNzYWdlcy5JbGxlZ2FsQnJlYWspO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHR5cGU6IFN5bnRheC5CcmVha1N0YXRlbWVudCxcbiAgICAgICAgICAgICAgICBsYWJlbDogbnVsbFxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRva2VuID0gbG9va2FoZWFkKCk7XG4gICAgICAgIGlmICh0b2tlbi50eXBlID09PSBUb2tlbi5JZGVudGlmaWVyKSB7XG4gICAgICAgICAgICBsYWJlbCA9IHBhcnNlVmFyaWFibGVJZGVudGlmaWVyKCk7XG5cbiAgICAgICAgICAgIGlmICghT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKHN0YXRlLmxhYmVsU2V0LCBsYWJlbC5uYW1lKSkge1xuICAgICAgICAgICAgICAgIHRocm93RXJyb3Ioe30sIE1lc3NhZ2VzLlVua25vd25MYWJlbCwgbGFiZWwubmFtZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdW1lU2VtaWNvbG9uKCk7XG5cbiAgICAgICAgaWYgKGxhYmVsID09PSBudWxsICYmICEoc3RhdGUuaW5JdGVyYXRpb24gfHwgc3RhdGUuaW5Td2l0Y2gpKSB7XG4gICAgICAgICAgICB0aHJvd0Vycm9yKHt9LCBNZXNzYWdlcy5JbGxlZ2FsQnJlYWspO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHR5cGU6IFN5bnRheC5CcmVha1N0YXRlbWVudCxcbiAgICAgICAgICAgIGxhYmVsOiBsYWJlbFxuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8vIDEyLjkgVGhlIHJldHVybiBzdGF0ZW1lbnRcblxuICAgIGZ1bmN0aW9uIHBhcnNlUmV0dXJuU3RhdGVtZW50KCkge1xuICAgICAgICB2YXIgdG9rZW4sIGFyZ3VtZW50ID0gbnVsbDtcblxuICAgICAgICBleHBlY3RLZXl3b3JkKCdyZXR1cm4nKTtcblxuICAgICAgICBpZiAoIXN0YXRlLmluRnVuY3Rpb25Cb2R5KSB7XG4gICAgICAgICAgICB0aHJvd0Vycm9yVG9sZXJhbnQoe30sIE1lc3NhZ2VzLklsbGVnYWxSZXR1cm4pO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gJ3JldHVybicgZm9sbG93ZWQgYnkgYSBzcGFjZSBhbmQgYW4gaWRlbnRpZmllciBpcyB2ZXJ5IGNvbW1vbi5cbiAgICAgICAgaWYgKHNvdXJjZVtpbmRleF0gPT09ICcgJykge1xuICAgICAgICAgICAgaWYgKGlzSWRlbnRpZmllclN0YXJ0KHNvdXJjZVtpbmRleCArIDFdKSkge1xuICAgICAgICAgICAgICAgIGFyZ3VtZW50ID0gcGFyc2VFeHByZXNzaW9uKCk7XG4gICAgICAgICAgICAgICAgY29uc3VtZVNlbWljb2xvbigpO1xuICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IFN5bnRheC5SZXR1cm5TdGF0ZW1lbnQsXG4gICAgICAgICAgICAgICAgICAgIGFyZ3VtZW50OiBhcmd1bWVudFxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAocGVla0xpbmVUZXJtaW5hdG9yKCkpIHtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgdHlwZTogU3ludGF4LlJldHVyblN0YXRlbWVudCxcbiAgICAgICAgICAgICAgICBhcmd1bWVudDogbnVsbFxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghbWF0Y2goJzsnKSkge1xuICAgICAgICAgICAgdG9rZW4gPSBsb29rYWhlYWQoKTtcbiAgICAgICAgICAgIGlmICghbWF0Y2goJ30nKSAmJiB0b2tlbi50eXBlICE9PSBUb2tlbi5FT0YpIHtcbiAgICAgICAgICAgICAgICBhcmd1bWVudCA9IHBhcnNlRXhwcmVzc2lvbigpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgY29uc3VtZVNlbWljb2xvbigpO1xuXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB0eXBlOiBTeW50YXguUmV0dXJuU3RhdGVtZW50LFxuICAgICAgICAgICAgYXJndW1lbnQ6IGFyZ3VtZW50XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLy8gMTIuMTAgVGhlIHdpdGggc3RhdGVtZW50XG5cbiAgICBmdW5jdGlvbiBwYXJzZVdpdGhTdGF0ZW1lbnQoKSB7XG4gICAgICAgIHZhciBvYmplY3QsIGJvZHk7XG5cbiAgICAgICAgaWYgKHN0cmljdCkge1xuICAgICAgICAgICAgdGhyb3dFcnJvclRvbGVyYW50KHt9LCBNZXNzYWdlcy5TdHJpY3RNb2RlV2l0aCk7XG4gICAgICAgIH1cblxuICAgICAgICBleHBlY3RLZXl3b3JkKCd3aXRoJyk7XG5cbiAgICAgICAgZXhwZWN0KCcoJyk7XG5cbiAgICAgICAgb2JqZWN0ID0gcGFyc2VFeHByZXNzaW9uKCk7XG5cbiAgICAgICAgZXhwZWN0KCcpJyk7XG5cbiAgICAgICAgYm9keSA9IHBhcnNlU3RhdGVtZW50KCk7XG5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHR5cGU6IFN5bnRheC5XaXRoU3RhdGVtZW50LFxuICAgICAgICAgICAgb2JqZWN0OiBvYmplY3QsXG4gICAgICAgICAgICBib2R5OiBib2R5XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLy8gMTIuMTAgVGhlIHN3aXRoIHN0YXRlbWVudFxuXG4gICAgZnVuY3Rpb24gcGFyc2VTd2l0Y2hDYXNlKCkge1xuICAgICAgICB2YXIgdGVzdCxcbiAgICAgICAgICAgIGNvbnNlcXVlbnQgPSBbXSxcbiAgICAgICAgICAgIHN0YXRlbWVudDtcblxuICAgICAgICBpZiAobWF0Y2hLZXl3b3JkKCdkZWZhdWx0JykpIHtcbiAgICAgICAgICAgIGxleCgpO1xuICAgICAgICAgICAgdGVzdCA9IG51bGw7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBleHBlY3RLZXl3b3JkKCdjYXNlJyk7XG4gICAgICAgICAgICB0ZXN0ID0gcGFyc2VFeHByZXNzaW9uKCk7XG4gICAgICAgIH1cbiAgICAgICAgZXhwZWN0KCc6Jyk7XG5cbiAgICAgICAgd2hpbGUgKGluZGV4IDwgbGVuZ3RoKSB7XG4gICAgICAgICAgICBpZiAobWF0Y2goJ30nKSB8fCBtYXRjaEtleXdvcmQoJ2RlZmF1bHQnKSB8fCBtYXRjaEtleXdvcmQoJ2Nhc2UnKSkge1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgc3RhdGVtZW50ID0gcGFyc2VTdGF0ZW1lbnQoKTtcbiAgICAgICAgICAgIGlmICh0eXBlb2Ygc3RhdGVtZW50ID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29uc2VxdWVudC5wdXNoKHN0YXRlbWVudCk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgdHlwZTogU3ludGF4LlN3aXRjaENhc2UsXG4gICAgICAgICAgICB0ZXN0OiB0ZXN0LFxuICAgICAgICAgICAgY29uc2VxdWVudDogY29uc2VxdWVudFxuICAgICAgICB9O1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHBhcnNlU3dpdGNoU3RhdGVtZW50KCkge1xuICAgICAgICB2YXIgZGlzY3JpbWluYW50LCBjYXNlcywgY2xhdXNlLCBvbGRJblN3aXRjaCwgZGVmYXVsdEZvdW5kO1xuXG4gICAgICAgIGV4cGVjdEtleXdvcmQoJ3N3aXRjaCcpO1xuXG4gICAgICAgIGV4cGVjdCgnKCcpO1xuXG4gICAgICAgIGRpc2NyaW1pbmFudCA9IHBhcnNlRXhwcmVzc2lvbigpO1xuXG4gICAgICAgIGV4cGVjdCgnKScpO1xuXG4gICAgICAgIGV4cGVjdCgneycpO1xuXG4gICAgICAgIGlmIChtYXRjaCgnfScpKSB7XG4gICAgICAgICAgICBsZXgoKTtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgdHlwZTogU3ludGF4LlN3aXRjaFN0YXRlbWVudCxcbiAgICAgICAgICAgICAgICBkaXNjcmltaW5hbnQ6IGRpc2NyaW1pbmFudFxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNhc2VzID0gW107XG5cbiAgICAgICAgb2xkSW5Td2l0Y2ggPSBzdGF0ZS5pblN3aXRjaDtcbiAgICAgICAgc3RhdGUuaW5Td2l0Y2ggPSB0cnVlO1xuICAgICAgICBkZWZhdWx0Rm91bmQgPSBmYWxzZTtcblxuICAgICAgICB3aGlsZSAoaW5kZXggPCBsZW5ndGgpIHtcbiAgICAgICAgICAgIGlmIChtYXRjaCgnfScpKSB7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjbGF1c2UgPSBwYXJzZVN3aXRjaENhc2UoKTtcbiAgICAgICAgICAgIGlmIChjbGF1c2UudGVzdCA9PT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIGlmIChkZWZhdWx0Rm91bmQpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhyb3dFcnJvcih7fSwgTWVzc2FnZXMuTXVsdGlwbGVEZWZhdWx0c0luU3dpdGNoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZGVmYXVsdEZvdW5kID0gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhc2VzLnB1c2goY2xhdXNlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHN0YXRlLmluU3dpdGNoID0gb2xkSW5Td2l0Y2g7XG5cbiAgICAgICAgZXhwZWN0KCd9Jyk7XG5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHR5cGU6IFN5bnRheC5Td2l0Y2hTdGF0ZW1lbnQsXG4gICAgICAgICAgICBkaXNjcmltaW5hbnQ6IGRpc2NyaW1pbmFudCxcbiAgICAgICAgICAgIGNhc2VzOiBjYXNlc1xuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8vIDEyLjEzIFRoZSB0aHJvdyBzdGF0ZW1lbnRcblxuICAgIGZ1bmN0aW9uIHBhcnNlVGhyb3dTdGF0ZW1lbnQoKSB7XG4gICAgICAgIHZhciBhcmd1bWVudDtcblxuICAgICAgICBleHBlY3RLZXl3b3JkKCd0aHJvdycpO1xuXG4gICAgICAgIGlmIChwZWVrTGluZVRlcm1pbmF0b3IoKSkge1xuICAgICAgICAgICAgdGhyb3dFcnJvcih7fSwgTWVzc2FnZXMuTmV3bGluZUFmdGVyVGhyb3cpO1xuICAgICAgICB9XG5cbiAgICAgICAgYXJndW1lbnQgPSBwYXJzZUV4cHJlc3Npb24oKTtcblxuICAgICAgICBjb25zdW1lU2VtaWNvbG9uKCk7XG5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHR5cGU6IFN5bnRheC5UaHJvd1N0YXRlbWVudCxcbiAgICAgICAgICAgIGFyZ3VtZW50OiBhcmd1bWVudFxuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8vIDEyLjE0IFRoZSB0cnkgc3RhdGVtZW50XG5cbiAgICBmdW5jdGlvbiBwYXJzZUNhdGNoQ2xhdXNlKCkge1xuICAgICAgICB2YXIgcGFyYW07XG5cbiAgICAgICAgZXhwZWN0S2V5d29yZCgnY2F0Y2gnKTtcblxuICAgICAgICBleHBlY3QoJygnKTtcbiAgICAgICAgaWYgKG1hdGNoKCcpJykpIHtcbiAgICAgICAgICAgIHRocm93VW5leHBlY3RlZChsb29rYWhlYWQoKSk7XG4gICAgICAgIH1cblxuICAgICAgICBwYXJhbSA9IHBhcnNlVmFyaWFibGVJZGVudGlmaWVyKCk7XG4gICAgICAgIC8vIDEyLjE0LjFcbiAgICAgICAgaWYgKHN0cmljdCAmJiBpc1Jlc3RyaWN0ZWRXb3JkKHBhcmFtLm5hbWUpKSB7XG4gICAgICAgICAgICB0aHJvd0Vycm9yVG9sZXJhbnQoe30sIE1lc3NhZ2VzLlN0cmljdENhdGNoVmFyaWFibGUpO1xuICAgICAgICB9XG5cbiAgICAgICAgZXhwZWN0KCcpJyk7XG5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHR5cGU6IFN5bnRheC5DYXRjaENsYXVzZSxcbiAgICAgICAgICAgIHBhcmFtOiBwYXJhbSxcbiAgICAgICAgICAgIGJvZHk6IHBhcnNlQmxvY2soKVxuICAgICAgICB9O1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHBhcnNlVHJ5U3RhdGVtZW50KCkge1xuICAgICAgICB2YXIgYmxvY2ssIGhhbmRsZXJzID0gW10sIGZpbmFsaXplciA9IG51bGw7XG5cbiAgICAgICAgZXhwZWN0S2V5d29yZCgndHJ5Jyk7XG5cbiAgICAgICAgYmxvY2sgPSBwYXJzZUJsb2NrKCk7XG5cbiAgICAgICAgaWYgKG1hdGNoS2V5d29yZCgnY2F0Y2gnKSkge1xuICAgICAgICAgICAgaGFuZGxlcnMucHVzaChwYXJzZUNhdGNoQ2xhdXNlKCkpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKG1hdGNoS2V5d29yZCgnZmluYWxseScpKSB7XG4gICAgICAgICAgICBsZXgoKTtcbiAgICAgICAgICAgIGZpbmFsaXplciA9IHBhcnNlQmxvY2soKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChoYW5kbGVycy5sZW5ndGggPT09IDAgJiYgIWZpbmFsaXplcikge1xuICAgICAgICAgICAgdGhyb3dFcnJvcih7fSwgTWVzc2FnZXMuTm9DYXRjaE9yRmluYWxseSk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgdHlwZTogU3ludGF4LlRyeVN0YXRlbWVudCxcbiAgICAgICAgICAgIGJsb2NrOiBibG9jayxcbiAgICAgICAgICAgIGd1YXJkZWRIYW5kbGVyczogW10sXG4gICAgICAgICAgICBoYW5kbGVyczogaGFuZGxlcnMsXG4gICAgICAgICAgICBmaW5hbGl6ZXI6IGZpbmFsaXplclxuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8vIDEyLjE1IFRoZSBkZWJ1Z2dlciBzdGF0ZW1lbnRcblxuICAgIGZ1bmN0aW9uIHBhcnNlRGVidWdnZXJTdGF0ZW1lbnQoKSB7XG4gICAgICAgIGV4cGVjdEtleXdvcmQoJ2RlYnVnZ2VyJyk7XG5cbiAgICAgICAgY29uc3VtZVNlbWljb2xvbigpO1xuXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB0eXBlOiBTeW50YXguRGVidWdnZXJTdGF0ZW1lbnRcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvLyAxMiBTdGF0ZW1lbnRzXG5cbiAgICBmdW5jdGlvbiBwYXJzZVN0YXRlbWVudCgpIHtcbiAgICAgICAgdmFyIHRva2VuID0gbG9va2FoZWFkKCksXG4gICAgICAgICAgICBleHByLFxuICAgICAgICAgICAgbGFiZWxlZEJvZHk7XG5cbiAgICAgICAgaWYgKHRva2VuLnR5cGUgPT09IFRva2VuLkVPRikge1xuICAgICAgICAgICAgdGhyb3dVbmV4cGVjdGVkKHRva2VuKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0b2tlbi50eXBlID09PSBUb2tlbi5QdW5jdHVhdG9yKSB7XG4gICAgICAgICAgICBzd2l0Y2ggKHRva2VuLnZhbHVlKSB7XG4gICAgICAgICAgICBjYXNlICc7JzpcbiAgICAgICAgICAgICAgICByZXR1cm4gcGFyc2VFbXB0eVN0YXRlbWVudCgpO1xuICAgICAgICAgICAgY2FzZSAneyc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIHBhcnNlQmxvY2soKTtcbiAgICAgICAgICAgIGNhc2UgJygnOlxuICAgICAgICAgICAgICAgIHJldHVybiBwYXJzZUV4cHJlc3Npb25TdGF0ZW1lbnQoKTtcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodG9rZW4udHlwZSA9PT0gVG9rZW4uS2V5d29yZCkge1xuICAgICAgICAgICAgc3dpdGNoICh0b2tlbi52YWx1ZSkge1xuICAgICAgICAgICAgY2FzZSAnYnJlYWsnOlxuICAgICAgICAgICAgICAgIHJldHVybiBwYXJzZUJyZWFrU3RhdGVtZW50KCk7XG4gICAgICAgICAgICBjYXNlICdjb250aW51ZSc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIHBhcnNlQ29udGludWVTdGF0ZW1lbnQoKTtcbiAgICAgICAgICAgIGNhc2UgJ2RlYnVnZ2VyJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gcGFyc2VEZWJ1Z2dlclN0YXRlbWVudCgpO1xuICAgICAgICAgICAgY2FzZSAnZG8nOlxuICAgICAgICAgICAgICAgIHJldHVybiBwYXJzZURvV2hpbGVTdGF0ZW1lbnQoKTtcbiAgICAgICAgICAgIGNhc2UgJ2Zvcic6XG4gICAgICAgICAgICAgICAgcmV0dXJuIHBhcnNlRm9yU3RhdGVtZW50KCk7XG4gICAgICAgICAgICBjYXNlICdmdW5jdGlvbic6XG4gICAgICAgICAgICAgICAgcmV0dXJuIHBhcnNlRnVuY3Rpb25EZWNsYXJhdGlvbigpO1xuICAgICAgICAgICAgY2FzZSAnaWYnOlxuICAgICAgICAgICAgICAgIHJldHVybiBwYXJzZUlmU3RhdGVtZW50KCk7XG4gICAgICAgICAgICBjYXNlICdyZXR1cm4nOlxuICAgICAgICAgICAgICAgIHJldHVybiBwYXJzZVJldHVyblN0YXRlbWVudCgpO1xuICAgICAgICAgICAgY2FzZSAnc3dpdGNoJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gcGFyc2VTd2l0Y2hTdGF0ZW1lbnQoKTtcbiAgICAgICAgICAgIGNhc2UgJ3Rocm93JzpcbiAgICAgICAgICAgICAgICByZXR1cm4gcGFyc2VUaHJvd1N0YXRlbWVudCgpO1xuICAgICAgICAgICAgY2FzZSAndHJ5JzpcbiAgICAgICAgICAgICAgICByZXR1cm4gcGFyc2VUcnlTdGF0ZW1lbnQoKTtcbiAgICAgICAgICAgIGNhc2UgJ3Zhcic6XG4gICAgICAgICAgICAgICAgcmV0dXJuIHBhcnNlVmFyaWFibGVTdGF0ZW1lbnQoKTtcbiAgICAgICAgICAgIGNhc2UgJ3doaWxlJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gcGFyc2VXaGlsZVN0YXRlbWVudCgpO1xuICAgICAgICAgICAgY2FzZSAnd2l0aCc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIHBhcnNlV2l0aFN0YXRlbWVudCgpO1xuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGV4cHIgPSBwYXJzZUV4cHJlc3Npb24oKTtcblxuICAgICAgICAvLyAxMi4xMiBMYWJlbGxlZCBTdGF0ZW1lbnRzXG4gICAgICAgIGlmICgoZXhwci50eXBlID09PSBTeW50YXguSWRlbnRpZmllcikgJiYgbWF0Y2goJzonKSkge1xuICAgICAgICAgICAgbGV4KCk7XG5cbiAgICAgICAgICAgIGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwoc3RhdGUubGFiZWxTZXQsIGV4cHIubmFtZSkpIHtcbiAgICAgICAgICAgICAgICB0aHJvd0Vycm9yKHt9LCBNZXNzYWdlcy5SZWRlY2xhcmF0aW9uLCAnTGFiZWwnLCBleHByLm5hbWUpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBzdGF0ZS5sYWJlbFNldFtleHByLm5hbWVdID0gdHJ1ZTtcbiAgICAgICAgICAgIGxhYmVsZWRCb2R5ID0gcGFyc2VTdGF0ZW1lbnQoKTtcbiAgICAgICAgICAgIGRlbGV0ZSBzdGF0ZS5sYWJlbFNldFtleHByLm5hbWVdO1xuXG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHR5cGU6IFN5bnRheC5MYWJlbGVkU3RhdGVtZW50LFxuICAgICAgICAgICAgICAgIGxhYmVsOiBleHByLFxuICAgICAgICAgICAgICAgIGJvZHk6IGxhYmVsZWRCb2R5XG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3VtZVNlbWljb2xvbigpO1xuXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB0eXBlOiBTeW50YXguRXhwcmVzc2lvblN0YXRlbWVudCxcbiAgICAgICAgICAgIGV4cHJlc3Npb246IGV4cHJcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvLyAxMyBGdW5jdGlvbiBEZWZpbml0aW9uXG5cbiAgICBmdW5jdGlvbiBwYXJzZUZ1bmN0aW9uU291cmNlRWxlbWVudHMoKSB7XG4gICAgICAgIHZhciBzb3VyY2VFbGVtZW50LCBzb3VyY2VFbGVtZW50cyA9IFtdLCB0b2tlbiwgZGlyZWN0aXZlLCBmaXJzdFJlc3RyaWN0ZWQsXG4gICAgICAgICAgICBvbGRMYWJlbFNldCwgb2xkSW5JdGVyYXRpb24sIG9sZEluU3dpdGNoLCBvbGRJbkZ1bmN0aW9uQm9keTtcblxuICAgICAgICBleHBlY3QoJ3snKTtcblxuICAgICAgICB3aGlsZSAoaW5kZXggPCBsZW5ndGgpIHtcbiAgICAgICAgICAgIHRva2VuID0gbG9va2FoZWFkKCk7XG4gICAgICAgICAgICBpZiAodG9rZW4udHlwZSAhPT0gVG9rZW4uU3RyaW5nTGl0ZXJhbCkge1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBzb3VyY2VFbGVtZW50ID0gcGFyc2VTb3VyY2VFbGVtZW50KCk7XG4gICAgICAgICAgICBzb3VyY2VFbGVtZW50cy5wdXNoKHNvdXJjZUVsZW1lbnQpO1xuICAgICAgICAgICAgaWYgKHNvdXJjZUVsZW1lbnQuZXhwcmVzc2lvbi50eXBlICE9PSBTeW50YXguTGl0ZXJhbCkge1xuICAgICAgICAgICAgICAgIC8vIHRoaXMgaXMgbm90IGRpcmVjdGl2ZVxuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZGlyZWN0aXZlID0gc2xpY2VTb3VyY2UodG9rZW4ucmFuZ2VbMF0gKyAxLCB0b2tlbi5yYW5nZVsxXSAtIDEpO1xuICAgICAgICAgICAgaWYgKGRpcmVjdGl2ZSA9PT0gJ3VzZSBzdHJpY3QnKSB7XG4gICAgICAgICAgICAgICAgc3RyaWN0ID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICBpZiAoZmlyc3RSZXN0cmljdGVkKSB7XG4gICAgICAgICAgICAgICAgICAgIHRocm93RXJyb3JUb2xlcmFudChmaXJzdFJlc3RyaWN0ZWQsIE1lc3NhZ2VzLlN0cmljdE9jdGFsTGl0ZXJhbCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBpZiAoIWZpcnN0UmVzdHJpY3RlZCAmJiB0b2tlbi5vY3RhbCkge1xuICAgICAgICAgICAgICAgICAgICBmaXJzdFJlc3RyaWN0ZWQgPSB0b2tlbjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBvbGRMYWJlbFNldCA9IHN0YXRlLmxhYmVsU2V0O1xuICAgICAgICBvbGRJbkl0ZXJhdGlvbiA9IHN0YXRlLmluSXRlcmF0aW9uO1xuICAgICAgICBvbGRJblN3aXRjaCA9IHN0YXRlLmluU3dpdGNoO1xuICAgICAgICBvbGRJbkZ1bmN0aW9uQm9keSA9IHN0YXRlLmluRnVuY3Rpb25Cb2R5O1xuXG4gICAgICAgIHN0YXRlLmxhYmVsU2V0ID0ge307XG4gICAgICAgIHN0YXRlLmluSXRlcmF0aW9uID0gZmFsc2U7XG4gICAgICAgIHN0YXRlLmluU3dpdGNoID0gZmFsc2U7XG4gICAgICAgIHN0YXRlLmluRnVuY3Rpb25Cb2R5ID0gdHJ1ZTtcblxuICAgICAgICB3aGlsZSAoaW5kZXggPCBsZW5ndGgpIHtcbiAgICAgICAgICAgIGlmIChtYXRjaCgnfScpKSB7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBzb3VyY2VFbGVtZW50ID0gcGFyc2VTb3VyY2VFbGVtZW50KCk7XG4gICAgICAgICAgICBpZiAodHlwZW9mIHNvdXJjZUVsZW1lbnQgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBzb3VyY2VFbGVtZW50cy5wdXNoKHNvdXJjZUVsZW1lbnQpO1xuICAgICAgICB9XG5cbiAgICAgICAgZXhwZWN0KCd9Jyk7XG5cbiAgICAgICAgc3RhdGUubGFiZWxTZXQgPSBvbGRMYWJlbFNldDtcbiAgICAgICAgc3RhdGUuaW5JdGVyYXRpb24gPSBvbGRJbkl0ZXJhdGlvbjtcbiAgICAgICAgc3RhdGUuaW5Td2l0Y2ggPSBvbGRJblN3aXRjaDtcbiAgICAgICAgc3RhdGUuaW5GdW5jdGlvbkJvZHkgPSBvbGRJbkZ1bmN0aW9uQm9keTtcblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgdHlwZTogU3ludGF4LkJsb2NrU3RhdGVtZW50LFxuICAgICAgICAgICAgYm9keTogc291cmNlRWxlbWVudHNcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBwYXJzZUZ1bmN0aW9uRGVjbGFyYXRpb24oKSB7XG4gICAgICAgIHZhciBpZCwgcGFyYW0sIHBhcmFtcyA9IFtdLCBib2R5LCB0b2tlbiwgc3RyaWN0ZWQsIGZpcnN0UmVzdHJpY3RlZCwgbWVzc2FnZSwgcHJldmlvdXNTdHJpY3QsIHBhcmFtU2V0O1xuXG4gICAgICAgIGV4cGVjdEtleXdvcmQoJ2Z1bmN0aW9uJyk7XG4gICAgICAgIHRva2VuID0gbG9va2FoZWFkKCk7XG4gICAgICAgIGlkID0gcGFyc2VWYXJpYWJsZUlkZW50aWZpZXIoKTtcbiAgICAgICAgaWYgKHN0cmljdCkge1xuICAgICAgICAgICAgaWYgKGlzUmVzdHJpY3RlZFdvcmQodG9rZW4udmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgdGhyb3dFcnJvclRvbGVyYW50KHRva2VuLCBNZXNzYWdlcy5TdHJpY3RGdW5jdGlvbk5hbWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaWYgKGlzUmVzdHJpY3RlZFdvcmQodG9rZW4udmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgZmlyc3RSZXN0cmljdGVkID0gdG9rZW47XG4gICAgICAgICAgICAgICAgbWVzc2FnZSA9IE1lc3NhZ2VzLlN0cmljdEZ1bmN0aW9uTmFtZTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoaXNTdHJpY3RNb2RlUmVzZXJ2ZWRXb3JkKHRva2VuLnZhbHVlKSkge1xuICAgICAgICAgICAgICAgIGZpcnN0UmVzdHJpY3RlZCA9IHRva2VuO1xuICAgICAgICAgICAgICAgIG1lc3NhZ2UgPSBNZXNzYWdlcy5TdHJpY3RSZXNlcnZlZFdvcmQ7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBleHBlY3QoJygnKTtcblxuICAgICAgICBpZiAoIW1hdGNoKCcpJykpIHtcbiAgICAgICAgICAgIHBhcmFtU2V0ID0ge307XG4gICAgICAgICAgICB3aGlsZSAoaW5kZXggPCBsZW5ndGgpIHtcbiAgICAgICAgICAgICAgICB0b2tlbiA9IGxvb2thaGVhZCgpO1xuICAgICAgICAgICAgICAgIHBhcmFtID0gcGFyc2VWYXJpYWJsZUlkZW50aWZpZXIoKTtcbiAgICAgICAgICAgICAgICBpZiAoc3RyaWN0KSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChpc1Jlc3RyaWN0ZWRXb3JkKHRva2VuLnZhbHVlKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgc3RyaWN0ZWQgPSB0b2tlbjtcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UgPSBNZXNzYWdlcy5TdHJpY3RQYXJhbU5hbWU7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChwYXJhbVNldCwgdG9rZW4udmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzdHJpY3RlZCA9IHRva2VuO1xuICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZSA9IE1lc3NhZ2VzLlN0cmljdFBhcmFtRHVwZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoIWZpcnN0UmVzdHJpY3RlZCkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoaXNSZXN0cmljdGVkV29yZCh0b2tlbi52YWx1ZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZpcnN0UmVzdHJpY3RlZCA9IHRva2VuO1xuICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZSA9IE1lc3NhZ2VzLlN0cmljdFBhcmFtTmFtZTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChpc1N0cmljdE1vZGVSZXNlcnZlZFdvcmQodG9rZW4udmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBmaXJzdFJlc3RyaWN0ZWQgPSB0b2tlbjtcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UgPSBNZXNzYWdlcy5TdHJpY3RSZXNlcnZlZFdvcmQ7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKHBhcmFtU2V0LCB0b2tlbi52YWx1ZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZpcnN0UmVzdHJpY3RlZCA9IHRva2VuO1xuICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZSA9IE1lc3NhZ2VzLlN0cmljdFBhcmFtRHVwZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBwYXJhbXMucHVzaChwYXJhbSk7XG4gICAgICAgICAgICAgICAgcGFyYW1TZXRbcGFyYW0ubmFtZV0gPSB0cnVlO1xuICAgICAgICAgICAgICAgIGlmIChtYXRjaCgnKScpKSB7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBleHBlY3QoJywnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGV4cGVjdCgnKScpO1xuXG4gICAgICAgIHByZXZpb3VzU3RyaWN0ID0gc3RyaWN0O1xuICAgICAgICBib2R5ID0gcGFyc2VGdW5jdGlvblNvdXJjZUVsZW1lbnRzKCk7XG4gICAgICAgIGlmIChzdHJpY3QgJiYgZmlyc3RSZXN0cmljdGVkKSB7XG4gICAgICAgICAgICB0aHJvd0Vycm9yKGZpcnN0UmVzdHJpY3RlZCwgbWVzc2FnZSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHN0cmljdCAmJiBzdHJpY3RlZCkge1xuICAgICAgICAgICAgdGhyb3dFcnJvclRvbGVyYW50KHN0cmljdGVkLCBtZXNzYWdlKTtcbiAgICAgICAgfVxuICAgICAgICBzdHJpY3QgPSBwcmV2aW91c1N0cmljdDtcblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgdHlwZTogU3ludGF4LkZ1bmN0aW9uRGVjbGFyYXRpb24sXG4gICAgICAgICAgICBpZDogaWQsXG4gICAgICAgICAgICBwYXJhbXM6IHBhcmFtcyxcbiAgICAgICAgICAgIGRlZmF1bHRzOiBbXSxcbiAgICAgICAgICAgIGJvZHk6IGJvZHksXG4gICAgICAgICAgICByZXN0OiBudWxsLFxuICAgICAgICAgICAgZ2VuZXJhdG9yOiBmYWxzZSxcbiAgICAgICAgICAgIGV4cHJlc3Npb246IGZhbHNlXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcGFyc2VGdW5jdGlvbkV4cHJlc3Npb24oKSB7XG4gICAgICAgIHZhciB0b2tlbiwgaWQgPSBudWxsLCBzdHJpY3RlZCwgZmlyc3RSZXN0cmljdGVkLCBtZXNzYWdlLCBwYXJhbSwgcGFyYW1zID0gW10sIGJvZHksIHByZXZpb3VzU3RyaWN0LCBwYXJhbVNldDtcblxuICAgICAgICBleHBlY3RLZXl3b3JkKCdmdW5jdGlvbicpO1xuXG4gICAgICAgIGlmICghbWF0Y2goJygnKSkge1xuICAgICAgICAgICAgdG9rZW4gPSBsb29rYWhlYWQoKTtcbiAgICAgICAgICAgIGlkID0gcGFyc2VWYXJpYWJsZUlkZW50aWZpZXIoKTtcbiAgICAgICAgICAgIGlmIChzdHJpY3QpIHtcbiAgICAgICAgICAgICAgICBpZiAoaXNSZXN0cmljdGVkV29yZCh0b2tlbi52YWx1ZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhyb3dFcnJvclRvbGVyYW50KHRva2VuLCBNZXNzYWdlcy5TdHJpY3RGdW5jdGlvbk5hbWUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgaWYgKGlzUmVzdHJpY3RlZFdvcmQodG9rZW4udmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgICAgIGZpcnN0UmVzdHJpY3RlZCA9IHRva2VuO1xuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlID0gTWVzc2FnZXMuU3RyaWN0RnVuY3Rpb25OYW1lO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoaXNTdHJpY3RNb2RlUmVzZXJ2ZWRXb3JkKHRva2VuLnZhbHVlKSkge1xuICAgICAgICAgICAgICAgICAgICBmaXJzdFJlc3RyaWN0ZWQgPSB0b2tlbjtcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZSA9IE1lc3NhZ2VzLlN0cmljdFJlc2VydmVkV29yZDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBleHBlY3QoJygnKTtcblxuICAgICAgICBpZiAoIW1hdGNoKCcpJykpIHtcbiAgICAgICAgICAgIHBhcmFtU2V0ID0ge307XG4gICAgICAgICAgICB3aGlsZSAoaW5kZXggPCBsZW5ndGgpIHtcbiAgICAgICAgICAgICAgICB0b2tlbiA9IGxvb2thaGVhZCgpO1xuICAgICAgICAgICAgICAgIHBhcmFtID0gcGFyc2VWYXJpYWJsZUlkZW50aWZpZXIoKTtcbiAgICAgICAgICAgICAgICBpZiAoc3RyaWN0KSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChpc1Jlc3RyaWN0ZWRXb3JkKHRva2VuLnZhbHVlKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgc3RyaWN0ZWQgPSB0b2tlbjtcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UgPSBNZXNzYWdlcy5TdHJpY3RQYXJhbU5hbWU7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChwYXJhbVNldCwgdG9rZW4udmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzdHJpY3RlZCA9IHRva2VuO1xuICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZSA9IE1lc3NhZ2VzLlN0cmljdFBhcmFtRHVwZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoIWZpcnN0UmVzdHJpY3RlZCkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoaXNSZXN0cmljdGVkV29yZCh0b2tlbi52YWx1ZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZpcnN0UmVzdHJpY3RlZCA9IHRva2VuO1xuICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZSA9IE1lc3NhZ2VzLlN0cmljdFBhcmFtTmFtZTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChpc1N0cmljdE1vZGVSZXNlcnZlZFdvcmQodG9rZW4udmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBmaXJzdFJlc3RyaWN0ZWQgPSB0b2tlbjtcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UgPSBNZXNzYWdlcy5TdHJpY3RSZXNlcnZlZFdvcmQ7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKHBhcmFtU2V0LCB0b2tlbi52YWx1ZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZpcnN0UmVzdHJpY3RlZCA9IHRva2VuO1xuICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZSA9IE1lc3NhZ2VzLlN0cmljdFBhcmFtRHVwZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBwYXJhbXMucHVzaChwYXJhbSk7XG4gICAgICAgICAgICAgICAgcGFyYW1TZXRbcGFyYW0ubmFtZV0gPSB0cnVlO1xuICAgICAgICAgICAgICAgIGlmIChtYXRjaCgnKScpKSB7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBleHBlY3QoJywnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGV4cGVjdCgnKScpO1xuXG4gICAgICAgIHByZXZpb3VzU3RyaWN0ID0gc3RyaWN0O1xuICAgICAgICBib2R5ID0gcGFyc2VGdW5jdGlvblNvdXJjZUVsZW1lbnRzKCk7XG4gICAgICAgIGlmIChzdHJpY3QgJiYgZmlyc3RSZXN0cmljdGVkKSB7XG4gICAgICAgICAgICB0aHJvd0Vycm9yKGZpcnN0UmVzdHJpY3RlZCwgbWVzc2FnZSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHN0cmljdCAmJiBzdHJpY3RlZCkge1xuICAgICAgICAgICAgdGhyb3dFcnJvclRvbGVyYW50KHN0cmljdGVkLCBtZXNzYWdlKTtcbiAgICAgICAgfVxuICAgICAgICBzdHJpY3QgPSBwcmV2aW91c1N0cmljdDtcblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgdHlwZTogU3ludGF4LkZ1bmN0aW9uRXhwcmVzc2lvbixcbiAgICAgICAgICAgIGlkOiBpZCxcbiAgICAgICAgICAgIHBhcmFtczogcGFyYW1zLFxuICAgICAgICAgICAgZGVmYXVsdHM6IFtdLFxuICAgICAgICAgICAgYm9keTogYm9keSxcbiAgICAgICAgICAgIHJlc3Q6IG51bGwsXG4gICAgICAgICAgICBnZW5lcmF0b3I6IGZhbHNlLFxuICAgICAgICAgICAgZXhwcmVzc2lvbjogZmFsc2VcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvLyAxNCBQcm9ncmFtXG5cbiAgICBmdW5jdGlvbiBwYXJzZVNvdXJjZUVsZW1lbnQoKSB7XG4gICAgICAgIHZhciB0b2tlbiA9IGxvb2thaGVhZCgpO1xuXG4gICAgICAgIGlmICh0b2tlbi50eXBlID09PSBUb2tlbi5LZXl3b3JkKSB7XG4gICAgICAgICAgICBzd2l0Y2ggKHRva2VuLnZhbHVlKSB7XG4gICAgICAgICAgICBjYXNlICdjb25zdCc6XG4gICAgICAgICAgICBjYXNlICdsZXQnOlxuICAgICAgICAgICAgICAgIHJldHVybiBwYXJzZUNvbnN0TGV0RGVjbGFyYXRpb24odG9rZW4udmFsdWUpO1xuICAgICAgICAgICAgY2FzZSAnZnVuY3Rpb24nOlxuICAgICAgICAgICAgICAgIHJldHVybiBwYXJzZUZ1bmN0aW9uRGVjbGFyYXRpb24oKTtcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgcmV0dXJuIHBhcnNlU3RhdGVtZW50KCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodG9rZW4udHlwZSAhPT0gVG9rZW4uRU9GKSB7XG4gICAgICAgICAgICByZXR1cm4gcGFyc2VTdGF0ZW1lbnQoKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIHBhcnNlU291cmNlRWxlbWVudHMoKSB7XG4gICAgICAgIHZhciBzb3VyY2VFbGVtZW50LCBzb3VyY2VFbGVtZW50cyA9IFtdLCB0b2tlbiwgZGlyZWN0aXZlLCBmaXJzdFJlc3RyaWN0ZWQ7XG5cbiAgICAgICAgd2hpbGUgKGluZGV4IDwgbGVuZ3RoKSB7XG4gICAgICAgICAgICB0b2tlbiA9IGxvb2thaGVhZCgpO1xuICAgICAgICAgICAgaWYgKHRva2VuLnR5cGUgIT09IFRva2VuLlN0cmluZ0xpdGVyYWwpIHtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgc291cmNlRWxlbWVudCA9IHBhcnNlU291cmNlRWxlbWVudCgpO1xuICAgICAgICAgICAgc291cmNlRWxlbWVudHMucHVzaChzb3VyY2VFbGVtZW50KTtcbiAgICAgICAgICAgIGlmIChzb3VyY2VFbGVtZW50LmV4cHJlc3Npb24udHlwZSAhPT0gU3ludGF4LkxpdGVyYWwpIHtcbiAgICAgICAgICAgICAgICAvLyB0aGlzIGlzIG5vdCBkaXJlY3RpdmVcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGRpcmVjdGl2ZSA9IHNsaWNlU291cmNlKHRva2VuLnJhbmdlWzBdICsgMSwgdG9rZW4ucmFuZ2VbMV0gLSAxKTtcbiAgICAgICAgICAgIGlmIChkaXJlY3RpdmUgPT09ICd1c2Ugc3RyaWN0Jykge1xuICAgICAgICAgICAgICAgIHN0cmljdCA9IHRydWU7XG4gICAgICAgICAgICAgICAgaWYgKGZpcnN0UmVzdHJpY3RlZCkge1xuICAgICAgICAgICAgICAgICAgICB0aHJvd0Vycm9yVG9sZXJhbnQoZmlyc3RSZXN0cmljdGVkLCBNZXNzYWdlcy5TdHJpY3RPY3RhbExpdGVyYWwpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgaWYgKCFmaXJzdFJlc3RyaWN0ZWQgJiYgdG9rZW4ub2N0YWwpIHtcbiAgICAgICAgICAgICAgICAgICAgZmlyc3RSZXN0cmljdGVkID0gdG9rZW47XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgd2hpbGUgKGluZGV4IDwgbGVuZ3RoKSB7XG4gICAgICAgICAgICBzb3VyY2VFbGVtZW50ID0gcGFyc2VTb3VyY2VFbGVtZW50KCk7XG4gICAgICAgICAgICBpZiAodHlwZW9mIHNvdXJjZUVsZW1lbnQgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBzb3VyY2VFbGVtZW50cy5wdXNoKHNvdXJjZUVsZW1lbnQpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBzb3VyY2VFbGVtZW50cztcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBwYXJzZVByb2dyYW0oKSB7XG4gICAgICAgIHZhciBwcm9ncmFtO1xuICAgICAgICBzdHJpY3QgPSBmYWxzZTtcbiAgICAgICAgcHJvZ3JhbSA9IHtcbiAgICAgICAgICAgIHR5cGU6IFN5bnRheC5Qcm9ncmFtLFxuICAgICAgICAgICAgYm9keTogcGFyc2VTb3VyY2VFbGVtZW50cygpXG4gICAgICAgIH07XG4gICAgICAgIHJldHVybiBwcm9ncmFtO1xuICAgIH1cblxuICAgIC8vIFRoZSBmb2xsb3dpbmcgZnVuY3Rpb25zIGFyZSBuZWVkZWQgb25seSB3aGVuIHRoZSBvcHRpb24gdG8gcHJlc2VydmVcbiAgICAvLyB0aGUgY29tbWVudHMgaXMgYWN0aXZlLlxuXG4gICAgZnVuY3Rpb24gYWRkQ29tbWVudCh0eXBlLCB2YWx1ZSwgc3RhcnQsIGVuZCwgbG9jKSB7XG4gICAgICAgIGFzc2VydCh0eXBlb2Ygc3RhcnQgPT09ICdudW1iZXInLCAnQ29tbWVudCBtdXN0IGhhdmUgdmFsaWQgcG9zaXRpb24nKTtcblxuICAgICAgICAvLyBCZWNhdXNlIHRoZSB3YXkgdGhlIGFjdHVhbCB0b2tlbiBpcyBzY2FubmVkLCBvZnRlbiB0aGUgY29tbWVudHNcbiAgICAgICAgLy8gKGlmIGFueSkgYXJlIHNraXBwZWQgdHdpY2UgZHVyaW5nIHRoZSBsZXhpY2FsIGFuYWx5c2lzLlxuICAgICAgICAvLyBUaHVzLCB3ZSBuZWVkIHRvIHNraXAgYWRkaW5nIGEgY29tbWVudCBpZiB0aGUgY29tbWVudCBhcnJheSBhbHJlYWR5XG4gICAgICAgIC8vIGhhbmRsZWQgaXQuXG4gICAgICAgIGlmIChleHRyYS5jb21tZW50cy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBpZiAoZXh0cmEuY29tbWVudHNbZXh0cmEuY29tbWVudHMubGVuZ3RoIC0gMV0ucmFuZ2VbMV0gPiBzdGFydCkge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGV4dHJhLmNvbW1lbnRzLnB1c2goe1xuICAgICAgICAgICAgdHlwZTogdHlwZSxcbiAgICAgICAgICAgIHZhbHVlOiB2YWx1ZSxcbiAgICAgICAgICAgIHJhbmdlOiBbc3RhcnQsIGVuZF0sXG4gICAgICAgICAgICBsb2M6IGxvY1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBzY2FuQ29tbWVudCgpIHtcbiAgICAgICAgdmFyIGNvbW1lbnQsIGNoLCBsb2MsIHN0YXJ0LCBibG9ja0NvbW1lbnQsIGxpbmVDb21tZW50O1xuXG4gICAgICAgIGNvbW1lbnQgPSAnJztcbiAgICAgICAgYmxvY2tDb21tZW50ID0gZmFsc2U7XG4gICAgICAgIGxpbmVDb21tZW50ID0gZmFsc2U7XG5cbiAgICAgICAgd2hpbGUgKGluZGV4IDwgbGVuZ3RoKSB7XG4gICAgICAgICAgICBjaCA9IHNvdXJjZVtpbmRleF07XG5cbiAgICAgICAgICAgIGlmIChsaW5lQ29tbWVudCkge1xuICAgICAgICAgICAgICAgIGNoID0gc291cmNlW2luZGV4KytdO1xuICAgICAgICAgICAgICAgIGlmIChpc0xpbmVUZXJtaW5hdG9yKGNoKSkge1xuICAgICAgICAgICAgICAgICAgICBsb2MuZW5kID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgbGluZTogbGluZU51bWJlcixcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbHVtbjogaW5kZXggLSBsaW5lU3RhcnQgLSAxXG4gICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgIGxpbmVDb21tZW50ID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgIGFkZENvbW1lbnQoJ0xpbmUnLCBjb21tZW50LCBzdGFydCwgaW5kZXggLSAxLCBsb2MpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoY2ggPT09ICdcXHInICYmIHNvdXJjZVtpbmRleF0gPT09ICdcXG4nKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICArK2luZGV4O1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICsrbGluZU51bWJlcjtcbiAgICAgICAgICAgICAgICAgICAgbGluZVN0YXJ0ID0gaW5kZXg7XG4gICAgICAgICAgICAgICAgICAgIGNvbW1lbnQgPSAnJztcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGluZGV4ID49IGxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICBsaW5lQ29tbWVudCA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICBjb21tZW50ICs9IGNoO1xuICAgICAgICAgICAgICAgICAgICBsb2MuZW5kID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgbGluZTogbGluZU51bWJlcixcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbHVtbjogbGVuZ3RoIC0gbGluZVN0YXJ0XG4gICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgIGFkZENvbW1lbnQoJ0xpbmUnLCBjb21tZW50LCBzdGFydCwgbGVuZ3RoLCBsb2MpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbW1lbnQgKz0gY2g7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIGlmIChibG9ja0NvbW1lbnQpIHtcbiAgICAgICAgICAgICAgICBpZiAoaXNMaW5lVGVybWluYXRvcihjaCkpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGNoID09PSAnXFxyJyAmJiBzb3VyY2VbaW5kZXggKyAxXSA9PT0gJ1xcbicpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICsraW5kZXg7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb21tZW50ICs9ICdcXHJcXG4nO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29tbWVudCArPSBjaDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICArK2xpbmVOdW1iZXI7XG4gICAgICAgICAgICAgICAgICAgICsraW5kZXg7XG4gICAgICAgICAgICAgICAgICAgIGxpbmVTdGFydCA9IGluZGV4O1xuICAgICAgICAgICAgICAgICAgICBpZiAoaW5kZXggPj0gbGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aHJvd0Vycm9yKHt9LCBNZXNzYWdlcy5VbmV4cGVjdGVkVG9rZW4sICdJTExFR0FMJyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBjaCA9IHNvdXJjZVtpbmRleCsrXTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGluZGV4ID49IGxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3dFcnJvcih7fSwgTWVzc2FnZXMuVW5leHBlY3RlZFRva2VuLCAnSUxMRUdBTCcpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGNvbW1lbnQgKz0gY2g7XG4gICAgICAgICAgICAgICAgICAgIGlmIChjaCA9PT0gJyonKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjaCA9IHNvdXJjZVtpbmRleF07XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoY2ggPT09ICcvJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbW1lbnQgPSBjb21tZW50LnN1YnN0cigwLCBjb21tZW50Lmxlbmd0aCAtIDEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJsb2NrQ29tbWVudCA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICsraW5kZXg7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbG9jLmVuZCA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGluZTogbGluZU51bWJlcixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29sdW1uOiBpbmRleCAtIGxpbmVTdGFydFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYWRkQ29tbWVudCgnQmxvY2snLCBjb21tZW50LCBzdGFydCwgaW5kZXgsIGxvYyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29tbWVudCA9ICcnO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIGlmIChjaCA9PT0gJy8nKSB7XG4gICAgICAgICAgICAgICAgY2ggPSBzb3VyY2VbaW5kZXggKyAxXTtcbiAgICAgICAgICAgICAgICBpZiAoY2ggPT09ICcvJykge1xuICAgICAgICAgICAgICAgICAgICBsb2MgPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzdGFydDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxpbmU6IGxpbmVOdW1iZXIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29sdW1uOiBpbmRleCAtIGxpbmVTdGFydFxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICBzdGFydCA9IGluZGV4O1xuICAgICAgICAgICAgICAgICAgICBpbmRleCArPSAyO1xuICAgICAgICAgICAgICAgICAgICBsaW5lQ29tbWVudCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIGlmIChpbmRleCA+PSBsZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxvYy5lbmQgPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGluZTogbGluZU51bWJlcixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb2x1bW46IGluZGV4IC0gbGluZVN0YXJ0XG4gICAgICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICAgICAgbGluZUNvbW1lbnQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFkZENvbW1lbnQoJ0xpbmUnLCBjb21tZW50LCBzdGFydCwgaW5kZXgsIGxvYyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGNoID09PSAnKicpIHtcbiAgICAgICAgICAgICAgICAgICAgc3RhcnQgPSBpbmRleDtcbiAgICAgICAgICAgICAgICAgICAgaW5kZXggKz0gMjtcbiAgICAgICAgICAgICAgICAgICAgYmxvY2tDb21tZW50ID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgbG9jID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgc3RhcnQ6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsaW5lOiBsaW5lTnVtYmVyLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbHVtbjogaW5kZXggLSBsaW5lU3RhcnQgLSAyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgIGlmIChpbmRleCA+PSBsZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRocm93RXJyb3Ioe30sIE1lc3NhZ2VzLlVuZXhwZWN0ZWRUb2tlbiwgJ0lMTEVHQUwnKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSBpZiAoaXNXaGl0ZVNwYWNlKGNoKSkge1xuICAgICAgICAgICAgICAgICsraW5kZXg7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGlzTGluZVRlcm1pbmF0b3IoY2gpKSB7XG4gICAgICAgICAgICAgICAgKytpbmRleDtcbiAgICAgICAgICAgICAgICBpZiAoY2ggPT09ICAnXFxyJyAmJiBzb3VyY2VbaW5kZXhdID09PSAnXFxuJykge1xuICAgICAgICAgICAgICAgICAgICArK2luZGV4O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICArK2xpbmVOdW1iZXI7XG4gICAgICAgICAgICAgICAgbGluZVN0YXJ0ID0gaW5kZXg7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZmlsdGVyQ29tbWVudExvY2F0aW9uKCkge1xuICAgICAgICB2YXIgaSwgZW50cnksIGNvbW1lbnQsIGNvbW1lbnRzID0gW107XG5cbiAgICAgICAgZm9yIChpID0gMDsgaSA8IGV4dHJhLmNvbW1lbnRzLmxlbmd0aDsgKytpKSB7XG4gICAgICAgICAgICBlbnRyeSA9IGV4dHJhLmNvbW1lbnRzW2ldO1xuICAgICAgICAgICAgY29tbWVudCA9IHtcbiAgICAgICAgICAgICAgICB0eXBlOiBlbnRyeS50eXBlLFxuICAgICAgICAgICAgICAgIHZhbHVlOiBlbnRyeS52YWx1ZVxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIGlmIChleHRyYS5yYW5nZSkge1xuICAgICAgICAgICAgICAgIGNvbW1lbnQucmFuZ2UgPSBlbnRyeS5yYW5nZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChleHRyYS5sb2MpIHtcbiAgICAgICAgICAgICAgICBjb21tZW50LmxvYyA9IGVudHJ5LmxvYztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbW1lbnRzLnB1c2goY29tbWVudCk7XG4gICAgICAgIH1cblxuICAgICAgICBleHRyYS5jb21tZW50cyA9IGNvbW1lbnRzO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGNvbGxlY3RUb2tlbigpIHtcbiAgICAgICAgdmFyIHN0YXJ0LCBsb2MsIHRva2VuLCByYW5nZSwgdmFsdWU7XG5cbiAgICAgICAgc2tpcENvbW1lbnQoKTtcbiAgICAgICAgc3RhcnQgPSBpbmRleDtcbiAgICAgICAgbG9jID0ge1xuICAgICAgICAgICAgc3RhcnQ6IHtcbiAgICAgICAgICAgICAgICBsaW5lOiBsaW5lTnVtYmVyLFxuICAgICAgICAgICAgICAgIGNvbHVtbjogaW5kZXggLSBsaW5lU3RhcnRcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICB0b2tlbiA9IGV4dHJhLmFkdmFuY2UoKTtcbiAgICAgICAgbG9jLmVuZCA9IHtcbiAgICAgICAgICAgIGxpbmU6IGxpbmVOdW1iZXIsXG4gICAgICAgICAgICBjb2x1bW46IGluZGV4IC0gbGluZVN0YXJ0XG4gICAgICAgIH07XG5cbiAgICAgICAgaWYgKHRva2VuLnR5cGUgIT09IFRva2VuLkVPRikge1xuICAgICAgICAgICAgcmFuZ2UgPSBbdG9rZW4ucmFuZ2VbMF0sIHRva2VuLnJhbmdlWzFdXTtcbiAgICAgICAgICAgIHZhbHVlID0gc2xpY2VTb3VyY2UodG9rZW4ucmFuZ2VbMF0sIHRva2VuLnJhbmdlWzFdKTtcbiAgICAgICAgICAgIGV4dHJhLnRva2Vucy5wdXNoKHtcbiAgICAgICAgICAgICAgICB0eXBlOiBUb2tlbk5hbWVbdG9rZW4udHlwZV0sXG4gICAgICAgICAgICAgICAgdmFsdWU6IHZhbHVlLFxuICAgICAgICAgICAgICAgIHJhbmdlOiByYW5nZSxcbiAgICAgICAgICAgICAgICBsb2M6IGxvY1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdG9rZW47XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gY29sbGVjdFJlZ2V4KCkge1xuICAgICAgICB2YXIgcG9zLCBsb2MsIHJlZ2V4LCB0b2tlbjtcblxuICAgICAgICBza2lwQ29tbWVudCgpO1xuXG4gICAgICAgIHBvcyA9IGluZGV4O1xuICAgICAgICBsb2MgPSB7XG4gICAgICAgICAgICBzdGFydDoge1xuICAgICAgICAgICAgICAgIGxpbmU6IGxpbmVOdW1iZXIsXG4gICAgICAgICAgICAgICAgY29sdW1uOiBpbmRleCAtIGxpbmVTdGFydFxuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIHJlZ2V4ID0gZXh0cmEuc2NhblJlZ0V4cCgpO1xuICAgICAgICBsb2MuZW5kID0ge1xuICAgICAgICAgICAgbGluZTogbGluZU51bWJlcixcbiAgICAgICAgICAgIGNvbHVtbjogaW5kZXggLSBsaW5lU3RhcnRcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBQb3AgdGhlIHByZXZpb3VzIHRva2VuLCB3aGljaCBpcyBsaWtlbHkgJy8nIG9yICcvPSdcbiAgICAgICAgaWYgKGV4dHJhLnRva2Vucy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICB0b2tlbiA9IGV4dHJhLnRva2Vuc1tleHRyYS50b2tlbnMubGVuZ3RoIC0gMV07XG4gICAgICAgICAgICBpZiAodG9rZW4ucmFuZ2VbMF0gPT09IHBvcyAmJiB0b2tlbi50eXBlID09PSAnUHVuY3R1YXRvcicpIHtcbiAgICAgICAgICAgICAgICBpZiAodG9rZW4udmFsdWUgPT09ICcvJyB8fCB0b2tlbi52YWx1ZSA9PT0gJy89Jykge1xuICAgICAgICAgICAgICAgICAgICBleHRyYS50b2tlbnMucG9wKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgZXh0cmEudG9rZW5zLnB1c2goe1xuICAgICAgICAgICAgdHlwZTogJ1JlZ3VsYXJFeHByZXNzaW9uJyxcbiAgICAgICAgICAgIHZhbHVlOiByZWdleC5saXRlcmFsLFxuICAgICAgICAgICAgcmFuZ2U6IFtwb3MsIGluZGV4XSxcbiAgICAgICAgICAgIGxvYzogbG9jXG4gICAgICAgIH0pO1xuXG4gICAgICAgIHJldHVybiByZWdleDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBmaWx0ZXJUb2tlbkxvY2F0aW9uKCkge1xuICAgICAgICB2YXIgaSwgZW50cnksIHRva2VuLCB0b2tlbnMgPSBbXTtcblxuICAgICAgICBmb3IgKGkgPSAwOyBpIDwgZXh0cmEudG9rZW5zLmxlbmd0aDsgKytpKSB7XG4gICAgICAgICAgICBlbnRyeSA9IGV4dHJhLnRva2Vuc1tpXTtcbiAgICAgICAgICAgIHRva2VuID0ge1xuICAgICAgICAgICAgICAgIHR5cGU6IGVudHJ5LnR5cGUsXG4gICAgICAgICAgICAgICAgdmFsdWU6IGVudHJ5LnZhbHVlXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgaWYgKGV4dHJhLnJhbmdlKSB7XG4gICAgICAgICAgICAgICAgdG9rZW4ucmFuZ2UgPSBlbnRyeS5yYW5nZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChleHRyYS5sb2MpIHtcbiAgICAgICAgICAgICAgICB0b2tlbi5sb2MgPSBlbnRyeS5sb2M7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0b2tlbnMucHVzaCh0b2tlbik7XG4gICAgICAgIH1cblxuICAgICAgICBleHRyYS50b2tlbnMgPSB0b2tlbnM7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gY3JlYXRlTGl0ZXJhbCh0b2tlbikge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgdHlwZTogU3ludGF4LkxpdGVyYWwsXG4gICAgICAgICAgICB2YWx1ZTogdG9rZW4udmFsdWVcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBjcmVhdGVSYXdMaXRlcmFsKHRva2VuKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB0eXBlOiBTeW50YXguTGl0ZXJhbCxcbiAgICAgICAgICAgIHZhbHVlOiB0b2tlbi52YWx1ZSxcbiAgICAgICAgICAgIHJhdzogc2xpY2VTb3VyY2UodG9rZW4ucmFuZ2VbMF0sIHRva2VuLnJhbmdlWzFdKVxuICAgICAgICB9O1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGNyZWF0ZUxvY2F0aW9uTWFya2VyKCkge1xuICAgICAgICB2YXIgbWFya2VyID0ge307XG5cbiAgICAgICAgbWFya2VyLnJhbmdlID0gW2luZGV4LCBpbmRleF07XG4gICAgICAgIG1hcmtlci5sb2MgPSB7XG4gICAgICAgICAgICBzdGFydDoge1xuICAgICAgICAgICAgICAgIGxpbmU6IGxpbmVOdW1iZXIsXG4gICAgICAgICAgICAgICAgY29sdW1uOiBpbmRleCAtIGxpbmVTdGFydFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGVuZDoge1xuICAgICAgICAgICAgICAgIGxpbmU6IGxpbmVOdW1iZXIsXG4gICAgICAgICAgICAgICAgY29sdW1uOiBpbmRleCAtIGxpbmVTdGFydFxuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIG1hcmtlci5lbmQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB0aGlzLnJhbmdlWzFdID0gaW5kZXg7XG4gICAgICAgICAgICB0aGlzLmxvYy5lbmQubGluZSA9IGxpbmVOdW1iZXI7XG4gICAgICAgICAgICB0aGlzLmxvYy5lbmQuY29sdW1uID0gaW5kZXggLSBsaW5lU3RhcnQ7XG4gICAgICAgIH07XG5cbiAgICAgICAgbWFya2VyLmFwcGx5R3JvdXAgPSBmdW5jdGlvbiAobm9kZSkge1xuICAgICAgICAgICAgaWYgKGV4dHJhLnJhbmdlKSB7XG4gICAgICAgICAgICAgICAgbm9kZS5ncm91cFJhbmdlID0gW3RoaXMucmFuZ2VbMF0sIHRoaXMucmFuZ2VbMV1dO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGV4dHJhLmxvYykge1xuICAgICAgICAgICAgICAgIG5vZGUuZ3JvdXBMb2MgPSB7XG4gICAgICAgICAgICAgICAgICAgIHN0YXJ0OiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBsaW5lOiB0aGlzLmxvYy5zdGFydC5saW5lLFxuICAgICAgICAgICAgICAgICAgICAgICAgY29sdW1uOiB0aGlzLmxvYy5zdGFydC5jb2x1bW5cbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgZW5kOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBsaW5lOiB0aGlzLmxvYy5lbmQubGluZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbHVtbjogdGhpcy5sb2MuZW5kLmNvbHVtblxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICBtYXJrZXIuYXBwbHkgPSBmdW5jdGlvbiAobm9kZSkge1xuICAgICAgICAgICAgaWYgKGV4dHJhLnJhbmdlKSB7XG4gICAgICAgICAgICAgICAgbm9kZS5yYW5nZSA9IFt0aGlzLnJhbmdlWzBdLCB0aGlzLnJhbmdlWzFdXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChleHRyYS5sb2MpIHtcbiAgICAgICAgICAgICAgICBub2RlLmxvYyA9IHtcbiAgICAgICAgICAgICAgICAgICAgc3RhcnQ6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxpbmU6IHRoaXMubG9jLnN0YXJ0LmxpbmUsXG4gICAgICAgICAgICAgICAgICAgICAgICBjb2x1bW46IHRoaXMubG9jLnN0YXJ0LmNvbHVtblxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBlbmQ6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxpbmU6IHRoaXMubG9jLmVuZC5saW5lLFxuICAgICAgICAgICAgICAgICAgICAgICAgY29sdW1uOiB0aGlzLmxvYy5lbmQuY29sdW1uXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIHJldHVybiBtYXJrZXI7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gdHJhY2tHcm91cEV4cHJlc3Npb24oKSB7XG4gICAgICAgIHZhciBtYXJrZXIsIGV4cHI7XG5cbiAgICAgICAgc2tpcENvbW1lbnQoKTtcbiAgICAgICAgbWFya2VyID0gY3JlYXRlTG9jYXRpb25NYXJrZXIoKTtcbiAgICAgICAgZXhwZWN0KCcoJyk7XG5cbiAgICAgICAgZXhwciA9IHBhcnNlRXhwcmVzc2lvbigpO1xuXG4gICAgICAgIGV4cGVjdCgnKScpO1xuXG4gICAgICAgIG1hcmtlci5lbmQoKTtcbiAgICAgICAgbWFya2VyLmFwcGx5R3JvdXAoZXhwcik7XG5cbiAgICAgICAgcmV0dXJuIGV4cHI7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gdHJhY2tMZWZ0SGFuZFNpZGVFeHByZXNzaW9uKCkge1xuICAgICAgICB2YXIgbWFya2VyLCBleHByO1xuXG4gICAgICAgIHNraXBDb21tZW50KCk7XG4gICAgICAgIG1hcmtlciA9IGNyZWF0ZUxvY2F0aW9uTWFya2VyKCk7XG5cbiAgICAgICAgZXhwciA9IG1hdGNoS2V5d29yZCgnbmV3JykgPyBwYXJzZU5ld0V4cHJlc3Npb24oKSA6IHBhcnNlUHJpbWFyeUV4cHJlc3Npb24oKTtcblxuICAgICAgICB3aGlsZSAobWF0Y2goJy4nKSB8fCBtYXRjaCgnWycpKSB7XG4gICAgICAgICAgICBpZiAobWF0Y2goJ1snKSkge1xuICAgICAgICAgICAgICAgIGV4cHIgPSB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IFN5bnRheC5NZW1iZXJFeHByZXNzaW9uLFxuICAgICAgICAgICAgICAgICAgICBjb21wdXRlZDogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgb2JqZWN0OiBleHByLFxuICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0eTogcGFyc2VDb21wdXRlZE1lbWJlcigpXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICBtYXJrZXIuZW5kKCk7XG4gICAgICAgICAgICAgICAgbWFya2VyLmFwcGx5KGV4cHIpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBleHByID0ge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiBTeW50YXguTWVtYmVyRXhwcmVzc2lvbixcbiAgICAgICAgICAgICAgICAgICAgY29tcHV0ZWQ6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICBvYmplY3Q6IGV4cHIsXG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnR5OiBwYXJzZU5vbkNvbXB1dGVkTWVtYmVyKClcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIG1hcmtlci5lbmQoKTtcbiAgICAgICAgICAgICAgICBtYXJrZXIuYXBwbHkoZXhwcik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gZXhwcjtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiB0cmFja0xlZnRIYW5kU2lkZUV4cHJlc3Npb25BbGxvd0NhbGwoKSB7XG4gICAgICAgIHZhciBtYXJrZXIsIGV4cHI7XG5cbiAgICAgICAgc2tpcENvbW1lbnQoKTtcbiAgICAgICAgbWFya2VyID0gY3JlYXRlTG9jYXRpb25NYXJrZXIoKTtcblxuICAgICAgICBleHByID0gbWF0Y2hLZXl3b3JkKCduZXcnKSA/IHBhcnNlTmV3RXhwcmVzc2lvbigpIDogcGFyc2VQcmltYXJ5RXhwcmVzc2lvbigpO1xuXG4gICAgICAgIHdoaWxlIChtYXRjaCgnLicpIHx8IG1hdGNoKCdbJykgfHwgbWF0Y2goJygnKSkge1xuICAgICAgICAgICAgaWYgKG1hdGNoKCcoJykpIHtcbiAgICAgICAgICAgICAgICBleHByID0ge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiBTeW50YXguQ2FsbEV4cHJlc3Npb24sXG4gICAgICAgICAgICAgICAgICAgIGNhbGxlZTogZXhwcixcbiAgICAgICAgICAgICAgICAgICAgJ2FyZ3VtZW50cyc6IHBhcnNlQXJndW1lbnRzKClcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIG1hcmtlci5lbmQoKTtcbiAgICAgICAgICAgICAgICBtYXJrZXIuYXBwbHkoZXhwcik7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKG1hdGNoKCdbJykpIHtcbiAgICAgICAgICAgICAgICBleHByID0ge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiBTeW50YXguTWVtYmVyRXhwcmVzc2lvbixcbiAgICAgICAgICAgICAgICAgICAgY29tcHV0ZWQ6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIG9iamVjdDogZXhwcixcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydHk6IHBhcnNlQ29tcHV0ZWRNZW1iZXIoKVxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgbWFya2VyLmVuZCgpO1xuICAgICAgICAgICAgICAgIG1hcmtlci5hcHBseShleHByKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgZXhwciA9IHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogU3ludGF4Lk1lbWJlckV4cHJlc3Npb24sXG4gICAgICAgICAgICAgICAgICAgIGNvbXB1dGVkOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgb2JqZWN0OiBleHByLFxuICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0eTogcGFyc2VOb25Db21wdXRlZE1lbWJlcigpXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICBtYXJrZXIuZW5kKCk7XG4gICAgICAgICAgICAgICAgbWFya2VyLmFwcGx5KGV4cHIpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGV4cHI7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZmlsdGVyR3JvdXAobm9kZSkge1xuICAgICAgICB2YXIgbiwgaSwgZW50cnk7XG5cbiAgICAgICAgbiA9IChPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmFwcGx5KG5vZGUpID09PSAnW29iamVjdCBBcnJheV0nKSA/IFtdIDoge307XG4gICAgICAgIGZvciAoaSBpbiBub2RlKSB7XG4gICAgICAgICAgICBpZiAobm9kZS5oYXNPd25Qcm9wZXJ0eShpKSAmJiBpICE9PSAnZ3JvdXBSYW5nZScgJiYgaSAhPT0gJ2dyb3VwTG9jJykge1xuICAgICAgICAgICAgICAgIGVudHJ5ID0gbm9kZVtpXTtcbiAgICAgICAgICAgICAgICBpZiAoZW50cnkgPT09IG51bGwgfHwgdHlwZW9mIGVudHJ5ICE9PSAnb2JqZWN0JyB8fCBlbnRyeSBpbnN0YW5jZW9mIFJlZ0V4cCkge1xuICAgICAgICAgICAgICAgICAgICBuW2ldID0gZW50cnk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgbltpXSA9IGZpbHRlckdyb3VwKGVudHJ5KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG47XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gd3JhcFRyYWNraW5nRnVuY3Rpb24ocmFuZ2UsIGxvYykge1xuXG4gICAgICAgIHJldHVybiBmdW5jdGlvbiAocGFyc2VGdW5jdGlvbikge1xuXG4gICAgICAgICAgICBmdW5jdGlvbiBpc0JpbmFyeShub2RlKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG5vZGUudHlwZSA9PT0gU3ludGF4LkxvZ2ljYWxFeHByZXNzaW9uIHx8XG4gICAgICAgICAgICAgICAgICAgIG5vZGUudHlwZSA9PT0gU3ludGF4LkJpbmFyeUV4cHJlc3Npb247XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGZ1bmN0aW9uIHZpc2l0KG5vZGUpIHtcbiAgICAgICAgICAgICAgICB2YXIgc3RhcnQsIGVuZDtcblxuICAgICAgICAgICAgICAgIGlmIChpc0JpbmFyeShub2RlLmxlZnQpKSB7XG4gICAgICAgICAgICAgICAgICAgIHZpc2l0KG5vZGUubGVmdCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChpc0JpbmFyeShub2RlLnJpZ2h0KSkge1xuICAgICAgICAgICAgICAgICAgICB2aXNpdChub2RlLnJpZ2h0KTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBpZiAocmFuZ2UpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKG5vZGUubGVmdC5ncm91cFJhbmdlIHx8IG5vZGUucmlnaHQuZ3JvdXBSYW5nZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgc3RhcnQgPSBub2RlLmxlZnQuZ3JvdXBSYW5nZSA/IG5vZGUubGVmdC5ncm91cFJhbmdlWzBdIDogbm9kZS5sZWZ0LnJhbmdlWzBdO1xuICAgICAgICAgICAgICAgICAgICAgICAgZW5kID0gbm9kZS5yaWdodC5ncm91cFJhbmdlID8gbm9kZS5yaWdodC5ncm91cFJhbmdlWzFdIDogbm9kZS5yaWdodC5yYW5nZVsxXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIG5vZGUucmFuZ2UgPSBbc3RhcnQsIGVuZF07XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAodHlwZW9mIG5vZGUucmFuZ2UgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzdGFydCA9IG5vZGUubGVmdC5yYW5nZVswXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGVuZCA9IG5vZGUucmlnaHQucmFuZ2VbMV07XG4gICAgICAgICAgICAgICAgICAgICAgICBub2RlLnJhbmdlID0gW3N0YXJ0LCBlbmRdO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChsb2MpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKG5vZGUubGVmdC5ncm91cExvYyB8fCBub2RlLnJpZ2h0Lmdyb3VwTG9jKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzdGFydCA9IG5vZGUubGVmdC5ncm91cExvYyA/IG5vZGUubGVmdC5ncm91cExvYy5zdGFydCA6IG5vZGUubGVmdC5sb2Muc3RhcnQ7XG4gICAgICAgICAgICAgICAgICAgICAgICBlbmQgPSBub2RlLnJpZ2h0Lmdyb3VwTG9jID8gbm9kZS5yaWdodC5ncm91cExvYy5lbmQgOiBub2RlLnJpZ2h0LmxvYy5lbmQ7XG4gICAgICAgICAgICAgICAgICAgICAgICBub2RlLmxvYyA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdGFydDogc3RhcnQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZW5kOiBlbmRcbiAgICAgICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAodHlwZW9mIG5vZGUubG9jID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgbm9kZS5sb2MgPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RhcnQ6IG5vZGUubGVmdC5sb2Muc3RhcnQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZW5kOiBub2RlLnJpZ2h0LmxvYy5lbmRcbiAgICAgICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgdmFyIG1hcmtlciwgbm9kZTtcblxuICAgICAgICAgICAgICAgIHNraXBDb21tZW50KCk7XG5cbiAgICAgICAgICAgICAgICBtYXJrZXIgPSBjcmVhdGVMb2NhdGlvbk1hcmtlcigpO1xuICAgICAgICAgICAgICAgIG5vZGUgPSBwYXJzZUZ1bmN0aW9uLmFwcGx5KG51bGwsIGFyZ3VtZW50cyk7XG4gICAgICAgICAgICAgICAgbWFya2VyLmVuZCgpO1xuXG4gICAgICAgICAgICAgICAgaWYgKHJhbmdlICYmIHR5cGVvZiBub2RlLnJhbmdlID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgICAgICAgICBtYXJrZXIuYXBwbHkobm9kZSk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaWYgKGxvYyAmJiB0eXBlb2Ygbm9kZS5sb2MgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgICAgIG1hcmtlci5hcHBseShub2RlKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBpZiAoaXNCaW5hcnkobm9kZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgdmlzaXQobm9kZSk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgcmV0dXJuIG5vZGU7XG4gICAgICAgICAgICB9O1xuICAgICAgICB9O1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHBhdGNoKCkge1xuXG4gICAgICAgIHZhciB3cmFwVHJhY2tpbmc7XG5cbiAgICAgICAgaWYgKGV4dHJhLmNvbW1lbnRzKSB7XG4gICAgICAgICAgICBleHRyYS5za2lwQ29tbWVudCA9IHNraXBDb21tZW50O1xuICAgICAgICAgICAgc2tpcENvbW1lbnQgPSBzY2FuQ29tbWVudDtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChleHRyYS5yYXcpIHtcbiAgICAgICAgICAgIGV4dHJhLmNyZWF0ZUxpdGVyYWwgPSBjcmVhdGVMaXRlcmFsO1xuICAgICAgICAgICAgY3JlYXRlTGl0ZXJhbCA9IGNyZWF0ZVJhd0xpdGVyYWw7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoZXh0cmEucmFuZ2UgfHwgZXh0cmEubG9jKSB7XG5cbiAgICAgICAgICAgIGV4dHJhLnBhcnNlR3JvdXBFeHByZXNzaW9uID0gcGFyc2VHcm91cEV4cHJlc3Npb247XG4gICAgICAgICAgICBleHRyYS5wYXJzZUxlZnRIYW5kU2lkZUV4cHJlc3Npb24gPSBwYXJzZUxlZnRIYW5kU2lkZUV4cHJlc3Npb247XG4gICAgICAgICAgICBleHRyYS5wYXJzZUxlZnRIYW5kU2lkZUV4cHJlc3Npb25BbGxvd0NhbGwgPSBwYXJzZUxlZnRIYW5kU2lkZUV4cHJlc3Npb25BbGxvd0NhbGw7XG4gICAgICAgICAgICBwYXJzZUdyb3VwRXhwcmVzc2lvbiA9IHRyYWNrR3JvdXBFeHByZXNzaW9uO1xuICAgICAgICAgICAgcGFyc2VMZWZ0SGFuZFNpZGVFeHByZXNzaW9uID0gdHJhY2tMZWZ0SGFuZFNpZGVFeHByZXNzaW9uO1xuICAgICAgICAgICAgcGFyc2VMZWZ0SGFuZFNpZGVFeHByZXNzaW9uQWxsb3dDYWxsID0gdHJhY2tMZWZ0SGFuZFNpZGVFeHByZXNzaW9uQWxsb3dDYWxsO1xuXG4gICAgICAgICAgICB3cmFwVHJhY2tpbmcgPSB3cmFwVHJhY2tpbmdGdW5jdGlvbihleHRyYS5yYW5nZSwgZXh0cmEubG9jKTtcblxuICAgICAgICAgICAgZXh0cmEucGFyc2VBZGRpdGl2ZUV4cHJlc3Npb24gPSBwYXJzZUFkZGl0aXZlRXhwcmVzc2lvbjtcbiAgICAgICAgICAgIGV4dHJhLnBhcnNlQXNzaWdubWVudEV4cHJlc3Npb24gPSBwYXJzZUFzc2lnbm1lbnRFeHByZXNzaW9uO1xuICAgICAgICAgICAgZXh0cmEucGFyc2VCaXR3aXNlQU5ERXhwcmVzc2lvbiA9IHBhcnNlQml0d2lzZUFOREV4cHJlc3Npb247XG4gICAgICAgICAgICBleHRyYS5wYXJzZUJpdHdpc2VPUkV4cHJlc3Npb24gPSBwYXJzZUJpdHdpc2VPUkV4cHJlc3Npb247XG4gICAgICAgICAgICBleHRyYS5wYXJzZUJpdHdpc2VYT1JFeHByZXNzaW9uID0gcGFyc2VCaXR3aXNlWE9SRXhwcmVzc2lvbjtcbiAgICAgICAgICAgIGV4dHJhLnBhcnNlQmxvY2sgPSBwYXJzZUJsb2NrO1xuICAgICAgICAgICAgZXh0cmEucGFyc2VGdW5jdGlvblNvdXJjZUVsZW1lbnRzID0gcGFyc2VGdW5jdGlvblNvdXJjZUVsZW1lbnRzO1xuICAgICAgICAgICAgZXh0cmEucGFyc2VDYXRjaENsYXVzZSA9IHBhcnNlQ2F0Y2hDbGF1c2U7XG4gICAgICAgICAgICBleHRyYS5wYXJzZUNvbXB1dGVkTWVtYmVyID0gcGFyc2VDb21wdXRlZE1lbWJlcjtcbiAgICAgICAgICAgIGV4dHJhLnBhcnNlQ29uZGl0aW9uYWxFeHByZXNzaW9uID0gcGFyc2VDb25kaXRpb25hbEV4cHJlc3Npb247XG4gICAgICAgICAgICBleHRyYS5wYXJzZUNvbnN0TGV0RGVjbGFyYXRpb24gPSBwYXJzZUNvbnN0TGV0RGVjbGFyYXRpb247XG4gICAgICAgICAgICBleHRyYS5wYXJzZUVxdWFsaXR5RXhwcmVzc2lvbiA9IHBhcnNlRXF1YWxpdHlFeHByZXNzaW9uO1xuICAgICAgICAgICAgZXh0cmEucGFyc2VFeHByZXNzaW9uID0gcGFyc2VFeHByZXNzaW9uO1xuICAgICAgICAgICAgZXh0cmEucGFyc2VGb3JWYXJpYWJsZURlY2xhcmF0aW9uID0gcGFyc2VGb3JWYXJpYWJsZURlY2xhcmF0aW9uO1xuICAgICAgICAgICAgZXh0cmEucGFyc2VGdW5jdGlvbkRlY2xhcmF0aW9uID0gcGFyc2VGdW5jdGlvbkRlY2xhcmF0aW9uO1xuICAgICAgICAgICAgZXh0cmEucGFyc2VGdW5jdGlvbkV4cHJlc3Npb24gPSBwYXJzZUZ1bmN0aW9uRXhwcmVzc2lvbjtcbiAgICAgICAgICAgIGV4dHJhLnBhcnNlTG9naWNhbEFOREV4cHJlc3Npb24gPSBwYXJzZUxvZ2ljYWxBTkRFeHByZXNzaW9uO1xuICAgICAgICAgICAgZXh0cmEucGFyc2VMb2dpY2FsT1JFeHByZXNzaW9uID0gcGFyc2VMb2dpY2FsT1JFeHByZXNzaW9uO1xuICAgICAgICAgICAgZXh0cmEucGFyc2VNdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb24gPSBwYXJzZU11bHRpcGxpY2F0aXZlRXhwcmVzc2lvbjtcbiAgICAgICAgICAgIGV4dHJhLnBhcnNlTmV3RXhwcmVzc2lvbiA9IHBhcnNlTmV3RXhwcmVzc2lvbjtcbiAgICAgICAgICAgIGV4dHJhLnBhcnNlTm9uQ29tcHV0ZWRQcm9wZXJ0eSA9IHBhcnNlTm9uQ29tcHV0ZWRQcm9wZXJ0eTtcbiAgICAgICAgICAgIGV4dHJhLnBhcnNlT2JqZWN0UHJvcGVydHkgPSBwYXJzZU9iamVjdFByb3BlcnR5O1xuICAgICAgICAgICAgZXh0cmEucGFyc2VPYmplY3RQcm9wZXJ0eUtleSA9IHBhcnNlT2JqZWN0UHJvcGVydHlLZXk7XG4gICAgICAgICAgICBleHRyYS5wYXJzZVBvc3RmaXhFeHByZXNzaW9uID0gcGFyc2VQb3N0Zml4RXhwcmVzc2lvbjtcbiAgICAgICAgICAgIGV4dHJhLnBhcnNlUHJpbWFyeUV4cHJlc3Npb24gPSBwYXJzZVByaW1hcnlFeHByZXNzaW9uO1xuICAgICAgICAgICAgZXh0cmEucGFyc2VQcm9ncmFtID0gcGFyc2VQcm9ncmFtO1xuICAgICAgICAgICAgZXh0cmEucGFyc2VQcm9wZXJ0eUZ1bmN0aW9uID0gcGFyc2VQcm9wZXJ0eUZ1bmN0aW9uO1xuICAgICAgICAgICAgZXh0cmEucGFyc2VSZWxhdGlvbmFsRXhwcmVzc2lvbiA9IHBhcnNlUmVsYXRpb25hbEV4cHJlc3Npb247XG4gICAgICAgICAgICBleHRyYS5wYXJzZVN0YXRlbWVudCA9IHBhcnNlU3RhdGVtZW50O1xuICAgICAgICAgICAgZXh0cmEucGFyc2VTaGlmdEV4cHJlc3Npb24gPSBwYXJzZVNoaWZ0RXhwcmVzc2lvbjtcbiAgICAgICAgICAgIGV4dHJhLnBhcnNlU3dpdGNoQ2FzZSA9IHBhcnNlU3dpdGNoQ2FzZTtcbiAgICAgICAgICAgIGV4dHJhLnBhcnNlVW5hcnlFeHByZXNzaW9uID0gcGFyc2VVbmFyeUV4cHJlc3Npb247XG4gICAgICAgICAgICBleHRyYS5wYXJzZVZhcmlhYmxlRGVjbGFyYXRpb24gPSBwYXJzZVZhcmlhYmxlRGVjbGFyYXRpb247XG4gICAgICAgICAgICBleHRyYS5wYXJzZVZhcmlhYmxlSWRlbnRpZmllciA9IHBhcnNlVmFyaWFibGVJZGVudGlmaWVyO1xuXG4gICAgICAgICAgICBwYXJzZUFkZGl0aXZlRXhwcmVzc2lvbiA9IHdyYXBUcmFja2luZyhleHRyYS5wYXJzZUFkZGl0aXZlRXhwcmVzc2lvbik7XG4gICAgICAgICAgICBwYXJzZUFzc2lnbm1lbnRFeHByZXNzaW9uID0gd3JhcFRyYWNraW5nKGV4dHJhLnBhcnNlQXNzaWdubWVudEV4cHJlc3Npb24pO1xuICAgICAgICAgICAgcGFyc2VCaXR3aXNlQU5ERXhwcmVzc2lvbiA9IHdyYXBUcmFja2luZyhleHRyYS5wYXJzZUJpdHdpc2VBTkRFeHByZXNzaW9uKTtcbiAgICAgICAgICAgIHBhcnNlQml0d2lzZU9SRXhwcmVzc2lvbiA9IHdyYXBUcmFja2luZyhleHRyYS5wYXJzZUJpdHdpc2VPUkV4cHJlc3Npb24pO1xuICAgICAgICAgICAgcGFyc2VCaXR3aXNlWE9SRXhwcmVzc2lvbiA9IHdyYXBUcmFja2luZyhleHRyYS5wYXJzZUJpdHdpc2VYT1JFeHByZXNzaW9uKTtcbiAgICAgICAgICAgIHBhcnNlQmxvY2sgPSB3cmFwVHJhY2tpbmcoZXh0cmEucGFyc2VCbG9jayk7XG4gICAgICAgICAgICBwYXJzZUZ1bmN0aW9uU291cmNlRWxlbWVudHMgPSB3cmFwVHJhY2tpbmcoZXh0cmEucGFyc2VGdW5jdGlvblNvdXJjZUVsZW1lbnRzKTtcbiAgICAgICAgICAgIHBhcnNlQ2F0Y2hDbGF1c2UgPSB3cmFwVHJhY2tpbmcoZXh0cmEucGFyc2VDYXRjaENsYXVzZSk7XG4gICAgICAgICAgICBwYXJzZUNvbXB1dGVkTWVtYmVyID0gd3JhcFRyYWNraW5nKGV4dHJhLnBhcnNlQ29tcHV0ZWRNZW1iZXIpO1xuICAgICAgICAgICAgcGFyc2VDb25kaXRpb25hbEV4cHJlc3Npb24gPSB3cmFwVHJhY2tpbmcoZXh0cmEucGFyc2VDb25kaXRpb25hbEV4cHJlc3Npb24pO1xuICAgICAgICAgICAgcGFyc2VDb25zdExldERlY2xhcmF0aW9uID0gd3JhcFRyYWNraW5nKGV4dHJhLnBhcnNlQ29uc3RMZXREZWNsYXJhdGlvbik7XG4gICAgICAgICAgICBwYXJzZUVxdWFsaXR5RXhwcmVzc2lvbiA9IHdyYXBUcmFja2luZyhleHRyYS5wYXJzZUVxdWFsaXR5RXhwcmVzc2lvbik7XG4gICAgICAgICAgICBwYXJzZUV4cHJlc3Npb24gPSB3cmFwVHJhY2tpbmcoZXh0cmEucGFyc2VFeHByZXNzaW9uKTtcbiAgICAgICAgICAgIHBhcnNlRm9yVmFyaWFibGVEZWNsYXJhdGlvbiA9IHdyYXBUcmFja2luZyhleHRyYS5wYXJzZUZvclZhcmlhYmxlRGVjbGFyYXRpb24pO1xuICAgICAgICAgICAgcGFyc2VGdW5jdGlvbkRlY2xhcmF0aW9uID0gd3JhcFRyYWNraW5nKGV4dHJhLnBhcnNlRnVuY3Rpb25EZWNsYXJhdGlvbik7XG4gICAgICAgICAgICBwYXJzZUZ1bmN0aW9uRXhwcmVzc2lvbiA9IHdyYXBUcmFja2luZyhleHRyYS5wYXJzZUZ1bmN0aW9uRXhwcmVzc2lvbik7XG4gICAgICAgICAgICBwYXJzZUxlZnRIYW5kU2lkZUV4cHJlc3Npb24gPSB3cmFwVHJhY2tpbmcocGFyc2VMZWZ0SGFuZFNpZGVFeHByZXNzaW9uKTtcbiAgICAgICAgICAgIHBhcnNlTG9naWNhbEFOREV4cHJlc3Npb24gPSB3cmFwVHJhY2tpbmcoZXh0cmEucGFyc2VMb2dpY2FsQU5ERXhwcmVzc2lvbik7XG4gICAgICAgICAgICBwYXJzZUxvZ2ljYWxPUkV4cHJlc3Npb24gPSB3cmFwVHJhY2tpbmcoZXh0cmEucGFyc2VMb2dpY2FsT1JFeHByZXNzaW9uKTtcbiAgICAgICAgICAgIHBhcnNlTXVsdGlwbGljYXRpdmVFeHByZXNzaW9uID0gd3JhcFRyYWNraW5nKGV4dHJhLnBhcnNlTXVsdGlwbGljYXRpdmVFeHByZXNzaW9uKTtcbiAgICAgICAgICAgIHBhcnNlTmV3RXhwcmVzc2lvbiA9IHdyYXBUcmFja2luZyhleHRyYS5wYXJzZU5ld0V4cHJlc3Npb24pO1xuICAgICAgICAgICAgcGFyc2VOb25Db21wdXRlZFByb3BlcnR5ID0gd3JhcFRyYWNraW5nKGV4dHJhLnBhcnNlTm9uQ29tcHV0ZWRQcm9wZXJ0eSk7XG4gICAgICAgICAgICBwYXJzZU9iamVjdFByb3BlcnR5ID0gd3JhcFRyYWNraW5nKGV4dHJhLnBhcnNlT2JqZWN0UHJvcGVydHkpO1xuICAgICAgICAgICAgcGFyc2VPYmplY3RQcm9wZXJ0eUtleSA9IHdyYXBUcmFja2luZyhleHRyYS5wYXJzZU9iamVjdFByb3BlcnR5S2V5KTtcbiAgICAgICAgICAgIHBhcnNlUG9zdGZpeEV4cHJlc3Npb24gPSB3cmFwVHJhY2tpbmcoZXh0cmEucGFyc2VQb3N0Zml4RXhwcmVzc2lvbik7XG4gICAgICAgICAgICBwYXJzZVByaW1hcnlFeHByZXNzaW9uID0gd3JhcFRyYWNraW5nKGV4dHJhLnBhcnNlUHJpbWFyeUV4cHJlc3Npb24pO1xuICAgICAgICAgICAgcGFyc2VQcm9ncmFtID0gd3JhcFRyYWNraW5nKGV4dHJhLnBhcnNlUHJvZ3JhbSk7XG4gICAgICAgICAgICBwYXJzZVByb3BlcnR5RnVuY3Rpb24gPSB3cmFwVHJhY2tpbmcoZXh0cmEucGFyc2VQcm9wZXJ0eUZ1bmN0aW9uKTtcbiAgICAgICAgICAgIHBhcnNlUmVsYXRpb25hbEV4cHJlc3Npb24gPSB3cmFwVHJhY2tpbmcoZXh0cmEucGFyc2VSZWxhdGlvbmFsRXhwcmVzc2lvbik7XG4gICAgICAgICAgICBwYXJzZVN0YXRlbWVudCA9IHdyYXBUcmFja2luZyhleHRyYS5wYXJzZVN0YXRlbWVudCk7XG4gICAgICAgICAgICBwYXJzZVNoaWZ0RXhwcmVzc2lvbiA9IHdyYXBUcmFja2luZyhleHRyYS5wYXJzZVNoaWZ0RXhwcmVzc2lvbik7XG4gICAgICAgICAgICBwYXJzZVN3aXRjaENhc2UgPSB3cmFwVHJhY2tpbmcoZXh0cmEucGFyc2VTd2l0Y2hDYXNlKTtcbiAgICAgICAgICAgIHBhcnNlVW5hcnlFeHByZXNzaW9uID0gd3JhcFRyYWNraW5nKGV4dHJhLnBhcnNlVW5hcnlFeHByZXNzaW9uKTtcbiAgICAgICAgICAgIHBhcnNlVmFyaWFibGVEZWNsYXJhdGlvbiA9IHdyYXBUcmFja2luZyhleHRyYS5wYXJzZVZhcmlhYmxlRGVjbGFyYXRpb24pO1xuICAgICAgICAgICAgcGFyc2VWYXJpYWJsZUlkZW50aWZpZXIgPSB3cmFwVHJhY2tpbmcoZXh0cmEucGFyc2VWYXJpYWJsZUlkZW50aWZpZXIpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHR5cGVvZiBleHRyYS50b2tlbnMgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICBleHRyYS5hZHZhbmNlID0gYWR2YW5jZTtcbiAgICAgICAgICAgIGV4dHJhLnNjYW5SZWdFeHAgPSBzY2FuUmVnRXhwO1xuXG4gICAgICAgICAgICBhZHZhbmNlID0gY29sbGVjdFRva2VuO1xuICAgICAgICAgICAgc2NhblJlZ0V4cCA9IGNvbGxlY3RSZWdleDtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIHVucGF0Y2goKSB7XG4gICAgICAgIGlmICh0eXBlb2YgZXh0cmEuc2tpcENvbW1lbnQgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIHNraXBDb21tZW50ID0gZXh0cmEuc2tpcENvbW1lbnQ7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoZXh0cmEucmF3KSB7XG4gICAgICAgICAgICBjcmVhdGVMaXRlcmFsID0gZXh0cmEuY3JlYXRlTGl0ZXJhbDtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChleHRyYS5yYW5nZSB8fCBleHRyYS5sb2MpIHtcbiAgICAgICAgICAgIHBhcnNlQWRkaXRpdmVFeHByZXNzaW9uID0gZXh0cmEucGFyc2VBZGRpdGl2ZUV4cHJlc3Npb247XG4gICAgICAgICAgICBwYXJzZUFzc2lnbm1lbnRFeHByZXNzaW9uID0gZXh0cmEucGFyc2VBc3NpZ25tZW50RXhwcmVzc2lvbjtcbiAgICAgICAgICAgIHBhcnNlQml0d2lzZUFOREV4cHJlc3Npb24gPSBleHRyYS5wYXJzZUJpdHdpc2VBTkRFeHByZXNzaW9uO1xuICAgICAgICAgICAgcGFyc2VCaXR3aXNlT1JFeHByZXNzaW9uID0gZXh0cmEucGFyc2VCaXR3aXNlT1JFeHByZXNzaW9uO1xuICAgICAgICAgICAgcGFyc2VCaXR3aXNlWE9SRXhwcmVzc2lvbiA9IGV4dHJhLnBhcnNlQml0d2lzZVhPUkV4cHJlc3Npb247XG4gICAgICAgICAgICBwYXJzZUJsb2NrID0gZXh0cmEucGFyc2VCbG9jaztcbiAgICAgICAgICAgIHBhcnNlRnVuY3Rpb25Tb3VyY2VFbGVtZW50cyA9IGV4dHJhLnBhcnNlRnVuY3Rpb25Tb3VyY2VFbGVtZW50cztcbiAgICAgICAgICAgIHBhcnNlQ2F0Y2hDbGF1c2UgPSBleHRyYS5wYXJzZUNhdGNoQ2xhdXNlO1xuICAgICAgICAgICAgcGFyc2VDb21wdXRlZE1lbWJlciA9IGV4dHJhLnBhcnNlQ29tcHV0ZWRNZW1iZXI7XG4gICAgICAgICAgICBwYXJzZUNvbmRpdGlvbmFsRXhwcmVzc2lvbiA9IGV4dHJhLnBhcnNlQ29uZGl0aW9uYWxFeHByZXNzaW9uO1xuICAgICAgICAgICAgcGFyc2VDb25zdExldERlY2xhcmF0aW9uID0gZXh0cmEucGFyc2VDb25zdExldERlY2xhcmF0aW9uO1xuICAgICAgICAgICAgcGFyc2VFcXVhbGl0eUV4cHJlc3Npb24gPSBleHRyYS5wYXJzZUVxdWFsaXR5RXhwcmVzc2lvbjtcbiAgICAgICAgICAgIHBhcnNlRXhwcmVzc2lvbiA9IGV4dHJhLnBhcnNlRXhwcmVzc2lvbjtcbiAgICAgICAgICAgIHBhcnNlRm9yVmFyaWFibGVEZWNsYXJhdGlvbiA9IGV4dHJhLnBhcnNlRm9yVmFyaWFibGVEZWNsYXJhdGlvbjtcbiAgICAgICAgICAgIHBhcnNlRnVuY3Rpb25EZWNsYXJhdGlvbiA9IGV4dHJhLnBhcnNlRnVuY3Rpb25EZWNsYXJhdGlvbjtcbiAgICAgICAgICAgIHBhcnNlRnVuY3Rpb25FeHByZXNzaW9uID0gZXh0cmEucGFyc2VGdW5jdGlvbkV4cHJlc3Npb247XG4gICAgICAgICAgICBwYXJzZUdyb3VwRXhwcmVzc2lvbiA9IGV4dHJhLnBhcnNlR3JvdXBFeHByZXNzaW9uO1xuICAgICAgICAgICAgcGFyc2VMZWZ0SGFuZFNpZGVFeHByZXNzaW9uID0gZXh0cmEucGFyc2VMZWZ0SGFuZFNpZGVFeHByZXNzaW9uO1xuICAgICAgICAgICAgcGFyc2VMZWZ0SGFuZFNpZGVFeHByZXNzaW9uQWxsb3dDYWxsID0gZXh0cmEucGFyc2VMZWZ0SGFuZFNpZGVFeHByZXNzaW9uQWxsb3dDYWxsO1xuICAgICAgICAgICAgcGFyc2VMb2dpY2FsQU5ERXhwcmVzc2lvbiA9IGV4dHJhLnBhcnNlTG9naWNhbEFOREV4cHJlc3Npb247XG4gICAgICAgICAgICBwYXJzZUxvZ2ljYWxPUkV4cHJlc3Npb24gPSBleHRyYS5wYXJzZUxvZ2ljYWxPUkV4cHJlc3Npb247XG4gICAgICAgICAgICBwYXJzZU11bHRpcGxpY2F0aXZlRXhwcmVzc2lvbiA9IGV4dHJhLnBhcnNlTXVsdGlwbGljYXRpdmVFeHByZXNzaW9uO1xuICAgICAgICAgICAgcGFyc2VOZXdFeHByZXNzaW9uID0gZXh0cmEucGFyc2VOZXdFeHByZXNzaW9uO1xuICAgICAgICAgICAgcGFyc2VOb25Db21wdXRlZFByb3BlcnR5ID0gZXh0cmEucGFyc2VOb25Db21wdXRlZFByb3BlcnR5O1xuICAgICAgICAgICAgcGFyc2VPYmplY3RQcm9wZXJ0eSA9IGV4dHJhLnBhcnNlT2JqZWN0UHJvcGVydHk7XG4gICAgICAgICAgICBwYXJzZU9iamVjdFByb3BlcnR5S2V5ID0gZXh0cmEucGFyc2VPYmplY3RQcm9wZXJ0eUtleTtcbiAgICAgICAgICAgIHBhcnNlUHJpbWFyeUV4cHJlc3Npb24gPSBleHRyYS5wYXJzZVByaW1hcnlFeHByZXNzaW9uO1xuICAgICAgICAgICAgcGFyc2VQb3N0Zml4RXhwcmVzc2lvbiA9IGV4dHJhLnBhcnNlUG9zdGZpeEV4cHJlc3Npb247XG4gICAgICAgICAgICBwYXJzZVByb2dyYW0gPSBleHRyYS5wYXJzZVByb2dyYW07XG4gICAgICAgICAgICBwYXJzZVByb3BlcnR5RnVuY3Rpb24gPSBleHRyYS5wYXJzZVByb3BlcnR5RnVuY3Rpb247XG4gICAgICAgICAgICBwYXJzZVJlbGF0aW9uYWxFeHByZXNzaW9uID0gZXh0cmEucGFyc2VSZWxhdGlvbmFsRXhwcmVzc2lvbjtcbiAgICAgICAgICAgIHBhcnNlU3RhdGVtZW50ID0gZXh0cmEucGFyc2VTdGF0ZW1lbnQ7XG4gICAgICAgICAgICBwYXJzZVNoaWZ0RXhwcmVzc2lvbiA9IGV4dHJhLnBhcnNlU2hpZnRFeHByZXNzaW9uO1xuICAgICAgICAgICAgcGFyc2VTd2l0Y2hDYXNlID0gZXh0cmEucGFyc2VTd2l0Y2hDYXNlO1xuICAgICAgICAgICAgcGFyc2VVbmFyeUV4cHJlc3Npb24gPSBleHRyYS5wYXJzZVVuYXJ5RXhwcmVzc2lvbjtcbiAgICAgICAgICAgIHBhcnNlVmFyaWFibGVEZWNsYXJhdGlvbiA9IGV4dHJhLnBhcnNlVmFyaWFibGVEZWNsYXJhdGlvbjtcbiAgICAgICAgICAgIHBhcnNlVmFyaWFibGVJZGVudGlmaWVyID0gZXh0cmEucGFyc2VWYXJpYWJsZUlkZW50aWZpZXI7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodHlwZW9mIGV4dHJhLnNjYW5SZWdFeHAgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIGFkdmFuY2UgPSBleHRyYS5hZHZhbmNlO1xuICAgICAgICAgICAgc2NhblJlZ0V4cCA9IGV4dHJhLnNjYW5SZWdFeHA7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBzdHJpbmdUb0FycmF5KHN0cikge1xuICAgICAgICB2YXIgbGVuZ3RoID0gc3RyLmxlbmd0aCxcbiAgICAgICAgICAgIHJlc3VsdCA9IFtdLFxuICAgICAgICAgICAgaTtcbiAgICAgICAgZm9yIChpID0gMDsgaSA8IGxlbmd0aDsgKytpKSB7XG4gICAgICAgICAgICByZXN1bHRbaV0gPSBzdHIuY2hhckF0KGkpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcGFyc2UoY29kZSwgb3B0aW9ucykge1xuICAgICAgICB2YXIgcHJvZ3JhbSwgdG9TdHJpbmc7XG5cbiAgICAgICAgdG9TdHJpbmcgPSBTdHJpbmc7XG4gICAgICAgIGlmICh0eXBlb2YgY29kZSAhPT0gJ3N0cmluZycgJiYgIShjb2RlIGluc3RhbmNlb2YgU3RyaW5nKSkge1xuICAgICAgICAgICAgY29kZSA9IHRvU3RyaW5nKGNvZGUpO1xuICAgICAgICB9XG5cbiAgICAgICAgc291cmNlID0gY29kZTtcbiAgICAgICAgaW5kZXggPSAwO1xuICAgICAgICBsaW5lTnVtYmVyID0gKHNvdXJjZS5sZW5ndGggPiAwKSA/IDEgOiAwO1xuICAgICAgICBsaW5lU3RhcnQgPSAwO1xuICAgICAgICBsZW5ndGggPSBzb3VyY2UubGVuZ3RoO1xuICAgICAgICBidWZmZXIgPSBudWxsO1xuICAgICAgICBzdGF0ZSA9IHtcbiAgICAgICAgICAgIGFsbG93SW46IHRydWUsXG4gICAgICAgICAgICBsYWJlbFNldDoge30sXG4gICAgICAgICAgICBpbkZ1bmN0aW9uQm9keTogZmFsc2UsXG4gICAgICAgICAgICBpbkl0ZXJhdGlvbjogZmFsc2UsXG4gICAgICAgICAgICBpblN3aXRjaDogZmFsc2VcbiAgICAgICAgfTtcblxuICAgICAgICBleHRyYSA9IHt9O1xuICAgICAgICBpZiAodHlwZW9mIG9wdGlvbnMgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICBleHRyYS5yYW5nZSA9ICh0eXBlb2Ygb3B0aW9ucy5yYW5nZSA9PT0gJ2Jvb2xlYW4nKSAmJiBvcHRpb25zLnJhbmdlO1xuICAgICAgICAgICAgZXh0cmEubG9jID0gKHR5cGVvZiBvcHRpb25zLmxvYyA9PT0gJ2Jvb2xlYW4nKSAmJiBvcHRpb25zLmxvYztcbiAgICAgICAgICAgIGV4dHJhLnJhdyA9ICh0eXBlb2Ygb3B0aW9ucy5yYXcgPT09ICdib29sZWFuJykgJiYgb3B0aW9ucy5yYXc7XG4gICAgICAgICAgICBpZiAodHlwZW9mIG9wdGlvbnMudG9rZW5zID09PSAnYm9vbGVhbicgJiYgb3B0aW9ucy50b2tlbnMpIHtcbiAgICAgICAgICAgICAgICBleHRyYS50b2tlbnMgPSBbXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh0eXBlb2Ygb3B0aW9ucy5jb21tZW50ID09PSAnYm9vbGVhbicgJiYgb3B0aW9ucy5jb21tZW50KSB7XG4gICAgICAgICAgICAgICAgZXh0cmEuY29tbWVudHMgPSBbXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh0eXBlb2Ygb3B0aW9ucy50b2xlcmFudCA9PT0gJ2Jvb2xlYW4nICYmIG9wdGlvbnMudG9sZXJhbnQpIHtcbiAgICAgICAgICAgICAgICBleHRyYS5lcnJvcnMgPSBbXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChsZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBpZiAodHlwZW9mIHNvdXJjZVswXSA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgICAvLyBUcnkgZmlyc3QgdG8gY29udmVydCB0byBhIHN0cmluZy4gVGhpcyBpcyBnb29kIGFzIGZhc3QgcGF0aFxuICAgICAgICAgICAgICAgIC8vIGZvciBvbGQgSUUgd2hpY2ggdW5kZXJzdGFuZHMgc3RyaW5nIGluZGV4aW5nIGZvciBzdHJpbmdcbiAgICAgICAgICAgICAgICAvLyBsaXRlcmFscyBvbmx5IGFuZCBub3QgZm9yIHN0cmluZyBvYmplY3QuXG4gICAgICAgICAgICAgICAgaWYgKGNvZGUgaW5zdGFuY2VvZiBTdHJpbmcpIHtcbiAgICAgICAgICAgICAgICAgICAgc291cmNlID0gY29kZS52YWx1ZU9mKCk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy8gRm9yY2UgYWNjZXNzaW5nIHRoZSBjaGFyYWN0ZXJzIHZpYSBhbiBhcnJheS5cbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIHNvdXJjZVswXSA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgICAgICAgc291cmNlID0gc3RyaW5nVG9BcnJheShjb2RlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBwYXRjaCgpO1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgcHJvZ3JhbSA9IHBhcnNlUHJvZ3JhbSgpO1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBleHRyYS5jb21tZW50cyAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgICBmaWx0ZXJDb21tZW50TG9jYXRpb24oKTtcbiAgICAgICAgICAgICAgICBwcm9ncmFtLmNvbW1lbnRzID0gZXh0cmEuY29tbWVudHM7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodHlwZW9mIGV4dHJhLnRva2VucyAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgICBmaWx0ZXJUb2tlbkxvY2F0aW9uKCk7XG4gICAgICAgICAgICAgICAgcHJvZ3JhbS50b2tlbnMgPSBleHRyYS50b2tlbnM7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodHlwZW9mIGV4dHJhLmVycm9ycyAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgICBwcm9ncmFtLmVycm9ycyA9IGV4dHJhLmVycm9ycztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChleHRyYS5yYW5nZSB8fCBleHRyYS5sb2MpIHtcbiAgICAgICAgICAgICAgICBwcm9ncmFtLmJvZHkgPSBmaWx0ZXJHcm91cChwcm9ncmFtLmJvZHkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICB0aHJvdyBlO1xuICAgICAgICB9IGZpbmFsbHkge1xuICAgICAgICAgICAgdW5wYXRjaCgpO1xuICAgICAgICAgICAgZXh0cmEgPSB7fTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBwcm9ncmFtO1xuICAgIH1cblxuICAgIC8vIFN5bmMgd2l0aCBwYWNrYWdlLmpzb24uXG4gICAgZXhwb3J0cy52ZXJzaW9uID0gJzEuMC4zJztcblxuICAgIGV4cG9ydHMucGFyc2UgPSBwYXJzZTtcblxuICAgIC8vIERlZXAgY29weS5cbiAgICBleHBvcnRzLlN5bnRheCA9IChmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBuYW1lLCB0eXBlcyA9IHt9O1xuXG4gICAgICAgIGlmICh0eXBlb2YgT2JqZWN0LmNyZWF0ZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgdHlwZXMgPSBPYmplY3QuY3JlYXRlKG51bGwpO1xuICAgICAgICB9XG5cbiAgICAgICAgZm9yIChuYW1lIGluIFN5bnRheCkge1xuICAgICAgICAgICAgaWYgKFN5bnRheC5oYXNPd25Qcm9wZXJ0eShuYW1lKSkge1xuICAgICAgICAgICAgICAgIHR5cGVzW25hbWVdID0gU3ludGF4W25hbWVdO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHR5cGVvZiBPYmplY3QuZnJlZXplID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICBPYmplY3QuZnJlZXplKHR5cGVzKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB0eXBlcztcbiAgICB9KCkpO1xuXG59KSk7XG4vKiB2aW06IHNldCBzdz00IHRzPTQgZXQgdHc9ODAgOiAqL1xuIiwiLypcbiAgQ29weXJpZ2h0IChDKSAyMDEyIFl1c3VrZSBTdXp1a2kgPHV0YXRhbmUudGVhQGdtYWlsLmNvbT5cbiAgQ29weXJpZ2h0IChDKSAyMDEyIEFyaXlhIEhpZGF5YXQgPGFyaXlhLmhpZGF5YXRAZ21haWwuY29tPlxuXG4gIFJlZGlzdHJpYnV0aW9uIGFuZCB1c2UgaW4gc291cmNlIGFuZCBiaW5hcnkgZm9ybXMsIHdpdGggb3Igd2l0aG91dFxuICBtb2RpZmljYXRpb24sIGFyZSBwZXJtaXR0ZWQgcHJvdmlkZWQgdGhhdCB0aGUgZm9sbG93aW5nIGNvbmRpdGlvbnMgYXJlIG1ldDpcblxuICAgICogUmVkaXN0cmlidXRpb25zIG9mIHNvdXJjZSBjb2RlIG11c3QgcmV0YWluIHRoZSBhYm92ZSBjb3B5cmlnaHRcbiAgICAgIG5vdGljZSwgdGhpcyBsaXN0IG9mIGNvbmRpdGlvbnMgYW5kIHRoZSBmb2xsb3dpbmcgZGlzY2xhaW1lci5cbiAgICAqIFJlZGlzdHJpYnV0aW9ucyBpbiBiaW5hcnkgZm9ybSBtdXN0IHJlcHJvZHVjZSB0aGUgYWJvdmUgY29weXJpZ2h0XG4gICAgICBub3RpY2UsIHRoaXMgbGlzdCBvZiBjb25kaXRpb25zIGFuZCB0aGUgZm9sbG93aW5nIGRpc2NsYWltZXIgaW4gdGhlXG4gICAgICBkb2N1bWVudGF0aW9uIGFuZC9vciBvdGhlciBtYXRlcmlhbHMgcHJvdmlkZWQgd2l0aCB0aGUgZGlzdHJpYnV0aW9uLlxuXG4gIFRISVMgU09GVFdBUkUgSVMgUFJPVklERUQgQlkgVEhFIENPUFlSSUdIVCBIT0xERVJTIEFORCBDT05UUklCVVRPUlMgXCJBUyBJU1wiXG4gIEFORCBBTlkgRVhQUkVTUyBPUiBJTVBMSUVEIFdBUlJBTlRJRVMsIElOQ0xVRElORywgQlVUIE5PVCBMSU1JVEVEIFRPLCBUSEVcbiAgSU1QTElFRCBXQVJSQU5USUVTIE9GIE1FUkNIQU5UQUJJTElUWSBBTkQgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0VcbiAgQVJFIERJU0NMQUlNRUQuIElOIE5PIEVWRU5UIFNIQUxMIDxDT1BZUklHSFQgSE9MREVSPiBCRSBMSUFCTEUgRk9SIEFOWVxuICBESVJFQ1QsIElORElSRUNULCBJTkNJREVOVEFMLCBTUEVDSUFMLCBFWEVNUExBUlksIE9SIENPTlNFUVVFTlRJQUwgREFNQUdFU1xuICAoSU5DTFVESU5HLCBCVVQgTk9UIExJTUlURUQgVE8sIFBST0NVUkVNRU5UIE9GIFNVQlNUSVRVVEUgR09PRFMgT1IgU0VSVklDRVM7XG4gIExPU1MgT0YgVVNFLCBEQVRBLCBPUiBQUk9GSVRTOyBPUiBCVVNJTkVTUyBJTlRFUlJVUFRJT04pIEhPV0VWRVIgQ0FVU0VEIEFORFxuICBPTiBBTlkgVEhFT1JZIE9GIExJQUJJTElUWSwgV0hFVEhFUiBJTiBDT05UUkFDVCwgU1RSSUNUIExJQUJJTElUWSwgT1IgVE9SVFxuICAoSU5DTFVESU5HIE5FR0xJR0VOQ0UgT1IgT1RIRVJXSVNFKSBBUklTSU5HIElOIEFOWSBXQVkgT1VUIE9GIFRIRSBVU0UgT0ZcbiAgVEhJUyBTT0ZUV0FSRSwgRVZFTiBJRiBBRFZJU0VEIE9GIFRIRSBQT1NTSUJJTElUWSBPRiBTVUNIIERBTUFHRS5cbiovXG5cbi8qanNsaW50IGJpdHdpc2U6dHJ1ZSAqL1xuLypnbG9iYWwgZXhwb3J0czp0cnVlLCBkZWZpbmU6dHJ1ZSwgd2luZG93OnRydWUgKi9cbihmdW5jdGlvbiAoZmFjdG9yeSkge1xuICAgICd1c2Ugc3RyaWN0JztcblxuICAgIC8vIFVuaXZlcnNhbCBNb2R1bGUgRGVmaW5pdGlvbiAoVU1EKSB0byBzdXBwb3J0IEFNRCwgQ29tbW9uSlMvTm9kZS5qcyxcbiAgICAvLyBhbmQgcGxhaW4gYnJvd3NlciBsb2FkaW5nLFxuICAgIGlmICh0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQpIHtcbiAgICAgICAgZGVmaW5lKFsnZXhwb3J0cyddLCBmYWN0b3J5KTtcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiBleHBvcnRzICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICBmYWN0b3J5KGV4cG9ydHMpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGZhY3RvcnkoKHdpbmRvdy5lc3RyYXZlcnNlID0ge30pKTtcbiAgICB9XG59KGZ1bmN0aW9uIChleHBvcnRzKSB7XG4gICAgJ3VzZSBzdHJpY3QnO1xuXG4gICAgdmFyIFN5bnRheCxcbiAgICAgICAgaXNBcnJheSxcbiAgICAgICAgVmlzaXRvck9wdGlvbixcbiAgICAgICAgVmlzaXRvcktleXMsXG4gICAgICAgIHdyYXBwZXJzO1xuXG4gICAgU3ludGF4ID0ge1xuICAgICAgICBBc3NpZ25tZW50RXhwcmVzc2lvbjogJ0Fzc2lnbm1lbnRFeHByZXNzaW9uJyxcbiAgICAgICAgQXJyYXlFeHByZXNzaW9uOiAnQXJyYXlFeHByZXNzaW9uJyxcbiAgICAgICAgQmxvY2tTdGF0ZW1lbnQ6ICdCbG9ja1N0YXRlbWVudCcsXG4gICAgICAgIEJpbmFyeUV4cHJlc3Npb246ICdCaW5hcnlFeHByZXNzaW9uJyxcbiAgICAgICAgQnJlYWtTdGF0ZW1lbnQ6ICdCcmVha1N0YXRlbWVudCcsXG4gICAgICAgIENhbGxFeHByZXNzaW9uOiAnQ2FsbEV4cHJlc3Npb24nLFxuICAgICAgICBDYXRjaENsYXVzZTogJ0NhdGNoQ2xhdXNlJyxcbiAgICAgICAgQ29uZGl0aW9uYWxFeHByZXNzaW9uOiAnQ29uZGl0aW9uYWxFeHByZXNzaW9uJyxcbiAgICAgICAgQ29udGludWVTdGF0ZW1lbnQ6ICdDb250aW51ZVN0YXRlbWVudCcsXG4gICAgICAgIERlYnVnZ2VyU3RhdGVtZW50OiAnRGVidWdnZXJTdGF0ZW1lbnQnLFxuICAgICAgICBEaXJlY3RpdmVTdGF0ZW1lbnQ6ICdEaXJlY3RpdmVTdGF0ZW1lbnQnLFxuICAgICAgICBEb1doaWxlU3RhdGVtZW50OiAnRG9XaGlsZVN0YXRlbWVudCcsXG4gICAgICAgIEVtcHR5U3RhdGVtZW50OiAnRW1wdHlTdGF0ZW1lbnQnLFxuICAgICAgICBFeHByZXNzaW9uU3RhdGVtZW50OiAnRXhwcmVzc2lvblN0YXRlbWVudCcsXG4gICAgICAgIEZvclN0YXRlbWVudDogJ0ZvclN0YXRlbWVudCcsXG4gICAgICAgIEZvckluU3RhdGVtZW50OiAnRm9ySW5TdGF0ZW1lbnQnLFxuICAgICAgICBGdW5jdGlvbkRlY2xhcmF0aW9uOiAnRnVuY3Rpb25EZWNsYXJhdGlvbicsXG4gICAgICAgIEZ1bmN0aW9uRXhwcmVzc2lvbjogJ0Z1bmN0aW9uRXhwcmVzc2lvbicsXG4gICAgICAgIElkZW50aWZpZXI6ICdJZGVudGlmaWVyJyxcbiAgICAgICAgSWZTdGF0ZW1lbnQ6ICdJZlN0YXRlbWVudCcsXG4gICAgICAgIExpdGVyYWw6ICdMaXRlcmFsJyxcbiAgICAgICAgTGFiZWxlZFN0YXRlbWVudDogJ0xhYmVsZWRTdGF0ZW1lbnQnLFxuICAgICAgICBMb2dpY2FsRXhwcmVzc2lvbjogJ0xvZ2ljYWxFeHByZXNzaW9uJyxcbiAgICAgICAgTWVtYmVyRXhwcmVzc2lvbjogJ01lbWJlckV4cHJlc3Npb24nLFxuICAgICAgICBOZXdFeHByZXNzaW9uOiAnTmV3RXhwcmVzc2lvbicsXG4gICAgICAgIE9iamVjdEV4cHJlc3Npb246ICdPYmplY3RFeHByZXNzaW9uJyxcbiAgICAgICAgUHJvZ3JhbTogJ1Byb2dyYW0nLFxuICAgICAgICBQcm9wZXJ0eTogJ1Byb3BlcnR5JyxcbiAgICAgICAgUmV0dXJuU3RhdGVtZW50OiAnUmV0dXJuU3RhdGVtZW50JyxcbiAgICAgICAgU2VxdWVuY2VFeHByZXNzaW9uOiAnU2VxdWVuY2VFeHByZXNzaW9uJyxcbiAgICAgICAgU3dpdGNoU3RhdGVtZW50OiAnU3dpdGNoU3RhdGVtZW50JyxcbiAgICAgICAgU3dpdGNoQ2FzZTogJ1N3aXRjaENhc2UnLFxuICAgICAgICBUaGlzRXhwcmVzc2lvbjogJ1RoaXNFeHByZXNzaW9uJyxcbiAgICAgICAgVGhyb3dTdGF0ZW1lbnQ6ICdUaHJvd1N0YXRlbWVudCcsXG4gICAgICAgIFRyeVN0YXRlbWVudDogJ1RyeVN0YXRlbWVudCcsXG4gICAgICAgIFVuYXJ5RXhwcmVzc2lvbjogJ1VuYXJ5RXhwcmVzc2lvbicsXG4gICAgICAgIFVwZGF0ZUV4cHJlc3Npb246ICdVcGRhdGVFeHByZXNzaW9uJyxcbiAgICAgICAgVmFyaWFibGVEZWNsYXJhdGlvbjogJ1ZhcmlhYmxlRGVjbGFyYXRpb24nLFxuICAgICAgICBWYXJpYWJsZURlY2xhcmF0b3I6ICdWYXJpYWJsZURlY2xhcmF0b3InLFxuICAgICAgICBXaGlsZVN0YXRlbWVudDogJ1doaWxlU3RhdGVtZW50JyxcbiAgICAgICAgV2l0aFN0YXRlbWVudDogJ1dpdGhTdGF0ZW1lbnQnXG4gICAgfTtcblxuICAgIGlzQXJyYXkgPSBBcnJheS5pc0FycmF5O1xuICAgIGlmICghaXNBcnJheSkge1xuICAgICAgICBpc0FycmF5ID0gZnVuY3Rpb24gaXNBcnJheShhcnJheSkge1xuICAgICAgICAgICAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChhcnJheSkgPT09ICdbb2JqZWN0IEFycmF5XSc7XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgVmlzaXRvcktleXMgPSB7XG4gICAgICAgIEFzc2lnbm1lbnRFeHByZXNzaW9uOiBbJ2xlZnQnLCAncmlnaHQnXSxcbiAgICAgICAgQXJyYXlFeHByZXNzaW9uOiBbJ2VsZW1lbnRzJ10sXG4gICAgICAgIEJsb2NrU3RhdGVtZW50OiBbJ2JvZHknXSxcbiAgICAgICAgQmluYXJ5RXhwcmVzc2lvbjogWydsZWZ0JywgJ3JpZ2h0J10sXG4gICAgICAgIEJyZWFrU3RhdGVtZW50OiBbJ2xhYmVsJ10sXG4gICAgICAgIENhbGxFeHByZXNzaW9uOiBbJ2NhbGxlZScsICdhcmd1bWVudHMnXSxcbiAgICAgICAgQ2F0Y2hDbGF1c2U6IFsncGFyYW0nLCAnYm9keSddLFxuICAgICAgICBDb25kaXRpb25hbEV4cHJlc3Npb246IFsndGVzdCcsICdjb25zZXF1ZW50JywgJ2FsdGVybmF0ZSddLFxuICAgICAgICBDb250aW51ZVN0YXRlbWVudDogWydsYWJlbCddLFxuICAgICAgICBEZWJ1Z2dlclN0YXRlbWVudDogW10sXG4gICAgICAgIERpcmVjdGl2ZVN0YXRlbWVudDogW10sXG4gICAgICAgIERvV2hpbGVTdGF0ZW1lbnQ6IFsnYm9keScsICd0ZXN0J10sXG4gICAgICAgIEVtcHR5U3RhdGVtZW50OiBbXSxcbiAgICAgICAgRXhwcmVzc2lvblN0YXRlbWVudDogWydleHByZXNzaW9uJ10sXG4gICAgICAgIEZvclN0YXRlbWVudDogWydpbml0JywgJ3Rlc3QnLCAndXBkYXRlJywgJ2JvZHknXSxcbiAgICAgICAgRm9ySW5TdGF0ZW1lbnQ6IFsnbGVmdCcsICdyaWdodCcsICdib2R5J10sXG4gICAgICAgIEZ1bmN0aW9uRGVjbGFyYXRpb246IFsnaWQnLCAncGFyYW1zJywgJ2JvZHknXSxcbiAgICAgICAgRnVuY3Rpb25FeHByZXNzaW9uOiBbJ2lkJywgJ3BhcmFtcycsICdib2R5J10sXG4gICAgICAgIElkZW50aWZpZXI6IFtdLFxuICAgICAgICBJZlN0YXRlbWVudDogWyd0ZXN0JywgJ2NvbnNlcXVlbnQnLCAnYWx0ZXJuYXRlJ10sXG4gICAgICAgIExpdGVyYWw6IFtdLFxuICAgICAgICBMYWJlbGVkU3RhdGVtZW50OiBbJ2xhYmVsJywgJ2JvZHknXSxcbiAgICAgICAgTG9naWNhbEV4cHJlc3Npb246IFsnbGVmdCcsICdyaWdodCddLFxuICAgICAgICBNZW1iZXJFeHByZXNzaW9uOiBbJ29iamVjdCcsICdwcm9wZXJ0eSddLFxuICAgICAgICBOZXdFeHByZXNzaW9uOiBbJ2NhbGxlZScsICdhcmd1bWVudHMnXSxcbiAgICAgICAgT2JqZWN0RXhwcmVzc2lvbjogWydwcm9wZXJ0aWVzJ10sXG4gICAgICAgIFByb2dyYW06IFsnYm9keSddLFxuICAgICAgICBQcm9wZXJ0eTogWydrZXknLCAndmFsdWUnXSxcbiAgICAgICAgUmV0dXJuU3RhdGVtZW50OiBbJ2FyZ3VtZW50J10sXG4gICAgICAgIFNlcXVlbmNlRXhwcmVzc2lvbjogWydleHByZXNzaW9ucyddLFxuICAgICAgICBTd2l0Y2hTdGF0ZW1lbnQ6IFsnZGlzY3JpbWluYW50JywgJ2Nhc2VzJ10sXG4gICAgICAgIFN3aXRjaENhc2U6IFsndGVzdCcsICdjb25zZXF1ZW50J10sXG4gICAgICAgIFRoaXNFeHByZXNzaW9uOiBbXSxcbiAgICAgICAgVGhyb3dTdGF0ZW1lbnQ6IFsnYXJndW1lbnQnXSxcbiAgICAgICAgVHJ5U3RhdGVtZW50OiBbJ2Jsb2NrJywgJ2hhbmRsZXJzJywgJ2ZpbmFsaXplciddLFxuICAgICAgICBVbmFyeUV4cHJlc3Npb246IFsnYXJndW1lbnQnXSxcbiAgICAgICAgVXBkYXRlRXhwcmVzc2lvbjogWydhcmd1bWVudCddLFxuICAgICAgICBWYXJpYWJsZURlY2xhcmF0aW9uOiBbJ2RlY2xhcmF0aW9ucyddLFxuICAgICAgICBWYXJpYWJsZURlY2xhcmF0b3I6IFsnaWQnLCAnaW5pdCddLFxuICAgICAgICBXaGlsZVN0YXRlbWVudDogWyd0ZXN0JywgJ2JvZHknXSxcbiAgICAgICAgV2l0aFN0YXRlbWVudDogWydvYmplY3QnLCAnYm9keSddXG4gICAgfTtcblxuICAgIFZpc2l0b3JPcHRpb24gPSB7XG4gICAgICAgIEJyZWFrOiAxLFxuICAgICAgICBTa2lwOiAyXG4gICAgfTtcblxuICAgIHdyYXBwZXJzID0ge1xuICAgICAgICBQcm9wZXJ0eVdyYXBwZXI6ICdQcm9wZXJ0eSdcbiAgICB9O1xuXG4gICAgZnVuY3Rpb24gdHJhdmVyc2UodG9wLCB2aXNpdG9yKSB7XG4gICAgICAgIHZhciB3b3JrbGlzdCwgbGVhdmVsaXN0LCBub2RlLCBub2RlVHlwZSwgcmV0LCBjdXJyZW50LCBjdXJyZW50MiwgY2FuZGlkYXRlcywgY2FuZGlkYXRlLCBtYXJrZXIgPSB7fTtcblxuICAgICAgICB3b3JrbGlzdCA9IFsgdG9wIF07XG4gICAgICAgIGxlYXZlbGlzdCA9IFsgbnVsbCBdO1xuXG4gICAgICAgIHdoaWxlICh3b3JrbGlzdC5sZW5ndGgpIHtcbiAgICAgICAgICAgIG5vZGUgPSB3b3JrbGlzdC5wb3AoKTtcbiAgICAgICAgICAgIG5vZGVUeXBlID0gbm9kZS50eXBlO1xuXG4gICAgICAgICAgICBpZiAobm9kZSA9PT0gbWFya2VyKSB7XG4gICAgICAgICAgICAgICAgbm9kZSA9IGxlYXZlbGlzdC5wb3AoKTtcbiAgICAgICAgICAgICAgICBpZiAodmlzaXRvci5sZWF2ZSkge1xuICAgICAgICAgICAgICAgICAgICByZXQgPSB2aXNpdG9yLmxlYXZlKG5vZGUsIGxlYXZlbGlzdFtsZWF2ZWxpc3QubGVuZ3RoIC0gMV0pO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHJldCA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKHJldCA9PT0gVmlzaXRvck9wdGlvbi5CcmVhaykge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIGlmIChub2RlKSB7XG4gICAgICAgICAgICAgICAgaWYgKHdyYXBwZXJzLmhhc093blByb3BlcnR5KG5vZGVUeXBlKSkge1xuICAgICAgICAgICAgICAgICAgICBub2RlID0gbm9kZS5ub2RlO1xuICAgICAgICAgICAgICAgICAgICBub2RlVHlwZSA9IHdyYXBwZXJzW25vZGVUeXBlXTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBpZiAodmlzaXRvci5lbnRlcikge1xuICAgICAgICAgICAgICAgICAgICByZXQgPSB2aXNpdG9yLmVudGVyKG5vZGUsIGxlYXZlbGlzdFtsZWF2ZWxpc3QubGVuZ3RoIC0gMV0pO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHJldCA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBpZiAocmV0ID09PSBWaXNpdG9yT3B0aW9uLkJyZWFrKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICB3b3JrbGlzdC5wdXNoKG1hcmtlcik7XG4gICAgICAgICAgICAgICAgbGVhdmVsaXN0LnB1c2gobm9kZSk7XG5cbiAgICAgICAgICAgICAgICBpZiAocmV0ICE9PSBWaXNpdG9yT3B0aW9uLlNraXApIHtcbiAgICAgICAgICAgICAgICAgICAgY2FuZGlkYXRlcyA9IFZpc2l0b3JLZXlzW25vZGVUeXBlXTtcbiAgICAgICAgICAgICAgICAgICAgY3VycmVudCA9IGNhbmRpZGF0ZXMubGVuZ3RoO1xuICAgICAgICAgICAgICAgICAgICB3aGlsZSAoKGN1cnJlbnQgLT0gMSkgPj0gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY2FuZGlkYXRlID0gbm9kZVtjYW5kaWRhdGVzW2N1cnJlbnRdXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjYW5kaWRhdGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoaXNBcnJheShjYW5kaWRhdGUpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGN1cnJlbnQyID0gY2FuZGlkYXRlLmxlbmd0aDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgd2hpbGUgKChjdXJyZW50MiAtPSAxKSA+PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoY2FuZGlkYXRlW2N1cnJlbnQyXSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmKG5vZGVUeXBlID09PSBTeW50YXguT2JqZWN0RXhwcmVzc2lvbiAmJiAncHJvcGVydGllcycgPT09IGNhbmRpZGF0ZXNbY3VycmVudF0gJiYgbnVsbCA9PSBjYW5kaWRhdGVzW2N1cnJlbnRdLnR5cGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgd29ya2xpc3QucHVzaCh7dHlwZTogJ1Byb3BlcnR5V3JhcHBlcicsIG5vZGU6IGNhbmRpZGF0ZVtjdXJyZW50Ml19KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB3b3JrbGlzdC5wdXNoKGNhbmRpZGF0ZVtjdXJyZW50Ml0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdvcmtsaXN0LnB1c2goY2FuZGlkYXRlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiByZXBsYWNlKHRvcCwgdmlzaXRvcikge1xuICAgICAgICB2YXIgd29ya2xpc3QsIGxlYXZlbGlzdCwgbm9kZSwgbm9kZVR5cGUsIHRhcmdldCwgdHVwbGUsIHJldCwgY3VycmVudCwgY3VycmVudDIsIGNhbmRpZGF0ZXMsIGNhbmRpZGF0ZSwgbWFya2VyID0ge30sIHJlc3VsdDtcblxuICAgICAgICByZXN1bHQgPSB7XG4gICAgICAgICAgICB0b3A6IHRvcFxuICAgICAgICB9O1xuXG4gICAgICAgIHR1cGxlID0gWyB0b3AsIHJlc3VsdCwgJ3RvcCcgXTtcbiAgICAgICAgd29ya2xpc3QgPSBbIHR1cGxlIF07XG4gICAgICAgIGxlYXZlbGlzdCA9IFsgdHVwbGUgXTtcblxuICAgICAgICBmdW5jdGlvbiBub3RpZnkodikge1xuICAgICAgICAgICAgcmV0ID0gdjtcbiAgICAgICAgfVxuXG4gICAgICAgIHdoaWxlICh3b3JrbGlzdC5sZW5ndGgpIHtcbiAgICAgICAgICAgIHR1cGxlID0gd29ya2xpc3QucG9wKCk7XG5cbiAgICAgICAgICAgIGlmICh0dXBsZSA9PT0gbWFya2VyKSB7XG4gICAgICAgICAgICAgICAgdHVwbGUgPSBsZWF2ZWxpc3QucG9wKCk7XG4gICAgICAgICAgICAgICAgcmV0ID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgICAgIGlmICh2aXNpdG9yLmxlYXZlKSB7XG4gICAgICAgICAgICAgICAgICAgIG5vZGUgPSB0dXBsZVswXTtcbiAgICAgICAgICAgICAgICAgICAgdGFyZ2V0ID0gdmlzaXRvci5sZWF2ZSh0dXBsZVswXSwgbGVhdmVsaXN0W2xlYXZlbGlzdC5sZW5ndGggLSAxXVswXSwgbm90aWZ5KTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRhcmdldCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBub2RlID0gdGFyZ2V0O1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHR1cGxlWzFdW3R1cGxlWzJdXSA9IG5vZGU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChyZXQgPT09IFZpc2l0b3JPcHRpb24uQnJlYWspIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJlc3VsdC50b3A7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIGlmICh0dXBsZVswXSkge1xuICAgICAgICAgICAgICAgIHJldCA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgICAgICBub2RlID0gdHVwbGVbMF07XG5cbiAgICAgICAgICAgICAgICBub2RlVHlwZSA9IG5vZGUudHlwZTtcbiAgICAgICAgICAgICAgICBpZiAod3JhcHBlcnMuaGFzT3duUHJvcGVydHkobm9kZVR5cGUpKSB7XG4gICAgICAgICAgICAgICAgICAgIHR1cGxlWzBdID0gbm9kZSA9IG5vZGUubm9kZTtcbiAgICAgICAgICAgICAgICAgICAgbm9kZVR5cGUgPSB3cmFwcGVyc1tub2RlVHlwZV07XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaWYgKHZpc2l0b3IuZW50ZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgdGFyZ2V0ID0gdmlzaXRvci5lbnRlcih0dXBsZVswXSwgbGVhdmVsaXN0W2xlYXZlbGlzdC5sZW5ndGggLSAxXVswXSwgbm90aWZ5KTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRhcmdldCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBub2RlID0gdGFyZ2V0O1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHR1cGxlWzFdW3R1cGxlWzJdXSA9IG5vZGU7XG4gICAgICAgICAgICAgICAgICAgIHR1cGxlWzBdID0gbm9kZTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBpZiAocmV0ID09PSBWaXNpdG9yT3B0aW9uLkJyZWFrKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiByZXN1bHQudG9wO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGlmICh0dXBsZVswXSkge1xuICAgICAgICAgICAgICAgICAgICB3b3JrbGlzdC5wdXNoKG1hcmtlcik7XG4gICAgICAgICAgICAgICAgICAgIGxlYXZlbGlzdC5wdXNoKHR1cGxlKTtcblxuICAgICAgICAgICAgICAgICAgICBpZiAocmV0ICE9PSBWaXNpdG9yT3B0aW9uLlNraXApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhbmRpZGF0ZXMgPSBWaXNpdG9yS2V5c1tub2RlVHlwZV07XG4gICAgICAgICAgICAgICAgICAgICAgICBjdXJyZW50ID0gY2FuZGlkYXRlcy5sZW5ndGg7XG4gICAgICAgICAgICAgICAgICAgICAgICB3aGlsZSAoKGN1cnJlbnQgLT0gMSkgPj0gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhbmRpZGF0ZSA9IG5vZGVbY2FuZGlkYXRlc1tjdXJyZW50XV07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGNhbmRpZGF0ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoaXNBcnJheShjYW5kaWRhdGUpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjdXJyZW50MiA9IGNhbmRpZGF0ZS5sZW5ndGg7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB3aGlsZSAoKGN1cnJlbnQyIC09IDEpID49IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoY2FuZGlkYXRlW2N1cnJlbnQyXSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZihub2RlVHlwZSA9PT0gU3ludGF4Lk9iamVjdEV4cHJlc3Npb24gJiYgJ3Byb3BlcnRpZXMnID09PSBjYW5kaWRhdGVzW2N1cnJlbnRdICYmIG51bGwgPT0gY2FuZGlkYXRlc1tjdXJyZW50XS50eXBlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB3b3JrbGlzdC5wdXNoKFt7dHlwZTogJ1Byb3BlcnR5V3JhcHBlcicsIG5vZGU6IGNhbmRpZGF0ZVtjdXJyZW50Ml19LCBjYW5kaWRhdGUsIGN1cnJlbnQyXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB3b3JrbGlzdC5wdXNoKFtjYW5kaWRhdGVbY3VycmVudDJdLCBjYW5kaWRhdGUsIGN1cnJlbnQyXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB3b3JrbGlzdC5wdXNoKFtjYW5kaWRhdGUsIG5vZGUsIGNhbmRpZGF0ZXNbY3VycmVudF1dKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiByZXN1bHQudG9wO1xuICAgIH1cblxuICAgIGV4cG9ydHMudmVyc2lvbiA9ICcwLjAuNCc7XG4gICAgZXhwb3J0cy5TeW50YXggPSBTeW50YXg7XG4gICAgZXhwb3J0cy50cmF2ZXJzZSA9IHRyYXZlcnNlO1xuICAgIGV4cG9ydHMucmVwbGFjZSA9IHJlcGxhY2U7XG4gICAgZXhwb3J0cy5WaXNpdG9yS2V5cyA9IFZpc2l0b3JLZXlzO1xuICAgIGV4cG9ydHMuVmlzaXRvck9wdGlvbiA9IFZpc2l0b3JPcHRpb247XG59KSk7XG4vKiB2aW06IHNldCBzdz00IHRzPTQgZXQgdHc9ODAgOiAqL1xuIiwiKGZ1bmN0aW9uIChucykge1xyXG5cclxuICAgIHZhciB3YWxrID0gcmVxdWlyZSgnZXN0cmF2ZXJzZScpLFxyXG4gICAgICAgIENvbnRleHQgPSByZXF1aXJlKFwiLi8uLi9iYXNlL2NvbnRleHQuanNcIikuZ2V0Q29udGV4dChudWxsKSxcclxuICAgICAgICBTeW50YXggPSB3YWxrLlN5bnRheDtcclxuXHJcbiAgICB2YXIgZmluZFBhcmFtZXRlcnNJblByb2dyYW0gPSBmdW5jdGlvbiAocHJvZ3JhbSwgY29udGV4dE5hbWUsIHBhcmFtLCBhbmFseXplZENhbGxzKSB7XHJcbiAgICAgICAgdmFyIGNvbnRleHRTdGFjayA9IFtuZXcgQ29udGV4dChwcm9ncmFtLCBudWxsLCB7bmFtZTogXCJnbG9iYWxcIn0pXTtcclxuICAgICAgICB2YXIgZm91bmRQYXJhbXMgPSBbXTtcclxuICAgICAgICBhbmFseXplZENhbGxzID0gYW5hbHl6ZWRDYWxscyB8fCB7fTtcclxuICAgICAgICAvL2NvbnNvbGUubG9nKFwiTG9va2luZyBmb3I6IFwiLCBjb250ZXh0TmFtZSwgcGFyYW0pO1xyXG5cclxuICAgICAgICB2YXIgYWN0aXZlUGFyYW0gPSBudWxsO1xyXG4gICAgICAgIHdhbGsudHJhdmVyc2UocHJvZ3JhbSwge1xyXG4gICAgICAgICAgICBlbnRlcjogZnVuY3Rpb24gKG5vZGUpIHtcclxuICAgICAgICAgICAgICAgIHZhciB0eXBlID0gbm9kZS50eXBlLFxyXG4gICAgICAgICAgICAgICAgICAgIGNvbnRleHQ7XHJcbiAgICAgICAgICAgICAgICBzd2l0Y2ggKHR5cGUpIHtcclxuICAgICAgICAgICAgICAgICAgICBjYXNlIFN5bnRheC5GdW5jdGlvbkRlY2xhcmF0aW9uOlxyXG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgcGFyZW50Q29udGV4dCA9IGNvbnRleHRTdGFja1tjb250ZXh0U3RhY2subGVuZ3RoIC0gMV07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhcmVudENvbnRleHQuZGVjbGFyZVZhcmlhYmxlKG5vZGUuaWQubmFtZSwgZmFsc2UpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb250ZXh0ID0gbmV3IENvbnRleHQobm9kZSwgcGFyZW50Q29udGV4dCwge25hbWU6IG5vZGUuaWQubmFtZSB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29udGV4dFN0YWNrLnB1c2goY29udGV4dCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjb250ZXh0LnN0cigpID09IGNvbnRleHROYW1lKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAobm9kZS5wYXJhbXMubGVuZ3RoID4gcGFyYW0pIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhY3RpdmVQYXJhbSA9IG5vZGUucGFyYW1zW3BhcmFtXS5uYW1lO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgU3ludGF4LkNhbGxFeHByZXNzaW9uOlxyXG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgcG9zID0gbm9kZS5hcmd1bWVudHMucmVkdWNlKGZ1bmN0aW9uIChwcmV2LCBjdXJyLCBpbmRleCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGN1cnIubmFtZSA9PSBhY3RpdmVQYXJhbSlcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gaW5kZXg7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gcHJldjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSwgLTEpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAocG9zICE9IC0xKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb250ZXh0ID0gY29udGV4dFN0YWNrW2NvbnRleHRTdGFjay5sZW5ndGggLSAxXTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBpZCA9IGNvbnRleHQuZ2V0VmFyaWFibGVJZGVudGlmaWVyKG5vZGUuY2FsbGVlLm5hbWUpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFhbmFseXplZENhbGxzW2lkXSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFuYWx5emVkQ2FsbHNbaWRdID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmb3VuZFBhcmFtcyA9IGZvdW5kUGFyYW1zLmNvbmNhdChmaW5kUGFyYW1ldGVyc0luUHJvZ3JhbShwcm9ncmFtLCBpZCwgcG9zLCBhbmFseXplZENhbGxzKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcblxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBsZWF2ZTogZnVuY3Rpb24gKG5vZGUpIHtcclxuICAgICAgICAgICAgICAgIHZhciB0eXBlID0gbm9kZS50eXBlO1xyXG4gICAgICAgICAgICAgICAgc3dpdGNoICh0eXBlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBTeW50YXguRnVuY3Rpb25EZWNsYXJhdGlvbjpcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29udGV4dFN0YWNrLnBvcCgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBhY3RpdmVQYXJhbSA9IG51bGw7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgU3ludGF4Lk1lbWJlckV4cHJlc3Npb246XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChhY3RpdmVQYXJhbSAmJiBub2RlLm9iamVjdC5uYW1lID09IGFjdGl2ZVBhcmFtKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgcGFyYW1ldGVyTmFtZSA9IG5vZGUucHJvcGVydHkubmFtZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChmb3VuZFBhcmFtcy5pbmRleE9mKHBhcmFtZXRlck5hbWUpID09IC0xKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZvdW5kUGFyYW1zLnB1c2gocGFyYW1ldGVyTmFtZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgcmV0dXJuIGZvdW5kUGFyYW1zO1xyXG4gICAgfTtcclxuXHJcbiAgICAvKipcclxuICAgICAqIEBwYXJhbSB7b2JqZWN0IX0gcHJvZ3JhbVxyXG4gICAgICogQHBhcmFtIHtvYmplY3Q/fSBvcHRcclxuICAgICAqL1xyXG4gICAgbnMuZXh0cmFjdFBhcmFtZXRlcnMgPSBmdW5jdGlvbiAocHJvZ3JhbSwgb3B0KSB7XHJcbiAgICAgICAgb3B0ID0gb3B0IHx8IHt9O1xyXG4gICAgICAgIHZhciBjb250ZXh0ID0gb3B0LmNvbnRleHQgfHwgXCJnbG9iYWwuc2hhZGVcIjtcclxuICAgICAgICB2YXIgcGFyYW0gPSBvcHQucGFyYW0gfHwgMDtcclxuXHJcbiAgICAgICAgcmV0dXJuIGZpbmRQYXJhbWV0ZXJzSW5Qcm9ncmFtKHByb2dyYW0sIGNvbnRleHQsIHBhcmFtKTtcclxuICAgIH07XHJcblxyXG5cclxufShleHBvcnRzKSk7XHJcbiIsIihmdW5jdGlvbiAobnMpIHtcclxuXHJcbiAgICB2YXIgU3ludGF4ID0gcmVxdWlyZSgnZXN0cmF2ZXJzZScpLlN5bnRheCxcclxuICAgICAgICBWaXNpdG9yT3B0aW9uID0gcmVxdWlyZSgnZXN0cmF2ZXJzZScpLlZpc2l0b3JPcHRpb24sXHJcbiAgICAgICAgU2hhZGUgPSByZXF1aXJlKFwiLi4vLi4vaW50ZXJmYWNlcy5qc1wiKSxcclxuICAgICAgICBUWVBFUyA9IFNoYWRlLlRZUEVTLFxyXG4gICAgICAgIEFubm90YXRpb24gPSByZXF1aXJlKFwiLi8uLi8uLi9iYXNlL2Fubm90YXRpb24uanNcIikuQW5ub3RhdGlvbixcclxuICAgICAgICBCYXNlID0gcmVxdWlyZShcIi4vLi4vLi4vYmFzZS9pbmRleC5qc1wiKTtcclxuXHJcblxyXG4gICAgdmFyIEJpbmFyeUZ1bmN0aW9ucyA9IHtcclxuICAgICAgICBcIitcIiA6IGZ1bmN0aW9uKGEsYikgeyByZXR1cm4gYSArIGI7IH0sXHJcbiAgICAgICAgXCItXCIgOiBmdW5jdGlvbihhLGIpIHsgcmV0dXJuIGEgLSBiOyB9LFxyXG4gICAgICAgIFwiL1wiIDogZnVuY3Rpb24oYSxiKSB7IHJldHVybiBhIC8gYjsgfSxcclxuICAgICAgICBcIipcIiA6IGZ1bmN0aW9uKGEsYikgeyByZXR1cm4gYSAqIGI7IH0sXHJcbiAgICAgICAgXCIlXCIgOiBmdW5jdGlvbihhLGIpIHsgcmV0dXJuIGEgJSBiOyB9LFxyXG5cclxuICAgICAgICBcIj09XCIgOiBmdW5jdGlvbihhLGIpIHsgcmV0dXJuIGEgPT0gYjsgfSxcclxuICAgICAgICBcIiE9XCIgOiBmdW5jdGlvbihhLGIpIHsgcmV0dXJuIGEgIT0gYjsgfSxcclxuICAgICAgICBcIj09PVwiIDogZnVuY3Rpb24oYSxiKSB7IHJldHVybiBhID09PSBiOyB9LFxyXG4gICAgICAgIFwiIT09XCIgOiBmdW5jdGlvbihhLGIpIHsgcmV0dXJuIGEgIT09IGI7IH0sXHJcbiAgICAgICAgXCI8XCIgOiBmdW5jdGlvbihhLGIpIHsgcmV0dXJuIGEgPCBiOyB9LFxyXG4gICAgICAgIFwiPD1cIiA6IGZ1bmN0aW9uKGEsYikgeyByZXR1cm4gYSA8PSBiOyB9LFxyXG4gICAgICAgIFwiPlwiIDogZnVuY3Rpb24oYSxiKSB7IHJldHVybiBhID4gYjsgfSxcclxuICAgICAgICBcIj49XCIgOiBmdW5jdGlvbihhLGIpIHsgcmV0dXJuIGEgPj0gYjsgfVxyXG4gICAgICAgIH07XHJcblxyXG4gICAgdmFyIFVuYXJ5RnVuY3Rpb25zID0ge1xyXG4gICAgICAgICAgICAgICAgXCIhXCI6IGZ1bmN0aW9uKGEpIHsgcmV0dXJuICFhOyB9LFxyXG4gICAgICAgICAgICAgICAgXCItXCI6IGZ1bmN0aW9uKGEpIHsgcmV0dXJuIC1hOyB9LFxyXG4gICAgICAgICAgICAgICAgXCIrXCI6IGZ1bmN0aW9uKGEpIHsgcmV0dXJuICthOyB9LFxyXG4gICAgICAgICAgICAgICAgXCJ0eXBlb2ZcIjogZnVuY3Rpb24oYSkgeyByZXR1cm4gdHlwZW9mIGE7IH0sXHJcbiAgICAgICAgICAgICAgICBcInZvaWRcIjogZnVuY3Rpb24oYSkgeyByZXR1cm4gdm9pZCBhOyB9LFxyXG4gICAgICAgICAgICAgICAgXCJkZWxldGVcIjogZnVuY3Rpb24oYSkgeyByZXR1cm4gZGVsZXRlIGE7IH1cclxuXHJcbiAgICB9O1xyXG5cclxuXHJcbiAgICBmdW5jdGlvbiBnZXRPYmplY3RSZWZlcmVuY2VGcm9tTm9kZShvYmplY3QsIGNvbnRleHQpIHtcclxuICAgICAgICBzd2l0Y2ggKG9iamVjdC50eXBlKSB7XHJcbiAgICAgICAgICAgIGNhc2UgU3ludGF4Lk5ld0V4cHJlc3Npb246XHJcbiAgICAgICAgICAgIGNhc2UgU3ludGF4LkNhbGxFeHByZXNzaW9uOlxyXG4gICAgICAgICAgICBjYXNlIFN5bnRheC5NZW1iZXJFeHByZXNzaW9uOlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGNvbnRleHQuY3JlYXRlVHlwZUluZm8ob2JqZWN0KTtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIFN5bnRheC5JZGVudGlmaWVyOlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGNvbnRleHQuZ2V0QmluZGluZ0J5TmFtZShvYmplY3QubmFtZSk7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSBTeW50YXguVGhpc0V4cHJlc3Npb246XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gY29udGV4dC5nZXRCaW5kaW5nQnlOYW1lKFwidGhpc1wiKTtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBkZWZhdWx0OlxyXG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiVW5oYW5kbGVkIG9iamVjdCB0eXBlIGluIFR5cGVJbmZlcmVuY2U6IFwiICsgb2JqZWN0LnR5cGUpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICB2YXIgZXZhbHVhdGVUcnV0aCA9IGZ1bmN0aW9uKGV4cCkge1xyXG4gICAgICAgIHJldHVybiAhIWV4cDtcclxuICAgIH1cclxuXHJcbiAgICB2YXIgbG9nID0gZnVuY3Rpb24oc3RyKSB7fTtcclxuICAgIC8vdmFyIGxvZyA9IGZ1bmN0aW9uKCkgeyBjb25zb2xlLmxvZy5hcHBseShjb25zb2xlLCBhcmd1bWVudHMpOyB9O1xyXG5cclxuXHJcbiAgICB2YXIgZW50ZXJIYW5kbGVycyA9IHtcclxuICAgICAgICAvLyBPbiBlbnRlclxyXG4gICAgICAgIENvbmRpdGlvbmFsRXhwcmVzc2lvbjogZnVuY3Rpb24gKG5vZGUsIHBhcmVudCwgY3R4LCByb290KSB7XHJcbiAgICAgICAgICAgIHZhciByZXN1bHQgPSBuZXcgQW5ub3RhdGlvbihub2RlKTtcclxuXHJcbiAgICAgICAgICAgIHJvb3QudHJhdmVyc2Uobm9kZS50ZXN0KTtcclxuICAgICAgICAgICAgdmFyIHRlc3QgPSBjdHguY3JlYXRlVHlwZUluZm8obm9kZS50ZXN0KTtcclxuXHJcbiAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKG5vZGUudGVzdCwgbm9kZS5jb25zZXF1ZW50LCBub2RlLmFsdGVybmF0ZSk7XHJcbiAgICAgICAgICAgIGlmICh0ZXN0Lmhhc1N0YXRpY1ZhbHVlKCkpIHtcclxuICAgICAgICAgICAgICAgIHZhciB0ZXN0UmVzdWx0ID0gZXZhbHVhdGVUcnV0aCh0ZXN0LmdldFN0YXRpY1ZhbHVlKCkpO1xyXG4gICAgICAgICAgICAgICAgaWYgKHRlc3RSZXN1bHQgPT09IHRydWUpIHtcclxuICAgICAgICAgICAgICAgICAgICByb290LnRyYXZlcnNlKG5vZGUuY29uc2VxdWVudCk7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc2VxdWVudCA9IGN0eC5jcmVhdGVUeXBlSW5mbyhub2RlLmNvbnNlcXVlbnQpO1xyXG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdC5jb3B5KGNvbnNlcXVlbnQpO1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciBhbHRlcm5hdGUgPSBuZXcgQW5ub3RhdGlvbihub2RlLmFsdGVybmF0ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgYWx0ZXJuYXRlLmVsaW1pbmF0ZSgpO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICByb290LnRyYXZlcnNlKG5vZGUuYWx0ZXJuYXRlKTtcclxuICAgICAgICAgICAgICAgICAgICB2YXIgYWx0ZXJuYXRlID0gY3R4LmNyZWF0ZVR5cGVJbmZvKG5vZGUuYWx0ZXJuYXRlKTtcclxuICAgICAgICAgICAgICAgICAgICByZXN1bHQuY29weShhbHRlcm5hdGUpO1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciBjb25zZXF1ZW50ID0gbmV3IEFubm90YXRpb24obm9kZS5jb25zZXF1ZW50KTtcclxuICAgICAgICAgICAgICAgICAgICBjb25zZXF1ZW50LmVsaW1pbmF0ZSgpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgLy8gV2UgY2FuJ3QgZGVjaWRlLCB0aHVzIHRyYXZlcnNlIGJvdGg7XHJcbiAgICAgICAgICAgICAgICByb290LnRyYXZlcnNlKG5vZGUuY29uc2VxdWVudCk7XHJcbiAgICAgICAgICAgICAgICByb290LnRyYXZlcnNlKG5vZGUuYWx0ZXJuYXRlKTtcclxuICAgICAgICAgICAgICAgIHZhciBjb25zZXF1ZW50ID0gY3R4LmNyZWF0ZVR5cGVJbmZvKG5vZGUuY29uc2VxdWVudCksXHJcbiAgICAgICAgICAgICAgICAgICAgYWx0ZXJuYXRlID0gY3R4LmNyZWF0ZVR5cGVJbmZvKG5vZGUuYWx0ZXJuYXRlKTtcclxuXHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKGNvbnNlcXVlbnQuZXF1YWxzKGFsdGVybmF0ZSkpIHtcclxuICAgICAgICAgICAgICAgICAgICByZXN1bHQuY29weShjb25zZXF1ZW50KTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoY29uc2VxdWVudC5jYW5OdW1iZXIoKSAmJiBhbHRlcm5hdGUuY2FuTnVtYmVyKCkpIHtcclxuICAgICAgICAgICAgICAgICAgICByZXN1bHQuc2V0VHlwZShUWVBFUy5OVU1CRVIpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgZWxzZSBpZiAodGVzdC5pc051bGxPclVuZGVmaW5lZCgpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0LnNldFR5cGUoYWx0ZXJuYXRlLmdldFR5cGUoKSlcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gV2UgZG9uJ3QgYWxsb3cgZHluYW1pYyB0eXBlcyAodGhlIHR5cGUgb2YgdGhlIHJlc3VsdCBkZXBlbmRzIG9uIHRoZSB2YWx1ZSBvZiBpdCdzIG9wZXJhbmRzKS5cclxuICAgICAgICAgICAgICAgICAgICAvLyBBdCB0aGlzIHBvaW50LCB0aGUgZXhwcmVzc2lvbiBuZWVkcyB0byBldmFsdWF0ZSB0byBhIHJlc3VsdCwgb3RoZXJ3aXNlIGl0J3MgYW4gZXJyb3JcclxuICAgICAgICAgICAgICAgICAgICB0aHJvdyBTaGFkZS50aHJvd0Vycm9yKG5vZGUsIFwiU3RhdGljIGV2YWx1YXRpb24gbm90IGltcGxlbWVudGVkIHlldFwiKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICByZXR1cm4gVmlzaXRvck9wdGlvbi5Ta2lwO1xyXG5cclxuICAgICAgICB9LFxyXG4gICAgICAgIExpdGVyYWw6IGZ1bmN0aW9uIChsaXRlcmFsKSB7XHJcbiAgICAgICAgICAgIC8vY29uc29sZS5sb2cobGl0ZXJhbCk7XHJcbiAgICAgICAgICAgIHZhciB2YWx1ZSA9IGxpdGVyYWwucmF3ICE9PSB1bmRlZmluZWQgPyBsaXRlcmFsLnJhdyA6IGxpdGVyYWwudmFsdWUsXHJcbiAgICAgICAgICAgICAgICByZXN1bHQgPSBuZXcgQW5ub3RhdGlvbihsaXRlcmFsKTtcclxuXHJcbiAgICAgICAgICAgIHZhciBudW1iZXIgPSBwYXJzZUZsb2F0KHZhbHVlKTtcclxuXHJcbiAgICAgICAgICAgIGlmICghaXNOYU4obnVtYmVyKSkge1xyXG4gICAgICAgICAgICAgICAgaWYgKHZhbHVlLmluZGV4T2YoXCIuXCIpID09IC0xKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0LnNldFR5cGUoVFlQRVMuSU5UKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdC5zZXRUeXBlKFRZUEVTLk5VTUJFUik7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICByZXN1bHQuc2V0U3RhdGljVmFsdWUobnVtYmVyKTtcclxuICAgICAgICAgICAgfSBlbHNlIGlmICh2YWx1ZSA9PT0gJ3RydWUnKSB7XHJcbiAgICAgICAgICAgICAgICByZXN1bHQuc2V0VHlwZShUWVBFUy5CT09MRUFOKTtcclxuICAgICAgICAgICAgICAgIHJlc3VsdC5zZXRTdGF0aWNWYWx1ZSh0cnVlKTtcclxuICAgICAgICAgICAgfSBlbHNlIGlmICh2YWx1ZSA9PT0gJ2ZhbHNlJykge1xyXG4gICAgICAgICAgICAgICAgcmVzdWx0LnNldFR5cGUoVFlQRVMuQk9PTEVBTik7XHJcbiAgICAgICAgICAgICAgICByZXN1bHQuc2V0U3RhdGljVmFsdWUoZmFsc2UpO1xyXG4gICAgICAgICAgICB9IGVsc2UgaWYgKHZhbHVlID09PSAnbnVsbCcpIHtcclxuICAgICAgICAgICAgICAgIHJlc3VsdC5zZXRUeXBlKFRZUEVTLk5VTEwpO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgcmVzdWx0LnNldFR5cGUoVFlQRVMuU1RSSU5HKTtcclxuICAgICAgICAgICAgICAgIHJlc3VsdC5zZXRTdGF0aWNWYWx1ZSh2YWx1ZSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgdmFyIGhhbmRsZXJzID0ge1xyXG4gICAgICAgIEFzc2lnbm1lbnRFeHByZXNzaW9uOiBmdW5jdGlvbiAobm9kZSwgY3R4KSB7XHJcbiAgICAgICAgICAgIHZhciByaWdodCA9IGN0eC5jcmVhdGVUeXBlSW5mbyhub2RlLnJpZ2h0KSxcclxuICAgICAgICAgICAgICAgIHJlc3VsdCA9IG5ldyBBbm5vdGF0aW9uKG5vZGUpO1xyXG5cclxuICAgICAgICAgICAgcmVzdWx0LmNvcHkocmlnaHQpO1xyXG4gICAgICAgICAgICBpZiAobm9kZS5sZWZ0LnR5cGUgPT0gU3ludGF4LklkZW50aWZpZXIpIHtcclxuICAgICAgICAgICAgICAgIHZhciBuYW1lID0gbm9kZS5sZWZ0Lm5hbWU7XHJcbiAgICAgICAgICAgICAgICBpZiAoY3R4LmluRGVjbGFyYXRpb24gPT09IHRydWUpIHtcclxuICAgICAgICAgICAgICAgICAgICBjdHguZGVjbGFyZVZhcmlhYmxlKG5hbWUsIHRydWUsIHJlc3VsdClcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGN0eC51cGRhdGVFeHByZXNzaW9uKG5hbWUsIHJpZ2h0KTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIkFzc2lnbm1lbnQgZXhwcmVzc2lvblwiKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0sXHJcblxyXG5cclxuICAgICAgICBOZXdFeHByZXNzaW9uOiBmdW5jdGlvbihub2RlLCBwYXJlbnQsIGN0eCkge1xyXG4gICAgICAgICAgICB2YXIgcmVzdWx0ID0gbmV3IEFubm90YXRpb24obm9kZSk7XHJcblxyXG4gICAgICAgICAgICB2YXIgZW50cnkgPSBjdHguZ2V0QmluZGluZ0J5TmFtZShub2RlLmNhbGxlZS5uYW1lKTtcclxuICAgICAgICAgICAgLy9jb25zb2xlLmVycm9yKGVudHJ5KTtcclxuICAgICAgICAgICAgaWYgKGVudHJ5ICYmIGVudHJ5Lmhhc0NvbnN0cnVjdG9yKCkpIHtcclxuICAgICAgICAgICAgICAgIHZhciBjb25zdHJ1Y3RvciA9IGVudHJ5LmdldENvbnN0cnVjdG9yKCk7XHJcbiAgICAgICAgICAgICAgICB2YXIgYXJncyA9IEFubm90YXRpb24uY3JlYXRlQW5ub3RhdGVkTm9kZUFycmF5KG5vZGUuYXJndW1lbnRzLCBjdHgpO1xyXG4gICAgICAgICAgICAgICAgdmFyIGV4dHJhID0gY29uc3RydWN0b3IuZXZhbHVhdGUocmVzdWx0LCBhcmdzLCBjdHgpO1xyXG4gICAgICAgICAgICAgICAgcmVzdWx0LnNldEZyb21FeHRyYShleHRyYSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIlJlZmVyZW5jZUVycm9yOiBcIiArIG5vZGUuY2FsbGVlLm5hbWUgKyBcIiBpcyBub3QgZGVmaW5lZFwiKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0sXHJcblxyXG4gICAgICAgIFVuYXJ5RXhwcmVzc2lvbjogZnVuY3Rpb24gKG5vZGUsIGN0eCkge1xyXG4gICAgICAgICAgICB2YXIgcmVzdWx0ID0gbmV3IEFubm90YXRpb24obm9kZSksXHJcbiAgICAgICAgICAgICAgICBhcmd1bWVudCA9IGN0eC5jcmVhdGVUeXBlSW5mbyhub2RlLmFyZ3VtZW50KSxcclxuICAgICAgICAgICAgICAgIG9wZXJhdG9yID0gbm9kZS5vcGVyYXRvcixcclxuICAgICAgICAgICAgICAgIGZ1bmMgPSBVbmFyeUZ1bmN0aW9uc1tvcGVyYXRvcl07XHJcblxyXG4gICAgICAgICAgICBzd2l0Y2ggKG9wZXJhdG9yKSB7XHJcbiAgICAgICAgICAgICAgICBjYXNlIFwiIVwiOlxyXG5cclxuICAgICAgICAgICAgICAgICAgICByZXN1bHQuc2V0VHlwZShUWVBFUy5CT09MRUFOKTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgXCIrXCI6XHJcbiAgICAgICAgICAgICAgICBjYXNlIFwiLVwiOlxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChhcmd1bWVudC5jYW5JbnQoKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXN1bHQuc2V0VHlwZShUWVBFUy5JTlQpO1xyXG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoYXJndW1lbnQuY2FuTnVtYmVyKCkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmVzdWx0LnNldFR5cGUoVFlQRVMuTlVNQkVSKTtcclxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJDYW4ndCBldmFsdWF0ZSAnXCIgKyBvcGVyYXRvciArICdcIiBmb3IgJyArIGFyZ3VtZW50KTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIFwiflwiOlxyXG4gICAgICAgICAgICAgICAgY2FzZSBcInR5cGVvZlwiOlxyXG4gICAgICAgICAgICAgICAgY2FzZSBcInZvaWRcIjpcclxuICAgICAgICAgICAgICAgIGNhc2UgXCJkZWxldGVcIjpcclxuICAgICAgICAgICAgICAgIGRlZmF1bHQ6XHJcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiT3BlcmF0b3Igbm90IHlldCBzdXBwb3J0ZWQ6IFwiICsgb3BlcmF0b3IpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmIChhcmd1bWVudC5oYXNTdGF0aWNWYWx1ZSgpKSB7XHJcbiAgICAgICAgICAgICAgICByZXN1bHQuc2V0U3RhdGljVmFsdWUoZnVuYyhhcmd1bWVudC5nZXRTdGF0aWNWYWx1ZSgpKSk7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICByZXN1bHQuc2V0RHluYW1pY1ZhbHVlKCk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgfSxcclxuXHJcblxyXG4gICAgICAgIElkZW50aWZpZXI6IGZ1bmN0aW9uIChub2RlLCBjdHgpIHtcclxuICAgICAgICAgICAgdmFyIHJlc3VsdCA9IG5ldyBBbm5vdGF0aW9uKG5vZGUpLFxyXG4gICAgICAgICAgICAgICAgbmFtZSA9IG5vZGUubmFtZTtcclxuXHJcbiAgICAgICAgICAgIGlmIChuYW1lID09PSBcInVuZGVmaW5lZFwiKSB7XHJcbiAgICAgICAgICAgICAgICByZXN1bHQuc2V0VHlwZShUWVBFUy5VTkRFRklORUQpO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSxcclxuXHJcblxyXG5cclxuICAgICAgICBMb2dpY2FsRXhwcmVzc2lvbjogZnVuY3Rpb24gKG5vZGUsIGN0eCkge1xyXG4gICAgICAgICAgICB2YXIgbGVmdCA9IGN0eC5jcmVhdGVUeXBlSW5mbyhub2RlLmxlZnQpLFxyXG4gICAgICAgICAgICAgICAgcmlnaHQgPSBjdHguY3JlYXRlVHlwZUluZm8obm9kZS5yaWdodCksXHJcbiAgICAgICAgICAgICAgICByZXN1bHQgPSBuZXcgQW5ub3RhdGlvbihub2RlKSxcclxuICAgICAgICAgICAgICAgIG9wZXJhdG9yID0gbm9kZS5vcGVyYXRvcjtcclxuXHJcbiAgICAgICAgICAgIGlmICghKG9wZXJhdG9yID09IFwiJiZcIiB8fCBvcGVyYXRvciA9PSBcInx8XCIpKVxyXG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiT3BlcmF0b3Igbm90IHN1cHBvcnRlZDogXCIgKyBub2RlLm9wZXJhdG9yKTtcclxuXHJcbiAgICAgICAgICAgIGlmIChsZWZ0LmlzTnVsbE9yVW5kZWZpbmVkKCkpIHsgIC8vIGV2YWx1YXRlcyB0byBmYWxzZVxyXG4gICAgICAgICAgICAgICAgaWYgKG9wZXJhdG9yID09IFwifHxcIikgeyAgICAgIC8vIGZhbHNlIHx8IHggPSB4XHJcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0LmNvcHkocmlnaHQpO1xyXG4gICAgICAgICAgICAgICAgICAgIGxlZnQuZWxpbWluYXRlKCk7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2UgeyAgICAgICAgICAgICAgICAgICAgIC8vIGZhbHNlICYmIHggPSBmYWxzZVxyXG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdC5jb3B5KGxlZnQpO1xyXG4gICAgICAgICAgICAgICAgICAgIHJpZ2h0LmVsaW1pbmF0ZSgpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9IGVsc2UgaWYgKGxlZnQuaXNPYmplY3QoKSAmJiBvcGVyYXRvciA9PSBcInx8XCIpIHsgLy8gQW4gb2JqZWN0IHRoYXQgaXMgbm90IG51bGwgZXZhbHVhdGVzIHRvIHRydWVcclxuICAgICAgICAgICAgICAgIHJlc3VsdC5jb3B5KGxlZnQpO1xyXG4gICAgICAgICAgICAgICAgcmlnaHQuZWxpbWluYXRlKCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZWxzZSBpZiAobGVmdC5nZXRUeXBlKCkgPT0gcmlnaHQuZ2V0VHlwZSgpKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAobGVmdC5pc09iamVjdCgpICYmIGxlZnQuZ2V0S2luZCgpICE9IHJpZ2h0LmdldEtpbmQoKSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIkNhbid0IGV2YWx1YXRlIGxvZ2ljYWwgZXhwcmVzc2lvbiB3aXRoIHR3byBkaWZmZXJlbnQga2luZCBvZiBvYmplY3RzXCIpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgcmVzdWx0LmNvcHkobGVmdCk7IC8vIFRPRE86IFN0YXRpYyB2YWx1ZT9cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgIC8vIFdlIGRvbid0IGFsbG93IGR5bmFtaWMgdHlwZXMgKHRoZSB0eXBlIG9mIHRoZSByZXN1bHQgZGVwZW5kcyBvbiB0aGUgdmFsdWUgb2YgaXQncyBvcGVyYW5kcykuXHJcbiAgICAgICAgICAgICAgICAvLyBBdCB0aGlzIHBvaW50LCB0aGUgZXhwcmVzc2lvbiBuZWVkcyB0byBldmFsdWF0ZSB0byBhIHJlc3VsdCwgb3RoZXJ3aXNlIGl0J3MgYW4gZXJyb3JcclxuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIlN0YXRpYyBldmFsdWF0aW9uIG5vdCBpbXBsZW1lbnRlZCB5ZXRcIik7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9LFxyXG5cclxuXHJcbiAgICAgICAgQmluYXJ5RXhwcmVzc2lvbjogZnVuY3Rpb24gKG5vZGUsIGN0eCkge1xyXG4gICAgICAgICAgICAvL2NvbnNvbGUubG9nKG5vZGUubGVmdCwgbm9kZS5yaWdodCk7XHJcbiAgICAgICAgICAgIHZhciBsZWZ0ID0gY3R4LmNyZWF0ZVR5cGVJbmZvKG5vZGUubGVmdCksXHJcbiAgICAgICAgICAgICAgICByaWdodCA9IGN0eC5jcmVhdGVUeXBlSW5mbyhub2RlLnJpZ2h0KSxcclxuICAgICAgICAgICAgICAgIHJlc3VsdCA9IG5ldyBBbm5vdGF0aW9uKG5vZGUpLFxyXG4gICAgICAgICAgICAgICAgb3BlcmF0b3IgPSBub2RlLm9wZXJhdG9yLFxyXG4gICAgICAgICAgICAgICAgZnVuYyA9IEJpbmFyeUZ1bmN0aW9uc1tvcGVyYXRvcl07XHJcblxyXG4gICAgICAgICAgICBzd2l0Y2ggKG9wZXJhdG9yKSB7XHJcbiAgICAgICAgICAgICAgICBjYXNlIFwiK1wiOlxyXG4gICAgICAgICAgICAgICAgY2FzZSBcIi1cIjpcclxuICAgICAgICAgICAgICAgIGNhc2UgXCIqXCI6XHJcbiAgICAgICAgICAgICAgICBjYXNlIFwiL1wiOlxyXG4gICAgICAgICAgICAgICAgY2FzZSBcIiVcIjpcclxuICAgICAgICAgICAgICAgICAgICAvLyBpbnQgJ29wJyBpbnQgPT4gaW50XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gaW50IC8gaW50ID0+IG51bWJlclxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChsZWZ0LmlzSW50KCkgJiYgcmlnaHQuaXNJbnQoKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAob3BlcmF0b3IgPT0gXCIvXCIpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXN1bHQuc2V0VHlwZShUWVBFUy5OVU1CRVIpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBlbHNlXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXN1bHQuc2V0VHlwZShUWVBFUy5JTlQpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAvLyBpbnQgJ29wJyBudW1iZXIgPT4gbnVtYmVyXHJcbiAgICAgICAgICAgICAgICAgICAgZWxzZSBpZiAobGVmdC5pc0ludCgpICYmIHJpZ2h0LmlzTnVtYmVyKCkgfHwgcmlnaHQuaXNJbnQoKSAmJiBsZWZ0LmlzTnVtYmVyKCkpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc3VsdC5zZXRUeXBlKFRZUEVTLk5VTUJFUik7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gbnVtYmVyICdvcCcgbnVtYmVyID0+IG51bWJlclxyXG4gICAgICAgICAgICAgICAgICAgIGVsc2UgaWYgKGxlZnQuaXNOdW1iZXIoKSAmJiByaWdodC5pc051bWJlcigpKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXN1bHQuc2V0VHlwZShUWVBFUy5OVU1CRVIpO1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIGludCAnb3AnIG51bGwgPT4gaW50XHJcbiAgICAgICAgICAgICAgICAgICAgZWxzZSBpZiAobGVmdC5pc0ludCgpICYmIHJpZ2h0LmlzTnVsbE9yVW5kZWZpbmVkKCkgfHwgcmlnaHQuaXNJbnQoKSAmJiBsZWZ0LmlzTnVsbE9yVW5kZWZpbmVkKCkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmVzdWx0LnNldFR5cGUoVFlQRVMuSU5UKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gbnVtYmVyICdvcCcgbnVsbCA9PiBudW1iZXJcclxuICAgICAgICAgICAgICAgICAgICBlbHNlIGlmICgobGVmdC5pc051bWJlcigpICYmIHJpZ2h0LmlzTnVsbE9yVW5kZWZpbmVkKCkpIHx8IChyaWdodC5pc051bWJlcigpICYmIGxlZnQuaXNOdWxsT3JVbmRlZmluZWQoKSkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmVzdWx0LnNldFR5cGUoVFlQRVMuTlVNQkVSKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vY29uc29sZS5lcnJvcihub2RlLCBsZWZ0LmdldFR5cGUoKSwgb3BlcmF0b3IsIHJpZ2h0LmdldFR5cGUoKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIFNoYWRlLnRocm93RXJyb3Iobm9kZSwgXCJFdmFsdWF0ZXMgdG8gTmFOOiBcIiArIGxlZnQuZ2V0VHlwZVN0cmluZygpICsgXCIgXCIgKyBvcGVyYXRvciArIFwiIFwiICsgcmlnaHQuZ2V0VHlwZVN0cmluZygpKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIFwiPT1cIjogLy8gY29tcGFyaXNvblxyXG4gICAgICAgICAgICAgICAgY2FzZSBcIiE9XCI6XHJcbiAgICAgICAgICAgICAgICBjYXNlIFwiPT09XCI6XHJcbiAgICAgICAgICAgICAgICBjYXNlIFwiIT09XCI6XHJcbiAgICAgICAgICAgICAgICBjYXNlIFwiPlwiOlxyXG4gICAgICAgICAgICAgICAgY2FzZSBcIjxcIjpcclxuICAgICAgICAgICAgICAgIGNhc2UgXCI+PVwiOlxyXG4gICAgICAgICAgICAgICAgY2FzZSBcIjw9XCI6XHJcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0LnNldFR5cGUoVFlQRVMuQk9PTEVBTik7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBkZWZhdWx0OlxyXG4gICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIk9wZXJhdG9yIG5vdCBzdXBwb3J0ZWQ6IFwiICsgb3BlcmF0b3IpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmIChsZWZ0Lmhhc1N0YXRpY1ZhbHVlKCkgJiYgcmlnaHQuaGFzU3RhdGljVmFsdWUoKSkge1xyXG4gICAgICAgICAgICAgICAgLy9jb25zb2xlLmxvZyhsZWZ0LmdldFN0YXRpY1ZhbHVlKCksIG9wZXJhdG9yLCByaWdodC5nZXRTdGF0aWNWYWx1ZSgpKTtcclxuICAgICAgICAgICAgICAgIHJlc3VsdC5zZXRTdGF0aWNWYWx1ZShmdW5jKGxlZnQuZ2V0U3RhdGljVmFsdWUoKSwgcmlnaHQuZ2V0U3RhdGljVmFsdWUoKSkpO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgcmVzdWx0LnNldER5bmFtaWNWYWx1ZSgpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgIH0sXHJcblxyXG5cclxuICAgICAgICBNZW1iZXJFeHByZXNzaW9uOiBmdW5jdGlvbiAobm9kZSwgcGFyZW50LCBjdHgsIHJvb3QpIHtcclxuICAgICAgICAgICAgdmFyIHJlc3VsdFR5cGUgPSBjdHguY3JlYXRlVHlwZUluZm8obm9kZSksXHJcbiAgICAgICAgICAgICAgICBvYmplY3RBbm5vdGF0aW9uID0gbmV3IEFubm90YXRpb24obm9kZS5vYmplY3QpLFxyXG4gICAgICAgICAgICAgICAgcHJvcGVydHlBbm5vdGF0aW9uID0gbmV3IEFubm90YXRpb24obm9kZS5wcm9wZXJ0eSksXHJcbiAgICAgICAgICAgICAgICBwcm9wZXJ0eU5hbWUgPSBub2RlLnByb3BlcnR5Lm5hbWU7XHJcblxyXG4gICAgICAgICAgICAvL2NvbnNvbGUubG9nKFwiTWVtYmVyXCIsIG5vZGUub2JqZWN0Lm5hbWUsIG5vZGUucHJvcGVydHkubmFtZSk7XHJcbiAgICAgICAgICAgIGlmIChub2RlLmNvbXB1dGVkKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAob2JqZWN0QW5ub3RhdGlvbi5pc0FycmF5KCkpIHtcclxuICAgICAgICAgICAgICAgICAgICAvLyBQcm9wZXJ0eSBpcyBjb21wdXRlZCwgdGh1cyBpdCBjb3VsZCBiZSBhIHZhcmlhYmxlXHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIHByb3BlcnR5VHlwZSA9ICBjdHguY3JlYXRlVHlwZUluZm8obm9kZS5wcm9wZXJ0eSk7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFwcm9wZXJ0eVR5cGUuY2FuSW50KCkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgU2hhZGUudGhyb3dFcnJvcihub2RlLCBcIkV4cGVjdGVkICdpbnQnIHR5cGUgZm9yIGFycmF5IGFjY2Vzc29yXCIpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB2YXIgZWxlbWVudEluZm8gPSBvYmplY3RBbm5vdGF0aW9uLmdldEFycmF5RWxlbWVudFR5cGUoKTtcclxuICAgICAgICAgICAgICAgICAgICByZXN1bHRUeXBlLnNldFR5cGUoZWxlbWVudEluZm8udHlwZSwgZWxlbWVudEluZm8ua2luZCk7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgU2hhZGUudGhyb3dFcnJvcihub2RlLCBcIlR5cGVFcnJvcjogQ2Fubm90IHJlYWQgcHJvcGVydHkgJ1wiKyBwcm9wZXJ0eU5hbWUgKyBcIicgb2YgXCIgKyBvYmplY3RBbm5vdGF0aW9uLmdldFR5cGVTdHJpbmcoKSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHZhciBvYmplY3RPZkludGVyZXN0ID0gZ2V0T2JqZWN0UmVmZXJlbmNlRnJvbU5vZGUobm9kZS5vYmplY3QsIGN0eCk7XHJcblxyXG4gICAgICAgICAgICBvYmplY3RPZkludGVyZXN0IHx8IFNoYWRlLnRocm93RXJyb3Iobm9kZSxcIlJlZmVyZW5jZUVycm9yOiBcIiArIG5vZGUub2JqZWN0Lm5hbWUgKyBcIiBpcyBub3QgZGVmaW5lZC4gQ29udGV4dDogXCIgKyBjdHguc3RyKCkpO1xyXG5cclxuICAgICAgICAgICAgaWYgKG9iamVjdE9mSW50ZXJlc3QuZ2V0VHlwZSgpID09IFRZUEVTLlVOREVGSU5FRCkgeyAgLy8gZS5nLiB2YXIgYSA9IHVuZGVmaW5lZDsgYS51bmtub3duO1xyXG4gICAgICAgICAgICAgICAgU2hhZGUudGhyb3dFcnJvcihub2RlLCBcIlR5cGVFcnJvcjogQ2Fubm90IHJlYWQgcHJvcGVydHkgJ1wiKyBwcm9wZXJ0eU5hbWUgK1wiJyBvZiB1bmRlZmluZWRcIilcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAob2JqZWN0T2ZJbnRlcmVzdC5nZXRUeXBlKCkgIT0gVFlQRVMuT0JKRUNUKSB7IC8vIGUuZy4gdmFyIGEgPSA1OyBhLnVua25vd247XHJcbiAgICAgICAgICAgICAgICByZXN1bHRUeXBlLnNldFR5cGUoVFlQRVMuVU5ERUZJTkVEKTtcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgdmFyIG9iamVjdEluZm8gPSBjdHguZ2V0T2JqZWN0SW5mb0ZvcihvYmplY3RPZkludGVyZXN0KTtcclxuICAgICAgICAgICAgaWYoIW9iamVjdEluZm8pXHJcbiAgICAgICAgICAgICAgICBTaGFkZS50aHJvd0Vycm9yKG5vZGUsIFwiSW50ZXJuYWw6IEluY29tcGxldGUgcmVnaXN0cmF0aW9uIGZvciBvYmplY3Q6IFwiICsgb2JqZWN0T2ZJbnRlcmVzdC5nZXRUeXBlU3RyaW5nKCkgKyBcIiwgXCIgKyBKU09OLnN0cmluZ2lmeShub2RlLm9iamVjdCkpO1xyXG5cclxuICAgICAgICAgICAgb2JqZWN0QW5ub3RhdGlvbi5jb3B5KG9iamVjdE9mSW50ZXJlc3QpO1xyXG4gICAgICAgICAgICBpZiAoIW9iamVjdEluZm8uaGFzT3duUHJvcGVydHkocHJvcGVydHlOYW1lKSkge1xyXG4gICAgICAgICAgICAgICAgcmVzdWx0VHlwZS5zZXRUeXBlKFRZUEVTLlVOREVGSU5FRCk7XHJcbiAgICAgICAgICAgICAgICBwcm9wZXJ0eUFubm90YXRpb24uc2V0VHlwZShUWVBFUy5VTkRFRklORUQpO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICB2YXIgcHJvcGVydHlUeXBlSW5mbyA9IG9iamVjdEluZm9bcHJvcGVydHlOYW1lXTtcclxuICAgICAgICAgICAgcHJvcGVydHlBbm5vdGF0aW9uLnNldEZyb21FeHRyYShwcm9wZXJ0eVR5cGVJbmZvKTtcclxuICAgICAgICAgICAgcmVzdWx0VHlwZS5zZXRGcm9tRXh0cmEocHJvcGVydHlUeXBlSW5mbyk7XHJcbiAgICAgICAgfSxcclxuXHJcbiAgICAgICAgQ2FsbEV4cHJlc3Npb246IGZ1bmN0aW9uIChub2RlLCBjdHgsIHJvb3QpIHtcclxuICAgICAgICAgICAgdmFyIHJlc3VsdCA9IG5ldyBBbm5vdGF0aW9uKG5vZGUpO1xyXG5cclxuICAgICAgICAgICAgLy8gQ2FsbCBvbiBhbiBvYmplY3QsIGUuZy4gTWF0aC5jb3MoKVxyXG4gICAgICAgICAgICBpZiAobm9kZS5jYWxsZWUudHlwZSA9PSBTeW50YXguTWVtYmVyRXhwcmVzc2lvbikge1xyXG4gICAgICAgICAgICAgICAgdmFyIGNhbGxpbmdPYmplY3QgPSBnZXRPYmplY3RSZWZlcmVuY2VGcm9tTm9kZShub2RlLmNhbGxlZSwgY3R4KTtcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAoIWNhbGxpbmdPYmplY3QuaXNGdW5jdGlvbigpKSB7IC8vIGUuZy4gTWF0aC5QSSgpXHJcbiAgICAgICAgICAgICAgICAgICAgU2hhZGUudGhyb3dFcnJvcihub2RlLCBcIlR5cGVFcnJvcjogT2JqZWN0ICM8XCIgKyBjYWxsaW5nT2JqZWN0LmdldFR5cGUoKSsgXCI+IGhhcyBubyBtZXRob2QgJ1wiKyBub2RlLmNhbGxlZS5wcm9wZXJ0eS5uYW1lICsgXCInXCIpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIHZhciBvYmplY3QgPSBub2RlLmNhbGxlZS5vYmplY3QsXHJcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydHlOYW1lID0gbm9kZS5jYWxsZWUucHJvcGVydHkubmFtZTtcclxuXHJcbiAgICAgICAgICAgICAgICB2YXIgb2JqZWN0UmVmZXJlbmNlID0gZ2V0T2JqZWN0UmVmZXJlbmNlRnJvbU5vZGUob2JqZWN0LCBjdHgpO1xyXG4gICAgICAgICAgICAgICAgaWYoIW9iamVjdFJlZmVyZW5jZSkgIHtcclxuICAgICAgICAgICAgICAgICAgICBTaGFkZS50aHJvd0Vycm9yKG5vZGUsIFwiSW50ZXJuYWw6IE5vIG9iamVjdCBpbmZvIGZvcjogXCIgKyBvYmplY3QpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIHZhciBvYmplY3RJbmZvID0gY3R4LmdldE9iamVjdEluZm9Gb3Iob2JqZWN0UmVmZXJlbmNlKTtcclxuICAgICAgICAgICAgICAgIGlmKCFvYmplY3RJbmZvKSB7IC8vIEV2ZXJ5IG9iamVjdCBuZWVkcyBhbiBpbmZvLCBvdGhlcndpc2Ugd2UgZGlkIHNvbWV0aGluZyB3cm9uZ1xyXG4gICAgICAgICAgICAgICAgICAgIFNoYWRlLnRocm93RXJyb3Iobm9kZSwgXCJJbnRlcm5hbCBFcnJvcjogTm8gb2JqZWN0IHJlZ2lzdGVyZWQgZm9yOiBcIiArIG9iamVjdFJlZmVyZW5jZS5nZXRUeXBlU3RyaW5nKCkgKyBKU09OLnN0cmluZ2lmeShub2RlLm9iamVjdCkpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgaWYgKG9iamVjdEluZm8uaGFzT3duUHJvcGVydHkocHJvcGVydHlOYW1lKSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciBwcm9wZXJ0eUhhbmRsZXIgPSBvYmplY3RJbmZvW3Byb3BlcnR5TmFtZV07XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBwcm9wZXJ0eUhhbmRsZXIuZXZhbHVhdGUgPT0gXCJmdW5jdGlvblwiKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBhcmdzID0gQW5ub3RhdGlvbi5jcmVhdGVBbm5vdGF0ZWROb2RlQXJyYXkobm9kZS5hcmd1bWVudHMsIGN0eCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBleHRyYSA9IHByb3BlcnR5SGFuZGxlci5ldmFsdWF0ZShyZXN1bHQsIGFyZ3MsIGN0eCwgb2JqZWN0UmVmZXJlbmNlKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmVzdWx0LnNldEZyb21FeHRyYShleHRyYSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0gIGVsc2UgaWYgKG5vZGUuY2FsbGVlLnR5cGUgPT0gU3ludGF4LklkZW50aWZpZXIpIHtcclxuICAgICAgICAgICAgICAgIHZhciBmdW5jdGlvbk5hbWUgPSBub2RlLmNhbGxlZS5uYW1lO1xyXG4gICAgICAgICAgICAgICAgdmFyIGZ1bmMgPSBjdHguZ2V0QmluZGluZ0J5TmFtZShmdW5jdGlvbk5hbWUpO1xyXG4gICAgICAgICAgICAgICAgaWYgKCFmdW5jKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgU2hhZGUudGhyb3dFcnJvcihub2RlLCBcIlJlZmVyZW5jZUVycm9yOiBcIiArIGZ1bmN0aW9uTmFtZSArIFwiIGlzIG5vdCBkZWZpbmVkXCIpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgaWYoIWZ1bmMuaXNGdW5jdGlvbigpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgU2hhZGUudGhyb3dFcnJvcihub2RlLCBcIlR5cGVFcnJvcjogXCIgKyBmdW5jLmdldFR5cGVTdHJpbmcoKSArIFwiIGlzIG5vdCBhIGZ1bmN0aW9uXCIpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgdmFyIGFyZ3MgPSBBbm5vdGF0aW9uLmNyZWF0ZUFubm90YXRlZE5vZGVBcnJheShub2RlLmFyZ3VtZW50cywgY3R4KTtcclxuICAgICAgICAgICAgICAgIHZhciBkZWZpbmluZ0NvbnRleHQgPSBjdHguZ2V0Q29udGV4dEZvck5hbWUoZnVuY3Rpb25OYW1lKTtcclxuICAgICAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICB2YXIgZXh0cmEgPSByb290LmdldEZ1bmN0aW9uSW5mb3JtYXRpb25Gb3IoY3R4LmdldFZhcmlhYmxlSWRlbnRpZmllcihmdW5jdGlvbk5hbWUpLCBhcmdzLCBkZWZpbmluZ0NvbnRleHQpO1xyXG4gICAgICAgICAgICAgICAgfSBjYXRjaChlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgU2hhZGUudGhyb3dFcnJvcihub2RlLCBcIkZhaWx1cmUgaW4gZnVuY3Rpb24gY2FsbDogXCIgKyBlLm1lc3NhZ2UpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgZXh0cmEgJiYgcmVzdWx0LnNldEZyb21FeHRyYShleHRyYSk7XHJcbiAgICAgICAgICAgICAgICBub2RlLmNhbGxlZS5uYW1lID0gZXh0cmEubmV3TmFtZTtcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIC8qY2FzZSBTeW50YXguSWRlbnRpZmllcjpcclxuICAgICAgICAgICAgICAgICAgICB2YXIgZnVuY3Rpb25OYW1lID0gbm9kZS5jYWxsZWUubmFtZTtcclxuICAgICAgICAgICAgICAgICAgICB2YXIgZnVuYyA9IGN0eC5nZXRCaW5kaW5nQnlOYW1lKGZ1bmN0aW9uTmFtZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKCEoZnVuYyAmJiBmdW5jLmlzSW5pdGlhbGl6ZWQoKSkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGZ1bmN0aW9uTmFtZSArIFwiIGlzIG5vdCBkZWZpbmVkLiBDb250ZXh0OiBcIiArIGN0eC5zdHIoKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKGZ1bmMpO1xyXG4gICAgICAgICAgICAgICAgICAgIC8vdGhyb3cgbmV3IEVycm9yKFwiQ2FuJ3QgY2FsbCBcIiArIGZ1bmN0aW9uTmFtZSArIFwiKCkgaW4gdGhpcyBjb250ZXh0OiBcIiArIGN0eC5zdHIoKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBkZWZhdWx0OiAgICovXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIlVuaGFuZGxlZCBDYWxsRXhwcmVzc2lvbjpcIiArIG5vZGUuY2FsbGVlLnR5cGUpO1xyXG5cclxuICAgICAgICB9XHJcbiAgICB9O1xyXG5cclxuICAgIHZhciBlbnRlckV4cHJlc3Npb24gPSBmdW5jdGlvbiAobm9kZSwgcGFyZW50LCBjdHgpIHtcclxuICAgICAgICBpZiAoZW50ZXJIYW5kbGVycy5oYXNPd25Qcm9wZXJ0eShub2RlLnR5cGUpKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBlbnRlckhhbmRsZXJzW25vZGUudHlwZV0obm9kZSwgcGFyZW50LCBjdHgsIHRoaXMpO1xyXG4gICAgICAgIH1cclxuICAgIH07XHJcblxyXG4gICAgdmFyIGV4aXRFeHByZXNzaW9uID0gZnVuY3Rpb24gKG5vZGUsIHBhcmVudCwgY3R4KSB7XHJcblxyXG4gICAgICAgIHN3aXRjaCAobm9kZS50eXBlKSB7XHJcbiAgICAgICAgICAgIGNhc2UgU3ludGF4LkFzc2lnbm1lbnRFeHByZXNzaW9uOlxyXG4gICAgICAgICAgICAgICAgaGFuZGxlcnMuQXNzaWdubWVudEV4cHJlc3Npb24obm9kZSwgY3R4KTtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIFN5bnRheC5BcnJheUV4cHJlc3Npb246XHJcbiAgICAgICAgICAgICAgICBsb2cobm9kZS50eXBlICsgXCIgaXMgbm90IGhhbmRsZSB5ZXQuXCIpO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgU3ludGF4LkFycmF5UGF0dGVybjpcclxuICAgICAgICAgICAgICAgIGxvZyhub2RlLnR5cGUgKyBcIiBpcyBub3QgaGFuZGxlIHlldC5cIik7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSBTeW50YXguQmluYXJ5RXhwcmVzc2lvbjpcclxuICAgICAgICAgICAgICAgIGhhbmRsZXJzLkJpbmFyeUV4cHJlc3Npb24obm9kZSwgY3R4KTtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIFN5bnRheC5DYWxsRXhwcmVzc2lvbjpcclxuICAgICAgICAgICAgICAgIGhhbmRsZXJzLkNhbGxFeHByZXNzaW9uKG5vZGUsIGN0eCwgdGhpcyk7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSBTeW50YXguQ29uZGl0aW9uYWxFeHByZXNzaW9uOlxyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgU3ludGF4LkZ1bmN0aW9uRXhwcmVzc2lvbjpcclxuICAgICAgICAgICAgICAgIGxvZyhub2RlLnR5cGUgKyBcIiBpcyBub3QgaGFuZGxlIHlldC5cIik7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSBTeW50YXguSWRlbnRpZmllcjpcclxuICAgICAgICAgICAgICAgIGhhbmRsZXJzLklkZW50aWZpZXIobm9kZSwgY3R4KTtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIFN5bnRheC5MaXRlcmFsOlxyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgU3ludGF4LkxvZ2ljYWxFeHByZXNzaW9uOlxyXG4gICAgICAgICAgICAgICAgaGFuZGxlcnMuTG9naWNhbEV4cHJlc3Npb24obm9kZSwgY3R4KTtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIFN5bnRheC5NZW1iZXJFeHByZXNzaW9uOlxyXG4gICAgICAgICAgICAgICAgaGFuZGxlcnMuTWVtYmVyRXhwcmVzc2lvbihub2RlLCBwYXJlbnQsIGN0eCwgdGhpcyk7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSBTeW50YXguTmV3RXhwcmVzc2lvbjpcclxuICAgICAgICAgICAgICAgIGhhbmRsZXJzLk5ld0V4cHJlc3Npb24obm9kZSwgcGFyZW50LCBjdHgpO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgU3ludGF4Lk9iamVjdEV4cHJlc3Npb246XHJcbiAgICAgICAgICAgICAgICBsb2cobm9kZS50eXBlICsgXCIgaXMgbm90IGhhbmRsZSB5ZXQuXCIpO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgU3ludGF4Lk9iamVjdFBhdHRlcm46XHJcbiAgICAgICAgICAgICAgICBsb2cobm9kZS50eXBlICsgXCIgaXMgbm90IGhhbmRsZSB5ZXQuXCIpO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgU3ludGF4LlByb3BlcnR5OlxyXG4gICAgICAgICAgICAgICAgbG9nKG5vZGUudHlwZSArIFwiIGlzIG5vdCBoYW5kbGUgeWV0LlwiKTtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIFN5bnRheC5TZXF1ZW5jZUV4cHJlc3Npb246XHJcbiAgICAgICAgICAgICAgICBsb2cobm9kZS50eXBlICsgXCIgaXMgbm90IGhhbmRsZSB5ZXQuXCIpO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgU3ludGF4LlRoaXNFeHByZXNzaW9uOlxyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgU3ludGF4LlVuYXJ5RXhwcmVzc2lvbjpcclxuICAgICAgICAgICAgICAgIGhhbmRsZXJzLlVuYXJ5RXhwcmVzc2lvbihub2RlLCBjdHgpO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgU3ludGF4LlVwZGF0ZUV4cHJlc3Npb246XHJcbiAgICAgICAgICAgICAgICBsb2cobm9kZS50eXBlICsgXCIgaXMgbm90IGhhbmRsZSB5ZXQuXCIpO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgU3ludGF4LllpZWxkRXhwcmVzc2lvbjpcclxuICAgICAgICAgICAgICAgIGxvZyhub2RlLnR5cGUgKyBcIiBpcyBub3QgaGFuZGxlIHlldC5cIik7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgZGVmYXVsdDpcclxuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignVW5rbm93biBub2RlIHR5cGU6ICcgKyBub2RlLnR5cGUpO1xyXG5cclxuXHJcbiAgICAgICAgfVxyXG5cclxuICAgIH07XHJcblxyXG5cclxuICAgIG5zLmVudGVyRXhwcmVzc2lvbiA9IGVudGVyRXhwcmVzc2lvbjtcclxuICAgIG5zLmV4aXRFeHByZXNzaW9uID0gZXhpdEV4cHJlc3Npb247XHJcbn0oZXhwb3J0cykpO1xyXG4iLCIoZnVuY3Rpb24gKG5zKSB7XHJcblxyXG4gICAgdmFyIHdhbGsgPSByZXF1aXJlKCdlc3RyYXZlcnNlJyksXHJcbiAgICAgICAgZW50ZXJFeHByZXNzaW9uID0gcmVxdWlyZSgnLi9pbmZlcl9leHByZXNzaW9uLmpzJykuZW50ZXJFeHByZXNzaW9uLFxyXG4gICAgICAgIGV4aXRFeHByZXNzaW9uID0gcmVxdWlyZSgnLi9pbmZlcl9leHByZXNzaW9uLmpzJykuZXhpdEV4cHJlc3Npb24sXHJcbiAgICAgICAgU3ludGF4ID0gcmVxdWlyZSgnZXN0cmF2ZXJzZScpLlN5bnRheCxcclxuICAgICAgICBUWVBFUyA9IHJlcXVpcmUoXCIuLi8uLi9pbnRlcmZhY2VzLmpzXCIpLlRZUEVTLFxyXG4gICAgICAgIEFubm90YXRpb24gPSByZXF1aXJlKFwiLi8uLi8uLi9iYXNlL2Fubm90YXRpb24uanNcIikuQW5ub3RhdGlvbixcclxuICAgICAgICBGdW5jdGlvbkFubm90YXRpb24gPSByZXF1aXJlKFwiLi8uLi8uLi9iYXNlL2Fubm90YXRpb24uanNcIikuRnVuY3Rpb25Bbm5vdGF0aW9uO1xyXG5cclxuICAgIHZhciBsb2cgPSBmdW5jdGlvbihzdHIpIHt9O1xyXG4gICAgLy92YXIgbG9nID0gZnVuY3Rpb24oKSB7IGNvbnNvbGUubG9nLmFwcGx5KGNvbnNvbGUsIGFyZ3VtZW50cyk7IH07XHJcblxyXG4gICAgdmFyIGVudGVySGFuZGxlciA9IHtcclxuICAgICAgICBGb3JTdGF0ZW1lbnQ6IGZ1bmN0aW9uKG5vZGUsIGN0eCwgcm9vdCkge1xyXG4gICAgICAgICAgICB2YXIgY3R4ID0gcm9vdC5jcmVhdGVDb250ZXh0KG5vZGUsIGN0eCk7XHJcbiAgICAgICAgICAgIHJvb3QucHVzaENvbnRleHQoY3R4KTtcclxuXHJcbiAgICAgICAgICAgIHJvb3QudHJhdmVyc2Uobm9kZS5pbml0KTtcclxuICAgICAgICAgICAgcm9vdC50cmF2ZXJzZShub2RlLnRlc3QpO1xyXG5cclxuICAgICAgICAgICAgdmFyIHRlc3QgPSBuZXcgQW5ub3RhdGlvbihub2RlLnRlc3QpO1xyXG4gICAgICAgICAgICBpZiAodGVzdC5oYXNTdGF0aWNWYWx1ZSgpKSB7IC8vIEdyZWF0ISBXZSBjYW4gZXZhbHVhdGUgaXQhXHJcbiAgICAgICAgICAgICAgICAvLyBUT0RPXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHJvb3QudHJhdmVyc2Uobm9kZS51cGRhdGUpO1xyXG4gICAgICAgICAgICByb290LnRyYXZlcnNlKG5vZGUuYm9keSk7XHJcbiAgICAgICAgICAgIHJvb3QucG9wQ29udGV4dCgpO1xyXG4gICAgICAgICAgICByZXR1cm4gd2Fsay5WaXNpdG9yT3B0aW9uLlNraXA7XHJcbiAgICAgICAgfSxcclxuXHJcbiAgICAgICAgSWZTdGF0ZW1lbnQ6IChmdW5jdGlvbigpIHtcclxuXHJcbiAgICAgICAgICAgIHZhciBjX2V2YWx1YXRlID0gZnVuY3Rpb24oZXhwKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gISFleHA7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHJldHVybiBmdW5jdGlvbihub2RlLCBjdHgsIHJvb3QpIHtcclxuICAgICAgICAgICAgICAgIHJvb3QudHJhdmVyc2Uobm9kZS50ZXN0KTtcclxuICAgICAgICAgICAgICAgIHZhciB0ZXN0ID0gbmV3IEFubm90YXRpb24obm9kZS50ZXN0KTtcclxuICAgICAgICAgICAgICAgIGlmICh0ZXN0Lmhhc1N0YXRpY1ZhbHVlKCkpIHsgLy8gR3JlYXQhIFdlIGNhbiBldmFsdWF0ZSBpdCFcclxuICAgICAgICAgICAgICAgICAgICAvL2NvbnNvbGUubG9nKFwiU3RhdGljIHZhbHVlIGluIGlmIHRlc3QhXCIpO1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciB0ZXN0UmVzdWx0ID0gY19ldmFsdWF0ZSh0ZXN0LmdldFN0YXRpY1ZhbHVlKCkpO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmKCF0ZXN0UmVzdWx0KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChub2RlLmFsdGVybmF0ZSlcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJvb3QudHJhdmVyc2Uobm9kZS5hbHRlcm5hdGUpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGNvbnNlcXVlbnQgPSBuZXcgQW5ub3RhdGlvbihub2RlLmNvbnNlcXVlbnQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zZXF1ZW50LmVsaW1pbmF0ZSgpO1xyXG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJvb3QudHJhdmVyc2Uobm9kZS5jb25zZXF1ZW50KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYobm9kZS5hbHRlcm5hdGUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBhbHRlcm5hdGUgPSBuZXcgQW5ub3RhdGlvbihub2RlLmFsdGVybmF0ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhbHRlcm5hdGUuZWxpbWluYXRlKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHdhbGsuVmlzaXRvck9wdGlvbi5Ta2lwO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSgpKSxcclxuXHJcbiAgICAgICAgVmFyaWFibGVEZWNsYXJhdGlvbjogZnVuY3Rpb24obm9kZSwgY3R4KSB7XHJcbiAgICAgICAgICAgIGN0eC5pbkRlY2xhcmF0aW9uID0gdHJ1ZTtcclxuICAgICAgICB9LFxyXG5cclxuXHJcbiAgICAgICAgLyoqXHJcbiAgICAgICAgICogQHBhcmFtIHtPYmplY3R9IG5vZGVcclxuICAgICAgICAgKiBAcGFyYW0ge0NvbnRleHR9IHBhcmVudENvbnRleHRcclxuICAgICAgICAgKiBAcGFyYW0ge1R5cGVJbmZlcmVuY2V9IHJvb3RcclxuICAgICAgICAgKi9cclxuICAgICAgICBGdW5jdGlvbkRlY2xhcmF0aW9uOiBmdW5jdGlvbihub2RlLCBwYXJlbnRDb250ZXh0LCByb290KSB7XHJcbiAgICAgICAgICAgIHZhciByZXN1bHQgPSBuZXcgRnVuY3Rpb25Bbm5vdGF0aW9uKG5vZGUpO1xyXG5cclxuICAgICAgICAgICAgaWYgKG5vZGUuaWQudHlwZSAhPSBTeW50YXguSWRlbnRpZmllcikge1xyXG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiRHluYW1pYyB2YXJpYWJsZSBuYW1lcyBhcmUgbm90IHlldCBzdXBwb3J0ZWRcIik7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgdmFyIGZ1bmN0aW9uTmFtZSA9IG5vZGUuaWQubmFtZTtcclxuICAgICAgICAgICAgdmFyIGZ1bmN0aW9uQ29udGV4dCA9IHJvb3QuY3JlYXRlQ29udGV4dChub2RlLCBwYXJlbnRDb250ZXh0LCBmdW5jdGlvbk5hbWUpO1xyXG4gICAgICAgICAgICBmdW5jdGlvbkNvbnRleHQuZGVjbGFyZVBhcmFtZXRlcnMobm9kZS5wYXJhbXMpO1xyXG4gICAgICAgICAgICByb290LnB1c2hDb250ZXh0KGZ1bmN0aW9uQ29udGV4dCk7XHJcbiAgICAgICAgICAgIGlmKGZ1bmN0aW9uQ29udGV4dC5zdHIoKSAhPSByb290LmVudHJ5UG9pbnQpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiB3YWxrLlZpc2l0b3JPcHRpb24uU2tpcDtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICB2YXIgZXhpdEhhbmRsZXIgPSB7XHJcbiAgICAgICAgLyoqXHJcbiAgICAgICAgICogQHBhcmFtIG5vZGVcclxuICAgICAgICAgKiBAcGFyYW0ge0NvbnRleHR9IGN0eFxyXG4gICAgICAgICAqIEBwYXJhbSB7VHlwZUluZmVyZW5jZX0gcm9vdFxyXG4gICAgICAgICAqL1xyXG4gICAgICAgIEZ1bmN0aW9uRGVjbGFyYXRpb246IGZ1bmN0aW9uKG5vZGUsIGN0eCwgcm9vdCkge1xyXG4gICAgICAgICAgICB2YXIgcmVzdWx0ID0gbmV3IEZ1bmN0aW9uQW5ub3RhdGlvbihub2RlKTtcclxuICAgICAgICAgICAgdmFyIHJldHVybkluZm8gPSBjdHguZ2V0UmV0dXJuSW5mbygpO1xyXG4gICAgICAgICAgICByZXN1bHQuc2V0UmV0dXJuSW5mbyhyZXR1cm5JbmZvIHx8IHsgdHlwZTogVFlQRVMuVU5ERUZJTkVEIH0pO1xyXG4gICAgICAgICAgICByb290LnBvcENvbnRleHQoKTtcclxuICAgICAgICB9LFxyXG4gICAgICAgIFZhcmlhYmxlRGVjbGFyYXRpb246IGZ1bmN0aW9uKG5vZGUsIGN0eCkge1xyXG4gICAgICAgICAgICBjdHguaW5EZWNsYXJhdGlvbiA9IGZhbHNlO1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgVmFyaWFibGVEZWNsYXJhdG9yOiBmdW5jdGlvbihub2RlLCBjdHgpIHtcclxuICAgICAgICAgICAgdmFyIHJlc3VsdCA9IG5ldyBBbm5vdGF0aW9uKG5vZGUpO1xyXG5cclxuICAgICAgICAgICAgaWYgKG5vZGUuaWQudHlwZSAhPSBTeW50YXguSWRlbnRpZmllcikge1xyXG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiRHluYW1pYyB2YXJpYWJsZSBuYW1lcyBhcmUgbm90IHlldCBzdXBwb3J0ZWRcIik7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgdmFyIHZhcmlhYmxlTmFtZSA9IG5vZGUuaWQubmFtZTtcclxuICAgICAgICAgICAgY3R4LmRlY2xhcmVWYXJpYWJsZSh2YXJpYWJsZU5hbWUsIHRydWUsIHJlc3VsdCk7XHJcblxyXG4gICAgICAgICAgICBpZiAobm9kZS5pbml0KSB7XHJcbiAgICAgICAgICAgICAgICB2YXIgaW5pdCA9IGN0eC5jcmVhdGVUeXBlSW5mbyhub2RlLmluaXQpO1xyXG4gICAgICAgICAgICAgICAgcmVzdWx0LmNvcHkoaW5pdCk7XHJcbiAgICAgICAgICAgICAgICBjdHgudXBkYXRlRXhwcmVzc2lvbih2YXJpYWJsZU5hbWUsIGluaXQpO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgcmVzdWx0LnNldFR5cGUoVFlQRVMuVU5ERUZJTkVEKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAvLyBUT0RPOiByZXN1bHQuc2V0VHlwZShpbml0LmdldFR5cGUoKSk7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBSZXR1cm5TdGF0ZW1lbnQ6IGZ1bmN0aW9uKG5vZGUsIHBhcmVudCwgY3R4KSB7XHJcbiAgICAgICAgICAgIHZhciByZXN1bHQgPSBuZXcgQW5ub3RhdGlvbihub2RlKSxcclxuICAgICAgICAgICAgICAgIGFyZ3VtZW50ID0gbm9kZS5hcmd1bWVudCA/IGN0eC5jcmVhdGVUeXBlSW5mbyhub2RlLmFyZ3VtZW50KSA6IG51bGw7XHJcblxyXG4gICAgICAgICAgICBpZiAoYXJndW1lbnQpIHtcclxuICAgICAgICAgICAgICAgIHJlc3VsdC5jb3B5KGFyZ3VtZW50KTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHJlc3VsdC5zZXRUeXBlKFRZUEVTLlVOREVGSU5FRCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgY3R4LnVwZGF0ZVJldHVybkluZm8ocmVzdWx0KTtcclxuICAgICAgICB9XHJcblxyXG4gICAgfVxyXG5cclxuXHJcblxyXG5cclxuICAgIHZhciBlbnRlclN0YXRlbWVudCA9IGZ1bmN0aW9uIChub2RlLCBwYXJlbnQsIGN0eCkge1xyXG4gICAgICAgIHN3aXRjaCAobm9kZS50eXBlKSB7XHJcbiAgICAgICAgICAgIGNhc2UgU3ludGF4LkZvclN0YXRlbWVudDpcclxuICAgICAgICAgICAgICAgIHJldHVybiBlbnRlckhhbmRsZXIuRm9yU3RhdGVtZW50KG5vZGUsIGN0eCwgdGhpcyk7XHJcbiAgICAgICAgICAgIGNhc2UgU3ludGF4LklmU3RhdGVtZW50OlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGVudGVySGFuZGxlci5JZlN0YXRlbWVudChub2RlLCBjdHgsIHRoaXMpO1xyXG4gICAgICAgICAgICBjYXNlIFN5bnRheC5WYXJpYWJsZURlY2xhcmF0aW9uOlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGVudGVySGFuZGxlci5WYXJpYWJsZURlY2xhcmF0aW9uKG5vZGUsIGN0eCk7XHJcbiAgICAgICAgICAgIGNhc2UgU3ludGF4LkZ1bmN0aW9uRGVjbGFyYXRpb246XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gZW50ZXJIYW5kbGVyLkZ1bmN0aW9uRGVjbGFyYXRpb24obm9kZSwgY3R4LCB0aGlzKTtcclxuXHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybjtcclxuXHJcblxyXG4gICAgfTtcclxuXHJcbiAgICB2YXIgZXhpdFN0YXRlbWVudCA9IGZ1bmN0aW9uIChub2RlLCBwYXJlbnQsIGN0eCkge1xyXG5cclxuICAgICAgICBzd2l0Y2ggKG5vZGUudHlwZSkge1xyXG4gICAgICAgICAgICBjYXNlIFN5bnRheC5FeHByZXNzaW9uU3RhdGVtZW50OlxyXG4gICAgICAgICAgICAgICAgdmFyIHJlc3VsdCA9IG5ldyBBbm5vdGF0aW9uKG5vZGUpLFxyXG4gICAgICAgICAgICAgICAgICAgIGV4cHJlc3Npb24gPSBuZXcgQW5ub3RhdGlvbihub2RlLmV4cHJlc3Npb24pO1xyXG5cclxuICAgICAgICAgICAgICAgIHJlc3VsdC5jb3B5KGV4cHJlc3Npb24pO1xyXG5cclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIFN5bnRheC5CbG9ja1N0YXRlbWVudDpcclxuICAgICAgICAgICAgICAgIGxvZyhub2RlLnR5cGUgKyBcIiBpcyBub3QgaGFuZGxlIHlldC5cIik7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSBTeW50YXguQnJlYWtTdGF0ZW1lbnQ6XHJcbiAgICAgICAgICAgICAgICBsb2cobm9kZS50eXBlICsgXCIgaXMgbm90IGhhbmRsZSB5ZXQuXCIpO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgU3ludGF4LkNhdGNoQ2xhdXNlOlxyXG4gICAgICAgICAgICAgICAgbG9nKG5vZGUudHlwZSArIFwiIGlzIG5vdCBoYW5kbGUgeWV0LlwiKTtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIFN5bnRheC5Db250aW51ZVN0YXRlbWVudDpcclxuICAgICAgICAgICAgICAgIGxvZyhub2RlLnR5cGUgKyBcIiBpcyBub3QgaGFuZGxlIHlldC5cIik7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSBTeW50YXguRGlyZWN0aXZlU3RhdGVtZW50OlxyXG4gICAgICAgICAgICAgICAgbG9nKG5vZGUudHlwZSArIFwiIGlzIG5vdCBoYW5kbGUgeWV0LlwiKTtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIFN5bnRheC5Eb1doaWxlU3RhdGVtZW50OlxyXG4gICAgICAgICAgICAgICAgbG9nKG5vZGUudHlwZSArIFwiIGlzIG5vdCBoYW5kbGUgeWV0LlwiKTtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIFN5bnRheC5EZWJ1Z2dlclN0YXRlbWVudDpcclxuICAgICAgICAgICAgICAgIGxvZyhub2RlLnR5cGUgKyBcIiBpcyBub3QgaGFuZGxlIHlldC5cIik7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSBTeW50YXguRW1wdHlTdGF0ZW1lbnQ6XHJcbiAgICAgICAgICAgICAgICBsb2cobm9kZS50eXBlICsgXCIgaXMgbm90IGhhbmRsZSB5ZXQuXCIpO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgU3ludGF4LkZvclN0YXRlbWVudDpcclxuICAgICAgICAgICAgICAgIGxvZyhub2RlLnR5cGUgKyBcIiBpcyBub3QgaGFuZGxlIHlldC5cIik7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSBTeW50YXguRm9ySW5TdGF0ZW1lbnQ6XHJcbiAgICAgICAgICAgICAgICBsb2cobm9kZS50eXBlICsgXCIgaXMgbm90IGhhbmRsZSB5ZXQuXCIpO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgU3ludGF4LkZ1bmN0aW9uRGVjbGFyYXRpb246XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gZXhpdEhhbmRsZXIuRnVuY3Rpb25EZWNsYXJhdGlvbihub2RlLCBjdHgsIHRoaXMpO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgU3ludGF4LklmU3RhdGVtZW50OlxyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgU3ludGF4LkxhYmVsZWRTdGF0ZW1lbnQ6XHJcbiAgICAgICAgICAgICAgICBsb2cobm9kZS50eXBlICsgXCIgaXMgbm90IGhhbmRsZSB5ZXQuXCIpO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgU3ludGF4LlByb2dyYW06XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSBTeW50YXguUmV0dXJuU3RhdGVtZW50OlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGV4aXRIYW5kbGVyLlJldHVyblN0YXRlbWVudChub2RlLCBwYXJlbnQsIGN0eCk7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSBTeW50YXguU3dpdGNoU3RhdGVtZW50OlxyXG4gICAgICAgICAgICAgICAgbG9nKG5vZGUudHlwZSArIFwiIGlzIG5vdCBoYW5kbGUgeWV0LlwiKTtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIFN5bnRheC5Td2l0Y2hDYXNlOlxyXG4gICAgICAgICAgICAgICAgbG9nKG5vZGUudHlwZSArIFwiIGlzIG5vdCBoYW5kbGUgeWV0LlwiKTtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIFN5bnRheC5UaHJvd1N0YXRlbWVudDpcclxuICAgICAgICAgICAgICAgIGxvZyhub2RlLnR5cGUgKyBcIiBpcyBub3QgaGFuZGxlIHlldC5cIik7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSBTeW50YXguVHJ5U3RhdGVtZW50OlxyXG4gICAgICAgICAgICAgICAgbG9nKG5vZGUudHlwZSArIFwiIGlzIG5vdCBoYW5kbGUgeWV0LlwiKTtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIFN5bnRheC5WYXJpYWJsZURlY2xhcmF0aW9uOlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGV4aXRIYW5kbGVyLlZhcmlhYmxlRGVjbGFyYXRpb24obm9kZSwgY3R4KTtcclxuICAgICAgICAgICAgY2FzZSBTeW50YXguVmFyaWFibGVEZWNsYXJhdG9yOlxyXG4gICAgICAgICAgICAgICAgZXhpdEhhbmRsZXIuVmFyaWFibGVEZWNsYXJhdG9yKG5vZGUsIGN0eCk7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSBTeW50YXguV2hpbGVTdGF0ZW1lbnQ6XHJcbiAgICAgICAgICAgICAgICBsb2cobm9kZS50eXBlICsgXCIgaXMgbm90IGhhbmRsZSB5ZXQuXCIpO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgU3ludGF4LldpdGhTdGF0ZW1lbnQ6XHJcbiAgICAgICAgICAgICAgICBsb2cobm9kZS50eXBlICsgXCIgaXMgbm90IGhhbmRsZSB5ZXQuXCIpO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGRlZmF1bHQ6XHJcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1Vua25vd24gbm9kZSB0eXBlOiAnICsgbm9kZS50eXBlKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgfTtcclxuXHJcbiAgICBucy5lbnRlclN0YXRlbWVudCA9IGVudGVyU3RhdGVtZW50O1xyXG4gICAgbnMuZXhpdFN0YXRlbWVudCA9IGV4aXRTdGF0ZW1lbnQ7XHJcbn0oZXhwb3J0cykpO1xyXG4iLCIoZnVuY3Rpb24obnMpe1xyXG5cclxuICAgIHZhciBTaGFkZSA9IHJlcXVpcmUoXCIuLi8uLi8uLi9pbnRlcmZhY2VzLmpzXCIpLFxyXG4gICAgICAgIFRZUEVTID0gU2hhZGUuVFlQRVMsXHJcbiAgICAgICAgS0lORFMgPSBTaGFkZS5PQkpFQ1RfS0lORFMsXHJcbiAgICAgICAgVG9vbHMgPSByZXF1aXJlKFwiLi90b29scy5qc1wiKTtcclxuXHJcbiAgICB2YXIgQ29sb3JDbG9zdXJlSW5zdGFuY2UgPSB7XHJcbiAgICAgICAgbXVsdGlwbHk6IHtcclxuICAgICAgICAgICAgdHlwZTogVFlQRVMuRlVOQ1RJT04sXHJcbiAgICAgICAgICAgIGV2YWx1YXRlOiBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogVFlQRVMuT0JKRUNULFxyXG4gICAgICAgICAgICAgICAgICAgIGtpbmQ6IEtJTkRTLkNPTE9SX0NMT1NVUkVcclxuICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9LFxyXG4gICAgICAgIGFkZDoge1xyXG4gICAgICAgICAgICB0eXBlOiBUWVBFUy5GVU5DVElPTixcclxuICAgICAgICAgICAgZXZhbHVhdGU6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiBUWVBFUy5PQkpFQ1QsXHJcbiAgICAgICAgICAgICAgICAgICAga2luZDogS0lORFMuQ09MT1JfQ0xPU1VSRVxyXG4gICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH07XHJcblxyXG4gICAgVG9vbHMuZXh0ZW5kKG5zLCB7XHJcbiAgICAgICAgaWQ6IFwiQ29sb3JDbG9zdXJlXCIsXHJcbiAgICAgICAga2luZDogS0lORFMuQ09MT1JfQ0xPU1VSRSxcclxuICAgICAgICBvYmplY3Q6IG51bGwsXHJcbiAgICAgICAgaW5zdGFuY2U6IENvbG9yQ2xvc3VyZUluc3RhbmNlXHJcbiAgICB9KTtcclxuXHJcblxyXG59KGV4cG9ydHMpKTtcclxuIiwiKGZ1bmN0aW9uIChucykge1xyXG5cclxuICAgIHZhciBvYmplY3RzID0ge1xyXG4gICAgICAgIFNoYWRlIDogcmVxdWlyZShcIi4vc2hhZGUuanNcIiksXHJcbiAgICAgICAgTWF0cml4NCA6IHJlcXVpcmUoXCIuL21hdHJpeC5qc1wiKSxcclxuICAgICAgICBNYXRoIDogcmVxdWlyZShcIi4vbWF0aC5qc1wiKSxcclxuICAgICAgICBWZWMyIDogcmVxdWlyZShcIi4vdmVjMi5qc1wiKSxcclxuICAgICAgICBWZWMzIDogcmVxdWlyZShcIi4vdmVjMy5qc1wiKSxcclxuICAgICAgICBDb2xvcjogcmVxdWlyZShcIi4vdmVjMy5qc1wiKSxcclxuICAgICAgICBWZWM0IDogcmVxdWlyZShcIi4vdmVjNC5qc1wiKSxcclxuICAgICAgICBUZXh0dXJlIDogcmVxdWlyZShcIi4vdGV4dHVyZS5qc1wiKSxcclxuICAgICAgICBTeXN0ZW06IHJlcXVpcmUoXCIuL3N5c3RlbS5qc1wiKSxcclxuICAgICAgICBDb2xvckNsb3N1cmU6IHJlcXVpcmUoXCIuL2NvbG9yY2xvc3VyZS5qc1wiKVxyXG4gICAgfTtcclxuXHJcbiAgICBleHBvcnRzLlJlZ2lzdHJ5ID0ge1xyXG4gICAgICAgIG5hbWU6IFwiVHlwZUluZmVyZW5jZVwiLFxyXG4gICAgICAgIGdldEJ5TmFtZTogZnVuY3Rpb24obmFtZSkge1xyXG4gICAgICAgICAgICB2YXIgcmVzdWx0ID0gb2JqZWN0c1tuYW1lXTtcclxuICAgICAgICAgICAgcmV0dXJuIHJlc3VsdCB8fCBudWxsO1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgZ2V0SW5zdGFuY2VGb3JLaW5kOiBmdW5jdGlvbihraW5kKSB7XHJcbiAgICAgICAgICAgIGZvcih2YXIgb2JqIGluIG9iamVjdHMpIHtcclxuICAgICAgICAgICAgICAgIGlmIChvYmplY3RzW29ial0ua2luZCA9PSBraW5kKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG9iamVjdHNbb2JqXS5pbnN0YW5jZTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG59KGV4cG9ydHMpKTtcclxuIiwiKGZ1bmN0aW9uIChucykge1xyXG5cclxuICAgIHZhciBTaGFkZSA9IHJlcXVpcmUoXCIuLi8uLi8uLi9pbnRlcmZhY2VzLmpzXCIpLFxyXG4gICAgICAgIFRZUEVTID0gU2hhZGUuVFlQRVMsXHJcbiAgICAgICAgQmFzZSA9IHJlcXVpcmUoXCIuLi8uLi8uLi9iYXNlL2luZGV4LmpzXCIpLFxyXG4gICAgICAgIFRvb2xzID0gcmVxdWlyZShcIi4vdG9vbHMuanNcIik7XHJcblxyXG5cclxuICAgIHZhciBldmFsdWF0ZU1ldGhvZCA9IGZ1bmN0aW9uIChuYW1lLCBwYXJhbUNvdW50LCByZXR1cm5UeXBlKSB7XHJcbiAgICAgICAgLyoqXHJcbiAgICAgICAgICogQHBhcmFtIHtBbm5vdGF0aW9ufSByZXN1bHRcclxuICAgICAgICAgKiBAcGFyYW0ge0FycmF5LjxBbm5vdGF0aW9uPn0gYXJnc1xyXG4gICAgICAgICAqIEBwYXJhbSB7Q29udGV4dH0gY3R4XHJcbiAgICAgICAgICovXHJcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIChyZXN1bHQsIGFyZ3MsIGN0eCkge1xyXG4gICAgICAgICAgICBpZiAocGFyYW1Db3VudCAhPSAtMSkgeyAvLyBBcmJpdHJhcnkgbnVtYmVyIG9mIGFyZ3VtZW50c1xyXG4gICAgICAgICAgICAgICAgaWYgKCFhcmdzIHx8IGFyZ3MubGVuZ3RoICE9IHBhcmFtQ291bnQpIHtcclxuICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJJbnZhbGlkIG51bWJlciBvZiBwYXJhbWV0ZXJzIGZvciBNYXRoLlwiICsgbmFtZSArIFwiLCBleHBlY3RlZCBcIiArIHBhcmFtQ291bnQpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICB2YXIgYXJnQXJyYXkgPSBbXTtcclxuICAgICAgICAgICAgdmFyIGlzU3RhdGljID0gdHJ1ZTtcclxuICAgICAgICAgICAgYXJncy5mb3JFYWNoKGZ1bmN0aW9uIChwYXJhbSwgaW5kZXgpIHtcclxuICAgICAgICAgICAgICAgIGlmICghcGFyYW0uY2FuTnVtYmVyKCkpXHJcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiUGFyYW1ldGVyIFwiICsgaW5kZXggKyBcIiBoYXMgaW52YWxpZCB0eXBlIGZvciBNYXRoLlwiICsgbmFtZSArIFwiLCBleHBlY3RlZCAnbnVtYmVyJywgYnV0IGdvdCBcIiArIHBhcmFtLmdldFR5cGUoKSk7XHJcbiAgICAgICAgICAgICAgICBpc1N0YXRpYyA9IGlzU3RhdGljICYmIHBhcmFtLmhhc1N0YXRpY1ZhbHVlKCk7XHJcbiAgICAgICAgICAgICAgICBpZiAoaXNTdGF0aWMpXHJcbiAgICAgICAgICAgICAgICAgICAgYXJnQXJyYXkucHVzaChwYXJhbS5nZXRTdGF0aWNWYWx1ZSgpKTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIHZhciB0eXBlSW5mbyA9IHtcclxuICAgICAgICAgICAgICAgIHR5cGU6IHJldHVyblR5cGUgfHwgVFlQRVMuTlVNQkVSXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKGlzU3RhdGljKSB7XHJcbiAgICAgICAgICAgICAgICB0eXBlSW5mby5zdGF0aWNWYWx1ZSA9IE1hdGhbbmFtZV0uYXBwbHkodW5kZWZpbmVkLCBhcmdBcnJheSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmV0dXJuIHR5cGVJbmZvO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICB2YXIgTWF0aE9iamVjdCA9IHtcclxuICAgICAgICByYW5kb206IHtcclxuICAgICAgICAgICAgdHlwZTogVFlQRVMuRlVOQ1RJT04sXHJcbiAgICAgICAgICAgIGV2YWx1YXRlOiBmdW5jdGlvbihub2RlLCBhcmdzKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoYXJncy5sZW5ndGgpXHJcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiTWF0aC5yYW5kb20gaGFzIG5vIHBhcmFtZXRlcnMuXCIpO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiBUWVBFUy5OVU1CRVJcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgYWJzOiB7XHJcbiAgICAgICAgICAgIHR5cGU6IFRZUEVTLkZVTkNUSU9OLFxyXG4gICAgICAgICAgICBldmFsdWF0ZTogZnVuY3Rpb24ocmVzdWx0LCBhcmdzKSB7XHJcbiAgICAgICAgICAgICAgICBUb29scy5jaGVja1BhcmFtQ291bnQocmVzdWx0Lm5vZGUsIFwiTWF0aC5hYnNcIiwgWzFdLCBhcmdzLmxlbmd0aCk7XHJcbiAgICAgICAgICAgICAgICB2YXIgdHlwZUluZm8gPSB7fTtcclxuICAgICAgICAgICAgICAgIHN3aXRjaChhcmdzWzBdLmdldFR5cGUoKSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgVFlQRVMuTlVNQkVSOlxyXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgVFlQRVMuSU5UOlxyXG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlSW5mby50eXBlID0gYXJnc1swXS5nZXRUeXBlKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIFNoYWRlLnRocm93RXJyb3IocmVzdWx0Lm5vZGUsIFwiSW52YWxpZFR5cGUgZm9yIE1hdGguYWJzXCIpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHR5cGVJbmZvO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfTtcclxuXHJcbiAgICB2YXIgTWF0aENvbnN0YW50cyA9IFtcIkVcIiwgXCJQSVwiLCBcIkxOMlwiLCBcIkxPRzJFXCIsIFwiTE9HMTBFXCIsIFwiUElcIiwgXCJTUVJUMV8yXCIsIFwiU1FSVDJcIl07XHJcbiAgICB2YXIgT25lUGFyYW1ldGVyTnVtYmVyTWV0aG9kcyA9IFtcImFjb3NcIiwgXCJhc2luXCIsIFwiYXRhblwiLCBcImNvc1wiLCBcImV4cFwiLCBcImxvZ1wiLCBcInJvdW5kXCIsIFwic2luXCIsIFwic3FydFwiLCBcInRhblwiXTtcclxuICAgIHZhciBPbmVQYXJhbWV0ZXJJbnRNZXRob2RzID0gW1wiY2VpbFwiLCBcImZsb29yXCJdO1xyXG4gICAgdmFyIFR3b1BhcmFtZXRlck51bWJlck1ldGhvZHMgPSBbXCJhdGFuMlwiLCBcInBvd1wiXTtcclxuICAgIHZhciBBcmJpdHJhcnlQYXJhbWV0ZXJOdW1iZXJNZXRob2RzID0gW1wibWF4XCIsIFwibWluXCJdO1xyXG5cclxuICAgIE1hdGhDb25zdGFudHMuZm9yRWFjaChmdW5jdGlvbiAoY29uc3RhbnQpIHtcclxuICAgICAgICBNYXRoT2JqZWN0W2NvbnN0YW50XSA9IHsgdHlwZTogVFlQRVMuTlVNQkVSLCBzdGF0aWNWYWx1ZTogTWF0aFtjb25zdGFudF0gfTtcclxuICAgIH0pO1xyXG5cclxuICAgIE9uZVBhcmFtZXRlck51bWJlck1ldGhvZHMuZm9yRWFjaChmdW5jdGlvbiAobWV0aG9kKSB7XHJcbiAgICAgICAgTWF0aE9iamVjdFttZXRob2RdID0geyB0eXBlOiBUWVBFUy5GVU5DVElPTiwgZXZhbHVhdGU6IGV2YWx1YXRlTWV0aG9kKG1ldGhvZCwgMSkgfTtcclxuICAgIH0pO1xyXG5cclxuICAgIFR3b1BhcmFtZXRlck51bWJlck1ldGhvZHMuZm9yRWFjaChmdW5jdGlvbiAobWV0aG9kKSB7XHJcbiAgICAgICAgTWF0aE9iamVjdFttZXRob2RdID0geyB0eXBlOiBUWVBFUy5GVU5DVElPTiwgZXZhbHVhdGU6IGV2YWx1YXRlTWV0aG9kKG1ldGhvZCwgMikgfTtcclxuICAgIH0pO1xyXG5cclxuICAgIE9uZVBhcmFtZXRlckludE1ldGhvZHMuZm9yRWFjaChmdW5jdGlvbiAobWV0aG9kKSB7XHJcbiAgICAgICAgTWF0aE9iamVjdFttZXRob2RdID0geyB0eXBlOiBUWVBFUy5GVU5DVElPTiwgZXZhbHVhdGU6IGV2YWx1YXRlTWV0aG9kKG1ldGhvZCwgMSwgVFlQRVMuSU5UKSB9O1xyXG4gICAgfSk7XHJcblxyXG4gICAgQXJiaXRyYXJ5UGFyYW1ldGVyTnVtYmVyTWV0aG9kcy5mb3JFYWNoKGZ1bmN0aW9uIChtZXRob2QpIHtcclxuICAgICAgICBNYXRoT2JqZWN0W21ldGhvZF0gPSB7IHR5cGU6IFRZUEVTLkZVTkNUSU9OLCBldmFsdWF0ZTogZXZhbHVhdGVNZXRob2QobWV0aG9kLCAtMSkgfTtcclxuICAgIH0pO1xyXG5cclxuICAgIEJhc2UuZXh0ZW5kKG5zLCB7XHJcbiAgICAgICAgaWQ6IFwiTWF0aFwiLFxyXG4gICAgICAgIG9iamVjdDoge1xyXG4gICAgICAgICAgICBjb25zdHJ1Y3RvcjogbnVsbCxcclxuICAgICAgICAgICAgc3RhdGljOiBNYXRoT2JqZWN0XHJcbiAgICAgICAgfSxcclxuICAgICAgICBpbnN0YW5jZTogTWF0aE9iamVjdFxyXG4gICAgfSk7XHJcblxyXG5cclxufShleHBvcnRzKSk7XHJcbiIsIihmdW5jdGlvbiAobnMpIHtcclxuXHJcbiAgICB2YXIgaW50ZXJmYWNlcyA9IHJlcXVpcmUoXCIuLi8uLi8uLi9pbnRlcmZhY2VzLmpzXCIpLFxyXG4gICAgVG9vbHMgPSByZXF1aXJlKFwiLi90b29scy5qc1wiKTtcclxuXHJcbiAgICB2YXIgVFlQRVMgPSBpbnRlcmZhY2VzLlRZUEVTLFxyXG4gICAgICAgIEtJTkRTID0gaW50ZXJmYWNlcy5PQkpFQ1RfS0lORFM7XHJcblxyXG4gICAgdmFyIE1hdHJpeEluc3RhbmNlID0ge1xyXG4gICAgICAgIHRyYW5zZm9ybVBvaW50OiB7XHJcbiAgICAgICAgICAgIHR5cGU6IFRZUEVTLlVOREVGSU5FRCxcclxuICAgICAgICAgICAgZXZhbHVhdGU6IGZ1bmN0aW9uKHJlc3VsdCwgYXJncykge1xyXG4gICAgICAgICAgICAgICAgVG9vbHMuY2hlY2tQYXJhbUNvdW50KHJlc3VsdC5ub2RlLCBcIk1hdHJpeDo6dHJhbnNmb3JtUG9pbnRcIiwgWzEsMl0sIGFyZ3MubGVuZ3RoKTtcclxuICAgICAgICAgICAgICAgIHZhciBzb3VyY2VQb2ludCA9IHRhcmdldFBvaW50ID0gYXJnc1swXTtcclxuICAgICAgICAgICAgICAgIGlmICghKHNvdXJjZVBvaW50LmlzT2JqZWN0KCkgJiYgc291cmNlUG9pbnQuY2FuTm9ybWFsKCkpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiRmlyc3QgYXJndW1lbnQgb2YgTWF0cml4Ojp0cmFuc2Zvcm1Qb2ludCBtdXN0IGV2YWx1YXRlIHRvIGEgcG9pbnQsIGZvdW5kOiBcIiArIHNvdXJjZVBvaW50LmdldFR5cGVTdHJpbmcoKSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG5cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBUb29scy5leHRlbmQobnMsIHtcclxuICAgICAgICBpZDogXCJNYXRyaXg0XCIsXHJcbiAgICAgICAga2luZDogXCJtYXRyaXg0XCIsXHJcbiAgICAgICAgb2JqZWN0OiB7XHJcbiAgICAgICAgICAgIGNvbnN0cnVjdG9yOiBudWxsLFxyXG4gICAgICAgICAgICBzdGF0aWM6IG51bGxcclxuICAgICAgICB9LFxyXG4gICAgICAgIGluc3RhbmNlOiBNYXRyaXhJbnN0YW5jZVxyXG4gICAgfSk7XHJcblxyXG59KGV4cG9ydHMpKTtcclxuIiwiKGZ1bmN0aW9uKG5zKXtcclxuXHJcbiAgICB2YXIgU2hhZGUgPSByZXF1aXJlKFwiLi4vLi4vLi4vaW50ZXJmYWNlcy5qc1wiKSxcclxuICAgICAgICBUWVBFUyA9IFNoYWRlLlRZUEVTLFxyXG4gICAgICAgIEtJTkRTID0gU2hhZGUuT0JKRUNUX0tJTkRTLFxyXG4gICAgICAgIEJhc2UgPSByZXF1aXJlKFwiLi4vLi4vLi4vYmFzZS9pbmRleC5qc1wiKSxcclxuICAgICAgICBUb29scyA9IHJlcXVpcmUoXCIuL3Rvb2xzLmpzXCIpO1xyXG5cclxuICAgIHZhciBTaGFkZU9iamVjdCA9IHtcclxuICAgICAgICBkaWZmdXNlOiB7XHJcbiAgICAgICAgICAgIHR5cGU6IFRZUEVTLkZVTkNUSU9OLFxyXG4gICAgICAgICAgICBldmFsdWF0ZTogZnVuY3Rpb24ocmVzdWx0LCBhcmdzLCBjdHgpIHtcclxuICAgICAgICAgICAgICAgIGlmIChhcmdzLmxlbmd0aCA8IDEpXHJcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiU2hhZGUuZGlmZnVzZSBleHBlY3RzIGF0IGxlYXN0IDEgcGFyYW1ldGVyLlwiKVxyXG4gICAgICAgICAgICAgICAgdmFyIG5vcm1hbCA9IGFyZ3NbMF07XHJcbiAgICAgICAgICAgICAgICBpZighKG5vcm1hbCAmJiBub3JtYWwuY2FuTm9ybWFsKCkpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiRmlyc3QgYXJndW1lbnQgb2YgU2hhZGUuZGlmZnVzZSBtdXN0IGV2YWx1YXRlIHRvIGEgbm9ybWFsXCIpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgaWYgKGFyZ3MubGVuZ3RoID4gMSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciBjb2xvciA9IGFyZ3NbMV07XHJcbiAgICAgICAgICAgICAgICAgICAgLy9jb25zb2xlLmxvZyhcIkNvbG9yOiBcIiwgY29sb3Iuc3RyKCksIGNvbG9yLmdldFR5cGUoY3R4KSk7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYoIWNvbG9yLmNhbkNvbG9yKCkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiU2Vjb25kIGFyZ3VtZW50IG9mIFNoYWRlLmRpZmZ1c2UgbXVzdCBldmFsdWF0ZSB0byBhIGNvbG9yLiBGb3VuZDogXCIgKyBjb2xvci5zdHIoKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiBUWVBFUy5PQkpFQ1QsXHJcbiAgICAgICAgICAgICAgICAgICAga2luZDogS0lORFMuQ09MT1JfQ0xPU1VSRVxyXG4gICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgcGhvbmc6IHtcclxuICAgICAgICAgICAgdHlwZTogVFlQRVMuRlVOQ1RJT04sXHJcbiAgICAgICAgICAgIGV2YWx1YXRlOiBmdW5jdGlvbihyZXN1bHQsIGFyZ3MsIGN0eCkge1xyXG4gICAgICAgICAgICAgICAgaWYgKGFyZ3MubGVuZ3RoIDwgMSlcclxuICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJTaGFkZS5waG9uZyBleHBlY3RzIGF0IGxlYXN0IDEgcGFyYW1ldGVyLlwiKVxyXG4gICAgICAgICAgICAgICAgdmFyIG5vcm1hbCA9IGFyZ3NbMF07XHJcbiAgICAgICAgICAgICAgICBpZighKG5vcm1hbCAmJiBub3JtYWwuY2FuTm9ybWFsKCkpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiRmlyc3QgYXJndW1lbnQgb2YgU2hhZGUucGhvbmcgbXVzdCBldmFsdWF0ZSB0byBhIG5vcm1hbFwiKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGlmIChhcmdzLmxlbmd0aCA+IDEpIHtcclxuICAgICAgICAgICAgICAgICAgICB2YXIgc2hpbmluZXNzID0gYXJnc1sxXTtcclxuICAgICAgICAgICAgICAgICAgICAvL2NvbnNvbGUubG9nKFwiQ29sb3I6IFwiLCBjb2xvci5zdHIoKSwgY29sb3IuZ2V0VHlwZShjdHgpKTtcclxuICAgICAgICAgICAgICAgICAgICBpZighc2hpbmluZXNzLmNhbk51bWJlcigpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIlNlY29uZCBhcmd1bWVudCBvZiBTaGFkZS5waG9uZyBtdXN0IGV2YWx1YXRlIHRvIGEgbnVtYmVyLiBGb3VuZDogXCIgKyBjb2xvci5zdHIoKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiBUWVBFUy5PQkpFQ1QsXHJcbiAgICAgICAgICAgICAgICAgICAga2luZDogS0lORFMuQ09MT1JfQ0xPU1VSRVxyXG4gICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgY2xhbXA6IHtcclxuICAgICAgICAgICAgdHlwZTogVFlQRVMuRlVOQ1RJT04sXHJcbiAgICAgICAgICAgIGV2YWx1YXRlOiBmdW5jdGlvbihyZXN1bHQsIGFyZ3MpIHtcclxuICAgICAgICAgICAgICAgIFRvb2xzLmNoZWNrUGFyYW1Db3VudChyZXN1bHQubm9kZSwgXCJTaGFkZS5jbGFtcFwiLCBbM10sIGFyZ3MubGVuZ3RoKTtcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAoYXJncy5ldmVyeShmdW5jdGlvbihlKSB7IHJldHVybiBlLmNhbk51bWJlcigpOyB9KSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciB0eXBlSW5mbyA9IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogVFlQRVMuTlVNQkVSXHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChUb29scy5hbGxBcmd1bWVudHNBcmVTdGF0aWMoYXJncykpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGNhbGxBcmdzID0gYXJncy5tYXAoZnVuY3Rpb24oYSkge3JldHVybiBhLmdldFN0YXRpY1ZhbHVlKCk7IH0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlSW5mby5zdGF0aWNWYWx1ZSA9IFNoYWRlLlNoYWRlLmNsYW1wLmFwcGx5KG51bGwsIGNhbGxBcmdzKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHR5cGVJbmZvO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgU2hhZGUudGhyb3dFcnJvcihyZXN1bHQubm9kZSwgXCJTaGFkZS5jbGFtcCBub3Qgc3VwcG9ydGVkIHdpdGggYXJndW1lbnQgdHlwZXM6IFwiICsgYXJncy5tYXAoZnVuY3Rpb24oYXJnKSB7IHJldHVybiBhcmcuZ2V0VHlwZVN0cmluZygpOyB9KS5qb2luKFwiLCBcIikpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSxcclxuICAgICAgICBzbW9vdGhzdGVwOiB7XHJcbiAgICAgICAgICAgIHR5cGU6IFRZUEVTLkZVTkNUSU9OLFxyXG4gICAgICAgICAgICBldmFsdWF0ZTogZnVuY3Rpb24ocmVzdWx0LCBhcmdzLCBjdHgpIHtcclxuICAgICAgICAgICAgICAgIFRvb2xzLmNoZWNrUGFyYW1Db3VudChyZXN1bHQubm9kZSwgXCJTaGFkZS5zbW9vdGhzdGVwXCIsIFszXSwgYXJncy5sZW5ndGgpO1xyXG5cclxuICAgICAgICAgICAgICAgIGlmIChhcmdzLmV2ZXJ5KGZ1bmN0aW9uKGUpIHsgcmV0dXJuIGUuY2FuTnVtYmVyKCk7IH0pKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIHR5cGVJbmZvID0ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiBUWVBFUy5OVU1CRVJcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKFRvb2xzLmFsbEFyZ3VtZW50c0FyZVN0YXRpYyhhcmdzKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgY2FsbEFyZ3MgPSBhcmdzLm1hcChmdW5jdGlvbihhKSB7cmV0dXJuIGEuZ2V0U3RhdGljVmFsdWUoKTsgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGVJbmZvLnN0YXRpY1ZhbHVlID0gU2hhZGUuU2hhZGUuc21vb3Roc3RlcC5hcHBseShudWxsLCBjYWxsQXJncyk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0eXBlSW5mbztcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIFNoYWRlLnRocm93RXJyb3IocmVzdWx0Lm5vZGUsIFwiU2hhZGUuc21vb3Roc3RlcCBub3Qgc3VwcG9ydGVkIHdpdGggYXJndW1lbnQgdHlwZXM6IFwiICsgYXJncy5tYXAoZnVuY3Rpb24oYXJnKSB7IHJldHVybiBhcmcuZ2V0VHlwZVN0cmluZygpOyB9KS5qb2luKFwiLCBcIikpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSxcclxuICAgICAgICBzdGVwOiB7XHJcbiAgICAgICAgICAgIHR5cGU6IFRZUEVTLkZVTkNUSU9OLFxyXG4gICAgICAgICAgICBldmFsdWF0ZTogZnVuY3Rpb24ocmVzdWx0LCBhcmdzLCBjdHgpIHtcclxuICAgICAgICAgICAgICAgIFRvb2xzLmNoZWNrUGFyYW1Db3VudChyZXN1bHQubm9kZSwgXCJTaGFkZS5zdGVwXCIsIFsyXSwgYXJncy5sZW5ndGgpO1xyXG5cclxuICAgICAgICAgICAgICAgIGlmIChhcmdzLmV2ZXJ5KGZ1bmN0aW9uKGUpIHsgcmV0dXJuIGUuY2FuTnVtYmVyKCk7IH0pKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIHR5cGVJbmZvID0ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiBUWVBFUy5OVU1CRVJcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKFRvb2xzLmFsbEFyZ3VtZW50c0FyZVN0YXRpYyhhcmdzKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgY2FsbEFyZ3MgPSBhcmdzLm1hcChmdW5jdGlvbihhKSB7cmV0dXJuIGEuZ2V0U3RhdGljVmFsdWUoKTsgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGVJbmZvLnN0YXRpY1ZhbHVlID0gU2hhZGUuU2hhZGUuc3RlcC5hcHBseShudWxsLCBjYWxsQXJncyk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0eXBlSW5mbztcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIFNoYWRlLnRocm93RXJyb3IocmVzdWx0Lm5vZGUsIFwiU2hhZGUuc3RlcCBub3Qgc3VwcG9ydGVkIHdpdGggYXJndW1lbnQgdHlwZXM6IFwiICsgYXJncy5tYXAoZnVuY3Rpb24oYXJnKSB7IHJldHVybiBhcmcuZ2V0VHlwZVN0cmluZygpOyB9KS5qb2luKFwiLCBcIikpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSxcclxuICAgICAgICBmcmFjdDoge1xyXG4gICAgICAgICAgICB0eXBlOiBUWVBFUy5GVU5DVElPTixcclxuICAgICAgICAgICAgZXZhbHVhdGU6IFRvb2xzLlZlYy5hbnlWZWNBcmd1bWVudEV2YWx1YXRlLmJpbmQobnVsbCwgXCJTaGFkZS5mcmFjdFwiKVxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgbWl4OiB7XHJcbiAgICAgICAgICAgIHR5cGU6IFRZUEVTLkZVTkNUSU9OLFxyXG4gICAgICAgICAgICBldmFsdWF0ZTogZnVuY3Rpb24ocmVzdWx0LCBhcmdzLCBjdHgpIHtcclxuICAgICAgICAgICAgICAgIFRvb2xzLmNoZWNrUGFyYW1Db3VudChyZXN1bHQubm9kZSwgXCJTaGFkZS5taXhcIiwgWzNdLCBhcmdzLmxlbmd0aCk7XHJcblxyXG4gICAgICAgICAgICAgICAgdmFyIGFyZyA9IGFyZ3NbMF07XHJcblxyXG4gICAgICAgICAgICAgICAgdmFyIHR5cGVJbmZvID0ge307XHJcbiAgICAgICAgICAgICAgICB2YXIgY250ID0gVG9vbHMuVmVjLmNoZWNrQW55VmVjQXJndW1lbnQoXCJTaGFkZS5taXhcIiwgYXJnc1swXSk7XHJcbiAgICAgICAgICAgICAgICBCYXNlLmV4dGVuZCh0eXBlSW5mbywgVG9vbHMuVmVjLmdldFR5cGUoY250KSk7XHJcblxyXG4gICAgICAgICAgICAgICAgaWYoIWFyZ3NbMV0uZXF1YWxzKGFyZ3NbMF0pKVxyXG4gICAgICAgICAgICAgICAgICAgIFNoYWRlLnRocm93RXJyb3IocmVzdWx0Lm5vZGUsIFwiU2hhZGUubWl4IHR5cGVzIG9mIGZpcnN0IHR3byBhcmd1bWVudHMgZG8gbm8gbWF0Y2g6IGdvdCBcIiArIGFyZ1swXS5nZXRUeXBlU3RyaW5nKCkgK1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBcIiBhbmQgXCIgKyBhcmdbMV0uZ2V0VHlwZVN0cmluZygpICk7XHJcbiAgICAgICAgICAgICAgICBpZighYXJnc1syXS5jYW5OdW1iZXIoKSlcclxuICAgICAgICAgICAgICAgICAgICBTaGFkZS50aHJvd0Vycm9yKHJlc3VsdC5ub2RlLCBcIlNoYWRlLm1peCB0aGlyZCBhcmd1bWVudCBpcyBub3QgYSBudW1iZXIuXCIpO1xyXG5cclxuICAgICAgICAgICAgICAgIHJldHVybiB0eXBlSW5mbztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH07XHJcblxyXG4gICAgQmFzZS5leHRlbmQobnMsIHtcclxuICAgICAgICBpZDogXCJTaGFkZVwiLFxyXG4gICAgICAgIG9iamVjdDoge1xyXG4gICAgICAgICAgICBjb25zdHJ1Y3RvcjogbnVsbCxcclxuICAgICAgICAgICAgc3RhdGljOiBTaGFkZU9iamVjdFxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgaW5zdGFuY2U6IG51bGxcclxuICAgIH0pO1xyXG5cclxufShleHBvcnRzKSk7XHJcbiIsIihmdW5jdGlvbihucyl7XHJcblxyXG4gICAgdmFyIFNoYWRlID0gcmVxdWlyZShcIi4uLy4uLy4uL2ludGVyZmFjZXMuanNcIiksXHJcbiAgICAgICAgVFlQRVMgPSBTaGFkZS5UWVBFUyxcclxuICAgICAgICBLSU5EUyA9IFNoYWRlLk9CSkVDVF9LSU5EUyxcclxuICAgICAgICBCYXNlID0gcmVxdWlyZShcIi4uLy4uLy4uL2Jhc2UvaW5kZXguanNcIik7XHJcblxyXG4gICAgdmFyIFN5c3RlbU9iamVjdCA9IHtcclxuICAgICAgICBjb29yZHM6IHtcclxuICAgICAgICAgICAgdHlwZTogVFlQRVMuT0JKRUNULFxyXG4gICAgICAgICAgICBraW5kOiBLSU5EUy5GTE9BVDNcclxuICAgICAgICB9LFxyXG4gICAgICAgIG5vcm1hbGl6ZWRDb29yZHM6IHtcclxuICAgICAgICAgICAgdHlwZTogVFlQRVMuT0JKRUNULFxyXG4gICAgICAgICAgICBraW5kOiBLSU5EUy5GTE9BVDNcclxuICAgICAgICB9LFxyXG4gICAgICAgIGhlaWdodDoge1xyXG4gICAgICAgICAgICB0eXBlOiBUWVBFUy5JTlRcclxuICAgICAgICB9LFxyXG4gICAgICAgIHdpZHRoOiB7XHJcbiAgICAgICAgICAgIHR5cGU6IFRZUEVTLklOVFxyXG4gICAgICAgIH1cclxuXHJcbiAgICB9O1xyXG5cclxuICAgIEJhc2UuZXh0ZW5kKG5zLCB7XHJcbiAgICAgICAgaWQ6IFwiU3lzdGVtXCIsXHJcbiAgICAgICAgb2JqZWN0OiB7XHJcbiAgICAgICAgICAgIGNvbnN0cnVjdG9yOiBudWxsLFxyXG4gICAgICAgICAgICBzdGF0aWM6IFN5c3RlbU9iamVjdFxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgaW5zdGFuY2U6IG51bGxcclxuICAgIH0pO1xyXG5cclxufShleHBvcnRzKSk7XHJcbiIsIihmdW5jdGlvbihucyl7XHJcblxyXG4gICAgdmFyIFNoYWRlID0gcmVxdWlyZShcIi4uLy4uLy4uL2ludGVyZmFjZXMuanNcIiksXHJcbiAgICAgICAgVFlQRVMgPSBTaGFkZS5UWVBFUyxcclxuICAgICAgICBLSU5EUyA9IFNoYWRlLk9CSkVDVF9LSU5EUyxcclxuICAgICAgICBUb29scyA9IHJlcXVpcmUoXCIuL3Rvb2xzLmpzXCIpO1xyXG5cclxuICAgIHZhciBUZXh0dXJlQ29uc3RydWN0b3IgPSAge1xyXG4gICAgICAgIHR5cGU6IFRZUEVTLk9CSkVDVCxcclxuICAgICAgICBraW5kOiBLSU5EUy5URVhUVVJFLFxyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIEBwYXJhbSB7QW5ub3RhdGlvbn0gcmVzdWx0XHJcbiAgICAgICAgICogQHBhcmFtIHtBcnJheS48QW5ub3RhdGlvbj59IGFyZ3NcclxuICAgICAgICAgKiBAcGFyYW0ge0NvbnRleHR9IGN0eFxyXG4gICAgICAgICAqL1xyXG4gICAgICAgIGV2YWx1YXRlOiBmdW5jdGlvbihyZXN1bHQsIGFyZ3MsIGN0eCkge1xyXG4gICAgICAgICAgICBTaGFkZS50aHJvd0Vycm9yKHJlc3VsdC5ub2RlLCBcIkNvbnN0cnVjdGlvbiBvZiBUZXh0dXJlcyBpcyBub3Qgc3VwcG9ydGVkLlwiICk7XHJcbiAgICAgICAgfVxyXG4gICAgfTtcclxuXHJcbiAgICB2YXIgVGV4dHVyZVN0YXRpY09iamVjdCA9IHtcclxuICAgIH07XHJcblxyXG4gICAgdmFyIFRleHR1cmVJbnN0YW5jZSA9IHtcclxuICAgIH07XHJcbiAgICBUb29scy5WZWMuYXR0YWNoVmVjTWV0aG9kcyhUZXh0dXJlSW5zdGFuY2UsIFwiVGV4dHVyZVwiLCA0LCAyLCBbJ3NhbXBsZTJEJ10pO1xyXG5cclxuXHJcbiAgICBUb29scy5leHRlbmQobnMsIHtcclxuICAgICAgICBpZDogXCJUZXh0dXJlXCIsXHJcbiAgICAgICAga2luZDogS0lORFMuVEVYVFVSRSxcclxuICAgICAgICBvYmplY3Q6IHtcclxuICAgICAgICAgICAgY29uc3RydWN0b3I6IFRleHR1cmVDb25zdHJ1Y3RvcixcclxuICAgICAgICAgICAgc3RhdGljOiBUZXh0dXJlU3RhdGljT2JqZWN0XHJcbiAgICAgICAgfSxcclxuICAgICAgICBpbnN0YW5jZTogVGV4dHVyZUluc3RhbmNlXHJcbiAgICB9KTtcclxuXHJcblxyXG59KGV4cG9ydHMpKTtcclxuIiwiKGZ1bmN0aW9uKG5zKXtcclxuICAgIHZhciBCYXNlID0gcmVxdWlyZShcIi4uLy4uLy4uL2Jhc2UvaW5kZXguanNcIik7XHJcbiAgICB2YXIgU2hhZGUgPSByZXF1aXJlKFwiLi4vLi4vLi4vaW50ZXJmYWNlcy5qc1wiKSxcclxuICAgICAgICBUWVBFUyA9IFNoYWRlLlRZUEVTLFxyXG4gICAgICAgIEtJTkRTID0gU2hhZGUuT0JKRUNUX0tJTkRTLFxyXG4gICAgICAgIFZlY0Jhc2UgPSByZXF1aXJlKFwiLi4vLi4vLi4vYmFzZS92ZWMuanNcIik7XHJcblxyXG4gICAgdmFyIGFsbEFyZ3VtZW50c0FyZVN0YXRpYyA9IGZ1bmN0aW9uIChhcmdzKSB7XHJcbiAgICAgICAgcmV0dXJuIGFyZ3MuZXZlcnkoZnVuY3Rpb24gKGFyZykge1xyXG4gICAgICAgICAgICByZXR1cm4gYXJnLmhhc1N0YXRpY1ZhbHVlKClcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICBucy5jaGVja1BhcmFtQ291bnQgPSBmdW5jdGlvbihub2RlLCBuYW1lLCBhbGxvd2VkLCBpcykge1xyXG4gICAgICAgIGlmIChhbGxvd2VkLmluZGV4T2YoaXMpID09IC0xKSB7XHJcbiAgICAgICAgICAgIFNoYWRlLnRocm93RXJyb3Iobm9kZSwgXCJJbnZhbGlkIG51bWJlciBvZiBwYXJhbWV0ZXJzIGZvciBcIiArIG5hbWUgKyBcIiwgZXhwZWN0ZWQgXCIgKyBhbGxvd2VkLmpvaW4oXCIgb3IgXCIpICsgXCIsIGZvdW5kOiBcIiArIGlzKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgbnMuc2luZ2xlQWNjZXNzb3IgPSBmdW5jdGlvbiAobmFtZSwgb2JqLCB2YWxpZEFyZ0NvdW50cywgc3RhdGljVmFsdWVGdW5jdGlvbikge1xyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgIHR5cGU6IFRZUEVTLkZVTkNUSU9OLFxyXG4gICAgICAgICAgICBldmFsdWF0ZTogZnVuY3Rpb24gKHJlc3VsdCwgYXJncywgY3R4LCBjYWxsT2JqZWN0KSB7XHJcbiAgICAgICAgICAgICAgICBucy5jaGVja1BhcmFtQ291bnQocmVzdWx0Lm5vZGUsIG5hbWUsIHZhbGlkQXJnQ291bnRzLCBhcmdzLmxlbmd0aCk7XHJcbiAgICAgICAgICAgICAgICB2YXIgdHlwZUluZm8gPSAgYXJncy5sZW5ndGggPyBvYmogOiB7IHR5cGU6IFRZUEVTLk5VTUJFUiB9O1xyXG5cclxuICAgICAgICAgICAgICAgIGlmIChzdGF0aWNWYWx1ZUZ1bmN0aW9uICYmIGNhbGxPYmplY3QuaGFzU3RhdGljVmFsdWUoKSAmJiBhcmdzLmV2ZXJ5KGZ1bmN0aW9uKGEpIHtyZXR1cm4gYS5oYXNTdGF0aWNWYWx1ZSgpOyB9KSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGVJbmZvLnN0YXRpY1ZhbHVlID0gc3RhdGljVmFsdWVGdW5jdGlvbihjYWxsT2JqZWN0LmdldFN0YXRpY1ZhbHVlKCksIGFyZ3MpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHR5cGVJbmZvO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfTtcclxuXHJcbiAgICBucy5leHRlbmQgPSBCYXNlLmV4dGVuZDtcclxuXHJcbiAgICB2YXIgVmVjID0ge1xyXG4gICAgICAgIFRZUEVTOiB7XHJcbiAgICAgICAgICAgIDE6IHsgdHlwZTogVFlQRVMuTlVNQkVSIH0sXHJcbiAgICAgICAgICAgIDI6IHsgdHlwZTogVFlQRVMuT0JKRUNULCBraW5kOiBLSU5EUy5GTE9BVDIgfSxcclxuICAgICAgICAgICAgMzogeyB0eXBlOiBUWVBFUy5PQkpFQ1QsIGtpbmQ6IEtJTkRTLkZMT0FUMyB9LFxyXG4gICAgICAgICAgICA0OiB7IHR5cGU6IFRZUEVTLk9CSkVDVCwga2luZDogS0lORFMuRkxPQVQ0IH1cclxuICAgICAgICB9LFxyXG4gICAgICAgIGdldFR5cGU6IGZ1bmN0aW9uKGRlc3RWZWN0b3Ipe1xyXG4gICAgICAgICAgICByZXR1cm4gVmVjLlRZUEVTW2Rlc3RWZWN0b3JdO1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgZ2V0U3RhdGljVmFsdWU6IGZ1bmN0aW9uKHR5cGVJbmZvLCBtZXRob2ROYW1lLCBhcmdzLCBjYWxsT2JqZWN0KXtcclxuICAgICAgICAgICAgaWYoY2FsbE9iamVjdC5oYXNTdGF0aWNWYWx1ZSgpICYmIGFsbEFyZ3VtZW50c0FyZVN0YXRpYyhhcmdzKSl7XHJcbiAgICAgICAgICAgICAgICB2YXIgb2JqZWN0ID0gY2FsbE9iamVjdC5nZXRTdGF0aWNWYWx1ZSgpO1xyXG4gICAgICAgICAgICAgICAgdmFyIGNhbGxBcmdzID0gYXJncy5tYXAoZnVuY3Rpb24oYSkge3JldHVybiBhLmdldFN0YXRpY1ZhbHVlKCk7IH0pO1xyXG4gICAgICAgICAgICAgICAgdmFyIG1ldGhvZCA9IG9iamVjdFttZXRob2ROYW1lXTtcclxuICAgICAgICAgICAgICAgIGlmKG1ldGhvZClcclxuICAgICAgICAgICAgICAgICAgICB0eXBlSW5mby5zdGF0aWNWYWx1ZSA9IG1ldGhvZC5hcHBseShvYmplY3QsIGNhbGxBcmdzKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgY2hlY2tBbnlWZWNBcmd1bWVudDogZnVuY3Rpb24obWV0aG9kTmFtZSwgYXJnKXtcclxuICAgICAgICAgICAgdmFyIGNudDtcclxuXHJcbiAgICAgICAgICAgIGlmKGFyZy5jYW5OdW1iZXIoKSkgY250ID0gMTtcclxuICAgICAgICAgICAgZWxzZSBpZihhcmcuaXNPZktpbmQoS0lORFMuRkxPQVQyKSkgY250ID0gMjtcclxuICAgICAgICAgICAgZWxzZSBpZihhcmcuaXNPZktpbmQoS0lORFMuRkxPQVQzKSkgY250ID0gMztcclxuICAgICAgICAgICAgZWxzZSBpZihhcmcuaXNPZktpbmQoS0lORFMuRkxPQVQ0KSkgY250ID0gNDtcclxuICAgICAgICAgICAgZWxzZSBTaGFkZS50aHJvd0Vycm9yKHJlc3VsdC5ub2RlLCBcIkludmFsaWQgcGFyYW1ldGVyIGZvciBcIiArIG1ldGhvZE5hbWUgKyBcIiwgdHlwZSAnXCIgK1xyXG4gICAgICAgICAgICAgICAgICAgIGFyZy5nZXRUeXBlU3RyaW5nKCkgKyBcIicgaXMgbm90IHN1cHBvcnRlZFwiKTtcclxuICAgICAgICAgICAgcmV0dXJuIGNudDtcclxuICAgICAgICB9LFxyXG4gICAgICAgIGNoZWNrVmVjQXJndW1lbnRzOiBmdW5jdGlvbihtZXRob2ROYW1lLCB2ZWNTaXplLCB3aXRoRW1wdHksIGFyZ1N0YXJ0LCByZXN1bHQsIGFyZ3Mpe1xyXG4gICAgICAgICAgICB3aXRoRW1wdHkgPSAod2l0aEVtcHR5IHx8IHZlY1NpemUgPT0gMCk7XHJcbiAgICAgICAgICAgIHZhciBhbGxvd2VkID0gW107XHJcbiAgICAgICAgICAgIGZvcih2YXIgaSA9IHdpdGhFbXB0eSA/IDAgOiAxOyBpIDw9IHZlY1NpemU7ICsraSkgYWxsb3dlZC5wdXNoKGkgKyBhcmdTdGFydCk7XHJcbiAgICAgICAgICAgIG5zLmNoZWNrUGFyYW1Db3VudChyZXN1bHQubm9kZSwgbWV0aG9kTmFtZSwgYWxsb3dlZCwgYXJncy5sZW5ndGgpO1xyXG5cclxuICAgICAgICAgICAgaWYod2l0aEVtcHR5ICYmIGFyZ3MubGVuZ3RoIC0gYXJnU3RhcnQgPT0gMClcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuXHJcbiAgICAgICAgICAgIGlmKGFyZ3MubGVuZ3RoIC0gYXJnU3RhcnQ9PSAxICYmIGFyZ3NbMF0uY2FuTnVtYmVyKCkpXHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcblxyXG4gICAgICAgICAgICB2YXIgaWR4ID0gMDtcclxuICAgICAgICAgICAgZm9yKHZhciBpID0gYXJnU3RhcnQ7IGlkeCA8IHZlY1NpemUgJiYgaSA8IGFyZ3MubGVuZ3RoOyArK2kpe1xyXG4gICAgICAgICAgICAgICAgdmFyIGFyZz0gYXJnc1tpXSwgY250O1xyXG4gICAgICAgICAgICAgICAgaWYoYXJnLmNhbk51bWJlcigpKSBjbnQgPSAxO1xyXG4gICAgICAgICAgICAgICAgZWxzZSBpZihhcmcuaXNPZktpbmQoS0lORFMuRkxPQVQyKSkgY250ID0gMjtcclxuICAgICAgICAgICAgICAgIGVsc2UgaWYoYXJnLmlzT2ZLaW5kKEtJTkRTLkZMT0FUMykpIGNudCA9IDM7XHJcbiAgICAgICAgICAgICAgICBlbHNlIGlmKGFyZy5pc09mS2luZChLSU5EUy5GTE9BVDQpKSBjbnQgPSA0O1xyXG4gICAgICAgICAgICAgICAgZWxzZSBpZihhcmcuaXNPZktpbmQoS0lORFMuTUFUUklYMykpIGNudCA9IDk7XHJcbiAgICAgICAgICAgICAgICBlbHNlIGlmKGFyZy5pc09mS2luZChLSU5EUy5NQVRSSVg0KSkgY250ID0gMTY7XHJcbiAgICAgICAgICAgICAgICBlbHNlIFNoYWRlLnRocm93RXJyb3IocmVzdWx0Lm5vZGUsIFwiSW52YWxpZCBwYXJhbWV0ZXIgZm9yIFwiICsgbWV0aG9kTmFtZSArIFwiLCB0eXBlICdcIiArIGFyZy5nZXRUeXBlU3RyaW5nKCkgKyBcIicgaXMgbm90IHN1cHBvcnRlZFwiKTtcclxuICAgICAgICAgICAgICAgIGlkeCArPSBjbnQ7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmKGlkeCA8IHZlY1NpemUpXHJcbiAgICAgICAgICAgICAgICBTaGFkZS50aHJvd0Vycm9yKHJlc3VsdC5ub2RlLCBcIkludmFsaWQgcGFyYW1ldGVycyBmb3IgXCIgKyBtZXRob2ROYW1lICsgXCIsIGV4cGVjdGVkIFwiICsgdmVjU2l6ZSArIFwiIHNjYWxhciB2YWx1ZXMsIGdvdCBcIiArIGlkeCk7XHJcbiAgICAgICAgICAgIGVsc2UgaWYoaSA8IGFyZ3MubGVuZ3RoKXtcclxuICAgICAgICAgICAgICAgIFNoYWRlLnRocm93RXJyb3IocmVzdWx0Lm5vZGUsIFwiSW52YWxpZCBwYXJhbWV0ZXJzIGZvciBcIiArIG1ldGhvZE5hbWUgKyBcIiwgdG9vIG1hbnkgcGFyYW1ldGVyc1wiKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0sXHJcblxyXG4gICAgICAgIHZlY0V2YWx1YXRlOiBmdW5jdGlvbihvYmplY3ROYW1lLCBtZXRob2ROYW1lLCBkZXN0VmVjU2l6ZSwgc3JjVmVjU2l6ZSwgcmVzdWx0LCBhcmdzLCBjdHgsIGNhbGxPYmplY3Qpe1xyXG4gICAgICAgICAgICBWZWMuY2hlY2tWZWNBcmd1bWVudHMob2JqZWN0TmFtZSArIFwiLlwiICsgbWV0aG9kTmFtZSwgc3JjVmVjU2l6ZSwgZmFsc2UsIDAsIHJlc3VsdCwgYXJncyk7XHJcblxyXG4gICAgICAgICAgICB2YXIgdHlwZUluZm8gPSB7fTtcclxuICAgICAgICAgICAgQmFzZS5leHRlbmQodHlwZUluZm8sIFZlYy5nZXRUeXBlKGRlc3RWZWNTaXplKSk7XHJcblxyXG4gICAgICAgICAgICBWZWMuZ2V0U3RhdGljVmFsdWUodHlwZUluZm8sIG1ldGhvZE5hbWUsIGFyZ3MsIGNhbGxPYmplY3QpO1xyXG4gICAgICAgICAgICByZXR1cm4gdHlwZUluZm87XHJcbiAgICAgICAgfSxcclxuICAgICAgICBhbnlWZWNBcmd1bWVudEV2YWx1YXRlOiBmdW5jdGlvbihtZXRob2ROYW1lLCByZXN1bHQsIGFyZ3MsIGN0eCwgY2FsbE9iamVjdCl7XHJcbiAgICAgICAgICAgIG5zLmNoZWNrUGFyYW1Db3VudChyZXN1bHQubm9kZSwgbWV0aG9kTmFtZSwgWzFdLCBhcmdzLmxlbmd0aCk7XHJcbiAgICAgICAgICAgIHZhciBhcmcgPSBhcmdzWzBdO1xyXG5cclxuICAgICAgICAgICAgdmFyIHR5cGVJbmZvID0ge307XHJcbiAgICAgICAgICAgIHZhciBjbnQgPSBWZWMuY2hlY2tBbnlWZWNBcmd1bWVudChtZXRob2ROYW1lLCBhcmcpO1xyXG4gICAgICAgICAgICBCYXNlLmV4dGVuZCh0eXBlSW5mbywgVmVjLmdldFR5cGUoY250KSk7XHJcblxyXG4gICAgICAgICAgICBWZWMuZ2V0U3RhdGljVmFsdWUodHlwZUluZm8sIG1ldGhvZE5hbWUsIGFyZ3MsIGNhbGxPYmplY3QpO1xyXG4gICAgICAgICAgICByZXR1cm4gdHlwZUluZm87XHJcbiAgICAgICAgfSxcclxuXHJcbiAgICAgICAgb3B0aW9uYWxaZXJvRXZhbHVhdGU6IGZ1bmN0aW9uKG9iamVjdE5hbWUsIG1ldGhvZE5hbWUsIGRlc3RWZWNTaXplLCB6ZXJvRGVzdFZlY1NpemUsIHNyY1ZlY1NpemUsIHJlc3VsdCwgYXJncywgY3R4LCBjYWxsT2JqZWN0KSB7XHJcbiAgICAgICAgICAgIHZhciBxdWFsaWZpZWROYW1lID0gb2JqZWN0TmFtZSArIFwiLlwiICsgbWV0aG9kTmFtZTtcclxuICAgICAgICAgICAgdmFyIHR5cGVJbmZvID0ge307XHJcblxyXG4gICAgICAgICAgICBpZihhcmdzLmxlbmd0aCA9PSAwKXtcclxuICAgICAgICAgICAgICAgIEJhc2UuZXh0ZW5kKHR5cGVJbmZvLCBWZWMuZ2V0VHlwZSh6ZXJvRGVzdFZlY1NpemUpKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBlbHNle1xyXG4gICAgICAgICAgICAgICAgVmVjLmNoZWNrVmVjQXJndW1lbnRzKHF1YWxpZmllZE5hbWUsIHNyY1ZlY1NpemUsIHRydWUsIDAsIHJlc3VsdCwgYXJncyk7XHJcbiAgICAgICAgICAgICAgICBCYXNlLmV4dGVuZCh0eXBlSW5mbywgVmVjLmdldFR5cGUoZGVzdFZlY1NpemUpKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBWZWMuZ2V0U3RhdGljVmFsdWUodHlwZUluZm8sIG1ldGhvZE5hbWUsIGFyZ3MsIGNhbGxPYmplY3QpO1xyXG5cclxuICAgICAgICAgICAgcmV0dXJuIHR5cGVJbmZvO1xyXG4gICAgICAgIH0sXHJcblxyXG4gICAgICAgIHN3aXp6bGVFdmFsdWF0ZTogZnVuY3Rpb24ob2JqZWN0TmFtZSwgdmVjU2l6ZSwgc3dpenpsZSwgd2l0aFNldHRlciwgcmVzdWx0LCBhcmdzLCBjdHgsIGNhbGxPYmplY3QpIHtcclxuICAgICAgICAgICAgaWYod2l0aFNldHRlcil7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gVmVjLm9wdGlvbmFsWmVyb0V2YWx1YXRlKG9iamVjdE5hbWUsIHN3aXp6bGUsIHZlY1NpemUsIHN3aXp6bGUubGVuZ3RoLCBzd2l6emxlLmxlbmd0aCxcclxuICAgICAgICAgICAgICAgICAgICByZXN1bHQsIGFyZ3MsIGN0eCwgY2FsbE9iamVjdCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZWxzZXtcclxuICAgICAgICAgICAgICAgIHJldHVybiBWZWMudmVjRXZhbHVhdGUob2JqZWN0TmFtZSwgc3dpenpsZSwgc3dpenpsZS5sZW5ndGgsIDAsIHJlc3VsdCwgYXJncywgY3R4LCBjYWxsT2JqZWN0KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgZ2V0U3dpenpsZUV2YWx1YXRlOiBmdW5jdGlvbihvYmplY3ROYW1lLCB2ZWNTaXplLCBzd2l6emxlKXtcclxuICAgICAgICAgICAgdmFyIGluZGljZXMgPSBbXSwgd2l0aFNldHRlciA9IChzd2l6emxlLmxlbmd0aCA8PSB2ZWNTaXplKTtcclxuICAgICAgICAgICAgZm9yKHZhciBpID0gMDsgd2l0aFNldHRlciAmJiBpIDwgc3dpenpsZS5sZW5ndGg7ICsraSl7XHJcbiAgICAgICAgICAgICAgICB2YXIgaWR4ID0gVmVjQmFzZS5zd2l6emxlVG9JbmRleChzd2l6emxlLmNoYXJBdChpKSk7XHJcbiAgICAgICAgICAgICAgICBpZihpbmRpY2VzW2lkeF0pXHJcbiAgICAgICAgICAgICAgICAgICAgd2l0aFNldHRlciA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgZWxzZVxyXG4gICAgICAgICAgICAgICAgICAgIGluZGljZXNbaWR4XSA9IHRydWU7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmV0dXJuICB7XHJcbiAgICAgICAgICAgICAgICB0eXBlOiBUWVBFUy5GVU5DVElPTixcclxuICAgICAgICAgICAgICAgIGV2YWx1YXRlOiBWZWMuc3dpenpsZUV2YWx1YXRlLmJpbmQobnVsbCwgb2JqZWN0TmFtZSwgdmVjU2l6ZSwgc3dpenpsZSwgd2l0aFNldHRlcilcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgYXR0YWNoU3dpenpsZXM6IGZ1bmN0aW9uIChpbnN0YW5jZSwgb2JqZWN0TmFtZSwgdmVjQ291bnQpe1xyXG4gICAgICAgICAgICBmb3IodmFyIHMgPSAwOyBzIDwgVmVjQmFzZS5zd2l6emxlU2V0cy5sZW5ndGg7ICsrcyl7XHJcbiAgICAgICAgICAgICAgICBmb3IodmFyIGNvdW50ID0gMTsgY291bnQgPD0gNDsgKytjb3VudCl7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIG1heCA9IE1hdGgucG93KHZlY0NvdW50LCBjb3VudCk7XHJcbiAgICAgICAgICAgICAgICAgICAgIGZvcih2YXIgaSA9IDA7IGkgPCBtYXg7ICsraSl7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciB2YWwgPSBpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIga2V5ID0gXCJcIjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZm9yKHZhciAgaiA9IDA7IGogPCBjb3VudDsgKytqKXtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBpZHggPSB2YWwgJSB2ZWNDb3VudDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhbCA9IE1hdGguZmxvb3IodmFsIC8gdmVjQ291bnQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAga2V5Kz0gVmVjQmFzZS5zd2l6emxlU2V0c1tzXVtpZHhdO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGluc3RhbmNlW2tleV0gPSBWZWMuZ2V0U3dpenpsZUV2YWx1YXRlKG9iamVjdE5hbWUsIHZlY0NvdW50LCBrZXkpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgYXR0YWNoVmVjTWV0aG9kczogZnVuY3Rpb24oaW5zdGFuY2UsIG9iamVjdE5hbWUsIGRlc3RWZWNTaXplLCBzcmNWZWNTaXplLCBtZXRob2ROYW1lcyl7XHJcbiAgICAgICAgICAgIGZvcih2YXIgaSA9IDA7IGkgPCBtZXRob2ROYW1lcy5sZW5ndGg7ICsraSl7XHJcbiAgICAgICAgICAgICAgICB2YXIgbWV0aG9kTmFtZSA9IG1ldGhvZE5hbWVzW2ldO1xyXG4gICAgICAgICAgICAgICAgaW5zdGFuY2VbbWV0aG9kTmFtZV0gPSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogVFlQRVMuRlVOQ1RJT04sXHJcbiAgICAgICAgICAgICAgICAgICAgZXZhbHVhdGU6IFZlYy52ZWNFdmFsdWF0ZS5iaW5kKG51bGwsIG9iamVjdE5hbWUsIG1ldGhvZE5hbWUsIGRlc3RWZWNTaXplLCBzcmNWZWNTaXplKVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSxcclxuXHJcbiAgICAgICAgZ2V0Q29uc3RydWN0b3JUeXBlSW5mbzogZnVuY3Rpb24ob2JqZWN0TmFtZSwgdmVjU2l6ZSwgdHlwZSwgcmVzdWx0LCBhcmdzKXtcclxuICAgICAgICAgICAgdmFyIGFyZ0FycmF5ID0gW107XHJcbiAgICAgICAgICAgIHZhciBpc1N0YXRpYyA9IHRydWU7XHJcbiAgICAgICAgICAgIGFyZ3MuZm9yRWFjaChmdW5jdGlvbiAocGFyYW0sIGluZGV4KSB7XHJcbiAgICAgICAgICAgICAgICBpc1N0YXRpYyA9IGlzU3RhdGljICYmIHBhcmFtLmhhc1N0YXRpY1ZhbHVlKCk7XHJcbiAgICAgICAgICAgICAgICBpZiAoaXNTdGF0aWMpXHJcbiAgICAgICAgICAgICAgICAgICAgYXJnQXJyYXkucHVzaChwYXJhbS5nZXRTdGF0aWNWYWx1ZSgpKTtcclxuICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICB2YXIgdHlwZUluZm8gPSBCYXNlLmV4dGVuZCh7fSwgdHlwZSk7XHJcblxyXG4gICAgICAgICAgICBpZiAoaXNTdGF0aWMpIHtcclxuICAgICAgICAgICAgICAgIHZhciB2ID0gbmV3IFNoYWRlW29iamVjdE5hbWVdKCk7XHJcbiAgICAgICAgICAgICAgICBTaGFkZVtvYmplY3ROYW1lXS5hcHBseSh2LCBhcmdBcnJheSk7XHJcbiAgICAgICAgICAgICAgICB0eXBlSW5mby5zdGF0aWNWYWx1ZSA9IHY7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmV0dXJuIHR5cGVJbmZvO1xyXG4gICAgICAgIH0sXHJcblxyXG4gICAgICAgIGNvbnN0cnVjdG9yRXZhbHVhdGU6IGZ1bmN0aW9uKG9iamVjdE5hbWUsIHZlY1NpemUsIHJlc3VsdCwgYXJncywgY3R4KSB7XHJcbiAgICAgICAgICAgIFZlYy5jaGVja1ZlY0FyZ3VtZW50cyhvYmplY3ROYW1lLCB2ZWNTaXplLCB0cnVlLCAwLCByZXN1bHQsIGFyZ3MpO1xyXG4gICAgICAgICAgICByZXR1cm4gVmVjLmdldENvbnN0cnVjdG9yVHlwZUluZm8ob2JqZWN0TmFtZSwgdmVjU2l6ZSwgVmVjLmdldFR5cGUodmVjU2l6ZSksIHJlc3VsdCwgYXJncyk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgIH07XHJcblxyXG4gICAgdmFyIE1hdCA9IHtcclxuICAgICAgICBUWVBFUzoge1xyXG4gICAgICAgICAgICBcIk1hdDNcIjogeyB0eXBlOiB7IHR5cGU6IFRZUEVTLk9CSkVDVCwga2luZDogS0lORFMuTUFUUklYMyB9LCBjb2xzOiAzLCByb3dzOiAzIH0sXHJcbiAgICAgICAgICAgIFwiTWF0NFwiOiB7IHR5cGU6IHsgdHlwZTogVFlQRVMuT0JKRUNULCBraW5kOiBLSU5EUy5NQVRSSVg0IH0sIGNvbHM6IDQsIHJvd3M6IDQgfVxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgZ2V0VHlwZTogZnVuY3Rpb24obWF0TmFtZSl7XHJcbiAgICAgICAgICAgIHJldHVybiBNYXQuVFlQRVNbbWF0TmFtZV0udHlwZTtcclxuICAgICAgICB9LFxyXG4gICAgICAgIGdldFZlY1NpemU6IGZ1bmN0aW9uKG1hdE5hbWUpe1xyXG4gICAgICAgICAgICByZXR1cm4gTWF0LlRZUEVTW21hdE5hbWVdLmNvbHMgKiBNYXQuVFlQRVNbbWF0TmFtZV0ucm93cztcclxuICAgICAgICB9LFxyXG4gICAgICAgIGNoZWNrTWF0QXJndW1lbnRzOiBmdW5jdGlvbihtZXRob2ROYW1lLCBtYXROYW1lLCB3aXRoRW1wdHksIHJlc3VsdCwgYXJncyl7XHJcbiAgICAgICAgICAgIGlmKGFyZ3MubGVuZ3RoID09IDEgJiYgKGFyZ3NbMF0uaXNPZktpbmQoS0lORFMuTUFUUklYMykgfHwgYXJnc1swXS5pc09mS2luZChLSU5EUy5NQVRSSVg0KSkpXHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcblxyXG4gICAgICAgICAgICBmb3IodmFyIGkgPSAwOyBpIDwgYXJncy5sZW5ndGg7ICsraSl7XHJcbiAgICAgICAgICAgICAgICBpZihhcmdzW2ldLmlzT2ZLaW5kKEtJTkRTLk1BVFJJWDMpIHx8IGFyZ3NbaV0uaXNPZktpbmQoS0lORFMuTUFUUklYNCkpXHJcbiAgICAgICAgICAgICAgICAgICAgU2hhZGUudGhyb3dFcnJvcihyZXN1bHQubm9kZSwgXCJJbnZhbGlkIHBhcmFtZXRlciBmb3IgXCIgKyBtZXRob2ROYW1lICsgXCI6IENvbnN0cnVjdGluZyBNYXRyaXggZnJvbSBNYXRyaXggY2FuIG9ubHkgdGFrZSBvbmUgYXJndW1lbnRcIik7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgVmVjLmNoZWNrVmVjQXJndW1lbnRzKG1ldGhvZE5hbWUsIE1hdC5nZXRWZWNTaXplKG1hdE5hbWUpLCB3aXRoRW1wdHksIDAsIHJlc3VsdCwgYXJncyk7XHJcbiAgICAgICAgfSxcclxuXHJcbiAgICAgICAgbWF0RXZhbHVhdGU6IGZ1bmN0aW9uKG1hdE5hbWUsIG1ldGhvZE5hbWUsIHJlc3VsdCwgYXJncywgY3R4LCBjYWxsT2JqZWN0KXtcclxuICAgICAgICAgICAgTWF0LmNoZWNrTWF0QXJndW1lbnRzKG1hdE5hbWUgKyBcIi5cIiArIG1ldGhvZE5hbWUsIG1hdE5hbWUsIGZhbHNlLCByZXN1bHQsIGFyZ3MpO1xyXG5cclxuICAgICAgICAgICAgdmFyIHR5cGVJbmZvID0ge307XHJcbiAgICAgICAgICAgIEJhc2UuZXh0ZW5kKHR5cGVJbmZvLCBNYXQuZ2V0VHlwZShtYXROYW1lKSk7XHJcblxyXG4gICAgICAgICAgICBWZWMuZ2V0U3RhdGljVmFsdWUodHlwZUluZm8sIG1ldGhvZE5hbWUsIGFyZ3MsIGNhbGxPYmplY3QpO1xyXG4gICAgICAgICAgICByZXR1cm4gdHlwZUluZm87XHJcbiAgICAgICAgfSxcclxuXHJcbiAgICAgICAgbWF0Q29uc3RydWN0b3JFdmFsdWF0ZTogZnVuY3Rpb24obWF0TmFtZSwgcmVzdWx0LCBhcmdzLCBjdHgpe1xyXG4gICAgICAgICAgICBNYXQuY2hlY2tNYXRBcmd1bWVudHMobWF0TmFtZSwgbWF0TmFtZSwgdHJ1ZSwgcmVzdWx0LCBhcmdzKTtcclxuICAgICAgICAgICAgcmV0dXJuIFZlYy5nZXRDb25zdHJ1Y3RvclR5cGVJbmZvKG1hdE5hbWUsIE1hdC5nZXRWZWNTaXplKG1hdE5hbWUpLCBNYXQuZ2V0VHlwZShtYXROYW1lKSwgcmVzdWx0LCBhcmdzKTtcclxuICAgICAgICB9LFxyXG5cclxuICAgICAgICBhdHRhY2hNYXRNZXRob2RzOiBmdW5jdGlvbihpbnN0YW5jZSwgbWF0TmFtZSwgbWV0aG9kTmFtZXMpe1xyXG4gICAgICAgICAgICBmb3IodmFyIGkgPSAwOyBpIDwgbWV0aG9kTmFtZXMubGVuZ3RoOyArK2kpe1xyXG4gICAgICAgICAgICAgICAgdmFyIG1ldGhvZE5hbWUgPSBtZXRob2ROYW1lc1tpXTtcclxuICAgICAgICAgICAgICAgIGluc3RhbmNlW21ldGhvZE5hbWVdID0ge1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IFRZUEVTLkZVTkNUSU9OLFxyXG4gICAgICAgICAgICAgICAgICAgIGV2YWx1YXRlOiBNYXQubWF0RXZhbHVhdGUuYmluZChudWxsLCBtYXROYW1lLCBtZXRob2ROYW1lKVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSxcclxuICAgICAgICBjb2xFdmFsdWF0ZTogZnVuY3Rpb24obWF0TmFtZSwgcmVzdWx0LCBhcmdzLCBjdHgsIGNhbGxPYmplY3QpIHtcclxuICAgICAgICAgICAgdmFyIHF1YWxpZmllZE5hbWUgPSBtYXROYW1lICsgXCIuY29sXCI7XHJcbiAgICAgICAgICAgIHZhciB0eXBlSW5mbyA9IHt9O1xyXG5cclxuICAgICAgICAgICAgdmFyIGNvbHMgPSBNYXQuVFlQRVNbbWF0TmFtZV0uY29scywgcm93cyA9IE1hdC5UWVBFU1ttYXROYW1lXS5yb3dzO1xyXG5cclxuICAgICAgICAgICAgaWYoYXJncy5sZW5ndGggPiAxKXtcclxuICAgICAgICAgICAgICAgIFZlYy5jaGVja1ZlY0FyZ3VtZW50cyhxdWFsaWZpZWROYW1lLCByb3dzLCB0cnVlLCAxLCByZXN1bHQsIGFyZ3MpO1xyXG4gICAgICAgICAgICAgICAgQmFzZS5leHRlbmQodHlwZUluZm8sIE1hdC5nZXRUeXBlKG1hdE5hbWUpKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBlbHNle1xyXG4gICAgICAgICAgICAgICAgbnMuY2hlY2tQYXJhbUNvdW50KHJlc3VsdC5ub2RlLCBxdWFsaWZpZWROYW1lLCBbMV0sIGFyZ3MubGVuZ3RoKTtcclxuICAgICAgICAgICAgICAgIEJhc2UuZXh0ZW5kKHR5cGVJbmZvLCBWZWMuZ2V0VHlwZShyb3dzKSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYoIWFyZ3NbMF0uY2FuTnVtYmVyKCkpe1xyXG4gICAgICAgICAgICAgICAgU2hhZGUudGhyb3dFcnJvcihyZXN1bHQubm9kZSwgXCJJbnZhbGlkIHBhcmFtZXRlciBmb3IgXCIgKyBxdWFsaWZpZWROYW1lICsgXCIsIGZpcnN0IHBhcmFtZXRlciBtdXN0IGJlIGEgbnVtYmVyLlwiKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgVmVjLmdldFN0YXRpY1ZhbHVlKHR5cGVJbmZvLCBcImNvbFwiLCBhcmdzLCBjYWxsT2JqZWN0KTtcclxuXHJcbiAgICAgICAgICAgIHJldHVybiB0eXBlSW5mbztcclxuICAgICAgICB9XHJcblxyXG4gICAgfVxyXG5cclxuICAgIG5zLlZlYyA9IFZlYztcclxuICAgIG5zLk1hdCA9IE1hdDtcclxuICAgIG5zLmFsbEFyZ3VtZW50c0FyZVN0YXRpYyA9IGFsbEFyZ3VtZW50c0FyZVN0YXRpYztcclxuXHJcblxyXG59KGV4cG9ydHMpKTtcclxuIiwiKGZ1bmN0aW9uKG5zKXtcclxuXHJcbiAgICB2YXIgU2hhZGUgPSByZXF1aXJlKFwiLi4vLi4vLi4vaW50ZXJmYWNlcy5qc1wiKSxcclxuICAgICAgICBUWVBFUyA9IFNoYWRlLlRZUEVTLFxyXG4gICAgICAgIEtJTkRTID0gU2hhZGUuT0JKRUNUX0tJTkRTLFxyXG4gICAgICAgIFRvb2xzID0gcmVxdWlyZShcIi4vdG9vbHMuanNcIik7XHJcblxyXG4gICAgdmFyIFZlY3RvcjJDb25zdHJ1Y3RvciA9ICB7XHJcbiAgICAgICAgdHlwZTogVFlQRVMuT0JKRUNULFxyXG4gICAgICAgIGtpbmQ6IEtJTkRTLkZMT0FUMixcclxuICAgICAgICAvKipcclxuICAgICAgICAgKiBAcGFyYW0ge0Fubm90YXRpb259IHJlc3VsdFxyXG4gICAgICAgICAqIEBwYXJhbSB7QXJyYXkuPEFubm90YXRpb24+fSBhcmdzXHJcbiAgICAgICAgICogQHBhcmFtIHtDb250ZXh0fSBjdHhcclxuICAgICAgICAgKi9cclxuICAgICAgICBldmFsdWF0ZTogVG9vbHMuVmVjLmNvbnN0cnVjdG9yRXZhbHVhdGUuYmluZChudWxsLCBcIlZlYzJcIiwgMilcclxuICAgIH07XHJcblxyXG4gICAgdmFyIFZlY3RvcjJTdGF0aWNPYmplY3QgPSB7XHJcbiAgICB9O1xyXG5cclxuICAgIHZhciBWZWN0b3IySW5zdGFuY2UgPSB7XHJcbiAgICAgICAgbGVuZ3RoOiB7XHJcbiAgICAgICAgICAgIHR5cGU6IFRZUEVTLkZVTkNUSU9OLFxyXG4gICAgICAgICAgICBldmFsdWF0ZTogVG9vbHMuVmVjLm9wdGlvbmFsWmVyb0V2YWx1YXRlLmJpbmQobnVsbCxcIlZlYzJcIiwgXCJsZW5ndGhcIiwgMiwgMSwgMSlcclxuICAgICAgICB9XHJcbiAgICB9O1xyXG4gICAgVG9vbHMuVmVjLmF0dGFjaFN3aXp6bGVzKFZlY3RvcjJJbnN0YW5jZSwgXCJWZWMyXCIsIDIpO1xyXG4gICAgVG9vbHMuVmVjLmF0dGFjaFZlY01ldGhvZHMoVmVjdG9yMkluc3RhbmNlLCBcIlZlYzJcIiwgMiwgMiwgWydhZGQnLCAnc3ViJywgJ211bCcsICdkaXYnLCAnbW9kJ10pO1xyXG4gICAgVG9vbHMuVmVjLmF0dGFjaFZlY01ldGhvZHMoVmVjdG9yMkluc3RhbmNlLCBcIlZlYzJcIiwgMSwgMiwgWydkb3QnXSk7XHJcbiAgICBUb29scy5WZWMuYXR0YWNoVmVjTWV0aG9kcyhWZWN0b3IySW5zdGFuY2UsIFwiVmVjMlwiLCAyLCAwLCBbJ25vcm1hbGl6ZSddKTtcclxuXHJcblxyXG4gICAgVG9vbHMuZXh0ZW5kKG5zLCB7XHJcbiAgICAgICAgaWQ6IFwiVmVjMlwiLFxyXG4gICAgICAgIGtpbmQ6IEtJTkRTLkZMT0FUMixcclxuICAgICAgICBvYmplY3Q6IHtcclxuICAgICAgICAgICAgY29uc3RydWN0b3I6IFZlY3RvcjJDb25zdHJ1Y3RvcixcclxuICAgICAgICAgICAgc3RhdGljOiBWZWN0b3IyU3RhdGljT2JqZWN0XHJcbiAgICAgICAgfSxcclxuICAgICAgICBpbnN0YW5jZTogVmVjdG9yMkluc3RhbmNlXHJcbiAgICB9KTtcclxuXHJcblxyXG59KGV4cG9ydHMpKTtcclxuIiwiKGZ1bmN0aW9uKG5zKXtcclxuXHJcbiAgICB2YXIgU2hhZGUgPSByZXF1aXJlKFwiLi4vLi4vLi4vaW50ZXJmYWNlcy5qc1wiKSxcclxuICAgICAgICBUWVBFUyA9IFNoYWRlLlRZUEVTLFxyXG4gICAgICAgIEtJTkRTID0gU2hhZGUuT0JKRUNUX0tJTkRTLFxyXG4gICAgICAgIFRvb2xzID0gcmVxdWlyZShcIi4vdG9vbHMuanNcIik7XHJcblxyXG4gICAgdmFyIFZlY3RvcjNDb25zdHJ1Y3RvciA9ICB7XHJcbiAgICAgICAgdHlwZTogVFlQRVMuT0JKRUNULFxyXG4gICAgICAgIGtpbmQ6IEtJTkRTLkZMT0FUMyxcclxuICAgICAgICAvKipcclxuICAgICAgICAgKiBAcGFyYW0ge0Fubm90YXRpb259IHJlc3VsdFxyXG4gICAgICAgICAqIEBwYXJhbSB7QXJyYXkuPEFubm90YXRpb24+fSBhcmdzXHJcbiAgICAgICAgICogQHBhcmFtIHtDb250ZXh0fSBjdHhcclxuICAgICAgICAgKi9cclxuICAgICAgICBldmFsdWF0ZTogVG9vbHMuVmVjLmNvbnN0cnVjdG9yRXZhbHVhdGUuYmluZChudWxsLCBcIlZlYzNcIiwgMylcclxuICAgIH07XHJcblxyXG4gICAgdmFyIFZlY3RvcjNTdGF0aWNPYmplY3QgPSB7XHJcbiAgICB9O1xyXG5cclxuICAgIHZhciBWZWN0b3IzSW5zdGFuY2UgPSB7XHJcbiAgICAgICAgbGVuZ3RoOiB7XHJcbiAgICAgICAgICAgIHR5cGU6IFRZUEVTLkZVTkNUSU9OLFxyXG4gICAgICAgICAgICBldmFsdWF0ZTogVG9vbHMuVmVjLm9wdGlvbmFsWmVyb0V2YWx1YXRlLmJpbmQobnVsbCxcIlZlYzNcIiwgXCJsZW5ndGhcIiwgMywgMSwgMSlcclxuICAgICAgICB9XHJcbiAgICB9O1xyXG4gICAgVG9vbHMuVmVjLmF0dGFjaFN3aXp6bGVzKFZlY3RvcjNJbnN0YW5jZSwgXCJWZWMzXCIsIDMpO1xyXG4gICAgVG9vbHMuVmVjLmF0dGFjaFZlY01ldGhvZHMoVmVjdG9yM0luc3RhbmNlLCBcIlZlYzNcIiwgMywgMywgWydhZGQnLCAnc3ViJywgJ211bCcsICdkaXYnLCAnbW9kJ10pO1xyXG4gICAgVG9vbHMuVmVjLmF0dGFjaFZlY01ldGhvZHMoVmVjdG9yM0luc3RhbmNlLCBcIlZlYzNcIiwgMSwgMywgWydkb3QnXSk7XHJcbiAgICBUb29scy5WZWMuYXR0YWNoVmVjTWV0aG9kcyhWZWN0b3IzSW5zdGFuY2UsIFwiVmVjM1wiLCAzLCAwLCBbJ25vcm1hbGl6ZSddKTtcclxuXHJcblxyXG4gICAgVG9vbHMuZXh0ZW5kKG5zLCB7XHJcbiAgICAgICAgaWQ6IFwiVmVjM1wiLFxyXG4gICAgICAgIGtpbmQ6IEtJTkRTLkZMT0FUMyxcclxuICAgICAgICBvYmplY3Q6IHtcclxuICAgICAgICAgICAgY29uc3RydWN0b3I6IFZlY3RvcjNDb25zdHJ1Y3RvcixcclxuICAgICAgICAgICAgc3RhdGljOiBWZWN0b3IzU3RhdGljT2JqZWN0XHJcbiAgICAgICAgfSxcclxuICAgICAgICBpbnN0YW5jZTogVmVjdG9yM0luc3RhbmNlXHJcbiAgICB9KTtcclxuXHJcblxyXG59KGV4cG9ydHMpKTtcclxuIiwiKGZ1bmN0aW9uKG5zKXtcclxuXHJcbiAgICB2YXIgU2hhZGUgPSByZXF1aXJlKFwiLi4vLi4vLi4vaW50ZXJmYWNlcy5qc1wiKSxcclxuICAgICAgICBUWVBFUyA9IFNoYWRlLlRZUEVTLFxyXG4gICAgICAgIEtJTkRTID0gU2hhZGUuT0JKRUNUX0tJTkRTLFxyXG4gICAgICAgIFRvb2xzID0gcmVxdWlyZShcIi4vdG9vbHMuanNcIik7XHJcblxyXG4gICAgdmFyIFZlY3RvcjRDb25zdHJ1Y3RvciA9ICB7XHJcbiAgICAgICAgdHlwZTogVFlQRVMuT0JKRUNULFxyXG4gICAgICAgIGtpbmQ6IEtJTkRTLkZMT0FUNCxcclxuICAgICAgICAvKipcclxuICAgICAgICAgKiBAcGFyYW0ge0Fubm90YXRpb259IHJlc3VsdFxyXG4gICAgICAgICAqIEBwYXJhbSB7QXJyYXkuPEFubm90YXRpb24+fSBhcmdzXHJcbiAgICAgICAgICogQHBhcmFtIHtDb250ZXh0fSBjdHhcclxuICAgICAgICAgKi9cclxuICAgICAgICBldmFsdWF0ZTogVG9vbHMuVmVjLmNvbnN0cnVjdG9yRXZhbHVhdGUuYmluZChudWxsLCBcIlZlYzRcIiwgNClcclxuICAgIH07XHJcblxyXG4gICAgdmFyIFZlY3RvcjRTdGF0aWNPYmplY3QgPSB7XHJcbiAgICB9O1xyXG5cclxuICAgIHZhciBWZWN0b3I0SW5zdGFuY2UgPSB7XHJcbiAgICAgICAgbGVuZ3RoOiB7XHJcbiAgICAgICAgICAgIHR5cGU6IFRZUEVTLkZVTkNUSU9OLFxyXG4gICAgICAgICAgICBldmFsdWF0ZTogVG9vbHMuVmVjLm9wdGlvbmFsWmVyb0V2YWx1YXRlLmJpbmQobnVsbCxcIlZlYzRcIiwgXCJsZW5ndGhcIiwgNCwgMSwgMSlcclxuICAgICAgICB9XHJcbiAgICB9O1xyXG4gICAgVG9vbHMuVmVjLmF0dGFjaFN3aXp6bGVzKFZlY3RvcjRJbnN0YW5jZSwgXCJWZWM0XCIsIDQpO1xyXG4gICAgVG9vbHMuVmVjLmF0dGFjaFZlY01ldGhvZHMoVmVjdG9yNEluc3RhbmNlLCBcIlZlYzRcIiwgNCwgNCwgWydhZGQnLCAnc3ViJywgJ211bCcsICdkaXYnLCAnbW9kJ10pO1xyXG4gICAgVG9vbHMuVmVjLmF0dGFjaFZlY01ldGhvZHMoVmVjdG9yNEluc3RhbmNlLCBcIlZlYzRcIiwgMSwgNCwgWydkb3QnXSk7XHJcbiAgICBUb29scy5WZWMuYXR0YWNoVmVjTWV0aG9kcyhWZWN0b3I0SW5zdGFuY2UsIFwiVmVjNFwiLCA0LCAwLCBbJ25vcm1hbGl6ZSddKTtcclxuXHJcblxyXG4gICAgVG9vbHMuZXh0ZW5kKG5zLCB7XHJcbiAgICAgICAgaWQ6IFwiVmVjNFwiLFxyXG4gICAgICAgIGtpbmQ6IEtJTkRTLkZMT0FUNCxcclxuICAgICAgICBvYmplY3Q6IHtcclxuICAgICAgICAgICAgY29uc3RydWN0b3I6IFZlY3RvcjRDb25zdHJ1Y3RvcixcclxuICAgICAgICAgICAgc3RhdGljOiBWZWN0b3I0U3RhdGljT2JqZWN0XHJcbiAgICAgICAgfSxcclxuICAgICAgICBpbnN0YW5jZTogVmVjdG9yNEluc3RhbmNlXHJcbiAgICB9KTtcclxuXHJcblxyXG59KGV4cG9ydHMpKTtcclxuIiwiKGZ1bmN0aW9uIChucykge1xyXG4gICAgLyoqXHJcbiAgICAgKiBTaGFkZS5qcyBzcGVjaWZpYyB0eXBlIGluZmVyZW5jZSB0aGF0IGlzIGFsc28gaW5mZXJyaW5nXHJcbiAgICAgKiB2aXJ0dWFsIHR5cGVzIHtAbGluayBTaGFkZS5UWVBFUyB9XHJcbiAgICAgKi9cclxuXHJcbiAgICB2YXIgd2FsayA9IHJlcXVpcmUoJ2VzdHJhdmVyc2UnKSxcclxuICAgICAgICBlbnRlckV4cHJlc3Npb24gPSByZXF1aXJlKCcuL2luZmVyX2V4cHJlc3Npb24uanMnKS5lbnRlckV4cHJlc3Npb24sXHJcbiAgICAgICAgZXhpdEV4cHJlc3Npb24gPSByZXF1aXJlKCcuL2luZmVyX2V4cHJlc3Npb24uanMnKS5leGl0RXhwcmVzc2lvbixcclxuICAgICAgICBlbnRlclN0YXRlbWVudCA9IHJlcXVpcmUoJy4vaW5mZXJfc3RhdGVtZW50LmpzJykuZW50ZXJTdGF0ZW1lbnQsXHJcbiAgICAgICAgZXhpdFN0YXRlbWVudCA9IHJlcXVpcmUoJy4vaW5mZXJfc3RhdGVtZW50LmpzJykuZXhpdFN0YXRlbWVudCxcclxuXHJcbiAgICAgICAgT2JqZWN0UmVnaXN0cnkgPSByZXF1aXJlKFwiLi9yZWdpc3RyeS9pbmRleC5qc1wiKS5SZWdpc3RyeSxcclxuICAgICAgICBDb250ZXh0ID0gcmVxdWlyZShcIi4vLi4vLi4vYmFzZS9jb250ZXh0LmpzXCIpLmdldENvbnRleHQoT2JqZWN0UmVnaXN0cnkpLFxyXG4gICAgICAgIEJhc2UgPSByZXF1aXJlKFwiLi4vLi4vYmFzZS9pbmRleC5qc1wiKSxcclxuICAgICAgICBBbm5vdGF0aW9uID0gcmVxdWlyZShcIi4vLi4vLi4vYmFzZS9hbm5vdGF0aW9uLmpzXCIpLkFubm90YXRpb24sXHJcbiAgICAgICAgRnVuY3Rpb25Bbm5vdGF0aW9uID0gcmVxdWlyZShcIi4vLi4vLi4vYmFzZS9hbm5vdGF0aW9uLmpzXCIpLkZ1bmN0aW9uQW5ub3RhdGlvbjtcclxuXHJcblxyXG5cclxuICAgIHZhciBTeW50YXggPSB3YWxrLlN5bnRheDtcclxuXHJcblxyXG4gICAgdmFyIHJlZ2lzdGVyR2xvYmFsQ29udGV4dCA9IGZ1bmN0aW9uIChwcm9ncmFtKSB7XHJcbiAgICAgICAgdmFyIGN0eCA9IG5ldyBDb250ZXh0KHByb2dyYW0sIG51bGwsIHtuYW1lOiBcImdsb2JhbFwifSk7XHJcbiAgICAgICAgY3R4LnJlZ2lzdGVyT2JqZWN0KFwiTWF0aFwiLCBPYmplY3RSZWdpc3RyeS5nZXRCeU5hbWUoXCJNYXRoXCIpKTtcclxuICAgICAgICBjdHgucmVnaXN0ZXJPYmplY3QoXCJDb2xvclwiLCBPYmplY3RSZWdpc3RyeS5nZXRCeU5hbWUoXCJDb2xvclwiKSk7XHJcbiAgICAgICAgY3R4LnJlZ2lzdGVyT2JqZWN0KFwiVmVjMlwiLCBPYmplY3RSZWdpc3RyeS5nZXRCeU5hbWUoXCJWZWMyXCIpKTtcclxuICAgICAgICBjdHgucmVnaXN0ZXJPYmplY3QoXCJWZWMzXCIsIE9iamVjdFJlZ2lzdHJ5LmdldEJ5TmFtZShcIlZlYzNcIikpO1xyXG4gICAgICAgIGN0eC5yZWdpc3Rlck9iamVjdChcIlZlYzRcIiwgT2JqZWN0UmVnaXN0cnkuZ2V0QnlOYW1lKFwiVmVjNFwiKSk7XHJcbiAgICAgICAgY3R4LnJlZ2lzdGVyT2JqZWN0KFwiVGV4dHVyZVwiLCBPYmplY3RSZWdpc3RyeS5nZXRCeU5hbWUoXCJUZXh0dXJlXCIpKTtcclxuICAgICAgICBjdHgucmVnaXN0ZXJPYmplY3QoXCJTaGFkZVwiLCBPYmplY3RSZWdpc3RyeS5nZXRCeU5hbWUoXCJTaGFkZVwiKSk7XHJcbiAgICAgICAgY3R4LnJlZ2lzdGVyT2JqZWN0KFwidGhpc1wiLCBPYmplY3RSZWdpc3RyeS5nZXRCeU5hbWUoXCJTeXN0ZW1cIikpO1xyXG4gICAgICAgIHJldHVybiBjdHg7XHJcbiAgICB9XHJcblxyXG4gICAgdmFyIFR5cGVJbmZlcmVuY2UgPSBmdW5jdGlvbiAocm9vdCwgb3B0KSB7XHJcbiAgICAgICAgb3B0ID0gb3B0IHx8IHt9O1xyXG4gICAgICAgIHRoaXMucm9vdCA9IHJvb3Q7XHJcbiAgICAgICAgdGhpcy5jb250ZXh0ID0gW107XHJcbiAgICAgICAgLyoqIEB0eXBlIHtPYmplY3QuPFN0cmluZywgQXJyYXkuPFR5cGVJbmZvPn0gKiovXHJcbiAgICAgICAgdGhpcy5pbmplY3Rpb25zID0ge307XHJcbiAgICAgICAgdGhpcy5lbnRyeVBvaW50ID0gb3B0LmVudHJ5IHx8IFwiZ2xvYmFsLnNoYWRlXCI7XHJcbiAgICAgICAgdGhpcy5yb290LmluamVjdGlvbnMgPSB0aGlzLmluamVjdGlvbnM7XHJcbiAgICAgICAgdGhpcy5mdW5jdGlvbnMgPSB7XHJcbiAgICAgICAgICAgIG9yaWc6IHt9LFxyXG4gICAgICAgICAgICBkZXJpdmVkOiB7fVxyXG4gICAgICAgIH1cclxuXHJcbiAgICB9XHJcblxyXG4gICAgQmFzZS5leHRlbmQoVHlwZUluZmVyZW5jZS5wcm90b3R5cGUsIHtcclxuICAgICAgICBwdXNoQ29udGV4dDogZnVuY3Rpb24gKGNvbnRleHQpIHtcclxuICAgICAgICAgICAgdGhpcy5jb250ZXh0LnB1c2goY29udGV4dCk7XHJcbiAgICAgICAgICAgIHZhciBpbmplY3Rpb24gPSB0aGlzLmluamVjdGlvbnNbY29udGV4dC5zdHIoKV07XHJcbiAgICAgICAgICAgIGlmIChpbmplY3Rpb24pIHtcclxuICAgICAgICAgICAgICAgIGNvbnRleHQuaW5qZWN0UGFyYW1ldGVycyhpbmplY3Rpb24pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSxcclxuICAgICAgICBwb3BDb250ZXh0OiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgIHRoaXMuY29udGV4dC5wb3AoKTtcclxuICAgICAgICB9LFxyXG4gICAgICAgIHBlZWtDb250ZXh0OiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmNvbnRleHRbdGhpcy5jb250ZXh0Lmxlbmd0aCAtIDFdO1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgY3JlYXRlQ29udGV4dDogZnVuY3Rpb24gKG5vZGUsIHBhcmVudENvbnRleHQsIG5hbWUpIHtcclxuICAgICAgICAgICB2YXIgcmVzdWx0ID0gbmV3IENvbnRleHQobm9kZSwgcGFyZW50Q29udGV4dCwge25hbWU6IG5hbWUgfSApO1xyXG4gICAgICAgICAgIHJldHVybiByZXN1bHQ7XHJcbiAgICAgICAgfSxcclxuXHJcbiAgICAgICAgYW5ub3RhdGVQYXJhbWV0ZXJzOiBmdW5jdGlvbihhcnIpIHtcclxuICAgICAgICAgICAgcmV0dXJuIGFyciA/IGFyci5tYXAoZnVuY3Rpb24ocGFyYW0pIHtcclxuICAgICAgICAgICAgICAgIHZhciBhbm5vdGF0ZWQgPSAgbmV3IEFubm90YXRpb24ocGFyYW0pO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGFubm90YXRlZDtcclxuICAgICAgICAgICAgfSkgOiBbXTtcclxuICAgICAgICB9LFxyXG5cclxuXHJcbiAgICAgICAgYnVpbGRGdW5jdGlvbk1hcDogZnVuY3Rpb24ocHJnKSB7XHJcbiAgICAgICAgICAgIHZhciB0aGF0ID0gdGhpcztcclxuICAgICAgICAgICAgd2Fsay5yZXBsYWNlKHByZywge1xyXG4gICAgICAgICAgICAgICAgZW50ZXI6IGZ1bmN0aW9uKG5vZGUpIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAobm9kZS50eXBlID09IFN5bnRheC5GdW5jdGlvbkRlY2xhcmF0aW9uKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciByZXN1bHQgPSBuZXcgRnVuY3Rpb25Bbm5vdGF0aW9uKG5vZGUpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgZnVuY3Rpb25OYW1lID0gbm9kZS5pZC5uYW1lO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgcGFyZW50Q29udGV4dCA9IHRoYXQucGVla0NvbnRleHQoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGZ1bmN0aW9uQ29udGV4dCA9IHRoYXQuY3JlYXRlQ29udGV4dChub2RlLCBwYXJlbnRDb250ZXh0LCBmdW5jdGlvbk5hbWUpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbkNvbnRleHQuZGVjbGFyZVBhcmFtZXRlcnMobm9kZS5wYXJhbXMpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBwYXJlbnRDb250ZXh0LmRlY2xhcmVWYXJpYWJsZShmdW5jdGlvbk5hbWUpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBwYXJlbnRDb250ZXh0LnVwZGF0ZUV4cHJlc3Npb24oZnVuY3Rpb25OYW1lLCByZXN1bHQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGF0LnB1c2hDb250ZXh0KGZ1bmN0aW9uQ29udGV4dCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQuZnVuY3Rpb25zLm9yaWdbZnVuY3Rpb25Db250ZXh0LnN0cigpXSA9IG5vZGU7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgIGxlYXZlOiBmdW5jdGlvbihub2RlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKG5vZGUudHlwZSA9PSBTeW50YXguRnVuY3Rpb25EZWNsYXJhdGlvbikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGF0LnBvcENvbnRleHQoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHsgdHlwZTogU3ludGF4LkVtcHR5U3RhdGVtZW50IH07XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAgICBwcmcuYm9keSA9IHByZy5ib2R5LmZpbHRlcihmdW5jdGlvbihhKSB7IHJldHVybiBhLnR5cGUgIT0gU3ludGF4LkVtcHR5U3RhdGVtZW50OyB9KTtcclxuICAgICAgICB9LFxyXG5cclxuICAgICAgICB0cmF2ZXJzZTogZnVuY3Rpb24gKG5vZGUpIHtcclxuICAgICAgICAgICAgd2Fsay50cmF2ZXJzZShub2RlLCB7XHJcbiAgICAgICAgICAgICAgICBlbnRlcjogdGhpcy5lbnRlck5vZGUuYmluZCh0aGlzKSxcclxuICAgICAgICAgICAgICAgIGxlYXZlOiB0aGlzLmV4aXROb2RlLmJpbmQodGhpcylcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIHJldHVybiBub2RlO1xyXG4gICAgICAgIH0sXHJcblxyXG4gICAgICAgIGVudGVyTm9kZTogZnVuY3Rpb24gKG5vZGUsIHBhcmVudCkge1xyXG4gICAgICAgICAgICB2YXIgY29udGV4dCA9IHRoaXMuY29udGV4dFt0aGlzLmNvbnRleHQubGVuZ3RoIC0gMV07XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnN3aXRjaEtpbmQobm9kZSwgcGFyZW50LCBjb250ZXh0LCBlbnRlclN0YXRlbWVudCwgZW50ZXJFeHByZXNzaW9uKTtcclxuICAgICAgICB9LFxyXG5cclxuICAgICAgICBleGl0Tm9kZTogZnVuY3Rpb24gKG5vZGUsIHBhcmVudCkge1xyXG4gICAgICAgICAgICB2YXIgY29udGV4dCA9IHRoaXMuY29udGV4dFt0aGlzLmNvbnRleHQubGVuZ3RoIC0gMV07XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnN3aXRjaEtpbmQobm9kZSwgcGFyZW50LCBjb250ZXh0LCBleGl0U3RhdGVtZW50LCBleGl0RXhwcmVzc2lvbik7XHJcbiAgICAgICAgfSxcclxuXHJcbiAgICAgICAgc3dpdGNoS2luZDogZnVuY3Rpb24gKG5vZGUsIHBhcmVudCwgY3R4LCBzdGF0ZW1lbnQsIGV4cHJlc3Npb24pIHtcclxuICAgICAgICAgICAgc3dpdGNoIChub2RlLnR5cGUpIHtcclxuICAgICAgICAgICAgICAgIGNhc2UgU3ludGF4LkJsb2NrU3RhdGVtZW50OlxyXG4gICAgICAgICAgICAgICAgY2FzZSBTeW50YXguQnJlYWtTdGF0ZW1lbnQ6XHJcbiAgICAgICAgICAgICAgICBjYXNlIFN5bnRheC5DYXRjaENsYXVzZTpcclxuICAgICAgICAgICAgICAgIGNhc2UgU3ludGF4LkNvbnRpbnVlU3RhdGVtZW50OlxyXG4gICAgICAgICAgICAgICAgY2FzZSBTeW50YXguRGlyZWN0aXZlU3RhdGVtZW50OlxyXG4gICAgICAgICAgICAgICAgY2FzZSBTeW50YXguRG9XaGlsZVN0YXRlbWVudDpcclxuICAgICAgICAgICAgICAgIGNhc2UgU3ludGF4LkRlYnVnZ2VyU3RhdGVtZW50OlxyXG4gICAgICAgICAgICAgICAgY2FzZSBTeW50YXguRW1wdHlTdGF0ZW1lbnQ6XHJcbiAgICAgICAgICAgICAgICBjYXNlIFN5bnRheC5FeHByZXNzaW9uU3RhdGVtZW50OlxyXG4gICAgICAgICAgICAgICAgY2FzZSBTeW50YXguRm9yU3RhdGVtZW50OlxyXG4gICAgICAgICAgICAgICAgY2FzZSBTeW50YXguRm9ySW5TdGF0ZW1lbnQ6XHJcbiAgICAgICAgICAgICAgICBjYXNlIFN5bnRheC5GdW5jdGlvbkRlY2xhcmF0aW9uOlxyXG4gICAgICAgICAgICAgICAgY2FzZSBTeW50YXguSWZTdGF0ZW1lbnQ6XHJcbiAgICAgICAgICAgICAgICBjYXNlIFN5bnRheC5MYWJlbGVkU3RhdGVtZW50OlxyXG4gICAgICAgICAgICAgICAgY2FzZSBTeW50YXguUHJvZ3JhbTpcclxuICAgICAgICAgICAgICAgIGNhc2UgU3ludGF4LlJldHVyblN0YXRlbWVudDpcclxuICAgICAgICAgICAgICAgIGNhc2UgU3ludGF4LlN3aXRjaFN0YXRlbWVudDpcclxuICAgICAgICAgICAgICAgIGNhc2UgU3ludGF4LlN3aXRjaENhc2U6XHJcbiAgICAgICAgICAgICAgICBjYXNlIFN5bnRheC5UaHJvd1N0YXRlbWVudDpcclxuICAgICAgICAgICAgICAgIGNhc2UgU3ludGF4LlRyeVN0YXRlbWVudDpcclxuICAgICAgICAgICAgICAgIGNhc2UgU3ludGF4LlZhcmlhYmxlRGVjbGFyYXRpb246XHJcbiAgICAgICAgICAgICAgICBjYXNlIFN5bnRheC5WYXJpYWJsZURlY2xhcmF0b3I6XHJcbiAgICAgICAgICAgICAgICBjYXNlIFN5bnRheC5XaGlsZVN0YXRlbWVudDpcclxuICAgICAgICAgICAgICAgIGNhc2UgU3ludGF4LldpdGhTdGF0ZW1lbnQ6XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHN0YXRlbWVudC5jYWxsKHRoaXMsIG5vZGUsIHBhcmVudCwgY3R4KTtcclxuXHJcbiAgICAgICAgICAgICAgICBjYXNlIFN5bnRheC5Bc3NpZ25tZW50RXhwcmVzc2lvbjpcclxuICAgICAgICAgICAgICAgIGNhc2UgU3ludGF4LkFycmF5RXhwcmVzc2lvbjpcclxuICAgICAgICAgICAgICAgIGNhc2UgU3ludGF4LkFycmF5UGF0dGVybjpcclxuICAgICAgICAgICAgICAgIGNhc2UgU3ludGF4LkJpbmFyeUV4cHJlc3Npb246XHJcbiAgICAgICAgICAgICAgICBjYXNlIFN5bnRheC5DYWxsRXhwcmVzc2lvbjpcclxuICAgICAgICAgICAgICAgIGNhc2UgU3ludGF4LkNvbmRpdGlvbmFsRXhwcmVzc2lvbjpcclxuICAgICAgICAgICAgICAgIGNhc2UgU3ludGF4LkZ1bmN0aW9uRXhwcmVzc2lvbjpcclxuICAgICAgICAgICAgICAgIGNhc2UgU3ludGF4LklkZW50aWZpZXI6XHJcbiAgICAgICAgICAgICAgICBjYXNlIFN5bnRheC5MaXRlcmFsOlxyXG4gICAgICAgICAgICAgICAgY2FzZSBTeW50YXguTG9naWNhbEV4cHJlc3Npb246XHJcbiAgICAgICAgICAgICAgICBjYXNlIFN5bnRheC5NZW1iZXJFeHByZXNzaW9uOlxyXG4gICAgICAgICAgICAgICAgY2FzZSBTeW50YXguTmV3RXhwcmVzc2lvbjpcclxuICAgICAgICAgICAgICAgIGNhc2UgU3ludGF4Lk9iamVjdEV4cHJlc3Npb246XHJcbiAgICAgICAgICAgICAgICBjYXNlIFN5bnRheC5PYmplY3RQYXR0ZXJuOlxyXG4gICAgICAgICAgICAgICAgY2FzZSBTeW50YXguUHJvcGVydHk6XHJcbiAgICAgICAgICAgICAgICBjYXNlIFN5bnRheC5TZXF1ZW5jZUV4cHJlc3Npb246XHJcbiAgICAgICAgICAgICAgICBjYXNlIFN5bnRheC5UaGlzRXhwcmVzc2lvbjpcclxuICAgICAgICAgICAgICAgIGNhc2UgU3ludGF4LlVuYXJ5RXhwcmVzc2lvbjpcclxuICAgICAgICAgICAgICAgIGNhc2UgU3ludGF4LlVwZGF0ZUV4cHJlc3Npb246XHJcbiAgICAgICAgICAgICAgICBjYXNlIFN5bnRheC5ZaWVsZEV4cHJlc3Npb246XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGV4cHJlc3Npb24uY2FsbCh0aGlzLCBub2RlLCBwYXJlbnQsIGN0eCk7XHJcblxyXG4gICAgICAgICAgICAgICAgZGVmYXVsdDpcclxuICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1Vua25vd24gbm9kZSB0eXBlOiAnICsgbm9kZS50eXBlKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0sXHJcblxyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqXHJcbiAgICAgICAgICogQHBhcmFtIHtPYmplY3R9IGZ1bmN0aW9uQVNUXHJcbiAgICAgICAgICogQHBhcmFtIHtBcnJheS48VHlwZUluZm8+IHBhcmFtc1xyXG4gICAgICAgICAqIEBwYXJhbSB7Q29udGV4dH0gcGFyZW50Q29udGV4dFxyXG4gICAgICAgICAqIEByZXR1cm5zIHsqfVxyXG4gICAgICAgICAqL1xyXG4gICAgICAgIGluZmVyRnVuY3Rpb246IGZ1bmN0aW9uIChmdW5jdGlvbkFTVCwgcGFyYW1zLCBwYXJlbnRDb250ZXh0KSB7XHJcbiAgICAgICAgICAgIHZhciBmdW5jdGlvbk5hbWUgPSBmdW5jdGlvbkFTVC5pZC5uYW1lO1xyXG4gICAgICAgICAgICB2YXIgdGFyZ2V0Q29udGV4dE5hbWUgPSBwYXJlbnRDb250ZXh0LmdldFZhcmlhYmxlSWRlbnRpZmllcihmdW5jdGlvbk5hbWUpO1xyXG4gICAgICAgICAgICB0aGlzLmluamVjdGlvbnNbdGFyZ2V0Q29udGV4dE5hbWVdID0gcGFyYW1zO1xyXG5cclxuICAgICAgICAgICAgLy8gV2UgaGF2ZSBhIHNwZWNpZmMgdHlwZSBzZXQgaW4gcGFyYW1zIHRoYXQgd2UgYW5ub3RhdGUgdG8gdGhlXHJcbiAgICAgICAgICAgIC8vIGZ1bmN0aW9uIEFTVFxyXG4gICAgICAgICAgICBmb3IodmFyIGkgPSAwOyBpIDwgcGFyYW1zLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoaSA9PSBmdW5jdGlvbkFTVC5wYXJhbXMubGVuZ3RoKVxyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgdmFyIGZ1bmNQYXJhbSA9IG5ldyBBbm5vdGF0aW9uKGZ1bmN0aW9uQVNULnBhcmFtc1tpXSk7XHJcbiAgICAgICAgICAgICAgICBmdW5jUGFyYW0uc2V0RnJvbUV4dHJhKHBhcmFtc1tpXS5nZXRFeHRyYSgpKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgdmFyIG9sZEVudHJ5UG9pbnQgPSB0aGlzLmVudHJ5UG9pbnQ7XHJcbiAgICAgICAgICAgIHRoaXMuZW50cnlQb2ludCA9IHRhcmdldENvbnRleHROYW1lO1xyXG4gICAgICAgICAgICB0aGlzLnB1c2hDb250ZXh0KHBhcmVudENvbnRleHQpO1xyXG4gICAgICAgICAgICAvL2NvbnNvbGUubG9nKFwiU3RhcnRpbmcgdG8gdHJhdmVyc2U6IFwiICsgZnVuY3Rpb25OYW1lICsgXCIgaW4gY29udGV4dCBcIiArIHBhcmVudENvbnRleHQuc3RyKCkpXHJcbiAgICAgICAgICAgIHZhciBhc3QgPSB0aGlzLnRyYXZlcnNlKGZ1bmN0aW9uQVNUKTtcclxuICAgICAgICAgICAgdGhpcy5wb3BDb250ZXh0KCk7XHJcbiAgICAgICAgICAgIHRoaXMuZW50cnlQb2ludCA9IG9sZEVudHJ5UG9pbnQ7XHJcblxyXG4gICAgICAgICAgICByZXR1cm4gYXN0O1xyXG4gICAgICAgIH0sXHJcblxyXG4gICAgICAgIGluZmVyUHJvZ3JhbTogZnVuY3Rpb24ocHJnLCBwYXJhbXMpIHtcclxuICAgICAgICAgICAgdmFyIHBhcmFtcyA9IHBhcmFtcyB8fCB7fTtcclxuICAgICAgICAgICAgdmFyIHByb2dyYW1Db250ZXh0ID0gcmVnaXN0ZXJHbG9iYWxDb250ZXh0KHByZyk7XHJcblxyXG4gICAgICAgICAgICB0aGlzLnB1c2hDb250ZXh0KHByb2dyYW1Db250ZXh0KTtcclxuICAgICAgICAgICAgdGhpcy5idWlsZEZ1bmN0aW9uTWFwKHByZyk7XHJcbiAgICAgICAgICAgIHRoaXMudHJhdmVyc2UocHJnKTtcclxuICAgICAgICAgICAgdGhpcy5wb3BDb250ZXh0KCk7XHJcblxyXG4gICAgICAgICAgICB2YXIgZW50cnlQb2ludCA9IHRoaXMuZW50cnlQb2ludDtcclxuICAgICAgICAgICAgaWYgKHRoaXMuZnVuY3Rpb25zLm9yaWcuaGFzT3duUHJvcGVydHkoZW50cnlQb2ludCkpIHtcclxuICAgICAgICAgICAgICAgIHZhciBhc3QgPSB0aGlzLmZ1bmN0aW9ucy5vcmlnW2VudHJ5UG9pbnRdO1xyXG4gICAgICAgICAgICAgICAgdmFyIHBhcmFtcyA9IHRoaXMuYW5ub3RhdGVQYXJhbWV0ZXJzKHBhcmFtc1tlbnRyeVBvaW50XSk7XHJcbiAgICAgICAgICAgICAgICB2YXIgYWFzdCA9IHRoaXMuaW5mZXJGdW5jdGlvbihhc3QsIHBhcmFtcywgcHJvZ3JhbUNvbnRleHQpO1xyXG4gICAgICAgICAgICAgICAgZm9yKHZhciBmdW5jIGluIHRoaXMuZnVuY3Rpb25zLmRlcml2ZWQpIHtcclxuICAgICAgICAgICAgICAgICAgICB2YXIgdmFyaWF0aW9ucyA9IHRoaXMuZnVuY3Rpb25zLmRlcml2ZWRbZnVuY107XHJcbiAgICAgICAgICAgICAgICAgICAgZm9yICh2YXIgc2lnbmF0dXJlIGluIHZhcmlhdGlvbnMpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcHJnLmJvZHkucHVzaCh2YXJpYXRpb25zW3NpZ25hdHVyZV0uYXN0KTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgcHJnLmJvZHkucHVzaChhYXN0KTtcclxuXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmICh0aGlzLmNvbnRleHQubGVuZ3RoKVxyXG4gICAgICAgICAgICAgICAgdGhyb3cgRXJyb3IoXCJTb21ldGhpbmcgd2VudCB3cm9uZ1wiKTtcclxuICAgICAgICAgICAgcmV0dXJuIHByZztcclxuICAgICAgICB9LFxyXG4gICAgICAgIGdldEZ1bmN0aW9uSW5mb3JtYXRpb25Gb3I6IGZ1bmN0aW9uKG5hbWUsIGFyZ3MsIGRlZmluaW5nQ29udGV4dCkge1xyXG4gICAgICAgICAgICB2YXIgc2lnbmF0dXJlID0gYXJncy5yZWR1Y2UoZnVuY3Rpb24oc3RyLCBhcmcpIHsgcmV0dXJuIHN0ciArIGFyZy5nZXRUeXBlU3RyaW5nKCl9LCBcIlwiKTtcclxuICAgICAgICAgICAgaWYgKHRoaXMuZnVuY3Rpb25zLmRlcml2ZWQuaGFzT3duUHJvcGVydHkobmFtZSkpIHtcclxuICAgICAgICAgICAgICAgIHZhciBkZXJpdmVkRnVuY3Rpb24gPSB0aGlzLmZ1bmN0aW9ucy5kZXJpdmVkW25hbWVdO1xyXG4gICAgICAgICAgICAgICAgaWYgKGRlcml2ZWRGdW5jdGlvbi5oYXNPd25Qcm9wZXJ0eShzaWduYXR1cmUpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGRlcml2ZWRGdW5jdGlvbltzaWduYXR1cmVdLmluZm87XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKHRoaXMuZnVuY3Rpb25zLm9yaWcuaGFzT3duUHJvcGVydHkobmFtZSkpIHtcclxuICAgICAgICAgICAgICAgIHZhciBhc3QgPSB0aGlzLmZ1bmN0aW9ucy5vcmlnW25hbWVdO1xyXG4gICAgICAgICAgICAgICAgdmFyIHZhcmlhdGlvbnMgPSB0aGlzLmZ1bmN0aW9ucy5kZXJpdmVkW25hbWVdID0gdGhpcy5mdW5jdGlvbnMuZGVyaXZlZFtuYW1lXSB8fCB7fTtcclxuICAgICAgICAgICAgICAgIHZhciBkZXJpdmVkID0gdmFyaWF0aW9uc1tzaWduYXR1cmVdID0ge307XHJcbiAgICAgICAgICAgICAgICBkZXJpdmVkLmFzdCA9IHRoaXMuaW5mZXJGdW5jdGlvbihKU09OLnBhcnNlKEpTT04uc3RyaW5naWZ5KGFzdCkpLCBhcmdzLCBkZWZpbmluZ0NvbnRleHQpO1xyXG4gICAgICAgICAgICAgICAgZGVyaXZlZC5pbmZvID0gZGVyaXZlZC5hc3QuZXh0cmEucmV0dXJuSW5mbztcclxuICAgICAgICAgICAgICAgIGRlcml2ZWQuaW5mby5uZXdOYW1lID0gbmFtZS5yZXBsYWNlKC9cXC4vZywgJ18nKSArIE9iamVjdC5rZXlzKHZhcmlhdGlvbnMpLmxlbmd0aDtcclxuICAgICAgICAgICAgICAgIGRlcml2ZWQuYXN0LmlkLm5hbWUgPSBkZXJpdmVkLmluZm8ubmV3TmFtZTtcclxuICAgICAgICAgICAgICAgIHJldHVybiBkZXJpdmVkLmluZm87XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiQ291bGQgbm90IHJlc29sdmUgZnVuY3Rpb24gXCIgKyBuYW1lKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgfSk7XHJcblxyXG5cclxuICAgIG5zLmluZmVyID0gZnVuY3Rpb24gKGFzdCwgb3B0KSB7XHJcbiAgICAgICAgdmFyIHRpID0gbmV3IFR5cGVJbmZlcmVuY2UoYXN0LCBvcHQpO1xyXG4gICAgICAgIHJldHVybiB0aS5pbmZlclByb2dyYW0odGkucm9vdCwgb3B0LmluamVjdCk7XHJcbiAgICB9O1xyXG5cclxuXHJcbn0oZXhwb3J0cykpO1xyXG4iLCIoZnVuY3Rpb24obnMpe1xyXG5cclxuICAgIHZhciBTaGFkZSA9IHJlcXVpcmUoXCIuLi9pbnRlcmZhY2VzLmpzXCIpLFxyXG4gICAgICAgIFN5bnRheCA9IHJlcXVpcmUoJ2VzdHJhdmVyc2UnKS5TeW50YXgsXHJcbiAgICAgICAgQmFzZSA9IHJlcXVpcmUoXCIuL2luZGV4LmpzXCIpLFxyXG4gICAgICAgIFR5cGVJbmZvID0gcmVxdWlyZShcIi4vdHlwZWluZm8uanNcIikuVHlwZUluZm87XHJcblxyXG4gICAgdmFyIFRZUEVTID0gU2hhZGUuVFlQRVMsXHJcbiAgICAgICAgS0lORFMgPSBTaGFkZS5PQkpFQ1RfS0lORFM7XHJcblxyXG5cclxuICAgIC8qKlxyXG4gICAgICogQHBhcmFtIHtvYmplY3R9IG5vZGVcclxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBleHRyYVxyXG4gICAgICogQGV4dGVuZHMgVHlwZUluZm9cclxuICAgICAqIEBjb25zdHJ1Y3RvclxyXG4gICAgICovXHJcbiAgICB2YXIgQW5ub3RhdGlvbiA9IGZ1bmN0aW9uIChub2RlLCBleHRyYSkge1xyXG4gICAgICAgIFR5cGVJbmZvLmNhbGwodGhpcywgbm9kZSwgZXh0cmEpO1xyXG4gICAgfTtcclxuXHJcbiAgICBCYXNlLmNyZWF0ZUNsYXNzKEFubm90YXRpb24sIFR5cGVJbmZvLCB7XHJcblxyXG4gICAgICAgIHNldENhbGwgOiBmdW5jdGlvbihjYWxsKSB7XHJcbiAgICAgICAgICAgIHZhciBleHRyYSA9IHRoaXMuZ2V0RXh0cmEoKTtcclxuICAgICAgICAgICAgZXh0cmEuZXZhbHVhdGUgPSBjYWxsO1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgZ2V0Q2FsbCA6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5nZXRFeHRyYSgpLmV2YWx1YXRlO1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgY2xlYXJDYWxsOiBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgdmFyIGV4dHJhID0gdGhpcy5nZXRFeHRyYSgpO1xyXG4gICAgICAgICAgICBkZWxldGUgZXh0cmEuZXZhbHVhdGU7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBlbGltaW5hdGUgOiBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgdmFyIGV4dHJhID0gdGhpcy5nZXRFeHRyYSgpO1xyXG4gICAgICAgICAgICBleHRyYS5lbGltaW5hdGUgPSB0cnVlO1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgY2FuRWxpbWluYXRlIDogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgIHZhciBleHRyYSA9IHRoaXMuZ2V0RXh0cmEoKTtcclxuICAgICAgICAgICAgcmV0dXJuIGV4dHJhLmVsaW1pbmF0ZSA9PSB0cnVlO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICB9KTtcclxuXHJcbiAgICAvKipcclxuICAgICAqIEBwYXJhbSB7QXJyYXkuPG9iamVjdD59IGFyciBBcnJheSBvZiBub2Rlc1xyXG4gICAgICogQHBhcmFtIHtDb250ZXh0fSBjdHhcclxuICAgICAqIEByZXR1cm5zIHtBcnJheS48QW5ub3RhdGlvbj59XHJcbiAgICAgKi9cclxuICAgIEFubm90YXRpb24uY3JlYXRlQW5ub3RhdGVkTm9kZUFycmF5ID0gZnVuY3Rpb24oYXJyLCBjdHgpIHtcclxuICAgICAgICByZXR1cm4gYXJyLm1hcChmdW5jdGlvbiAoYXJnKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBjdHguY3JlYXRlVHlwZUluZm8oYXJnKTtcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuXHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gbm9kZVxyXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGV4dHJhXHJcbiAgICAgKiBAZXh0ZW5kcyBBbm5vdGF0aW9uXHJcbiAgICAgKiBAY29uc3RydWN0b3JcclxuICAgICAqL1xyXG4gICAgdmFyIEZ1bmN0aW9uQW5ub3RhdGlvbiA9IGZ1bmN0aW9uIChub2RlLCBleHRyYSkge1xyXG4gICAgICAgIEFubm90YXRpb24uY2FsbCh0aGlzLCBub2RlLCBleHRyYSk7XHJcbiAgICAgICAgdGhpcy5zZXRUeXBlKFRZUEVTLkZVTkNUSU9OKTtcclxuICAgIH07XHJcblxyXG4gICAgQmFzZS5jcmVhdGVDbGFzcyhGdW5jdGlvbkFubm90YXRpb24sIEFubm90YXRpb24sIHtcclxuICAgICAgICBnZXRSZXR1cm5JbmZvOiBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuZ2V0RXh0cmEoKS5yZXR1cm5JbmZvO1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgc2V0UmV0dXJuSW5mbzogZnVuY3Rpb24oaW5mbykge1xyXG4gICAgICAgICAgICB0aGlzLmdldEV4dHJhKCkucmV0dXJuSW5mbyA9IGluZm87XHJcbiAgICAgICAgfSxcclxuICAgICAgICBpc1VzZWQ6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICByZXR1cm4gISF0aGlzLmdldEV4dHJhKCkudXNlZDtcclxuICAgICAgICB9LFxyXG4gICAgICAgIHNldFVzZWQ6IGZ1bmN0aW9uKHYpIHtcclxuICAgICAgICAgICAgdGhpcy5nZXRFeHRyYSgpLnVzZWQgPSB2O1xyXG4gICAgICAgIH1cclxuICAgIH0pO1xyXG5cclxuICAgIG5zLkFubm90YXRpb24gPSBBbm5vdGF0aW9uO1xyXG4gICAgbnMuRnVuY3Rpb25Bbm5vdGF0aW9uID0gRnVuY3Rpb25Bbm5vdGF0aW9uO1xyXG4gICAgbnMuQU5OTyA9IGZ1bmN0aW9uKG9iamVjdCl7cmV0dXJuIG5ldyBBbm5vdGF0aW9uKG9iamVjdCl9O1xyXG5cclxufShleHBvcnRzKSk7XHJcbiIsIihmdW5jdGlvbihucyl7XHJcblxyXG4gICAgdmFyIEJhc2UgPSByZXF1aXJlKFwiLi9pbmRleC5qc1wiKSxcclxuICAgICAgICBTaGFkZSA9IHJlcXVpcmUoXCIuLi9pbnRlcmZhY2VzLmpzXCIpLFxyXG4gICAgICAgIFRZUEVTID0gU2hhZGUuVFlQRVMsXHJcbiAgICAgICAgQW5ub3RhdGlvbiA9IHJlcXVpcmUoXCIuL2Fubm90YXRpb24uanNcIikuQW5ub3RhdGlvbixcclxuICAgICAgICBUeXBlSW5mbyA9IHJlcXVpcmUoXCIuL3R5cGVpbmZvLmpzXCIpLlR5cGVJbmZvLFxyXG4gICAgICAgIFN5bnRheCA9IHJlcXVpcmUoJ2VzdHJhdmVyc2UnKS5TeW50YXg7XHJcblxyXG4gICAgbnMuZ2V0Q29udGV4dCA9IGZ1bmN0aW9uKHJlZ2lzdHJ5KSB7XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKlxyXG4gICAgICogQHBhcmFtIGJpbmRpbmdcclxuICAgICAqIEBleHRlbmRzIFR5cGVJbmZvXHJcbiAgICAgKiBAY29uc3RydWN0b3JcclxuICAgICAqL1xyXG4gICAgdmFyIEJpbmRpbmcgPSBmdW5jdGlvbihiaW5kaW5nLCByZWdpc3RlcnkpIHtcclxuICAgICAgICBUeXBlSW5mby5jYWxsKHRoaXMsIGJpbmRpbmcpO1xyXG4gICAgICAgIGlmKHRoaXMubm9kZS5yZWYpIHtcclxuICAgICAgICAgICAgaWYgKCFyZWdpc3RlcnlbdGhpcy5ub2RlLnJlZl0pXHJcbiAgICAgICAgICAgICAgICB0aHJvdyBFcnJvcihcIk5vIG9iamVjdCBoYXMgYmVlbiByZWdpc3RlcmVkIGZvcjogXCIgKyB0aGlzLm5vZGUucmVmKTtcclxuICAgICAgICAgICAgdGhpcy5nbG9iYWxPYmplY3QgPSByZWdpc3RlcnlbdGhpcy5ub2RlLnJlZl0ub2JqZWN0O1xyXG4gICAgICAgICAgICBpZiAodGhpcy5nbG9iYWxPYmplY3QpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuc2V0VHlwZShUWVBFUy5PQkpFQ1QpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfTtcclxuXHJcblxyXG4gICAgQmFzZS5jcmVhdGVDbGFzcyhCaW5kaW5nLCBUeXBlSW5mbywge1xyXG4gICAgICAgIGhhc0NvbnN0cnVjdG9yOiBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgcmV0dXJuICEhdGhpcy5nZXRDb25zdHJ1Y3RvcigpO1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgZ2V0Q29uc3RydWN0b3I6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5nbG9iYWxPYmplY3QgJiYgdGhpcy5nbG9iYWxPYmplY3QuY29uc3RydWN0b3I7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBpc0luaXRpYWxpemVkOiBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMubm9kZS5pbml0aWFsaXplZDtcclxuICAgICAgICB9LFxyXG4gICAgICAgIHNldEluaXRpYWxpemVkOiBmdW5jdGlvbih2KSB7XHJcbiAgICAgICAgICAgIHRoaXMubm9kZS5pbml0aWFsaXplZCA9IHY7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBoYXNTdGF0aWNWYWx1ZTogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgICB9LFxyXG4gICAgICAgIGlzR2xvYmFsOiBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMubm9kZS5pbmZvICYmIHRoaXMubm9kZS5pbmZvLl9nbG9iYWwgfHwgVHlwZUluZm8ucHJvdG90eXBlLmlzR2xvYmFsLmNhbGwodGhpcyk7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBnZXRUeXBlOiBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuZ2xvYmFsT2JqZWN0PyBUWVBFUy5PQkpFQ1QgOiBUeXBlSW5mby5wcm90b3R5cGUuZ2V0VHlwZS5jYWxsKHRoaXMpO1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgZ2V0T2JqZWN0SW5mbzogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLmdsb2JhbE9iamVjdClcclxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmdsb2JhbE9iamVjdC5zdGF0aWM7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLmlzT2JqZWN0KCkpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLm5vZGUuaW5mbyB8fCByZWdpc3RyeS5nZXRJbnN0YW5jZUZvcktpbmQodGhpcy5nZXRLaW5kKCkpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgZ2V0SW5mb0ZvclNpZ25hdHVyZTogZnVuY3Rpb24oc2lnbmF0dXJlKSB7XHJcbiAgICAgICAgICAgIHZhciBleHRyYSA9IHRoaXMuZ2V0RXh0cmEoKTtcclxuICAgICAgICAgICAgaWYoIWV4dHJhLnNpZ25hdHVyZXMpXHJcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgICAgICAgICAgcmV0dXJuIGV4dHJhLnNpZ25hdHVyZXNbc2lnbmF0dXJlXTtcclxuICAgICAgICB9LFxyXG4gICAgICAgIHNldEluZm9Gb3JTaWduYXR1cmU6IGZ1bmN0aW9uKHNpZ25hdHVyZSwgaW5mbykge1xyXG4gICAgICAgICAgICB2YXIgZXh0cmEgPSB0aGlzLmdldEV4dHJhKCk7XHJcbiAgICAgICAgICAgIGlmKCFleHRyYS5zaWduYXR1cmVzKVxyXG4gICAgICAgICAgICAgICAgZXh0cmEuc2lnbmF0dXJlcyA9IHt9O1xyXG4gICAgICAgICAgICByZXR1cm4gZXh0cmEuc2lnbmF0dXJlc1tzaWduYXR1cmVdID0gaW5mbztcclxuICAgICAgICB9XHJcblxyXG5cclxuICAgIH0pXHJcblxyXG5cclxuICAgIC8qKlxyXG4gICAgICogQHBhcmFtIHtDb250ZXh0fG51bGx9IHBhcmVudFxyXG4gICAgICogQHBhcmFtIG9wdFxyXG4gICAgICogQGNvbnN0cnVjdG9yXHJcbiAgICAgKi9cclxuICAgIHZhciBDb250ZXh0ID0gZnVuY3Rpb24obm9kZSwgcGFyZW50LCBvcHQpIHtcclxuICAgICAgICBvcHQgPSBvcHQgfHwge307XHJcblxyXG4gICAgICAgIC8qKiBAdHlwZSAoQ29udGV4dHxudWxsKSAqL1xyXG4gICAgICAgIHRoaXMucGFyZW50ID0gcGFyZW50IHx8IG9wdC5wYXJlbnQgfHwgbnVsbDtcclxuICAgICAgICB0aGlzLnJlZ2lzdGVyeSA9IHBhcmVudCA/IHBhcmVudC5yZWdpc3RlcnkgOiB7fTtcclxuXHJcbiAgICAgICAgdGhpcy5jb250ZXh0ID0gbm9kZS5jb250ZXh0ID0gbm9kZS5jb250ZXh0IHx8IHt9O1xyXG5cclxuICAgICAgICAvKiogQHR5cGUge09iamVjdC48c3RyaW5nLCB7aW5pdGlhbGl6ZWQ6IGJvb2xlYW4sIGFubm90YXRpb246IEFubm90YXRpb259Pn0gKi9cclxuICAgICAgICB0aGlzLmNvbnRleHQuYmluZGluZ3MgPSB0aGlzLmNvbnRleHQuYmluZGluZ3MgfHwge307XHJcbiAgICAgICAgaWYob3B0LmJpbmRpbmdzKSB7XHJcbiAgICAgICAgICAgIEJhc2UuZXh0ZW5kKHRoaXMuY29udGV4dC5iaW5kaW5ncywgb3B0LmJpbmRpbmdzKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMuY29udGV4dC5uYW1lID0gb3B0Lm5hbWUgfHwgbm9kZS5uYW1lIHx8IFwiPGFub255bW91cz5cIjtcclxuXHJcbiAgICB9O1xyXG5cclxuICAgIEJhc2UuZXh0ZW5kKENvbnRleHQucHJvdG90eXBlLCB7XHJcblxyXG4gICAgICAgIGdldE5hbWU6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5jb250ZXh0Lm5hbWU7XHJcbiAgICAgICAgfSxcclxuXHJcbiAgICAgICAgZ2V0QmluZGluZ3M6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5jb250ZXh0LmJpbmRpbmdzO1xyXG4gICAgICAgIH0sXHJcblxyXG4gICAgICAgIHVwZGF0ZVJldHVybkluZm86IGZ1bmN0aW9uKGFubm90YXRpb24pIHtcclxuICAgICAgICAgICAgdGhpcy5jb250ZXh0LnJldHVybkluZm8gPSBhbm5vdGF0aW9uLmdldEV4dHJhKCk7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBnZXRSZXR1cm5JbmZvOiBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuY29udGV4dC5yZXR1cm5JbmZvO1xyXG4gICAgICAgIH0sXHJcblxyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIEBwYXJhbSB7c3RyaW5nfSBuYW1lXHJcbiAgICAgICAgICogQHJldHVybnMgeyp9XHJcbiAgICAgICAgICovXHJcbiAgICAgICAgZ2V0QmluZGluZ0J5TmFtZTogZnVuY3Rpb24obmFtZSkge1xyXG4gICAgICAgICAgICB2YXIgYmluZGluZ3MgPSB0aGlzLmdldEJpbmRpbmdzKCk7XHJcbiAgICAgICAgICAgIHZhciBiaW5kaW5nID0gYmluZGluZ3NbbmFtZV07XHJcbiAgICAgICAgICAgIGlmKGJpbmRpbmcgIT09IHVuZGVmaW5lZClcclxuICAgICAgICAgICAgICAgIHJldHVybiBuZXcgQmluZGluZyhiaW5kaW5nLCB0aGlzLnJlZ2lzdGVyeSk7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLnBhcmVudClcclxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLnBhcmVudC5nZXRCaW5kaW5nQnlOYW1lKG5hbWUpO1xyXG4gICAgICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xyXG4gICAgICAgIH0sXHJcblxyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIEBwYXJhbSB7c3RyaW5nfSBuYW1lXHJcbiAgICAgICAgICogQHJldHVybnMge0NvbnRleHR8bnVsbH1cclxuICAgICAgICAgKi9cclxuICAgICAgICBnZXRDb250ZXh0Rm9yTmFtZTogZnVuY3Rpb24obmFtZSkge1xyXG4gICAgICAgICAgICB2YXIgYmluZGluZ3MgPSB0aGlzLmdldEJpbmRpbmdzKCk7XHJcbiAgICAgICAgICAgIGlmKGJpbmRpbmdzW25hbWVdICE9PSB1bmRlZmluZWQpXHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcztcclxuICAgICAgICAgICAgaWYgKHRoaXMucGFyZW50KVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMucGFyZW50LmdldENvbnRleHRGb3JOYW1lKG5hbWUpO1xyXG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgICAgICB9LFxyXG5cclxuICAgICAgICBnZXRWYXJpYWJsZUlkZW50aWZpZXI6IGZ1bmN0aW9uKG5hbWUpIHtcclxuICAgICAgICAgICAgdmFyIGNvbnRleHQgPSB0aGlzLmdldENvbnRleHRGb3JOYW1lKG5hbWUpO1xyXG4gICAgICAgICAgICBpZighY29udGV4dClcclxuICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgICAgICAgICByZXR1cm4gY29udGV4dC5zdHIoKSArIFwiLlwiICsgbmFtZTtcclxuICAgICAgICB9LFxyXG5cclxuICAgICAgICBkZWNsYXJlVmFyaWFibGU6IGZ1bmN0aW9uKG5hbWUsIGZhaWwsIHBvc2l0aW9uKSB7XHJcbiAgICAgICAgICAgIHZhciBiaW5kaW5ncyA9IHRoaXMuZ2V0QmluZGluZ3MoKTtcclxuICAgICAgICAgICAgZmFpbCA9IChmYWlsID09IHVuZGVmaW5lZCkgPyB0cnVlIDogZmFpbDtcclxuICAgICAgICAgICAgaWYgKGJpbmRpbmdzW25hbWVdKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoZmFpbCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihuYW1lICsgXCIgd2FzIGFscmVhZHkgZGVjbGFyZWQgaW4gdGhpcyBzY29wZS5cIilcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICB2YXIgaW5pdCA9IHtcclxuICAgICAgICAgICAgICAgIGluaXRpYWxpemVkIDogZmFsc2UsXHJcbiAgICAgICAgICAgICAgICBpbml0UG9zaXRpb246IHBvc2l0aW9uLFxyXG4gICAgICAgICAgICAgICAgZXh0cmE6IHtcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiBUWVBFUy5VTkRFRklORURcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgYmluZGluZ3NbbmFtZV0gPSBpbml0O1xyXG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgICB9LFxyXG5cclxuICAgICAgICAvKipcclxuICAgICAgICAgKlxyXG4gICAgICAgICAqIEBwYXJhbSB7c3RyaW5nfSBuYW1lXHJcbiAgICAgICAgICogQHBhcmFtIHtUeXBlSW5mb30gdHlwZUluZm9cclxuICAgICAgICAgKi9cclxuICAgICAgICB1cGRhdGVFeHByZXNzaW9uOiBmdW5jdGlvbiAobmFtZSwgdHlwZUluZm8pIHtcclxuICAgICAgICAgICAgdmFyIHYgPSB0aGlzLmdldEJpbmRpbmdCeU5hbWUobmFtZSk7XHJcbiAgICAgICAgICAgIGlmICghdikge1xyXG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiVmFyaWFibGUgd2FzIG5vdCBkZWNsYXJlZCBpbiB0aGlzIHNjb3BlOiBcIiArIG5hbWUpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmICh2LmlzSW5pdGlhbGl6ZWQoKSAmJiB2LmdldFR5cGUoKSAhPT0gdHlwZUluZm8uZ2V0VHlwZSgpKSB7XHJcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJWYXJpYWJsZSBtYXkgbm90IGNoYW5nZSBpdCdzIHR5cGU6IFwiICsgbmFtZSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKCF2LmlzSW5pdGlhbGl6ZWQoKSkge1xyXG4gICAgICAgICAgICAgICAgLy8gQW5ub3RhdGUgdGhlIGRlY2xhcmF0aW9uLCBpZiBvbmUgaXMgZ2l2ZW5cclxuICAgICAgICAgICAgICAgIGlmKHYubm9kZS5pbml0UG9zaXRpb24pXHJcbiAgICAgICAgICAgICAgICAgICAgdi5ub2RlLmluaXRQb3NpdGlvbi5jb3B5KHR5cGVJbmZvKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgdi5jb3B5KHR5cGVJbmZvKTtcclxuICAgICAgICAgICAgdi5zZXREeW5hbWljVmFsdWUoKTtcclxuICAgICAgICAgICAgdi5zZXRJbml0aWFsaXplZCghdHlwZUluZm8uaXNVbmRlZmluZWQoKSk7XHJcbiAgICAgICAgfSxcclxuXHJcbiAgICAgICAgcmVnaXN0ZXJPYmplY3Q6IGZ1bmN0aW9uKG5hbWUsIG9iaikge1xyXG4gICAgICAgICAgICB0aGlzLnJlZ2lzdGVyeVtvYmouaWRdID0gb2JqO1xyXG4gICAgICAgICAgICB2YXIgYmluZGluZ3MgPSB0aGlzLmdldEJpbmRpbmdzKCk7XHJcbiAgICAgICAgICAgIGJpbmRpbmdzW25hbWVdID0ge1xyXG4gICAgICAgICAgICAgICAgZXh0cmE6IHtcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiBUWVBFUy5PQkpFQ1RcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICByZWY6IG9iai5pZFxyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgIH0sXHJcblxyXG4gICAgICAgIGRlY2xhcmVQYXJhbWV0ZXJzOiBmdW5jdGlvbihwYXJhbXMpIHtcclxuICAgICAgICAgICAgdmFyIGJpbmRpbmdzID0gdGhpcy5nZXRCaW5kaW5ncygpO1xyXG4gICAgICAgICAgICB0aGlzLnBhcmFtcyA9IFtdO1xyXG4gICAgICAgICAgICBmb3IodmFyIGkgPSAwOyBpIDwgcGFyYW1zLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgICAgICAgICB2YXIgcGFyYW1ldGVyID0gcGFyYW1zW2ldO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5wYXJhbXNbaV0gPSBwYXJhbWV0ZXIubmFtZTtcclxuICAgICAgICAgICAgICAgIGJpbmRpbmdzW3BhcmFtZXRlci5uYW1lXSA9IHsgdHlwZTogVFlQRVMuVU5ERUZJTkVEIH07XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9LFxyXG5cclxuICAgICAgICAvKipcclxuICAgICAgICAgKlxyXG4gICAgICAgICAqIEBwYXJhbSB7QXJyYXkuPFR5cGVJbmZvPn0gPHBhcmFtc1xyXG4gICAgICAgICAqL1xyXG4gICAgICAgIGluamVjdFBhcmFtZXRlcnM6IGZ1bmN0aW9uKHBhcmFtcykge1xyXG4gICAgICAgICAgICBmb3IodmFyIGkgPSAwOyBpPCBwYXJhbXMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICAgICAgICAgIGlmIChpID09IHRoaXMucGFyYW1zLmxlbmd0aClcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIHZhciBuYW1lID0gdGhpcy5wYXJhbXNbaV07XHJcbiAgICAgICAgICAgICAgICB2YXIgYmluZGluZ3MgPSB0aGlzLmdldEJpbmRpbmdzKCk7XHJcbiAgICAgICAgICAgICAgICBiaW5kaW5nc1tuYW1lXSA9IHsgZXh0cmE6IHt9IH07XHJcbiAgICAgICAgICAgICAgICBCYXNlLmRlZXBFeHRlbmQoYmluZGluZ3NbbmFtZV0uZXh0cmEsIHBhcmFtc1tpXS5nZXRFeHRyYSgpKTtcclxuICAgICAgICAgICAgICAgIGlmIChwYXJhbXNbaV0uZ2V0Tm9kZUluZm8oKSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGJpbmRpbmdzW25hbWVdLmluZm8gPSB7fTtcclxuICAgICAgICAgICAgICAgICAgICBCYXNlLmRlZXBFeHRlbmQoYmluZGluZ3NbbmFtZV0uaW5mbywgcGFyYW1zW2ldLmdldE5vZGVJbmZvKCkpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSxcclxuXHJcbiAgICAgICAgc3RyOiBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgdmFyIGN0eCA9IHRoaXM7XHJcbiAgICAgICAgICAgIHZhciBuYW1lcyA9IFtdO1xyXG4gICAgICAgICAgICB3aGlsZShjdHgpIHtcclxuICAgICAgICAgICAgICAgIG5hbWVzLnVuc2hpZnQoY3R4LmdldE5hbWUoKSk7XHJcbiAgICAgICAgICAgICAgICBjdHggPSBjdHgucGFyZW50O1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHJldHVybiBuYW1lcy5qb2luKFwiLlwiKTtcclxuICAgICAgICB9LFxyXG5cclxuICAgICAgICBnZXRBbGxCaW5kaW5nczogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgIHZhciByZXN1bHQgPSBPYmplY3Qua2V5cyh0aGlzLmdldEJpbmRpbmdzKCkpO1xyXG4gICAgICAgICAgICBpZiAodGhpcy5wYXJlbnQpIHtcclxuICAgICAgICAgICAgICAgIHZhciBwYXJlbnRCaW5kaW5ncyA9IHRoaXMucGFyZW50LmdldEFsbEJpbmRpbmdzKCk7XHJcbiAgICAgICAgICAgICAgICBmb3IodmFyIGkgPSAwOyBpIDwgcGFyZW50QmluZGluZ3MubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAocmVzdWx0LmluZGV4T2YocGFyZW50QmluZGluZ3NbaV0pICE9PSAtMSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXN1bHQucHVzaChwYXJlbnRCaW5kaW5nc1tpXSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHJldHVybiByZXN1bHQ7XHJcbiAgICAgICAgfSxcclxuXHJcbiAgICAgICAgLyoqXHJcbiAgICAgICAgICpcclxuICAgICAgICAgKiBAcGFyYW0gbm9kZVxyXG4gICAgICAgICAqIEByZXR1cm5zIHtUeXBlSW5mb31cclxuICAgICAgICAgKi9cclxuICAgICAgICBjcmVhdGVUeXBlSW5mbzogZnVuY3Rpb24gKG5vZGUpIHtcclxuICAgICAgICAgICAgdmFyIHJlc3VsdCA9IG5ldyBBbm5vdGF0aW9uKG5vZGUpO1xyXG4gICAgICAgICAgICBpZiAobm9kZS50eXBlID09IFN5bnRheC5JZGVudGlmaWVyKSB7XHJcbiAgICAgICAgICAgICAgICB2YXIgbmFtZSA9IG5vZGUubmFtZTtcclxuICAgICAgICAgICAgICAgIHZhciBiaW5kaW5nID0gdGhpcy5nZXRCaW5kaW5nQnlOYW1lKG5hbWUpO1xyXG4gICAgICAgICAgICAgICAgaWYgKGJpbmRpbmcpIHtcclxuICAgICAgICAgICAgICAgICAgICByZXN1bHQuY29weShiaW5kaW5nKTtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gYmluZGluZztcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICByZXR1cm4gcmVzdWx0O1xyXG4gICAgICAgIH0sXHJcblxyXG4gICAgICAgIGdldE9iamVjdEluZm9Gb3I6IGZ1bmN0aW9uKG9iaikge1xyXG4gICAgICAgICAgICBpZiAoIW9iai5pc09iamVjdCgpKVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XHJcblxyXG4gICAgICAgICAgICAvKiBUaGUgVHlwZUluZm8gbWlnaHQga25vdyBhYm91dCBpdCdzIG9iamVjdCB0eXBlICovXHJcbiAgICAgICAgICAgIGlmIChvYmouZ2V0T2JqZWN0SW5mbykge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIG9iai5nZXRPYmplY3RJbmZvKCk7XHJcbiAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgICB2YXIgbm9kZUluZm8gPSBvYmouZ2V0Tm9kZUluZm8oKTtcclxuICAgICAgICAgICAgaWYgKG5vZGVJbmZvKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gbm9kZUluZm87XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmV0dXJuIHJlZ2lzdHJ5LmdldEluc3RhbmNlRm9yS2luZChvYmouZ2V0S2luZCgpKVxyXG4gICAgICAgIH1cclxuXHJcbiAgICB9KTtcclxuXHJcblxyXG4gICAgICAgIHJldHVybiBDb250ZXh0O1xyXG5cclxuICAgIH07XHJcblxyXG5cclxuXHJcbn0oZXhwb3J0cykpO1xyXG4iLCIoZnVuY3Rpb24obnMpe1xyXG5cclxuICAgIG5zLmV4dGVuZCA9IGZ1bmN0aW9uKGEsIGIpIHtcclxuICAgICAgICBmb3IgKCB2YXIgcHJvcCBpbiBiKSB7XHJcbiAgICAgICAgICAgIHZhciBnID0gYi5fX2xvb2t1cEdldHRlcl9fKHByb3ApLCBzID0gYi5fX2xvb2t1cFNldHRlcl9fKHByb3ApO1xyXG4gICAgICAgICAgICBpZiAoZ3x8cykge1xyXG4gICAgICAgICAgICAgICAgaWYgKGcpIHtcclxuICAgICAgICAgICAgICAgICAgICBhLl9fZGVmaW5lR2V0dGVyX18ocHJvcCwgZyk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBpZiAocykge1xyXG4gICAgICAgICAgICAgICAgICAgIGEuX19kZWZpbmVTZXR0ZXJfXyhwcm9wLCBzKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIGlmIChiW3Byb3BdID09PSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgICAgICAgICBkZWxldGUgYVtwcm9wXTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAocHJvcCAhPT0gXCJjb25zdHJ1Y3RvclwiIHx8IGEgIT09IHdpbmRvdykge1xyXG4gICAgICAgICAgICAgICAgICAgIGFbcHJvcF0gPSBiW3Byb3BdO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBhO1xyXG4gICAgfTtcclxuXHJcbiAgICBucy5kZWVwRXh0ZW5kID0gZnVuY3Rpb24oZGVzdGluYXRpb24sIHNvdXJjZSkge1xyXG4gICAgICAgIGZvciAodmFyIHByb3BlcnR5IGluIHNvdXJjZSkge1xyXG4gICAgICAgICAgICBpZiAodHlwZW9mIHNvdXJjZVtwcm9wZXJ0eV0gPT09IFwib2JqZWN0XCIgJiYgc291cmNlW3Byb3BlcnR5XSAhPT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgZGVzdGluYXRpb25bcHJvcGVydHldID0gZGVzdGluYXRpb25bcHJvcGVydHldIHx8IHt9O1xyXG4gICAgICAgICAgICAgICAgbnMuZGVlcEV4dGVuZChkZXN0aW5hdGlvbltwcm9wZXJ0eV0sIHNvdXJjZVtwcm9wZXJ0eV0pO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgZGVzdGluYXRpb25bcHJvcGVydHldID0gc291cmNlW3Byb3BlcnR5XTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH07XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKlxyXG4gICAgICogQHBhcmFtIHtPYmplY3R9IGN0b3IgQ29uc3RydWN0b3JcclxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBwYXJlbnQgUGFyZW50IGNsYXNzXHJcbiAgICAgKiBAcGFyYW0ge09iamVjdD19IG1ldGhvZHMgTWV0aG9kcyB0byBhZGQgdG8gdGhlIGNsYXNzXHJcbiAgICAgKiBAcmV0dXJuIHtPYmplY3QhfVxyXG4gICAgICovXHJcbiAgICBucy5jcmVhdGVDbGFzcyA9IGZ1bmN0aW9uKGN0b3IsIHBhcmVudCwgbWV0aG9kcykge1xyXG4gICAgICAgIG1ldGhvZHMgPSBtZXRob2RzIHx8IHt9O1xyXG4gICAgICAgIGlmIChwYXJlbnQpIHtcclxuICAgICAgICAgICAgLyoqIEBjb25zdHJ1Y3RvciAqL1xyXG4gICAgICAgICAgICB2YXIgRiA9IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICBGLnByb3RvdHlwZSA9IHBhcmVudC5wcm90b3R5cGU7XHJcbiAgICAgICAgICAgIGN0b3IucHJvdG90eXBlID0gbmV3IEYoKTtcclxuICAgICAgICAgICAgY3Rvci5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBjdG9yO1xyXG4gICAgICAgICAgICBjdG9yLnN1cGVyY2xhc3MgPSBwYXJlbnQucHJvdG90eXBlO1xyXG4gICAgICAgIH1cclxuICAgICAgICBmb3IgKCB2YXIgbSBpbiBtZXRob2RzKSB7XHJcbiAgICAgICAgICAgIGN0b3IucHJvdG90eXBlW21dID0gbWV0aG9kc1ttXTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIGN0b3I7XHJcbiAgICB9O1xyXG5cclxuXHJcbn0oZXhwb3J0cykpXHJcbiIsIihmdW5jdGlvbihucyl7XHJcblxyXG4gICAgdmFyIFNoYWRlID0gcmVxdWlyZShcIi4uL2ludGVyZmFjZXMuanNcIiksXHJcbiAgICAgICAgU3ludGF4ID0gcmVxdWlyZSgnZXN0cmF2ZXJzZScpLlN5bnRheCxcclxuICAgICAgICBCYXNlID0gcmVxdWlyZShcIi4vaW5kZXguanNcIik7XHJcblxyXG4gICAgdmFyIFRZUEVTID0gU2hhZGUuVFlQRVMsXHJcbiAgICAgICAgS0lORFMgPSBTaGFkZS5PQkpFQ1RfS0lORFM7XHJcblxyXG5cclxuICAgIC8qKlxyXG4gICAgICogQHBhcmFtIHsqfSBub2RlIENhcnJpZXIgb2JqZWN0IGZvciB0aGUgdHlwZSBpbmZvLCBvbmx5IG5vZGUuZXh0cmEgZ2V0cyBwb2xsdXRlZFxyXG4gICAgICogQHBhcmFtIHtPYmplY3Q/fSBleHRyYVxyXG4gICAgICogQGNvbnN0cnVjdG9yXHJcbiAgICAgKi9cclxuICAgIHZhciBUeXBlSW5mbyA9IGZ1bmN0aW9uIChub2RlLCBleHRyYSkge1xyXG4gICAgICAgIHRoaXMubm9kZSA9IG5vZGU7XHJcbiAgICAgICAgdGhpcy5ub2RlLmV4dHJhID0gdGhpcy5ub2RlLmV4dHJhIHx8IHt9O1xyXG4gICAgICAgIGlmIChleHRyYSkge1xyXG4gICAgICAgICAgICBCYXNlLmRlZXBFeHRlbmQodGhpcy5ub2RlLmV4dHJhLCBleHRyYSk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIFR5cGVJbmZvLmNyZWF0ZUZvckNvbnRleHQgPSBmdW5jdGlvbihub2RlLCBjdHgpIHtcclxuICAgICAgICB2YXIgcmVzdWx0ID0gbmV3IFR5cGVJbmZvKG5vZGUpO1xyXG4gICAgICAgIGlmIChyZXN1bHQuZ2V0VHlwZSgpICE9PSBUWVBFUy5BTlkpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHJlc3VsdDtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChub2RlLnR5cGUgPT0gU3ludGF4LklkZW50aWZpZXIpIHtcclxuICAgICAgICAgICAgdmFyIG5hbWUgPSBub2RlLm5hbWU7XHJcbiAgICAgICAgICAgIHZhciB2YXJpYWJsZSA9IGN0eC5nZXRCaW5kaW5nQnlOYW1lKG5hbWUpO1xyXG4gICAgICAgICAgICByZXR1cm4gbmV3IFR5cGVJbmZvKG5vZGUsIHZhcmlhYmxlKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcclxuICAgIH1cclxuXHJcbiAgICBUeXBlSW5mby5wcm90b3R5cGUgPSB7XHJcbiAgICAgICAgZ2V0RXh0cmE6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMubm9kZS5leHRyYTtcclxuICAgICAgICB9LFxyXG4gICAgICAgIGdldFR5cGU6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgdmFyIGV4dHJhID0gdGhpcy5nZXRFeHRyYSgpO1xyXG4gICAgICAgICAgICBpZiAoZXh0cmEudHlwZSAhPSB1bmRlZmluZWQpXHJcbiAgICAgICAgICAgICAgICByZXR1cm4gZXh0cmEudHlwZTtcclxuICAgICAgICAgICAgcmV0dXJuIFRZUEVTLkFOWTtcclxuICAgICAgICB9LFxyXG5cclxuICAgICAgICBzZXRLaW5kOiBmdW5jdGlvbiAoa2luZCkge1xyXG4gICAgICAgICAgICB2YXIgZXh0cmEgPSB0aGlzLmdldEV4dHJhKCk7XHJcbiAgICAgICAgICAgIGV4dHJhLmtpbmQgPSBraW5kO1xyXG4gICAgICAgIH0sXHJcblxyXG4gICAgICAgIGdldEtpbmQ6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgaWYgKCF0aGlzLmlzT2JqZWN0KCkpXHJcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuZ2V0RXh0cmEoKS5raW5kIHx8IEtJTkRTLkFOWTtcclxuICAgICAgICB9LFxyXG5cclxuICAgICAgICBnZXRBcnJheUVsZW1lbnRUeXBlOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgIGlmKCF0aGlzLmlzQXJyYXkoKSlcclxuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIkNhbGxlZCBnZXRBcnJheUVsZW1lbnRUeXBlIG9uIFwiICsgdGhpcy5nZXRUeXBlKCkpO1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5nZXRFeHRyYSgpLmVsZW1lbnRzO1xyXG4gICAgICAgIH0sXHJcblxyXG4gICAgICAgIGlzT2ZLaW5kOiBmdW5jdGlvbihraW5kKSB7XHJcbiAgICAgICAgICAgIGlmICghdGhpcy5pc09iamVjdCgpKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuZ2V0S2luZCgpID09IGtpbmQ7XHJcbiAgICAgICAgfSxcclxuXHJcbiAgICAgICAgLyoqXHJcbiAgICAgICAgICogQHBhcmFtIHtzdHJpbmd9IHR5cGVcclxuICAgICAgICAgKiBAcGFyYW0ge3N0cmluZz99IGtpbmRcclxuICAgICAgICAgKi9cclxuICAgICAgICBzZXRUeXBlOiBmdW5jdGlvbiAodHlwZSwga2luZCkge1xyXG4gICAgICAgICAgICB2YXIgZXh0cmEgPSB0aGlzLmdldEV4dHJhKCk7XHJcbiAgICAgICAgICAgIGV4dHJhLnR5cGUgPSB0eXBlO1xyXG4gICAgICAgICAgICBpZiAoa2luZClcclxuICAgICAgICAgICAgICAgIHRoaXMuc2V0S2luZChraW5kKTtcclxuICAgICAgICB9LFxyXG5cclxuICAgICAgICBpc09mVHlwZTogZnVuY3Rpb24gKHR5cGUpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuZ2V0VHlwZSgpID09IHR5cGU7XHJcbiAgICAgICAgfSxcclxuXHJcbiAgICAgICAgZXF1YWxzOiBmdW5jdGlvbiAob3RoZXIpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuZ2V0VHlwZSgpID09IG90aGVyLmdldFR5cGUoKSAmJiB0aGlzLmdldEtpbmQoKSA9PSBvdGhlci5nZXRLaW5kKCk7XHJcbiAgICAgICAgfSxcclxuXHJcbiAgICAgICAgaXNJbnQ6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuaXNPZlR5cGUoVFlQRVMuSU5UKTtcclxuICAgICAgICB9LFxyXG4gICAgICAgIGlzTnVtYmVyOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmlzT2ZUeXBlKFRZUEVTLk5VTUJFUik7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBpc051bGxPclVuZGVmaW5lZDogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5pc051bGwoKSB8fCB0aGlzLmlzVW5kZWZpbmVkKCk7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBpc051bGw6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuaXNPZlR5cGUoVFlQRVMuTlVMTCk7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBpc1VuZGVmaW5lZDogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5pc09mVHlwZShUWVBFUy5VTkRFRklORUQpO1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgaXNCb29sOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmlzT2ZUeXBlKFRZUEVTLkJPT0xFQU4pO1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgaXNTdHJpbmc6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuaXNPZlR5cGUoVFlQRVMuU1RSSU5HKTtcclxuICAgICAgICB9LFxyXG4gICAgICAgIGlzQXJyYXk6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuaXNPZlR5cGUoVFlQRVMuQVJSQVkpO1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgaXNGdW5jdGlvbjogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5pc09mVHlwZShUWVBFUy5GVU5DVElPTik7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBpc09iamVjdDogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5pc09mVHlwZShUWVBFUy5PQkpFQ1QpO1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgaXNHbG9iYWw6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICByZXR1cm4gISF0aGlzLmdldEV4dHJhKCkuZ2xvYmFsO1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgc2V0R2xvYmFsOiBmdW5jdGlvbiAoZ2xvYmFsKSB7XHJcbiAgICAgICAgICAgIHZhciBleHRyYSA9IHRoaXMuZ2V0RXh0cmEoKTtcclxuICAgICAgICAgICAgZXh0cmEuZ2xvYmFsID0gZ2xvYmFsO1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgY2FuTnVtYmVyOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmlzTnVtYmVyKCkgfHwgdGhpcy5pc0ludCgpIHx8IHRoaXMuaXNCb29sKCk7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBjYW5JbnQ6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuaXNJbnQoKSB8fCB0aGlzLmlzQm9vbCgpO1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgaGFzU3RhdGljVmFsdWUgOiBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgdmFyIGV4dHJhID0gdGhpcy5nZXRFeHRyYSgpO1xyXG4gICAgICAgICAgICBpZiAodGhpcy5pc051bGxPclVuZGVmaW5lZCgpKVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgICAgIHJldHVybiBleHRyYS5oYXNPd25Qcm9wZXJ0eShcInN0YXRpY1ZhbHVlXCIpO1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgc2V0U3RhdGljVmFsdWUgOiBmdW5jdGlvbih2KSB7XHJcbiAgICAgICAgICAgIHZhciBleHRyYSA9IHRoaXMuZ2V0RXh0cmEoKTtcclxuICAgICAgICAgICAgaWYgKHRoaXMuaXNOdWxsT3JVbmRlZmluZWQoKSlcclxuICAgICAgICAgICAgICAgIHRocm93KFwiTnVsbCBhbmQgdW5kZWZpbmVkIGhhdmUgcHJlZGVmaW5lZCB2YWx1ZXMuXCIpO1xyXG4gICAgICAgICAgICBleHRyYS5zdGF0aWNWYWx1ZSA9IHY7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBnZXRTdGF0aWNWYWx1ZSA6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICBpZiAoIXRoaXMuaGFzU3RhdGljVmFsdWUoKSkge1xyXG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiTm9kZSBoYXMgbm8gc3RhdGljIHZhbHVlOiBcIiArIHRoaXMubm9kZSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKHRoaXMuaXNOdWxsKCkpXHJcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgICAgICAgICAgaWYgKHRoaXMuaXNVbmRlZmluZWQoKSlcclxuICAgICAgICAgICAgICAgIHJldHVybiB1bmRlZmluZWQ7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmdldEV4dHJhKCkuc3RhdGljVmFsdWU7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBzZXREeW5hbWljVmFsdWUgOiBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgZGVsZXRlIHRoaXMuZ2V0RXh0cmEoKS5zdGF0aWNWYWx1ZTtcclxuICAgICAgICB9LFxyXG4gICAgICAgIHNldENhbGwgOiBmdW5jdGlvbihjYWxsKSB7XHJcbiAgICAgICAgICAgIHZhciBleHRyYSA9IHRoaXMuZ2V0RXh0cmEoKTtcclxuICAgICAgICAgICAgZXh0cmEuZXZhbHVhdGUgPSBjYWxsO1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgZ2V0Q2FsbCA6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5nZXRFeHRyYSgpLmV2YWx1YXRlO1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgY2xlYXJDYWxsOiBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgdmFyIGV4dHJhID0gdGhpcy5nZXRFeHRyYSgpO1xyXG4gICAgICAgICAgICBkZWxldGUgZXh0cmEuZXZhbHVhdGU7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBjb3B5OiBmdW5jdGlvbihvdGhlcikge1xyXG4gICAgICAgICAgICBCYXNlLmRlZXBFeHRlbmQodGhpcy5ub2RlLmV4dHJhLCBvdGhlci5nZXRFeHRyYSgpKTtcclxuICAgICAgICB9LFxyXG4gICAgICAgIHN0cjogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgIHZhciBleHRyYSA9IHRoaXMuZ2V0RXh0cmEoKTtcclxuICAgICAgICAgICAgcmV0dXJuIEpTT04uc3RyaW5naWZ5KGV4dHJhLCBudWxsLCAxKTtcclxuICAgICAgICB9LFxyXG4gICAgICAgIGNhbk5vcm1hbDogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmlzT2JqZWN0KCkgJiYgKHRoaXMuaXNPZktpbmQoS0lORFMuTk9STUFMKSB8fCB0aGlzLmlzT2ZLaW5kKEtJTkRTLkZMT0FUMykpO1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgY2FuQ29sb3I6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5pc09iamVjdCgpICYmICh0aGlzLmlzT2ZLaW5kKEtJTkRTLkZMT0FUNCkgfHwgdGhpcy5pc09mS2luZChLSU5EUy5GTE9BVDMpKTtcclxuICAgICAgICB9LFxyXG4gICAgICAgIGVsaW1pbmF0ZSA6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICB2YXIgZXh0cmEgPSB0aGlzLmdldEV4dHJhKCk7XHJcbiAgICAgICAgICAgIGV4dHJhLmVsaW1pbmF0ZSA9IHRydWU7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBjYW5FbGltaW5hdGUgOiBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgdmFyIGV4dHJhID0gdGhpcy5nZXRFeHRyYSgpO1xyXG4gICAgICAgICAgICByZXR1cm4gZXh0cmEuZWxpbWluYXRlID09IHRydWU7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBzZXRGcm9tRXh0cmE6IGZ1bmN0aW9uKGV4dHJhKXtcclxuICAgICAgICAgICAgdGhpcy5zZXRUeXBlKGV4dHJhLnR5cGUpO1xyXG4gICAgICAgICAgICBpZiAoZXh0cmEua2luZCAhPSB1bmRlZmluZWQpXHJcbiAgICAgICAgICAgICAgICB0aGlzLnNldEtpbmQoZXh0cmEua2luZCk7XHJcbiAgICAgICAgICAgIHRoaXMuc2V0R2xvYmFsKGV4dHJhLmdsb2JhbCk7XHJcbiAgICAgICAgICAgIGlmIChleHRyYS5zdGF0aWNWYWx1ZSAhPSB1bmRlZmluZWQpXHJcbiAgICAgICAgICAgICAgICB0aGlzLnNldFN0YXRpY1ZhbHVlKGV4dHJhLnN0YXRpY1ZhbHVlKTtcclxuICAgICAgICAgICAgaWYgKGV4dHJhLmV2YWx1YXRlICE9IHVuZGVmaW5lZClcclxuICAgICAgICAgICAgICAgIHRoaXMuc2V0Q2FsbChleHRyYS5ldmFsdWF0ZSk7XHJcbiAgICAgICAgICAgIGlmIChleHRyYS5zb3VyY2UgIT0gdW5kZWZpbmVkKVxyXG4gICAgICAgICAgICAgICAgdGhpcy5zZXRTb3VyY2UoZXh0cmEuc291cmNlKTtcclxuICAgICAgICB9LFxyXG4gICAgICAgIGdldE5vZGVJbmZvOiBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgaWYgKHRoaXMuaXNPYmplY3QoKSlcclxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmdldEV4dHJhKCkuaW5mbztcclxuICAgICAgICB9LFxyXG4gICAgICAgIGdldFR5cGVTdHJpbmc6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICBpZiAodGhpcy5pc09iamVjdCgpKVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIFwiT2JqZWN0ICM8XCIgKyB0aGlzLmdldEtpbmQoKSArIFwiPlwiO1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5nZXRUeXBlKCk7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBzZXRTb3VyY2U6IGZ1bmN0aW9uKHNvdXJjZSkge1xyXG4gICAgICAgICAgICB2YXIgZXh0cmEgPSB0aGlzLmdldEV4dHJhKCk7XHJcbiAgICAgICAgICAgIGV4dHJhLnNvdXJjZSA9IHNvdXJjZTtcclxuICAgICAgICB9LFxyXG4gICAgICAgIGdldFNvdXJjZTogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmdldEV4dHJhKCkuc291cmNlO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICB9XHJcblxyXG4gICAgbnMuVHlwZUluZm8gPSBUeXBlSW5mbztcclxuXHJcbn0oZXhwb3J0cykpO1xyXG4iLCIoZnVuY3Rpb24obnMpe1xyXG5cclxuICAgIG5zLnN3aXp6bGVUb0luZGV4ID0gZnVuY3Rpb24oc3dpenpsZUtleSl7XHJcbiAgICAgICAgc3dpdGNoKHN3aXp6bGVLZXkpe1xyXG4gICAgICAgICAgICBjYXNlICd4JzpjYXNlICdyJyA6Y2FzZSAncyc6IHJldHVybiAwO1xyXG4gICAgICAgICAgICBjYXNlICd5JzpjYXNlICdnJyA6Y2FzZSAndCc6IHJldHVybiAxO1xyXG4gICAgICAgICAgICBjYXNlICd6JzpjYXNlICdiJyA6Y2FzZSAncCc6IHJldHVybiAyO1xyXG4gICAgICAgICAgICBjYXNlICd3JzpjYXNlICdhJyA6Y2FzZSAncSc6IHJldHVybiAzO1xyXG4gICAgICAgIH1cclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJVbmtub3duIHN3aXp6bGUga2V5OiAnXCIgKyBzd2l6emxlS2V5ICsgXCInXCIpO1xyXG4gICAgfTtcclxuICAgIG5zLmluZGV4VG9Td2l6emxlID0gZnVuY3Rpb24oaW5kZXgpe1xyXG4gICAgICAgIHN3aXRjaChpbmRleCl7XHJcbiAgICAgICAgICAgIGNhc2UgMDogcmV0dXJuICd4JztcclxuICAgICAgICAgICAgY2FzZSAxOiByZXR1cm4gJ3knO1xyXG4gICAgICAgICAgICBjYXNlIDI6IHJldHVybiAneic7XHJcbiAgICAgICAgICAgIGNhc2UgMzogcmV0dXJuICd3JztcclxuICAgICAgICB9XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiVW5rbm93biBzd2l6emxlIGluZGV4OiAnXCIgKyBpbmRleCArIFwiJ1wiKTtcclxuICAgIH07XHJcbiAgICBucy5zd2l6emxlU2V0cyA9IFtcclxuICAgICAgICBbJ3gnLCAneScsICd6JywgJ3cnXSxcclxuICAgICAgICBbJ3InLCAnZycsICdiJywgJ2EnXSxcclxuICAgICAgICBbJ3MnLCAndCcsICdwJywgJ3EnXVxyXG4gICAgXTtcclxuXHJcbn0oZXhwb3J0cykpXHJcbiIsIihmdW5jdGlvbiAobnMpIHtcclxuXHJcbiAgICB2YXIgQmFzZSA9IHJlcXVpcmUoXCIuLi8uLi9iYXNlL2luZGV4LmpzXCIpO1xyXG5cclxuICAgIHZhciBUcmFuc2Zvcm1lciA9IHJlcXVpcmUoXCIuL3RyYW5zZm9ybS5qc1wiKS5HTEFTVFRyYW5zZm9ybWVyO1xyXG4gICAgdmFyIGdlbmVyYXRlID0gcmVxdWlyZShcIi4vZ2xzbC1nZW5lcmF0ZS5qc1wiKS5nZW5lcmF0ZTtcclxuXHJcbiAgICB2YXIgR0xTTENvbXBpbGVyID0gZnVuY3Rpb24gKCkge1xyXG5cclxuICAgIH07XHJcblxyXG4gICAgQmFzZS5leHRlbmQoR0xTTENvbXBpbGVyLnByb3RvdHlwZSwge1xyXG5cclxuICAgICAgICBjb21waWxlRnJhZ21lbnRTaGFkZXI6IGZ1bmN0aW9uIChhYXN0LCBvcHQpIHtcclxuXHJcbiAgICAgICAgICAgIHZhciB0cmFuc2Zvcm1lciA9IG5ldyBUcmFuc2Zvcm1lcihcImdsb2JhbC5zaGFkZVwiKTtcclxuXHJcbiAgICAgICAgICAgIC8vY29uc29sZS5sb2coSlNPTi5zdHJpbmdpZnkoYWFzdCwgMCwgXCIgXCIpKTtcclxuXHJcbiAgICAgICAgICAgIHZhciB0cmFuc2Zvcm1lZCA9IHRyYW5zZm9ybWVyLnRyYW5zZm9ybUFBU1QoYWFzdCk7XHJcblxyXG4gICAgICAgICAgICAvL2NvbnNvbGUubG9nKEpTT04uc3RyaW5naWZ5KGFhc3QsIDAsIFwiIFwiKSk7XHJcblxyXG4gICAgICAgICAgICB2YXIgY29kZSA9IGdlbmVyYXRlKHRyYW5zZm9ybWVkLCBvcHQpO1xyXG5cclxuICAgICAgICAgICAgcmV0dXJuIGNvZGU7XHJcbiAgICAgICAgfVxyXG5cclxuICAgIH0pO1xyXG5cclxuXHJcbiAgICBucy5HTFNMQ29tcGlsZXIgPSBHTFNMQ29tcGlsZXI7XHJcblxyXG59KGV4cG9ydHMpKTtcclxuIiwiKGZ1bmN0aW9uIChucykge1xyXG5cclxuICAgIHZhciBGdW5jdGlvbkFubm90YXRpb24gPSByZXF1aXJlKFwiLi8uLi8uLi9iYXNlL2Fubm90YXRpb24uanNcIikuRnVuY3Rpb25Bbm5vdGF0aW9uO1xyXG4gICAgdmFyIFNoYWRlID0gcmVxdWlyZShcIi4vLi4vLi4vaW50ZXJmYWNlcy5qc1wiKTtcclxuICAgIHZhciB3YWxrID0gcmVxdWlyZSgnZXN0cmF2ZXJzZScpLFxyXG4gICAgICAgIFN5bnRheCA9IHdhbGsuU3ludGF4LFxyXG4gICAgICAgIFZpc2l0b3JPcHRpb24gPSB3YWxrLlZpc2l0b3JPcHRpb247XHJcblxyXG4gICAgdmFyIFR5cGVzID0gU2hhZGUuVFlQRVMsXHJcbiAgICAgICAgS2luZHMgPSBTaGFkZS5PQkpFQ1RfS0lORFMsXHJcbiAgICAgICAgU291cmNlcyA9IFNoYWRlLlNPVVJDRVM7XHJcblxyXG5cclxuXHJcbiAgICAvKipcclxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBvcHRcclxuICAgICAqL1xyXG4gICAgdmFyIGdldEhlYWRlciA9IGZ1bmN0aW9uIChvcHQpIHtcclxuICAgICAgICBpZiAob3B0Lm9taXRIZWFkZXIgPT0gdHJ1ZSlcclxuICAgICAgICAgICAgcmV0dXJuIFtdO1xyXG4gICAgICAgIHZhciBoZWFkZXIgPSBbXHJcbiAgICAgICAgICAgIFwiLy8gR2VuZXJhdGVkIGJ5IHNoYWRlLmpzXCJcclxuICAgICAgICBdO1xyXG4gICAgICAgIHZhciBmbG9hdFByZWNpc2lvbiA9IG9wdC5mbG9hdFByZWNpc2lvbiB8fCBcIm1lZGl1bXBcIjtcclxuICAgICAgICBoZWFkZXIucHVzaChcInByZWNpc2lvbiBcIiArIGZsb2F0UHJlY2lzaW9uICsgXCIgZmxvYXQ7XCIpO1xyXG4gICAgICAgIHJldHVybiBoZWFkZXI7XHJcbiAgICB9XHJcblxyXG4gICAgdmFyIHRvR0xTTFR5cGUgPSBmdW5jdGlvbiAoaW5mbywgYWxsb3dVbmRlZmluZWQpIHtcclxuICAgICAgICBzd2l0Y2ggKGluZm8udHlwZSkge1xyXG4gICAgICAgICAgICBjYXNlIFR5cGVzLk9CSkVDVDpcclxuICAgICAgICAgICAgICAgIHN3aXRjaCAoaW5mby5raW5kKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBLaW5kcy5GTE9BVDQ6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBcInZlYzRcIjtcclxuICAgICAgICAgICAgICAgICAgICBjYXNlIEtpbmRzLkZMT0FUMzpcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFwidmVjM1wiO1xyXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgS2luZHMuRkxPQVQyOlxyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gXCJ2ZWMyXCI7XHJcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBLaW5kcy5URVhUVVJFOlxyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gXCJzYW1wbGVyMkRcIlxyXG4gICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBcIjx1bmRlZmluZWQ+XCI7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGNhc2UgVHlwZXMuVU5ERUZJTkVEOlxyXG4gICAgICAgICAgICAgICAgaWYgKGFsbG93VW5kZWZpbmVkKVxyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBcInZvaWRcIjtcclxuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIkNvdWxkIG5vdCBkZXRlcm1pbmUgdHlwZVwiKTtcclxuICAgICAgICAgICAgY2FzZSBUeXBlcy5OVU1CRVI6XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gXCJmbG9hdFwiO1xyXG4gICAgICAgICAgICBjYXNlIFR5cGVzLkJPT0xFQU46XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gXCJib29sXCI7XHJcbiAgICAgICAgICAgIGNhc2UgVHlwZXMuSU5UOlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIFwiaW50XCI7XHJcbiAgICAgICAgICAgIGNhc2UgVHlwZXMuQk9PTEVBTjpcclxuICAgICAgICAgICAgICAgIHJldHVybiBcImJvb2xcIjtcclxuICAgICAgICAgICAgZGVmYXVsdDpcclxuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcInRvR0xTTFR5cGU6IFVuaGFuZGxlZCB0eXBlOiBcIiArIGluZm8udHlwZSk7XHJcblxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICB2YXIgdG9HTFNMU291cmNlID0gZnVuY3Rpb24oaW5mbykge1xyXG4gICAgICAgIGlmICghaW5mby5zb3VyY2UpXHJcbiAgICAgICAgICAgIHJldHVybiBcIlwiO1xyXG4gICAgICAgIGlmIChpbmZvLnNvdXJjZSA9PSBTb3VyY2VzLlZFUlRFWClcclxuICAgICAgICAgICAgcmV0dXJuIFwidmFyeWluZ1wiO1xyXG4gICAgICAgIGlmIChpbmZvLnNvdXJjZSA9PSBTb3VyY2VzLlVOSUZPUk0pXHJcbiAgICAgICAgICAgIHJldHVybiBcInVuaWZvcm1cIjtcclxuICAgICAgICBpZiAoaW5mby5zb3VyY2UgPT0gU291cmNlcy5DT05TVEFOVClcclxuICAgICAgICAgICAgcmV0dXJuIFwiY29uc3RcIjtcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJ0b0dMU0xTb3VyY2U6IFVuaGFuZGxlZCB0eXBlOiBcIiArIGluZm8uc291cmNlKTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBjcmVhdGVMaW5lU3RhY2soKSB7XHJcbiAgICAgICAgdmFyIGFyciA9IFtdO1xyXG4gICAgICAgIGFyci5wdXNoLmFwcGx5KGFyciwgYXJndW1lbnRzKTtcclxuICAgICAgICB2YXIgaW5kZW50ID0gXCJcIjtcclxuICAgICAgICBhcnIuYXBwZW5kTGluZSA9IGZ1bmN0aW9uKGxpbmUpe1xyXG4gICAgICAgICAgICB0aGlzLnB1c2goaW5kZW50ICsgbGluZSk7XHJcbiAgICAgICAgfTtcclxuICAgICAgICBhcnIuY2hhbmdlSW5kZW50aW9uID0gZnVuY3Rpb24oYWRkKXtcclxuICAgICAgICAgICAgd2hpbGUoYWRkID4gMCl7XHJcbiAgICAgICAgICAgICAgICBpbmRlbnQgKz0gXCIgICAgXCI7IGFkZC0tO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmKGFkZCA8IDApe1xyXG4gICAgICAgICAgICAgICAgaW5kZW50ID0gaW5kZW50LnN1YnN0cigwLCBpbmRlbnQubGVuZ3RoICsgYWRkKjQpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfTtcclxuICAgICAgICBhcnIuYXBwZW5kID0gZnVuY3Rpb24oc3RyKXtcclxuICAgICAgICAgICAgdGhpc1t0aGlzLmxlbmd0aC0xXSA9IHRoaXNbdGhpcy5sZW5ndGgtMV0gKyBzdHI7XHJcbiAgICAgICAgfTtcclxuICAgICAgICByZXR1cm4gYXJyO1xyXG4gICAgfTtcclxuXHJcblxyXG4gICAgLypCYXNlLmV4dGVuZChMaW5lU3RhY2sucHJvdG90eXBlLCB7XHJcblxyXG4gICAgfSk7Ki9cclxuXHJcbiAgICB2YXIgZ2VuZXJhdGUgPSBmdW5jdGlvbiAoYXN0LCBvcHQpIHtcclxuXHJcbiAgICAgICAgb3B0ID0gb3B0IHx8IHt9O1xyXG5cclxuICAgICAgICB2YXIgbGluZXMgPSBjcmVhdGVMaW5lU3RhY2soKTtcclxuXHJcbiAgICAgICAgdHJhdmVyc2UoYXN0LCBsaW5lcywgb3B0KTtcclxuXHJcbiAgICAgICAgcmV0dXJuIGxpbmVzLmpvaW4oXCJcXG5cIik7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gdHJhdmVyc2UoYXN0LCBsaW5lcywgb3B0KSB7XHJcbiAgICAgICAgdmFyIGluc2lkZU1haW4gPSBmYWxzZTtcclxuXHJcblxyXG4gICAgICAgIHdhbGsudHJhdmVyc2UoYXN0LCB7XHJcbiAgICAgICAgICAgICAgICBlbnRlcjogZnVuY3Rpb24gKG5vZGUpIHtcclxuICAgICAgICAgICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgdHlwZSA9IG5vZGUudHlwZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgc3dpdGNoICh0eXBlKSB7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSBTeW50YXguUHJvZ3JhbTpcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBnZXRIZWFkZXIob3B0KS5mb3JFYWNoKGZ1bmN0aW9uIChlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxpbmVzLnB1c2goZSlcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuXHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSBTeW50YXguRnVuY3Rpb25EZWNsYXJhdGlvbjpcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgZnVuYyA9IG5ldyBGdW5jdGlvbkFubm90YXRpb24obm9kZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIG1ldGhvZFN0YXJ0ID0gW3RvR0xTTFR5cGUoZnVuYy5nZXRSZXR1cm5JbmZvKCksIHRydWUpXTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtZXRob2RTdGFydC5wdXNoKG5vZGUuaWQubmFtZSwgJygnKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZihub2RlLmlkLm5hbWUgPT0gXCJtYWluXCIpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGluc2lkZU1haW4gPSB0cnVlO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoIShub2RlLnBhcmFtcyAmJiBub2RlLnBhcmFtcy5sZW5ndGgpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1ldGhvZFN0YXJ0LnB1c2goXCJ2b2lkXCIpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5vZGUucGFyYW1zLmZvckVhY2goZnVuY3Rpb24gKHBhcmFtKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtZXRob2RTdGFydC5wdXNoKHRvR0xTTFR5cGUocGFyYW0uZXh0cmEpLCBwYXJhbS5uYW1lKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbWV0aG9kU3RhcnQucHVzaCgnKSB7Jyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGluZXMuYXBwZW5kTGluZShtZXRob2RTdGFydC5qb2luKFwiIFwiKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGluZXMuY2hhbmdlSW5kZW50aW9uKDEpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcclxuXHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSBTeW50YXguUmV0dXJuU3RhdGVtZW50OlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBoYXNBcmd1bWVudHMgPSBub2RlLmFyZ3VtZW50O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxpbmVzLmFwcGVuZExpbmUoXCJyZXR1cm4gXCIgKyAoaGFzQXJndW1lbnRzID8gaGFuZGxlRXhwcmVzc2lvbihub2RlLmFyZ3VtZW50KSA6IFwiXCIpICsgXCI7XCIpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXNlIFN5bnRheC5WYXJpYWJsZURlY2xhcmF0b3IgOlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKFwiTWVlcCFcIik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHNvdXJjZSA9ICFpbnNpZGVNYWluID8gdG9HTFNMU291cmNlKG5vZGUuZXh0cmEpIDogbnVsbDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgbGluZSA9IHNvdXJjZSA/IHNvdXJjZSArIFwiIFwiIDogXCJcIjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsaW5lICs9IHRvR0xTTFR5cGUobm9kZS5leHRyYSkgKyBcIiBcIiArIG5vZGUuaWQubmFtZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAobm9kZS5pbml0KSBsaW5lICs9IFwiID0gXCIgKyBoYW5kbGVFeHByZXNzaW9uKG5vZGUuaW5pdCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGluZXMuYXBwZW5kTGluZShsaW5lICsgXCI7XCIpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXNlIFN5bnRheC5Bc3NpZ25tZW50RXhwcmVzc2lvbjpcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsaW5lcy5hcHBlbmRMaW5lKGhhbmRsZUV4cHJlc3Npb24obm9kZSkgKyBcIjtcIilcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSBTeW50YXguRXhwcmVzc2lvblN0YXRlbWVudDpcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsaW5lcy5hcHBlbmRMaW5lKGhhbmRsZUV4cHJlc3Npb24obm9kZS5leHByZXNzaW9uKSArIFwiO1wiKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gVmlzaXRvck9wdGlvbi5Ta2lwO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgU3ludGF4LklmU3RhdGVtZW50OlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxpbmVzLmFwcGVuZExpbmUoXCJpZihcIiArIGhhbmRsZUV4cHJlc3Npb24obm9kZS50ZXN0KSArIFwiKSB7XCIpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsaW5lcy5jaGFuZ2VJbmRlbnRpb24oMSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdHJhdmVyc2Uobm9kZS5jb25zZXF1ZW50LCBsaW5lcywgb3B0KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsaW5lcy5jaGFuZ2VJbmRlbnRpb24oLTEpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAobm9kZS5hbHRlcm5hdGUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGluZXMuYXBwZW5kTGluZShcIn0gZWxzZSB7XCIpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsaW5lcy5jaGFuZ2VJbmRlbnRpb24oMSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRyYXZlcnNlKG5vZGUuYWx0ZXJuYXRlLCBsaW5lcywgb3B0KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGluZXMuY2hhbmdlSW5kZW50aW9uKC0xKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGluZXMuYXBwZW5kTGluZShcIn1cIik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFZpc2l0b3JPcHRpb24uU2tpcDtcclxuXHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDpcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vY29uc29sZS5sb2coXCJVbmhhbmRsZWQ6IFwiICsgdHlwZSk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBTaGFkZS50aHJvd0Vycm9yKG5vZGUsIGUubWVzc2FnZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgIGxlYXZlOiBmdW5jdGlvbiAobm9kZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciB0eXBlID0gbm9kZS50eXBlO1xyXG4gICAgICAgICAgICAgICAgICAgIHN3aXRjaCAodHlwZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjYXNlIFN5bnRheC5Qcm9ncmFtOlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgU3ludGF4LkZ1bmN0aW9uRGVjbGFyYXRpb246XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsaW5lcy5jaGFuZ2VJbmRlbnRpb24oLTEpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGluZXMuYXBwZW5kTGluZShcIn1cIik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICApO1xyXG4gICAgfVxyXG5cclxuICAgIHZhciBnZW5lcmF0ZUZsb2F0ID0gZnVuY3Rpb24odmFsdWUpIHtcclxuICAgICAgICBpZihpc05hTih2YWx1ZSkpXHJcbiAgICAgICAgICAgIHRocm93IEVycm9yKFwiSW50ZXJuYWw6IEV4cHJlc3Npb24gZ2VuZXJhdGVkIE5hTiFcIik7XHJcbiAgICAgICAgdmFyIHJlc3VsdCA9ICcnICsgdmFsdWU7XHJcbiAgICAgICAgaWYgKHJlc3VsdC5pbmRleE9mKFwiLlwiKSA9PSAtMSkge1xyXG4gICAgICAgICAgICByZXN1bHQgKz0gXCIuMFwiO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gcmVzdWx0O1xyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICpcclxuICAgICAqIEBwYXJhbSBub2RlXHJcbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfVxyXG4gICAgICovXHJcbiAgICB2YXIgaGFuZGxlRXhwcmVzc2lvbiA9IGZ1bmN0aW9uKG5vZGUpIHtcclxuICAgICAgICB2YXIgcmVzdWx0ID0gXCI8dW5oYW5kbGVkOiBcIiArIG5vZGUudHlwZSsgXCI+XCI7XHJcbiAgICAgICAgc3dpdGNoKG5vZGUudHlwZSkge1xyXG4gICAgICAgICAgICBjYXNlIFN5bnRheC5OZXdFeHByZXNzaW9uOlxyXG4gICAgICAgICAgICAgICAgcmVzdWx0ID0gdG9HTFNMVHlwZShub2RlLmV4dHJhKTtcclxuICAgICAgICAgICAgICAgIHJlc3VsdCArPSBoYW5kbGVBcmd1bWVudHMobm9kZS5hcmd1bWVudHMpO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcblxyXG4gICAgICAgICAgICBjYXNlIFN5bnRheC5MaXRlcmFsOlxyXG4gICAgICAgICAgICAgICAgdmFyIHZhbHVlID0gbm9kZS5leHRyYS5zdGF0aWNWYWx1ZSAhPT0gdW5kZWZpbmVkID8gbm9kZS5leHRyYS5zdGF0aWNWYWx1ZSA6IG5vZGUudmFsdWU7XHJcbiAgICAgICAgICAgICAgICBpZiAobm9kZS5leHRyYS50eXBlID09IFR5cGVzLk5VTUJFUilcclxuICAgICAgICAgICAgICAgICAgICByZXN1bHQgPSBnZW5lcmF0ZUZsb2F0KHZhbHVlKTtcclxuICAgICAgICAgICAgICAgIGVsc2VcclxuICAgICAgICAgICAgICAgICAgICByZXN1bHQgPSB2YWx1ZTtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG5cclxuXHJcbiAgICAgICAgICAgIGNhc2UgU3ludGF4LklkZW50aWZpZXI6XHJcbiAgICAgICAgICAgICAgICByZXN1bHQgPSBub2RlLm5hbWU7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuXHJcbiAgICAgICAgICAgIGNhc2UgU3ludGF4LkJpbmFyeUV4cHJlc3Npb246XHJcbiAgICAgICAgICAgIGNhc2UgU3ludGF4LkxvZ2ljYWxFeHByZXNzaW9uOlxyXG4gICAgICAgICAgICBjYXNlIFN5bnRheC5Bc3NpZ25tZW50RXhwcmVzc2lvbjpcclxuICAgICAgICAgICAgICAgIHJlc3VsdCA9IGhhbmRsZUJpbmFyeUFyZ3VtZW50KG5vZGUubGVmdCk7XHJcbiAgICAgICAgICAgICAgICByZXN1bHQgKz0gXCIgXCIgKyBub2RlLm9wZXJhdG9yICsgXCIgXCI7XHJcbiAgICAgICAgICAgICAgICByZXN1bHQgKz0gaGFuZGxlQmluYXJ5QXJndW1lbnQobm9kZS5yaWdodCk7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSBTeW50YXguVW5hcnlFeHByZXNzaW9uOlxyXG4gICAgICAgICAgICAgICAgcmVzdWx0ID0gbm9kZS5vcGVyYXRvcjtcclxuICAgICAgICAgICAgICAgIHJlc3VsdCArPSBoYW5kbGVCaW5hcnlBcmd1bWVudChub2RlLmFyZ3VtZW50KTtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG5cclxuICAgICAgICAgICAgY2FzZSBTeW50YXguQ2FsbEV4cHJlc3Npb246XHJcbiAgICAgICAgICAgICAgICByZXN1bHQgPSBoYW5kbGVFeHByZXNzaW9uKG5vZGUuY2FsbGVlKTtcclxuICAgICAgICAgICAgICAgIHJlc3VsdCArPSBoYW5kbGVBcmd1bWVudHMobm9kZS5hcmd1bWVudHMpO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcblxyXG4gICAgICAgICAgICBjYXNlIFN5bnRheC5NZW1iZXJFeHByZXNzaW9uOlxyXG4gICAgICAgICAgICAgICAgcmVzdWx0ID0gaGFuZGxlRXhwcmVzc2lvbihub2RlLm9iamVjdCk7XHJcbiAgICAgICAgICAgICAgICByZXN1bHQgKz0gXCIuXCI7XHJcbiAgICAgICAgICAgICAgICByZXN1bHQgKz0gaGFuZGxlRXhwcmVzc2lvbihub2RlLnByb3BlcnR5KTtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG5cclxuICAgICAgICAgICAgY2FzZSBTeW50YXguQ29uZGl0aW9uYWxFeHByZXNzaW9uOlxyXG4gICAgICAgICAgICAgICAgcmVzdWx0ID0gaGFuZGxlRXhwcmVzc2lvbihub2RlLnRlc3QpO1xyXG4gICAgICAgICAgICAgICAgcmVzdWx0ICs9IFwiID8gXCI7XHJcbiAgICAgICAgICAgICAgICByZXN1bHQgKz0gaGFuZGxlRXhwcmVzc2lvbihub2RlLmNvbnNlcXVlbnQpO1xyXG4gICAgICAgICAgICAgICAgcmVzdWx0ICs9IFwiIDogXCI7XHJcbiAgICAgICAgICAgICAgICByZXN1bHQgKz0gaGFuZGxlRXhwcmVzc2lvbihub2RlLmFsdGVybmF0ZSk7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuXHJcbiAgICAgICAgICAgIGRlZmF1bHQ6XHJcbiAgICAgICAgICAgICAgICAvL2NvbnNvbGUubG9nKFwiVW5oYW5kbGVkOiBcIiAsIG5vZGUudHlwZSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiByZXN1bHQ7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gaGFuZGxlQmluYXJ5QXJndW1lbnQobm9kZSl7XHJcbiAgICAgICAgdmFyIHJlc3VsdCA9IGhhbmRsZUV4cHJlc3Npb24obm9kZSk7XHJcbiAgICAgICAgc3dpdGNoKG5vZGUudHlwZSkge1xyXG4gICAgICAgICAgICBjYXNlIFN5bnRheC5CaW5hcnlFeHByZXNzaW9uOlxyXG4gICAgICAgICAgICBjYXNlIFN5bnRheC5Mb2dpY2FsRXhwcmVzc2lvbjpcclxuICAgICAgICAgICAgY2FzZSBTeW50YXguQXNzaWdubWVudEV4cHJlc3Npb246IHJlc3VsdCA9IFwiKCBcIiArIHJlc3VsdCArIFwiIClcIjsgYnJlYWs7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiByZXN1bHQ7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gaGFuZGxlQXJndW1lbnRzKGNvbnRhaW5lcikge1xyXG4gICAgICAgIHZhciByZXN1bHQgPSBcIihcIjtcclxuICAgICAgICBjb250YWluZXIuZm9yRWFjaChmdW5jdGlvbiAoYXJnLCBpbmRleCkge1xyXG4gICAgICAgICAgICByZXN1bHQgKz0gaGFuZGxlRXhwcmVzc2lvbihhcmcpO1xyXG4gICAgICAgICAgICBpZiAoaW5kZXggPCBjb250YWluZXIubGVuZ3RoIC0gMSkge1xyXG4gICAgICAgICAgICAgICAgcmVzdWx0ICs9IFwiLCBcIjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIHJldHVybiByZXN1bHQgKyBcIilcIjtcclxuICAgIH1cclxuXHJcblxyXG4gICAgZXhwb3J0cy5nZW5lcmF0ZSA9IGdlbmVyYXRlO1xyXG5cclxuXHJcbn0oZXhwb3J0cykpO1xyXG4iLCIoZnVuY3Rpb24obnMpe1xyXG5cclxuICAgIHZhciBTaGFkZSA9IHJlcXVpcmUoXCIuLi8uLi8uLi9pbnRlcmZhY2VzLmpzXCIpO1xyXG4gICAgdmFyIFRvb2xzID0gcmVxdWlyZShcIi4vdG9vbHMuanNcIik7XHJcblxyXG4gICAgdmFyIENvbG9yQ2xvc3VyZUluc3RhbmNlID0ge1xyXG5cclxuICAgIH07XHJcblxyXG4gICAgVG9vbHMuZXh0ZW5kKG5zLCB7XHJcbiAgICAgICAgaWQ6IFwiQ29sb3JDbG9zdXJlXCIsXHJcbiAgICAgICAga2luZDogU2hhZGUuT0JKRUNUX0tJTkRTLkNPTE9SX0NMT1NVUkUsXHJcbiAgICAgICAgb2JqZWN0OiB7XHJcbiAgICAgICAgICAgIGNvbnN0cnVjdG9yOiBudWxsLFxyXG4gICAgICAgICAgICBzdGF0aWM6IHt9XHJcbiAgICAgICAgfSxcclxuICAgICAgICBpbnN0YW5jZTogQ29sb3JDbG9zdXJlSW5zdGFuY2VcclxuICAgIH0pO1xyXG59KGV4cG9ydHMpKTtcclxuIiwiKGZ1bmN0aW9uKG5zKSB7XHJcblxyXG4gICAgdmFyIG9iamVjdHMgPSB7XHJcbiAgICAgICAgLy9Db2xvciA6IHJlcXVpcmUoXCIuL2NvbG9yLmpzXCIpLFxyXG4gICAgICAgIFNoYWRlIDogcmVxdWlyZShcIi4vc2hhZGUuanNcIiksXHJcbiAgICAgICAgLy9NYXRyaXg0IDogcmVxdWlyZShcIi4vbWF0cml4LmpzXCIpLFxyXG4gICAgICAgIE1hdGggOiByZXF1aXJlKFwiLi9tYXRoLmpzXCIpLFxyXG4gICAgICAgIFN5c3RlbSA6IHJlcXVpcmUoXCIuL3N5c3RlbS5qc1wiKSxcclxuICAgICAgICBWZWMyIDogcmVxdWlyZShcIi4vdmVjMi5qc1wiKSxcclxuICAgICAgICBWZWMzIDogcmVxdWlyZShcIi4vdmVjMy5qc1wiKSxcclxuICAgICAgICBDb2xvcjogcmVxdWlyZShcIi4vdmVjMy5qc1wiKSxcclxuICAgICAgICBWZWM0IDogcmVxdWlyZShcIi4vdmVjNC5qc1wiKSxcclxuICAgICAgICBUZXh0dXJlIDogcmVxdWlyZShcIi4vdGV4dHVyZS5qc1wiKSxcclxuICAgICAgICBDb2xvckNsb3N1cmU6IHJlcXVpcmUoXCIuL2NvbG9yY2xvc3VyZS5qc1wiKVxyXG4gICAgfTtcclxuXHJcbiAgICBucy5SZWdpc3RyeSA9IHtcclxuICAgICAgICBuYW1lOiBcIkdMU0xUcmFuc2Zvcm1SZWdpc3RyeVwiLFxyXG4gICAgICAgIGdldEJ5TmFtZTogZnVuY3Rpb24obmFtZSkge1xyXG4gICAgICAgICAgICB2YXIgcmVzdWx0ID0gb2JqZWN0c1tuYW1lXTtcclxuICAgICAgICAgICAgcmV0dXJuIHJlc3VsdCB8fCBudWxsO1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgZ2V0SW5zdGFuY2VGb3JLaW5kOiBmdW5jdGlvbihraW5kKSB7XHJcbiAgICAgICAgICAgIGZvcih2YXIgb2JqIGluIG9iamVjdHMpIHtcclxuICAgICAgICAgICAgICAgIGlmIChvYmplY3RzW29ial0ua2luZCA9PSBraW5kKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG9iamVjdHNbb2JqXS5pbnN0YW5jZTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG5cclxufShleHBvcnRzKSk7XHJcbiIsIihmdW5jdGlvbihucyl7XHJcblxyXG4gICB2YXIgU2hhZGUgPSByZXF1aXJlKFwiLi4vLi4vLi4vaW50ZXJmYWNlcy5qc1wiKTtcclxuICAgdmFyIFN5bnRheCA9IHJlcXVpcmUoJ2VzdHJhdmVyc2UnKS5TeW50YXg7XHJcbiAgIHZhciBUb29scyA9IHJlcXVpcmUoJy4vdG9vbHMuanMnKTtcclxuXHJcbiAgICB2YXIgTWF0aENvbnN0YW50cyA9IFtcIkVcIiwgXCJQSVwiLCBcIkxOMlwiLCBcIkxPRzJFXCIsIFwiTE9HMTBFXCIsIFwiUElcIiwgXCJTUVJUMV8yXCIsIFwiU1FSVDJcIl07XHJcblxyXG5cclxuICAgIHZhciBoYW5kbGVJbnRWZXJzaW9uID0gZnVuY3Rpb24obm9kZSkge1xyXG4gICAgICAgIG5vZGUuZXh0cmEudHlwZSA9IFNoYWRlLlRZUEVTLk5VTUJFUjtcclxuICAgICAgICBub2RlLmNhbGxlZSA9IFRvb2xzLnJlbW92ZU1lbWJlckZyb21FeHByZXNzaW9uKG5vZGUuY2FsbGVlKTtcclxuICAgICAgICByZXR1cm4gbm9kZTtcclxuICAgIH07XHJcblxyXG4gICAgdmFyIGhhbmRsZU1hdGhDYWxsID0gZnVuY3Rpb24ob3B0KSB7XHJcbiAgICAgICAgb3B0ID0gb3B0IHx8e307XHJcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKG5vZGUpIHtcclxuICAgICAgICAgICAgaWYgKG5vZGUudHlwZSAhPT0gU3ludGF4LkNhbGxFeHByZXNzaW9uKSB7XHJcbiAgICAgICAgICAgICAgICBTaGFkZS50aHJvd0Vycm9yKG5vZGUsIFwiSW50ZXJuYWwgRXJyb3IgaW4gTWF0aCBvYmplY3RcIik7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgLy8gQ2FzdCBhbGwgYXJndW1lbnRzIG9mIHRoZSBtYXRoIGZ1bmN0aW9uIHRvIGZsb2F0LCBhcyB0aGV5IGFyZVxyXG4gICAgICAgICAgICAvLyBub3QgZGVmaW5lZCBmb3Igb3RoZXIgdHlwZXMgKGludCwgYm9vbClcclxuICAgICAgICAgICAgLy8gRG9uJ3QgcmVwbGFjZSB0aGUgYXJndW1lbnRzIGFycmF5LCBpdCdzIGFscmVhZHkgY2FjaGVkIGJ5IHRoZSB0cmF2ZXJzYWxcclxuICAgICAgICAgICAgZm9yKHZhciBpID0gMDsgaSA8IG5vZGUuYXJndW1lbnRzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgICAgICAgICBub2RlLmFyZ3VtZW50c1tpXSA9IFRvb2xzLmNhc3RUb0Zsb2F0KG5vZGUuYXJndW1lbnRzW2ldKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBub2RlLmNhbGxlZSA9IFRvb2xzLnJlbW92ZU1lbWJlckZyb21FeHByZXNzaW9uKG5vZGUuY2FsbGVlKTtcclxuICAgICAgICAgICAgaWYgKG9wdC5uYW1lKSB7XHJcbiAgICAgICAgICAgICAgICBub2RlLmNhbGxlZS5uYW1lID0gb3B0Lm5hbWU7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmV0dXJuIG5vZGU7XHJcbiAgICAgICAgfVxyXG4gICAgfTtcclxuXHJcblxyXG5cclxuICAgIHZhciBNYXRoRW50cnkgID0ge1xyXG4gICAgICAgIGFiczogeyBjYWxsRXhwOiBoYW5kbGVNYXRoQ2FsbCgpIH0sXHJcbiAgICAgICAgYWNvczogeyBjYWxsRXhwOiBoYW5kbGVNYXRoQ2FsbCgpIH0sXHJcbiAgICAgICAgYXNpbjogeyBjYWxsRXhwOiBoYW5kbGVNYXRoQ2FsbCgpIH0sXHJcbiAgICAgICAgYXRhbjogeyBjYWxsRXhwOiBoYW5kbGVNYXRoQ2FsbCgpIH0sXHJcbiAgICAgICAgYXRhbjI6IHsgY2FsbEV4cDogaGFuZGxlTWF0aENhbGwoeyBuYW1lOiBcImF0YW5cIiB9ICkgfSxcclxuICAgICAgICBjZWlsOiB7IGNhbGxFeHA6IGhhbmRsZUludFZlcnNpb24gfSxcclxuICAgICAgICBjb3M6ICB7IGNhbGxFeHA6IGhhbmRsZU1hdGhDYWxsKCkgfSxcclxuICAgICAgICBleHA6IHsgY2FsbEV4cDogaGFuZGxlTWF0aENhbGwoKSB9LFxyXG4gICAgICAgIGZsb29yOiB7IGNhbGxFeHA6IGhhbmRsZUludFZlcnNpb24gfSxcclxuICAgICAgICAvLyBpbXVsOiB7IGNhbGxFeHA6IGhhbmRsZU1hdGhDYWxsIH0sXHJcbiAgICAgICAgbG9nOiB7IGNhbGxFeHA6IGhhbmRsZU1hdGhDYWxsKCkgfSxcclxuICAgICAgICBtYXg6IHsgY2FsbEV4cDogaGFuZGxlTWF0aENhbGwoKSB9LFxyXG4gICAgICAgIG1pbjogeyBjYWxsRXhwOiBoYW5kbGVNYXRoQ2FsbCgpIH0sXHJcbiAgICAgICAgcG93OiB7IGNhbGxFeHA6IGhhbmRsZU1hdGhDYWxsKCkgfSxcclxuICAgICAgICAvLyByYW5kb206IGZ1bmN0aW9uIHJhbmRvbSgpIHsgW25hdGl2ZSBjb2RlXSB9XHJcbiAgICAgICAgcm91bmQ6IHsgY2FsbEV4cDogaGFuZGxlTWF0aENhbGwoKSB9LCAvLyBTaW5jZSBHTFNMIDEuMywgd2hhdCBkb2VzIFdlYkdMIHVzZT9cclxuICAgICAgICBzaW46ICB7IGNhbGxFeHA6IGhhbmRsZU1hdGhDYWxsKCkgfSxcclxuICAgICAgICBzcXJ0OiB7IGNhbGxFeHA6IGhhbmRsZU1hdGhDYWxsKCkgfSxcclxuICAgICAgICB0YW46IHsgY2FsbEV4cDogaGFuZGxlTWF0aENhbGwoKSB9XHJcbiAgICB9O1xyXG5cclxuICAgIE1hdGhDb25zdGFudHMuZm9yRWFjaChmdW5jdGlvbiAoY29uc3RhbnQpIHtcclxuICAgICAgICBNYXRoRW50cnlbY29uc3RhbnRdID0ge1xyXG4gICAgICAgICAgICBwcm9wZXJ0eTogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuICB7IHR5cGU6IFN5bnRheC5MaXRlcmFsLCB2YWx1ZTogTWF0aFtjb25zdGFudF0sIGV4dHJhOiB7IHR5cGU6IFNoYWRlLlRZUEVTLk5VTUJFUiB9IH07XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9KTtcclxuXHJcbiAgICBUb29scy5leHRlbmQobnMsIHtcclxuICAgICAgICBpZDogXCJNYXRoXCIsXHJcbiAgICAgICAgb2JqZWN0OiB7XHJcbiAgICAgICAgICAgIGNvbnN0cnVjdG9yOiBudWxsLFxyXG4gICAgICAgICAgICBzdGF0aWM6IE1hdGhFbnRyeVxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgaW5zdGFuY2U6IE1hdGhFbnRyeVxyXG4gICAgfSk7XHJcblxyXG59KGV4cG9ydHMpKTtcclxuIiwiKGZ1bmN0aW9uKG5zKXtcclxuXHJcbiAgICB2YXIgU2hhZGUgPSByZXF1aXJlKFwiLi4vLi4vLi4vaW50ZXJmYWNlcy5qc1wiKTtcclxuICAgIHZhciBTeW50YXggPSByZXF1aXJlKCdlc3RyYXZlcnNlJykuU3ludGF4O1xyXG4gICAgdmFyIFRvb2xzID0gcmVxdWlyZSgnLi90b29scy5qcycpO1xyXG5cclxuICAgIHZhciBTaGFkZU9iamVjdCA9IHtcclxuICAgICAgICBkaWZmdXNlOiB7fSxcclxuICAgICAgICBwaG9uZzoge30sXHJcbiAgICAgICAgZnJhY3Q6IHsgcHJvcGVydHk6IFRvb2xzLnJlbW92ZU1lbWJlckZyb21FeHByZXNzaW9uIH0sXHJcbiAgICAgICAgY2xhbXA6IHsgcHJvcGVydHk6IFRvb2xzLnJlbW92ZU1lbWJlckZyb21FeHByZXNzaW9uIH0sXHJcbiAgICAgICAgc3RlcDogeyBwcm9wZXJ0eTogVG9vbHMucmVtb3ZlTWVtYmVyRnJvbUV4cHJlc3Npb24gfSxcclxuICAgICAgICBtaXg6IHsgcHJvcGVydHk6IFRvb2xzLnJlbW92ZU1lbWJlckZyb21FeHByZXNzaW9uIH0sXHJcbiAgICAgICAgc21vb3Roc3RlcDogeyBwcm9wZXJ0eTogVG9vbHMucmVtb3ZlTWVtYmVyRnJvbUV4cHJlc3Npb24gfVxyXG4gICAgfVxyXG5cclxuICAgIFRvb2xzLmV4dGVuZChucywge1xyXG4gICAgaWQ6IFwiU2hhZGVcIixcclxuICAgIG9iamVjdDoge1xyXG4gICAgICAgIGNvbnN0cnVjdG9yOiBudWxsLFxyXG4gICAgICAgIHN0YXRpYzogU2hhZGVPYmplY3RcclxuICAgIH0sXHJcbiAgICBpbnN0YW5jZTogbnVsbFxyXG59KTtcclxuXHJcbn0oZXhwb3J0cykpO1xyXG4iLCIoZnVuY3Rpb24gKG5zKSB7XHJcblxyXG4gICAgdmFyIEJhc2UgPSByZXF1aXJlKFwiLi4vLi4vLi4vYmFzZS9pbmRleC5qc1wiKSxcclxuICAgICAgICBTaGFkZSA9IHJlcXVpcmUoXCIuLi8uLi8uLi9pbnRlcmZhY2VzLmpzXCIpLFxyXG4gICAgICAgIFN5bnRheCA9IHJlcXVpcmUoJ2VzdHJhdmVyc2UnKS5TeW50YXg7XHJcblxyXG5cclxuICAgIHZhciBTeXN0ZW1QYXJhbWV0ZXJOYW1lcyA9IHtcclxuICAgICAgICBcImNvb3Jkc1wiIDogXCJfc3lzX2Nvb3Jkc1wiLFxyXG4gICAgICAgIFwiaGVpZ2h0XCI6IFwiX3N5c19oZWlnaHRcIixcclxuICAgICAgICBcIndpZHRoXCI6IFwiX3N5c193aWR0aFwiXHJcbiAgICB9XHJcblxyXG4gICAgdmFyIENvb3Jkc1R5cGUgPSAge1xyXG4gICAgICAgIHR5cGU6IFNoYWRlLlRZUEVTLk9CSkVDVCxcclxuICAgICAgICBraW5kOiBTaGFkZS5PQkpFQ1RfS0lORFMuRkxPQVQzLFxyXG4gICAgICAgIHNvdXJjZTogU2hhZGUuU09VUkNFUy5VTklGT1JNXHJcbiAgICB9O1xyXG5cclxuICAgIHZhciBTeXN0ZW1FbnRyeSA9IHtcclxuICAgICAgICBjb29yZHM6IHtcclxuICAgICAgICAgICAgcHJvcGVydHk6IGZ1bmN0aW9uIChub2RlKSB7XHJcbiAgICAgICAgICAgICAgICBub2RlLnByb3BlcnR5Lm5hbWUgPSBcImdsX0ZyYWdDb29yZFwiO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIG5vZGUucHJvcGVydHk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9LFxyXG4gICAgICAgIG5vcm1hbGl6ZWRDb29yZHM6IHtcclxuICAgICAgICAgICAgcHJvcGVydHk6IGZ1bmN0aW9uIChub2RlLCBwYXJlbnQsIGNvbnRleHQsIHN0YXRlKSB7XHJcbiAgICAgICAgICAgICAgICBzdGF0ZS5zeXN0ZW1QYXJhbWV0ZXJzW1N5c3RlbVBhcmFtZXRlck5hbWVzLmNvb3Jkc10gPSBDb29yZHNUeXBlO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiBTeW50YXguTmV3RXhwcmVzc2lvbixcclxuICAgICAgICAgICAgICAgICAgICBjYWxsZWU6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogU3ludGF4LklkZW50aWZpZXIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG5hbWU6IFwiVmVjM1wiXHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICBhcmd1bWVudHM6IFtcclxuICAgICAgICAgICAgICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogU3ludGF4LkJpbmFyeUV4cHJlc3Npb24sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZWZ0OiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogU3ludGF4Lk1lbWJlckV4cHJlc3Npb24sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb2JqZWN0OiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6IFN5bnRheC5JZGVudGlmaWVyLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBuYW1lOiBcImdsX0ZyYWdDb29yZFwiXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0eToge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiBTeW50YXguSWRlbnRpZmllcixcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbmFtZTogXCJ4eXpcIlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByaWdodDoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6IFN5bnRheC5JZGVudGlmaWVyLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5hbWU6IFN5c3RlbVBhcmFtZXRlck5hbWVzLmNvb3Jkc1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9wZXJhdG9yOiBcIi9cIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4dHJhOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogU2hhZGUuVFlQRVMuT0JKRUNULFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGtpbmQ6IFNoYWRlLk9CSkVDVF9LSU5EUy5GTE9BVDNcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIF0sXHJcbiAgICAgICAgICAgICAgICAgICAgZXh0cmE6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogU2hhZGUuVFlQRVMuT0JKRUNULFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBraW5kOiBTaGFkZS5PQkpFQ1RfS0lORFMuRkxPQVQzXHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSxcclxuICAgICAgICBoZWlnaHQ6IHtcclxuICAgICAgICAgICAgcHJvcGVydHk6IGZ1bmN0aW9uIChub2RlLCBwYXJlbnQsIGNvbnRleHQsIHN0YXRlKSB7XHJcbiAgICAgICAgICAgICAgICBzdGF0ZS5zeXN0ZW1QYXJhbWV0ZXJzW1N5c3RlbVBhcmFtZXRlck5hbWVzLmNvb3Jkc10gPSBDb29yZHNUeXBlO1xyXG4gICAgICAgICAgICAgICAgbm9kZS5wcm9wZXJ0eS5uYW1lID0gU3lzdGVtUGFyYW1ldGVyTmFtZXMuY29vcmRzICsgXCIueVwiO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIG5vZGUucHJvcGVydHk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9LFxyXG4gICAgICAgIHdpZHRoOiB7XHJcbiAgICAgICAgICAgIHByb3BlcnR5OiBmdW5jdGlvbiAobm9kZSwgcGFyZW50LCBjb250ZXh0LCBzdGF0ZSkge1xyXG4gICAgICAgICAgICAgICAgc3RhdGUuc3lzdGVtUGFyYW1ldGVyc1tTeXN0ZW1QYXJhbWV0ZXJOYW1lcy5jb29yZHNdID0gQ29vcmRzVHlwZTtcclxuICAgICAgICAgICAgICAgIG5vZGUucHJvcGVydHkubmFtZSA9IFN5c3RlbVBhcmFtZXRlck5hbWVzLmNvb3JkcyArIFwiLnhcIjtcclxuICAgICAgICAgICAgICAgIHJldHVybiBub2RlLnByb3BlcnR5O1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgIH07XHJcblxyXG4gICAgQmFzZS5leHRlbmQobnMsIHtcclxuICAgICAgICBpZDogXCJTeXN0ZW1cIixcclxuICAgICAgICBvYmplY3Q6IHtcclxuICAgICAgICAgICAgY29uc3RydWN0b3I6IG51bGwsXHJcbiAgICAgICAgICAgIHN0YXRpYzogU3lzdGVtRW50cnlcclxuICAgICAgICB9LFxyXG4gICAgICAgIGluc3RhbmNlOiBudWxsXHJcbiAgICB9KTtcclxufShleHBvcnRzKSk7XHJcbiIsIihmdW5jdGlvbihucyl7XHJcblxyXG4gICAgdmFyIFNoYWRlID0gcmVxdWlyZShcIi4uLy4uLy4uL2ludGVyZmFjZXMuanNcIik7XHJcbiAgICB2YXIgU3ludGF4ID0gcmVxdWlyZSgnZXN0cmF2ZXJzZScpLlN5bnRheDtcclxuICAgIHZhciBUb29scyA9IHJlcXVpcmUoXCIuL3Rvb2xzLmpzXCIpO1xyXG4gICAgdmFyIEFOTk8gPSByZXF1aXJlKFwiLi4vLi4vLi4vYmFzZS9hbm5vdGF0aW9uLmpzXCIpLkFOTk87XHJcblxyXG4gICAgdmFyIFRZUEVTID0gU2hhZGUuVFlQRVMsXHJcbiAgICAgICAgS0lORFMgPSBTaGFkZS5PQkpFQ1RfS0lORFM7XHJcblxyXG4gICAgdmFyIFRleHR1cmVJbnN0YW5jZSA9IHtcclxuICAgICAgICBzYW1wbGUyRDoge1xyXG4gICAgICAgICAgICBjYWxsRXhwOiBUb29scy5WZWMuY3JlYXRlRnVuY3Rpb25DYWxsLmJpbmQobnVsbCwgJ3RleHR1cmUyRCcsIDIpXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIFRvb2xzLmV4dGVuZChucywge1xyXG4gICAgICAgIGlkOiBcIlRleHR1cmVcIixcclxuICAgICAgICBraW5kOiBLSU5EUy5URVhUVVJFLFxyXG4gICAgICAgIG9iamVjdDoge1xyXG4gICAgICAgICAgICBjb25zdHJ1Y3RvcjogbnVsbCxcclxuICAgICAgICAgICAgc3RhdGljOiB7fVxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgaW5zdGFuY2U6IFRleHR1cmVJbnN0YW5jZVxyXG4gICAgfSk7XHJcblxyXG59KGV4cG9ydHMpKTtcclxuIiwiKGZ1bmN0aW9uIChucykge1xyXG5cclxuICAgIHZhciBTeW50YXggPSByZXF1aXJlKCdlc3RyYXZlcnNlJykuU3ludGF4O1xyXG4gICAgdmFyIEJhc2UgPSByZXF1aXJlKFwiLi4vLi4vLi4vYmFzZS9pbmRleC5qc1wiKTtcclxuICAgIHZhciBBTk5PID0gcmVxdWlyZShcIi4uLy4uLy4uL2Jhc2UvYW5ub3RhdGlvbi5qc1wiKS5BTk5PO1xyXG4gICAgdmFyIFNoYWRlID0gcmVxdWlyZShcIi4uLy4uLy4uL2ludGVyZmFjZXMuanNcIiksXHJcbiAgICAgICAgVFlQRVMgPSBTaGFkZS5UWVBFUyxcclxuICAgICAgICBLSU5EUyA9IFNoYWRlLk9CSkVDVF9LSU5EUyxcclxuICAgICAgICBWZWNCYXNlID0gcmVxdWlyZShcIi4uLy4uLy4uL2Jhc2UvdmVjLmpzXCIpO1xyXG5cclxuXHJcbiAgICBucy5yZW1vdmVNZW1iZXJGcm9tRXhwcmVzc2lvbiA9IGZ1bmN0aW9uIChub2RlKSB7XHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgdHlwZTogU3ludGF4LklkZW50aWZpZXIsXHJcbiAgICAgICAgICAgIG5hbWU6IG5vZGUucHJvcGVydHkubmFtZVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICB2YXIgVmVjID0ge1xyXG4gICAgICAgIGdldFZlY0FyZ3M6IGZ1bmN0aW9uKGFyZ3Mpe1xyXG4gICAgICAgICAgICBpZihhcmdzLmxlbmd0aCA9PSAwKXtcclxuICAgICAgICAgICAgICAgIHZhciByZXN1bHQgPSBbXHJcbiAgICAgICAgICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiBcIkxpdGVyYWxcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6IFwiMFwiXHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgXTtcclxuICAgICAgICAgICAgICAgIEFOTk8ocmVzdWx0WzBdKS5zZXRUeXBlKFRZUEVTLk5VTUJFUik7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gcmVzdWx0O1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGVsc2V7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gYXJncztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0sXHJcblxyXG4gICAgICAgIGdlbmVyYXRlVmVjRnJvbUFyZ3M6IGZ1bmN0aW9uKHZlY0NvdW50LCBhcmdzKXtcclxuICAgICAgICAgICAgaWYodmVjQ291bnQgPT0gMSlcclxuICAgICAgICAgICAgICAgIHJldHVybiBhcmdzWzBdO1xyXG4gICAgICAgICAgICBpZihhcmdzLmxlbmd0aCA9PSAwKXtcclxuICAgICAgICAgICAgICAgIGFyZ3MgPSBWZWMuZ2V0VmVjQXJncyhhcmdzKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYoYXJncy5sZW5ndGggPT0gMSAmJiBBTk5PKGFyZ3NbMF0pLmlzT2ZLaW5kKEtJTkRTWydGTE9BVCcgKyB2ZWNDb3VudF0pKVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGFyZ3NbMF07XHJcbiAgICAgICAgICAgIHZhciByZXN1bHQgPSB7XHJcbiAgICAgICAgICAgICAgICB0eXBlOiBTeW50YXguTmV3RXhwcmVzc2lvbixcclxuICAgICAgICAgICAgICAgIGNhbGxlZToge1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IFN5bnRheC5JZGVudGlmaWVyLFxyXG4gICAgICAgICAgICAgICAgICAgIG5hbWU6IFwiVmVjXCIgKyB2ZWNDb3VudFxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgIGFyZ3VtZW50czogYXJnc1xyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICBBTk5PKHJlc3VsdCkuc2V0VHlwZShUWVBFUy5PQkpFQ1QsIEtJTkRTWydGTE9BVCcgKyB2ZWNDb3VudF0pO1xyXG4gICAgICAgICAgICBBTk5PKHJlc3VsdC5jYWxsZWUpLnNldFR5cGUoVFlQRVMuRlVOQ1RJT04pO1xyXG4gICAgICAgICAgICByZXR1cm4gcmVzdWx0O1xyXG4gICAgICAgIH0sXHJcblxyXG4gICAgICAgIGNyZWF0ZVN3aXp6bGU6IGZ1bmN0aW9uKHZlY0NvdW50LCBzd2l6emxlLCBub2RlLCBhcmdzLCBwYXJlbnQpe1xyXG4gICAgICAgICAgICBpZiAoYXJncy5sZW5ndGggPT0gMCkge1xyXG4gICAgICAgICAgICAgICAgbm9kZS5jYWxsZWUuZXh0cmEgPSBub2RlLmV4dHJhO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIG5vZGUuY2FsbGVlO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHZhciBzaW5ndWxhciA9IHN3aXp6bGUubGVuZ3RoID09IDE7XHJcbiAgICAgICAgICAgIHZhciBhcmdPYmplY3QgPSBzaW5ndWxhciA/IG5vZGUuYXJndW1lbnRzWzBdIDogVmVjLmdlbmVyYXRlVmVjRnJvbUFyZ3Moc3dpenpsZS5sZW5ndGgsIG5vZGUuYXJndW1lbnRzKTtcclxuICAgICAgICAgICAgdmFyIHJlcGxhY2UgPSB7XHJcbiAgICAgICAgICAgICAgICB0eXBlOiBTeW50YXguTmV3RXhwcmVzc2lvbixcclxuICAgICAgICAgICAgICAgIGNhbGxlZToge1xyXG4gICAgICAgICAgICAgICAgICAgdHlwZTogU3ludGF4LklkZW50aWZpZXIsXHJcbiAgICAgICAgICAgICAgICAgICBuYW1lOiBcIlZlY1wiICsgdmVjQ291bnRcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICBhcmd1bWVudHM6IFtdXHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgIHZhciBpbmRpY2VzID0gW107XHJcbiAgICAgICAgICAgIGZvcih2YXIgaSA9IDA7IGkgPCBzd2l6emxlLmxlbmd0aDsgKytpKXtcclxuICAgICAgICAgICAgICAgIHZhciBpZHggPSBWZWNCYXNlLnN3aXp6bGVUb0luZGV4KHN3aXp6bGUuY2hhckF0KGkpKTtcclxuICAgICAgICAgICAgICAgIGluZGljZXNbaWR4XSA9IGk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZm9yKHZhciBpID0gMDsgaSA8IHZlY0NvdW50OyArK2kpe1xyXG4gICAgICAgICAgICAgICAgaWYoaW5kaWNlc1tpXSAhPT0gdW5kZWZpbmVkKXtcclxuICAgICAgICAgICAgICAgICAgICByZXBsYWNlLmFyZ3VtZW50c1tpXSA9IHNpbmd1bGFyID8gYXJnT2JqZWN0IDoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiBTeW50YXguTWVtYmVyRXhwcmVzc2lvbixcclxuICAgICAgICAgICAgICAgICAgICAgICAgb2JqZWN0OiBhcmdPYmplY3QsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb3BlcnR5OiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiBTeW50YXguSWRlbnRpZmllcixcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5hbWU6IFZlY0Jhc2UuaW5kZXhUb1N3aXp6bGUoaW5kaWNlc1tpXSlcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBlbHNle1xyXG4gICAgICAgICAgICAgICAgICAgcmVwbGFjZS5hcmd1bWVudHNbaV0gPSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6IFN5bnRheC5NZW1iZXJFeHByZXNzaW9uLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBvYmplY3Q6IG5vZGUuY2FsbGVlLm9iamVjdCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvcGVydHk6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6IFN5bnRheC5JZGVudGlmaWVyLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbmFtZTogVmVjQmFzZS5pbmRleFRvU3dpenpsZShpKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBBTk5PKHJlcGxhY2UpLmNvcHkoQU5OTyhub2RlKSk7XHJcbiAgICAgICAgICAgIHJldHVybiByZXBsYWNlO1xyXG4gICAgICAgIH0sXHJcblxyXG4gICAgICAgIGF0dGFjaFN3aXp6bGVzOiBmdW5jdGlvbiAoaW5zdGFuY2UsIHZlY0NvdW50KXtcclxuICAgICAgICAgICAgZm9yKHZhciBzID0gMDsgcyA8IFZlY0Jhc2Uuc3dpenpsZVNldHMubGVuZ3RoOyArK3Mpe1xyXG4gICAgICAgICAgICAgICAgZm9yKHZhciBjb3VudCA9IDE7IGNvdW50IDw9IDQ7ICsrY291bnQpe1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciBtYXggPSBNYXRoLnBvdyh2ZWNDb3VudCwgY291bnQpO1xyXG4gICAgICAgICAgICAgICAgICAgICBmb3IodmFyIGkgPSAwOyBpIDwgbWF4OyArK2kpe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgdmFsID0gaTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGtleSA9IFwiXCI7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvcih2YXIgIGogPSAwOyBqIDwgY291bnQ7ICsrail7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgaWR4ID0gdmFsICUgdmVjQ291bnQ7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YWwgPSBNYXRoLmZsb29yKHZhbCAvIHZlY0NvdW50KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGtleSs9IFZlY0Jhc2Uuc3dpenpsZVNldHNbc11baWR4XTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpbnN0YW5jZVtrZXldID0ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FsbEV4cDogVmVjLmNyZWF0ZVN3aXp6bGUuYmluZChudWxsLCB2ZWNDb3VudCwga2V5KVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0sXHJcblxyXG4gICAgICAgIGNyZWF0ZU9wZXJhdG9yOiBmdW5jdGlvbih2ZWNDb3VudCwgb3BlcmF0b3IsIG5vZGUsIGFyZ3MsIHBhcmVudCkge1xyXG4gICAgICAgICAgICB2YXIgb3RoZXIgPSBWZWMuZ2VuZXJhdGVWZWNGcm9tQXJncyh2ZWNDb3VudCwgbm9kZS5hcmd1bWVudHMpO1xyXG4gICAgICAgICAgICB2YXIgcmVwbGFjZSA9IHtcclxuICAgICAgICAgICAgICAgIHR5cGU6IFN5bnRheC5CaW5hcnlFeHByZXNzaW9uLFxyXG4gICAgICAgICAgICAgICAgb3BlcmF0b3I6IG9wZXJhdG9yLFxyXG4gICAgICAgICAgICAgICAgbGVmdDogbm9kZS5jYWxsZWUub2JqZWN0LFxyXG4gICAgICAgICAgICAgICAgcmlnaHQ6IG90aGVyXHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgIEFOTk8ocmVwbGFjZSkuY29weShBTk5PKG5vZGUpKTtcclxuICAgICAgICAgICAgcmV0dXJuIHJlcGxhY2U7XHJcbiAgICAgICAgfSxcclxuXHJcbiAgICAgICAgYXR0YWNoT3BlcmF0b3JzOiBmdW5jdGlvbihpbnN0YW5jZSwgdmVjQ291bnQsIG9wZXJhdG9ycyl7XHJcbiAgICAgICAgICAgIGZvcih2YXIgbmFtZSBpbiBvcGVyYXRvcnMpe1xyXG4gICAgICAgICAgICAgICAgdmFyIG9wZXJhdG9yID0gb3BlcmF0b3JzW25hbWVdO1xyXG4gICAgICAgICAgICAgICAgaW5zdGFuY2VbbmFtZV0gPSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY2FsbEV4cDogVmVjLmNyZWF0ZU9wZXJhdG9yLmJpbmQobnVsbCwgdmVjQ291bnQsIG9wZXJhdG9yKVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSxcclxuXHJcbiAgICAgICAgY3JlYXRlRnVuY3Rpb25DYWxsOiBmdW5jdGlvbihmdW5jdGlvbk5hbWUsIHNlY29uZFZlY1NpemUsIG5vZGUsIGFyZ3MsIHBhcmVudCkge1xyXG4gICAgICAgICAgICB2YXIgcmVwbGFjZSA9IHtcclxuICAgICAgICAgICAgICAgIHR5cGU6IFN5bnRheC5DYWxsRXhwcmVzc2lvbixcclxuICAgICAgICAgICAgICAgIGNhbGxlZToge1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IFN5bnRheC5JZGVudGlmaWVyLFxyXG4gICAgICAgICAgICAgICAgICAgIG5hbWU6IGZ1bmN0aW9uTmFtZVxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgIGFyZ3VtZW50czogW1xyXG4gICAgICAgICAgICAgICAgICAgIG5vZGUuY2FsbGVlLm9iamVjdFxyXG4gICAgICAgICAgICAgICAgXVxyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICBpZihzZWNvbmRWZWNTaXplKXtcclxuICAgICAgICAgICAgICAgIHZhciBvdGhlciA9IFZlYy5nZW5lcmF0ZVZlY0Zyb21BcmdzKHNlY29uZFZlY1NpemUsIG5vZGUuYXJndW1lbnRzKTtcclxuICAgICAgICAgICAgICAgIHJlcGxhY2UuYXJndW1lbnRzLnB1c2gob3RoZXIpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIEFOTk8ocmVwbGFjZSkuY29weShBTk5PKG5vZGUpKTtcclxuICAgICAgICAgICAgcmV0dXJuIHJlcGxhY2U7XHJcbiAgICAgICAgfSxcclxuXHJcbiAgICAgICAgZ2VuZXJhdGVMZW5ndGhDYWxsOiBmdW5jdGlvbihub2RlLCBhcmdzLCBwYXJlbnQpe1xyXG4gICAgICAgICAgICBpZihhcmdzLmxlbmd0aCA9PSAwKXtcclxuICAgICAgICAgICAgICAgIHJldHVybiBWZWMuY3JlYXRlRnVuY3Rpb25DYWxsKCdsZW5ndGgnLCAwLCBub2RlLCBhcmdzLCBwYXJlbnQpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGVsc2V7XHJcbiAgICAgICAgICAgICAgICAgdmFyIHJlcGxhY2UgPSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogU3ludGF4LkJpbmFyeUV4cHJlc3Npb24sXHJcbiAgICAgICAgICAgICAgICAgICAgb3BlcmF0b3I6ICcqJyxcclxuICAgICAgICAgICAgICAgICAgICBsZWZ0OiBub2RlLmNhbGxlZS5vYmplY3QsXHJcbiAgICAgICAgICAgICAgICAgICAgcmlnaHQ6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogU3ludGF4LkJpbmFyeUV4cHJlc3Npb24sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG9wZXJhdG9yOiAnLycsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxlZnQ6IG5vZGUuYXJndW1lbnRzWzBdLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICByaWdodDogVmVjLmNyZWF0ZUZ1bmN0aW9uQ2FsbCgnbGVuZ3RoJywgMCwgbm9kZSwgYXJncywgcGFyZW50KVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgICAgICBBTk5PKHJlcGxhY2UucmlnaHQpLnNldFR5cGUoVFlQRVMuTlVNQkVSKTtcclxuICAgICAgICAgICAgICAgIEFOTk8ocmVwbGFjZSkuY29weShBTk5PKG5vZGUpKTtcclxuICAgICAgICAgICAgICAgIHJldHVybiByZXBsYWNlO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSxcclxuXHJcbiAgICAgICAgZ2VuZXJhdGVDb25zdHJ1Y3RvcjogZnVuY3Rpb24obm9kZSl7XHJcbiAgICAgICAgICAgIG5vZGUuYXJndW1lbnRzID0gVmVjLmdldFZlY0FyZ3Mobm9kZS5hcmd1bWVudHMpO1xyXG4gICAgICAgIH1cclxuICAgIH07XHJcblxyXG4gICAgdmFyIE1hdCA9IHtcclxuICAgICAgICBUWVBFUzoge1xyXG4gICAgICAgICAgICBcIk1hdDNcIiA6IHtraW5kOiBLSU5EUy5NQVRSSVgzLCBjb2xLaW5kOiBLSU5EUy5GTE9BVDN9LFxyXG4gICAgICAgICAgICBcIk1hdDRcIiA6IHtraW5kOiBLSU5EUy5NQVRSSVg0LCBjb2xLaW5kOiBLSU5EUy5GTE9BVDR9XHJcbiAgICAgICAgfSxcclxuXHJcbiAgICAgICAgZ2VuZXJhdGVNYXRGcm9tQXJnczogZnVuY3Rpb24obWF0TmFtZSwgYXJncyl7XHJcbiAgICAgICAgICAgIGlmKGFyZ3MubGVuZ3RoID09IDApe1xyXG4gICAgICAgICAgICAgICAgYXJncyA9IFZlYy5nZXRWZWNBcmdzKGFyZ3MpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZihhcmdzLmxlbmd0aCA9PSAxICYmIEFOTk8oYXJnc1swXSkuaXNPZktpbmQoIE1hdC5UWVBFU1ttYXROYW1lXS5raW5kKSlcclxuICAgICAgICAgICAgICAgIHJldHVybiBhcmdzWzBdO1xyXG4gICAgICAgICAgICB2YXIgcmVzdWx0ID0ge1xyXG4gICAgICAgICAgICAgICAgdHlwZTogU3ludGF4Lk5ld0V4cHJlc3Npb24sXHJcbiAgICAgICAgICAgICAgICBjYWxsZWU6IHtcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiBTeW50YXguSWRlbnRpZmllcixcclxuICAgICAgICAgICAgICAgICAgICBuYW1lOiBtYXROYW1lXHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgYXJndW1lbnRzOiBhcmdzXHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgIEFOTk8ocmVzdWx0KS5zZXRUeXBlKFRZUEVTLk9CSkVDVCwgTWF0LlRZUEVTW21hdE5hbWVdLmtpbmQpO1xyXG4gICAgICAgICAgICBBTk5PKHJlc3VsdC5jYWxsZWUpLnNldFR5cGUoVFlQRVMuRlVOQ1RJT04pO1xyXG4gICAgICAgICAgICByZXR1cm4gcmVzdWx0O1xyXG4gICAgICAgIH0sXHJcblxyXG4gICAgICAgIGNyZWF0ZU9wZXJhdG9yOiBmdW5jdGlvbihtYXROYW1lLCBvcGVyYXRvciwgbm9kZSwgYXJncywgcGFyZW50KSB7XHJcbiAgICAgICAgICAgIHZhciBvdGhlciA9IE1hdC5nZW5lcmF0ZU1hdEZyb21BcmdzKG1hdE5hbWUsIG5vZGUuYXJndW1lbnRzKTtcclxuICAgICAgICAgICAgdmFyIHJlcGxhY2UgPSB7XHJcbiAgICAgICAgICAgICAgICB0eXBlOiBTeW50YXguQmluYXJ5RXhwcmVzc2lvbixcclxuICAgICAgICAgICAgICAgIG9wZXJhdG9yOiBvcGVyYXRvcixcclxuICAgICAgICAgICAgICAgIGxlZnQ6IG5vZGUuY2FsbGVlLm9iamVjdCxcclxuICAgICAgICAgICAgICAgIHJpZ2h0OiBvdGhlclxyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICBBTk5PKHJlcGxhY2UpLmNvcHkoQU5OTyhub2RlKSk7XHJcbiAgICAgICAgICAgIHJldHVybiByZXBsYWNlO1xyXG4gICAgICAgIH0sXHJcblxyXG4gICAgICAgIGF0dGFjaE9wZXJhdG9yczogZnVuY3Rpb24oaW5zdGFuY2UsIG1hdE5hbWUsIG9wZXJhdG9ycyl7XHJcbiAgICAgICAgICAgIGZvcih2YXIgbmFtZSBpbiBvcGVyYXRvcnMpe1xyXG4gICAgICAgICAgICAgICAgdmFyIG9wZXJhdG9yID0gb3BlcmF0b3JzW25hbWVdO1xyXG4gICAgICAgICAgICAgICAgaW5zdGFuY2VbbmFtZV0gPSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY2FsbEV4cDogTWF0LmNyZWF0ZU9wZXJhdG9yLmJpbmQobnVsbCwgbWF0TmFtZSwgb3BlcmF0b3IpXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9LFxyXG5cclxuICAgICAgICBnZW5lcmF0ZUNvbENhbGw6IGZ1bmN0aW9uKG1hdE5hbWUsIG5vZGUsIGFyZ3MsIHBhcmVudCl7XHJcbiAgICAgICAgICAgIHZhciBtZW1iZXJBY2Nlc3MgPSB7XHJcbiAgICAgICAgICAgICAgICB0eXBlOiBTeW50YXguTWVtYmVyRXhwcmVzc2lvbixcclxuICAgICAgICAgICAgICAgIG9iamVjdDogbm9kZS5jYWxsZWUub2JqZWN0LFxyXG4gICAgICAgICAgICAgICAgcHJvcGVydHk6IG5vZGUuYXJndW1lbnRzWzBdLFxyXG4gICAgICAgICAgICAgICAgY29tcHV0ZWQ6IHRydWVcclxuICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgQU5OTyhtZW1iZXJBY2Nlc3MpLnNldFR5cGUoVFlQRVMuT0JKRUNULCBNYXQuVFlQRVNbbWF0TmFtZV0uY29sS2luZCk7XHJcblxyXG4gICAgICAgICAgICBpZihhcmdzLmxlbmd0aCA9PSAxKXtcclxuICAgICAgICAgICAgICAgIHJldHVybiBtZW1iZXJBY2Nlc3M7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZWxzZXtcclxuICAgICAgICAgICAgICAgICB2YXIgcmVwbGFjZSA9IHtcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiBTeW50YXguQmluYXJ5RXhwcmVzc2lvbixcclxuICAgICAgICAgICAgICAgICAgICBvcGVyYXRvcjogJyonLFxyXG4gICAgICAgICAgICAgICAgICAgIGxlZnQ6IG5vZGUuY2FsbGVlLm9iamVjdCxcclxuICAgICAgICAgICAgICAgICAgICByaWdodDoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiBTeW50YXguQmluYXJ5RXhwcmVzc2lvbixcclxuICAgICAgICAgICAgICAgICAgICAgICAgb3BlcmF0b3I6ICcvJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGVmdDogbm9kZS5hcmd1bWVudHNbMF0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJpZ2h0OiBWZWMuY3JlYXRlRnVuY3Rpb25DYWxsKCdsZW5ndGgnLCAwLCBub2RlLCBhcmdzLCBwYXJlbnQpXHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgICAgIEFOTk8ocmVwbGFjZS5yaWdodCkuc2V0VHlwZShUWVBFUy5OVU1CRVIpO1xyXG4gICAgICAgICAgICAgICAgQU5OTyhyZXBsYWNlKS5jb3B5KEFOTk8obm9kZSkpO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHJlcGxhY2U7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgfVxyXG5cclxuXHJcbiAgICBucy5WZWMgPSBWZWM7XHJcblxyXG4gICAgbnMuY2FzdFRvRmxvYXQgPSBmdW5jdGlvbiAoYXN0KSB7XHJcbiAgICAgICAgdmFyIGV4cCA9IEFOTk8oYXN0KTtcclxuXHJcbiAgICAgICAgaWYgKCFleHAuaXNOdW1iZXIoKSkgeyAgIC8vIENhc3RcclxuICAgICAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgICAgIHR5cGU6IFN5bnRheC5DYWxsRXhwcmVzc2lvbixcclxuICAgICAgICAgICAgICAgIGNhbGxlZToge1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IFN5bnRheC5JZGVudGlmaWVyLFxyXG4gICAgICAgICAgICAgICAgICAgIG5hbWU6IFwiZmxvYXRcIlxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgIGFyZ3VtZW50czogW2FzdF1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gYXN0O1xyXG4gICAgfVxyXG5cclxuICAgIG5zLmV4dGVuZCA9IEJhc2UuZXh0ZW5kO1xyXG5cclxuXHJcbn0oZXhwb3J0cykpO1xyXG4iLCIoZnVuY3Rpb24obnMpe1xyXG5cclxuICAgIHZhciBTaGFkZSA9IHJlcXVpcmUoXCIuLi8uLi8uLi9pbnRlcmZhY2VzLmpzXCIpO1xyXG4gICAgdmFyIFN5bnRheCA9IHJlcXVpcmUoJ2VzdHJhdmVyc2UnKS5TeW50YXg7XHJcbiAgICB2YXIgVG9vbHMgPSByZXF1aXJlKFwiLi90b29scy5qc1wiKTtcclxuICAgIHZhciBBTk5PID0gcmVxdWlyZShcIi4uLy4uLy4uL2Jhc2UvYW5ub3RhdGlvbi5qc1wiKS5BTk5PO1xyXG5cclxuICAgIHZhciBUWVBFUyA9IFNoYWRlLlRZUEVTLFxyXG4gICAgICAgIEtJTkRTID0gU2hhZGUuT0JKRUNUX0tJTkRTO1xyXG5cclxuICAgIHZhciBWZWMySW5zdGFuY2UgPSB7XHJcbiAgICAgICAgbm9ybWFsaXplOiB7XHJcbiAgICAgICAgICAgIGNhbGxFeHA6IFRvb2xzLlZlYy5jcmVhdGVGdW5jdGlvbkNhbGwuYmluZChudWxsLCAnbm9ybWFsaXplJywgMClcclxuICAgICAgICB9LFxyXG4gICAgICAgIGRvdDoge1xyXG4gICAgICAgICAgICBjYWxsRXhwOiBUb29scy5WZWMuY3JlYXRlRnVuY3Rpb25DYWxsLmJpbmQobnVsbCwgJ2RvdCcsIDIpXHJcbiAgICAgICAgfSxcclxuICAgICAgICBsZW5ndGg6IHtcclxuICAgICAgICAgICAgY2FsbEV4cDogVG9vbHMuVmVjLmdlbmVyYXRlTGVuZ3RoQ2FsbFxyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIFRvb2xzLlZlYy5hdHRhY2hTd2l6emxlcyhWZWMySW5zdGFuY2UsIDIpO1xyXG4gICAgVG9vbHMuVmVjLmF0dGFjaE9wZXJhdG9ycyhWZWMySW5zdGFuY2UsIDIsIHtcclxuICAgICAgICBhZGQ6ICcrJyxcclxuICAgICAgICBzdWI6ICctJyxcclxuICAgICAgICBtdWw6ICcqJyxcclxuICAgICAgICBkaXY6ICcvJyxcclxuICAgICAgICBtb2Q6ICclJ1xyXG4gICAgfSlcclxuXHJcblxyXG4gICAgVG9vbHMuZXh0ZW5kKG5zLCB7XHJcbiAgICAgICAgaWQ6IFwiVmVjMlwiLFxyXG4gICAgICAgIGtpbmQ6IEtJTkRTLkZMT0FUMixcclxuICAgICAgICBvYmplY3Q6IHtcclxuICAgICAgICAgICAgY29uc3RydWN0b3I6IFRvb2xzLlZlYy5nZW5lcmF0ZUNvbnN0cnVjdG9yLFxyXG4gICAgICAgICAgICBzdGF0aWM6IHt9XHJcbiAgICAgICAgfSxcclxuICAgICAgICBpbnN0YW5jZTogVmVjMkluc3RhbmNlXHJcbiAgICB9KTtcclxuXHJcbn0oZXhwb3J0cykpO1xyXG4iLCIoZnVuY3Rpb24obnMpe1xyXG5cclxuICAgIHZhciBTaGFkZSA9IHJlcXVpcmUoXCIuLi8uLi8uLi9pbnRlcmZhY2VzLmpzXCIpO1xyXG4gICAgdmFyIFN5bnRheCA9IHJlcXVpcmUoJ2VzdHJhdmVyc2UnKS5TeW50YXg7XHJcbiAgICB2YXIgVG9vbHMgPSByZXF1aXJlKFwiLi90b29scy5qc1wiKTtcclxuICAgIHZhciBBTk5PID0gcmVxdWlyZShcIi4uLy4uLy4uL2Jhc2UvYW5ub3RhdGlvbi5qc1wiKS5BTk5PO1xyXG5cclxuICAgIHZhciBUWVBFUyA9IFNoYWRlLlRZUEVTLFxyXG4gICAgICAgIEtJTkRTID0gU2hhZGUuT0JKRUNUX0tJTkRTO1xyXG5cclxuICAgIHZhciBWZWMzSW5zdGFuY2UgPSB7XHJcbiAgICAgICAgbm9ybWFsaXplOiB7XHJcbiAgICAgICAgICAgIGNhbGxFeHA6IFRvb2xzLlZlYy5jcmVhdGVGdW5jdGlvbkNhbGwuYmluZChudWxsLCAnbm9ybWFsaXplJywgMClcclxuICAgICAgICB9LFxyXG4gICAgICAgIGRvdDoge1xyXG4gICAgICAgICAgICBjYWxsRXhwOiBUb29scy5WZWMuY3JlYXRlRnVuY3Rpb25DYWxsLmJpbmQobnVsbCwgJ2RvdCcsIDMpXHJcbiAgICAgICAgfSxcclxuICAgICAgICBsZW5ndGg6IHtcclxuICAgICAgICAgICAgY2FsbEV4cDogVG9vbHMuVmVjLmdlbmVyYXRlTGVuZ3RoQ2FsbFxyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIFRvb2xzLlZlYy5hdHRhY2hTd2l6emxlcyhWZWMzSW5zdGFuY2UsIDMpO1xyXG4gICAgVG9vbHMuVmVjLmF0dGFjaE9wZXJhdG9ycyhWZWMzSW5zdGFuY2UsIDMsIHtcclxuICAgICAgICBhZGQ6ICcrJyxcclxuICAgICAgICBzdWI6ICctJyxcclxuICAgICAgICBtdWw6ICcqJyxcclxuICAgICAgICBkaXY6ICcvJyxcclxuICAgICAgICBtb2Q6ICclJ1xyXG4gICAgfSlcclxuXHJcblxyXG4gICAgVG9vbHMuZXh0ZW5kKG5zLCB7XHJcbiAgICAgICAgaWQ6IFwiVmVjM1wiLFxyXG4gICAgICAgIGtpbmQ6IEtJTkRTLkZMT0FUMyxcclxuICAgICAgICBvYmplY3Q6IHtcclxuICAgICAgICAgICAgY29uc3RydWN0b3I6IFRvb2xzLlZlYy5nZW5lcmF0ZUNvbnN0cnVjdG9yLFxyXG4gICAgICAgICAgICBzdGF0aWM6IHt9XHJcbiAgICAgICAgfSxcclxuICAgICAgICBpbnN0YW5jZTogVmVjM0luc3RhbmNlXHJcbiAgICB9KTtcclxuXHJcbn0oZXhwb3J0cykpO1xyXG4iLCIoZnVuY3Rpb24obnMpe1xyXG5cclxuICAgIHZhciBTaGFkZSA9IHJlcXVpcmUoXCIuLi8uLi8uLi9pbnRlcmZhY2VzLmpzXCIpO1xyXG4gICAgdmFyIFN5bnRheCA9IHJlcXVpcmUoJ2VzdHJhdmVyc2UnKS5TeW50YXg7XHJcbiAgICB2YXIgVG9vbHMgPSByZXF1aXJlKFwiLi90b29scy5qc1wiKTtcclxuICAgIHZhciBBTk5PID0gcmVxdWlyZShcIi4uLy4uLy4uL2Jhc2UvYW5ub3RhdGlvbi5qc1wiKS5BTk5PO1xyXG5cclxuICAgIHZhciBUWVBFUyA9IFNoYWRlLlRZUEVTLFxyXG4gICAgICAgIEtJTkRTID0gU2hhZGUuT0JKRUNUX0tJTkRTO1xyXG5cclxuICAgIHZhciBWZWM0SW5zdGFuY2UgPSB7XHJcbiAgICAgICAgbm9ybWFsaXplOiB7XHJcbiAgICAgICAgICAgIGNhbGxFeHA6IFRvb2xzLlZlYy5jcmVhdGVGdW5jdGlvbkNhbGwuYmluZChudWxsLCAnbm9ybWFsaXplJywgMClcclxuICAgICAgICB9LFxyXG4gICAgICAgIGRvdDoge1xyXG4gICAgICAgICAgICBjYWxsRXhwOiBUb29scy5WZWMuY3JlYXRlRnVuY3Rpb25DYWxsLmJpbmQobnVsbCwgJ2RvdCcsIDQpXHJcbiAgICAgICAgfSxcclxuICAgICAgICBsZW5ndGg6IHtcclxuICAgICAgICAgICAgY2FsbEV4cDogVG9vbHMuVmVjLmdlbmVyYXRlTGVuZ3RoQ2FsbFxyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIFRvb2xzLlZlYy5hdHRhY2hTd2l6emxlcyhWZWM0SW5zdGFuY2UsIDQpO1xyXG4gICAgVG9vbHMuVmVjLmF0dGFjaE9wZXJhdG9ycyhWZWM0SW5zdGFuY2UsIDQsIHtcclxuICAgICAgICBhZGQ6ICcrJyxcclxuICAgICAgICBzdWI6ICctJyxcclxuICAgICAgICBtdWw6ICcqJyxcclxuICAgICAgICBkaXY6ICcvJyxcclxuICAgICAgICBtb2Q6ICclJ1xyXG4gICAgfSlcclxuXHJcblxyXG4gICAgVG9vbHMuZXh0ZW5kKG5zLCB7XHJcbiAgICAgICAgaWQ6IFwiVmVjNFwiLFxyXG4gICAgICAgIGtpbmQ6IEtJTkRTLkZMT0FUNCxcclxuICAgICAgICBvYmplY3Q6IHtcclxuICAgICAgICAgICAgY29uc3RydWN0b3I6IFRvb2xzLlZlYy5nZW5lcmF0ZUNvbnN0cnVjdG9yLFxyXG4gICAgICAgICAgICBzdGF0aWM6IHt9XHJcbiAgICAgICAgfSxcclxuICAgICAgICBpbnN0YW5jZTogVmVjNEluc3RhbmNlXHJcbiAgICB9KTtcclxuXHJcbn0oZXhwb3J0cykpO1xyXG4iLCIoZnVuY3Rpb24gKG5zKSB7XHJcblxyXG4gICAgdmFyIEJhc2UgPSByZXF1aXJlKFwiLi4vLi4vYmFzZS9pbmRleC5qc1wiKSxcclxuICAgICAgICBBTk5PID0gcmVxdWlyZShcIi4uLy4uL2Jhc2UvYW5ub3RhdGlvbi5qc1wiKS5BTk5PLFxyXG4gICAgICAgIEFubm90YXRpb24gPSByZXF1aXJlKFwiLi4vLi4vYmFzZS9hbm5vdGF0aW9uLmpzXCIpLkFubm90YXRpb24sXHJcbiAgICAgICAgRnVuY3Rpb25Bbm5vdGF0aW9uID0gcmVxdWlyZShcIi4uLy4uL2Jhc2UvYW5ub3RhdGlvbi5qc1wiKS5GdW5jdGlvbkFubm90YXRpb24sXHJcbiAgICAgICAgVHlwZUluZm8gPSByZXF1aXJlKFwiLi4vLi4vYmFzZS90eXBlaW5mby5qc1wiKS5UeXBlSW5mbyxcclxuICAgICAgICBTaGFkZSA9IHJlcXVpcmUoXCIuLy4uLy4uL2ludGVyZmFjZXMuanNcIiksXHJcbiAgICAgICAgVHlwZXMgPSBTaGFkZS5UWVBFUyxcclxuICAgICAgICBLaW5kcyA9IFNoYWRlLk9CSkVDVF9LSU5EUyxcclxuICAgICAgICBTb3VyY2VzID0gcmVxdWlyZShcIi4vLi4vLi4vaW50ZXJmYWNlcy5qc1wiKS5TT1VSQ0VTLFxyXG4gICAgICAgIFRvb2xzID0gcmVxdWlyZSgnLi9yZWdpc3RyeS90b29scy5qcycpO1xyXG5cclxuICAgIHZhciBPYmplY3RSZWdpc3RyeSA9IHJlcXVpcmUoXCIuL3JlZ2lzdHJ5L2luZGV4LmpzXCIpLlJlZ2lzdHJ5LFxyXG4gICAgICAgIENvbnRleHQgPSByZXF1aXJlKFwiLi4vLi4vYmFzZS9jb250ZXh0LmpzXCIpLmdldENvbnRleHQoT2JqZWN0UmVnaXN0cnkpO1xyXG5cclxuXHJcbiAgICB2YXIgd2FsayA9IHJlcXVpcmUoJ2VzdHJhdmVyc2UnKTtcclxuICAgIHZhciBTeW50YXggPSB3YWxrLlN5bnRheDtcclxuXHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBUcmFuc2Zvcm1zIHRoZSBKUyBBU1QgdG8gYW4gQVNUIHJlcHJlc2VudGF0aW9uIGNvbnZlbmllbnRcclxuICAgICAqIGZvciBjb2RlIGdlbmVyYXRpb25cclxuICAgICAqIEBjb25zdHJ1Y3RvclxyXG4gICAgICovXHJcbiAgICB2YXIgR0xBU1RUcmFuc2Zvcm1lciA9IGZ1bmN0aW9uIChtYWluSWQpIHtcclxuICAgICAgICB0aGlzLm1haW5JZCA9IG1haW5JZDtcclxuICAgIH07XHJcblxyXG4gICAgQmFzZS5leHRlbmQoR0xBU1RUcmFuc2Zvcm1lci5wcm90b3R5cGUsIHtcclxuICAgICAgICByZWdpc3Rlckdsb2JhbENvbnRleHQgOiBmdW5jdGlvbiAocHJvZ3JhbSkge1xyXG4gICAgICAgICAgICB2YXIgY3R4ID0gbmV3IENvbnRleHQocHJvZ3JhbSwgbnVsbCwge25hbWU6IFwiZ2xvYmFsXCJ9KTtcclxuICAgICAgICAgICAgY3R4LnJlZ2lzdGVyT2JqZWN0KFwiTWF0aFwiLCBPYmplY3RSZWdpc3RyeS5nZXRCeU5hbWUoXCJNYXRoXCIpKTtcclxuICAgICAgICAgICAgY3R4LnJlZ2lzdGVyT2JqZWN0KFwidGhpc1wiLCBPYmplY3RSZWdpc3RyeS5nZXRCeU5hbWUoXCJTeXN0ZW1cIikpO1xyXG4gICAgICAgICAgICBjdHgucmVnaXN0ZXJPYmplY3QoXCJTaGFkZVwiLCBPYmplY3RSZWdpc3RyeS5nZXRCeU5hbWUoXCJTaGFkZVwiKSk7XHJcbiAgICAgICAgICAgIGN0eC5yZWdpc3Rlck9iamVjdChcIlZlYzJcIiwgT2JqZWN0UmVnaXN0cnkuZ2V0QnlOYW1lKFwiVmVjMlwiKSk7XHJcbiAgICAgICAgICAgIGN0eC5yZWdpc3Rlck9iamVjdChcIlZlYzNcIiwgT2JqZWN0UmVnaXN0cnkuZ2V0QnlOYW1lKFwiVmVjM1wiKSk7XHJcbiAgICAgICAgICAgIGN0eC5yZWdpc3Rlck9iamVjdChcIlZlYzRcIiwgT2JqZWN0UmVnaXN0cnkuZ2V0QnlOYW1lKFwiVmVjNFwiKSk7XHJcbiAgICAgICAgICAgIGN0eC5yZWdpc3Rlck9iamVjdChcIkNvbG9yXCIsIE9iamVjdFJlZ2lzdHJ5LmdldEJ5TmFtZShcIlZlYzNcIikpO1xyXG4gICAgICAgICAgICBjdHgucmVnaXN0ZXJPYmplY3QoXCJUZXh0dXJlXCIsIE9iamVjdFJlZ2lzdHJ5LmdldEJ5TmFtZShcIlRleHR1cmVcIikpO1xyXG4gICAgICAgICAgICBjdHguZGVjbGFyZVZhcmlhYmxlKFwiZ2xfRnJhZ0Nvb3JkXCIsIGZhbHNlKTtcclxuICAgICAgICAgICAgY3R4LnVwZGF0ZUV4cHJlc3Npb24oXCJnbF9GcmFnQ29vcmRcIiwgbmV3IFR5cGVJbmZvKHtcclxuICAgICAgICAgICAgICAgIGV4dHJhOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogVHlwZXMuT0JKRUNULFxyXG4gICAgICAgICAgICAgICAgICAgIGtpbmQ6IEtpbmRzLkZMT0FUM1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KSk7XHJcbiAgICAgICAgICAgIGN0eC5kZWNsYXJlVmFyaWFibGUoXCJfc3lzX25vcm1hbGl6ZWRDb29yZHNcIiwgZmFsc2UpO1xyXG4gICAgICAgICAgICBjdHgudXBkYXRlRXhwcmVzc2lvbihcIl9zeXNfbm9ybWFsaXplZENvb3Jkc1wiLCBuZXcgVHlwZUluZm8oe1xyXG4gICAgICAgICAgICAgICAgZXh0cmE6IHtcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiBUeXBlcy5PQkpFQ1QsXHJcbiAgICAgICAgICAgICAgICAgICAga2luZDogS2luZHMuRkxPQVQzXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pKTtcclxuXHJcbiAgICAgICAgICAgIHJldHVybiBjdHg7XHJcbiAgICAgICAgfSxcclxuICAgICAgICB0cmFuc2Zvcm1BQVNUOiBmdW5jdGlvbiAocHJvZ3JhbSkge1xyXG4gICAgICAgICAgICB0aGlzLnJvb3QgPSBwcm9ncmFtO1xyXG4gICAgICAgICAgICB2YXIgY29udGV4dCA9IHRoaXMucmVnaXN0ZXJHbG9iYWxDb250ZXh0KHByb2dyYW0pO1xyXG5cclxuICAgICAgICAgICAgdmFyIHN0YXRlID0ge1xyXG4gICAgICAgICAgICAgICAgIGNvbnRleHQ6IGNvbnRleHQsXHJcbiAgICAgICAgICAgICAgICAgY29udGV4dFN0YWNrOiBbY29udGV4dF0sXHJcbiAgICAgICAgICAgICAgICAgaW5NYWluOiAgdGhpcy5tYWluSWQgPT0gY29udGV4dC5zdHIoKSxcclxuICAgICAgICAgICAgICAgICBnbG9iYWxQYXJhbWV0ZXJzIDogcHJvZ3JhbS5pbmplY3Rpb25zW3RoaXMubWFpbklkXSAmJiBwcm9ncmFtLmluamVjdGlvbnNbdGhpcy5tYWluSWRdWzBdID8gcHJvZ3JhbS5pbmplY3Rpb25zW3RoaXMubWFpbklkXVswXS5ub2RlLmV4dHJhLmluZm8gOiB7fSxcclxuICAgICAgICAgICAgICAgICBzeXN0ZW1QYXJhbWV0ZXJzOiB7fSxcclxuICAgICAgICAgICAgICAgICBibG9ja2VkTmFtZXMgOiBbXSxcclxuICAgICAgICAgICAgICAgICB0b3BEZWNsYXJhdGlvbnMgOiBbXSxcclxuICAgICAgICAgICAgICAgICBpZE5hbWVNYXAgOiB7fVxyXG4gICAgICAgICAgICB9XHJcblxyXG5cclxuICAgICAgICAgICAgLy8gVE9ETzogV2Ugc2hvdWxkIGFsc28gYmxvY2sgc3lzdGVtUGFyYW1ldGVycyBoZXJlLiBXZSBjYW4gYmxvY2sgYWxsIHN5c3RlbSBuYW1lcywgZXZlbiBpZiBub3QgdXNlZC5cclxuICAgICAgICAgICAgZm9yKHZhciBuYW1lIGluIHN0YXRlLmdsb2JhbFBhcmFtZXRlcnMpe1xyXG4gICAgICAgICAgICAgICAgc3RhdGUuYmxvY2tlZE5hbWVzLnB1c2goIGdldE5hbWVGb3JHbG9iYWwobmFtZSkgKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgdGhpcy5yZXBsYWNlKHByb2dyYW0sIHN0YXRlKTtcclxuXHJcbiAgICAgICAgICAgIGZvcih2YXIgbmFtZSBpbiBzdGF0ZS5zeXN0ZW1QYXJhbWV0ZXJzKXtcclxuICAgICAgICAgICAgICAgIHZhciBkZWNsID0gaGFuZGxlVG9wRGVjbGFyYXRpb24obmFtZSwgc3RhdGUuc3lzdGVtUGFyYW1ldGVyc1tuYW1lXSk7XHJcbiAgICAgICAgICAgICAgICBkZWNsICYmIHByb2dyYW0uYm9keS51bnNoaWZ0KGRlY2wpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBmb3IodmFyIG5hbWUgaW4gc3RhdGUuZ2xvYmFsUGFyYW1ldGVycyl7XHJcbiAgICAgICAgICAgICAgICB2YXIgZGVjbCA9IGhhbmRsZVRvcERlY2xhcmF0aW9uKGdldE5hbWVGb3JHbG9iYWwobmFtZSksIHN0YXRlLmdsb2JhbFBhcmFtZXRlcnNbbmFtZV0pO1xyXG4gICAgICAgICAgICAgICAgZGVjbCAmJiBwcm9ncmFtLmJvZHkudW5zaGlmdChkZWNsKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgcmV0dXJuIHByb2dyYW07XHJcbiAgICAgICAgfSxcclxuICAgICAgICAvKipcclxuICAgICAgICAgKlxyXG4gICAgICAgICAqIEBwYXJhbSB7T2JqZWN0IX0gYXN0XHJcbiAgICAgICAgICogQHBhcmFtIHtPYmplY3QhfSBzdGF0ZVxyXG4gICAgICAgICAqIEByZXR1cm5zIHsqfVxyXG4gICAgICAgICAqL1xyXG4gICAgICAgIHJlcGxhY2U6IGZ1bmN0aW9uKGFzdCwgc3RhdGUpIHtcclxuICAgICAgICAgICAgd2Fsay5yZXBsYWNlKGFzdCwge1xyXG5cclxuICAgICAgICAgICAgICAgIGVudGVyOiBmdW5jdGlvbiAobm9kZSwgcGFyZW50KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgLy9jb25zb2xlLmxvZyhcIkVudGVyOlwiLCBub2RlLnR5cGUpO1xyXG4gICAgICAgICAgICAgICAgICAgIHN3aXRjaCAobm9kZS50eXBlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgU3ludGF4LklkZW50aWZpZXI6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gaGFuZGxlSWRlbnRpZmllcihub2RlLCBwYXJlbnQsIHN0YXRlLmJsb2NrZWROYW1lcywgc3RhdGUuaWROYW1lTWFwKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSBTeW50YXguSWZTdGF0ZW1lbnQ6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gaGFuZGxlSWZTdGF0ZW1lbnQobm9kZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgU3ludGF4LkNvbmRpdGlvbmFsRXhwcmVzc2lvbjpcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBoYW5kbGVDb25kaXRpb25hbEV4cHJlc3Npb24obm9kZSwgc3RhdGUsIHRoaXMpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjYXNlIFN5bnRheC5Mb2dpY2FsRXhwcmVzc2lvbjpcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBoYW5kbGVFbnRlckxvZ2ljYWxFeHByZXNzaW9uKG5vZGUsIHRoaXMsIHN0YXRlKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSBTeW50YXguRnVuY3Rpb25EZWNsYXJhdGlvbjpcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIE5vIG5lZWQgdG8gZGVjbGFyZSwgdGhpcyBoYXMgYmVlbiBhbm5vdGF0ZWQgYWxyZWFkeVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHBhcmVudENvbnRleHQgPSBzdGF0ZS5jb250ZXh0U3RhY2tbc3RhdGUuY29udGV4dFN0YWNrLmxlbmd0aCAtIDFdO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGNvbnRleHQgPSBuZXcgQ29udGV4dChub2RlLCBwYXJlbnRDb250ZXh0LCB7bmFtZTogbm9kZS5pZC5uYW1lIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RhdGUuY29udGV4dCA9IGNvbnRleHQ7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdGF0ZS5jb250ZXh0U3RhY2sucHVzaChjb250ZXh0KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0YXRlLmluTWFpbiA9IHRoaXMubWFpbklkID09IGNvbnRleHQuc3RyKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9LmJpbmQodGhpcyksXHJcblxyXG4gICAgICAgICAgICAgICAgbGVhdmU6IGZ1bmN0aW9uKG5vZGUsIHBhcmVudCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHN3aXRjaChub2RlLnR5cGUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSBTeW50YXguTWVtYmVyRXhwcmVzc2lvbjpcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBoYW5kbGVNZW1iZXJFeHByZXNzaW9uKG5vZGUsIHBhcmVudCwgc3RhdGUpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjYXNlIFN5bnRheC5OZXdFeHByZXNzaW9uOlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGhhbmRsZU5ld0V4cHJlc3Npb24obm9kZSwgcGFyZW50LCBzdGF0ZS5jb250ZXh0KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSBTeW50YXguTG9naWNhbEV4cHJlc3Npb246XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gaGFuZGxlRXhpdExvZ2ljYWxFeHByZXNzaW9uKG5vZGUsIHRoaXMsIHN0YXRlKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSBTeW50YXguQ2FsbEV4cHJlc3Npb246XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gaGFuZGxlQ2FsbEV4cHJlc3Npb24obm9kZSwgcGFyZW50LCBzdGF0ZS50b3BEZWNsYXJhdGlvbnMsIHN0YXRlLmNvbnRleHQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjYXNlIFN5bnRheC5GdW5jdGlvbkRlY2xhcmF0aW9uOlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RhdGUuY29udGV4dCA9IHN0YXRlLmNvbnRleHRTdGFjay5wb3AoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0YXRlLmluTWFpbiA9IHN0YXRlLmNvbnRleHQuc3RyKCkgPT0gdGhpcy5tYWluSWQ7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoc3RhdGUuaW5NYWluKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBoYW5kbGVNYWluRnVuY3Rpb24obm9kZSwgcGFyZW50LCBzdGF0ZS5jb250ZXh0KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSBTeW50YXguUmV0dXJuU3RhdGVtZW50OlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYoc3RhdGUuaW5NYWluKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGhhbmRsZVJldHVybkluTWFpbihub2RlLCBzdGF0ZS5jb250ZXh0KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjYXNlIFN5bnRheC5CaW5hcnlFeHByZXNzaW9uOlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGhhbmRsZUJpbmFyeUV4cHJlc3Npb24obm9kZSwgcGFyZW50KTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfS5iaW5kKHRoaXMpXHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICByZXR1cm4gYXN0O1xyXG4gICAgICAgIH1cclxuICAgIH0pO1xyXG5cclxuICAgIHZhciBoYW5kbGVUb3BEZWNsYXJhdGlvbiA9IGZ1bmN0aW9uKG5hbWUsIHR5cGVJbmZvKXtcclxuICAgICAgICB2YXIgcHJvcGVydHlMaXRlcmFsID0gIHsgdHlwZTogU3ludGF4LklkZW50aWZpZXIsIG5hbWU6IG5hbWV9O1xyXG4gICAgICAgIHZhciBwcm9wZXJ0eUFubm90YXRpb24gPSAgQU5OTyhwcm9wZXJ0eUxpdGVyYWwpO1xyXG4gICAgICAgIHByb3BlcnR5QW5ub3RhdGlvbi5zZXRGcm9tRXh0cmEodHlwZUluZm8pO1xyXG5cclxuICAgICAgICBpZiAocHJvcGVydHlBbm5vdGF0aW9uLmlzTnVsbE9yVW5kZWZpbmVkKCkpXHJcbiAgICAgICAgICAgIHJldHVybjtcclxuXHJcbiAgICAgICAgdmFyIGRlY2wgPSB7XHJcbiAgICAgICAgICAgIHR5cGU6IFN5bnRheC5WYXJpYWJsZURlY2xhcmF0aW9uLFxyXG4gICAgICAgICAgICBkZWNsYXJhdGlvbnM6IFtcclxuICAgICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiBTeW50YXguVmFyaWFibGVEZWNsYXJhdG9yLFxyXG4gICAgICAgICAgICAgICAgICAgIGlkOiBwcm9wZXJ0eUxpdGVyYWwsXHJcbiAgICAgICAgICAgICAgICAgICAgaW5pdDogbnVsbFxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBdLFxyXG4gICAgICAgICAgICBraW5kOiBcInZhclwiXHJcbiAgICAgICAgfTtcclxuICAgICAgICB2YXIgZGVjbEFubm90YXRpb24gPSAgQU5OTyhkZWNsLmRlY2xhcmF0aW9uc1swXSk7XHJcbiAgICAgICAgZGVjbEFubm90YXRpb24uY29weShwcm9wZXJ0eUFubm90YXRpb24pO1xyXG4gICAgICAgIHJldHVybiBkZWNsO1xyXG4gICAgfVxyXG5cclxuICAgIHZhciBoYW5kbGVJZGVudGlmaWVyID0gZnVuY3Rpb24obm9kZSwgcGFyZW50LCBibG9ja2VkTmFtZXMsIGlkTmFtZU1hcCl7XHJcbiAgICAgICAgaWYocGFyZW50LnR5cGUgPT0gU3ludGF4Lk1lbWJlckV4cHJlc3Npb24pXHJcbiAgICAgICAgICAgIHJldHVybiBub2RlO1xyXG5cclxuICAgICAgICB2YXIgbmFtZSA9IG5vZGUubmFtZTtcclxuICAgICAgICBpZihpZE5hbWVNYXBbbmFtZV0pIG5vZGUubmFtZSA9IGlkTmFtZU1hcFtuYW1lXTtcclxuICAgICAgICB2YXIgbmV3TmFtZSA9IG5hbWUucmVwbGFjZSgvXysvZywgXCJfXCIpLCBpID0gMTtcclxuICAgICAgICB3aGlsZShibG9ja2VkTmFtZXMuaW5kZXhPZihuZXdOYW1lKSAhPSAtMSl7XHJcbiAgICAgICAgICAgIG5ld05hbWUgPSBuYW1lICsgXCJfXCIgKyAoKytpKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgaWROYW1lTWFwW25hbWVdID0gbmV3TmFtZTtcclxuICAgICAgICBub2RlLm5hbWUgPSBuZXdOYW1lO1xyXG4gICAgICAgIHJldHVybiBub2RlO1xyXG4gICAgfVxyXG5cclxuXHJcbiAgICB2YXIgaGFuZGxlUmV0dXJuSW5NYWluID0gZnVuY3Rpb24obm9kZSwgY29udGV4dCkge1xyXG4gICAgICAgIGlmIChub2RlLmFyZ3VtZW50KSB7XHJcbiAgICAgICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgICAgICB0eXBlOiBTeW50YXguQmxvY2tTdGF0ZW1lbnQsXHJcbiAgICAgICAgICAgICAgICBib2R5OiBbXHJcbiAgICAgICAgICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiBTeW50YXguQXNzaWdubWVudEV4cHJlc3Npb24sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG9wZXJhdG9yOiBcIj1cIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGVmdDoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogU3ludGF4LklkZW50aWZpZXIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBuYW1lOiBcImdsX0ZyYWdDb2xvclwiXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJpZ2h0OiBjYXN0VG9WZWM0KG5vZGUuYXJndW1lbnQsIGNvbnRleHQpXHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6IFN5bnRheC5SZXR1cm5TdGF0ZW1lbnRcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBdXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICAgICAgdHlwZTogU3ludGF4LkV4cHJlc3Npb25TdGF0ZW1lbnQsXHJcbiAgICAgICAgICAgICAgICBleHByZXNzaW9uIDoge1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IFN5bnRheC5JZGVudGlmaWVyLFxyXG4gICAgICAgICAgICAgICAgICAgIG5hbWU6IFwiZGlzY2FyZFwiXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9O1xyXG5cclxuICAgIHZhciBoYW5kbGVNYWluRnVuY3Rpb24gPSBmdW5jdGlvbihub2RlLCBwYXJlbnQsIGNvbnRleHQpIHtcclxuICAgICAgICB2YXIgYW5ubyA9IG5ldyBGdW5jdGlvbkFubm90YXRpb24obm9kZSk7XHJcbiAgICAgICAgYW5uby5zZXRSZXR1cm5JbmZvKHsgdHlwZTogVHlwZXMuVU5ERUZJTkVEIH0pO1xyXG5cclxuICAgICAgICAvLyBjb25zb2xlLmxvZyhjb250ZXh0KTtcclxuICAgICAgICAvLyBNYWluIGhhcyBubyBwYXJhbWV0ZXJzXHJcbiAgICAgICAgbm9kZS5wYXJhbXMgPSBbXTtcclxuICAgICAgICAvLyBSZW5hbWUgdG8gJ21haW4nXHJcbiAgICAgICAgbm9kZS5pZC5uYW1lID0gXCJtYWluXCI7XHJcbiAgICAgICAgLy9jb25zb2xlLmxvZyhub2RlKTtcclxuICAgIH1cclxuXHJcblxyXG4gICAgZnVuY3Rpb24gZ2V0TmFtZU9mTm9kZShub2RlKSB7XHJcbiAgICAgICAgc3dpdGNoIChub2RlLnR5cGUpIHtcclxuICAgICAgICAgICAgY2FzZSBTeW50YXguSWRlbnRpZmllcjpcclxuICAgICAgICAgICAgICAgIHJldHVybiBub2RlLm5hbWU7XHJcbiAgICAgICAgICAgIGNhc2UgU3ludGF4Lk1lbWJlckV4cHJlc3Npb246XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gZ2V0TmFtZU9mTm9kZShub2RlLm9iamVjdCkgKyBcIi5cIiArIGdldE5hbWVPZk5vZGUobm9kZS5wcm9wZXJ0eSk7XHJcbiAgICAgICAgICAgIGNhc2UgU3ludGF4Lk5ld0V4cHJlc3Npb246XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gZ2V0TmFtZU9mTm9kZShub2RlLmNhbGxlZSk7XHJcbiAgICAgICAgICAgIGRlZmF1bHQ6XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gXCJ1bmtub3duKFwiICsgbm9kZS50eXBlICsgXCIpXCI7XHJcbiAgICAgICAgfVxyXG4gICAgfTtcclxuXHJcbiAgICBmdW5jdGlvbiBnZXRPYmplY3RSZWZlcmVuY2VGcm9tTm9kZShvYmplY3QsIGNvbnRleHQpIHtcclxuICAgICAgICBzd2l0Y2ggKG9iamVjdC50eXBlKSB7XHJcbiAgICAgICAgICAgIGNhc2UgU3ludGF4Lk5ld0V4cHJlc3Npb246XHJcbiAgICAgICAgICAgIGNhc2UgU3ludGF4LkNhbGxFeHByZXNzaW9uOlxyXG4gICAgICAgICAgICBjYXNlIFN5bnRheC5NZW1iZXJFeHByZXNzaW9uOlxyXG4gICAgICAgICAgICBjYXNlIFN5bnRheC5CaW5hcnlFeHByZXNzaW9uOlxyXG4gICAgICAgICAgICBjYXNlIFN5bnRheC5JZGVudGlmaWVyOlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGNvbnRleHQuY3JlYXRlVHlwZUluZm8ob2JqZWN0KTtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIFN5bnRheC5UaGlzRXhwcmVzc2lvbjpcclxuICAgICAgICAgICAgICAgIHJldHVybiBjb250ZXh0LmdldEJpbmRpbmdCeU5hbWUoXCJ0aGlzXCIpO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGRlZmF1bHQ6XHJcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJVbmhhbmRsZWQgb2JqZWN0IHR5cGUgaW4gR0xTTCBnZW5lcmF0aW9uOiBcIiArIG9iamVjdC50eXBlKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgdmFyIGhhbmRsZUNhbGxFeHByZXNzaW9uID0gZnVuY3Rpb24gKGNhbGxFeHByZXNzaW9uLCBwYXJlbnQsIHRvcERlY2xhcmF0aW9ucywgY29udGV4dCkge1xyXG5cclxuICAgICAgICAvLyBJcyB0aGlzIGEgY2FsbCBvbiBhbiBvYmplY3Q/XHJcbiAgICAgICAgaWYgKGNhbGxFeHByZXNzaW9uLmNhbGxlZS50eXBlID09IFN5bnRheC5NZW1iZXJFeHByZXNzaW9uKSB7XHJcbiAgICAgICAgICAgIHZhciBjYWxsZWVSZWZlcmVuY2UgPSBnZXRPYmplY3RSZWZlcmVuY2VGcm9tTm9kZShjYWxsRXhwcmVzc2lvbi5jYWxsZWUsIGNvbnRleHQpO1xyXG4gICAgICAgICAgICBpZighKGNhbGxlZVJlZmVyZW5jZSAmJiBjYWxsZWVSZWZlcmVuY2UuaXNGdW5jdGlvbigpKSlcclxuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIlNvbWV0aGluZyB3ZW50IHdyb25nIGluIHR5cGUgaW5mZXJlbmNlXCIpO1xyXG5cclxuICAgICAgICAgICAgdmFyIG9iamVjdCA9IGNhbGxFeHByZXNzaW9uLmNhbGxlZS5vYmplY3QsXHJcbiAgICAgICAgICAgICAgICBwcm9wZXJ0eU5hbWUgPSBjYWxsRXhwcmVzc2lvbi5jYWxsZWUucHJvcGVydHkubmFtZTtcclxuXHJcbiAgICAgICAgICAgIHZhciBvYmplY3RSZWZlcmVuY2UgPSBnZXRPYmplY3RSZWZlcmVuY2VGcm9tTm9kZShvYmplY3QsIGNvbnRleHQpO1xyXG4gICAgICAgICAgICBpZighb2JqZWN0UmVmZXJlbmNlKSAge1xyXG4gICAgICAgICAgICAgICAgU2hhZGUudGhyb3dFcnJvcihjYWxsRXhwcmVzc2lvbiwgXCJJbnRlcm5hbDogTm8gb2JqZWN0IGluZm8gZm9yOiBcIiArIG9iamVjdCk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHZhciBvYmplY3RJbmZvID0gY29udGV4dC5nZXRPYmplY3RJbmZvRm9yKG9iamVjdFJlZmVyZW5jZSk7XHJcbiAgICAgICAgICAgIGlmKCFvYmplY3RJbmZvKSB7IC8vIEV2ZXJ5IG9iamVjdCBuZWVkcyBhbiBpbmZvLCBvdGhlcndpc2Ugd2UgZGlkIHNvbWV0aGluZyB3cm9uZ1xyXG4gICAgICAgICAgICAgICAgU2hhZGUudGhyb3dFcnJvcihjYWxsRXhwcmVzc2lvbiwgXCJJbnRlcm5hbCBFcnJvcjogTm8gb2JqZWN0IHJlZ2lzdGVyZWQgZm9yOiBcIiArIG9iamVjdFJlZmVyZW5jZS5nZXRUeXBlU3RyaW5nKCkgKyBcIiwgXCIgKyBnZXROYW1lT2ZOb2RlKGNhbGxFeHByZXNzaW9uLmNhbGxlZS5vYmplY3QpK1wiLCBcIitjYWxsRXhwcmVzc2lvbi5jYWxsZWUub2JqZWN0LnR5cGUpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmIChvYmplY3RJbmZvLmhhc093blByb3BlcnR5KHByb3BlcnR5TmFtZSkpIHtcclxuICAgICAgICAgICAgICAgIHZhciBwcm9wZXJ0eUhhbmRsZXIgPSBvYmplY3RJbmZvW3Byb3BlcnR5TmFtZV07XHJcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIHByb3BlcnR5SGFuZGxlci5jYWxsRXhwID09IFwiZnVuY3Rpb25cIikge1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciBhcmdzID0gQW5ub3RhdGlvbi5jcmVhdGVBbm5vdGF0ZWROb2RlQXJyYXkoY2FsbEV4cHJlc3Npb24uYXJndW1lbnRzLCBjb250ZXh0KTtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcHJvcGVydHlIYW5kbGVyLmNhbGxFeHAoY2FsbEV4cHJlc3Npb24sIGFyZ3MsIHBhcmVudCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgdmFyIGhhbmRsZU5ld0V4cHJlc3Npb24gPSBmdW5jdGlvbihuZXdFeHByZXNzaW9uLCBwYXJlbnQsIGNvbnRleHQpe1xyXG4gICAgICAgIHZhciBlbnRyeSA9IGNvbnRleHQuZ2V0QmluZGluZ0J5TmFtZShuZXdFeHByZXNzaW9uLmNhbGxlZS5uYW1lKTtcclxuICAgICAgICAvL2NvbnNvbGUuZXJyb3IoZW50cnkpO1xyXG4gICAgICAgIGlmIChlbnRyeSAmJiBlbnRyeS5oYXNDb25zdHJ1Y3RvcigpKSB7XHJcbiAgICAgICAgICAgIHZhciBjb25zdHJ1Y3RvciA9IGVudHJ5LmdldENvbnN0cnVjdG9yKCk7XHJcbiAgICAgICAgICAgIHJldHVybiBjb25zdHJ1Y3RvcihuZXdFeHByZXNzaW9uKTtcclxuICAgICAgICB9XHJcbiAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiUmVmZXJlbmNlRXJyb3I6IFwiICsgbm9kZS5jYWxsZWUubmFtZSArIFwiIGlzIG5vdCBkZWZpbmVkXCIpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcblxyXG4gICAgdmFyIGhhbmRsZU1lbWJlckV4cHJlc3Npb24gPSBmdW5jdGlvbiAobWVtYmVyRXhwcmVzc2lvbiwgcGFyZW50LCBzdGF0ZSkge1xyXG4gICAgICAgIHZhciBwcm9wZXJ0eU5hbWUgPSBtZW1iZXJFeHByZXNzaW9uLnByb3BlcnR5Lm5hbWUsXHJcbiAgICAgICAgICAgIGNvbnRleHQgPSBzdGF0ZS5jb250ZXh0O1xyXG5cclxuICAgICAgICB2YXIgb2JqZWN0UmVmZXJlbmNlID0gZ2V0T2JqZWN0UmVmZXJlbmNlRnJvbU5vZGUobWVtYmVyRXhwcmVzc2lvbi5vYmplY3QsIGNvbnRleHQpO1xyXG5cclxuICAgICAgICBpZiAoIW9iamVjdFJlZmVyZW5jZSB8fCAhb2JqZWN0UmVmZXJlbmNlLmlzT2JqZWN0KCkpXHJcbiAgICAgICAgICAgIFNoYWRlLnRocm93RXJyb3IobWVtYmVyRXhwcmVzc2lvbiwgXCJJbnRlcm5hbCBFcnJvcjogT2JqZWN0IG9mIE1lbWJlciBleHByZXNzaW9uIGlzIG5vIG9iamVjdC5cIik7XHJcblxyXG4gICAgICAgIHZhciBvYmplY3RJbmZvID0gY29udGV4dC5nZXRPYmplY3RJbmZvRm9yKG9iamVjdFJlZmVyZW5jZSk7XHJcbiAgICAgICAgaWYoIW9iamVjdEluZm8pIHsvLyBFdmVyeSBvYmplY3QgbmVlZHMgYW4gaW5mbywgb3RoZXJ3aXNlIHdlIGRpZCBzb21ldGhpbmcgd3JvbmdcclxuICAgICAgICAgICAgU2hhZGUudGhyb3dFcnJvcihtZW1iZXJFeHByZXNzaW9uLCBcIkludGVybmFsIEVycm9yOiBObyBvYmplY3QgcmVnaXN0ZXJlZCBmb3I6IFwiICsgb2JqZWN0UmVmZXJlbmNlLmdldFR5cGVTdHJpbmcoKSArIEpTT04uc3RyaW5naWZ5KG1lbWJlckV4cHJlc3Npb24ub2JqZWN0KSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmICghb2JqZWN0SW5mby5oYXNPd25Qcm9wZXJ0eShwcm9wZXJ0eU5hbWUpKVxyXG4gICAgICAgICAgICBTaGFkZS50aHJvd0Vycm9yKG1lbWJlckV4cHJlc3Npb24sIFwiSW50ZXJuYWwgRXJyb3I6IE9iamVjdCBvZiB0eXBlIFwiICsgb2JqZWN0UmVmZXJlbmNlLmdldFR5cGVTdHJpbmcoKSArIFwiIGhhcyBubyBwcm9wZXJ0eSAnXCIgKyBwcm9wZXJ0eU5hbWUgK1wiJ1wiKTtcclxuXHJcbiAgICAgICAgdmFyIHByb3BlcnR5SGFuZGxlciA9IG9iamVjdEluZm9bcHJvcGVydHlOYW1lXTtcclxuICAgICAgICBpZiAodHlwZW9mIHByb3BlcnR5SGFuZGxlci5wcm9wZXJ0eSA9PSBcImZ1bmN0aW9uXCIpIHtcclxuICAgICAgICAgICAgdmFyIHJlc3VsdCA9IHByb3BlcnR5SGFuZGxlci5wcm9wZXJ0eShtZW1iZXJFeHByZXNzaW9uLCBwYXJlbnQsIGNvbnRleHQsIHN0YXRlKTtcclxuICAgICAgICAgICAgcmV0dXJuIHJlc3VsdDtcclxuICAgICAgICB9XHJcbiAgICAgICAgZWxzZSBpZihvYmplY3RSZWZlcmVuY2UuaXNHbG9iYWwoKSkge1xyXG4gICAgICAgICAgICB2YXIgcHJvcGVydHlMaXRlcmFsID0gIHsgdHlwZTogU3ludGF4LklkZW50aWZpZXIsIG5hbWU6IGdldE5hbWVGb3JHbG9iYWwocHJvcGVydHlOYW1lKX07XHJcbiAgICAgICAgICAgIEFOTk8ocHJvcGVydHlMaXRlcmFsKS5jb3B5KEFOTk8obWVtYmVyRXhwcmVzc2lvbikpO1xyXG4gICAgICAgICAgICByZXR1cm4gcHJvcGVydHlMaXRlcmFsO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICB9O1xyXG5cclxuICAgIHZhciBnZXROYW1lRm9yR2xvYmFsID0gZnVuY3Rpb24oYmFzZU5hbWUpIHtcclxuICAgICAgICB2YXIgbmFtZSA9IFwiX2Vudl9cIiArIGJhc2VOYW1lO1xyXG4gICAgICAgIHJldHVybiBuYW1lLnJlcGxhY2UoL18rL2csIFwiX1wiKTtcclxuICAgIH1cclxuXHJcbiAgICB2YXIgaGFuZGxlQmluYXJ5RXhwcmVzc2lvbiA9IGZ1bmN0aW9uIChiaW5hcnlFeHByZXNzaW9uLCBwYXJlbnQsIGNiKSB7XHJcbiAgICAgICAgLy8gSW4gR0wsIHdlIGNhbid0IG1peCB1cCBmbG9hdHMsIGludHMgYW5kIGJvb2xkIGZvciBiaW5hcnkgZXhwcmVzc2lvbnNcclxuICAgICAgICB2YXIgbGVmdCA9IEFOTk8oYmluYXJ5RXhwcmVzc2lvbi5sZWZ0KSxcclxuICAgICAgICAgICAgcmlnaHQgPSBBTk5PKGJpbmFyeUV4cHJlc3Npb24ucmlnaHQpO1xyXG5cclxuICAgICAgICBpZiAobGVmdC5pc051bWJlcigpICYmIHJpZ2h0LmlzSW50KCkpIHtcclxuICAgICAgICAgICAgYmluYXJ5RXhwcmVzc2lvbi5yaWdodCA9IFRvb2xzLmNhc3RUb0Zsb2F0KGJpbmFyeUV4cHJlc3Npb24ucmlnaHQpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBlbHNlIGlmIChyaWdodC5pc051bWJlcigpICYmIGxlZnQuaXNJbnQoKSkge1xyXG4gICAgICAgICAgICBiaW5hcnlFeHByZXNzaW9uLmxlZnQgPSBUb29scy5jYXN0VG9GbG9hdChiaW5hcnlFeHByZXNzaW9uLmxlZnQpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKGJpbmFyeUV4cHJlc3Npb24ub3BlcmF0b3IgPT0gXCIlXCIpIHtcclxuICAgICAgICAgICAgcmV0dXJuIGhhbmRsZU1vZHVsbyhiaW5hcnlFeHByZXNzaW9uKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIGJpbmFyeUV4cHJlc3Npb247XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gY2FzdFRvSW50KGFzdCwgZm9yY2UpIHtcclxuICAgICAgICB2YXIgZXhwID0gQU5OTyhhc3QpO1xyXG5cclxuICAgICAgICBpZiAoIWV4cC5pc0ludCgpIHx8IGZvcmNlKSB7ICAgLy8gQ2FzdFxyXG4gICAgICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICAgICAgdHlwZTogU3ludGF4LkNhbGxFeHByZXNzaW9uLFxyXG4gICAgICAgICAgICAgICAgY2FsbGVlOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogU3ludGF4LklkZW50aWZpZXIsXHJcbiAgICAgICAgICAgICAgICAgICAgbmFtZTogXCJpbnRcIlxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgIGFyZ3VtZW50czogW2FzdF1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gYXN0O1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGNhc3RUb1ZlYzQoYXN0LCBjb250ZXh0KSB7XHJcbiAgICAgICAgdmFyIGV4cCA9IFR5cGVJbmZvLmNyZWF0ZUZvckNvbnRleHQoYXN0LCBjb250ZXh0KTtcclxuXHJcbiAgICAgICAgaWYgKGV4cC5pc09mS2luZChLaW5kcy5GTE9BVDQpKVxyXG4gICAgICAgICAgICByZXR1cm4gYXN0O1xyXG5cclxuICAgICAgICBpZiAoZXhwLmlzT2ZLaW5kKEtpbmRzLkZMT0FUMykpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgICAgIHR5cGU6IFN5bnRheC5DYWxsRXhwcmVzc2lvbixcclxuICAgICAgICAgICAgICAgIGNhbGxlZToge1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IFN5bnRheC5JZGVudGlmaWVyLFxyXG4gICAgICAgICAgICAgICAgICAgIG5hbWU6IFwidmVjNFwiXHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgYXJndW1lbnRzOiBbYXN0LCB7IHR5cGU6IFN5bnRheC5MaXRlcmFsLCB2YWx1ZTogMS4wLCBleHRyYTogeyB0eXBlOiBUeXBlcy5OVU1CRVJ9IH1dXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgU2hhZGUudGhyb3dFcnJvcihhc3QsIFwiQ2FuJ3QgY2FzdCBmcm9tICdcIiArIGV4cC5nZXRUeXBlU3RyaW5nKCkgKyBcIicgdG8gdmVjNFwiKTtcclxuICAgIH1cclxuXHJcbiAgICB2YXIgaGFuZGxlTW9kdWxvID0gZnVuY3Rpb24gKGJpbmFyeUV4cHJlc3Npb24pIHtcclxuICAgICAgICBiaW5hcnlFeHByZXNzaW9uLnJpZ2h0ID0gVG9vbHMuY2FzdFRvRmxvYXQoYmluYXJ5RXhwcmVzc2lvbi5yaWdodCk7XHJcbiAgICAgICAgYmluYXJ5RXhwcmVzc2lvbi5sZWZ0ID0gVG9vbHMuY2FzdFRvRmxvYXQoYmluYXJ5RXhwcmVzc2lvbi5sZWZ0KTtcclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICB0eXBlOiBTeW50YXguQ2FsbEV4cHJlc3Npb24sXHJcbiAgICAgICAgICAgIGNhbGxlZToge1xyXG4gICAgICAgICAgICAgICAgdHlwZTogU3ludGF4LklkZW50aWZpZXIsXHJcbiAgICAgICAgICAgICAgICBuYW1lOiBcIm1vZFwiXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIGFyZ3VtZW50czogW1xyXG4gICAgICAgICAgICAgICAgYmluYXJ5RXhwcmVzc2lvbi5sZWZ0LFxyXG4gICAgICAgICAgICAgICAgYmluYXJ5RXhwcmVzc2lvbi5yaWdodFxyXG4gICAgICAgICAgICBdLFxyXG4gICAgICAgICAgICBleHRyYToge1xyXG4gICAgICAgICAgICAgICAgdHlwZTogVHlwZXMuTlVNQkVSXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgdmFyIGhhbmRsZUNvbmRpdGlvbmFsRXhwcmVzc2lvbiA9IGZ1bmN0aW9uKG5vZGUsIHN0YXRlLCByb290KSB7XHJcbiAgICAgICAgdmFyIGNvbnNlcXVlbnQgPSBBTk5PKG5vZGUuY29uc2VxdWVudCk7XHJcbiAgICAgICAgdmFyIGFsdGVybmF0ZSA9IEFOTk8obm9kZS5hbHRlcm5hdGUpO1xyXG4gICAgICAgIGlmIChjb25zZXF1ZW50LmNhbkVsaW1pbmF0ZSgpKSB7XHJcbiAgICAgICAgICAgIHJldHVybiByb290LnJlcGxhY2Uobm9kZS5hbHRlcm5hdGUsIHN0YXRlKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKGFsdGVybmF0ZS5jYW5FbGltaW5hdGUoKSkge1xyXG4gICAgICAgICAgICByZXR1cm4gcm9vdC5yZXBsYWNlKG5vZGUuY29uc2VxdWVudCwgc3RhdGUpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICB9XHJcblxyXG4gICAgdmFyIGhhbmRsZUlmU3RhdGVtZW50ID0gZnVuY3Rpb24gKG5vZGUpIHtcclxuICAgICAgICB2YXIgY29uc2VxdWVudCA9IEFOTk8obm9kZS5jb25zZXF1ZW50KTtcclxuICAgICAgICB2YXIgYWx0ZXJuYXRlID0gbm9kZS5hbHRlcm5hdGUgPyBBTk5PKG5vZGUuYWx0ZXJuYXRlKSA6IG51bGw7XHJcbiAgICAgICAgaWYgKGNvbnNlcXVlbnQuY2FuRWxpbWluYXRlKCkpIHtcclxuICAgICAgICAgICAgaWYgKGFsdGVybmF0ZSkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIG5vZGUuYWx0ZXJuYXRlO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgICAgICB0eXBlOiBTeW50YXguRW1wdHlTdGF0ZW1lbnRcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0gZWxzZSBpZiAoYWx0ZXJuYXRlICYmIGFsdGVybmF0ZS5jYW5FbGltaW5hdGUoKSkge1xyXG4gICAgICAgICAgICByZXR1cm4gbm9kZS5jb25zZXF1ZW50O1xyXG4gICAgICAgIH1cclxuICAgICAgICAvLyBXZSBzdGlsbCBoYXZlIGEgcmVhbCBpZiBzdGF0ZW1lbnRcclxuICAgICAgIHZhciB0ZXN0ID0gQU5OTyhub2RlLnRlc3QpO1xyXG4gICAgICAgc3dpdGNoKHRlc3QuZ2V0VHlwZSgpKSB7XHJcbiAgICAgICAgICAgY2FzZSBUeXBlcy5JTlQ6XHJcbiAgICAgICAgICAgY2FzZSBUeXBlcy5OVU1CRVI6XHJcbiAgICAgICAgICAgICAgIG5vZGUudGVzdCA9IHtcclxuICAgICAgICAgICAgICAgICAgIHR5cGU6IFN5bnRheC5CaW5hcnlFeHByZXNzaW9uLFxyXG4gICAgICAgICAgICAgICAgICAgb3BlcmF0b3I6IFwiIT1cIixcclxuICAgICAgICAgICAgICAgICAgIGxlZnQ6IG5vZGUudGVzdCxcclxuICAgICAgICAgICAgICAgICAgIHJpZ2h0OiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogU3ludGF4LkxpdGVyYWwsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6IDAsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgZXh0cmE6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogdGVzdC5nZXRUeXBlKClcclxuICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgIH1cclxuICAgICAgIH1cclxuXHJcblxyXG4gICAgfTtcclxuXHJcbiAgICB2YXIgaGFuZGxlRW50ZXJMb2dpY2FsRXhwcmVzc2lvbiA9IGZ1bmN0aW9uIChub2RlLCByb290LCBzdGF0ZSkge1xyXG4gICAgICAgIHZhciBsZWZ0ID0gQU5OTyhub2RlLmxlZnQpO1xyXG4gICAgICAgIHZhciByaWdodCA9IEFOTk8obm9kZS5yaWdodCk7XHJcbiAgICAgICAgaWYgKGxlZnQuY2FuRWxpbWluYXRlKCkpXHJcbiAgICAgICAgICAgIHJldHVybiByb290LnJlcGxhY2Uobm9kZS5yaWdodCwgc3RhdGUpO1xyXG4gICAgICAgIGlmIChyaWdodC5jYW5FbGltaW5hdGUoKSlcclxuICAgICAgICAgICAgcmV0dXJuIHJvb3QucmVwbGFjZShub2RlLmxlZnQsIHN0YXRlKTtcclxuICAgIH1cclxuXHJcbiAgICB2YXIgaGFuZGxlRXhpdExvZ2ljYWxFeHByZXNzaW9uID0gZnVuY3Rpb24obm9kZSwgcm9vdCwgc3RhdGUpIHtcclxuICAgICAgICB2YXIgbGVmdCA9IEFOTk8obm9kZS5sZWZ0KTtcclxuICAgICAgICB2YXIgcmlnaHQgPSBBTk5PKG5vZGUucmlnaHQpO1xyXG4gICAgICAgIC8vIE5vdyB3ZSBoYXZlIHRvIGltcGxlbWVudCB0aGUgSlMgYm9vbGVhbiBzZW1hbnRpYyBmb3IgR0xTTFxyXG4gICAgICAgIGlmIChsZWZ0LmNhbk51bWJlcigpKSB7XHJcbiAgICAgICAgICAgIHZhciB0ZXN0ID0gIG5vZGUubGVmdDtcclxuICAgICAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgICAgIHR5cGU6IFN5bnRheC5Db25kaXRpb25hbEV4cHJlc3Npb24sXHJcbiAgICAgICAgICAgICAgICB0ZXN0OiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogU3ludGF4LkJpbmFyeUV4cHJlc3Npb24sXHJcbiAgICAgICAgICAgICAgICAgICAgb3BlcmF0b3I6IFwiPT1cIixcclxuICAgICAgICAgICAgICAgICAgICBsZWZ0OiB0ZXN0LFxyXG4gICAgICAgICAgICAgICAgICAgIHJpZ2h0OiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6IFN5bnRheC5MaXRlcmFsLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZTogbGVmdC5pc051bWJlcigpID8gMC4wIDogbGVmdC5pc0ludCgpID8gMCA6IFwiZmFsc2VcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgZXh0cmE6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGUgOiBsZWZ0LmdldFR5cGUoKSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0YXRpY1ZhbHVlOiBsZWZ0LmlzTnVtYmVyKCkgPyAwLjAgOiBsZWZ0LmlzSW50KCkgPyAwIDogXCJmYWxzZVwiXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIGV4dHJhOiB7IHR5cGU6IFR5cGVzLkJPT0xFQU4gfVxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgIGNvbnNlcXVlbnQ6IG5vZGUucmlnaHQsXHJcbiAgICAgICAgICAgICAgICBhbHRlcm5hdGU6IHRlc3RcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcblxyXG4gICAgLy8gRXhwb3J0c1xyXG4gICAgbnMuR0xBU1RUcmFuc2Zvcm1lciA9IEdMQVNUVHJhbnNmb3JtZXI7XHJcblxyXG5cclxufShleHBvcnRzKSk7XHJcbiIsIihmdW5jdGlvbiAobnMpIHtcclxuICAgIHZhciBCYXNlID0gcmVxdWlyZShcIi4vYmFzZS9pbmRleC5qc1wiKTtcclxuICAgIC8qKlxyXG4gICAgICogQGVudW0ge3N0cmluZ31cclxuICAgICAqL1xyXG4gICAgbnMuVFlQRVMgPSB7XHJcbiAgICAgICAgQU5ZOiBcImFueVwiLFxyXG4gICAgICAgIElOVDogXCJpbnRcIixcclxuICAgICAgICBOVU1CRVI6IFwibnVtYmVyXCIsXHJcbiAgICAgICAgQk9PTEVBTjogXCJib29sZWFuXCIsXHJcbiAgICAgICAgT0JKRUNUOiBcIm9iamVjdFwiLFxyXG4gICAgICAgIEFSUkFZOiBcImFycmF5XCIsXHJcbiAgICAgICAgTlVMTDogXCJudWxsXCIsXHJcbiAgICAgICAgVU5ERUZJTkVEOiBcInVuZGVmaW5lZFwiLFxyXG4gICAgICAgIEZVTkNUSU9OOiBcImZ1bmN0aW9uXCIsXHJcbiAgICAgICAgU1RSSU5HOiBcInN0cmluZ1wiXHJcbiAgICB9XHJcblxyXG4gICAgbnMuT0JKRUNUX0tJTkRTID0ge1xyXG4gICAgICAgIEFOWTogXCJhbnlcIixcclxuICAgICAgICBGTE9BVDI6IFwiZmxvYXQyXCIsIC8vIHZpcnR1YWwga2luZHNcclxuICAgICAgICBGTE9BVDM6IFwiZmxvYXQzXCIsIC8vIHZpcnR1YWwga2luZHNcclxuICAgICAgICBGTE9BVDQ6IFwiZmxvYXQ0XCIsIC8vIHZpcnR1YWwga2luZHNcclxuICAgICAgICBOT1JNQUw6IFwibm9ybWFsXCIsXHJcbiAgICAgICAgTUFUUklYMzogXCJtYXRyaXgzXCIsXHJcbiAgICAgICAgTUFUUklYNDogXCJtYXRyaXg0XCIsXHJcbiAgICAgICAgVEVYVFVSRTogXCJ0ZXh0dXJlXCIsXHJcbiAgICAgICAgQ09MT1JfQ0xPU1VSRTogXCJjb2xvcl9jbG9zdXJlXCJcclxuICAgIH1cclxuXHJcbiAgICBucy5TT1VSQ0VTID0ge1xyXG4gICAgICAgIFVOSUZPUk06IFwidW5pZm9ybVwiLFxyXG4gICAgICAgIFZFUlRFWDogXCJ2ZXJ0ZXhcIixcclxuICAgICAgICBDT05TVEFOVDogXCJjb25zdGFudFwiXHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gY29uc3RydWN0RnJvbU1hdHJpeChkZXN0LCBtYXRTaXplLCBhcmdzKXtcclxuICAgICAgICBpZihhcmdzLmxlbmd0aCA+IDEpe1xyXG4gICAgICAgICAgICBmb3IodmFyIGkgPSAwOyBpIDwgYXJncy5sZW5ndGg7ICsraSl7XHJcbiAgICAgICAgICAgICAgICBpZihhcmdzW2ldIGluc3RhbmNlb2YgTWF0MyB8fCBhcmdzW2ldIGluc3RhbmNlb2YgTWF0NClcclxuICAgICAgICAgICAgICAgICAgICB0aHJvdyBcIkNvbnN0cnVjdGluZyBNYXRyaXggZnJvbSBNYXRyaXggY2FuIG9ubHkgdGFrZSBvbmUgYXJndW1lbnRcIjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICBpZihhcmdzLmxlbmd0aCA8IDEpXHJcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgICBpZihhcmdzLmxlbmd0aCA9PSAxKXtcclxuICAgICAgICAgICAgdmFyIHNyY01hdCA9IGFyZ3NbMF07XHJcbiAgICAgICAgICAgIHZhciBzcmNTaXplID0gMDtcclxuXHJcbiAgICAgICAgICAgIGlmKHNyY01hdCBpbnN0YW5jZW9mIE1hdDMpIHNyY1NpemUgPSAzO1xyXG4gICAgICAgICAgICBlbHNlIGlmKHNyY01hdCBpbnN0YW5jZW9mIE1hdDQpIHNyY1NpemUgPSA0O1xyXG4gICAgICAgICAgICBlbHNlIHJldHVybiBmYWxzZTtcclxuXHJcbiAgICAgICAgICAgIGZvcih2YXIgeSA9IDA7IHkgPCBtYXRTaXplOyB5KyspXHJcbiAgICAgICAgICAgICAgICBmb3IodmFyIHggPSAwOyB4IDwgbWF0U2l6ZTsgeCsrKXtcclxuICAgICAgICAgICAgICAgICAgICB2YXIgZGVzdElkeCA9IHkqbWF0U2l6ZSArIHg7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYoeCA8IHNyY1NpemUgJiYgeSA8IHNyY1NpemUpe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgc3JjSWR4ID0geSpzcmNTaXplICsgeDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZGVzdFtkZXN0SWR4XSA9IHNyY01hdFtzcmNJZHhdO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBlbHNlIGRlc3RbZGVzdElkeF0gPSB4ID09IHkgPyAxIDogMDtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgfVxyXG5cclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBmaWxsVmVjdG9yKGRlc3QsIHZlY1NpemUsIGFyZ3VtZW50cyl7XHJcbiAgICAgICAgdmFyIGNvbG9yID0gZmFsc2U7XHJcbiAgICAgICAgaWYoYXJndW1lbnRzLmxlbmd0aCA9PSAwICl7XHJcbiAgICAgICAgICAgIGZvcih2YXIgaSA9IDA7IGkgPCB2ZWNTaXplOyArK2kpXHJcbiAgICAgICAgICAgICAgICBkZXN0W2ldID0gMDtcclxuICAgICAgICAgICAgaWYoY29sb3IpIGRlc3RbM10gPSAxO1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmKGFyZ3VtZW50cy5sZW5ndGggPT0gMSAmJiAhaXNOYU4oYXJndW1lbnRzWzBdKSl7XHJcbiAgICAgICAgICAgIGZvcih2YXIgaSA9IDA7IGkgPCB2ZWNTaXplOyArK2kpXHJcbiAgICAgICAgICAgICAgICBkZXN0W2ldID0gYXJndW1lbnRzWzBdO1xyXG4gICAgICAgICAgICBpZihjb2xvcikgZGVzdFszXSA9IDE7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHZhciBpZHggPSAwO1xyXG4gICAgICAgIGZvcih2YXIgaSA9IDA7IGlkeCA8IHZlY1NpemUgJiYgaSA8IGFyZ3VtZW50cy5sZW5ndGg7ICsraSl7XHJcbiAgICAgICAgICAgIHZhciBhcmc9IGFyZ3VtZW50c1tpXSwgY250ID0gMTtcclxuICAgICAgICAgICAgaWYoYXJnIGluc3RhbmNlb2YgVmVjMikgY250ID0gMjtcclxuICAgICAgICAgICAgZWxzZSBpZihhcmcgaW5zdGFuY2VvZiBWZWMzKSBjbnQgPSAzO1xyXG4gICAgICAgICAgICBlbHNlIGlmKGFyZyBpbnN0YW5jZW9mIFZlYzQpIGNudCA9IDQ7XHJcbiAgICAgICAgICAgIGVsc2UgaWYoYXJnIGluc3RhbmNlb2YgTWF0MykgY250ID0gOTtcclxuICAgICAgICAgICAgZWxzZSBpZihhcmcgaW5zdGFuY2VvZiBNYXQ0KSBjbnQgPSAxNjtcclxuXHJcbiAgICAgICAgICAgIGlmKGNudCA9PSAxKVxyXG4gICAgICAgICAgICAgICAgZGVzdFtpZHgrK10gPSBhcmcgfHwgMDtcclxuICAgICAgICAgICAgZWxzZVxyXG4gICAgICAgICAgICAgICAgZm9yKHZhciBqID0gMDsgaWR4IDwgdmVjU2l6ZSAmJiBqIDwgY250OyArK2ope1xyXG4gICAgICAgICAgICAgICAgICAgIGRlc3RbaWR4KytdID0gYXJnW2pdO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICBpZihpIDwgYXJndW1lbnRzLmxlbmd0aClcclxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiVG9vIG1hbnkgYXJndW1lbnRzIGZvciBcIiArIChjb2xvciA/IFwiQ29sb3JcIiA6IFwiVmVjXCIgKyB2ZWNTaXplKSArIFwiLlwiKTtcclxuICAgICAgICBpZihpZHggPCB2ZWNTaXplKXtcclxuICAgICAgICAgICAgaWYoY29sb3IgJiYgKGlkeCA9PSAzKSlcclxuICAgICAgICAgICAgICAgIGRlc3RbM10gPSAxO1xyXG4gICAgICAgICAgICBlbHNlXHJcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJOb3QgZW5vdWdoIGFyZ3VtZW50cyBmb3IgXCIgKyAoY29sb3IgPyBcIkNvbG9yXCIgOiBcIlZlY1wiICsgdmVjU2l6ZSkgKyBcIi5cIik7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuXHJcbiAgICAvLyBUT0RPOiBHZW5lcmF0ZSBTd2l6emxlIGZ1bmN0aW9uc1xyXG4gICAgdmFyIFNXSVpaTEVfS0VZUyA9IFtcclxuICAgICAgICBbJ3gnLCd5JywneicsJ3cnXSxcclxuICAgICAgICBbJ3InLCAnZycsICdiJywgJ2EnXSxcclxuICAgICAgICBbJ3MnLCAndCcsICdwJywgJ3EnXVxyXG4gICAgXVxyXG5cclxuICAgIGZ1bmN0aW9uIGFkZFN3aXp6bGVzKHByb3RvdHlwZSwgdmVjQ291bnQsIG1hc2tDb3VudCwgd2l0aFNldHRlcil7XHJcbiAgICAgICAgdmFyIG1heCA9IE1hdGgucG93KHZlY0NvdW50LCBtYXNrQ291bnQpO1xyXG4gICAgICAgIGZvcih2YXIgaSA9IDA7IGkgPCBtYXg7ICsraSl7XHJcbiAgICAgICAgICAgIHZhciBpbmRpY2VzID0gW10sIGtleXMgPSBbXCJcIiwgXCJcIiwgXCJcIl0sIHZhbCA9IGksIGFyZ3MgPSBbXTtcclxuICAgICAgICAgICAgdmFyIHNldHRlckFyZ3MgPSBbXSwgZ2VuZXJhdGVTZXR0ZXIgPSB3aXRoU2V0dGVyO1xyXG4gICAgICAgICAgICBmb3IodmFyIGogPSAwOyBqIDwgbWFza0NvdW50OyArK2ope1xyXG4gICAgICAgICAgICAgICAgdmFyIGlkeCA9IHZhbCAlIHZlY0NvdW50O1xyXG4gICAgICAgICAgICAgICAgaW5kaWNlcy5wdXNoKGlkeCk7XHJcbiAgICAgICAgICAgICAgICBpZihnZW5lcmF0ZVNldHRlcil7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYoc2V0dGVyQXJnc1tpZHhdID09PSB1bmRlZmluZWQpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNldHRlckFyZ3NbaWR4XSA9ICdvdGhlclsnICsgaiArICddJztcclxuICAgICAgICAgICAgICAgICAgICBlbHNlXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGdlbmVyYXRlU2V0dGVyID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBmb3IodmFyIGsgPSAwOyBrIDwgU1dJWlpMRV9LRVlTLmxlbmd0aDsgKytrKXtcclxuICAgICAgICAgICAgICAgICAgICBrZXlzW2tdICs9IFNXSVpaTEVfS0VZU1trXVtpZHhdO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgdmFsID0gTWF0aC5mbG9vcih2YWwgLyB2ZWNDb3VudCk7XHJcbiAgICAgICAgICAgICAgICBhcmdzLnB1c2goJ3RoaXNbJysgaWR4ICsgJ10nICk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHZhciBmdW5jQXJncyA9IFwiXCI7XHJcbiAgICAgICAgICAgIHZhciBib2R5ID0gJyAgcmV0dXJuIGdldFZlYycgKyBtYXNrQ291bnQgKyAnLmFwcGx5KG51bGwsIGFyZ3VtZW50cyk7XFxuJztcclxuICAgICAgICAgICAgaWYoZ2VuZXJhdGVTZXR0ZXIpe1xyXG4gICAgICAgICAgICAgICAgZm9yKHZhciBqID0gMDsgaiA8IHZlY0NvdW50OyArK2ope1xyXG4gICAgICAgICAgICAgICAgICAgIGlmKHNldHRlckFyZ3Nbal0gPT09IHVuZGVmaW5lZClcclxuICAgICAgICAgICAgICAgICAgICAgICAgc2V0dGVyQXJnc1tqXSA9ICd0aGlzWycgKyBqICsgJ10nO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgc3dpdGNoKG1hc2tDb3VudCl7XHJcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAyIDogZnVuY0FyZ3MgPSBcIngsIHlcIjsgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAzIDogZnVuY0FyZ3MgPSBcIngsIHksIHpcIjsgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgY2FzZSA0IDogZnVuY0FyZ3MgPSBcIngsIHksIHosIHdcIjsgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgYm9keSA9IFwiICBpZihhcmd1bWVudHMubGVuZ3RoID09IDApXFxuICBcIiArIGJvZHkgK1xyXG4gICAgICAgICAgICAgICAgICAgICAgIFwiICBlbHNle1xcblwiICtcclxuICAgICAgICAgICAgICAgICAgICAgICBcIiAgICB2YXIgb3RoZXI9Z2V0VmVjXCIgKyBtYXNrQ291bnQgKyAnLmFwcGx5KG51bGwsIGFyZ3VtZW50cyk7XFxuJyArXHJcbiAgICAgICAgICAgICAgICAgICAgICAgXCIgICAgcmV0dXJuIGdldFZlY1wiICsgdmVjQ291bnQgKyAnKCcgKyBzZXR0ZXJBcmdzLmpvaW4oXCIsIFwiKSArICcpO1xcbicgK1xyXG4gICAgICAgICAgICAgICAgICAgICAgIFwiICB9XFxuXCI7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgdmFyIGZ1bmN0aW9uQ29kZSA9ICdmdW5jdGlvbignICsgZnVuY0FyZ3MgKyAgJyl7XFxuJyArIGJvZHkgKyAnfSc7XHJcbiAgICAgICAgICAgIHRyeXtcclxuICAgICAgICAgICAgICAgIHZhciByZXN1bHQgPSBldmFsKFwiKFwiICsgZnVuY3Rpb25Db2RlICsgXCIpXCIpO1xyXG4gICAgICAgICAgICAgICAgZm9yKHZhciBqID0gMDsgaiA8IGtleXMubGVuZ3RoOyArK2opXHJcbiAgICAgICAgICAgICAgICAgICAgcHJvdG90eXBlW2tleXNbal1dID0gcmVzdWx0O1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGNhdGNoKGUpe1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihcIkVycm9yIENvbXBpbGluZyBDb2RlOlxcblwiICsgZnVuY3Rpb25Db2RlKTtcclxuICAgICAgICAgICAgICAgIHRocm93IGU7XHJcblxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuXHJcbiAgICAvKipcclxuICAgICogVGhlIHZpcnR1YWwgVmVjMiB0eXBlXHJcbiAgICAqIEBjb25zdHJ1Y3RvclxyXG4gICAgKi9cclxuICAgIHZhciBWZWMyID0gZnVuY3Rpb24oeCwgeSkge1xyXG4gICAgICAgIGZpbGxWZWN0b3IodGhpcywgMiwgYXJndW1lbnRzKTtcclxuICAgIH1cclxuXHJcblxyXG4gICAgZnVuY3Rpb24gZ2V0VmVjMigpIHtcclxuICAgICAgICBpZihhcmd1bWVudHNbMF0gaW5zdGFuY2VvZiBWZWMyKVxyXG4gICAgICAgICAgICByZXR1cm4gYXJndW1lbnRzWzBdO1xyXG4gICAgICAgIHZhciBvYmogPSBuZXcgVmVjMigpO1xyXG4gICAgICAgIFZlYzIuYXBwbHkob2JqLCBhcmd1bWVudHMpO1xyXG4gICAgICAgIHJldHVybiBvYmo7XHJcbiAgICB9XHJcblxyXG4gICAgVmVjMi5wcm90b3R5cGUuYWRkID0gZnVuY3Rpb24oeCwgeSkgeyAvLyAwIGFyZ3VtZW50cyA9PiBpZGVudGl0eSBvciBlcnJvcj9cclxuICAgICAgICB2YXIgYWRkID0gZ2V0VmVjMi5hcHBseShudWxsLCBhcmd1bWVudHMpO1xyXG4gICAgICAgIHJldHVybiBuZXcgVmVjMih0aGlzWzBdICsgYWRkWzBdLCB0aGlzWzFdICsgYWRkWzFdKTtcclxuICAgIH1cclxuICAgIFZlYzIucHJvdG90eXBlLnN1YiA9IGZ1bmN0aW9uKHgsIHkpIHtcclxuICAgICAgICB2YXIgc3ViID0gZ2V0VmVjMi5hcHBseShudWxsLCBhcmd1bWVudHMpO1xyXG4gICAgICAgIHJldHVybiBuZXcgVmVjMih0aGlzWzBdIC0gc3ViWzBdLCB0aGlzWzFdIC0gc3ViWzFdKTtcclxuICAgIH1cclxuICAgIFZlYzIucHJvdG90eXBlLm11bCA9IGZ1bmN0aW9uKHgsIHkpIHtcclxuICAgICAgICB2YXIgb3RoZXIgPSBnZXRWZWMyLmFwcGx5KG51bGwsIGFyZ3VtZW50cyk7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBWZWMyKHRoaXNbMF0gKiBvdGhlclswXSwgdGhpc1sxXSAqIG90aGVyWzFdKTtcclxuICAgIH1cclxuICAgIFZlYzIucHJvdG90eXBlLmRpdiA9IGZ1bmN0aW9uKHgsIHkpIHtcclxuICAgICAgICB2YXIgb3RoZXIgPSBnZXRWZWMyLmFwcGx5KG51bGwsIGFyZ3VtZW50cyk7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBWZWMyKHRoaXNbMF0gLyBvdGhlclswXSwgdGhpc1sxXSAvIG90aGVyWzFdKTtcclxuICAgIH1cclxuICAgIFZlYzIucHJvdG90eXBlLm1vZCA9IGZ1bmN0aW9uKHgsIHkpIHtcclxuICAgICAgICB2YXIgb3RoZXIgPSBnZXRWZWMyLmFwcGx5KG51bGwsIGFyZ3VtZW50cyk7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBWZWMyKHRoaXNbMF0gJSBvdGhlclswXSwgdGhpc1sxXSAlIG90aGVyWzFdKTtcclxuICAgIH1cclxuICAgIFZlYzIucHJvdG90eXBlLmRvdCA9IGZ1bmN0aW9uKHgsIHkpIHtcclxuICAgICAgICB2YXIgb3RoZXIgPSBnZXRWZWMyLmFwcGx5KG51bGwsIGFyZ3VtZW50cyk7XHJcbiAgICAgICAgcmV0dXJuIHRoaXNbMF0gKiBvdGhlclswXSArIHRoaXNbMV0gKiBvdGhlclsxXTtcclxuICAgIH1cclxuICAgIFZlYzIucHJvdG90eXBlLmFicyA9IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgIHJldHVybiBuZXcgVmVjMihNYXRoLmFicyh0aGlzWzBdKSwgTWF0aC5hYnModGhpc1sxXSkpO1xyXG4gICAgfVxyXG4gICAgVmVjMi5wcm90b3R5cGUubGVuZ3RoID0gZnVuY3Rpb24obGVuZ3RoKSB7XHJcbiAgICAgICAgaWYoYXJndW1lbnRzLmxlbmd0aCA9PSAwKVxyXG4gICAgICAgICAgICByZXR1cm4gTWF0aC5zcXJ0KHRoaXMuZG90KHRoaXMpKTtcclxuICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMubXVsKGxlbmd0aCAvIHRoaXMubGVuZ3RoKCkpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIFZlYzIucHJvdG90eXBlLm5vcm1hbGl6ZSA9IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgIHJldHVybiB0aGlzLmxlbmd0aCgxKTtcclxuICAgIH1cclxuXHJcbiAgICBWZWMyLnByb3RvdHlwZS54eSA9IFZlYzIucHJvdG90eXBlLnJnID0gVmVjMi5wcm90b3R5cGUuc3QgPSBmdW5jdGlvbih4LCB5KSB7XHJcbiAgICAgICAgaWYoYXJndW1lbnRzLmxlbmd0aCA9PSAwKVxyXG4gICAgICAgICAgICByZXR1cm4gdGhpcztcclxuICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgcmV0dXJuIGdldFZlYzIuYXBwbHkobnVsbCwgYXJndW1lbnRzKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICBWZWMyLnByb3RvdHlwZS54ID0gVmVjMi5wcm90b3R5cGUuciA9IFZlYzIucHJvdG90eXBlLnMgPSBmdW5jdGlvbih4KSB7XHJcbiAgICAgICAgaWYoYXJndW1lbnRzLmxlbmd0aCA9PSAwKVxyXG4gICAgICAgICAgICByZXR1cm4gdGhpc1swXTtcclxuICAgICAgICBlbHNlXHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnh5KHgsIHRoaXNbMV0pO1xyXG4gICAgfVxyXG4gICAgVmVjMi5wcm90b3R5cGUueSA9IFZlYzIucHJvdG90eXBlLmcgPSBWZWMyLnByb3RvdHlwZS50ID0gZnVuY3Rpb24oeSkge1xyXG4gICAgICAgIGlmKGFyZ3VtZW50cy5sZW5ndGggPT0gMClcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXNbMV07XHJcbiAgICAgICAgZWxzZVxyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy54eSh0aGlzWzBdLCB5KTtcclxuICAgIH1cclxuXHJcbiAgICBhZGRTd2l6emxlcyhWZWMyLnByb3RvdHlwZSwgMiwgMiwgdHJ1ZSk7XHJcbiAgICBhZGRTd2l6emxlcyhWZWMyLnByb3RvdHlwZSwgMiwgMywgZmFsc2UpO1xyXG4gICAgYWRkU3dpenpsZXMoVmVjMi5wcm90b3R5cGUsIDIsIDQsIGZhbHNlKTtcclxuXHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBUaGUgdmlydHVhbCBWZWMzIHR5cGVcclxuICAgICAqIEBjb25zdHJ1Y3RvclxyXG4gICAgICovXHJcbiAgICB2YXIgVmVjMyA9IGZ1bmN0aW9uKHgsIHksIHopIHtcclxuICAgICAgICBmaWxsVmVjdG9yKHRoaXMsIDMsIGFyZ3VtZW50cyk7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gZ2V0VmVjMygpIHtcclxuICAgICAgICBpZihhcmd1bWVudHNbMF0gaW5zdGFuY2VvZiBWZWMzKVxyXG4gICAgICAgICAgICByZXR1cm4gYXJndW1lbnRzWzBdO1xyXG4gICAgICAgIHZhciBvYmogPSBuZXcgVmVjMygpO1xyXG4gICAgICAgIFZlYzMuYXBwbHkob2JqLCBhcmd1bWVudHMpO1xyXG4gICAgICAgIHJldHVybiBvYmo7XHJcbiAgICB9XHJcblxyXG4gICAgVmVjMy5wcm90b3R5cGUuYWRkID0gZnVuY3Rpb24oeCwgeSwgeikge1xyXG4gICAgICAgIHZhciBvdGhlciA9IGdldFZlYzMuYXBwbHkobnVsbCwgYXJndW1lbnRzKTtcclxuICAgICAgICByZXR1cm4gbmV3IFZlYzModGhpc1swXSArIG90aGVyWzBdLCB0aGlzWzFdICsgb3RoZXJbMV0sIHRoaXNbMl0gKyBvdGhlclsyXSk7XHJcbiAgICB9XHJcbiAgICBWZWMzLnByb3RvdHlwZS5zdWIgPSBmdW5jdGlvbih4LCB5LCB6KSB7XHJcbiAgICAgICAgdmFyIG90aGVyID0gZ2V0VmVjMy5hcHBseShudWxsLCBhcmd1bWVudHMpO1xyXG4gICAgICAgIHJldHVybiBuZXcgVmVjMyh0aGlzWzBdIC0gb3RoZXJbMF0sIHRoaXNbMV0gLSBvdGhlclsxXSwgdGhpc1syXSAtIG90aGVyWzJdKTtcclxuICAgIH1cclxuICAgIFZlYzMucHJvdG90eXBlLm11bCA9IGZ1bmN0aW9uKHgsIHksIHopIHtcclxuICAgICAgICB2YXIgb3RoZXIgPSBnZXRWZWMzLmFwcGx5KG51bGwsIGFyZ3VtZW50cyk7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBWZWMzKHRoaXNbMF0gKiBvdGhlclswXSwgdGhpc1sxXSAqIG90aGVyWzFdLCB0aGlzWzJdICogb3RoZXJbMl0pO1xyXG4gICAgfVxyXG4gICAgVmVjMy5wcm90b3R5cGUuZGl2ID0gZnVuY3Rpb24oeCwgeSwgeikge1xyXG4gICAgICAgIHZhciBvdGhlciA9IGdldFZlYzMuYXBwbHkobnVsbCwgYXJndW1lbnRzKTtcclxuICAgICAgICByZXR1cm4gbmV3IFZlYzModGhpc1swXSAvIG90aGVyWzBdLCB0aGlzWzFdIC8gb3RoZXJbMV0sIHRoaXNbMl0gLyBvdGhlclsyXSk7XHJcbiAgICB9XHJcbiAgICBWZWMzLnByb3RvdHlwZS5tb2QgPSBmdW5jdGlvbih4LCB5LCB6KSB7XHJcbiAgICAgICAgdmFyIG90aGVyID0gZ2V0VmVjMy5hcHBseShudWxsLCBhcmd1bWVudHMpO1xyXG4gICAgICAgIHJldHVybiBuZXcgVmVjMyh0aGlzWzBdICUgb3RoZXJbMF0sIHRoaXNbMV0gJSBvdGhlclsxXSwgdGhpc1syXSAlIG90aGVyWzJdKTtcclxuICAgIH1cclxuICAgIFZlYzMucHJvdG90eXBlLmFicyA9IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgIHJldHVybiBuZXcgVmVjMyhNYXRoLmFicyh0aGlzWzBdKSwgTWF0aC5hYnModGhpc1sxXSksIE1hdGguYWJzKHRoaXNbMl0pKTtcclxuICAgIH1cclxuICAgIFZlYzMucHJvdG90eXBlLmRvdCA9IGZ1bmN0aW9uKHgsIHksIHopIHtcclxuICAgICAgICB2YXIgb3RoZXIgPSBnZXRWZWMzLmFwcGx5KG51bGwsIGFyZ3VtZW50cyk7XHJcbiAgICAgICAgcmV0dXJuIHRoaXNbMF0gKiBvdGhlclswXSArIHRoaXNbMV0gKiBvdGhlclsxXSArIHRoaXNbMl0gKiBvdGhlclsyXTtcclxuICAgIH1cclxuICAgIFZlYzMucHJvdG90eXBlLmNyb3NzID0gZnVuY3Rpb24oeCwgeSwgeikge1xyXG4gICAgICAgIHZhciBvdGhlciA9IGdldFZlYzMuYXBwbHkobnVsbCwgYXJndW1lbnRzKTtcclxuICAgICAgICB2YXIgeCA9IHRoaXNbMV0gKiBvdGhlclsyXSAtIG90aGVyWzFdICogdGhpc1syXTtcclxuICAgICAgICB2YXIgeSA9IHRoaXNbMl0gKiBvdGhlclswXSAtIG90aGVyWzJdICogdGhpc1swXTtcclxuICAgICAgICB2YXIgeiA9IHRoaXNbMF0gKiBvdGhlclsxXSAtIG90aGVyWzBdICogdGhpc1sxXTtcclxuICAgICAgICByZXR1cm4gbmV3IFZlYzMoeCwgeSwgeik7XHJcbiAgICB9XHJcbiAgICBWZWMzLnByb3RvdHlwZS5sZW5ndGggPSBmdW5jdGlvbihsZW5ndGgpIHtcclxuICAgICAgICBpZihhcmd1bWVudHMubGVuZ3RoID09IDApXHJcbiAgICAgICAgICAgIHJldHVybiBNYXRoLnNxcnQodGhpcy5kb3QodGhpcykpO1xyXG4gICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5tdWwobGVuZ3RoIC8gdGhpcy5sZW5ndGgoKSk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgVmVjMy5wcm90b3R5cGUubm9ybWFsaXplID0gZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMubGVuZ3RoKDEpO1xyXG4gICAgfVxyXG4gICAgVmVjMy5wcm90b3R5cGUueHl6ID0gVmVjMy5wcm90b3R5cGUucmdiID0gVmVjMy5wcm90b3R5cGUuc3RwID0gZnVuY3Rpb24oeCwgeSwgeikge1xyXG4gICAgICAgIGlmKGFyZ3VtZW50cy5sZW5ndGggPT0gMClcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICAgICAgZWxzZVxyXG4gICAgICAgICAgICByZXR1cm4gbmV3IFZlYzMoeCwgeSwgeik7XHJcbiAgICB9XHJcbiAgICBWZWMzLnByb3RvdHlwZS54ID0gVmVjMy5wcm90b3R5cGUuciA9IFZlYzMucHJvdG90eXBlLnMgPSBmdW5jdGlvbih4KSB7XHJcbiAgICAgICAgaWYoYXJndW1lbnRzLmxlbmd0aCA9PSAwKVxyXG4gICAgICAgICAgICByZXR1cm4gdGhpc1swXTtcclxuICAgICAgICBlbHNlXHJcbiAgICAgICAgICAgIHJldHVybiBuZXcgVmVjMyh4LCB0aGlzWzFdLCB0aGlzWzJdKTtcclxuICAgIH1cclxuICAgIFZlYzMucHJvdG90eXBlLnkgPSBWZWMzLnByb3RvdHlwZS5nID0gVmVjMy5wcm90b3R5cGUudCA9IGZ1bmN0aW9uKHkpIHtcclxuICAgICAgICBpZihhcmd1bWVudHMubGVuZ3RoID09IDApXHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzWzFdO1xyXG4gICAgICAgIGVsc2VcclxuICAgICAgICAgICAgcmV0dXJuIG5ldyBWZWMzKHRoaXNbMF0sIHksIHRoaXNbMl0pO1xyXG4gICAgfVxyXG4gICAgVmVjMy5wcm90b3R5cGUueiA9IFZlYzMucHJvdG90eXBlLmIgPSBWZWMzLnByb3RvdHlwZS5wID0gZnVuY3Rpb24oeikge1xyXG4gICAgICAgIGlmKGFyZ3VtZW50cy5sZW5ndGggPT0gMClcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXNbMl07XHJcbiAgICAgICAgZWxzZVxyXG4gICAgICAgICAgICByZXR1cm4gbmV3IFZlYzModGhpc1swXSwgdGhpc1sxXSwgeik7XHJcbiAgICB9XHJcbiAgICBhZGRTd2l6emxlcyhWZWMzLnByb3RvdHlwZSwgMywgMiwgdHJ1ZSk7XHJcbiAgICBhZGRTd2l6emxlcyhWZWMzLnByb3RvdHlwZSwgMywgMywgdHJ1ZSk7XHJcbiAgICBhZGRTd2l6emxlcyhWZWMzLnByb3RvdHlwZSwgMywgNCwgZmFsc2UpO1xyXG5cclxuXHJcbiAgICAvKipcclxuICAgICAqIFRoZSB2aXJ0dWFsIFZlYzQgdHlwZVxyXG4gICAgICogQGNvbnN0cnVjdG9yXHJcbiAgICAgKi9cclxuICAgIHZhciBWZWM0ID0gZnVuY3Rpb24oeCwgeSwgeiwgdykge1xyXG4gICAgICAgIGZpbGxWZWN0b3IodGhpcywgNCwgYXJndW1lbnRzKVxyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGdldFZlYzQoKSB7XHJcbiAgICAgICAgaWYoYXJndW1lbnRzWzBdIGluc3RhbmNlb2YgVmVjNClcclxuICAgICAgICAgICAgcmV0dXJuIGFyZ3VtZW50c1swXTtcclxuICAgICAgICB2YXIgb2JqID0gbmV3IFZlYzQoKTtcclxuICAgICAgICBWZWM0LmFwcGx5KG9iaiwgYXJndW1lbnRzKTtcclxuICAgICAgICByZXR1cm4gb2JqO1xyXG4gICAgfVxyXG5cclxuICAgIFZlYzQucHJvdG90eXBlLmFkZCA9IGZ1bmN0aW9uKHgsIHksIHosIHcpIHtcclxuICAgICAgICB2YXIgb3RoZXIgPSBnZXRWZWM0LmFwcGx5KG51bGwsIGFyZ3VtZW50cyk7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBWZWM0KHRoaXNbMF0gKyBvdGhlclswXSwgdGhpc1sxXSArIG90aGVyWzFdLCB0aGlzWzJdICsgb3RoZXJbMl0sIHRoaXNbM10gKyBvdGhlclszXSk7XHJcbiAgICB9XHJcbiAgICBWZWM0LnByb3RvdHlwZS5zdWIgPSBmdW5jdGlvbih4LCB5LCB6LCB3KSB7XHJcbiAgICAgICAgdmFyIG90aGVyID0gZ2V0VmVjNC5hcHBseShudWxsLCBhcmd1bWVudHMpO1xyXG4gICAgICAgIHJldHVybiBuZXcgVmVjNCh0aGlzWzBdIC0gb3RoZXJbMF0sIHRoaXNbMV0gLSBvdGhlclsxXSwgdGhpc1syXSAtIG90aGVyWzJdLCB0aGlzWzNdIC0gb3RoZXJbM10pO1xyXG4gICAgfVxyXG4gICAgVmVjNC5wcm90b3R5cGUubXVsID0gZnVuY3Rpb24oeCwgeSwgeiwgdykge1xyXG4gICAgICAgIHZhciBvdGhlciA9IGdldFZlYzQuYXBwbHkobnVsbCwgYXJndW1lbnRzKTtcclxuICAgICAgICByZXR1cm4gbmV3IFZlYzQodGhpc1swXSAqIG90aGVyWzBdLCB0aGlzWzFdICogb3RoZXJbMV0sIHRoaXNbMl0gKiBvdGhlclsyXSwgdGhpc1szXSAqIG90aGVyWzNdKTtcclxuICAgIH1cclxuICAgIFZlYzQucHJvdG90eXBlLmRpdiA9IGZ1bmN0aW9uKHgsIHksIHosIHcpIHtcclxuICAgICAgICB2YXIgb3RoZXIgPSBnZXRWZWM0LmFwcGx5KG51bGwsIGFyZ3VtZW50cyk7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBWZWM0KHRoaXNbMF0gLyBvdGhlclswXSwgdGhpc1sxXSAvIG90aGVyWzFdLCB0aGlzWzJdIC8gb3RoZXJbMl0sIHRoaXNbM10gLyBvdGhlclszXSk7XHJcbiAgICB9XHJcbiAgICBWZWM0LnByb3RvdHlwZS5tb2QgPSBmdW5jdGlvbih4LCB5LCB6LCB3KSB7XHJcbiAgICAgICAgdmFyIG90aGVyID0gZ2V0VmVjNC5hcHBseShudWxsLCBhcmd1bWVudHMpO1xyXG4gICAgICAgIHJldHVybiBuZXcgVmVjNCh0aGlzWzBdICUgb3RoZXJbMF0sIHRoaXNbMV0gJSBvdGhlclsxXSwgdGhpc1syXSAlIG90aGVyWzJdLCB0aGlzWzNdICUgb3RoZXJbM10pO1xyXG4gICAgfVxyXG4gICAgVmVjNC5wcm90b3R5cGUuYWJzID0gZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBWZWM0KE1hdGguYWJzKHRoaXNbMF0pLCBNYXRoLmFicyh0aGlzWzFdKSwgTWF0aC5hYnModGhpc1syXSksIE1hdGguYWJzKHRoaXNbM10pKTtcclxuICAgIH1cclxuICAgIFZlYzQucHJvdG90eXBlLmRvdCA9IGZ1bmN0aW9uKHgsIHksIHosIHcpIHtcclxuICAgICAgICB2YXIgb3RoZXIgPSBnZXRWZWM0LmFwcGx5KG51bGwsIGFyZ3VtZW50cyk7XHJcbiAgICAgICAgcmV0dXJuIHRoaXNbMF0gKiBvdGhlclswXSArIHRoaXNbMV0gKiBvdGhlclsxXSArIHRoaXNbMl0gKiBvdGhlclsyXSArIHRoaXNbM10gKiBvdGhlclszXTtcclxuICAgIH1cclxuICAgIFZlYzQucHJvdG90eXBlLmxlbmd0aCA9IGZ1bmN0aW9uKGxlbmd0aCkge1xyXG4gICAgICAgIGlmKGFyZ3VtZW50cy5sZW5ndGggPT0gMClcclxuICAgICAgICAgICAgcmV0dXJuIE1hdGguc3FydCh0aGlzLmRvdCh0aGlzKSk7XHJcbiAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLm11bChsZW5ndGggLyB0aGlzLmxlbmd0aCgpKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICBWZWM0LnByb3RvdHlwZS5ub3JtYWxpemUgPSBmdW5jdGlvbigpIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5sZW5ndGgoMSk7XHJcbiAgICB9XHJcbiAgICBWZWM0LnByb3RvdHlwZS54eXp3ID0gVmVjNC5wcm90b3R5cGUucmdiYSA9IFZlYzQucHJvdG90eXBlLnN0cHEgPSBmdW5jdGlvbih4LCB5LCB6LCB3KSB7XHJcbiAgICAgICAgaWYoYXJndW1lbnRzLmxlbmd0aCA9PSAwKVxyXG4gICAgICAgICAgICByZXR1cm4gdGhpcztcclxuICAgICAgICBlbHNlXHJcbiAgICAgICAgICAgIHJldHVybiBnZXRWZWM0LmFwcGx5KG51bGwsIGFyZ3VtZW50cyk7XHJcbiAgICB9XHJcbiAgICBWZWM0LnByb3RvdHlwZS54ID0gVmVjNC5wcm90b3R5cGUuciA9IFZlYzQucHJvdG90eXBlLnMgPSBmdW5jdGlvbih4KSB7XHJcbiAgICAgICAgaWYoYXJndW1lbnRzLmxlbmd0aCA9PSAwKVxyXG4gICAgICAgICAgICByZXR1cm4gdGhpc1swXTtcclxuICAgICAgICBlbHNlXHJcbiAgICAgICAgICAgIHJldHVybiBnZXRWZWM0KHgsIHRoaXNbMV0sIHRoaXNbMl0sIHRoaXNbM10pO1xyXG4gICAgfVxyXG5cclxuICAgIFZlYzQucHJvdG90eXBlLnkgPSBWZWM0LnByb3RvdHlwZS5nID0gVmVjNC5wcm90b3R5cGUudCA9IGZ1bmN0aW9uKHkpIHtcclxuICAgICAgICBpZihhcmd1bWVudHMubGVuZ3RoID09IDApXHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzWzFdO1xyXG4gICAgICAgIGVsc2VcclxuICAgICAgICAgICAgcmV0dXJuIGdldFZlYzQodGhpc1swXSwgeSwgdGhpc1syXSwgdGhpc1szXSk7XHJcbiAgICB9XHJcbiAgICBWZWM0LnByb3RvdHlwZS56ID0gVmVjNC5wcm90b3R5cGUuYiA9IFZlYzQucHJvdG90eXBlLnAgPSBmdW5jdGlvbih6KSB7XHJcbiAgICAgICAgaWYoYXJndW1lbnRzLmxlbmd0aCA9PSAwKVxyXG4gICAgICAgICAgICByZXR1cm4gdGhpc1syXTtcclxuICAgICAgICBlbHNlXHJcbiAgICAgICAgICAgIHJldHVybiBnZXRWZWM0KHRoaXNbMF0sIHRoaXNbMV0sIHosIHRoaXNbM10pO1xyXG4gICAgfVxyXG4gICAgVmVjNC5wcm90b3R5cGUudyA9IFZlYzQucHJvdG90eXBlLmEgPSBWZWM0LnByb3RvdHlwZS5xID0gZnVuY3Rpb24odykge1xyXG4gICAgICAgIGlmKGFyZ3VtZW50cy5sZW5ndGggPT0gMClcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXNbM107XHJcbiAgICAgICAgZWxzZVxyXG4gICAgICAgICAgICByZXR1cm4gZ2V0VmVjNCh0aGlzWzBdLCB0aGlzWzFdLCB0aGlzWzJdLCB3KTtcclxuICAgIH1cclxuICAgIGFkZFN3aXp6bGVzKFZlYzQucHJvdG90eXBlLCA0LCAyLCB0cnVlKTtcclxuICAgIGFkZFN3aXp6bGVzKFZlYzQucHJvdG90eXBlLCA0LCAzLCB0cnVlKTtcclxuICAgIGFkZFN3aXp6bGVzKFZlYzQucHJvdG90eXBlLCA0LCA0LCB0cnVlKTtcclxuXHJcbiAgICAvKipcclxuICAgICAqIFRoZSB2aXJ0dWFsIENvbG9yIHR5cGVcclxuICAgICAqIEBjb25zdHJ1Y3RvclxyXG4gICAgICovXHJcbiAgICB2YXIgQ29sb3IgPSBWZWM0O1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogVGhlIHZpcnR1YWwgTWF0MyB0eXBlXHJcbiAgICAgKiBAY29uc3RydWN0b3JcclxuICAgICAqL1xyXG4gICAgdmFyIE1hdDMgPSBmdW5jdGlvbihtMTEsIG0xMiwgbTEzLCBtMjEsIG0yMiwgbTIzLCBtMzEsIG0zMiwgbTMzKSB7XHJcbiAgICAgICAgY29uc3RydWN0RnJvbU1hdHJpeCh0aGlzLCAzLCBhcmd1bWVudHMpIHx8IGZpbGxWZWN0b3IodGhpcywgOSwgYXJndW1lbnRzKVxyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGdldE1hdDMoKSB7XHJcbiAgICAgICAgaWYoYXJndW1lbnRzWzBdIGluc3RhbmNlb2YgTWF0MylcclxuICAgICAgICAgICAgcmV0dXJuIGFyZ3VtZW50c1swXTtcclxuICAgICAgICB2YXIgb2JqID0gbmV3IE1hdDMoKTtcclxuICAgICAgICBNYXQzLmFwcGx5KG9iaiwgYXJndW1lbnRzKTtcclxuICAgICAgICByZXR1cm4gb2JqO1xyXG4gICAgfVxyXG5cclxuICAgIE1hdDMucHJvdG90eXBlLmFkZCA9IGZ1bmN0aW9uKG0xMSwgbTEyLCBtMTMsIG0yMSwgbTIyLCBtMjMsIG0zMSwgbTMyLCBtMzMpIHtcclxuICAgICAgICB2YXIgb3RoZXIgPSBnZXRNYXQzLmFwcGx5KG51bGwsIGFyZ3VtZW50cyk7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBNYXQzKHRoaXNbMF0gKyBvdGhlclswXSwgdGhpc1sxXSArIG90aGVyWzFdLCB0aGlzWzJdICsgb3RoZXJbMl0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXNbM10gKyBvdGhlclszXSwgdGhpc1s0XSArIG90aGVyWzRdLCB0aGlzWzVdICsgb3RoZXJbNV0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXNbNl0gKyBvdGhlcls2XSwgdGhpc1s3XSArIG90aGVyWzddLCB0aGlzWzhdICsgb3RoZXJbOF0pO1xyXG4gICAgfVxyXG4gICAgTWF0My5wcm90b3R5cGUuc3ViID0gZnVuY3Rpb24obTExLCBtMTIsIG0xMywgbTIxLCBtMjIsIG0yMywgbTMxLCBtMzIsIG0zMykge1xyXG4gICAgICAgIHZhciBvdGhlciA9IGdldE1hdDMuYXBwbHkobnVsbCwgYXJndW1lbnRzKTtcclxuICAgICAgICByZXR1cm4gbmV3IE1hdDModGhpc1swXSAtIG90aGVyWzBdLCB0aGlzWzFdIC0gb3RoZXJbMV0sIHRoaXNbMl0gLSBvdGhlclsyXSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpc1szXSAtIG90aGVyWzNdLCB0aGlzWzRdIC0gb3RoZXJbNF0sIHRoaXNbNV0gLSBvdGhlcls1XSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpc1s2XSAtIG90aGVyWzZdLCB0aGlzWzddIC0gb3RoZXJbN10sIHRoaXNbOF0gLSBvdGhlcls4XSk7XHJcbiAgICB9XHJcbiAgICBNYXQzLnByb3RvdHlwZS5tdWwgPSBmdW5jdGlvbihtMTEsIG0xMiwgbTEzLCBtMjEsIG0yMiwgbTIzLCBtMzEsIG0zMiwgbTMzKSB7XHJcbiAgICAgICAgdmFyIG90aGVyID0gZ2V0TWF0My5hcHBseShudWxsLCBhcmd1bWVudHMpO1xyXG4gICAgICAgIC8vIFRPRE86IERvIGNvcnJlY3QgbWF0cml4IG11bHRpcGxpY2F0aW9uLi4uXHJcbiAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICB9XHJcbiAgICBNYXQzLnByb3RvdHlwZS5kaXYgPSBmdW5jdGlvbihtMTEsIG0xMiwgbTEzLCBtMjEsIG0yMiwgbTIzLCBtMzEsIG0zMiwgbTMzKSB7XHJcbiAgICAgICAgdmFyIG90aGVyID0gZ2V0TWF0My5hcHBseShudWxsLCBhcmd1bWVudHMpO1xyXG4gICAgICAgIHJldHVybiBuZXcgTWF0Myh0aGlzWzBdIC8gb3RoZXJbMF0sIHRoaXNbMV0gLyBvdGhlclsxXSwgdGhpc1syXSAvIG90aGVyWzJdLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzWzNdIC8gb3RoZXJbM10sIHRoaXNbNF0gLyBvdGhlcls0XSwgdGhpc1s1XSAvIG90aGVyWzVdLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzWzZdIC8gb3RoZXJbNl0sIHRoaXNbN10gLyBvdGhlcls3XSwgdGhpc1s4XSAvIG90aGVyWzhdKTtcclxuICAgIH1cclxuXHJcbiAgICBNYXQzLnByb3RvdHlwZS5jb2wgPSBmdW5jdGlvbihpZHgsIHgsIHksIHope1xyXG4gICAgICAgIGlmKGFyZ3VtZW50cy5sZW5ndGggPT0gMSl7XHJcbiAgICAgICAgICAgIHJldHVybiBuZXcgVmVjMyh0aGlzWzMqaWR4ICsgMF0sIHRoaXNbMyppZHggKyAxXSwgdGhpc1szKmlkeCArIDJdKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgZWxzZXtcclxuICAgICAgICAgICAgdmFyIGlucHV0ID0gZ2V0VmVjMy5hcHBseShudWxsLCBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpKTtcclxuICAgICAgICAgICAgdmFyIGNvcHkgPSBuZXcgTWF0Myh0aGlzKTtcclxuICAgICAgICAgICAgY29weVszKmlkeCArIDBdID0gaW5wdXRbMF07XHJcbiAgICAgICAgICAgIGNvcHlbMyppZHggKyAxXSA9IGlucHV0WzFdO1xyXG4gICAgICAgICAgICBjb3B5WzMqaWR4ICsgMl0gPSBpbnB1dFsyXTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICBNYXQzLnByb3RvdHlwZS5tdWxWZWMgPSBmdW5jdGlvbih4LCB5LCB6KXtcclxuICAgICAgICB2YXIgb3RoZXIgPSBnZXRWZWMzLmFwcGx5KG51bGwsIGFyZ3VtZW50cyk7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBWZWMzKFxyXG4gICAgICAgICAgICBvdGhlci5kb3QodGhpc1swXSwgdGhpc1sxXSwgdGhpc1syXSksXHJcbiAgICAgICAgICAgIG90aGVyLmRvdCh0aGlzWzNdLCB0aGlzWzRdLCB0aGlzWzVdKSxcclxuICAgICAgICAgICAgb3RoZXIuZG90KHRoaXNbNl0sIHRoaXNbN10sIHRoaXNbOF0pXHJcbiAgICAgICAgKVxyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogVGhlIHZpcnR1YWwgTWF0MyB0eXBlXHJcbiAgICAgKiBAY29uc3RydWN0b3JcclxuICAgICAqL1xyXG4gICAgdmFyIE1hdDQgPSBmdW5jdGlvbihtMTEsIG0xMiwgbTEzLCBtMTQsIG0yMSwgbTIyLCBtMjMsIG0yNCwgbTMxLCBtMzIsIG0zMywgbTM0LCBtNDEsIG00MiwgbTQzLCBtNDQpIHtcclxuICAgICAgICBjb25zdHJ1Y3RGcm9tTWF0cml4KHRoaXMsIDQsIGFyZ3VtZW50cykgfHwgZmlsbFZlY3Rvcih0aGlzLCAxNiwgYXJndW1lbnRzKTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBnZXRNYXQ0KCkge1xyXG4gICAgICAgIGlmKGFyZ3VtZW50c1swXSBpbnN0YW5jZW9mIE1hdDQpXHJcbiAgICAgICAgICAgIHJldHVybiBhcmd1bWVudHNbMF07XHJcbiAgICAgICAgdmFyIG9iaiA9IG5ldyBNYXQ0KCk7XHJcbiAgICAgICAgTWF0NC5hcHBseShvYmosIGFyZ3VtZW50cyk7XHJcbiAgICAgICAgcmV0dXJuIG9iajtcclxuICAgIH1cclxuXHJcbiAgICBNYXQ0LnByb3RvdHlwZS5hZGQgPSBmdW5jdGlvbihtMTEsIG0xMiwgbTEzLCBtMTQsIG0yMSwgbTIyLCBtMjMsIG0yNCwgbTMxLCBtMzIsIG0zMywgbTM0LCBtNDEsIG00MiwgbTQzLCBtNDQpIHtcclxuICAgICAgICB2YXIgb3RoZXIgPSBnZXRNYXQ0LmFwcGx5KG51bGwsIGFyZ3VtZW50cyk7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBNYXQzKHRoaXNbMF0gKyBvdGhlclswXSwgdGhpc1sxXSArIG90aGVyWzFdLCB0aGlzWzJdICsgb3RoZXJbMl0sIHRoaXNbM10gKyBvdGhlclszXSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpc1s0XSArIG90aGVyWzRdLCB0aGlzWzVdICsgb3RoZXJbNV0sIHRoaXNbNl0gKyBvdGhlcls2XSwgdGhpc1s3XSArIG90aGVyWzddLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzWzhdICsgb3RoZXJbOF0sIHRoaXNbOV0gKyBvdGhlcls5XSwgdGhpc1sxMF0gKyBvdGhlclsxMF0sIHRoaXNbMTFdICsgb3RoZXJbMTFdLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzWzEyXSArIG90aGVyWzEyXSwgdGhpc1sxM10gKyBvdGhlclsxM10sIHRoaXNbMTRdICsgb3RoZXJbMTRdLCB0aGlzWzE1XSArIG90aGVyWzE1XSk7XHJcbiAgICB9XHJcbiAgICBNYXQ0LnByb3RvdHlwZS5zdWIgPSBmdW5jdGlvbihtMTEsIG0xMiwgbTEzLCBtMTQsIG0yMSwgbTIyLCBtMjMsIG0yNCwgbTMxLCBtMzIsIG0zMywgbTM0LCBtNDEsIG00MiwgbTQzLCBtNDQpIHtcclxuICAgICAgICB2YXIgb3RoZXIgPSBnZXRNYXQ0LmFwcGx5KG51bGwsIGFyZ3VtZW50cyk7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBNYXQzKHRoaXNbMF0gLSBvdGhlclswXSwgdGhpc1sxXSAtIG90aGVyWzFdLCB0aGlzWzJdIC0gb3RoZXJbMl0sIHRoaXNbM10gLSBvdGhlclszXSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpc1s0XSAtIG90aGVyWzRdLCB0aGlzWzVdIC0gb3RoZXJbNV0sIHRoaXNbNl0gLSBvdGhlcls2XSwgdGhpc1s3XSAtIG90aGVyWzddLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzWzhdIC0gb3RoZXJbOF0sIHRoaXNbOV0gLSBvdGhlcls5XSwgdGhpc1sxMF0gLSBvdGhlclsxMF0sIHRoaXNbMTFdIC0gb3RoZXJbMTFdLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzWzEyXSAtIG90aGVyWzEyXSwgdGhpc1sxM10gLSBvdGhlclsxM10sIHRoaXNbMTRdIC0gb3RoZXJbMTRdLCB0aGlzWzE1XSAtIG90aGVyWzE1XSk7XHJcbiAgICB9XHJcbiAgICBNYXQ0LnByb3RvdHlwZS5tdWwgPSBmdW5jdGlvbihtMTEsIG0xMiwgbTEzLCBtMTQsIG0yMSwgbTIyLCBtMjMsIG0yNCwgbTMxLCBtMzIsIG0zMywgbTM0LCBtNDEsIG00MiwgbTQzLCBtNDQpIHtcclxuICAgICAgICB2YXIgb3RoZXIgPSBnZXRNYXQ0LmFwcGx5KG51bGwsIGFyZ3VtZW50cyk7XHJcbiAgICAgICAgLy8gVE9ETzogRG8gY29ycmVjdCBtYXRyaXggbXVsdGlwbGljYXRpb24uLi5cclxuICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgIH1cclxuICAgIE1hdDQucHJvdG90eXBlLmRpdiA9IGZ1bmN0aW9uKG0xMSwgbTEyLCBtMTMsIG0xNCwgbTIxLCBtMjIsIG0yMywgbTI0LCBtMzEsIG0zMiwgbTMzLCBtMzQsIG00MSwgbTQyLCBtNDMsIG00NCkge1xyXG4gICAgICAgIHZhciBvdGhlciA9IGdldE1hdDQuYXBwbHkobnVsbCwgYXJndW1lbnRzKTtcclxuICAgICAgICByZXR1cm4gbmV3IE1hdDModGhpc1swXSAvIG90aGVyWzBdLCB0aGlzWzFdIC8gb3RoZXJbMV0sIHRoaXNbMl0gLyBvdGhlclsyXSwgdGhpc1szXSAvIG90aGVyWzNdLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzWzRdIC8gb3RoZXJbNF0sIHRoaXNbNV0gLyBvdGhlcls1XSwgdGhpc1s2XSAvIG90aGVyWzZdLCB0aGlzWzddIC8gb3RoZXJbN10sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXNbOF0gLyBvdGhlcls4XSwgdGhpc1s5XSAvIG90aGVyWzldLCB0aGlzWzEwXSAvIG90aGVyWzEwXSwgdGhpc1sxMV0gLyBvdGhlclsxMV0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXNbMTJdIC8gb3RoZXJbMTJdLCB0aGlzWzEzXSAvIG90aGVyWzEzXSwgdGhpc1sxNF0gLyBvdGhlclsxNF0sIHRoaXNbMTVdIC8gb3RoZXJbMTVdKTtcclxuICAgIH1cclxuXHJcbiAgICBNYXQ0LnByb3RvdHlwZS5jb2wgPSBmdW5jdGlvbihpZHgsIHgsIHksIHosIHcpe1xyXG4gICAgICAgIGlmKGFyZ3VtZW50cy5sZW5ndGggPT0gMSl7XHJcbiAgICAgICAgICAgIHJldHVybiBuZXcgVmVjNCh0aGlzWzQqaWR4ICsgMF0sIHRoaXNbNCppZHggKyAxXSwgdGhpc1s0KmlkeCArIDJdLCB0aGlzWzQqaWR4ICsgM10pO1xyXG4gICAgICAgIH1cclxuICAgICAgICBlbHNle1xyXG4gICAgICAgICAgICB2YXIgaW5wdXQgPSBnZXRWZWM0LmFwcGx5KG51bGwsIEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMSkpO1xyXG4gICAgICAgICAgICB2YXIgY29weSA9IG5ldyBNYXQ0KHRoaXMpO1xyXG4gICAgICAgICAgICBjb3B5WzQqaWR4ICsgMF0gPSBpbnB1dFswXTtcclxuICAgICAgICAgICAgY29weVs0KmlkeCArIDFdID0gaW5wdXRbMV07XHJcbiAgICAgICAgICAgIGNvcHlbNCppZHggKyAyXSA9IGlucHV0WzJdO1xyXG4gICAgICAgICAgICBjb3B5WzQqaWR4ICsgM10gPSBpbnB1dFszXTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICBNYXQ0LnByb3RvdHlwZS5tdWxWZWMgPSBmdW5jdGlvbih4LCB5LCB6LCB3KXtcclxuICAgICAgICB2YXIgb3RoZXIgPSBnZXRWZWM0LmFwcGx5KG51bGwsIGFyZ3VtZW50cyk7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBWZWMzKFxyXG4gICAgICAgICAgICBvdGhlci5kb3QodGhpc1swXSwgdGhpc1sxXSwgdGhpc1syXSwgdGhpc1szXSksXHJcbiAgICAgICAgICAgIG90aGVyLmRvdCh0aGlzWzRdLCB0aGlzWzVdLCB0aGlzWzZdLCB0aGlzWzddKSxcclxuICAgICAgICAgICAgb3RoZXIuZG90KHRoaXNbOF0sIHRoaXNbOV0sIHRoaXNbMTBdLCB0aGlzWzExXSksXHJcbiAgICAgICAgICAgIG90aGVyLmRvdCh0aGlzWzEyXSwgdGhpc1sxM10sIHRoaXNbMTRdLCB0aGlzWzE1XSlcclxuICAgICAgICApO1xyXG4gICAgfVxyXG5cclxuXHJcbiAgICAvKipcclxuICAgICAqIFRoZSB2aXJ0dWFsIFRldHVyZSB0eXBlXHJcbiAgICAgKiBAY29uc3RydWN0b3JcclxuICAgICAqL1xyXG4gICAgdmFyIFRleHR1cmUgPSBmdW5jdGlvbihpbWFnZSkge1xyXG4gICAgICAgIHRoaXMuaW1hZ2UgPSBpbWFnZTtcclxuICAgIH1cclxuXHJcbiAgICBUZXh0dXJlLnByb3RvdHlwZS5zYW1wbGUyRCA9IGZ1bmN0aW9uKHgsIHkpIHtcclxuICAgICAgICByZXR1cm4gbmV3IFZlYzQoMCwgMCwgMCwgMCk7XHJcbiAgICB9XHJcblxyXG5cclxuXHJcblxyXG5cclxuICAgIHZhciBTaGFkZSA9IHt9O1xyXG5cclxuICAgIFNoYWRlLmNsYW1wID0gZnVuY3Rpb24oeCwgbWluVmFsLCBtYXhWYWwpIHtcclxuICAgICAgICByZXR1cm4gTWF0aC5taW4oTWF0aC5tYXgoeCwgbWluVmFsKSwgbWF4VmFsKTtcclxuICAgIH07XHJcblxyXG4gICAgU2hhZGUuc21vb3Roc3RlcCA9IGZ1bmN0aW9uKGVkZ2UxLCBlZGdlMiwgeCkge1xyXG4gICAgICAgIHZhciB0ID0gU2hhZGUuY2xhbXAoKHggLSBlZGdlMSkgLyAoZWRnZTIgLSBlZGdlMSksIDAuMCwgMS4wKTtcclxuICAgICAgICByZXR1cm4gdCAqIHQgKiAoMy4wIC0gMi4wICogdCk7XHJcbiAgICB9O1xyXG5cclxuICAgIFNoYWRlLnN0ZXAgPSBmdW5jdGlvbihlZGdlLCB4KSB7XHJcbiAgICAgICAgcmV0dXJuIHggPCBlZGdlID8gMCA6IDE7XHJcbiAgICB9O1xyXG5cclxuICAgIFNoYWRlLmZyYWN0ID0gZnVuY3Rpb24oeCkge1xyXG4gICAgICAgIHJldHVybiB4IC0gTWF0aC5mbG9vcih4KTtcclxuICAgIH1cclxuXHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gbm9kZVxyXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IG1zZ1xyXG4gICAgICovXHJcbiAgICBucy50aHJvd0Vycm9yID0gZnVuY3Rpb24obm9kZSwgbXNnKSB7XHJcbiAgICAgICAgdmFyIGxvYyA9IG5vZGUgJiYgbm9kZS5sb2M7XHJcbiAgICAgICAgaWYgKGxvYyAmJiBsb2Muc3RhcnQubGluZSkge1xyXG4gICAgICAgICAgICBtc2cgPSBcIkxpbmUgXCIgKyBsb2Muc3RhcnQubGluZSArIFwiOiBcIiArIG1zZztcclxuICAgICAgICB9XHJcbiAgICAgICAgdmFyIGVycm9yID0gbmV3IEVycm9yKG1zZyk7XHJcbiAgICAgICAgZXJyb3IubG9jID0gbG9jO1xyXG4gICAgICAgIHRocm93IGVycm9yO1xyXG4gICAgfVxyXG5cclxuICAgIG5zLlZlYzIgPSBWZWMyO1xyXG4gICAgbnMuVmVjMyA9IFZlYzM7XHJcbiAgICBucy5WZWM0ID0gVmVjNDtcclxuICAgIG5zLkNvbG9yID0gQ29sb3I7XHJcbiAgICBucy5TaGFkZSA9IFNoYWRlO1xyXG5cclxufShleHBvcnRzKSk7XHJcbiIsIihmdW5jdGlvbiAobnMpIHtcclxuICAgIHZhciBwYXJzZXIgPSByZXF1aXJlKCdlc3ByaW1hJyksXHJcbiAgICAgICAgcGFyYW1ldGVycyA9IHJlcXVpcmUoXCIuL2FuYWx5emUvcGFyYW1ldGVycy5qc1wiKSxcclxuICAgICAgICBpbnRlcmZhY2VzID0gcmVxdWlyZShcIi4vaW50ZXJmYWNlcy5qc1wiKSxcclxuICAgICAgICBpbmZlcmVuY2UgPSByZXF1aXJlKFwiLi9hbmFseXplL3R5cGVpbmZlcmVuY2UvdHlwZWluZmVyZW5jZS5qc1wiKSxcclxuICAgICAgICBCYXNlID0gcmVxdWlyZShcIi4vYmFzZS9pbmRleC5qc1wiKSxcclxuICAgICAgICBHTFNMQ29tcGlsZXIgPSByZXF1aXJlKFwiLi9nZW5lcmF0ZS9nbHNsL2NvbXBpbGVyLmpzXCIpLkdMU0xDb21waWxlcjtcclxuXHJcblxyXG5cclxuICAgIEJhc2UuZXh0ZW5kKG5zLCB7XHJcblxyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIEFuYWx5emVzIGEgamF2YXNjcmlwdCBwcm9ncmFtIGFuZCByZXR1cm5zIGEgbGlzdCBvZiBwYXJhbWV0ZXJzXHJcbiAgICAgICAgICogQHBhcmFtIHtmdW5jdGlvbigpfHN0cmluZykgZnVuY1xyXG4gICAgICAgICAqIEByZXR1cm5zIHtvYmplY3QhfVxyXG4gICAgICAgICAqL1xyXG4gICAgICAgIGV4dHJhY3RQYXJhbWV0ZXJzOiBmdW5jdGlvbiAoZnVuYywgb3B0KSB7XHJcbiAgICAgICAgICAgIGlmICh0eXBlb2YgZnVuYyA9PSAnZnVuY3Rpb24nKSB7XHJcbiAgICAgICAgICAgICAgICBmdW5jID0gZnVuYy50b1N0cmluZygpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHZhciBhc3QgPSBwYXJzZXIucGFyc2UoZnVuYyk7XHJcblxyXG4gICAgICAgICAgICByZXR1cm4gcGFyYW1ldGVycy5leHRyYWN0UGFyYW1ldGVycyhhc3QsIG9wdCk7XHJcbiAgICAgICAgfSxcclxuXHJcbiAgICAgICAgcGFyc2VBbmRJbmZlcmVuY2VFeHByZXNzaW9uOiBmdW5jdGlvbiAoc3RyLCBvcHQpIHtcclxuICAgICAgICAgICAgb3B0ID0gb3B0IHx8IHt9O1xyXG4gICAgICAgICAgICB2YXIgYXN0ID0gcGFyc2VyLnBhcnNlKHN0ciwge3JhdzogdHJ1ZSwgbG9jOiBvcHQubG9jIHx8IGZhbHNlIH0pO1xyXG4gICAgICAgICAgICB2YXIgYWFzdCA9IGluZmVyZW5jZS5pbmZlcihhc3QsIG9wdCk7XHJcbiAgICAgICAgICAgIHJldHVybiBhYXN0O1xyXG4gICAgICAgIH0sXHJcblxyXG4gICAgICAgIGNvbXBpbGVGcmFnbWVudFNoYWRlcjogZnVuY3Rpb24oYWFzdCl7XHJcbiAgICAgICAgICAgIHJldHVybiBuZXcgR0xTTENvbXBpbGVyKCkuY29tcGlsZUZyYWdtZW50U2hhZGVyKGFhc3QpO1xyXG4gICAgICAgIH0sXHJcblxyXG4gICAgICAgIFRZUEVTIDogaW50ZXJmYWNlcy5UWVBFUyxcclxuICAgICAgICBPQkpFQ1RfS0lORFMgOiBpbnRlcmZhY2VzLk9CSkVDVF9LSU5EUyxcclxuICAgICAgICBTT1VSQ0VTOiBpbnRlcmZhY2VzLlNPVVJDRVMsXHJcbiAgICAgICAgVmVjMjogaW50ZXJmYWNlcy5WZWMyLFxyXG4gICAgICAgIFZlYzM6IGludGVyZmFjZXMuVmVjMyxcclxuICAgICAgICBWZWM0OiBpbnRlcmZhY2VzLlZlYzQsXHJcbiAgICAgICAgVGV4dHVyZTogaW50ZXJmYWNlcy5UZXh0dXJlLFxyXG4gICAgICAgIENvbG9yOiBpbnRlcmZhY2VzLkNvbG9yXHJcblxyXG59KTtcclxuICAgIC8qKlxyXG4gICAgICogTGlicmFyeSB2ZXJzaW9uOlxyXG4gICAgICovXHJcbiAgICBucy52ZXJzaW9uID0gJzAuMC4xJztcclxuXHJcbn0oZXhwb3J0cykpO1xyXG4iXX0=
;