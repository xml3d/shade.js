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
            evaluate: function(result, args) {
                Tools.checkParamCount(result.node, "Shade.fract", [1], args.length);

                var x = args[0];
                if (x.canNumber()) {
                    var typeInfo = {
                        type: TYPES.NUMBER
                    }

                    if (x.hasStaticValue()) {
                        typeInfo.staticValue = Shade.Shade.fract(x.getStaticValue());
                    }
                    return typeInfo;
                }
                Shade.throwError(result.node, "Shade.fract not supported with argument types: " + args.map(function(arg) { return arg.getTypeString(); }).join(", "));
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
    Tools.Vec.attachVecMethods(TextureInstance, "Texture", false, 4, 2, ['sample2D']);


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
            4: { type: TYPES.OBJECT, kind: KINDS.FLOAT4 },
            color: { type: TYPES.OBJECT, kind: KINDS.FLOAT3 }
        },
        getType: function(destVector, color){
            if(destVector == 4 && color)
                return Vec.TYPES.color;
            else
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
        checkVecArguments: function(methodName, color, vecSize, withEmpty, result, args){
            withEmpty = (withEmpty || vecSize == 0);
            color = color && vecSize == 4;
            var allowed = [];
            for(var i = withEmpty ? 0 : 1; i <= vecSize; ++i) allowed.push(i);
            ns.checkParamCount(result.node, methodName, allowed, args.length);

            if(withEmpty && args.length == 0)
                return;

            if(args.length == 1 && args[0].canNumber())
                return;

            var idx = 0;
            for(var i = 0; idx < vecSize && i < args.length; ++i){
                var arg= args[i], cnt;
                if(arg.canNumber()) cnt = 1;
                else if(arg.isOfKind(KINDS.FLOAT2)) cnt = 2;
                else if(arg.isOfKind(KINDS.FLOAT3)) cnt = 3;
                else if(arg.isOfKind(KINDS.FLOAT4)) cnt = 4;
                else Shade.throwError(result.node, "Inavlid parameter for " + methodName + ", type is not supported");
                // TODO: Print Type?
                idx += cnt;
            }

            if(idx < vecSize && (!color || idx + 1 < vecSize))
                Shade.throwError(result.node, "Inavlid parameters for " + methodName + ", expected " + vecSize + " scalar values, got " + idx);
            else if(i < args.length){
                Shade.throwError(result.node, "Inavlid parameters for " + methodName + ", too many parameters");
            }
        },
        vecEvaluate: function(objectName, methodName, color, destVecSize, srcVecSize, result, args, ctx, callObject){
            Vec.checkVecArguments(objectName + "." + methodName, color, srcVecSize, false, result, args);

            var typeInfo = {};
            Base.extend(typeInfo, Vec.getType(destVecSize, color));

            Vec.getStaticValue(typeInfo, methodName, args, callObject);
            return typeInfo;
        },

        optionalZeroEvaluate: function(objectName, color, methodName, destVecSize, zeroDestVecSize, srcVecSize, result, args, ctx, callObject) {
            var qualifiedName = objectName + "." + methodName;
            var typeInfo = {};

            if(args.length == 0){
                Base.extend(typeInfo, Vec.getType(zeroDestVecSize, color));
            }
            else{
                Vec.checkVecArguments(qualifiedName, color, srcVecSize, true, result, args);
                Base.extend(typeInfo, Vec.getType(destVecSize, color));
            }
            Vec.getStaticValue(typeInfo, methodName, args, callObject);

            return typeInfo;
        },

        swizzleEvaluate: function(objectName, color, vecSize, swizzle, withSetter, result, args, ctx, callObject) {
            if(withSetter){
                return Vec.optionalZeroEvaluate(objectName, color, swizzle, vecSize, swizzle.length, swizzle.length,
                    result, args, ctx, callObject);
            }
            else{
                return Vec.vecEvaluate(objectName, swizzle, color, swizzle.length, 0, result, args, ctx, callObject);
            }
        },
        getSwizzleEvaluate: function(objectName, color, vecSize, swizzle){
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
                evaluate: Vec.swizzleEvaluate.bind(null, objectName, color, vecSize, swizzle, withSetter)
            }
        },
        attachSwizzles: function (instance, objectName, color, vecCount){
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
                        instance[key] = Vec.getSwizzleEvaluate(objectName, color, vecCount, key);
                    }
                }
            }
        },
        attachVecMethods: function(instance, objectName, color, destVecSize, srcVecSize, methodNames){
            for(var i = 0; i < methodNames.length; ++i){
                var methodName = methodNames[i];
                instance[methodName] = {
                    type: TYPES.FUNCTION,
                    evaluate: Vec.vecEvaluate.bind(null, objectName, methodName, color, destVecSize, srcVecSize)
                }
            }
        },
        constructorEvaluate: function(objectName, color, vecSize, result, args, ctx) {
            Vec.checkVecArguments(objectName, color, vecSize, true, result, args);
            var argArray = [];
            var isStatic = true;
            args.forEach(function (param, index) {
                isStatic = isStatic && param.hasStaticValue();
                if (isStatic)
                    argArray.push(param.getStaticValue());
            });

            var typeInfo = Base.extend({},Vec.getType(vecSize, color));

            if (isStatic) {
                var v = new Shade[objectName]();
                Shade[objectName].apply(v, argArray);
                typeInfo.staticValue = v;
            }
            return typeInfo;
        }

    };
    ns.Vec = Vec;
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
        evaluate: Tools.Vec.constructorEvaluate.bind(null, "Vec2", false, 2)
    };

    var Vector2StaticObject = {
    };

    var Vector2Instance = {
        length: {
            type: TYPES.FUNCTION,
            evaluate: Tools.Vec.optionalZeroEvaluate.bind(null,"Vec2", false, "length", 2, 1, 1)
        }
    };
    Tools.Vec.attachSwizzles(Vector2Instance, "Vec2", false, 2);
    Tools.Vec.attachVecMethods(Vector2Instance, "Vec2", false, 2, 2, ['add', 'sub', 'mul', 'div', 'mod']);
    Tools.Vec.attachVecMethods(Vector2Instance, "Vec2", false, 1, 2, ['dot']);
    Tools.Vec.attachVecMethods(Vector2Instance, "Vec2", false, 2, 0, ['normalize']);


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
        evaluate: Tools.Vec.constructorEvaluate.bind(null, "Vec3", false, 3)
    };

    var Vector3StaticObject = {
    };

    var Vector3Instance = {
        length: {
            type: TYPES.FUNCTION,
            evaluate: Tools.Vec.optionalZeroEvaluate.bind(null,"Vec3", false, "length", 3, 1, 1)
        }
    };
    Tools.Vec.attachSwizzles(Vector3Instance, "Vec3", false, 3);
    Tools.Vec.attachVecMethods(Vector3Instance, "Vec3", false, 3, 3, ['add', 'sub', 'mul', 'div', 'mod']);
    Tools.Vec.attachVecMethods(Vector3Instance, "Vec3", false, 1, 3, ['dot']);
    Tools.Vec.attachVecMethods(Vector3Instance, "Vec3", false, 3, 0, ['normalize']);


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
        evaluate: Tools.Vec.constructorEvaluate.bind(null, "Vec4", false, 4)
    };

    var Vector4StaticObject = {
    };

    var Vector4Instance = {
        length: {
            type: TYPES.FUNCTION,
            evaluate: Tools.Vec.optionalZeroEvaluate.bind(null,"Vec4", false, "length", 4, 1, 1)
        }
    };
    Tools.Vec.attachSwizzles(Vector4Instance, "Vec4", false, 4);
    Tools.Vec.attachVecMethods(Vector4Instance, "Vec4", false, 4, 4, ['add', 'sub', 'mul', 'div', 'mod']);
    Tools.Vec.attachVecMethods(Vector4Instance, "Vec4", false, 1, 4, ['dot']);
    Tools.Vec.attachVecMethods(Vector4Instance, "Vec4", false, 4, 0, ['normalize']);


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
            if (node.type == Syntax.Identifier) {
                var name = node.name;
                var binding = this.getBindingByName(name);
                if (binding) {
                    return binding;
                }
            }
            var result = new Annotation(node);
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

        var indent = "";
        var lines = createLineStack();

        traverse(ast, lines, opt);

        return lines.join("\n");
    }

    function traverse(ast, lines, opt) {
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
                                var source = toGLSLSource(node.extra);
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



    var handleIntVersion = function(node, parent) {
        parent.extra.type = Shade.TYPES.NUMBER;
        return Tools.removeMemberFromExpression(node);
    }


    var MathEntry  = {
        abs: { property: Tools.removeMemberFromExpression },
        acos: { property: Tools.removeMemberFromExpression },
        asin: { property: Tools.removeMemberFromExpression },
        atan: { property: Tools.removeMemberFromExpression },
        atan2: { property: function() { return { type: Syntax.Identifier, name: "atan" } }},
        ceil: { property: handleIntVersion },
        cos:  { property: Tools.removeMemberFromExpression },
        exp: { property: Tools.removeMemberFromExpression },
        floor: { property: handleIntVersion },
        // imul: { property: Tools.removeMemberFromExpression },
        log: { property: Tools.removeMemberFromExpression },
        max: { property: Tools.removeMemberFromExpression },
        min: { property: Tools.removeMemberFromExpression },
        pow: { property: Tools.removeMemberFromExpression },
        // random: function random() { [native code] }
        round: { property: Tools.removeMemberFromExpression }, // Since GLSL 1.3, what does WebGL use?
        sin:  { property: Tools.removeMemberFromExpression },
        sqrt: { property: Tools.removeMemberFromExpression },
        tan: { property: Tools.removeMemberFromExpression }
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
                state.globalParameters[SystemParameterNames.coords] = CoordsType;
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
                state.globalParameters[SystemParameterNames.coords] = CoordsType;
                node.property.name = SystemParameterNames.coords + ".y";
                return node.property;
            }
        },
        width: {
            property: function (node, parent, context, state) {
                state.globalParameters[SystemParameterNames.coords] = CoordsType;
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
        generateVecFromArgs: function(vecCount, args){
            if(vecCount == 1)
                return args[0];
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
            }
    };
    ns.Vec = Vec;

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
            constructor: null,
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
            constructor: null,
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
            constructor: null,
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
        Sources = require("./../../interfaces.js").SOURCES;

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
                 blockedNames : [],
                 topDeclarations : [],
                 idNameMap : {}
            }



            for(var name in state.globalParameters){
                state.blockedNames.push(name);
            }

            this.replace(program, state);

            for(var name in state.globalParameters){
                var decl = handleTopDeclaration(name, state.globalParameters);
                if (decl)
                    program.body.unshift(decl);
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
                            return handleLogicalExpression(node, this, state);
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

    var handleTopDeclaration = function(name, globalParameters){
        var propertyLiteral =  { type: Syntax.Identifier, name: getNameForGlobal(globalParameters, name)};
        var propertyAnnotation =  ANNO(propertyLiteral);
        propertyAnnotation.setFromExtra(globalParameters[name]);

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
        if(parent.type == Syntax.FunctionDeclaration)
            return node;
        if(parent.type == Syntax.MemberExpression && ANNO(parent.object).isGlobal())
            return node;


        var name = node.name;
        if(idNameMap[name]) node.name = idNameMap[name];
        var newName = name, i = 1;
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


    var handleMemberExpression = function (memberExpression, parent, state) {
        var propertyName = memberExpression.property.name,
            context = state.context;

        var objectReference = getObjectReferenceFromNode(memberExpression.object, context);

        if (objectReference && objectReference.isObject()) {
            var objectInfo = context.getObjectInfoFor(objectReference);
            if(!objectInfo) {// Every object needs an info, otherwise we did something wrong
                Shade.throwError(memberExpression, "Internal Error: No object registered for: " + objectReference.getTypeString() + JSON.stringify(memberExpression.object));
            }
            if (objectInfo.hasOwnProperty(propertyName)) {
                var propertyHandler = objectInfo[propertyName];
                if (typeof propertyHandler.property == "function") {
                    var result = propertyHandler.property(memberExpression, parent, context, state);
                    return result;
                }
            }
        }

        if(objectReference && objectReference.isGlobal()) {
            var propertyLiteral =  { type: Syntax.Identifier, name: getNameForGlobal(objectReference, propertyName)};
            ANNO(propertyLiteral).copy(ANNO(memberExpression));
            return propertyLiteral;
        }

    };

    var getNameForGlobal = function(reference, baseName) {
        var entry = reference[baseName];
        if(entry) {
            if (entry.source == Sources.VERTEX) {
                return "frag_" + baseName;
            }
        }
        return baseName;
    }

    var handleBinaryExpression = function (binaryExpression, parent, cb) {
        // In GL, we can't mix up floats, ints and boold for binary expressions
        var left = ANNO(binaryExpression.left),
            right = ANNO(binaryExpression.right);

        if (left.isNumber() && right.isInt()) {
            binaryExpression.right = castToFloat(binaryExpression.right);
        }
        else if (right.isNumber() && left.isInt()) {
            binaryExpression.left = castToFloat(binaryExpression.left);
        }

        if (binaryExpression.operator == "%") {
            return handleModulo(binaryExpression);
        }
        return binaryExpression;
    }

    function castToFloat(ast) {
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
        throw new Error("Can't cast from " + exp.getTypeString() + "to vec4");
    }

    var handleModulo = function (binaryExpression) {
        binaryExpression.right = castToFloat(binaryExpression.right);
        binaryExpression.left = castToFloat(binaryExpression.left);
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

    var handleLogicalExpression = function (node, root, state) {
        var left = ANNO(node.left);
        var right = ANNO(node.right);
        if (left.canEliminate())
            return root.replace(node.right, state);
        if (right.canEliminate())
            return root.replace(node.left, state);
    }

    // Exports
    ns.GLASTTransformer = GLASTTransformer;


}(exports));

},{"../../base/annotation.js":20,"../../base/context.js":21,"../../base/index.js":22,"../../base/typeinfo.js":23,"./../../interfaces.js":38,"./registry/index.js":28,"estraverse":4}],38:[function(require,module,exports){
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
        MATRIX4: "matrix4",
        MATRIX3: "matrix3",
        TEXTURE: "texture",
        COLOR_CLOSURE: "color_closure"
    }

    ns.SOURCES = {
        UNIFORM: "uniform",
        VERTEX: "vertex",
        CONSTANT: "constant"
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
     var Vec2 = function(x, y){
        fillVector(this, 2, arguments);
     }


     function getVec2(){
        if(arguments[0] instanceof Vec2)
            return arguments[0];
        var obj =  new Vec2();
        Vec2.apply(obj, arguments);
        return obj;
     }

     Vec2.prototype.add = function(x, y){ // 0 arguments => identity or error?
        var add = getVec2.apply(null, arguments);
        return new Vec2(this[0] + add[0], this[1] + add[1]);
     }
     Vec2.prototype.sub = function(x, y){
        var sub = getVec2.apply(null, arguments);
        return new Vec2(this[0] - sub[0], this[1] - sub[1]);
     }
     Vec2.prototype.mul = function(x, y){
        var other = getVec2.apply(null, arguments);
        return new Vec2(this[0] * other[0], this[1] * other[1]);
     }
     Vec2.prototype.div = function(x, y){
        var other = getVec2.apply(null, arguments);
        return new Vec2(this[0] / other[0], this[1] / other[1]);
     }
     Vec2.prototype.mod = function(x, y){
        var other = getVec2.apply(null, arguments);
        return new Vec2(this[0] % other[0], this[1] % other[1]);
     }
     Vec2.prototype.dot = function(x, y){
        var other = getVec2.apply(null, arguments);
        return this[0]*other[0] + this[1]*other[1];
     }
     Vec2.prototype.abs = function(){
        return new Vec2(Math.abs(this[0]), Math.abs(this[1]));
     }
     Vec2.prototype.length = function(length){
        if(arguments.length == 0)
            return Math.sqrt(this.dot(this));
        else{
            return this.mul(length / this.length());
        }
     }
     Vec2.prototype.normalize = function(){
        return this.length(1);
     }

     Vec2.prototype.xy = Vec2.prototype.rg = Vec2.prototype.st = function(x,y){
        if(arguments.length == 0)
            return this;
        else{
            return getVec2.apply(null, arguments);
        }
     }
     Vec2.prototype.x = Vec2.prototype.r = Vec2.prototype.s = function(x){
        if(arguments.length == 0)
            return this[0];
        else
            return this.xy(x, this[1]);
     }
     Vec2.prototype.y = Vec2.prototype.g = Vec2.prototype.t = function(y){
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
     var Vec3 = function(x, y, z ){
        fillVector(this, 3, arguments);
     }

     function getVec3(){
        if(arguments[0] instanceof Vec3)
            return arguments[0];
        var obj = new Vec3();
        Vec3.apply(obj, arguments);
        return obj;
     }

     Vec3.prototype.add = function(x, y, z){
        var other = getVec3.apply(null, arguments);
        return new Vec3(this[0] + other[0], this[1] + other[1], this[2] + other[2]);
     }
     Vec3.prototype.sub = function(x, y, z){
        var other = getVec3.apply(null, arguments);
        return new Vec3(this[0] - other[0], this[1] - other[1], this[2] - other[2]);
     }
     Vec3.prototype.mul = function(x, y, z){
        var other = getVec3.apply(null, arguments);
        return new Vec3(this[0] * other[0], this[1] * other[1], this[2] * other[2]);
     }
     Vec3.prototype.div = function(x, y, z){
        var other = getVec3.apply(null, arguments);
        return new Vec3(this[0] / other[0], this[1] / other[1], this[2] / other[2]);
     }
     Vec3.prototype.mod = function(x, y, z){
        var other = getVec3.apply(null, arguments);
        return new Vec3(this[0] % other[0], this[1] % other[1], this[2] % other[2]);
     }
     Vec3.prototype.abs = function(){
        return new Vec3(Math.abs(this[0]), Math.abs(this[1]), Math.abs(this[2]));
     }
     Vec3.prototype.dot = function(x, y, z){
        var other = getVec3.apply(null, arguments);
        return this[0]*other[0] + this[1]*other[1] + this[2]*other[2];
     }
     Vec3.prototype.cross = function(x, y, z){
        var other = getVec3.apply(null, arguments);
        var x = this[1]*other[2] - other[1]*this[2];
        var y = this[2]*other[0] - other[2]*this[0];
        var z = this[0]*other[1] - other[0]*this[1];
        return new Vec3(x, y, z);
     }
     Vec3.prototype.length = function(length){
        if(arguments.length == 0)
            return Math.sqrt(this.dot(this));
        else{
            return this.mul(length / this.length());
        }
     }
     Vec3.prototype.normalize = function(){
        return this.length(1);
     }
     Vec3.prototype.xyz = Vec3.prototype.rgb = Vec3.prototype.stp = function(x, y, z){
        if(arguments.length == 0)
            return this;
        else
            return new Vec3(x, y, z);
     }
     Vec3.prototype.x = Vec3.prototype.r = Vec3.prototype.s = function(x){
        if(arguments.length == 0)
            return this[0];
        else
            return new Vec3(x, this[1], this[2]);
     }
     Vec3.prototype.y = Vec3.prototype.g = Vec3.prototype.t = function(y){
        if(arguments.length == 0)
            return this[1];
        else
            return new Vec3(this[0], y, this[2]);
     }
     Vec3.prototype.z = Vec3.prototype.b = Vec3.prototype.p = function(z){
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
     var Vec4 = function(x, y, z, w ){
        fillVector(this, 4, arguments)
     }

     function getVec4(){
        if(arguments[0] instanceof Vec4)
            return arguments[0];
        var obj = new Vec4();
        Vec4.apply(obj, arguments);
        return obj;
     }

     Vec4.prototype.add = function(x, y, z, w){
        var other = getVec4.apply(null, arguments);
        return new Vec4(this[0] + other[0], this[1] + other[1], this[2] + other[2], this[3] + other[3]);
     }
     Vec4.prototype.sub = function(x, y, z, w){
        var other = getVec4.apply(null, arguments);
        return new Vec4(this[0] - other[0], this[1] - other[1], this[2] - other[2], this[3] - other[3]);
     }
     Vec4.prototype.mul = function(x, y, z, w){
        var other = getVec4.apply(null, arguments);
        return new Vec4(this[0] * other[0], this[1] * other[1], this[2] * other[2], this[3] * other[3]);
     }
     Vec4.prototype.div = function(x, y, z, w){
        var other = getVec4.apply(null, arguments);
        return new Vec4(this[0] / other[0], this[1] / other[1], this[2] / other[2], this[3] / other[3]);
     }
     Vec4.prototype.mod = function(x, y, z, w){
        var other = getVec4.apply(null, arguments);
        return new Vec4(this[0] % other[0], this[1] % other[1], this[2] % other[2], this[3] % other[3]);
     }
     Vec4.prototype.abs = function(){
        return new Vec4(Math.abs(this[0]), Math.abs(this[1]), Math.abs(this[2]), Math.abs(this[3]));
     }
     Vec4.prototype.dot = function(x, y, z, w){
        var other = getVec4.apply(null, arguments);
        return this[0]*other[0] + this[1]*other[1] + this[2]*other[2] + this[3]*other[3];
     }
     Vec4.prototype.length = function(length){
        if(arguments.length == 0)
            return Math.sqrt(this.dot(this));
        else{
            return this.mul(length / this.length());
        }
     }
     Vec4.prototype.normalize = function(){
        return this.length(1);
     }
     Vec4.prototype.xyzw = Vec4.prototype.rgba = Vec4.prototype.stpq = function(x, y, z, w){
        if(arguments.length == 0)
            return this;
        else
            return getVec4.apply(null, arguments);
     }
     Vec4.prototype.x = Vec4.prototype.r = Vec4.prototype.s = function(x){
        if(arguments.length == 0)
            return this[0];
        else
            return getVec4(x, this[1], this[2], this[3]);
     }

     Vec4.prototype.y = Vec4.prototype.g = Vec4.prototype.t = function(y){
        if(arguments.length == 0)
            return this[1];
        else
            return getVec4(this[0], y, this[2], this[3]);
     }
     Vec4.prototype.z = Vec4.prototype.b = Vec4.prototype.p = function(z){
        if(arguments.length == 0)
            return this[2];
        else
            return getVec4(this[0], this[1], z, this[3]);
     }
     Vec4.prototype.w = Vec4.prototype.a = Vec4.prototype.q = function(w){
        if(arguments.length == 0)
            return this[3];
        else
            return getVec4(this[0], this[1],this[2], w );
     }
     addSwizzles(Vec4.prototype, 4, 2, true);
     addSwizzles(Vec4.prototype, 4, 3, true);
     addSwizzles(Vec4.prototype, 4, 4, true);

     /**
      * The virtual Color type
      * @constructor
      */
     var Color = Vec4;

     var Texture = function(image){
        this.image = image;
     }

     Texture.prototype.sample2D = function(x, y){
        return new Vec4(0,0,0,0);
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
//@ sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyJjOlxcVXNlcnNcXGtyaXN0aWFuXFxyZXBvc19wdWJsaWNcXHNoYWRlanNcXGJ1aWxkXFxzaGFkZS5qcyIsImM6XFxVc2Vyc1xca3Jpc3RpYW5cXHJlcG9zX3B1YmxpY1xcc2hhZGVqc1xcaW5kZXguanMiLCJjOlxcVXNlcnNcXGtyaXN0aWFuXFxyZXBvc19wdWJsaWNcXHNoYWRlanNcXG5vZGVfbW9kdWxlc1xcZXNwcmltYVxcZXNwcmltYS5qcyIsImM6XFxVc2Vyc1xca3Jpc3RpYW5cXHJlcG9zX3B1YmxpY1xcc2hhZGVqc1xcbm9kZV9tb2R1bGVzXFxlc3RyYXZlcnNlXFxlc3RyYXZlcnNlLmpzIiwiYzpcXFVzZXJzXFxrcmlzdGlhblxccmVwb3NfcHVibGljXFxzaGFkZWpzXFxzcmNcXGFuYWx5emVcXHBhcmFtZXRlcnMuanMiLCJjOlxcVXNlcnNcXGtyaXN0aWFuXFxyZXBvc19wdWJsaWNcXHNoYWRlanNcXHNyY1xcYW5hbHl6ZVxcdHlwZWluZmVyZW5jZVxcaW5mZXJfZXhwcmVzc2lvbi5qcyIsImM6XFxVc2Vyc1xca3Jpc3RpYW5cXHJlcG9zX3B1YmxpY1xcc2hhZGVqc1xcc3JjXFxhbmFseXplXFx0eXBlaW5mZXJlbmNlXFxpbmZlcl9zdGF0ZW1lbnQuanMiLCJjOlxcVXNlcnNcXGtyaXN0aWFuXFxyZXBvc19wdWJsaWNcXHNoYWRlanNcXHNyY1xcYW5hbHl6ZVxcdHlwZWluZmVyZW5jZVxccmVnaXN0cnlcXGNvbG9yY2xvc3VyZS5qcyIsImM6XFxVc2Vyc1xca3Jpc3RpYW5cXHJlcG9zX3B1YmxpY1xcc2hhZGVqc1xcc3JjXFxhbmFseXplXFx0eXBlaW5mZXJlbmNlXFxyZWdpc3RyeVxcaW5kZXguanMiLCJjOlxcVXNlcnNcXGtyaXN0aWFuXFxyZXBvc19wdWJsaWNcXHNoYWRlanNcXHNyY1xcYW5hbHl6ZVxcdHlwZWluZmVyZW5jZVxccmVnaXN0cnlcXG1hdGguanMiLCJjOlxcVXNlcnNcXGtyaXN0aWFuXFxyZXBvc19wdWJsaWNcXHNoYWRlanNcXHNyY1xcYW5hbHl6ZVxcdHlwZWluZmVyZW5jZVxccmVnaXN0cnlcXG1hdHJpeC5qcyIsImM6XFxVc2Vyc1xca3Jpc3RpYW5cXHJlcG9zX3B1YmxpY1xcc2hhZGVqc1xcc3JjXFxhbmFseXplXFx0eXBlaW5mZXJlbmNlXFxyZWdpc3RyeVxcc2hhZGUuanMiLCJjOlxcVXNlcnNcXGtyaXN0aWFuXFxyZXBvc19wdWJsaWNcXHNoYWRlanNcXHNyY1xcYW5hbHl6ZVxcdHlwZWluZmVyZW5jZVxccmVnaXN0cnlcXHN5c3RlbS5qcyIsImM6XFxVc2Vyc1xca3Jpc3RpYW5cXHJlcG9zX3B1YmxpY1xcc2hhZGVqc1xcc3JjXFxhbmFseXplXFx0eXBlaW5mZXJlbmNlXFxyZWdpc3RyeVxcdGV4dHVyZS5qcyIsImM6XFxVc2Vyc1xca3Jpc3RpYW5cXHJlcG9zX3B1YmxpY1xcc2hhZGVqc1xcc3JjXFxhbmFseXplXFx0eXBlaW5mZXJlbmNlXFxyZWdpc3RyeVxcdG9vbHMuanMiLCJjOlxcVXNlcnNcXGtyaXN0aWFuXFxyZXBvc19wdWJsaWNcXHNoYWRlanNcXHNyY1xcYW5hbHl6ZVxcdHlwZWluZmVyZW5jZVxccmVnaXN0cnlcXHZlYzIuanMiLCJjOlxcVXNlcnNcXGtyaXN0aWFuXFxyZXBvc19wdWJsaWNcXHNoYWRlanNcXHNyY1xcYW5hbHl6ZVxcdHlwZWluZmVyZW5jZVxccmVnaXN0cnlcXHZlYzMuanMiLCJjOlxcVXNlcnNcXGtyaXN0aWFuXFxyZXBvc19wdWJsaWNcXHNoYWRlanNcXHNyY1xcYW5hbHl6ZVxcdHlwZWluZmVyZW5jZVxccmVnaXN0cnlcXHZlYzQuanMiLCJjOlxcVXNlcnNcXGtyaXN0aWFuXFxyZXBvc19wdWJsaWNcXHNoYWRlanNcXHNyY1xcYW5hbHl6ZVxcdHlwZWluZmVyZW5jZVxcdHlwZWluZmVyZW5jZS5qcyIsImM6XFxVc2Vyc1xca3Jpc3RpYW5cXHJlcG9zX3B1YmxpY1xcc2hhZGVqc1xcc3JjXFxiYXNlXFxhbm5vdGF0aW9uLmpzIiwiYzpcXFVzZXJzXFxrcmlzdGlhblxccmVwb3NfcHVibGljXFxzaGFkZWpzXFxzcmNcXGJhc2VcXGNvbnRleHQuanMiLCJjOlxcVXNlcnNcXGtyaXN0aWFuXFxyZXBvc19wdWJsaWNcXHNoYWRlanNcXHNyY1xcYmFzZVxcaW5kZXguanMiLCJjOlxcVXNlcnNcXGtyaXN0aWFuXFxyZXBvc19wdWJsaWNcXHNoYWRlanNcXHNyY1xcYmFzZVxcdHlwZWluZm8uanMiLCJjOlxcVXNlcnNcXGtyaXN0aWFuXFxyZXBvc19wdWJsaWNcXHNoYWRlanNcXHNyY1xcYmFzZVxcdmVjLmpzIiwiYzpcXFVzZXJzXFxrcmlzdGlhblxccmVwb3NfcHVibGljXFxzaGFkZWpzXFxzcmNcXGdlbmVyYXRlXFxnbHNsXFxjb21waWxlci5qcyIsImM6XFxVc2Vyc1xca3Jpc3RpYW5cXHJlcG9zX3B1YmxpY1xcc2hhZGVqc1xcc3JjXFxnZW5lcmF0ZVxcZ2xzbFxcZ2xzbC1nZW5lcmF0ZS5qcyIsImM6XFxVc2Vyc1xca3Jpc3RpYW5cXHJlcG9zX3B1YmxpY1xcc2hhZGVqc1xcc3JjXFxnZW5lcmF0ZVxcZ2xzbFxccmVnaXN0cnlcXGNvbG9yY2xvc3VyZS5qcyIsImM6XFxVc2Vyc1xca3Jpc3RpYW5cXHJlcG9zX3B1YmxpY1xcc2hhZGVqc1xcc3JjXFxnZW5lcmF0ZVxcZ2xzbFxccmVnaXN0cnlcXGluZGV4LmpzIiwiYzpcXFVzZXJzXFxrcmlzdGlhblxccmVwb3NfcHVibGljXFxzaGFkZWpzXFxzcmNcXGdlbmVyYXRlXFxnbHNsXFxyZWdpc3RyeVxcbWF0aC5qcyIsImM6XFxVc2Vyc1xca3Jpc3RpYW5cXHJlcG9zX3B1YmxpY1xcc2hhZGVqc1xcc3JjXFxnZW5lcmF0ZVxcZ2xzbFxccmVnaXN0cnlcXHNoYWRlLmpzIiwiYzpcXFVzZXJzXFxrcmlzdGlhblxccmVwb3NfcHVibGljXFxzaGFkZWpzXFxzcmNcXGdlbmVyYXRlXFxnbHNsXFxyZWdpc3RyeVxcc3lzdGVtLmpzIiwiYzpcXFVzZXJzXFxrcmlzdGlhblxccmVwb3NfcHVibGljXFxzaGFkZWpzXFxzcmNcXGdlbmVyYXRlXFxnbHNsXFxyZWdpc3RyeVxcdGV4dHVyZS5qcyIsImM6XFxVc2Vyc1xca3Jpc3RpYW5cXHJlcG9zX3B1YmxpY1xcc2hhZGVqc1xcc3JjXFxnZW5lcmF0ZVxcZ2xzbFxccmVnaXN0cnlcXHRvb2xzLmpzIiwiYzpcXFVzZXJzXFxrcmlzdGlhblxccmVwb3NfcHVibGljXFxzaGFkZWpzXFxzcmNcXGdlbmVyYXRlXFxnbHNsXFxyZWdpc3RyeVxcdmVjMi5qcyIsImM6XFxVc2Vyc1xca3Jpc3RpYW5cXHJlcG9zX3B1YmxpY1xcc2hhZGVqc1xcc3JjXFxnZW5lcmF0ZVxcZ2xzbFxccmVnaXN0cnlcXHZlYzMuanMiLCJjOlxcVXNlcnNcXGtyaXN0aWFuXFxyZXBvc19wdWJsaWNcXHNoYWRlanNcXHNyY1xcZ2VuZXJhdGVcXGdsc2xcXHJlZ2lzdHJ5XFx2ZWM0LmpzIiwiYzpcXFVzZXJzXFxrcmlzdGlhblxccmVwb3NfcHVibGljXFxzaGFkZWpzXFxzcmNcXGdlbmVyYXRlXFxnbHNsXFx0cmFuc2Zvcm0uanMiLCJjOlxcVXNlcnNcXGtyaXN0aWFuXFxyZXBvc19wdWJsaWNcXHNoYWRlanNcXHNyY1xcaW50ZXJmYWNlcy5qcyIsImM6XFxVc2Vyc1xca3Jpc3RpYW5cXHJlcG9zX3B1YmxpY1xcc2hhZGVqc1xcc3JjXFxzaGFkZS5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNKQTs7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcDBIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzVEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pnQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaFBBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUlBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9MQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN1FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaFRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqT0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9TQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0tBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvZEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0Y0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgZ2xvYmFsID0gdHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCcgPyB3aW5kb3cgOiB7fTtcbiAgICBnbG9iYWwuU2hhZGUgPSByZXF1aXJlKFwiLi4vaW5kZXguanNcIik7XG59KCkpO1xuIiwibW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKCcuL3NyYy9zaGFkZS5qcycpOyIsIi8qXG4gIENvcHlyaWdodCAoQykgMjAxMiBBcml5YSBIaWRheWF0IDxhcml5YS5oaWRheWF0QGdtYWlsLmNvbT5cbiAgQ29weXJpZ2h0IChDKSAyMDEyIE1hdGhpYXMgQnluZW5zIDxtYXRoaWFzQHFpd2kuYmU+XG4gIENvcHlyaWdodCAoQykgMjAxMiBKb29zdC1XaW0gQm9la2VzdGVpam4gPGpvb3N0LXdpbUBib2VrZXN0ZWlqbi5ubD5cbiAgQ29weXJpZ2h0IChDKSAyMDEyIEtyaXMgS293YWwgPGtyaXMua293YWxAY2l4YXIuY29tPlxuICBDb3B5cmlnaHQgKEMpIDIwMTIgWXVzdWtlIFN1enVraSA8dXRhdGFuZS50ZWFAZ21haWwuY29tPlxuICBDb3B5cmlnaHQgKEMpIDIwMTIgQXJwYWQgQm9yc29zIDxhcnBhZC5ib3Jzb3NAZ29vZ2xlbWFpbC5jb20+XG4gIENvcHlyaWdodCAoQykgMjAxMSBBcml5YSBIaWRheWF0IDxhcml5YS5oaWRheWF0QGdtYWlsLmNvbT5cblxuICBSZWRpc3RyaWJ1dGlvbiBhbmQgdXNlIGluIHNvdXJjZSBhbmQgYmluYXJ5IGZvcm1zLCB3aXRoIG9yIHdpdGhvdXRcbiAgbW9kaWZpY2F0aW9uLCBhcmUgcGVybWl0dGVkIHByb3ZpZGVkIHRoYXQgdGhlIGZvbGxvd2luZyBjb25kaXRpb25zIGFyZSBtZXQ6XG5cbiAgICAqIFJlZGlzdHJpYnV0aW9ucyBvZiBzb3VyY2UgY29kZSBtdXN0IHJldGFpbiB0aGUgYWJvdmUgY29weXJpZ2h0XG4gICAgICBub3RpY2UsIHRoaXMgbGlzdCBvZiBjb25kaXRpb25zIGFuZCB0aGUgZm9sbG93aW5nIGRpc2NsYWltZXIuXG4gICAgKiBSZWRpc3RyaWJ1dGlvbnMgaW4gYmluYXJ5IGZvcm0gbXVzdCByZXByb2R1Y2UgdGhlIGFib3ZlIGNvcHlyaWdodFxuICAgICAgbm90aWNlLCB0aGlzIGxpc3Qgb2YgY29uZGl0aW9ucyBhbmQgdGhlIGZvbGxvd2luZyBkaXNjbGFpbWVyIGluIHRoZVxuICAgICAgZG9jdW1lbnRhdGlvbiBhbmQvb3Igb3RoZXIgbWF0ZXJpYWxzIHByb3ZpZGVkIHdpdGggdGhlIGRpc3RyaWJ1dGlvbi5cblxuICBUSElTIFNPRlRXQVJFIElTIFBST1ZJREVEIEJZIFRIRSBDT1BZUklHSFQgSE9MREVSUyBBTkQgQ09OVFJJQlVUT1JTIFwiQVMgSVNcIlxuICBBTkQgQU5ZIEVYUFJFU1MgT1IgSU1QTElFRCBXQVJSQU5USUVTLCBJTkNMVURJTkcsIEJVVCBOT1QgTElNSVRFRCBUTywgVEhFXG4gIElNUExJRUQgV0FSUkFOVElFUyBPRiBNRVJDSEFOVEFCSUxJVFkgQU5EIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFXG4gIEFSRSBESVNDTEFJTUVELiBJTiBOTyBFVkVOVCBTSEFMTCA8Q09QWVJJR0hUIEhPTERFUj4gQkUgTElBQkxFIEZPUiBBTllcbiAgRElSRUNULCBJTkRJUkVDVCwgSU5DSURFTlRBTCwgU1BFQ0lBTCwgRVhFTVBMQVJZLCBPUiBDT05TRVFVRU5USUFMIERBTUFHRVNcbiAgKElOQ0xVRElORywgQlVUIE5PVCBMSU1JVEVEIFRPLCBQUk9DVVJFTUVOVCBPRiBTVUJTVElUVVRFIEdPT0RTIE9SIFNFUlZJQ0VTO1xuICBMT1NTIE9GIFVTRSwgREFUQSwgT1IgUFJPRklUUzsgT1IgQlVTSU5FU1MgSU5URVJSVVBUSU9OKSBIT1dFVkVSIENBVVNFRCBBTkRcbiAgT04gQU5ZIFRIRU9SWSBPRiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQ09OVFJBQ1QsIFNUUklDVCBMSUFCSUxJVFksIE9SIFRPUlRcbiAgKElOQ0xVRElORyBORUdMSUdFTkNFIE9SIE9USEVSV0lTRSkgQVJJU0lORyBJTiBBTlkgV0FZIE9VVCBPRiBUSEUgVVNFIE9GXG4gIFRISVMgU09GVFdBUkUsIEVWRU4gSUYgQURWSVNFRCBPRiBUSEUgUE9TU0lCSUxJVFkgT0YgU1VDSCBEQU1BR0UuXG4qL1xuXG4vKmpzbGludCBiaXR3aXNlOnRydWUgcGx1c3BsdXM6dHJ1ZSAqL1xuLypnbG9iYWwgZXNwcmltYTp0cnVlLCBkZWZpbmU6dHJ1ZSwgZXhwb3J0czp0cnVlLCB3aW5kb3c6IHRydWUsXG50aHJvd0Vycm9yOiB0cnVlLCBjcmVhdGVMaXRlcmFsOiB0cnVlLCBnZW5lcmF0ZVN0YXRlbWVudDogdHJ1ZSxcbnBhcnNlQXNzaWdubWVudEV4cHJlc3Npb246IHRydWUsIHBhcnNlQmxvY2s6IHRydWUsIHBhcnNlRXhwcmVzc2lvbjogdHJ1ZSxcbnBhcnNlRnVuY3Rpb25EZWNsYXJhdGlvbjogdHJ1ZSwgcGFyc2VGdW5jdGlvbkV4cHJlc3Npb246IHRydWUsXG5wYXJzZUZ1bmN0aW9uU291cmNlRWxlbWVudHM6IHRydWUsIHBhcnNlVmFyaWFibGVJZGVudGlmaWVyOiB0cnVlLFxucGFyc2VMZWZ0SGFuZFNpZGVFeHByZXNzaW9uOiB0cnVlLFxucGFyc2VTdGF0ZW1lbnQ6IHRydWUsIHBhcnNlU291cmNlRWxlbWVudDogdHJ1ZSAqL1xuXG4oZnVuY3Rpb24gKHJvb3QsIGZhY3RvcnkpIHtcbiAgICAndXNlIHN0cmljdCc7XG5cbiAgICAvLyBVbml2ZXJzYWwgTW9kdWxlIERlZmluaXRpb24gKFVNRCkgdG8gc3VwcG9ydCBBTUQsIENvbW1vbkpTL05vZGUuanMsXG4gICAgLy8gUmhpbm8sIGFuZCBwbGFpbiBicm93c2VyIGxvYWRpbmcuXG4gICAgaWYgKHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCkge1xuICAgICAgICBkZWZpbmUoWydleHBvcnRzJ10sIGZhY3RvcnkpO1xuICAgIH0gZWxzZSBpZiAodHlwZW9mIGV4cG9ydHMgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgIGZhY3RvcnkoZXhwb3J0cyk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgZmFjdG9yeSgocm9vdC5lc3ByaW1hID0ge30pKTtcbiAgICB9XG59KHRoaXMsIGZ1bmN0aW9uIChleHBvcnRzKSB7XG4gICAgJ3VzZSBzdHJpY3QnO1xuXG4gICAgdmFyIFRva2VuLFxuICAgICAgICBUb2tlbk5hbWUsXG4gICAgICAgIFN5bnRheCxcbiAgICAgICAgUHJvcGVydHlLaW5kLFxuICAgICAgICBNZXNzYWdlcyxcbiAgICAgICAgUmVnZXgsXG4gICAgICAgIHNvdXJjZSxcbiAgICAgICAgc3RyaWN0LFxuICAgICAgICBpbmRleCxcbiAgICAgICAgbGluZU51bWJlcixcbiAgICAgICAgbGluZVN0YXJ0LFxuICAgICAgICBsZW5ndGgsXG4gICAgICAgIGJ1ZmZlcixcbiAgICAgICAgc3RhdGUsXG4gICAgICAgIGV4dHJhO1xuXG4gICAgVG9rZW4gPSB7XG4gICAgICAgIEJvb2xlYW5MaXRlcmFsOiAxLFxuICAgICAgICBFT0Y6IDIsXG4gICAgICAgIElkZW50aWZpZXI6IDMsXG4gICAgICAgIEtleXdvcmQ6IDQsXG4gICAgICAgIE51bGxMaXRlcmFsOiA1LFxuICAgICAgICBOdW1lcmljTGl0ZXJhbDogNixcbiAgICAgICAgUHVuY3R1YXRvcjogNyxcbiAgICAgICAgU3RyaW5nTGl0ZXJhbDogOFxuICAgIH07XG5cbiAgICBUb2tlbk5hbWUgPSB7fTtcbiAgICBUb2tlbk5hbWVbVG9rZW4uQm9vbGVhbkxpdGVyYWxdID0gJ0Jvb2xlYW4nO1xuICAgIFRva2VuTmFtZVtUb2tlbi5FT0ZdID0gJzxlbmQ+JztcbiAgICBUb2tlbk5hbWVbVG9rZW4uSWRlbnRpZmllcl0gPSAnSWRlbnRpZmllcic7XG4gICAgVG9rZW5OYW1lW1Rva2VuLktleXdvcmRdID0gJ0tleXdvcmQnO1xuICAgIFRva2VuTmFtZVtUb2tlbi5OdWxsTGl0ZXJhbF0gPSAnTnVsbCc7XG4gICAgVG9rZW5OYW1lW1Rva2VuLk51bWVyaWNMaXRlcmFsXSA9ICdOdW1lcmljJztcbiAgICBUb2tlbk5hbWVbVG9rZW4uUHVuY3R1YXRvcl0gPSAnUHVuY3R1YXRvcic7XG4gICAgVG9rZW5OYW1lW1Rva2VuLlN0cmluZ0xpdGVyYWxdID0gJ1N0cmluZyc7XG5cbiAgICBTeW50YXggPSB7XG4gICAgICAgIEFzc2lnbm1lbnRFeHByZXNzaW9uOiAnQXNzaWdubWVudEV4cHJlc3Npb24nLFxuICAgICAgICBBcnJheUV4cHJlc3Npb246ICdBcnJheUV4cHJlc3Npb24nLFxuICAgICAgICBCbG9ja1N0YXRlbWVudDogJ0Jsb2NrU3RhdGVtZW50JyxcbiAgICAgICAgQmluYXJ5RXhwcmVzc2lvbjogJ0JpbmFyeUV4cHJlc3Npb24nLFxuICAgICAgICBCcmVha1N0YXRlbWVudDogJ0JyZWFrU3RhdGVtZW50JyxcbiAgICAgICAgQ2FsbEV4cHJlc3Npb246ICdDYWxsRXhwcmVzc2lvbicsXG4gICAgICAgIENhdGNoQ2xhdXNlOiAnQ2F0Y2hDbGF1c2UnLFxuICAgICAgICBDb25kaXRpb25hbEV4cHJlc3Npb246ICdDb25kaXRpb25hbEV4cHJlc3Npb24nLFxuICAgICAgICBDb250aW51ZVN0YXRlbWVudDogJ0NvbnRpbnVlU3RhdGVtZW50JyxcbiAgICAgICAgRG9XaGlsZVN0YXRlbWVudDogJ0RvV2hpbGVTdGF0ZW1lbnQnLFxuICAgICAgICBEZWJ1Z2dlclN0YXRlbWVudDogJ0RlYnVnZ2VyU3RhdGVtZW50JyxcbiAgICAgICAgRW1wdHlTdGF0ZW1lbnQ6ICdFbXB0eVN0YXRlbWVudCcsXG4gICAgICAgIEV4cHJlc3Npb25TdGF0ZW1lbnQ6ICdFeHByZXNzaW9uU3RhdGVtZW50JyxcbiAgICAgICAgRm9yU3RhdGVtZW50OiAnRm9yU3RhdGVtZW50JyxcbiAgICAgICAgRm9ySW5TdGF0ZW1lbnQ6ICdGb3JJblN0YXRlbWVudCcsXG4gICAgICAgIEZ1bmN0aW9uRGVjbGFyYXRpb246ICdGdW5jdGlvbkRlY2xhcmF0aW9uJyxcbiAgICAgICAgRnVuY3Rpb25FeHByZXNzaW9uOiAnRnVuY3Rpb25FeHByZXNzaW9uJyxcbiAgICAgICAgSWRlbnRpZmllcjogJ0lkZW50aWZpZXInLFxuICAgICAgICBJZlN0YXRlbWVudDogJ0lmU3RhdGVtZW50JyxcbiAgICAgICAgTGl0ZXJhbDogJ0xpdGVyYWwnLFxuICAgICAgICBMYWJlbGVkU3RhdGVtZW50OiAnTGFiZWxlZFN0YXRlbWVudCcsXG4gICAgICAgIExvZ2ljYWxFeHByZXNzaW9uOiAnTG9naWNhbEV4cHJlc3Npb24nLFxuICAgICAgICBNZW1iZXJFeHByZXNzaW9uOiAnTWVtYmVyRXhwcmVzc2lvbicsXG4gICAgICAgIE5ld0V4cHJlc3Npb246ICdOZXdFeHByZXNzaW9uJyxcbiAgICAgICAgT2JqZWN0RXhwcmVzc2lvbjogJ09iamVjdEV4cHJlc3Npb24nLFxuICAgICAgICBQcm9ncmFtOiAnUHJvZ3JhbScsXG4gICAgICAgIFByb3BlcnR5OiAnUHJvcGVydHknLFxuICAgICAgICBSZXR1cm5TdGF0ZW1lbnQ6ICdSZXR1cm5TdGF0ZW1lbnQnLFxuICAgICAgICBTZXF1ZW5jZUV4cHJlc3Npb246ICdTZXF1ZW5jZUV4cHJlc3Npb24nLFxuICAgICAgICBTd2l0Y2hTdGF0ZW1lbnQ6ICdTd2l0Y2hTdGF0ZW1lbnQnLFxuICAgICAgICBTd2l0Y2hDYXNlOiAnU3dpdGNoQ2FzZScsXG4gICAgICAgIFRoaXNFeHByZXNzaW9uOiAnVGhpc0V4cHJlc3Npb24nLFxuICAgICAgICBUaHJvd1N0YXRlbWVudDogJ1Rocm93U3RhdGVtZW50JyxcbiAgICAgICAgVHJ5U3RhdGVtZW50OiAnVHJ5U3RhdGVtZW50JyxcbiAgICAgICAgVW5hcnlFeHByZXNzaW9uOiAnVW5hcnlFeHByZXNzaW9uJyxcbiAgICAgICAgVXBkYXRlRXhwcmVzc2lvbjogJ1VwZGF0ZUV4cHJlc3Npb24nLFxuICAgICAgICBWYXJpYWJsZURlY2xhcmF0aW9uOiAnVmFyaWFibGVEZWNsYXJhdGlvbicsXG4gICAgICAgIFZhcmlhYmxlRGVjbGFyYXRvcjogJ1ZhcmlhYmxlRGVjbGFyYXRvcicsXG4gICAgICAgIFdoaWxlU3RhdGVtZW50OiAnV2hpbGVTdGF0ZW1lbnQnLFxuICAgICAgICBXaXRoU3RhdGVtZW50OiAnV2l0aFN0YXRlbWVudCdcbiAgICB9O1xuXG4gICAgUHJvcGVydHlLaW5kID0ge1xuICAgICAgICBEYXRhOiAxLFxuICAgICAgICBHZXQ6IDIsXG4gICAgICAgIFNldDogNFxuICAgIH07XG5cbiAgICAvLyBFcnJvciBtZXNzYWdlcyBzaG91bGQgYmUgaWRlbnRpY2FsIHRvIFY4LlxuICAgIE1lc3NhZ2VzID0ge1xuICAgICAgICBVbmV4cGVjdGVkVG9rZW46ICAnVW5leHBlY3RlZCB0b2tlbiAlMCcsXG4gICAgICAgIFVuZXhwZWN0ZWROdW1iZXI6ICAnVW5leHBlY3RlZCBudW1iZXInLFxuICAgICAgICBVbmV4cGVjdGVkU3RyaW5nOiAgJ1VuZXhwZWN0ZWQgc3RyaW5nJyxcbiAgICAgICAgVW5leHBlY3RlZElkZW50aWZpZXI6ICAnVW5leHBlY3RlZCBpZGVudGlmaWVyJyxcbiAgICAgICAgVW5leHBlY3RlZFJlc2VydmVkOiAgJ1VuZXhwZWN0ZWQgcmVzZXJ2ZWQgd29yZCcsXG4gICAgICAgIFVuZXhwZWN0ZWRFT1M6ICAnVW5leHBlY3RlZCBlbmQgb2YgaW5wdXQnLFxuICAgICAgICBOZXdsaW5lQWZ0ZXJUaHJvdzogICdJbGxlZ2FsIG5ld2xpbmUgYWZ0ZXIgdGhyb3cnLFxuICAgICAgICBJbnZhbGlkUmVnRXhwOiAnSW52YWxpZCByZWd1bGFyIGV4cHJlc3Npb24nLFxuICAgICAgICBVbnRlcm1pbmF0ZWRSZWdFeHA6ICAnSW52YWxpZCByZWd1bGFyIGV4cHJlc3Npb246IG1pc3NpbmcgLycsXG4gICAgICAgIEludmFsaWRMSFNJbkFzc2lnbm1lbnQ6ICAnSW52YWxpZCBsZWZ0LWhhbmQgc2lkZSBpbiBhc3NpZ25tZW50JyxcbiAgICAgICAgSW52YWxpZExIU0luRm9ySW46ICAnSW52YWxpZCBsZWZ0LWhhbmQgc2lkZSBpbiBmb3ItaW4nLFxuICAgICAgICBNdWx0aXBsZURlZmF1bHRzSW5Td2l0Y2g6ICdNb3JlIHRoYW4gb25lIGRlZmF1bHQgY2xhdXNlIGluIHN3aXRjaCBzdGF0ZW1lbnQnLFxuICAgICAgICBOb0NhdGNoT3JGaW5hbGx5OiAgJ01pc3NpbmcgY2F0Y2ggb3IgZmluYWxseSBhZnRlciB0cnknLFxuICAgICAgICBVbmtub3duTGFiZWw6ICdVbmRlZmluZWQgbGFiZWwgXFwnJTBcXCcnLFxuICAgICAgICBSZWRlY2xhcmF0aW9uOiAnJTAgXFwnJTFcXCcgaGFzIGFscmVhZHkgYmVlbiBkZWNsYXJlZCcsXG4gICAgICAgIElsbGVnYWxDb250aW51ZTogJ0lsbGVnYWwgY29udGludWUgc3RhdGVtZW50JyxcbiAgICAgICAgSWxsZWdhbEJyZWFrOiAnSWxsZWdhbCBicmVhayBzdGF0ZW1lbnQnLFxuICAgICAgICBJbGxlZ2FsUmV0dXJuOiAnSWxsZWdhbCByZXR1cm4gc3RhdGVtZW50JyxcbiAgICAgICAgU3RyaWN0TW9kZVdpdGg6ICAnU3RyaWN0IG1vZGUgY29kZSBtYXkgbm90IGluY2x1ZGUgYSB3aXRoIHN0YXRlbWVudCcsXG4gICAgICAgIFN0cmljdENhdGNoVmFyaWFibGU6ICAnQ2F0Y2ggdmFyaWFibGUgbWF5IG5vdCBiZSBldmFsIG9yIGFyZ3VtZW50cyBpbiBzdHJpY3QgbW9kZScsXG4gICAgICAgIFN0cmljdFZhck5hbWU6ICAnVmFyaWFibGUgbmFtZSBtYXkgbm90IGJlIGV2YWwgb3IgYXJndW1lbnRzIGluIHN0cmljdCBtb2RlJyxcbiAgICAgICAgU3RyaWN0UGFyYW1OYW1lOiAgJ1BhcmFtZXRlciBuYW1lIGV2YWwgb3IgYXJndW1lbnRzIGlzIG5vdCBhbGxvd2VkIGluIHN0cmljdCBtb2RlJyxcbiAgICAgICAgU3RyaWN0UGFyYW1EdXBlOiAnU3RyaWN0IG1vZGUgZnVuY3Rpb24gbWF5IG5vdCBoYXZlIGR1cGxpY2F0ZSBwYXJhbWV0ZXIgbmFtZXMnLFxuICAgICAgICBTdHJpY3RGdW5jdGlvbk5hbWU6ICAnRnVuY3Rpb24gbmFtZSBtYXkgbm90IGJlIGV2YWwgb3IgYXJndW1lbnRzIGluIHN0cmljdCBtb2RlJyxcbiAgICAgICAgU3RyaWN0T2N0YWxMaXRlcmFsOiAgJ09jdGFsIGxpdGVyYWxzIGFyZSBub3QgYWxsb3dlZCBpbiBzdHJpY3QgbW9kZS4nLFxuICAgICAgICBTdHJpY3REZWxldGU6ICAnRGVsZXRlIG9mIGFuIHVucXVhbGlmaWVkIGlkZW50aWZpZXIgaW4gc3RyaWN0IG1vZGUuJyxcbiAgICAgICAgU3RyaWN0RHVwbGljYXRlUHJvcGVydHk6ICAnRHVwbGljYXRlIGRhdGEgcHJvcGVydHkgaW4gb2JqZWN0IGxpdGVyYWwgbm90IGFsbG93ZWQgaW4gc3RyaWN0IG1vZGUnLFxuICAgICAgICBBY2Nlc3NvckRhdGFQcm9wZXJ0eTogICdPYmplY3QgbGl0ZXJhbCBtYXkgbm90IGhhdmUgZGF0YSBhbmQgYWNjZXNzb3IgcHJvcGVydHkgd2l0aCB0aGUgc2FtZSBuYW1lJyxcbiAgICAgICAgQWNjZXNzb3JHZXRTZXQ6ICAnT2JqZWN0IGxpdGVyYWwgbWF5IG5vdCBoYXZlIG11bHRpcGxlIGdldC9zZXQgYWNjZXNzb3JzIHdpdGggdGhlIHNhbWUgbmFtZScsXG4gICAgICAgIFN0cmljdExIU0Fzc2lnbm1lbnQ6ICAnQXNzaWdubWVudCB0byBldmFsIG9yIGFyZ3VtZW50cyBpcyBub3QgYWxsb3dlZCBpbiBzdHJpY3QgbW9kZScsXG4gICAgICAgIFN0cmljdExIU1Bvc3RmaXg6ICAnUG9zdGZpeCBpbmNyZW1lbnQvZGVjcmVtZW50IG1heSBub3QgaGF2ZSBldmFsIG9yIGFyZ3VtZW50cyBvcGVyYW5kIGluIHN0cmljdCBtb2RlJyxcbiAgICAgICAgU3RyaWN0TEhTUHJlZml4OiAgJ1ByZWZpeCBpbmNyZW1lbnQvZGVjcmVtZW50IG1heSBub3QgaGF2ZSBldmFsIG9yIGFyZ3VtZW50cyBvcGVyYW5kIGluIHN0cmljdCBtb2RlJyxcbiAgICAgICAgU3RyaWN0UmVzZXJ2ZWRXb3JkOiAgJ1VzZSBvZiBmdXR1cmUgcmVzZXJ2ZWQgd29yZCBpbiBzdHJpY3QgbW9kZSdcbiAgICB9O1xuXG4gICAgLy8gU2VlIGFsc28gdG9vbHMvZ2VuZXJhdGUtdW5pY29kZS1yZWdleC5weS5cbiAgICBSZWdleCA9IHtcbiAgICAgICAgTm9uQXNjaWlJZGVudGlmaWVyU3RhcnQ6IG5ldyBSZWdFeHAoJ1tcXHhhYVxceGI1XFx4YmFcXHhjMC1cXHhkNlxceGQ4LVxceGY2XFx4ZjgtXFx1MDJjMVxcdTAyYzYtXFx1MDJkMVxcdTAyZTAtXFx1MDJlNFxcdTAyZWNcXHUwMmVlXFx1MDM3MC1cXHUwMzc0XFx1MDM3NlxcdTAzNzdcXHUwMzdhLVxcdTAzN2RcXHUwMzg2XFx1MDM4OC1cXHUwMzhhXFx1MDM4Y1xcdTAzOGUtXFx1MDNhMVxcdTAzYTMtXFx1MDNmNVxcdTAzZjctXFx1MDQ4MVxcdTA0OGEtXFx1MDUyN1xcdTA1MzEtXFx1MDU1NlxcdTA1NTlcXHUwNTYxLVxcdTA1ODdcXHUwNWQwLVxcdTA1ZWFcXHUwNWYwLVxcdTA1ZjJcXHUwNjIwLVxcdTA2NGFcXHUwNjZlXFx1MDY2ZlxcdTA2NzEtXFx1MDZkM1xcdTA2ZDVcXHUwNmU1XFx1MDZlNlxcdTA2ZWVcXHUwNmVmXFx1MDZmYS1cXHUwNmZjXFx1MDZmZlxcdTA3MTBcXHUwNzEyLVxcdTA3MmZcXHUwNzRkLVxcdTA3YTVcXHUwN2IxXFx1MDdjYS1cXHUwN2VhXFx1MDdmNFxcdTA3ZjVcXHUwN2ZhXFx1MDgwMC1cXHUwODE1XFx1MDgxYVxcdTA4MjRcXHUwODI4XFx1MDg0MC1cXHUwODU4XFx1MDhhMFxcdTA4YTItXFx1MDhhY1xcdTA5MDQtXFx1MDkzOVxcdTA5M2RcXHUwOTUwXFx1MDk1OC1cXHUwOTYxXFx1MDk3MS1cXHUwOTc3XFx1MDk3OS1cXHUwOTdmXFx1MDk4NS1cXHUwOThjXFx1MDk4ZlxcdTA5OTBcXHUwOTkzLVxcdTA5YThcXHUwOWFhLVxcdTA5YjBcXHUwOWIyXFx1MDliNi1cXHUwOWI5XFx1MDliZFxcdTA5Y2VcXHUwOWRjXFx1MDlkZFxcdTA5ZGYtXFx1MDllMVxcdTA5ZjBcXHUwOWYxXFx1MGEwNS1cXHUwYTBhXFx1MGEwZlxcdTBhMTBcXHUwYTEzLVxcdTBhMjhcXHUwYTJhLVxcdTBhMzBcXHUwYTMyXFx1MGEzM1xcdTBhMzVcXHUwYTM2XFx1MGEzOFxcdTBhMzlcXHUwYTU5LVxcdTBhNWNcXHUwYTVlXFx1MGE3Mi1cXHUwYTc0XFx1MGE4NS1cXHUwYThkXFx1MGE4Zi1cXHUwYTkxXFx1MGE5My1cXHUwYWE4XFx1MGFhYS1cXHUwYWIwXFx1MGFiMlxcdTBhYjNcXHUwYWI1LVxcdTBhYjlcXHUwYWJkXFx1MGFkMFxcdTBhZTBcXHUwYWUxXFx1MGIwNS1cXHUwYjBjXFx1MGIwZlxcdTBiMTBcXHUwYjEzLVxcdTBiMjhcXHUwYjJhLVxcdTBiMzBcXHUwYjMyXFx1MGIzM1xcdTBiMzUtXFx1MGIzOVxcdTBiM2RcXHUwYjVjXFx1MGI1ZFxcdTBiNWYtXFx1MGI2MVxcdTBiNzFcXHUwYjgzXFx1MGI4NS1cXHUwYjhhXFx1MGI4ZS1cXHUwYjkwXFx1MGI5Mi1cXHUwYjk1XFx1MGI5OVxcdTBiOWFcXHUwYjljXFx1MGI5ZVxcdTBiOWZcXHUwYmEzXFx1MGJhNFxcdTBiYTgtXFx1MGJhYVxcdTBiYWUtXFx1MGJiOVxcdTBiZDBcXHUwYzA1LVxcdTBjMGNcXHUwYzBlLVxcdTBjMTBcXHUwYzEyLVxcdTBjMjhcXHUwYzJhLVxcdTBjMzNcXHUwYzM1LVxcdTBjMzlcXHUwYzNkXFx1MGM1OFxcdTBjNTlcXHUwYzYwXFx1MGM2MVxcdTBjODUtXFx1MGM4Y1xcdTBjOGUtXFx1MGM5MFxcdTBjOTItXFx1MGNhOFxcdTBjYWEtXFx1MGNiM1xcdTBjYjUtXFx1MGNiOVxcdTBjYmRcXHUwY2RlXFx1MGNlMFxcdTBjZTFcXHUwY2YxXFx1MGNmMlxcdTBkMDUtXFx1MGQwY1xcdTBkMGUtXFx1MGQxMFxcdTBkMTItXFx1MGQzYVxcdTBkM2RcXHUwZDRlXFx1MGQ2MFxcdTBkNjFcXHUwZDdhLVxcdTBkN2ZcXHUwZDg1LVxcdTBkOTZcXHUwZDlhLVxcdTBkYjFcXHUwZGIzLVxcdTBkYmJcXHUwZGJkXFx1MGRjMC1cXHUwZGM2XFx1MGUwMS1cXHUwZTMwXFx1MGUzMlxcdTBlMzNcXHUwZTQwLVxcdTBlNDZcXHUwZTgxXFx1MGU4MlxcdTBlODRcXHUwZTg3XFx1MGU4OFxcdTBlOGFcXHUwZThkXFx1MGU5NC1cXHUwZTk3XFx1MGU5OS1cXHUwZTlmXFx1MGVhMS1cXHUwZWEzXFx1MGVhNVxcdTBlYTdcXHUwZWFhXFx1MGVhYlxcdTBlYWQtXFx1MGViMFxcdTBlYjJcXHUwZWIzXFx1MGViZFxcdTBlYzAtXFx1MGVjNFxcdTBlYzZcXHUwZWRjLVxcdTBlZGZcXHUwZjAwXFx1MGY0MC1cXHUwZjQ3XFx1MGY0OS1cXHUwZjZjXFx1MGY4OC1cXHUwZjhjXFx1MTAwMC1cXHUxMDJhXFx1MTAzZlxcdTEwNTAtXFx1MTA1NVxcdTEwNWEtXFx1MTA1ZFxcdTEwNjFcXHUxMDY1XFx1MTA2NlxcdTEwNmUtXFx1MTA3MFxcdTEwNzUtXFx1MTA4MVxcdTEwOGVcXHUxMGEwLVxcdTEwYzVcXHUxMGM3XFx1MTBjZFxcdTEwZDAtXFx1MTBmYVxcdTEwZmMtXFx1MTI0OFxcdTEyNGEtXFx1MTI0ZFxcdTEyNTAtXFx1MTI1NlxcdTEyNThcXHUxMjVhLVxcdTEyNWRcXHUxMjYwLVxcdTEyODhcXHUxMjhhLVxcdTEyOGRcXHUxMjkwLVxcdTEyYjBcXHUxMmIyLVxcdTEyYjVcXHUxMmI4LVxcdTEyYmVcXHUxMmMwXFx1MTJjMi1cXHUxMmM1XFx1MTJjOC1cXHUxMmQ2XFx1MTJkOC1cXHUxMzEwXFx1MTMxMi1cXHUxMzE1XFx1MTMxOC1cXHUxMzVhXFx1MTM4MC1cXHUxMzhmXFx1MTNhMC1cXHUxM2Y0XFx1MTQwMS1cXHUxNjZjXFx1MTY2Zi1cXHUxNjdmXFx1MTY4MS1cXHUxNjlhXFx1MTZhMC1cXHUxNmVhXFx1MTZlZS1cXHUxNmYwXFx1MTcwMC1cXHUxNzBjXFx1MTcwZS1cXHUxNzExXFx1MTcyMC1cXHUxNzMxXFx1MTc0MC1cXHUxNzUxXFx1MTc2MC1cXHUxNzZjXFx1MTc2ZS1cXHUxNzcwXFx1MTc4MC1cXHUxN2IzXFx1MTdkN1xcdTE3ZGNcXHUxODIwLVxcdTE4NzdcXHUxODgwLVxcdTE4YThcXHUxOGFhXFx1MThiMC1cXHUxOGY1XFx1MTkwMC1cXHUxOTFjXFx1MTk1MC1cXHUxOTZkXFx1MTk3MC1cXHUxOTc0XFx1MTk4MC1cXHUxOWFiXFx1MTljMS1cXHUxOWM3XFx1MWEwMC1cXHUxYTE2XFx1MWEyMC1cXHUxYTU0XFx1MWFhN1xcdTFiMDUtXFx1MWIzM1xcdTFiNDUtXFx1MWI0YlxcdTFiODMtXFx1MWJhMFxcdTFiYWVcXHUxYmFmXFx1MWJiYS1cXHUxYmU1XFx1MWMwMC1cXHUxYzIzXFx1MWM0ZC1cXHUxYzRmXFx1MWM1YS1cXHUxYzdkXFx1MWNlOS1cXHUxY2VjXFx1MWNlZS1cXHUxY2YxXFx1MWNmNVxcdTFjZjZcXHUxZDAwLVxcdTFkYmZcXHUxZTAwLVxcdTFmMTVcXHUxZjE4LVxcdTFmMWRcXHUxZjIwLVxcdTFmNDVcXHUxZjQ4LVxcdTFmNGRcXHUxZjUwLVxcdTFmNTdcXHUxZjU5XFx1MWY1YlxcdTFmNWRcXHUxZjVmLVxcdTFmN2RcXHUxZjgwLVxcdTFmYjRcXHUxZmI2LVxcdTFmYmNcXHUxZmJlXFx1MWZjMi1cXHUxZmM0XFx1MWZjNi1cXHUxZmNjXFx1MWZkMC1cXHUxZmQzXFx1MWZkNi1cXHUxZmRiXFx1MWZlMC1cXHUxZmVjXFx1MWZmMi1cXHUxZmY0XFx1MWZmNi1cXHUxZmZjXFx1MjA3MVxcdTIwN2ZcXHUyMDkwLVxcdTIwOWNcXHUyMTAyXFx1MjEwN1xcdTIxMGEtXFx1MjExM1xcdTIxMTVcXHUyMTE5LVxcdTIxMWRcXHUyMTI0XFx1MjEyNlxcdTIxMjhcXHUyMTJhLVxcdTIxMmRcXHUyMTJmLVxcdTIxMzlcXHUyMTNjLVxcdTIxM2ZcXHUyMTQ1LVxcdTIxNDlcXHUyMTRlXFx1MjE2MC1cXHUyMTg4XFx1MmMwMC1cXHUyYzJlXFx1MmMzMC1cXHUyYzVlXFx1MmM2MC1cXHUyY2U0XFx1MmNlYi1cXHUyY2VlXFx1MmNmMlxcdTJjZjNcXHUyZDAwLVxcdTJkMjVcXHUyZDI3XFx1MmQyZFxcdTJkMzAtXFx1MmQ2N1xcdTJkNmZcXHUyZDgwLVxcdTJkOTZcXHUyZGEwLVxcdTJkYTZcXHUyZGE4LVxcdTJkYWVcXHUyZGIwLVxcdTJkYjZcXHUyZGI4LVxcdTJkYmVcXHUyZGMwLVxcdTJkYzZcXHUyZGM4LVxcdTJkY2VcXHUyZGQwLVxcdTJkZDZcXHUyZGQ4LVxcdTJkZGVcXHUyZTJmXFx1MzAwNS1cXHUzMDA3XFx1MzAyMS1cXHUzMDI5XFx1MzAzMS1cXHUzMDM1XFx1MzAzOC1cXHUzMDNjXFx1MzA0MS1cXHUzMDk2XFx1MzA5ZC1cXHUzMDlmXFx1MzBhMS1cXHUzMGZhXFx1MzBmYy1cXHUzMGZmXFx1MzEwNS1cXHUzMTJkXFx1MzEzMS1cXHUzMThlXFx1MzFhMC1cXHUzMWJhXFx1MzFmMC1cXHUzMWZmXFx1MzQwMC1cXHU0ZGI1XFx1NGUwMC1cXHU5ZmNjXFx1YTAwMC1cXHVhNDhjXFx1YTRkMC1cXHVhNGZkXFx1YTUwMC1cXHVhNjBjXFx1YTYxMC1cXHVhNjFmXFx1YTYyYVxcdWE2MmJcXHVhNjQwLVxcdWE2NmVcXHVhNjdmLVxcdWE2OTdcXHVhNmEwLVxcdWE2ZWZcXHVhNzE3LVxcdWE3MWZcXHVhNzIyLVxcdWE3ODhcXHVhNzhiLVxcdWE3OGVcXHVhNzkwLVxcdWE3OTNcXHVhN2EwLVxcdWE3YWFcXHVhN2Y4LVxcdWE4MDFcXHVhODAzLVxcdWE4MDVcXHVhODA3LVxcdWE4MGFcXHVhODBjLVxcdWE4MjJcXHVhODQwLVxcdWE4NzNcXHVhODgyLVxcdWE4YjNcXHVhOGYyLVxcdWE4ZjdcXHVhOGZiXFx1YTkwYS1cXHVhOTI1XFx1YTkzMC1cXHVhOTQ2XFx1YTk2MC1cXHVhOTdjXFx1YTk4NC1cXHVhOWIyXFx1YTljZlxcdWFhMDAtXFx1YWEyOFxcdWFhNDAtXFx1YWE0MlxcdWFhNDQtXFx1YWE0YlxcdWFhNjAtXFx1YWE3NlxcdWFhN2FcXHVhYTgwLVxcdWFhYWZcXHVhYWIxXFx1YWFiNVxcdWFhYjZcXHVhYWI5LVxcdWFhYmRcXHVhYWMwXFx1YWFjMlxcdWFhZGItXFx1YWFkZFxcdWFhZTAtXFx1YWFlYVxcdWFhZjItXFx1YWFmNFxcdWFiMDEtXFx1YWIwNlxcdWFiMDktXFx1YWIwZVxcdWFiMTEtXFx1YWIxNlxcdWFiMjAtXFx1YWIyNlxcdWFiMjgtXFx1YWIyZVxcdWFiYzAtXFx1YWJlMlxcdWFjMDAtXFx1ZDdhM1xcdWQ3YjAtXFx1ZDdjNlxcdWQ3Y2ItXFx1ZDdmYlxcdWY5MDAtXFx1ZmE2ZFxcdWZhNzAtXFx1ZmFkOVxcdWZiMDAtXFx1ZmIwNlxcdWZiMTMtXFx1ZmIxN1xcdWZiMWRcXHVmYjFmLVxcdWZiMjhcXHVmYjJhLVxcdWZiMzZcXHVmYjM4LVxcdWZiM2NcXHVmYjNlXFx1ZmI0MFxcdWZiNDFcXHVmYjQzXFx1ZmI0NFxcdWZiNDYtXFx1ZmJiMVxcdWZiZDMtXFx1ZmQzZFxcdWZkNTAtXFx1ZmQ4ZlxcdWZkOTItXFx1ZmRjN1xcdWZkZjAtXFx1ZmRmYlxcdWZlNzAtXFx1ZmU3NFxcdWZlNzYtXFx1ZmVmY1xcdWZmMjEtXFx1ZmYzYVxcdWZmNDEtXFx1ZmY1YVxcdWZmNjYtXFx1ZmZiZVxcdWZmYzItXFx1ZmZjN1xcdWZmY2EtXFx1ZmZjZlxcdWZmZDItXFx1ZmZkN1xcdWZmZGEtXFx1ZmZkY10nKSxcbiAgICAgICAgTm9uQXNjaWlJZGVudGlmaWVyUGFydDogbmV3IFJlZ0V4cCgnW1xceGFhXFx4YjVcXHhiYVxceGMwLVxceGQ2XFx4ZDgtXFx4ZjZcXHhmOC1cXHUwMmMxXFx1MDJjNi1cXHUwMmQxXFx1MDJlMC1cXHUwMmU0XFx1MDJlY1xcdTAyZWVcXHUwMzAwLVxcdTAzNzRcXHUwMzc2XFx1MDM3N1xcdTAzN2EtXFx1MDM3ZFxcdTAzODZcXHUwMzg4LVxcdTAzOGFcXHUwMzhjXFx1MDM4ZS1cXHUwM2ExXFx1MDNhMy1cXHUwM2Y1XFx1MDNmNy1cXHUwNDgxXFx1MDQ4My1cXHUwNDg3XFx1MDQ4YS1cXHUwNTI3XFx1MDUzMS1cXHUwNTU2XFx1MDU1OVxcdTA1NjEtXFx1MDU4N1xcdTA1OTEtXFx1MDViZFxcdTA1YmZcXHUwNWMxXFx1MDVjMlxcdTA1YzRcXHUwNWM1XFx1MDVjN1xcdTA1ZDAtXFx1MDVlYVxcdTA1ZjAtXFx1MDVmMlxcdTA2MTAtXFx1MDYxYVxcdTA2MjAtXFx1MDY2OVxcdTA2NmUtXFx1MDZkM1xcdTA2ZDUtXFx1MDZkY1xcdTA2ZGYtXFx1MDZlOFxcdTA2ZWEtXFx1MDZmY1xcdTA2ZmZcXHUwNzEwLVxcdTA3NGFcXHUwNzRkLVxcdTA3YjFcXHUwN2MwLVxcdTA3ZjVcXHUwN2ZhXFx1MDgwMC1cXHUwODJkXFx1MDg0MC1cXHUwODViXFx1MDhhMFxcdTA4YTItXFx1MDhhY1xcdTA4ZTQtXFx1MDhmZVxcdTA5MDAtXFx1MDk2M1xcdTA5NjYtXFx1MDk2ZlxcdTA5NzEtXFx1MDk3N1xcdTA5NzktXFx1MDk3ZlxcdTA5ODEtXFx1MDk4M1xcdTA5ODUtXFx1MDk4Y1xcdTA5OGZcXHUwOTkwXFx1MDk5My1cXHUwOWE4XFx1MDlhYS1cXHUwOWIwXFx1MDliMlxcdTA5YjYtXFx1MDliOVxcdTA5YmMtXFx1MDljNFxcdTA5YzdcXHUwOWM4XFx1MDljYi1cXHUwOWNlXFx1MDlkN1xcdTA5ZGNcXHUwOWRkXFx1MDlkZi1cXHUwOWUzXFx1MDllNi1cXHUwOWYxXFx1MGEwMS1cXHUwYTAzXFx1MGEwNS1cXHUwYTBhXFx1MGEwZlxcdTBhMTBcXHUwYTEzLVxcdTBhMjhcXHUwYTJhLVxcdTBhMzBcXHUwYTMyXFx1MGEzM1xcdTBhMzVcXHUwYTM2XFx1MGEzOFxcdTBhMzlcXHUwYTNjXFx1MGEzZS1cXHUwYTQyXFx1MGE0N1xcdTBhNDhcXHUwYTRiLVxcdTBhNGRcXHUwYTUxXFx1MGE1OS1cXHUwYTVjXFx1MGE1ZVxcdTBhNjYtXFx1MGE3NVxcdTBhODEtXFx1MGE4M1xcdTBhODUtXFx1MGE4ZFxcdTBhOGYtXFx1MGE5MVxcdTBhOTMtXFx1MGFhOFxcdTBhYWEtXFx1MGFiMFxcdTBhYjJcXHUwYWIzXFx1MGFiNS1cXHUwYWI5XFx1MGFiYy1cXHUwYWM1XFx1MGFjNy1cXHUwYWM5XFx1MGFjYi1cXHUwYWNkXFx1MGFkMFxcdTBhZTAtXFx1MGFlM1xcdTBhZTYtXFx1MGFlZlxcdTBiMDEtXFx1MGIwM1xcdTBiMDUtXFx1MGIwY1xcdTBiMGZcXHUwYjEwXFx1MGIxMy1cXHUwYjI4XFx1MGIyYS1cXHUwYjMwXFx1MGIzMlxcdTBiMzNcXHUwYjM1LVxcdTBiMzlcXHUwYjNjLVxcdTBiNDRcXHUwYjQ3XFx1MGI0OFxcdTBiNGItXFx1MGI0ZFxcdTBiNTZcXHUwYjU3XFx1MGI1Y1xcdTBiNWRcXHUwYjVmLVxcdTBiNjNcXHUwYjY2LVxcdTBiNmZcXHUwYjcxXFx1MGI4MlxcdTBiODNcXHUwYjg1LVxcdTBiOGFcXHUwYjhlLVxcdTBiOTBcXHUwYjkyLVxcdTBiOTVcXHUwYjk5XFx1MGI5YVxcdTBiOWNcXHUwYjllXFx1MGI5ZlxcdTBiYTNcXHUwYmE0XFx1MGJhOC1cXHUwYmFhXFx1MGJhZS1cXHUwYmI5XFx1MGJiZS1cXHUwYmMyXFx1MGJjNi1cXHUwYmM4XFx1MGJjYS1cXHUwYmNkXFx1MGJkMFxcdTBiZDdcXHUwYmU2LVxcdTBiZWZcXHUwYzAxLVxcdTBjMDNcXHUwYzA1LVxcdTBjMGNcXHUwYzBlLVxcdTBjMTBcXHUwYzEyLVxcdTBjMjhcXHUwYzJhLVxcdTBjMzNcXHUwYzM1LVxcdTBjMzlcXHUwYzNkLVxcdTBjNDRcXHUwYzQ2LVxcdTBjNDhcXHUwYzRhLVxcdTBjNGRcXHUwYzU1XFx1MGM1NlxcdTBjNThcXHUwYzU5XFx1MGM2MC1cXHUwYzYzXFx1MGM2Ni1cXHUwYzZmXFx1MGM4MlxcdTBjODNcXHUwYzg1LVxcdTBjOGNcXHUwYzhlLVxcdTBjOTBcXHUwYzkyLVxcdTBjYThcXHUwY2FhLVxcdTBjYjNcXHUwY2I1LVxcdTBjYjlcXHUwY2JjLVxcdTBjYzRcXHUwY2M2LVxcdTBjYzhcXHUwY2NhLVxcdTBjY2RcXHUwY2Q1XFx1MGNkNlxcdTBjZGVcXHUwY2UwLVxcdTBjZTNcXHUwY2U2LVxcdTBjZWZcXHUwY2YxXFx1MGNmMlxcdTBkMDJcXHUwZDAzXFx1MGQwNS1cXHUwZDBjXFx1MGQwZS1cXHUwZDEwXFx1MGQxMi1cXHUwZDNhXFx1MGQzZC1cXHUwZDQ0XFx1MGQ0Ni1cXHUwZDQ4XFx1MGQ0YS1cXHUwZDRlXFx1MGQ1N1xcdTBkNjAtXFx1MGQ2M1xcdTBkNjYtXFx1MGQ2ZlxcdTBkN2EtXFx1MGQ3ZlxcdTBkODJcXHUwZDgzXFx1MGQ4NS1cXHUwZDk2XFx1MGQ5YS1cXHUwZGIxXFx1MGRiMy1cXHUwZGJiXFx1MGRiZFxcdTBkYzAtXFx1MGRjNlxcdTBkY2FcXHUwZGNmLVxcdTBkZDRcXHUwZGQ2XFx1MGRkOC1cXHUwZGRmXFx1MGRmMlxcdTBkZjNcXHUwZTAxLVxcdTBlM2FcXHUwZTQwLVxcdTBlNGVcXHUwZTUwLVxcdTBlNTlcXHUwZTgxXFx1MGU4MlxcdTBlODRcXHUwZTg3XFx1MGU4OFxcdTBlOGFcXHUwZThkXFx1MGU5NC1cXHUwZTk3XFx1MGU5OS1cXHUwZTlmXFx1MGVhMS1cXHUwZWEzXFx1MGVhNVxcdTBlYTdcXHUwZWFhXFx1MGVhYlxcdTBlYWQtXFx1MGViOVxcdTBlYmItXFx1MGViZFxcdTBlYzAtXFx1MGVjNFxcdTBlYzZcXHUwZWM4LVxcdTBlY2RcXHUwZWQwLVxcdTBlZDlcXHUwZWRjLVxcdTBlZGZcXHUwZjAwXFx1MGYxOFxcdTBmMTlcXHUwZjIwLVxcdTBmMjlcXHUwZjM1XFx1MGYzN1xcdTBmMzlcXHUwZjNlLVxcdTBmNDdcXHUwZjQ5LVxcdTBmNmNcXHUwZjcxLVxcdTBmODRcXHUwZjg2LVxcdTBmOTdcXHUwZjk5LVxcdTBmYmNcXHUwZmM2XFx1MTAwMC1cXHUxMDQ5XFx1MTA1MC1cXHUxMDlkXFx1MTBhMC1cXHUxMGM1XFx1MTBjN1xcdTEwY2RcXHUxMGQwLVxcdTEwZmFcXHUxMGZjLVxcdTEyNDhcXHUxMjRhLVxcdTEyNGRcXHUxMjUwLVxcdTEyNTZcXHUxMjU4XFx1MTI1YS1cXHUxMjVkXFx1MTI2MC1cXHUxMjg4XFx1MTI4YS1cXHUxMjhkXFx1MTI5MC1cXHUxMmIwXFx1MTJiMi1cXHUxMmI1XFx1MTJiOC1cXHUxMmJlXFx1MTJjMFxcdTEyYzItXFx1MTJjNVxcdTEyYzgtXFx1MTJkNlxcdTEyZDgtXFx1MTMxMFxcdTEzMTItXFx1MTMxNVxcdTEzMTgtXFx1MTM1YVxcdTEzNWQtXFx1MTM1ZlxcdTEzODAtXFx1MTM4ZlxcdTEzYTAtXFx1MTNmNFxcdTE0MDEtXFx1MTY2Y1xcdTE2NmYtXFx1MTY3ZlxcdTE2ODEtXFx1MTY5YVxcdTE2YTAtXFx1MTZlYVxcdTE2ZWUtXFx1MTZmMFxcdTE3MDAtXFx1MTcwY1xcdTE3MGUtXFx1MTcxNFxcdTE3MjAtXFx1MTczNFxcdTE3NDAtXFx1MTc1M1xcdTE3NjAtXFx1MTc2Y1xcdTE3NmUtXFx1MTc3MFxcdTE3NzJcXHUxNzczXFx1MTc4MC1cXHUxN2QzXFx1MTdkN1xcdTE3ZGNcXHUxN2RkXFx1MTdlMC1cXHUxN2U5XFx1MTgwYi1cXHUxODBkXFx1MTgxMC1cXHUxODE5XFx1MTgyMC1cXHUxODc3XFx1MTg4MC1cXHUxOGFhXFx1MThiMC1cXHUxOGY1XFx1MTkwMC1cXHUxOTFjXFx1MTkyMC1cXHUxOTJiXFx1MTkzMC1cXHUxOTNiXFx1MTk0Ni1cXHUxOTZkXFx1MTk3MC1cXHUxOTc0XFx1MTk4MC1cXHUxOWFiXFx1MTliMC1cXHUxOWM5XFx1MTlkMC1cXHUxOWQ5XFx1MWEwMC1cXHUxYTFiXFx1MWEyMC1cXHUxYTVlXFx1MWE2MC1cXHUxYTdjXFx1MWE3Zi1cXHUxYTg5XFx1MWE5MC1cXHUxYTk5XFx1MWFhN1xcdTFiMDAtXFx1MWI0YlxcdTFiNTAtXFx1MWI1OVxcdTFiNmItXFx1MWI3M1xcdTFiODAtXFx1MWJmM1xcdTFjMDAtXFx1MWMzN1xcdTFjNDAtXFx1MWM0OVxcdTFjNGQtXFx1MWM3ZFxcdTFjZDAtXFx1MWNkMlxcdTFjZDQtXFx1MWNmNlxcdTFkMDAtXFx1MWRlNlxcdTFkZmMtXFx1MWYxNVxcdTFmMTgtXFx1MWYxZFxcdTFmMjAtXFx1MWY0NVxcdTFmNDgtXFx1MWY0ZFxcdTFmNTAtXFx1MWY1N1xcdTFmNTlcXHUxZjViXFx1MWY1ZFxcdTFmNWYtXFx1MWY3ZFxcdTFmODAtXFx1MWZiNFxcdTFmYjYtXFx1MWZiY1xcdTFmYmVcXHUxZmMyLVxcdTFmYzRcXHUxZmM2LVxcdTFmY2NcXHUxZmQwLVxcdTFmZDNcXHUxZmQ2LVxcdTFmZGJcXHUxZmUwLVxcdTFmZWNcXHUxZmYyLVxcdTFmZjRcXHUxZmY2LVxcdTFmZmNcXHUyMDBjXFx1MjAwZFxcdTIwM2ZcXHUyMDQwXFx1MjA1NFxcdTIwNzFcXHUyMDdmXFx1MjA5MC1cXHUyMDljXFx1MjBkMC1cXHUyMGRjXFx1MjBlMVxcdTIwZTUtXFx1MjBmMFxcdTIxMDJcXHUyMTA3XFx1MjEwYS1cXHUyMTEzXFx1MjExNVxcdTIxMTktXFx1MjExZFxcdTIxMjRcXHUyMTI2XFx1MjEyOFxcdTIxMmEtXFx1MjEyZFxcdTIxMmYtXFx1MjEzOVxcdTIxM2MtXFx1MjEzZlxcdTIxNDUtXFx1MjE0OVxcdTIxNGVcXHUyMTYwLVxcdTIxODhcXHUyYzAwLVxcdTJjMmVcXHUyYzMwLVxcdTJjNWVcXHUyYzYwLVxcdTJjZTRcXHUyY2ViLVxcdTJjZjNcXHUyZDAwLVxcdTJkMjVcXHUyZDI3XFx1MmQyZFxcdTJkMzAtXFx1MmQ2N1xcdTJkNmZcXHUyZDdmLVxcdTJkOTZcXHUyZGEwLVxcdTJkYTZcXHUyZGE4LVxcdTJkYWVcXHUyZGIwLVxcdTJkYjZcXHUyZGI4LVxcdTJkYmVcXHUyZGMwLVxcdTJkYzZcXHUyZGM4LVxcdTJkY2VcXHUyZGQwLVxcdTJkZDZcXHUyZGQ4LVxcdTJkZGVcXHUyZGUwLVxcdTJkZmZcXHUyZTJmXFx1MzAwNS1cXHUzMDA3XFx1MzAyMS1cXHUzMDJmXFx1MzAzMS1cXHUzMDM1XFx1MzAzOC1cXHUzMDNjXFx1MzA0MS1cXHUzMDk2XFx1MzA5OVxcdTMwOWFcXHUzMDlkLVxcdTMwOWZcXHUzMGExLVxcdTMwZmFcXHUzMGZjLVxcdTMwZmZcXHUzMTA1LVxcdTMxMmRcXHUzMTMxLVxcdTMxOGVcXHUzMWEwLVxcdTMxYmFcXHUzMWYwLVxcdTMxZmZcXHUzNDAwLVxcdTRkYjVcXHU0ZTAwLVxcdTlmY2NcXHVhMDAwLVxcdWE0OGNcXHVhNGQwLVxcdWE0ZmRcXHVhNTAwLVxcdWE2MGNcXHVhNjEwLVxcdWE2MmJcXHVhNjQwLVxcdWE2NmZcXHVhNjc0LVxcdWE2N2RcXHVhNjdmLVxcdWE2OTdcXHVhNjlmLVxcdWE2ZjFcXHVhNzE3LVxcdWE3MWZcXHVhNzIyLVxcdWE3ODhcXHVhNzhiLVxcdWE3OGVcXHVhNzkwLVxcdWE3OTNcXHVhN2EwLVxcdWE3YWFcXHVhN2Y4LVxcdWE4MjdcXHVhODQwLVxcdWE4NzNcXHVhODgwLVxcdWE4YzRcXHVhOGQwLVxcdWE4ZDlcXHVhOGUwLVxcdWE4ZjdcXHVhOGZiXFx1YTkwMC1cXHVhOTJkXFx1YTkzMC1cXHVhOTUzXFx1YTk2MC1cXHVhOTdjXFx1YTk4MC1cXHVhOWMwXFx1YTljZi1cXHVhOWQ5XFx1YWEwMC1cXHVhYTM2XFx1YWE0MC1cXHVhYTRkXFx1YWE1MC1cXHVhYTU5XFx1YWE2MC1cXHVhYTc2XFx1YWE3YVxcdWFhN2JcXHVhYTgwLVxcdWFhYzJcXHVhYWRiLVxcdWFhZGRcXHVhYWUwLVxcdWFhZWZcXHVhYWYyLVxcdWFhZjZcXHVhYjAxLVxcdWFiMDZcXHVhYjA5LVxcdWFiMGVcXHVhYjExLVxcdWFiMTZcXHVhYjIwLVxcdWFiMjZcXHVhYjI4LVxcdWFiMmVcXHVhYmMwLVxcdWFiZWFcXHVhYmVjXFx1YWJlZFxcdWFiZjAtXFx1YWJmOVxcdWFjMDAtXFx1ZDdhM1xcdWQ3YjAtXFx1ZDdjNlxcdWQ3Y2ItXFx1ZDdmYlxcdWY5MDAtXFx1ZmE2ZFxcdWZhNzAtXFx1ZmFkOVxcdWZiMDAtXFx1ZmIwNlxcdWZiMTMtXFx1ZmIxN1xcdWZiMWQtXFx1ZmIyOFxcdWZiMmEtXFx1ZmIzNlxcdWZiMzgtXFx1ZmIzY1xcdWZiM2VcXHVmYjQwXFx1ZmI0MVxcdWZiNDNcXHVmYjQ0XFx1ZmI0Ni1cXHVmYmIxXFx1ZmJkMy1cXHVmZDNkXFx1ZmQ1MC1cXHVmZDhmXFx1ZmQ5Mi1cXHVmZGM3XFx1ZmRmMC1cXHVmZGZiXFx1ZmUwMC1cXHVmZTBmXFx1ZmUyMC1cXHVmZTI2XFx1ZmUzM1xcdWZlMzRcXHVmZTRkLVxcdWZlNGZcXHVmZTcwLVxcdWZlNzRcXHVmZTc2LVxcdWZlZmNcXHVmZjEwLVxcdWZmMTlcXHVmZjIxLVxcdWZmM2FcXHVmZjNmXFx1ZmY0MS1cXHVmZjVhXFx1ZmY2Ni1cXHVmZmJlXFx1ZmZjMi1cXHVmZmM3XFx1ZmZjYS1cXHVmZmNmXFx1ZmZkMi1cXHVmZmQ3XFx1ZmZkYS1cXHVmZmRjXScpXG4gICAgfTtcblxuICAgIC8vIEVuc3VyZSB0aGUgY29uZGl0aW9uIGlzIHRydWUsIG90aGVyd2lzZSB0aHJvdyBhbiBlcnJvci5cbiAgICAvLyBUaGlzIGlzIG9ubHkgdG8gaGF2ZSBhIGJldHRlciBjb250cmFjdCBzZW1hbnRpYywgaS5lLiBhbm90aGVyIHNhZmV0eSBuZXRcbiAgICAvLyB0byBjYXRjaCBhIGxvZ2ljIGVycm9yLiBUaGUgY29uZGl0aW9uIHNoYWxsIGJlIGZ1bGZpbGxlZCBpbiBub3JtYWwgY2FzZS5cbiAgICAvLyBEbyBOT1QgdXNlIHRoaXMgdG8gZW5mb3JjZSBhIGNlcnRhaW4gY29uZGl0aW9uIG9uIGFueSB1c2VyIGlucHV0LlxuXG4gICAgZnVuY3Rpb24gYXNzZXJ0KGNvbmRpdGlvbiwgbWVzc2FnZSkge1xuICAgICAgICBpZiAoIWNvbmRpdGlvbikge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdBU1NFUlQ6ICcgKyBtZXNzYWdlKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIHNsaWNlU291cmNlKGZyb20sIHRvKSB7XG4gICAgICAgIHJldHVybiBzb3VyY2Uuc2xpY2UoZnJvbSwgdG8pO1xuICAgIH1cblxuICAgIGlmICh0eXBlb2YgJ2VzcHJpbWEnWzBdID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICBzbGljZVNvdXJjZSA9IGZ1bmN0aW9uIHNsaWNlQXJyYXlTb3VyY2UoZnJvbSwgdG8pIHtcbiAgICAgICAgICAgIHJldHVybiBzb3VyY2Uuc2xpY2UoZnJvbSwgdG8pLmpvaW4oJycpO1xuICAgICAgICB9O1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGlzRGVjaW1hbERpZ2l0KGNoKSB7XG4gICAgICAgIHJldHVybiAnMDEyMzQ1Njc4OScuaW5kZXhPZihjaCkgPj0gMDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBpc0hleERpZ2l0KGNoKSB7XG4gICAgICAgIHJldHVybiAnMDEyMzQ1Njc4OWFiY2RlZkFCQ0RFRicuaW5kZXhPZihjaCkgPj0gMDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBpc09jdGFsRGlnaXQoY2gpIHtcbiAgICAgICAgcmV0dXJuICcwMTIzNDU2NycuaW5kZXhPZihjaCkgPj0gMDtcbiAgICB9XG5cblxuICAgIC8vIDcuMiBXaGl0ZSBTcGFjZVxuXG4gICAgZnVuY3Rpb24gaXNXaGl0ZVNwYWNlKGNoKSB7XG4gICAgICAgIHJldHVybiAoY2ggPT09ICcgJykgfHwgKGNoID09PSAnXFx1MDAwOScpIHx8IChjaCA9PT0gJ1xcdTAwMEInKSB8fFxuICAgICAgICAgICAgKGNoID09PSAnXFx1MDAwQycpIHx8IChjaCA9PT0gJ1xcdTAwQTAnKSB8fFxuICAgICAgICAgICAgKGNoLmNoYXJDb2RlQXQoMCkgPj0gMHgxNjgwICYmXG4gICAgICAgICAgICAgJ1xcdTE2ODBcXHUxODBFXFx1MjAwMFxcdTIwMDFcXHUyMDAyXFx1MjAwM1xcdTIwMDRcXHUyMDA1XFx1MjAwNlxcdTIwMDdcXHUyMDA4XFx1MjAwOVxcdTIwMEFcXHUyMDJGXFx1MjA1RlxcdTMwMDBcXHVGRUZGJy5pbmRleE9mKGNoKSA+PSAwKTtcbiAgICB9XG5cbiAgICAvLyA3LjMgTGluZSBUZXJtaW5hdG9yc1xuXG4gICAgZnVuY3Rpb24gaXNMaW5lVGVybWluYXRvcihjaCkge1xuICAgICAgICByZXR1cm4gKGNoID09PSAnXFxuJyB8fCBjaCA9PT0gJ1xccicgfHwgY2ggPT09ICdcXHUyMDI4JyB8fCBjaCA9PT0gJ1xcdTIwMjknKTtcbiAgICB9XG5cbiAgICAvLyA3LjYgSWRlbnRpZmllciBOYW1lcyBhbmQgSWRlbnRpZmllcnNcblxuICAgIGZ1bmN0aW9uIGlzSWRlbnRpZmllclN0YXJ0KGNoKSB7XG4gICAgICAgIHJldHVybiAoY2ggPT09ICckJykgfHwgKGNoID09PSAnXycpIHx8IChjaCA9PT0gJ1xcXFwnKSB8fFxuICAgICAgICAgICAgKGNoID49ICdhJyAmJiBjaCA8PSAneicpIHx8IChjaCA+PSAnQScgJiYgY2ggPD0gJ1onKSB8fFxuICAgICAgICAgICAgKChjaC5jaGFyQ29kZUF0KDApID49IDB4ODApICYmIFJlZ2V4Lk5vbkFzY2lpSWRlbnRpZmllclN0YXJ0LnRlc3QoY2gpKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBpc0lkZW50aWZpZXJQYXJ0KGNoKSB7XG4gICAgICAgIHJldHVybiAoY2ggPT09ICckJykgfHwgKGNoID09PSAnXycpIHx8IChjaCA9PT0gJ1xcXFwnKSB8fFxuICAgICAgICAgICAgKGNoID49ICdhJyAmJiBjaCA8PSAneicpIHx8IChjaCA+PSAnQScgJiYgY2ggPD0gJ1onKSB8fFxuICAgICAgICAgICAgKChjaCA+PSAnMCcpICYmIChjaCA8PSAnOScpKSB8fFxuICAgICAgICAgICAgKChjaC5jaGFyQ29kZUF0KDApID49IDB4ODApICYmIFJlZ2V4Lk5vbkFzY2lpSWRlbnRpZmllclBhcnQudGVzdChjaCkpO1xuICAgIH1cblxuICAgIC8vIDcuNi4xLjIgRnV0dXJlIFJlc2VydmVkIFdvcmRzXG5cbiAgICBmdW5jdGlvbiBpc0Z1dHVyZVJlc2VydmVkV29yZChpZCkge1xuICAgICAgICBzd2l0Y2ggKGlkKSB7XG5cbiAgICAgICAgLy8gRnV0dXJlIHJlc2VydmVkIHdvcmRzLlxuICAgICAgICBjYXNlICdjbGFzcyc6XG4gICAgICAgIGNhc2UgJ2VudW0nOlxuICAgICAgICBjYXNlICdleHBvcnQnOlxuICAgICAgICBjYXNlICdleHRlbmRzJzpcbiAgICAgICAgY2FzZSAnaW1wb3J0JzpcbiAgICAgICAgY2FzZSAnc3VwZXInOlxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gaXNTdHJpY3RNb2RlUmVzZXJ2ZWRXb3JkKGlkKSB7XG4gICAgICAgIHN3aXRjaCAoaWQpIHtcblxuICAgICAgICAvLyBTdHJpY3QgTW9kZSByZXNlcnZlZCB3b3Jkcy5cbiAgICAgICAgY2FzZSAnaW1wbGVtZW50cyc6XG4gICAgICAgIGNhc2UgJ2ludGVyZmFjZSc6XG4gICAgICAgIGNhc2UgJ3BhY2thZ2UnOlxuICAgICAgICBjYXNlICdwcml2YXRlJzpcbiAgICAgICAgY2FzZSAncHJvdGVjdGVkJzpcbiAgICAgICAgY2FzZSAncHVibGljJzpcbiAgICAgICAgY2FzZSAnc3RhdGljJzpcbiAgICAgICAgY2FzZSAneWllbGQnOlxuICAgICAgICBjYXNlICdsZXQnOlxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gaXNSZXN0cmljdGVkV29yZChpZCkge1xuICAgICAgICByZXR1cm4gaWQgPT09ICdldmFsJyB8fCBpZCA9PT0gJ2FyZ3VtZW50cyc7XG4gICAgfVxuXG4gICAgLy8gNy42LjEuMSBLZXl3b3Jkc1xuXG4gICAgZnVuY3Rpb24gaXNLZXl3b3JkKGlkKSB7XG4gICAgICAgIHZhciBrZXl3b3JkID0gZmFsc2U7XG4gICAgICAgIHN3aXRjaCAoaWQubGVuZ3RoKSB7XG4gICAgICAgIGNhc2UgMjpcbiAgICAgICAgICAgIGtleXdvcmQgPSAoaWQgPT09ICdpZicpIHx8IChpZCA9PT0gJ2luJykgfHwgKGlkID09PSAnZG8nKTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIDM6XG4gICAgICAgICAgICBrZXl3b3JkID0gKGlkID09PSAndmFyJykgfHwgKGlkID09PSAnZm9yJykgfHwgKGlkID09PSAnbmV3JykgfHwgKGlkID09PSAndHJ5Jyk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSA0OlxuICAgICAgICAgICAga2V5d29yZCA9IChpZCA9PT0gJ3RoaXMnKSB8fCAoaWQgPT09ICdlbHNlJykgfHwgKGlkID09PSAnY2FzZScpIHx8IChpZCA9PT0gJ3ZvaWQnKSB8fCAoaWQgPT09ICd3aXRoJyk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSA1OlxuICAgICAgICAgICAga2V5d29yZCA9IChpZCA9PT0gJ3doaWxlJykgfHwgKGlkID09PSAnYnJlYWsnKSB8fCAoaWQgPT09ICdjYXRjaCcpIHx8IChpZCA9PT0gJ3Rocm93Jyk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSA2OlxuICAgICAgICAgICAga2V5d29yZCA9IChpZCA9PT0gJ3JldHVybicpIHx8IChpZCA9PT0gJ3R5cGVvZicpIHx8IChpZCA9PT0gJ2RlbGV0ZScpIHx8IChpZCA9PT0gJ3N3aXRjaCcpO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgNzpcbiAgICAgICAgICAgIGtleXdvcmQgPSAoaWQgPT09ICdkZWZhdWx0JykgfHwgKGlkID09PSAnZmluYWxseScpO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgODpcbiAgICAgICAgICAgIGtleXdvcmQgPSAoaWQgPT09ICdmdW5jdGlvbicpIHx8IChpZCA9PT0gJ2NvbnRpbnVlJykgfHwgKGlkID09PSAnZGVidWdnZXInKTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIDEwOlxuICAgICAgICAgICAga2V5d29yZCA9IChpZCA9PT0gJ2luc3RhbmNlb2YnKTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGtleXdvcmQpIHtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgc3dpdGNoIChpZCkge1xuICAgICAgICAvLyBGdXR1cmUgcmVzZXJ2ZWQgd29yZHMuXG4gICAgICAgIC8vICdjb25zdCcgaXMgc3BlY2lhbGl6ZWQgYXMgS2V5d29yZCBpbiBWOC5cbiAgICAgICAgY2FzZSAnY29uc3QnOlxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG5cbiAgICAgICAgLy8gRm9yIGNvbXBhdGlibGl0eSB0byBTcGlkZXJNb25rZXkgYW5kIEVTLm5leHRcbiAgICAgICAgY2FzZSAneWllbGQnOlxuICAgICAgICBjYXNlICdsZXQnOlxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoc3RyaWN0ICYmIGlzU3RyaWN0TW9kZVJlc2VydmVkV29yZChpZCkpIHtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGlzRnV0dXJlUmVzZXJ2ZWRXb3JkKGlkKTtcbiAgICB9XG5cbiAgICAvLyA3LjQgQ29tbWVudHNcblxuICAgIGZ1bmN0aW9uIHNraXBDb21tZW50KCkge1xuICAgICAgICB2YXIgY2gsIGJsb2NrQ29tbWVudCwgbGluZUNvbW1lbnQ7XG5cbiAgICAgICAgYmxvY2tDb21tZW50ID0gZmFsc2U7XG4gICAgICAgIGxpbmVDb21tZW50ID0gZmFsc2U7XG5cbiAgICAgICAgd2hpbGUgKGluZGV4IDwgbGVuZ3RoKSB7XG4gICAgICAgICAgICBjaCA9IHNvdXJjZVtpbmRleF07XG5cbiAgICAgICAgICAgIGlmIChsaW5lQ29tbWVudCkge1xuICAgICAgICAgICAgICAgIGNoID0gc291cmNlW2luZGV4KytdO1xuICAgICAgICAgICAgICAgIGlmIChpc0xpbmVUZXJtaW5hdG9yKGNoKSkge1xuICAgICAgICAgICAgICAgICAgICBsaW5lQ29tbWVudCA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICBpZiAoY2ggPT09ICdcXHInICYmIHNvdXJjZVtpbmRleF0gPT09ICdcXG4nKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICArK2luZGV4O1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICsrbGluZU51bWJlcjtcbiAgICAgICAgICAgICAgICAgICAgbGluZVN0YXJ0ID0gaW5kZXg7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIGlmIChibG9ja0NvbW1lbnQpIHtcbiAgICAgICAgICAgICAgICBpZiAoaXNMaW5lVGVybWluYXRvcihjaCkpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGNoID09PSAnXFxyJyAmJiBzb3VyY2VbaW5kZXggKyAxXSA9PT0gJ1xcbicpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICsraW5kZXg7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgKytsaW5lTnVtYmVyO1xuICAgICAgICAgICAgICAgICAgICArK2luZGV4O1xuICAgICAgICAgICAgICAgICAgICBsaW5lU3RhcnQgPSBpbmRleDtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGluZGV4ID49IGxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3dFcnJvcih7fSwgTWVzc2FnZXMuVW5leHBlY3RlZFRva2VuLCAnSUxMRUdBTCcpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgY2ggPSBzb3VyY2VbaW5kZXgrK107XG4gICAgICAgICAgICAgICAgICAgIGlmIChpbmRleCA+PSBsZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRocm93RXJyb3Ioe30sIE1lc3NhZ2VzLlVuZXhwZWN0ZWRUb2tlbiwgJ0lMTEVHQUwnKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBpZiAoY2ggPT09ICcqJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgY2ggPSBzb3VyY2VbaW5kZXhdO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGNoID09PSAnLycpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICArK2luZGV4O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJsb2NrQ29tbWVudCA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIGlmIChjaCA9PT0gJy8nKSB7XG4gICAgICAgICAgICAgICAgY2ggPSBzb3VyY2VbaW5kZXggKyAxXTtcbiAgICAgICAgICAgICAgICBpZiAoY2ggPT09ICcvJykge1xuICAgICAgICAgICAgICAgICAgICBpbmRleCArPSAyO1xuICAgICAgICAgICAgICAgICAgICBsaW5lQ29tbWVudCA9IHRydWU7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChjaCA9PT0gJyonKSB7XG4gICAgICAgICAgICAgICAgICAgIGluZGV4ICs9IDI7XG4gICAgICAgICAgICAgICAgICAgIGJsb2NrQ29tbWVudCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIGlmIChpbmRleCA+PSBsZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRocm93RXJyb3Ioe30sIE1lc3NhZ2VzLlVuZXhwZWN0ZWRUb2tlbiwgJ0lMTEVHQUwnKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSBpZiAoaXNXaGl0ZVNwYWNlKGNoKSkge1xuICAgICAgICAgICAgICAgICsraW5kZXg7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGlzTGluZVRlcm1pbmF0b3IoY2gpKSB7XG4gICAgICAgICAgICAgICAgKytpbmRleDtcbiAgICAgICAgICAgICAgICBpZiAoY2ggPT09ICAnXFxyJyAmJiBzb3VyY2VbaW5kZXhdID09PSAnXFxuJykge1xuICAgICAgICAgICAgICAgICAgICArK2luZGV4O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICArK2xpbmVOdW1iZXI7XG4gICAgICAgICAgICAgICAgbGluZVN0YXJ0ID0gaW5kZXg7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gc2NhbkhleEVzY2FwZShwcmVmaXgpIHtcbiAgICAgICAgdmFyIGksIGxlbiwgY2gsIGNvZGUgPSAwO1xuXG4gICAgICAgIGxlbiA9IChwcmVmaXggPT09ICd1JykgPyA0IDogMjtcbiAgICAgICAgZm9yIChpID0gMDsgaSA8IGxlbjsgKytpKSB7XG4gICAgICAgICAgICBpZiAoaW5kZXggPCBsZW5ndGggJiYgaXNIZXhEaWdpdChzb3VyY2VbaW5kZXhdKSkge1xuICAgICAgICAgICAgICAgIGNoID0gc291cmNlW2luZGV4KytdO1xuICAgICAgICAgICAgICAgIGNvZGUgPSBjb2RlICogMTYgKyAnMDEyMzQ1Njc4OWFiY2RlZicuaW5kZXhPZihjaC50b0xvd2VyQ2FzZSgpKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICcnO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBTdHJpbmcuZnJvbUNoYXJDb2RlKGNvZGUpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHNjYW5JZGVudGlmaWVyKCkge1xuICAgICAgICB2YXIgY2gsIHN0YXJ0LCBpZCwgcmVzdG9yZTtcblxuICAgICAgICBjaCA9IHNvdXJjZVtpbmRleF07XG4gICAgICAgIGlmICghaXNJZGVudGlmaWVyU3RhcnQoY2gpKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBzdGFydCA9IGluZGV4O1xuICAgICAgICBpZiAoY2ggPT09ICdcXFxcJykge1xuICAgICAgICAgICAgKytpbmRleDtcbiAgICAgICAgICAgIGlmIChzb3VyY2VbaW5kZXhdICE9PSAndScpIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICArK2luZGV4O1xuICAgICAgICAgICAgcmVzdG9yZSA9IGluZGV4O1xuICAgICAgICAgICAgY2ggPSBzY2FuSGV4RXNjYXBlKCd1Jyk7XG4gICAgICAgICAgICBpZiAoY2gpIHtcbiAgICAgICAgICAgICAgICBpZiAoY2ggPT09ICdcXFxcJyB8fCAhaXNJZGVudGlmaWVyU3RhcnQoY2gpKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWQgPSBjaDtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgaW5kZXggPSByZXN0b3JlO1xuICAgICAgICAgICAgICAgIGlkID0gJ3UnO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaWQgPSBzb3VyY2VbaW5kZXgrK107XG4gICAgICAgIH1cblxuICAgICAgICB3aGlsZSAoaW5kZXggPCBsZW5ndGgpIHtcbiAgICAgICAgICAgIGNoID0gc291cmNlW2luZGV4XTtcbiAgICAgICAgICAgIGlmICghaXNJZGVudGlmaWVyUGFydChjaCkpIHtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChjaCA9PT0gJ1xcXFwnKSB7XG4gICAgICAgICAgICAgICAgKytpbmRleDtcbiAgICAgICAgICAgICAgICBpZiAoc291cmNlW2luZGV4XSAhPT0gJ3UnKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgKytpbmRleDtcbiAgICAgICAgICAgICAgICByZXN0b3JlID0gaW5kZXg7XG4gICAgICAgICAgICAgICAgY2ggPSBzY2FuSGV4RXNjYXBlKCd1Jyk7XG4gICAgICAgICAgICAgICAgaWYgKGNoKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChjaCA9PT0gJ1xcXFwnIHx8ICFpc0lkZW50aWZpZXJQYXJ0KGNoKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGlkICs9IGNoO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGluZGV4ID0gcmVzdG9yZTtcbiAgICAgICAgICAgICAgICAgICAgaWQgKz0gJ3UnO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgaWQgKz0gc291cmNlW2luZGV4KytdO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gVGhlcmUgaXMgbm8ga2V5d29yZCBvciBsaXRlcmFsIHdpdGggb25seSBvbmUgY2hhcmFjdGVyLlxuICAgICAgICAvLyBUaHVzLCBpdCBtdXN0IGJlIGFuIGlkZW50aWZpZXIuXG4gICAgICAgIGlmIChpZC5sZW5ndGggPT09IDEpIHtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgdHlwZTogVG9rZW4uSWRlbnRpZmllcixcbiAgICAgICAgICAgICAgICB2YWx1ZTogaWQsXG4gICAgICAgICAgICAgICAgbGluZU51bWJlcjogbGluZU51bWJlcixcbiAgICAgICAgICAgICAgICBsaW5lU3RhcnQ6IGxpbmVTdGFydCxcbiAgICAgICAgICAgICAgICByYW5nZTogW3N0YXJ0LCBpbmRleF1cbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoaXNLZXl3b3JkKGlkKSkge1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICB0eXBlOiBUb2tlbi5LZXl3b3JkLFxuICAgICAgICAgICAgICAgIHZhbHVlOiBpZCxcbiAgICAgICAgICAgICAgICBsaW5lTnVtYmVyOiBsaW5lTnVtYmVyLFxuICAgICAgICAgICAgICAgIGxpbmVTdGFydDogbGluZVN0YXJ0LFxuICAgICAgICAgICAgICAgIHJhbmdlOiBbc3RhcnQsIGluZGV4XVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIDcuOC4xIE51bGwgTGl0ZXJhbHNcblxuICAgICAgICBpZiAoaWQgPT09ICdudWxsJykge1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICB0eXBlOiBUb2tlbi5OdWxsTGl0ZXJhbCxcbiAgICAgICAgICAgICAgICB2YWx1ZTogaWQsXG4gICAgICAgICAgICAgICAgbGluZU51bWJlcjogbGluZU51bWJlcixcbiAgICAgICAgICAgICAgICBsaW5lU3RhcnQ6IGxpbmVTdGFydCxcbiAgICAgICAgICAgICAgICByYW5nZTogW3N0YXJ0LCBpbmRleF1cbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cblxuICAgICAgICAvLyA3LjguMiBCb29sZWFuIExpdGVyYWxzXG5cbiAgICAgICAgaWYgKGlkID09PSAndHJ1ZScgfHwgaWQgPT09ICdmYWxzZScpIHtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgdHlwZTogVG9rZW4uQm9vbGVhbkxpdGVyYWwsXG4gICAgICAgICAgICAgICAgdmFsdWU6IGlkLFxuICAgICAgICAgICAgICAgIGxpbmVOdW1iZXI6IGxpbmVOdW1iZXIsXG4gICAgICAgICAgICAgICAgbGluZVN0YXJ0OiBsaW5lU3RhcnQsXG4gICAgICAgICAgICAgICAgcmFuZ2U6IFtzdGFydCwgaW5kZXhdXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHR5cGU6IFRva2VuLklkZW50aWZpZXIsXG4gICAgICAgICAgICB2YWx1ZTogaWQsXG4gICAgICAgICAgICBsaW5lTnVtYmVyOiBsaW5lTnVtYmVyLFxuICAgICAgICAgICAgbGluZVN0YXJ0OiBsaW5lU3RhcnQsXG4gICAgICAgICAgICByYW5nZTogW3N0YXJ0LCBpbmRleF1cbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvLyA3LjcgUHVuY3R1YXRvcnNcblxuICAgIGZ1bmN0aW9uIHNjYW5QdW5jdHVhdG9yKCkge1xuICAgICAgICB2YXIgc3RhcnQgPSBpbmRleCxcbiAgICAgICAgICAgIGNoMSA9IHNvdXJjZVtpbmRleF0sXG4gICAgICAgICAgICBjaDIsXG4gICAgICAgICAgICBjaDMsXG4gICAgICAgICAgICBjaDQ7XG5cbiAgICAgICAgLy8gQ2hlY2sgZm9yIG1vc3QgY29tbW9uIHNpbmdsZS1jaGFyYWN0ZXIgcHVuY3R1YXRvcnMuXG5cbiAgICAgICAgaWYgKGNoMSA9PT0gJzsnIHx8IGNoMSA9PT0gJ3snIHx8IGNoMSA9PT0gJ30nKSB7XG4gICAgICAgICAgICArK2luZGV4O1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICB0eXBlOiBUb2tlbi5QdW5jdHVhdG9yLFxuICAgICAgICAgICAgICAgIHZhbHVlOiBjaDEsXG4gICAgICAgICAgICAgICAgbGluZU51bWJlcjogbGluZU51bWJlcixcbiAgICAgICAgICAgICAgICBsaW5lU3RhcnQ6IGxpbmVTdGFydCxcbiAgICAgICAgICAgICAgICByYW5nZTogW3N0YXJ0LCBpbmRleF1cbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoY2gxID09PSAnLCcgfHwgY2gxID09PSAnKCcgfHwgY2gxID09PSAnKScpIHtcbiAgICAgICAgICAgICsraW5kZXg7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHR5cGU6IFRva2VuLlB1bmN0dWF0b3IsXG4gICAgICAgICAgICAgICAgdmFsdWU6IGNoMSxcbiAgICAgICAgICAgICAgICBsaW5lTnVtYmVyOiBsaW5lTnVtYmVyLFxuICAgICAgICAgICAgICAgIGxpbmVTdGFydDogbGluZVN0YXJ0LFxuICAgICAgICAgICAgICAgIHJhbmdlOiBbc3RhcnQsIGluZGV4XVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIERvdCAoLikgY2FuIGFsc28gc3RhcnQgYSBmbG9hdGluZy1wb2ludCBudW1iZXIsIGhlbmNlIHRoZSBuZWVkXG4gICAgICAgIC8vIHRvIGNoZWNrIHRoZSBuZXh0IGNoYXJhY3Rlci5cblxuICAgICAgICBjaDIgPSBzb3VyY2VbaW5kZXggKyAxXTtcbiAgICAgICAgaWYgKGNoMSA9PT0gJy4nICYmICFpc0RlY2ltYWxEaWdpdChjaDIpKSB7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHR5cGU6IFRva2VuLlB1bmN0dWF0b3IsXG4gICAgICAgICAgICAgICAgdmFsdWU6IHNvdXJjZVtpbmRleCsrXSxcbiAgICAgICAgICAgICAgICBsaW5lTnVtYmVyOiBsaW5lTnVtYmVyLFxuICAgICAgICAgICAgICAgIGxpbmVTdGFydDogbGluZVN0YXJ0LFxuICAgICAgICAgICAgICAgIHJhbmdlOiBbc3RhcnQsIGluZGV4XVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFBlZWsgbW9yZSBjaGFyYWN0ZXJzLlxuXG4gICAgICAgIGNoMyA9IHNvdXJjZVtpbmRleCArIDJdO1xuICAgICAgICBjaDQgPSBzb3VyY2VbaW5kZXggKyAzXTtcblxuICAgICAgICAvLyA0LWNoYXJhY3RlciBwdW5jdHVhdG9yOiA+Pj49XG5cbiAgICAgICAgaWYgKGNoMSA9PT0gJz4nICYmIGNoMiA9PT0gJz4nICYmIGNoMyA9PT0gJz4nKSB7XG4gICAgICAgICAgICBpZiAoY2g0ID09PSAnPScpIHtcbiAgICAgICAgICAgICAgICBpbmRleCArPSA0O1xuICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IFRva2VuLlB1bmN0dWF0b3IsXG4gICAgICAgICAgICAgICAgICAgIHZhbHVlOiAnPj4+PScsXG4gICAgICAgICAgICAgICAgICAgIGxpbmVOdW1iZXI6IGxpbmVOdW1iZXIsXG4gICAgICAgICAgICAgICAgICAgIGxpbmVTdGFydDogbGluZVN0YXJ0LFxuICAgICAgICAgICAgICAgICAgICByYW5nZTogW3N0YXJ0LCBpbmRleF1cbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gMy1jaGFyYWN0ZXIgcHVuY3R1YXRvcnM6ID09PSAhPT0gPj4+IDw8PSA+Pj1cblxuICAgICAgICBpZiAoY2gxID09PSAnPScgJiYgY2gyID09PSAnPScgJiYgY2gzID09PSAnPScpIHtcbiAgICAgICAgICAgIGluZGV4ICs9IDM7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHR5cGU6IFRva2VuLlB1bmN0dWF0b3IsXG4gICAgICAgICAgICAgICAgdmFsdWU6ICc9PT0nLFxuICAgICAgICAgICAgICAgIGxpbmVOdW1iZXI6IGxpbmVOdW1iZXIsXG4gICAgICAgICAgICAgICAgbGluZVN0YXJ0OiBsaW5lU3RhcnQsXG4gICAgICAgICAgICAgICAgcmFuZ2U6IFtzdGFydCwgaW5kZXhdXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGNoMSA9PT0gJyEnICYmIGNoMiA9PT0gJz0nICYmIGNoMyA9PT0gJz0nKSB7XG4gICAgICAgICAgICBpbmRleCArPSAzO1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICB0eXBlOiBUb2tlbi5QdW5jdHVhdG9yLFxuICAgICAgICAgICAgICAgIHZhbHVlOiAnIT09JyxcbiAgICAgICAgICAgICAgICBsaW5lTnVtYmVyOiBsaW5lTnVtYmVyLFxuICAgICAgICAgICAgICAgIGxpbmVTdGFydDogbGluZVN0YXJ0LFxuICAgICAgICAgICAgICAgIHJhbmdlOiBbc3RhcnQsIGluZGV4XVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChjaDEgPT09ICc+JyAmJiBjaDIgPT09ICc+JyAmJiBjaDMgPT09ICc+Jykge1xuICAgICAgICAgICAgaW5kZXggKz0gMztcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgdHlwZTogVG9rZW4uUHVuY3R1YXRvcixcbiAgICAgICAgICAgICAgICB2YWx1ZTogJz4+PicsXG4gICAgICAgICAgICAgICAgbGluZU51bWJlcjogbGluZU51bWJlcixcbiAgICAgICAgICAgICAgICBsaW5lU3RhcnQ6IGxpbmVTdGFydCxcbiAgICAgICAgICAgICAgICByYW5nZTogW3N0YXJ0LCBpbmRleF1cbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoY2gxID09PSAnPCcgJiYgY2gyID09PSAnPCcgJiYgY2gzID09PSAnPScpIHtcbiAgICAgICAgICAgIGluZGV4ICs9IDM7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHR5cGU6IFRva2VuLlB1bmN0dWF0b3IsXG4gICAgICAgICAgICAgICAgdmFsdWU6ICc8PD0nLFxuICAgICAgICAgICAgICAgIGxpbmVOdW1iZXI6IGxpbmVOdW1iZXIsXG4gICAgICAgICAgICAgICAgbGluZVN0YXJ0OiBsaW5lU3RhcnQsXG4gICAgICAgICAgICAgICAgcmFuZ2U6IFtzdGFydCwgaW5kZXhdXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGNoMSA9PT0gJz4nICYmIGNoMiA9PT0gJz4nICYmIGNoMyA9PT0gJz0nKSB7XG4gICAgICAgICAgICBpbmRleCArPSAzO1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICB0eXBlOiBUb2tlbi5QdW5jdHVhdG9yLFxuICAgICAgICAgICAgICAgIHZhbHVlOiAnPj49JyxcbiAgICAgICAgICAgICAgICBsaW5lTnVtYmVyOiBsaW5lTnVtYmVyLFxuICAgICAgICAgICAgICAgIGxpbmVTdGFydDogbGluZVN0YXJ0LFxuICAgICAgICAgICAgICAgIHJhbmdlOiBbc3RhcnQsIGluZGV4XVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIDItY2hhcmFjdGVyIHB1bmN0dWF0b3JzOiA8PSA+PSA9PSAhPSArKyAtLSA8PCA+PiAmJiB8fFxuICAgICAgICAvLyArPSAtPSAqPSAlPSAmPSB8PSBePSAvPVxuXG4gICAgICAgIGlmIChjaDIgPT09ICc9Jykge1xuICAgICAgICAgICAgaWYgKCc8Pj0hKy0qJSZ8Xi8nLmluZGV4T2YoY2gxKSA+PSAwKSB7XG4gICAgICAgICAgICAgICAgaW5kZXggKz0gMjtcbiAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiBUb2tlbi5QdW5jdHVhdG9yLFxuICAgICAgICAgICAgICAgICAgICB2YWx1ZTogY2gxICsgY2gyLFxuICAgICAgICAgICAgICAgICAgICBsaW5lTnVtYmVyOiBsaW5lTnVtYmVyLFxuICAgICAgICAgICAgICAgICAgICBsaW5lU3RhcnQ6IGxpbmVTdGFydCxcbiAgICAgICAgICAgICAgICAgICAgcmFuZ2U6IFtzdGFydCwgaW5kZXhdXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChjaDEgPT09IGNoMiAmJiAoJystPD4mfCcuaW5kZXhPZihjaDEpID49IDApKSB7XG4gICAgICAgICAgICBpZiAoJystPD4mfCcuaW5kZXhPZihjaDIpID49IDApIHtcbiAgICAgICAgICAgICAgICBpbmRleCArPSAyO1xuICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IFRva2VuLlB1bmN0dWF0b3IsXG4gICAgICAgICAgICAgICAgICAgIHZhbHVlOiBjaDEgKyBjaDIsXG4gICAgICAgICAgICAgICAgICAgIGxpbmVOdW1iZXI6IGxpbmVOdW1iZXIsXG4gICAgICAgICAgICAgICAgICAgIGxpbmVTdGFydDogbGluZVN0YXJ0LFxuICAgICAgICAgICAgICAgICAgICByYW5nZTogW3N0YXJ0LCBpbmRleF1cbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gVGhlIHJlbWFpbmluZyAxLWNoYXJhY3RlciBwdW5jdHVhdG9ycy5cblxuICAgICAgICBpZiAoJ1tdPD4rLSolJnxeIX4/Oj0vJy5pbmRleE9mKGNoMSkgPj0gMCkge1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICB0eXBlOiBUb2tlbi5QdW5jdHVhdG9yLFxuICAgICAgICAgICAgICAgIHZhbHVlOiBzb3VyY2VbaW5kZXgrK10sXG4gICAgICAgICAgICAgICAgbGluZU51bWJlcjogbGluZU51bWJlcixcbiAgICAgICAgICAgICAgICBsaW5lU3RhcnQ6IGxpbmVTdGFydCxcbiAgICAgICAgICAgICAgICByYW5nZTogW3N0YXJ0LCBpbmRleF1cbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvLyA3LjguMyBOdW1lcmljIExpdGVyYWxzXG5cbiAgICBmdW5jdGlvbiBzY2FuTnVtZXJpY0xpdGVyYWwoKSB7XG4gICAgICAgIHZhciBudW1iZXIsIHN0YXJ0LCBjaDtcblxuICAgICAgICBjaCA9IHNvdXJjZVtpbmRleF07XG4gICAgICAgIGFzc2VydChpc0RlY2ltYWxEaWdpdChjaCkgfHwgKGNoID09PSAnLicpLFxuICAgICAgICAgICAgJ051bWVyaWMgbGl0ZXJhbCBtdXN0IHN0YXJ0IHdpdGggYSBkZWNpbWFsIGRpZ2l0IG9yIGEgZGVjaW1hbCBwb2ludCcpO1xuXG4gICAgICAgIHN0YXJ0ID0gaW5kZXg7XG4gICAgICAgIG51bWJlciA9ICcnO1xuICAgICAgICBpZiAoY2ggIT09ICcuJykge1xuICAgICAgICAgICAgbnVtYmVyID0gc291cmNlW2luZGV4KytdO1xuICAgICAgICAgICAgY2ggPSBzb3VyY2VbaW5kZXhdO1xuXG4gICAgICAgICAgICAvLyBIZXggbnVtYmVyIHN0YXJ0cyB3aXRoICcweCcuXG4gICAgICAgICAgICAvLyBPY3RhbCBudW1iZXIgc3RhcnRzIHdpdGggJzAnLlxuICAgICAgICAgICAgaWYgKG51bWJlciA9PT0gJzAnKSB7XG4gICAgICAgICAgICAgICAgaWYgKGNoID09PSAneCcgfHwgY2ggPT09ICdYJykge1xuICAgICAgICAgICAgICAgICAgICBudW1iZXIgKz0gc291cmNlW2luZGV4KytdO1xuICAgICAgICAgICAgICAgICAgICB3aGlsZSAoaW5kZXggPCBsZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNoID0gc291cmNlW2luZGV4XTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghaXNIZXhEaWdpdChjaCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIG51bWJlciArPSBzb3VyY2VbaW5kZXgrK107XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICBpZiAobnVtYmVyLmxlbmd0aCA8PSAyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBvbmx5IDB4XG4gICAgICAgICAgICAgICAgICAgICAgICB0aHJvd0Vycm9yKHt9LCBNZXNzYWdlcy5VbmV4cGVjdGVkVG9rZW4sICdJTExFR0FMJyk7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICBpZiAoaW5kZXggPCBsZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNoID0gc291cmNlW2luZGV4XTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpc0lkZW50aWZpZXJTdGFydChjaCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aHJvd0Vycm9yKHt9LCBNZXNzYWdlcy5VbmV4cGVjdGVkVG9rZW4sICdJTExFR0FMJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6IFRva2VuLk51bWVyaWNMaXRlcmFsLFxuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6IHBhcnNlSW50KG51bWJlciwgMTYpLFxuICAgICAgICAgICAgICAgICAgICAgICAgbGluZU51bWJlcjogbGluZU51bWJlcixcbiAgICAgICAgICAgICAgICAgICAgICAgIGxpbmVTdGFydDogbGluZVN0YXJ0LFxuICAgICAgICAgICAgICAgICAgICAgICAgcmFuZ2U6IFtzdGFydCwgaW5kZXhdXG4gICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChpc09jdGFsRGlnaXQoY2gpKSB7XG4gICAgICAgICAgICAgICAgICAgIG51bWJlciArPSBzb3VyY2VbaW5kZXgrK107XG4gICAgICAgICAgICAgICAgICAgIHdoaWxlIChpbmRleCA8IGxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY2ggPSBzb3VyY2VbaW5kZXhdO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFpc09jdGFsRGlnaXQoY2gpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBudW1iZXIgKz0gc291cmNlW2luZGV4KytdO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKGluZGV4IDwgbGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjaCA9IHNvdXJjZVtpbmRleF07XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoaXNJZGVudGlmaWVyU3RhcnQoY2gpIHx8IGlzRGVjaW1hbERpZ2l0KGNoKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRocm93RXJyb3Ioe30sIE1lc3NhZ2VzLlVuZXhwZWN0ZWRUb2tlbiwgJ0lMTEVHQUwnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogVG9rZW4uTnVtZXJpY0xpdGVyYWwsXG4gICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZTogcGFyc2VJbnQobnVtYmVyLCA4KSxcbiAgICAgICAgICAgICAgICAgICAgICAgIG9jdGFsOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgbGluZU51bWJlcjogbGluZU51bWJlcixcbiAgICAgICAgICAgICAgICAgICAgICAgIGxpbmVTdGFydDogbGluZVN0YXJ0LFxuICAgICAgICAgICAgICAgICAgICAgICAgcmFuZ2U6IFtzdGFydCwgaW5kZXhdXG4gICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy8gZGVjaW1hbCBudW1iZXIgc3RhcnRzIHdpdGggJzAnIHN1Y2ggYXMgJzA5JyBpcyBpbGxlZ2FsLlxuICAgICAgICAgICAgICAgIGlmIChpc0RlY2ltYWxEaWdpdChjaCkpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhyb3dFcnJvcih7fSwgTWVzc2FnZXMuVW5leHBlY3RlZFRva2VuLCAnSUxMRUdBTCcpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgd2hpbGUgKGluZGV4IDwgbGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgY2ggPSBzb3VyY2VbaW5kZXhdO1xuICAgICAgICAgICAgICAgIGlmICghaXNEZWNpbWFsRGlnaXQoY2gpKSB7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBudW1iZXIgKz0gc291cmNlW2luZGV4KytdO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGNoID09PSAnLicpIHtcbiAgICAgICAgICAgIG51bWJlciArPSBzb3VyY2VbaW5kZXgrK107XG4gICAgICAgICAgICB3aGlsZSAoaW5kZXggPCBsZW5ndGgpIHtcbiAgICAgICAgICAgICAgICBjaCA9IHNvdXJjZVtpbmRleF07XG4gICAgICAgICAgICAgICAgaWYgKCFpc0RlY2ltYWxEaWdpdChjaCkpIHtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIG51bWJlciArPSBzb3VyY2VbaW5kZXgrK107XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoY2ggPT09ICdlJyB8fCBjaCA9PT0gJ0UnKSB7XG4gICAgICAgICAgICBudW1iZXIgKz0gc291cmNlW2luZGV4KytdO1xuXG4gICAgICAgICAgICBjaCA9IHNvdXJjZVtpbmRleF07XG4gICAgICAgICAgICBpZiAoY2ggPT09ICcrJyB8fCBjaCA9PT0gJy0nKSB7XG4gICAgICAgICAgICAgICAgbnVtYmVyICs9IHNvdXJjZVtpbmRleCsrXTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY2ggPSBzb3VyY2VbaW5kZXhdO1xuICAgICAgICAgICAgaWYgKGlzRGVjaW1hbERpZ2l0KGNoKSkge1xuICAgICAgICAgICAgICAgIG51bWJlciArPSBzb3VyY2VbaW5kZXgrK107XG4gICAgICAgICAgICAgICAgd2hpbGUgKGluZGV4IDwgbGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgIGNoID0gc291cmNlW2luZGV4XTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFpc0RlY2ltYWxEaWdpdChjaCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIG51bWJlciArPSBzb3VyY2VbaW5kZXgrK107XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjaCA9ICdjaGFyYWN0ZXIgJyArIGNoO1xuICAgICAgICAgICAgICAgIGlmIChpbmRleCA+PSBsZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgY2ggPSAnPGVuZD4nO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB0aHJvd0Vycm9yKHt9LCBNZXNzYWdlcy5VbmV4cGVjdGVkVG9rZW4sICdJTExFR0FMJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoaW5kZXggPCBsZW5ndGgpIHtcbiAgICAgICAgICAgIGNoID0gc291cmNlW2luZGV4XTtcbiAgICAgICAgICAgIGlmIChpc0lkZW50aWZpZXJTdGFydChjaCkpIHtcbiAgICAgICAgICAgICAgICB0aHJvd0Vycm9yKHt9LCBNZXNzYWdlcy5VbmV4cGVjdGVkVG9rZW4sICdJTExFR0FMJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgdHlwZTogVG9rZW4uTnVtZXJpY0xpdGVyYWwsXG4gICAgICAgICAgICB2YWx1ZTogcGFyc2VGbG9hdChudW1iZXIpLFxuICAgICAgICAgICAgbGluZU51bWJlcjogbGluZU51bWJlcixcbiAgICAgICAgICAgIGxpbmVTdGFydDogbGluZVN0YXJ0LFxuICAgICAgICAgICAgcmFuZ2U6IFtzdGFydCwgaW5kZXhdXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLy8gNy44LjQgU3RyaW5nIExpdGVyYWxzXG5cbiAgICBmdW5jdGlvbiBzY2FuU3RyaW5nTGl0ZXJhbCgpIHtcbiAgICAgICAgdmFyIHN0ciA9ICcnLCBxdW90ZSwgc3RhcnQsIGNoLCBjb2RlLCB1bmVzY2FwZWQsIHJlc3RvcmUsIG9jdGFsID0gZmFsc2U7XG5cbiAgICAgICAgcXVvdGUgPSBzb3VyY2VbaW5kZXhdO1xuICAgICAgICBhc3NlcnQoKHF1b3RlID09PSAnXFwnJyB8fCBxdW90ZSA9PT0gJ1wiJyksXG4gICAgICAgICAgICAnU3RyaW5nIGxpdGVyYWwgbXVzdCBzdGFydHMgd2l0aCBhIHF1b3RlJyk7XG5cbiAgICAgICAgc3RhcnQgPSBpbmRleDtcbiAgICAgICAgKytpbmRleDtcblxuICAgICAgICB3aGlsZSAoaW5kZXggPCBsZW5ndGgpIHtcbiAgICAgICAgICAgIGNoID0gc291cmNlW2luZGV4KytdO1xuXG4gICAgICAgICAgICBpZiAoY2ggPT09IHF1b3RlKSB7XG4gICAgICAgICAgICAgICAgcXVvdGUgPSAnJztcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoY2ggPT09ICdcXFxcJykge1xuICAgICAgICAgICAgICAgIGNoID0gc291cmNlW2luZGV4KytdO1xuICAgICAgICAgICAgICAgIGlmICghaXNMaW5lVGVybWluYXRvcihjaCkpIHtcbiAgICAgICAgICAgICAgICAgICAgc3dpdGNoIChjaCkge1xuICAgICAgICAgICAgICAgICAgICBjYXNlICduJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0ciArPSAnXFxuJztcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdyJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0ciArPSAnXFxyJztcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlICd0JzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0ciArPSAnXFx0JztcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlICd1JzpcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAneCc6XG4gICAgICAgICAgICAgICAgICAgICAgICByZXN0b3JlID0gaW5kZXg7XG4gICAgICAgICAgICAgICAgICAgICAgICB1bmVzY2FwZWQgPSBzY2FuSGV4RXNjYXBlKGNoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh1bmVzY2FwZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdHIgKz0gdW5lc2NhcGVkO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpbmRleCA9IHJlc3RvcmU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RyICs9IGNoO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ2InOlxuICAgICAgICAgICAgICAgICAgICAgICAgc3RyICs9ICdcXGInO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ2YnOlxuICAgICAgICAgICAgICAgICAgICAgICAgc3RyICs9ICdcXGYnO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ3YnOlxuICAgICAgICAgICAgICAgICAgICAgICAgc3RyICs9ICdcXHgwQic7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGlzT2N0YWxEaWdpdChjaCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb2RlID0gJzAxMjM0NTY3Jy5pbmRleE9mKGNoKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFxcMCBpcyBub3Qgb2N0YWwgZXNjYXBlIHNlcXVlbmNlXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGNvZGUgIT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb2N0YWwgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpbmRleCA8IGxlbmd0aCAmJiBpc09jdGFsRGlnaXQoc291cmNlW2luZGV4XSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb2N0YWwgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb2RlID0gY29kZSAqIDggKyAnMDEyMzQ1NjcnLmluZGV4T2Yoc291cmNlW2luZGV4KytdKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyAzIGRpZ2l0cyBhcmUgb25seSBhbGxvd2VkIHdoZW4gc3RyaW5nIHN0YXJ0c1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyB3aXRoIDAsIDEsIDIsIDNcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCcwMTIzJy5pbmRleE9mKGNoKSA+PSAwICYmXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaW5kZXggPCBsZW5ndGggJiZcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpc09jdGFsRGlnaXQoc291cmNlW2luZGV4XSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvZGUgPSBjb2RlICogOCArICcwMTIzNDU2NycuaW5kZXhPZihzb3VyY2VbaW5kZXgrK10pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0ciArPSBTdHJpbmcuZnJvbUNoYXJDb2RlKGNvZGUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdHIgKz0gY2g7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICsrbGluZU51bWJlcjtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGNoID09PSAgJ1xccicgJiYgc291cmNlW2luZGV4XSA9PT0gJ1xcbicpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICsraW5kZXg7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGlzTGluZVRlcm1pbmF0b3IoY2gpKSB7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHN0ciArPSBjaDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChxdW90ZSAhPT0gJycpIHtcbiAgICAgICAgICAgIHRocm93RXJyb3Ioe30sIE1lc3NhZ2VzLlVuZXhwZWN0ZWRUb2tlbiwgJ0lMTEVHQUwnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB0eXBlOiBUb2tlbi5TdHJpbmdMaXRlcmFsLFxuICAgICAgICAgICAgdmFsdWU6IHN0cixcbiAgICAgICAgICAgIG9jdGFsOiBvY3RhbCxcbiAgICAgICAgICAgIGxpbmVOdW1iZXI6IGxpbmVOdW1iZXIsXG4gICAgICAgICAgICBsaW5lU3RhcnQ6IGxpbmVTdGFydCxcbiAgICAgICAgICAgIHJhbmdlOiBbc3RhcnQsIGluZGV4XVxuICAgICAgICB9O1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHNjYW5SZWdFeHAoKSB7XG4gICAgICAgIHZhciBzdHIsIGNoLCBzdGFydCwgcGF0dGVybiwgZmxhZ3MsIHZhbHVlLCBjbGFzc01hcmtlciA9IGZhbHNlLCByZXN0b3JlLCB0ZXJtaW5hdGVkID0gZmFsc2U7XG5cbiAgICAgICAgYnVmZmVyID0gbnVsbDtcbiAgICAgICAgc2tpcENvbW1lbnQoKTtcblxuICAgICAgICBzdGFydCA9IGluZGV4O1xuICAgICAgICBjaCA9IHNvdXJjZVtpbmRleF07XG4gICAgICAgIGFzc2VydChjaCA9PT0gJy8nLCAnUmVndWxhciBleHByZXNzaW9uIGxpdGVyYWwgbXVzdCBzdGFydCB3aXRoIGEgc2xhc2gnKTtcbiAgICAgICAgc3RyID0gc291cmNlW2luZGV4KytdO1xuXG4gICAgICAgIHdoaWxlIChpbmRleCA8IGxlbmd0aCkge1xuICAgICAgICAgICAgY2ggPSBzb3VyY2VbaW5kZXgrK107XG4gICAgICAgICAgICBzdHIgKz0gY2g7XG4gICAgICAgICAgICBpZiAoY2xhc3NNYXJrZXIpIHtcbiAgICAgICAgICAgICAgICBpZiAoY2ggPT09ICddJykge1xuICAgICAgICAgICAgICAgICAgICBjbGFzc01hcmtlciA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgaWYgKGNoID09PSAnXFxcXCcpIHtcbiAgICAgICAgICAgICAgICAgICAgY2ggPSBzb3VyY2VbaW5kZXgrK107XG4gICAgICAgICAgICAgICAgICAgIC8vIEVDTUEtMjYyIDcuOC41XG4gICAgICAgICAgICAgICAgICAgIGlmIChpc0xpbmVUZXJtaW5hdG9yKGNoKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3dFcnJvcih7fSwgTWVzc2FnZXMuVW50ZXJtaW5hdGVkUmVnRXhwKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBzdHIgKz0gY2g7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChjaCA9PT0gJy8nKSB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm1pbmF0ZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGNoID09PSAnWycpIHtcbiAgICAgICAgICAgICAgICAgICAgY2xhc3NNYXJrZXIgPSB0cnVlO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoaXNMaW5lVGVybWluYXRvcihjaCkpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhyb3dFcnJvcih7fSwgTWVzc2FnZXMuVW50ZXJtaW5hdGVkUmVnRXhwKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIXRlcm1pbmF0ZWQpIHtcbiAgICAgICAgICAgIHRocm93RXJyb3Ioe30sIE1lc3NhZ2VzLlVudGVybWluYXRlZFJlZ0V4cCk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBFeGNsdWRlIGxlYWRpbmcgYW5kIHRyYWlsaW5nIHNsYXNoLlxuICAgICAgICBwYXR0ZXJuID0gc3RyLnN1YnN0cigxLCBzdHIubGVuZ3RoIC0gMik7XG5cbiAgICAgICAgZmxhZ3MgPSAnJztcbiAgICAgICAgd2hpbGUgKGluZGV4IDwgbGVuZ3RoKSB7XG4gICAgICAgICAgICBjaCA9IHNvdXJjZVtpbmRleF07XG4gICAgICAgICAgICBpZiAoIWlzSWRlbnRpZmllclBhcnQoY2gpKSB7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICsraW5kZXg7XG4gICAgICAgICAgICBpZiAoY2ggPT09ICdcXFxcJyAmJiBpbmRleCA8IGxlbmd0aCkge1xuICAgICAgICAgICAgICAgIGNoID0gc291cmNlW2luZGV4XTtcbiAgICAgICAgICAgICAgICBpZiAoY2ggPT09ICd1Jykge1xuICAgICAgICAgICAgICAgICAgICArK2luZGV4O1xuICAgICAgICAgICAgICAgICAgICByZXN0b3JlID0gaW5kZXg7XG4gICAgICAgICAgICAgICAgICAgIGNoID0gc2NhbkhleEVzY2FwZSgndScpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoY2gpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZsYWdzICs9IGNoO1xuICAgICAgICAgICAgICAgICAgICAgICAgc3RyICs9ICdcXFxcdSc7XG4gICAgICAgICAgICAgICAgICAgICAgICBmb3IgKDsgcmVzdG9yZSA8IGluZGV4OyArK3Jlc3RvcmUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdHIgKz0gc291cmNlW3Jlc3RvcmVdO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgaW5kZXggPSByZXN0b3JlO1xuICAgICAgICAgICAgICAgICAgICAgICAgZmxhZ3MgKz0gJ3UnO1xuICAgICAgICAgICAgICAgICAgICAgICAgc3RyICs9ICdcXFxcdSc7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBzdHIgKz0gJ1xcXFwnO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgZmxhZ3MgKz0gY2g7XG4gICAgICAgICAgICAgICAgc3RyICs9IGNoO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIHZhbHVlID0gbmV3IFJlZ0V4cChwYXR0ZXJuLCBmbGFncyk7XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgIHRocm93RXJyb3Ioe30sIE1lc3NhZ2VzLkludmFsaWRSZWdFeHApO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGxpdGVyYWw6IHN0cixcbiAgICAgICAgICAgIHZhbHVlOiB2YWx1ZSxcbiAgICAgICAgICAgIHJhbmdlOiBbc3RhcnQsIGluZGV4XVxuICAgICAgICB9O1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGlzSWRlbnRpZmllck5hbWUodG9rZW4pIHtcbiAgICAgICAgcmV0dXJuIHRva2VuLnR5cGUgPT09IFRva2VuLklkZW50aWZpZXIgfHxcbiAgICAgICAgICAgIHRva2VuLnR5cGUgPT09IFRva2VuLktleXdvcmQgfHxcbiAgICAgICAgICAgIHRva2VuLnR5cGUgPT09IFRva2VuLkJvb2xlYW5MaXRlcmFsIHx8XG4gICAgICAgICAgICB0b2tlbi50eXBlID09PSBUb2tlbi5OdWxsTGl0ZXJhbDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBhZHZhbmNlKCkge1xuICAgICAgICB2YXIgY2gsIHRva2VuO1xuXG4gICAgICAgIHNraXBDb21tZW50KCk7XG5cbiAgICAgICAgaWYgKGluZGV4ID49IGxlbmd0aCkge1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICB0eXBlOiBUb2tlbi5FT0YsXG4gICAgICAgICAgICAgICAgbGluZU51bWJlcjogbGluZU51bWJlcixcbiAgICAgICAgICAgICAgICBsaW5lU3RhcnQ6IGxpbmVTdGFydCxcbiAgICAgICAgICAgICAgICByYW5nZTogW2luZGV4LCBpbmRleF1cbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cblxuICAgICAgICB0b2tlbiA9IHNjYW5QdW5jdHVhdG9yKCk7XG4gICAgICAgIGlmICh0eXBlb2YgdG9rZW4gIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICByZXR1cm4gdG9rZW47XG4gICAgICAgIH1cblxuICAgICAgICBjaCA9IHNvdXJjZVtpbmRleF07XG5cbiAgICAgICAgaWYgKGNoID09PSAnXFwnJyB8fCBjaCA9PT0gJ1wiJykge1xuICAgICAgICAgICAgcmV0dXJuIHNjYW5TdHJpbmdMaXRlcmFsKCk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoY2ggPT09ICcuJyB8fCBpc0RlY2ltYWxEaWdpdChjaCkpIHtcbiAgICAgICAgICAgIHJldHVybiBzY2FuTnVtZXJpY0xpdGVyYWwoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRva2VuID0gc2NhbklkZW50aWZpZXIoKTtcbiAgICAgICAgaWYgKHR5cGVvZiB0b2tlbiAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIHJldHVybiB0b2tlbjtcbiAgICAgICAgfVxuXG4gICAgICAgIHRocm93RXJyb3Ioe30sIE1lc3NhZ2VzLlVuZXhwZWN0ZWRUb2tlbiwgJ0lMTEVHQUwnKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBsZXgoKSB7XG4gICAgICAgIHZhciB0b2tlbjtcblxuICAgICAgICBpZiAoYnVmZmVyKSB7XG4gICAgICAgICAgICBpbmRleCA9IGJ1ZmZlci5yYW5nZVsxXTtcbiAgICAgICAgICAgIGxpbmVOdW1iZXIgPSBidWZmZXIubGluZU51bWJlcjtcbiAgICAgICAgICAgIGxpbmVTdGFydCA9IGJ1ZmZlci5saW5lU3RhcnQ7XG4gICAgICAgICAgICB0b2tlbiA9IGJ1ZmZlcjtcbiAgICAgICAgICAgIGJ1ZmZlciA9IG51bGw7XG4gICAgICAgICAgICByZXR1cm4gdG9rZW47XG4gICAgICAgIH1cblxuICAgICAgICBidWZmZXIgPSBudWxsO1xuICAgICAgICByZXR1cm4gYWR2YW5jZSgpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGxvb2thaGVhZCgpIHtcbiAgICAgICAgdmFyIHBvcywgbGluZSwgc3RhcnQ7XG5cbiAgICAgICAgaWYgKGJ1ZmZlciAhPT0gbnVsbCkge1xuICAgICAgICAgICAgcmV0dXJuIGJ1ZmZlcjtcbiAgICAgICAgfVxuXG4gICAgICAgIHBvcyA9IGluZGV4O1xuICAgICAgICBsaW5lID0gbGluZU51bWJlcjtcbiAgICAgICAgc3RhcnQgPSBsaW5lU3RhcnQ7XG4gICAgICAgIGJ1ZmZlciA9IGFkdmFuY2UoKTtcbiAgICAgICAgaW5kZXggPSBwb3M7XG4gICAgICAgIGxpbmVOdW1iZXIgPSBsaW5lO1xuICAgICAgICBsaW5lU3RhcnQgPSBzdGFydDtcblxuICAgICAgICByZXR1cm4gYnVmZmVyO1xuICAgIH1cblxuICAgIC8vIFJldHVybiB0cnVlIGlmIHRoZXJlIGlzIGEgbGluZSB0ZXJtaW5hdG9yIGJlZm9yZSB0aGUgbmV4dCB0b2tlbi5cblxuICAgIGZ1bmN0aW9uIHBlZWtMaW5lVGVybWluYXRvcigpIHtcbiAgICAgICAgdmFyIHBvcywgbGluZSwgc3RhcnQsIGZvdW5kO1xuXG4gICAgICAgIHBvcyA9IGluZGV4O1xuICAgICAgICBsaW5lID0gbGluZU51bWJlcjtcbiAgICAgICAgc3RhcnQgPSBsaW5lU3RhcnQ7XG4gICAgICAgIHNraXBDb21tZW50KCk7XG4gICAgICAgIGZvdW5kID0gbGluZU51bWJlciAhPT0gbGluZTtcbiAgICAgICAgaW5kZXggPSBwb3M7XG4gICAgICAgIGxpbmVOdW1iZXIgPSBsaW5lO1xuICAgICAgICBsaW5lU3RhcnQgPSBzdGFydDtcblxuICAgICAgICByZXR1cm4gZm91bmQ7XG4gICAgfVxuXG4gICAgLy8gVGhyb3cgYW4gZXhjZXB0aW9uXG5cbiAgICBmdW5jdGlvbiB0aHJvd0Vycm9yKHRva2VuLCBtZXNzYWdlRm9ybWF0KSB7XG4gICAgICAgIHZhciBlcnJvcixcbiAgICAgICAgICAgIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDIpLFxuICAgICAgICAgICAgbXNnID0gbWVzc2FnZUZvcm1hdC5yZXBsYWNlKFxuICAgICAgICAgICAgICAgIC8lKFxcZCkvZyxcbiAgICAgICAgICAgICAgICBmdW5jdGlvbiAod2hvbGUsIGluZGV4KSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBhcmdzW2luZGV4XSB8fCAnJztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICApO1xuXG4gICAgICAgIGlmICh0eXBlb2YgdG9rZW4ubGluZU51bWJlciA9PT0gJ251bWJlcicpIHtcbiAgICAgICAgICAgIGVycm9yID0gbmV3IEVycm9yKCdMaW5lICcgKyB0b2tlbi5saW5lTnVtYmVyICsgJzogJyArIG1zZyk7XG4gICAgICAgICAgICBlcnJvci5pbmRleCA9IHRva2VuLnJhbmdlWzBdO1xuICAgICAgICAgICAgZXJyb3IubGluZU51bWJlciA9IHRva2VuLmxpbmVOdW1iZXI7XG4gICAgICAgICAgICBlcnJvci5jb2x1bW4gPSB0b2tlbi5yYW5nZVswXSAtIGxpbmVTdGFydCArIDE7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBlcnJvciA9IG5ldyBFcnJvcignTGluZSAnICsgbGluZU51bWJlciArICc6ICcgKyBtc2cpO1xuICAgICAgICAgICAgZXJyb3IuaW5kZXggPSBpbmRleDtcbiAgICAgICAgICAgIGVycm9yLmxpbmVOdW1iZXIgPSBsaW5lTnVtYmVyO1xuICAgICAgICAgICAgZXJyb3IuY29sdW1uID0gaW5kZXggLSBsaW5lU3RhcnQgKyAxO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhyb3cgZXJyb3I7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gdGhyb3dFcnJvclRvbGVyYW50KCkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgdGhyb3dFcnJvci5hcHBseShudWxsLCBhcmd1bWVudHMpO1xuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICBpZiAoZXh0cmEuZXJyb3JzKSB7XG4gICAgICAgICAgICAgICAgZXh0cmEuZXJyb3JzLnB1c2goZSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHRocm93IGU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cblxuICAgIC8vIFRocm93IGFuIGV4Y2VwdGlvbiBiZWNhdXNlIG9mIHRoZSB0b2tlbi5cblxuICAgIGZ1bmN0aW9uIHRocm93VW5leHBlY3RlZCh0b2tlbikge1xuICAgICAgICBpZiAodG9rZW4udHlwZSA9PT0gVG9rZW4uRU9GKSB7XG4gICAgICAgICAgICB0aHJvd0Vycm9yKHRva2VuLCBNZXNzYWdlcy5VbmV4cGVjdGVkRU9TKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0b2tlbi50eXBlID09PSBUb2tlbi5OdW1lcmljTGl0ZXJhbCkge1xuICAgICAgICAgICAgdGhyb3dFcnJvcih0b2tlbiwgTWVzc2FnZXMuVW5leHBlY3RlZE51bWJlcik7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodG9rZW4udHlwZSA9PT0gVG9rZW4uU3RyaW5nTGl0ZXJhbCkge1xuICAgICAgICAgICAgdGhyb3dFcnJvcih0b2tlbiwgTWVzc2FnZXMuVW5leHBlY3RlZFN0cmluZyk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodG9rZW4udHlwZSA9PT0gVG9rZW4uSWRlbnRpZmllcikge1xuICAgICAgICAgICAgdGhyb3dFcnJvcih0b2tlbiwgTWVzc2FnZXMuVW5leHBlY3RlZElkZW50aWZpZXIpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHRva2VuLnR5cGUgPT09IFRva2VuLktleXdvcmQpIHtcbiAgICAgICAgICAgIGlmIChpc0Z1dHVyZVJlc2VydmVkV29yZCh0b2tlbi52YWx1ZSkpIHtcbiAgICAgICAgICAgICAgICB0aHJvd0Vycm9yKHRva2VuLCBNZXNzYWdlcy5VbmV4cGVjdGVkUmVzZXJ2ZWQpO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChzdHJpY3QgJiYgaXNTdHJpY3RNb2RlUmVzZXJ2ZWRXb3JkKHRva2VuLnZhbHVlKSkge1xuICAgICAgICAgICAgICAgIHRocm93RXJyb3JUb2xlcmFudCh0b2tlbiwgTWVzc2FnZXMuU3RyaWN0UmVzZXJ2ZWRXb3JkKTtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aHJvd0Vycm9yKHRva2VuLCBNZXNzYWdlcy5VbmV4cGVjdGVkVG9rZW4sIHRva2VuLnZhbHVlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEJvb2xlYW5MaXRlcmFsLCBOdWxsTGl0ZXJhbCwgb3IgUHVuY3R1YXRvci5cbiAgICAgICAgdGhyb3dFcnJvcih0b2tlbiwgTWVzc2FnZXMuVW5leHBlY3RlZFRva2VuLCB0b2tlbi52YWx1ZSk7XG4gICAgfVxuXG4gICAgLy8gRXhwZWN0IHRoZSBuZXh0IHRva2VuIHRvIG1hdGNoIHRoZSBzcGVjaWZpZWQgcHVuY3R1YXRvci5cbiAgICAvLyBJZiBub3QsIGFuIGV4Y2VwdGlvbiB3aWxsIGJlIHRocm93bi5cblxuICAgIGZ1bmN0aW9uIGV4cGVjdCh2YWx1ZSkge1xuICAgICAgICB2YXIgdG9rZW4gPSBsZXgoKTtcbiAgICAgICAgaWYgKHRva2VuLnR5cGUgIT09IFRva2VuLlB1bmN0dWF0b3IgfHwgdG9rZW4udmFsdWUgIT09IHZhbHVlKSB7XG4gICAgICAgICAgICB0aHJvd1VuZXhwZWN0ZWQodG9rZW4pO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy8gRXhwZWN0IHRoZSBuZXh0IHRva2VuIHRvIG1hdGNoIHRoZSBzcGVjaWZpZWQga2V5d29yZC5cbiAgICAvLyBJZiBub3QsIGFuIGV4Y2VwdGlvbiB3aWxsIGJlIHRocm93bi5cblxuICAgIGZ1bmN0aW9uIGV4cGVjdEtleXdvcmQoa2V5d29yZCkge1xuICAgICAgICB2YXIgdG9rZW4gPSBsZXgoKTtcbiAgICAgICAgaWYgKHRva2VuLnR5cGUgIT09IFRva2VuLktleXdvcmQgfHwgdG9rZW4udmFsdWUgIT09IGtleXdvcmQpIHtcbiAgICAgICAgICAgIHRocm93VW5leHBlY3RlZCh0b2tlbik7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBSZXR1cm4gdHJ1ZSBpZiB0aGUgbmV4dCB0b2tlbiBtYXRjaGVzIHRoZSBzcGVjaWZpZWQgcHVuY3R1YXRvci5cblxuICAgIGZ1bmN0aW9uIG1hdGNoKHZhbHVlKSB7XG4gICAgICAgIHZhciB0b2tlbiA9IGxvb2thaGVhZCgpO1xuICAgICAgICByZXR1cm4gdG9rZW4udHlwZSA9PT0gVG9rZW4uUHVuY3R1YXRvciAmJiB0b2tlbi52YWx1ZSA9PT0gdmFsdWU7XG4gICAgfVxuXG4gICAgLy8gUmV0dXJuIHRydWUgaWYgdGhlIG5leHQgdG9rZW4gbWF0Y2hlcyB0aGUgc3BlY2lmaWVkIGtleXdvcmRcblxuICAgIGZ1bmN0aW9uIG1hdGNoS2V5d29yZChrZXl3b3JkKSB7XG4gICAgICAgIHZhciB0b2tlbiA9IGxvb2thaGVhZCgpO1xuICAgICAgICByZXR1cm4gdG9rZW4udHlwZSA9PT0gVG9rZW4uS2V5d29yZCAmJiB0b2tlbi52YWx1ZSA9PT0ga2V5d29yZDtcbiAgICB9XG5cbiAgICAvLyBSZXR1cm4gdHJ1ZSBpZiB0aGUgbmV4dCB0b2tlbiBpcyBhbiBhc3NpZ25tZW50IG9wZXJhdG9yXG5cbiAgICBmdW5jdGlvbiBtYXRjaEFzc2lnbigpIHtcbiAgICAgICAgdmFyIHRva2VuID0gbG9va2FoZWFkKCksXG4gICAgICAgICAgICBvcCA9IHRva2VuLnZhbHVlO1xuXG4gICAgICAgIGlmICh0b2tlbi50eXBlICE9PSBUb2tlbi5QdW5jdHVhdG9yKSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG9wID09PSAnPScgfHxcbiAgICAgICAgICAgIG9wID09PSAnKj0nIHx8XG4gICAgICAgICAgICBvcCA9PT0gJy89JyB8fFxuICAgICAgICAgICAgb3AgPT09ICclPScgfHxcbiAgICAgICAgICAgIG9wID09PSAnKz0nIHx8XG4gICAgICAgICAgICBvcCA9PT0gJy09JyB8fFxuICAgICAgICAgICAgb3AgPT09ICc8PD0nIHx8XG4gICAgICAgICAgICBvcCA9PT0gJz4+PScgfHxcbiAgICAgICAgICAgIG9wID09PSAnPj4+PScgfHxcbiAgICAgICAgICAgIG9wID09PSAnJj0nIHx8XG4gICAgICAgICAgICBvcCA9PT0gJ149JyB8fFxuICAgICAgICAgICAgb3AgPT09ICd8PSc7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gY29uc3VtZVNlbWljb2xvbigpIHtcbiAgICAgICAgdmFyIHRva2VuLCBsaW5lO1xuXG4gICAgICAgIC8vIENhdGNoIHRoZSB2ZXJ5IGNvbW1vbiBjYXNlIGZpcnN0LlxuICAgICAgICBpZiAoc291cmNlW2luZGV4XSA9PT0gJzsnKSB7XG4gICAgICAgICAgICBsZXgoKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGxpbmUgPSBsaW5lTnVtYmVyO1xuICAgICAgICBza2lwQ29tbWVudCgpO1xuICAgICAgICBpZiAobGluZU51bWJlciAhPT0gbGluZSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKG1hdGNoKCc7JykpIHtcbiAgICAgICAgICAgIGxleCgpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgdG9rZW4gPSBsb29rYWhlYWQoKTtcbiAgICAgICAgaWYgKHRva2VuLnR5cGUgIT09IFRva2VuLkVPRiAmJiAhbWF0Y2goJ30nKSkge1xuICAgICAgICAgICAgdGhyb3dVbmV4cGVjdGVkKHRva2VuKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8vIFJldHVybiB0cnVlIGlmIHByb3ZpZGVkIGV4cHJlc3Npb24gaXMgTGVmdEhhbmRTaWRlRXhwcmVzc2lvblxuXG4gICAgZnVuY3Rpb24gaXNMZWZ0SGFuZFNpZGUoZXhwcikge1xuICAgICAgICByZXR1cm4gZXhwci50eXBlID09PSBTeW50YXguSWRlbnRpZmllciB8fCBleHByLnR5cGUgPT09IFN5bnRheC5NZW1iZXJFeHByZXNzaW9uO1xuICAgIH1cblxuICAgIC8vIDExLjEuNCBBcnJheSBJbml0aWFsaXNlclxuXG4gICAgZnVuY3Rpb24gcGFyc2VBcnJheUluaXRpYWxpc2VyKCkge1xuICAgICAgICB2YXIgZWxlbWVudHMgPSBbXTtcblxuICAgICAgICBleHBlY3QoJ1snKTtcblxuICAgICAgICB3aGlsZSAoIW1hdGNoKCddJykpIHtcbiAgICAgICAgICAgIGlmIChtYXRjaCgnLCcpKSB7XG4gICAgICAgICAgICAgICAgbGV4KCk7XG4gICAgICAgICAgICAgICAgZWxlbWVudHMucHVzaChudWxsKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgZWxlbWVudHMucHVzaChwYXJzZUFzc2lnbm1lbnRFeHByZXNzaW9uKCkpO1xuXG4gICAgICAgICAgICAgICAgaWYgKCFtYXRjaCgnXScpKSB7XG4gICAgICAgICAgICAgICAgICAgIGV4cGVjdCgnLCcpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGV4cGVjdCgnXScpO1xuXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB0eXBlOiBTeW50YXguQXJyYXlFeHByZXNzaW9uLFxuICAgICAgICAgICAgZWxlbWVudHM6IGVsZW1lbnRzXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLy8gMTEuMS41IE9iamVjdCBJbml0aWFsaXNlclxuXG4gICAgZnVuY3Rpb24gcGFyc2VQcm9wZXJ0eUZ1bmN0aW9uKHBhcmFtLCBmaXJzdCkge1xuICAgICAgICB2YXIgcHJldmlvdXNTdHJpY3QsIGJvZHk7XG5cbiAgICAgICAgcHJldmlvdXNTdHJpY3QgPSBzdHJpY3Q7XG4gICAgICAgIGJvZHkgPSBwYXJzZUZ1bmN0aW9uU291cmNlRWxlbWVudHMoKTtcbiAgICAgICAgaWYgKGZpcnN0ICYmIHN0cmljdCAmJiBpc1Jlc3RyaWN0ZWRXb3JkKHBhcmFtWzBdLm5hbWUpKSB7XG4gICAgICAgICAgICB0aHJvd0Vycm9yVG9sZXJhbnQoZmlyc3QsIE1lc3NhZ2VzLlN0cmljdFBhcmFtTmFtZSk7XG4gICAgICAgIH1cbiAgICAgICAgc3RyaWN0ID0gcHJldmlvdXNTdHJpY3Q7XG5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHR5cGU6IFN5bnRheC5GdW5jdGlvbkV4cHJlc3Npb24sXG4gICAgICAgICAgICBpZDogbnVsbCxcbiAgICAgICAgICAgIHBhcmFtczogcGFyYW0sXG4gICAgICAgICAgICBkZWZhdWx0czogW10sXG4gICAgICAgICAgICBib2R5OiBib2R5LFxuICAgICAgICAgICAgcmVzdDogbnVsbCxcbiAgICAgICAgICAgIGdlbmVyYXRvcjogZmFsc2UsXG4gICAgICAgICAgICBleHByZXNzaW9uOiBmYWxzZVxuICAgICAgICB9O1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHBhcnNlT2JqZWN0UHJvcGVydHlLZXkoKSB7XG4gICAgICAgIHZhciB0b2tlbiA9IGxleCgpO1xuXG4gICAgICAgIC8vIE5vdGU6IFRoaXMgZnVuY3Rpb24gaXMgY2FsbGVkIG9ubHkgZnJvbSBwYXJzZU9iamVjdFByb3BlcnR5KCksIHdoZXJlXG4gICAgICAgIC8vIEVPRiBhbmQgUHVuY3R1YXRvciB0b2tlbnMgYXJlIGFscmVhZHkgZmlsdGVyZWQgb3V0LlxuXG4gICAgICAgIGlmICh0b2tlbi50eXBlID09PSBUb2tlbi5TdHJpbmdMaXRlcmFsIHx8IHRva2VuLnR5cGUgPT09IFRva2VuLk51bWVyaWNMaXRlcmFsKSB7XG4gICAgICAgICAgICBpZiAoc3RyaWN0ICYmIHRva2VuLm9jdGFsKSB7XG4gICAgICAgICAgICAgICAgdGhyb3dFcnJvclRvbGVyYW50KHRva2VuLCBNZXNzYWdlcy5TdHJpY3RPY3RhbExpdGVyYWwpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIGNyZWF0ZUxpdGVyYWwodG9rZW4pO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHR5cGU6IFN5bnRheC5JZGVudGlmaWVyLFxuICAgICAgICAgICAgbmFtZTogdG9rZW4udmFsdWVcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBwYXJzZU9iamVjdFByb3BlcnR5KCkge1xuICAgICAgICB2YXIgdG9rZW4sIGtleSwgaWQsIHBhcmFtO1xuXG4gICAgICAgIHRva2VuID0gbG9va2FoZWFkKCk7XG5cbiAgICAgICAgaWYgKHRva2VuLnR5cGUgPT09IFRva2VuLklkZW50aWZpZXIpIHtcblxuICAgICAgICAgICAgaWQgPSBwYXJzZU9iamVjdFByb3BlcnR5S2V5KCk7XG5cbiAgICAgICAgICAgIC8vIFByb3BlcnR5IEFzc2lnbm1lbnQ6IEdldHRlciBhbmQgU2V0dGVyLlxuXG4gICAgICAgICAgICBpZiAodG9rZW4udmFsdWUgPT09ICdnZXQnICYmICFtYXRjaCgnOicpKSB7XG4gICAgICAgICAgICAgICAga2V5ID0gcGFyc2VPYmplY3RQcm9wZXJ0eUtleSgpO1xuICAgICAgICAgICAgICAgIGV4cGVjdCgnKCcpO1xuICAgICAgICAgICAgICAgIGV4cGVjdCgnKScpO1xuICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IFN5bnRheC5Qcm9wZXJ0eSxcbiAgICAgICAgICAgICAgICAgICAga2V5OiBrZXksXG4gICAgICAgICAgICAgICAgICAgIHZhbHVlOiBwYXJzZVByb3BlcnR5RnVuY3Rpb24oW10pLFxuICAgICAgICAgICAgICAgICAgICBraW5kOiAnZ2V0J1xuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHRva2VuLnZhbHVlID09PSAnc2V0JyAmJiAhbWF0Y2goJzonKSkge1xuICAgICAgICAgICAgICAgIGtleSA9IHBhcnNlT2JqZWN0UHJvcGVydHlLZXkoKTtcbiAgICAgICAgICAgICAgICBleHBlY3QoJygnKTtcbiAgICAgICAgICAgICAgICB0b2tlbiA9IGxvb2thaGVhZCgpO1xuICAgICAgICAgICAgICAgIGlmICh0b2tlbi50eXBlICE9PSBUb2tlbi5JZGVudGlmaWVyKSB7XG4gICAgICAgICAgICAgICAgICAgIGV4cGVjdCgnKScpO1xuICAgICAgICAgICAgICAgICAgICB0aHJvd0Vycm9yVG9sZXJhbnQodG9rZW4sIE1lc3NhZ2VzLlVuZXhwZWN0ZWRUb2tlbiwgdG9rZW4udmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogU3ludGF4LlByb3BlcnR5LFxuICAgICAgICAgICAgICAgICAgICAgICAga2V5OiBrZXksXG4gICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZTogcGFyc2VQcm9wZXJ0eUZ1bmN0aW9uKFtdKSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGtpbmQ6ICdzZXQnXG4gICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcGFyYW0gPSBbIHBhcnNlVmFyaWFibGVJZGVudGlmaWVyKCkgXTtcbiAgICAgICAgICAgICAgICAgICAgZXhwZWN0KCcpJyk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiBTeW50YXguUHJvcGVydHksXG4gICAgICAgICAgICAgICAgICAgICAgICBrZXk6IGtleSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlOiBwYXJzZVByb3BlcnR5RnVuY3Rpb24ocGFyYW0sIHRva2VuKSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGtpbmQ6ICdzZXQnXG4gICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBleHBlY3QoJzonKTtcbiAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiBTeW50YXguUHJvcGVydHksXG4gICAgICAgICAgICAgICAgICAgIGtleTogaWQsXG4gICAgICAgICAgICAgICAgICAgIHZhbHVlOiBwYXJzZUFzc2lnbm1lbnRFeHByZXNzaW9uKCksXG4gICAgICAgICAgICAgICAgICAgIGtpbmQ6ICdpbml0J1xuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAodG9rZW4udHlwZSA9PT0gVG9rZW4uRU9GIHx8IHRva2VuLnR5cGUgPT09IFRva2VuLlB1bmN0dWF0b3IpIHtcbiAgICAgICAgICAgIHRocm93VW5leHBlY3RlZCh0b2tlbik7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBrZXkgPSBwYXJzZU9iamVjdFByb3BlcnR5S2V5KCk7XG4gICAgICAgICAgICBleHBlY3QoJzonKTtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgdHlwZTogU3ludGF4LlByb3BlcnR5LFxuICAgICAgICAgICAgICAgIGtleToga2V5LFxuICAgICAgICAgICAgICAgIHZhbHVlOiBwYXJzZUFzc2lnbm1lbnRFeHByZXNzaW9uKCksXG4gICAgICAgICAgICAgICAga2luZDogJ2luaXQnXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcGFyc2VPYmplY3RJbml0aWFsaXNlcigpIHtcbiAgICAgICAgdmFyIHByb3BlcnRpZXMgPSBbXSwgcHJvcGVydHksIG5hbWUsIGtpbmQsIG1hcCA9IHt9LCB0b1N0cmluZyA9IFN0cmluZztcblxuICAgICAgICBleHBlY3QoJ3snKTtcblxuICAgICAgICB3aGlsZSAoIW1hdGNoKCd9JykpIHtcbiAgICAgICAgICAgIHByb3BlcnR5ID0gcGFyc2VPYmplY3RQcm9wZXJ0eSgpO1xuXG4gICAgICAgICAgICBpZiAocHJvcGVydHkua2V5LnR5cGUgPT09IFN5bnRheC5JZGVudGlmaWVyKSB7XG4gICAgICAgICAgICAgICAgbmFtZSA9IHByb3BlcnR5LmtleS5uYW1lO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBuYW1lID0gdG9TdHJpbmcocHJvcGVydHkua2V5LnZhbHVlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGtpbmQgPSAocHJvcGVydHkua2luZCA9PT0gJ2luaXQnKSA/IFByb3BlcnR5S2luZC5EYXRhIDogKHByb3BlcnR5LmtpbmQgPT09ICdnZXQnKSA/IFByb3BlcnR5S2luZC5HZXQgOiBQcm9wZXJ0eUtpbmQuU2V0O1xuICAgICAgICAgICAgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChtYXAsIG5hbWUpKSB7XG4gICAgICAgICAgICAgICAgaWYgKG1hcFtuYW1lXSA9PT0gUHJvcGVydHlLaW5kLkRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHN0cmljdCAmJiBraW5kID09PSBQcm9wZXJ0eUtpbmQuRGF0YSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3dFcnJvclRvbGVyYW50KHt9LCBNZXNzYWdlcy5TdHJpY3REdXBsaWNhdGVQcm9wZXJ0eSk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoa2luZCAhPT0gUHJvcGVydHlLaW5kLkRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRocm93RXJyb3JUb2xlcmFudCh7fSwgTWVzc2FnZXMuQWNjZXNzb3JEYXRhUHJvcGVydHkpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGtpbmQgPT09IFByb3BlcnR5S2luZC5EYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aHJvd0Vycm9yVG9sZXJhbnQoe30sIE1lc3NhZ2VzLkFjY2Vzc29yRGF0YVByb3BlcnR5KTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChtYXBbbmFtZV0gJiBraW5kKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aHJvd0Vycm9yVG9sZXJhbnQoe30sIE1lc3NhZ2VzLkFjY2Vzc29yR2V0U2V0KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBtYXBbbmFtZV0gfD0ga2luZDtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgbWFwW25hbWVdID0ga2luZDtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcHJvcGVydGllcy5wdXNoKHByb3BlcnR5KTtcblxuICAgICAgICAgICAgaWYgKCFtYXRjaCgnfScpKSB7XG4gICAgICAgICAgICAgICAgZXhwZWN0KCcsJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBleHBlY3QoJ30nKTtcblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgdHlwZTogU3ludGF4Lk9iamVjdEV4cHJlc3Npb24sXG4gICAgICAgICAgICBwcm9wZXJ0aWVzOiBwcm9wZXJ0aWVzXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLy8gMTEuMS42IFRoZSBHcm91cGluZyBPcGVyYXRvclxuXG4gICAgZnVuY3Rpb24gcGFyc2VHcm91cEV4cHJlc3Npb24oKSB7XG4gICAgICAgIHZhciBleHByO1xuXG4gICAgICAgIGV4cGVjdCgnKCcpO1xuXG4gICAgICAgIGV4cHIgPSBwYXJzZUV4cHJlc3Npb24oKTtcblxuICAgICAgICBleHBlY3QoJyknKTtcblxuICAgICAgICByZXR1cm4gZXhwcjtcbiAgICB9XG5cblxuICAgIC8vIDExLjEgUHJpbWFyeSBFeHByZXNzaW9uc1xuXG4gICAgZnVuY3Rpb24gcGFyc2VQcmltYXJ5RXhwcmVzc2lvbigpIHtcbiAgICAgICAgdmFyIHRva2VuID0gbG9va2FoZWFkKCksXG4gICAgICAgICAgICB0eXBlID0gdG9rZW4udHlwZTtcblxuICAgICAgICBpZiAodHlwZSA9PT0gVG9rZW4uSWRlbnRpZmllcikge1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICB0eXBlOiBTeW50YXguSWRlbnRpZmllcixcbiAgICAgICAgICAgICAgICBuYW1lOiBsZXgoKS52YWx1ZVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0eXBlID09PSBUb2tlbi5TdHJpbmdMaXRlcmFsIHx8IHR5cGUgPT09IFRva2VuLk51bWVyaWNMaXRlcmFsKSB7XG4gICAgICAgICAgICBpZiAoc3RyaWN0ICYmIHRva2VuLm9jdGFsKSB7XG4gICAgICAgICAgICAgICAgdGhyb3dFcnJvclRvbGVyYW50KHRva2VuLCBNZXNzYWdlcy5TdHJpY3RPY3RhbExpdGVyYWwpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIGNyZWF0ZUxpdGVyYWwobGV4KCkpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHR5cGUgPT09IFRva2VuLktleXdvcmQpIHtcbiAgICAgICAgICAgIGlmIChtYXRjaEtleXdvcmQoJ3RoaXMnKSkge1xuICAgICAgICAgICAgICAgIGxleCgpO1xuICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IFN5bnRheC5UaGlzRXhwcmVzc2lvblxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChtYXRjaEtleXdvcmQoJ2Z1bmN0aW9uJykpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gcGFyc2VGdW5jdGlvbkV4cHJlc3Npb24oKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0eXBlID09PSBUb2tlbi5Cb29sZWFuTGl0ZXJhbCkge1xuICAgICAgICAgICAgbGV4KCk7XG4gICAgICAgICAgICB0b2tlbi52YWx1ZSA9ICh0b2tlbi52YWx1ZSA9PT0gJ3RydWUnKTtcbiAgICAgICAgICAgIHJldHVybiBjcmVhdGVMaXRlcmFsKHRva2VuKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0eXBlID09PSBUb2tlbi5OdWxsTGl0ZXJhbCkge1xuICAgICAgICAgICAgbGV4KCk7XG4gICAgICAgICAgICB0b2tlbi52YWx1ZSA9IG51bGw7XG4gICAgICAgICAgICByZXR1cm4gY3JlYXRlTGl0ZXJhbCh0b2tlbik7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAobWF0Y2goJ1snKSkge1xuICAgICAgICAgICAgcmV0dXJuIHBhcnNlQXJyYXlJbml0aWFsaXNlcigpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKG1hdGNoKCd7JykpIHtcbiAgICAgICAgICAgIHJldHVybiBwYXJzZU9iamVjdEluaXRpYWxpc2VyKCk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAobWF0Y2goJygnKSkge1xuICAgICAgICAgICAgcmV0dXJuIHBhcnNlR3JvdXBFeHByZXNzaW9uKCk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAobWF0Y2goJy8nKSB8fCBtYXRjaCgnLz0nKSkge1xuICAgICAgICAgICAgcmV0dXJuIGNyZWF0ZUxpdGVyYWwoc2NhblJlZ0V4cCgpKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB0aHJvd1VuZXhwZWN0ZWQobGV4KCkpO1xuICAgIH1cblxuICAgIC8vIDExLjIgTGVmdC1IYW5kLVNpZGUgRXhwcmVzc2lvbnNcblxuICAgIGZ1bmN0aW9uIHBhcnNlQXJndW1lbnRzKCkge1xuICAgICAgICB2YXIgYXJncyA9IFtdO1xuXG4gICAgICAgIGV4cGVjdCgnKCcpO1xuXG4gICAgICAgIGlmICghbWF0Y2goJyknKSkge1xuICAgICAgICAgICAgd2hpbGUgKGluZGV4IDwgbGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgYXJncy5wdXNoKHBhcnNlQXNzaWdubWVudEV4cHJlc3Npb24oKSk7XG4gICAgICAgICAgICAgICAgaWYgKG1hdGNoKCcpJykpIHtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGV4cGVjdCgnLCcpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgZXhwZWN0KCcpJyk7XG5cbiAgICAgICAgcmV0dXJuIGFyZ3M7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcGFyc2VOb25Db21wdXRlZFByb3BlcnR5KCkge1xuICAgICAgICB2YXIgdG9rZW4gPSBsZXgoKTtcblxuICAgICAgICBpZiAoIWlzSWRlbnRpZmllck5hbWUodG9rZW4pKSB7XG4gICAgICAgICAgICB0aHJvd1VuZXhwZWN0ZWQodG9rZW4pO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHR5cGU6IFN5bnRheC5JZGVudGlmaWVyLFxuICAgICAgICAgICAgbmFtZTogdG9rZW4udmFsdWVcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBwYXJzZU5vbkNvbXB1dGVkTWVtYmVyKCkge1xuICAgICAgICBleHBlY3QoJy4nKTtcblxuICAgICAgICByZXR1cm4gcGFyc2VOb25Db21wdXRlZFByb3BlcnR5KCk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcGFyc2VDb21wdXRlZE1lbWJlcigpIHtcbiAgICAgICAgdmFyIGV4cHI7XG5cbiAgICAgICAgZXhwZWN0KCdbJyk7XG5cbiAgICAgICAgZXhwciA9IHBhcnNlRXhwcmVzc2lvbigpO1xuXG4gICAgICAgIGV4cGVjdCgnXScpO1xuXG4gICAgICAgIHJldHVybiBleHByO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHBhcnNlTmV3RXhwcmVzc2lvbigpIHtcbiAgICAgICAgdmFyIGV4cHI7XG5cbiAgICAgICAgZXhwZWN0S2V5d29yZCgnbmV3Jyk7XG5cbiAgICAgICAgZXhwciA9IHtcbiAgICAgICAgICAgIHR5cGU6IFN5bnRheC5OZXdFeHByZXNzaW9uLFxuICAgICAgICAgICAgY2FsbGVlOiBwYXJzZUxlZnRIYW5kU2lkZUV4cHJlc3Npb24oKSxcbiAgICAgICAgICAgICdhcmd1bWVudHMnOiBbXVxuICAgICAgICB9O1xuXG4gICAgICAgIGlmIChtYXRjaCgnKCcpKSB7XG4gICAgICAgICAgICBleHByWydhcmd1bWVudHMnXSA9IHBhcnNlQXJndW1lbnRzKCk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gZXhwcjtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBwYXJzZUxlZnRIYW5kU2lkZUV4cHJlc3Npb25BbGxvd0NhbGwoKSB7XG4gICAgICAgIHZhciBleHByO1xuXG4gICAgICAgIGV4cHIgPSBtYXRjaEtleXdvcmQoJ25ldycpID8gcGFyc2VOZXdFeHByZXNzaW9uKCkgOiBwYXJzZVByaW1hcnlFeHByZXNzaW9uKCk7XG5cbiAgICAgICAgd2hpbGUgKG1hdGNoKCcuJykgfHwgbWF0Y2goJ1snKSB8fCBtYXRjaCgnKCcpKSB7XG4gICAgICAgICAgICBpZiAobWF0Y2goJygnKSkge1xuICAgICAgICAgICAgICAgIGV4cHIgPSB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IFN5bnRheC5DYWxsRXhwcmVzc2lvbixcbiAgICAgICAgICAgICAgICAgICAgY2FsbGVlOiBleHByLFxuICAgICAgICAgICAgICAgICAgICAnYXJndW1lbnRzJzogcGFyc2VBcmd1bWVudHMoKVxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9IGVsc2UgaWYgKG1hdGNoKCdbJykpIHtcbiAgICAgICAgICAgICAgICBleHByID0ge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiBTeW50YXguTWVtYmVyRXhwcmVzc2lvbixcbiAgICAgICAgICAgICAgICAgICAgY29tcHV0ZWQ6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIG9iamVjdDogZXhwcixcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydHk6IHBhcnNlQ29tcHV0ZWRNZW1iZXIoKVxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGV4cHIgPSB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IFN5bnRheC5NZW1iZXJFeHByZXNzaW9uLFxuICAgICAgICAgICAgICAgICAgICBjb21wdXRlZDogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgIG9iamVjdDogZXhwcixcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydHk6IHBhcnNlTm9uQ29tcHV0ZWRNZW1iZXIoKVxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gZXhwcjtcbiAgICB9XG5cblxuICAgIGZ1bmN0aW9uIHBhcnNlTGVmdEhhbmRTaWRlRXhwcmVzc2lvbigpIHtcbiAgICAgICAgdmFyIGV4cHI7XG5cbiAgICAgICAgZXhwciA9IG1hdGNoS2V5d29yZCgnbmV3JykgPyBwYXJzZU5ld0V4cHJlc3Npb24oKSA6IHBhcnNlUHJpbWFyeUV4cHJlc3Npb24oKTtcblxuICAgICAgICB3aGlsZSAobWF0Y2goJy4nKSB8fCBtYXRjaCgnWycpKSB7XG4gICAgICAgICAgICBpZiAobWF0Y2goJ1snKSkge1xuICAgICAgICAgICAgICAgIGV4cHIgPSB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IFN5bnRheC5NZW1iZXJFeHByZXNzaW9uLFxuICAgICAgICAgICAgICAgICAgICBjb21wdXRlZDogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgb2JqZWN0OiBleHByLFxuICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0eTogcGFyc2VDb21wdXRlZE1lbWJlcigpXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgZXhwciA9IHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogU3ludGF4Lk1lbWJlckV4cHJlc3Npb24sXG4gICAgICAgICAgICAgICAgICAgIGNvbXB1dGVkOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgb2JqZWN0OiBleHByLFxuICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0eTogcGFyc2VOb25Db21wdXRlZE1lbWJlcigpXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBleHByO1xuICAgIH1cblxuICAgIC8vIDExLjMgUG9zdGZpeCBFeHByZXNzaW9uc1xuXG4gICAgZnVuY3Rpb24gcGFyc2VQb3N0Zml4RXhwcmVzc2lvbigpIHtcbiAgICAgICAgdmFyIGV4cHIgPSBwYXJzZUxlZnRIYW5kU2lkZUV4cHJlc3Npb25BbGxvd0NhbGwoKSwgdG9rZW47XG5cbiAgICAgICAgdG9rZW4gPSBsb29rYWhlYWQoKTtcbiAgICAgICAgaWYgKHRva2VuLnR5cGUgIT09IFRva2VuLlB1bmN0dWF0b3IpIHtcbiAgICAgICAgICAgIHJldHVybiBleHByO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKChtYXRjaCgnKysnKSB8fCBtYXRjaCgnLS0nKSkgJiYgIXBlZWtMaW5lVGVybWluYXRvcigpKSB7XG4gICAgICAgICAgICAvLyAxMS4zLjEsIDExLjMuMlxuICAgICAgICAgICAgaWYgKHN0cmljdCAmJiBleHByLnR5cGUgPT09IFN5bnRheC5JZGVudGlmaWVyICYmIGlzUmVzdHJpY3RlZFdvcmQoZXhwci5uYW1lKSkge1xuICAgICAgICAgICAgICAgIHRocm93RXJyb3JUb2xlcmFudCh7fSwgTWVzc2FnZXMuU3RyaWN0TEhTUG9zdGZpeCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmICghaXNMZWZ0SGFuZFNpZGUoZXhwcikpIHtcbiAgICAgICAgICAgICAgICB0aHJvd0Vycm9yKHt9LCBNZXNzYWdlcy5JbnZhbGlkTEhTSW5Bc3NpZ25tZW50KTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgZXhwciA9IHtcbiAgICAgICAgICAgICAgICB0eXBlOiBTeW50YXguVXBkYXRlRXhwcmVzc2lvbixcbiAgICAgICAgICAgICAgICBvcGVyYXRvcjogbGV4KCkudmFsdWUsXG4gICAgICAgICAgICAgICAgYXJndW1lbnQ6IGV4cHIsXG4gICAgICAgICAgICAgICAgcHJlZml4OiBmYWxzZVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBleHByO1xuICAgIH1cblxuICAgIC8vIDExLjQgVW5hcnkgT3BlcmF0b3JzXG5cbiAgICBmdW5jdGlvbiBwYXJzZVVuYXJ5RXhwcmVzc2lvbigpIHtcbiAgICAgICAgdmFyIHRva2VuLCBleHByO1xuXG4gICAgICAgIHRva2VuID0gbG9va2FoZWFkKCk7XG4gICAgICAgIGlmICh0b2tlbi50eXBlICE9PSBUb2tlbi5QdW5jdHVhdG9yICYmIHRva2VuLnR5cGUgIT09IFRva2VuLktleXdvcmQpIHtcbiAgICAgICAgICAgIHJldHVybiBwYXJzZVBvc3RmaXhFeHByZXNzaW9uKCk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAobWF0Y2goJysrJykgfHwgbWF0Y2goJy0tJykpIHtcbiAgICAgICAgICAgIHRva2VuID0gbGV4KCk7XG4gICAgICAgICAgICBleHByID0gcGFyc2VVbmFyeUV4cHJlc3Npb24oKTtcbiAgICAgICAgICAgIC8vIDExLjQuNCwgMTEuNC41XG4gICAgICAgICAgICBpZiAoc3RyaWN0ICYmIGV4cHIudHlwZSA9PT0gU3ludGF4LklkZW50aWZpZXIgJiYgaXNSZXN0cmljdGVkV29yZChleHByLm5hbWUpKSB7XG4gICAgICAgICAgICAgICAgdGhyb3dFcnJvclRvbGVyYW50KHt9LCBNZXNzYWdlcy5TdHJpY3RMSFNQcmVmaXgpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoIWlzTGVmdEhhbmRTaWRlKGV4cHIpKSB7XG4gICAgICAgICAgICAgICAgdGhyb3dFcnJvcih7fSwgTWVzc2FnZXMuSW52YWxpZExIU0luQXNzaWdubWVudCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGV4cHIgPSB7XG4gICAgICAgICAgICAgICAgdHlwZTogU3ludGF4LlVwZGF0ZUV4cHJlc3Npb24sXG4gICAgICAgICAgICAgICAgb3BlcmF0b3I6IHRva2VuLnZhbHVlLFxuICAgICAgICAgICAgICAgIGFyZ3VtZW50OiBleHByLFxuICAgICAgICAgICAgICAgIHByZWZpeDogdHJ1ZVxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIHJldHVybiBleHByO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKG1hdGNoKCcrJykgfHwgbWF0Y2goJy0nKSB8fCBtYXRjaCgnficpIHx8IG1hdGNoKCchJykpIHtcbiAgICAgICAgICAgIGV4cHIgPSB7XG4gICAgICAgICAgICAgICAgdHlwZTogU3ludGF4LlVuYXJ5RXhwcmVzc2lvbixcbiAgICAgICAgICAgICAgICBvcGVyYXRvcjogbGV4KCkudmFsdWUsXG4gICAgICAgICAgICAgICAgYXJndW1lbnQ6IHBhcnNlVW5hcnlFeHByZXNzaW9uKCksXG4gICAgICAgICAgICAgICAgcHJlZml4OiB0cnVlXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgcmV0dXJuIGV4cHI7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAobWF0Y2hLZXl3b3JkKCdkZWxldGUnKSB8fCBtYXRjaEtleXdvcmQoJ3ZvaWQnKSB8fCBtYXRjaEtleXdvcmQoJ3R5cGVvZicpKSB7XG4gICAgICAgICAgICBleHByID0ge1xuICAgICAgICAgICAgICAgIHR5cGU6IFN5bnRheC5VbmFyeUV4cHJlc3Npb24sXG4gICAgICAgICAgICAgICAgb3BlcmF0b3I6IGxleCgpLnZhbHVlLFxuICAgICAgICAgICAgICAgIGFyZ3VtZW50OiBwYXJzZVVuYXJ5RXhwcmVzc2lvbigpLFxuICAgICAgICAgICAgICAgIHByZWZpeDogdHJ1ZVxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIGlmIChzdHJpY3QgJiYgZXhwci5vcGVyYXRvciA9PT0gJ2RlbGV0ZScgJiYgZXhwci5hcmd1bWVudC50eXBlID09PSBTeW50YXguSWRlbnRpZmllcikge1xuICAgICAgICAgICAgICAgIHRocm93RXJyb3JUb2xlcmFudCh7fSwgTWVzc2FnZXMuU3RyaWN0RGVsZXRlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBleHByO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHBhcnNlUG9zdGZpeEV4cHJlc3Npb24oKTtcbiAgICB9XG5cbiAgICAvLyAxMS41IE11bHRpcGxpY2F0aXZlIE9wZXJhdG9yc1xuXG4gICAgZnVuY3Rpb24gcGFyc2VNdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb24oKSB7XG4gICAgICAgIHZhciBleHByID0gcGFyc2VVbmFyeUV4cHJlc3Npb24oKTtcblxuICAgICAgICB3aGlsZSAobWF0Y2goJyonKSB8fCBtYXRjaCgnLycpIHx8IG1hdGNoKCclJykpIHtcbiAgICAgICAgICAgIGV4cHIgPSB7XG4gICAgICAgICAgICAgICAgdHlwZTogU3ludGF4LkJpbmFyeUV4cHJlc3Npb24sXG4gICAgICAgICAgICAgICAgb3BlcmF0b3I6IGxleCgpLnZhbHVlLFxuICAgICAgICAgICAgICAgIGxlZnQ6IGV4cHIsXG4gICAgICAgICAgICAgICAgcmlnaHQ6IHBhcnNlVW5hcnlFeHByZXNzaW9uKClcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gZXhwcjtcbiAgICB9XG5cbiAgICAvLyAxMS42IEFkZGl0aXZlIE9wZXJhdG9yc1xuXG4gICAgZnVuY3Rpb24gcGFyc2VBZGRpdGl2ZUV4cHJlc3Npb24oKSB7XG4gICAgICAgIHZhciBleHByID0gcGFyc2VNdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb24oKTtcblxuICAgICAgICB3aGlsZSAobWF0Y2goJysnKSB8fCBtYXRjaCgnLScpKSB7XG4gICAgICAgICAgICBleHByID0ge1xuICAgICAgICAgICAgICAgIHR5cGU6IFN5bnRheC5CaW5hcnlFeHByZXNzaW9uLFxuICAgICAgICAgICAgICAgIG9wZXJhdG9yOiBsZXgoKS52YWx1ZSxcbiAgICAgICAgICAgICAgICBsZWZ0OiBleHByLFxuICAgICAgICAgICAgICAgIHJpZ2h0OiBwYXJzZU11bHRpcGxpY2F0aXZlRXhwcmVzc2lvbigpXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGV4cHI7XG4gICAgfVxuXG4gICAgLy8gMTEuNyBCaXR3aXNlIFNoaWZ0IE9wZXJhdG9yc1xuXG4gICAgZnVuY3Rpb24gcGFyc2VTaGlmdEV4cHJlc3Npb24oKSB7XG4gICAgICAgIHZhciBleHByID0gcGFyc2VBZGRpdGl2ZUV4cHJlc3Npb24oKTtcblxuICAgICAgICB3aGlsZSAobWF0Y2goJzw8JykgfHwgbWF0Y2goJz4+JykgfHwgbWF0Y2goJz4+PicpKSB7XG4gICAgICAgICAgICBleHByID0ge1xuICAgICAgICAgICAgICAgIHR5cGU6IFN5bnRheC5CaW5hcnlFeHByZXNzaW9uLFxuICAgICAgICAgICAgICAgIG9wZXJhdG9yOiBsZXgoKS52YWx1ZSxcbiAgICAgICAgICAgICAgICBsZWZ0OiBleHByLFxuICAgICAgICAgICAgICAgIHJpZ2h0OiBwYXJzZUFkZGl0aXZlRXhwcmVzc2lvbigpXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGV4cHI7XG4gICAgfVxuICAgIC8vIDExLjggUmVsYXRpb25hbCBPcGVyYXRvcnNcblxuICAgIGZ1bmN0aW9uIHBhcnNlUmVsYXRpb25hbEV4cHJlc3Npb24oKSB7XG4gICAgICAgIHZhciBleHByLCBwcmV2aW91c0FsbG93SW47XG5cbiAgICAgICAgcHJldmlvdXNBbGxvd0luID0gc3RhdGUuYWxsb3dJbjtcbiAgICAgICAgc3RhdGUuYWxsb3dJbiA9IHRydWU7XG5cbiAgICAgICAgZXhwciA9IHBhcnNlU2hpZnRFeHByZXNzaW9uKCk7XG5cbiAgICAgICAgd2hpbGUgKG1hdGNoKCc8JykgfHwgbWF0Y2goJz4nKSB8fCBtYXRjaCgnPD0nKSB8fCBtYXRjaCgnPj0nKSB8fCAocHJldmlvdXNBbGxvd0luICYmIG1hdGNoS2V5d29yZCgnaW4nKSkgfHwgbWF0Y2hLZXl3b3JkKCdpbnN0YW5jZW9mJykpIHtcbiAgICAgICAgICAgIGV4cHIgPSB7XG4gICAgICAgICAgICAgICAgdHlwZTogU3ludGF4LkJpbmFyeUV4cHJlc3Npb24sXG4gICAgICAgICAgICAgICAgb3BlcmF0b3I6IGxleCgpLnZhbHVlLFxuICAgICAgICAgICAgICAgIGxlZnQ6IGV4cHIsXG4gICAgICAgICAgICAgICAgcmlnaHQ6IHBhcnNlU2hpZnRFeHByZXNzaW9uKClcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cblxuICAgICAgICBzdGF0ZS5hbGxvd0luID0gcHJldmlvdXNBbGxvd0luO1xuICAgICAgICByZXR1cm4gZXhwcjtcbiAgICB9XG5cbiAgICAvLyAxMS45IEVxdWFsaXR5IE9wZXJhdG9yc1xuXG4gICAgZnVuY3Rpb24gcGFyc2VFcXVhbGl0eUV4cHJlc3Npb24oKSB7XG4gICAgICAgIHZhciBleHByID0gcGFyc2VSZWxhdGlvbmFsRXhwcmVzc2lvbigpO1xuXG4gICAgICAgIHdoaWxlIChtYXRjaCgnPT0nKSB8fCBtYXRjaCgnIT0nKSB8fCBtYXRjaCgnPT09JykgfHwgbWF0Y2goJyE9PScpKSB7XG4gICAgICAgICAgICBleHByID0ge1xuICAgICAgICAgICAgICAgIHR5cGU6IFN5bnRheC5CaW5hcnlFeHByZXNzaW9uLFxuICAgICAgICAgICAgICAgIG9wZXJhdG9yOiBsZXgoKS52YWx1ZSxcbiAgICAgICAgICAgICAgICBsZWZ0OiBleHByLFxuICAgICAgICAgICAgICAgIHJpZ2h0OiBwYXJzZVJlbGF0aW9uYWxFeHByZXNzaW9uKClcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gZXhwcjtcbiAgICB9XG5cbiAgICAvLyAxMS4xMCBCaW5hcnkgQml0d2lzZSBPcGVyYXRvcnNcblxuICAgIGZ1bmN0aW9uIHBhcnNlQml0d2lzZUFOREV4cHJlc3Npb24oKSB7XG4gICAgICAgIHZhciBleHByID0gcGFyc2VFcXVhbGl0eUV4cHJlc3Npb24oKTtcblxuICAgICAgICB3aGlsZSAobWF0Y2goJyYnKSkge1xuICAgICAgICAgICAgbGV4KCk7XG4gICAgICAgICAgICBleHByID0ge1xuICAgICAgICAgICAgICAgIHR5cGU6IFN5bnRheC5CaW5hcnlFeHByZXNzaW9uLFxuICAgICAgICAgICAgICAgIG9wZXJhdG9yOiAnJicsXG4gICAgICAgICAgICAgICAgbGVmdDogZXhwcixcbiAgICAgICAgICAgICAgICByaWdodDogcGFyc2VFcXVhbGl0eUV4cHJlc3Npb24oKVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBleHByO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHBhcnNlQml0d2lzZVhPUkV4cHJlc3Npb24oKSB7XG4gICAgICAgIHZhciBleHByID0gcGFyc2VCaXR3aXNlQU5ERXhwcmVzc2lvbigpO1xuXG4gICAgICAgIHdoaWxlIChtYXRjaCgnXicpKSB7XG4gICAgICAgICAgICBsZXgoKTtcbiAgICAgICAgICAgIGV4cHIgPSB7XG4gICAgICAgICAgICAgICAgdHlwZTogU3ludGF4LkJpbmFyeUV4cHJlc3Npb24sXG4gICAgICAgICAgICAgICAgb3BlcmF0b3I6ICdeJyxcbiAgICAgICAgICAgICAgICBsZWZ0OiBleHByLFxuICAgICAgICAgICAgICAgIHJpZ2h0OiBwYXJzZUJpdHdpc2VBTkRFeHByZXNzaW9uKClcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gZXhwcjtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBwYXJzZUJpdHdpc2VPUkV4cHJlc3Npb24oKSB7XG4gICAgICAgIHZhciBleHByID0gcGFyc2VCaXR3aXNlWE9SRXhwcmVzc2lvbigpO1xuXG4gICAgICAgIHdoaWxlIChtYXRjaCgnfCcpKSB7XG4gICAgICAgICAgICBsZXgoKTtcbiAgICAgICAgICAgIGV4cHIgPSB7XG4gICAgICAgICAgICAgICAgdHlwZTogU3ludGF4LkJpbmFyeUV4cHJlc3Npb24sXG4gICAgICAgICAgICAgICAgb3BlcmF0b3I6ICd8JyxcbiAgICAgICAgICAgICAgICBsZWZ0OiBleHByLFxuICAgICAgICAgICAgICAgIHJpZ2h0OiBwYXJzZUJpdHdpc2VYT1JFeHByZXNzaW9uKClcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gZXhwcjtcbiAgICB9XG5cbiAgICAvLyAxMS4xMSBCaW5hcnkgTG9naWNhbCBPcGVyYXRvcnNcblxuICAgIGZ1bmN0aW9uIHBhcnNlTG9naWNhbEFOREV4cHJlc3Npb24oKSB7XG4gICAgICAgIHZhciBleHByID0gcGFyc2VCaXR3aXNlT1JFeHByZXNzaW9uKCk7XG5cbiAgICAgICAgd2hpbGUgKG1hdGNoKCcmJicpKSB7XG4gICAgICAgICAgICBsZXgoKTtcbiAgICAgICAgICAgIGV4cHIgPSB7XG4gICAgICAgICAgICAgICAgdHlwZTogU3ludGF4LkxvZ2ljYWxFeHByZXNzaW9uLFxuICAgICAgICAgICAgICAgIG9wZXJhdG9yOiAnJiYnLFxuICAgICAgICAgICAgICAgIGxlZnQ6IGV4cHIsXG4gICAgICAgICAgICAgICAgcmlnaHQ6IHBhcnNlQml0d2lzZU9SRXhwcmVzc2lvbigpXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGV4cHI7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcGFyc2VMb2dpY2FsT1JFeHByZXNzaW9uKCkge1xuICAgICAgICB2YXIgZXhwciA9IHBhcnNlTG9naWNhbEFOREV4cHJlc3Npb24oKTtcblxuICAgICAgICB3aGlsZSAobWF0Y2goJ3x8JykpIHtcbiAgICAgICAgICAgIGxleCgpO1xuICAgICAgICAgICAgZXhwciA9IHtcbiAgICAgICAgICAgICAgICB0eXBlOiBTeW50YXguTG9naWNhbEV4cHJlc3Npb24sXG4gICAgICAgICAgICAgICAgb3BlcmF0b3I6ICd8fCcsXG4gICAgICAgICAgICAgICAgbGVmdDogZXhwcixcbiAgICAgICAgICAgICAgICByaWdodDogcGFyc2VMb2dpY2FsQU5ERXhwcmVzc2lvbigpXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGV4cHI7XG4gICAgfVxuXG4gICAgLy8gMTEuMTIgQ29uZGl0aW9uYWwgT3BlcmF0b3JcblxuICAgIGZ1bmN0aW9uIHBhcnNlQ29uZGl0aW9uYWxFeHByZXNzaW9uKCkge1xuICAgICAgICB2YXIgZXhwciwgcHJldmlvdXNBbGxvd0luLCBjb25zZXF1ZW50O1xuXG4gICAgICAgIGV4cHIgPSBwYXJzZUxvZ2ljYWxPUkV4cHJlc3Npb24oKTtcblxuICAgICAgICBpZiAobWF0Y2goJz8nKSkge1xuICAgICAgICAgICAgbGV4KCk7XG4gICAgICAgICAgICBwcmV2aW91c0FsbG93SW4gPSBzdGF0ZS5hbGxvd0luO1xuICAgICAgICAgICAgc3RhdGUuYWxsb3dJbiA9IHRydWU7XG4gICAgICAgICAgICBjb25zZXF1ZW50ID0gcGFyc2VBc3NpZ25tZW50RXhwcmVzc2lvbigpO1xuICAgICAgICAgICAgc3RhdGUuYWxsb3dJbiA9IHByZXZpb3VzQWxsb3dJbjtcbiAgICAgICAgICAgIGV4cGVjdCgnOicpO1xuXG4gICAgICAgICAgICBleHByID0ge1xuICAgICAgICAgICAgICAgIHR5cGU6IFN5bnRheC5Db25kaXRpb25hbEV4cHJlc3Npb24sXG4gICAgICAgICAgICAgICAgdGVzdDogZXhwcixcbiAgICAgICAgICAgICAgICBjb25zZXF1ZW50OiBjb25zZXF1ZW50LFxuICAgICAgICAgICAgICAgIGFsdGVybmF0ZTogcGFyc2VBc3NpZ25tZW50RXhwcmVzc2lvbigpXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGV4cHI7XG4gICAgfVxuXG4gICAgLy8gMTEuMTMgQXNzaWdubWVudCBPcGVyYXRvcnNcblxuICAgIGZ1bmN0aW9uIHBhcnNlQXNzaWdubWVudEV4cHJlc3Npb24oKSB7XG4gICAgICAgIHZhciB0b2tlbiwgZXhwcjtcblxuICAgICAgICB0b2tlbiA9IGxvb2thaGVhZCgpO1xuICAgICAgICBleHByID0gcGFyc2VDb25kaXRpb25hbEV4cHJlc3Npb24oKTtcblxuICAgICAgICBpZiAobWF0Y2hBc3NpZ24oKSkge1xuICAgICAgICAgICAgLy8gTGVmdEhhbmRTaWRlRXhwcmVzc2lvblxuICAgICAgICAgICAgaWYgKCFpc0xlZnRIYW5kU2lkZShleHByKSkge1xuICAgICAgICAgICAgICAgIHRocm93RXJyb3Ioe30sIE1lc3NhZ2VzLkludmFsaWRMSFNJbkFzc2lnbm1lbnQpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyAxMS4xMy4xXG4gICAgICAgICAgICBpZiAoc3RyaWN0ICYmIGV4cHIudHlwZSA9PT0gU3ludGF4LklkZW50aWZpZXIgJiYgaXNSZXN0cmljdGVkV29yZChleHByLm5hbWUpKSB7XG4gICAgICAgICAgICAgICAgdGhyb3dFcnJvclRvbGVyYW50KHRva2VuLCBNZXNzYWdlcy5TdHJpY3RMSFNBc3NpZ25tZW50KTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgZXhwciA9IHtcbiAgICAgICAgICAgICAgICB0eXBlOiBTeW50YXguQXNzaWdubWVudEV4cHJlc3Npb24sXG4gICAgICAgICAgICAgICAgb3BlcmF0b3I6IGxleCgpLnZhbHVlLFxuICAgICAgICAgICAgICAgIGxlZnQ6IGV4cHIsXG4gICAgICAgICAgICAgICAgcmlnaHQ6IHBhcnNlQXNzaWdubWVudEV4cHJlc3Npb24oKVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBleHByO1xuICAgIH1cblxuICAgIC8vIDExLjE0IENvbW1hIE9wZXJhdG9yXG5cbiAgICBmdW5jdGlvbiBwYXJzZUV4cHJlc3Npb24oKSB7XG4gICAgICAgIHZhciBleHByID0gcGFyc2VBc3NpZ25tZW50RXhwcmVzc2lvbigpO1xuXG4gICAgICAgIGlmIChtYXRjaCgnLCcpKSB7XG4gICAgICAgICAgICBleHByID0ge1xuICAgICAgICAgICAgICAgIHR5cGU6IFN5bnRheC5TZXF1ZW5jZUV4cHJlc3Npb24sXG4gICAgICAgICAgICAgICAgZXhwcmVzc2lvbnM6IFsgZXhwciBdXG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICB3aGlsZSAoaW5kZXggPCBsZW5ndGgpIHtcbiAgICAgICAgICAgICAgICBpZiAoIW1hdGNoKCcsJykpIHtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGxleCgpO1xuICAgICAgICAgICAgICAgIGV4cHIuZXhwcmVzc2lvbnMucHVzaChwYXJzZUFzc2lnbm1lbnRFeHByZXNzaW9uKCkpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGV4cHI7XG4gICAgfVxuXG4gICAgLy8gMTIuMSBCbG9ja1xuXG4gICAgZnVuY3Rpb24gcGFyc2VTdGF0ZW1lbnRMaXN0KCkge1xuICAgICAgICB2YXIgbGlzdCA9IFtdLFxuICAgICAgICAgICAgc3RhdGVtZW50O1xuXG4gICAgICAgIHdoaWxlIChpbmRleCA8IGxlbmd0aCkge1xuICAgICAgICAgICAgaWYgKG1hdGNoKCd9JykpIHtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHN0YXRlbWVudCA9IHBhcnNlU291cmNlRWxlbWVudCgpO1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBzdGF0ZW1lbnQgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBsaXN0LnB1c2goc3RhdGVtZW50KTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBsaXN0O1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHBhcnNlQmxvY2soKSB7XG4gICAgICAgIHZhciBibG9jaztcblxuICAgICAgICBleHBlY3QoJ3snKTtcblxuICAgICAgICBibG9jayA9IHBhcnNlU3RhdGVtZW50TGlzdCgpO1xuXG4gICAgICAgIGV4cGVjdCgnfScpO1xuXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB0eXBlOiBTeW50YXguQmxvY2tTdGF0ZW1lbnQsXG4gICAgICAgICAgICBib2R5OiBibG9ja1xuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8vIDEyLjIgVmFyaWFibGUgU3RhdGVtZW50XG5cbiAgICBmdW5jdGlvbiBwYXJzZVZhcmlhYmxlSWRlbnRpZmllcigpIHtcbiAgICAgICAgdmFyIHRva2VuID0gbGV4KCk7XG5cbiAgICAgICAgaWYgKHRva2VuLnR5cGUgIT09IFRva2VuLklkZW50aWZpZXIpIHtcbiAgICAgICAgICAgIHRocm93VW5leHBlY3RlZCh0b2tlbik7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgdHlwZTogU3ludGF4LklkZW50aWZpZXIsXG4gICAgICAgICAgICBuYW1lOiB0b2tlbi52YWx1ZVxuICAgICAgICB9O1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHBhcnNlVmFyaWFibGVEZWNsYXJhdGlvbihraW5kKSB7XG4gICAgICAgIHZhciBpZCA9IHBhcnNlVmFyaWFibGVJZGVudGlmaWVyKCksXG4gICAgICAgICAgICBpbml0ID0gbnVsbDtcblxuICAgICAgICAvLyAxMi4yLjFcbiAgICAgICAgaWYgKHN0cmljdCAmJiBpc1Jlc3RyaWN0ZWRXb3JkKGlkLm5hbWUpKSB7XG4gICAgICAgICAgICB0aHJvd0Vycm9yVG9sZXJhbnQoe30sIE1lc3NhZ2VzLlN0cmljdFZhck5hbWUpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGtpbmQgPT09ICdjb25zdCcpIHtcbiAgICAgICAgICAgIGV4cGVjdCgnPScpO1xuICAgICAgICAgICAgaW5pdCA9IHBhcnNlQXNzaWdubWVudEV4cHJlc3Npb24oKTtcbiAgICAgICAgfSBlbHNlIGlmIChtYXRjaCgnPScpKSB7XG4gICAgICAgICAgICBsZXgoKTtcbiAgICAgICAgICAgIGluaXQgPSBwYXJzZUFzc2lnbm1lbnRFeHByZXNzaW9uKCk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgdHlwZTogU3ludGF4LlZhcmlhYmxlRGVjbGFyYXRvcixcbiAgICAgICAgICAgIGlkOiBpZCxcbiAgICAgICAgICAgIGluaXQ6IGluaXRcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBwYXJzZVZhcmlhYmxlRGVjbGFyYXRpb25MaXN0KGtpbmQpIHtcbiAgICAgICAgdmFyIGxpc3QgPSBbXTtcblxuICAgICAgICBkbyB7XG4gICAgICAgICAgICBsaXN0LnB1c2gocGFyc2VWYXJpYWJsZURlY2xhcmF0aW9uKGtpbmQpKTtcbiAgICAgICAgICAgIGlmICghbWF0Y2goJywnKSkge1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgbGV4KCk7XG4gICAgICAgIH0gd2hpbGUgKGluZGV4IDwgbGVuZ3RoKTtcblxuICAgICAgICByZXR1cm4gbGlzdDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBwYXJzZVZhcmlhYmxlU3RhdGVtZW50KCkge1xuICAgICAgICB2YXIgZGVjbGFyYXRpb25zO1xuXG4gICAgICAgIGV4cGVjdEtleXdvcmQoJ3ZhcicpO1xuXG4gICAgICAgIGRlY2xhcmF0aW9ucyA9IHBhcnNlVmFyaWFibGVEZWNsYXJhdGlvbkxpc3QoKTtcblxuICAgICAgICBjb25zdW1lU2VtaWNvbG9uKCk7XG5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHR5cGU6IFN5bnRheC5WYXJpYWJsZURlY2xhcmF0aW9uLFxuICAgICAgICAgICAgZGVjbGFyYXRpb25zOiBkZWNsYXJhdGlvbnMsXG4gICAgICAgICAgICBraW5kOiAndmFyJ1xuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8vIGtpbmQgbWF5IGJlIGBjb25zdGAgb3IgYGxldGBcbiAgICAvLyBCb3RoIGFyZSBleHBlcmltZW50YWwgYW5kIG5vdCBpbiB0aGUgc3BlY2lmaWNhdGlvbiB5ZXQuXG4gICAgLy8gc2VlIGh0dHA6Ly93aWtpLmVjbWFzY3JpcHQub3JnL2Rva3UucGhwP2lkPWhhcm1vbnk6Y29uc3RcbiAgICAvLyBhbmQgaHR0cDovL3dpa2kuZWNtYXNjcmlwdC5vcmcvZG9rdS5waHA/aWQ9aGFybW9ueTpsZXRcbiAgICBmdW5jdGlvbiBwYXJzZUNvbnN0TGV0RGVjbGFyYXRpb24oa2luZCkge1xuICAgICAgICB2YXIgZGVjbGFyYXRpb25zO1xuXG4gICAgICAgIGV4cGVjdEtleXdvcmQoa2luZCk7XG5cbiAgICAgICAgZGVjbGFyYXRpb25zID0gcGFyc2VWYXJpYWJsZURlY2xhcmF0aW9uTGlzdChraW5kKTtcblxuICAgICAgICBjb25zdW1lU2VtaWNvbG9uKCk7XG5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHR5cGU6IFN5bnRheC5WYXJpYWJsZURlY2xhcmF0aW9uLFxuICAgICAgICAgICAgZGVjbGFyYXRpb25zOiBkZWNsYXJhdGlvbnMsXG4gICAgICAgICAgICBraW5kOiBraW5kXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLy8gMTIuMyBFbXB0eSBTdGF0ZW1lbnRcblxuICAgIGZ1bmN0aW9uIHBhcnNlRW1wdHlTdGF0ZW1lbnQoKSB7XG4gICAgICAgIGV4cGVjdCgnOycpO1xuXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB0eXBlOiBTeW50YXguRW1wdHlTdGF0ZW1lbnRcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvLyAxMi40IEV4cHJlc3Npb24gU3RhdGVtZW50XG5cbiAgICBmdW5jdGlvbiBwYXJzZUV4cHJlc3Npb25TdGF0ZW1lbnQoKSB7XG4gICAgICAgIHZhciBleHByID0gcGFyc2VFeHByZXNzaW9uKCk7XG5cbiAgICAgICAgY29uc3VtZVNlbWljb2xvbigpO1xuXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB0eXBlOiBTeW50YXguRXhwcmVzc2lvblN0YXRlbWVudCxcbiAgICAgICAgICAgIGV4cHJlc3Npb246IGV4cHJcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvLyAxMi41IElmIHN0YXRlbWVudFxuXG4gICAgZnVuY3Rpb24gcGFyc2VJZlN0YXRlbWVudCgpIHtcbiAgICAgICAgdmFyIHRlc3QsIGNvbnNlcXVlbnQsIGFsdGVybmF0ZTtcblxuICAgICAgICBleHBlY3RLZXl3b3JkKCdpZicpO1xuXG4gICAgICAgIGV4cGVjdCgnKCcpO1xuXG4gICAgICAgIHRlc3QgPSBwYXJzZUV4cHJlc3Npb24oKTtcblxuICAgICAgICBleHBlY3QoJyknKTtcblxuICAgICAgICBjb25zZXF1ZW50ID0gcGFyc2VTdGF0ZW1lbnQoKTtcblxuICAgICAgICBpZiAobWF0Y2hLZXl3b3JkKCdlbHNlJykpIHtcbiAgICAgICAgICAgIGxleCgpO1xuICAgICAgICAgICAgYWx0ZXJuYXRlID0gcGFyc2VTdGF0ZW1lbnQoKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGFsdGVybmF0ZSA9IG51bGw7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgdHlwZTogU3ludGF4LklmU3RhdGVtZW50LFxuICAgICAgICAgICAgdGVzdDogdGVzdCxcbiAgICAgICAgICAgIGNvbnNlcXVlbnQ6IGNvbnNlcXVlbnQsXG4gICAgICAgICAgICBhbHRlcm5hdGU6IGFsdGVybmF0ZVxuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8vIDEyLjYgSXRlcmF0aW9uIFN0YXRlbWVudHNcblxuICAgIGZ1bmN0aW9uIHBhcnNlRG9XaGlsZVN0YXRlbWVudCgpIHtcbiAgICAgICAgdmFyIGJvZHksIHRlc3QsIG9sZEluSXRlcmF0aW9uO1xuXG4gICAgICAgIGV4cGVjdEtleXdvcmQoJ2RvJyk7XG5cbiAgICAgICAgb2xkSW5JdGVyYXRpb24gPSBzdGF0ZS5pbkl0ZXJhdGlvbjtcbiAgICAgICAgc3RhdGUuaW5JdGVyYXRpb24gPSB0cnVlO1xuXG4gICAgICAgIGJvZHkgPSBwYXJzZVN0YXRlbWVudCgpO1xuXG4gICAgICAgIHN0YXRlLmluSXRlcmF0aW9uID0gb2xkSW5JdGVyYXRpb247XG5cbiAgICAgICAgZXhwZWN0S2V5d29yZCgnd2hpbGUnKTtcblxuICAgICAgICBleHBlY3QoJygnKTtcblxuICAgICAgICB0ZXN0ID0gcGFyc2VFeHByZXNzaW9uKCk7XG5cbiAgICAgICAgZXhwZWN0KCcpJyk7XG5cbiAgICAgICAgaWYgKG1hdGNoKCc7JykpIHtcbiAgICAgICAgICAgIGxleCgpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHR5cGU6IFN5bnRheC5Eb1doaWxlU3RhdGVtZW50LFxuICAgICAgICAgICAgYm9keTogYm9keSxcbiAgICAgICAgICAgIHRlc3Q6IHRlc3RcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBwYXJzZVdoaWxlU3RhdGVtZW50KCkge1xuICAgICAgICB2YXIgdGVzdCwgYm9keSwgb2xkSW5JdGVyYXRpb247XG5cbiAgICAgICAgZXhwZWN0S2V5d29yZCgnd2hpbGUnKTtcblxuICAgICAgICBleHBlY3QoJygnKTtcblxuICAgICAgICB0ZXN0ID0gcGFyc2VFeHByZXNzaW9uKCk7XG5cbiAgICAgICAgZXhwZWN0KCcpJyk7XG5cbiAgICAgICAgb2xkSW5JdGVyYXRpb24gPSBzdGF0ZS5pbkl0ZXJhdGlvbjtcbiAgICAgICAgc3RhdGUuaW5JdGVyYXRpb24gPSB0cnVlO1xuXG4gICAgICAgIGJvZHkgPSBwYXJzZVN0YXRlbWVudCgpO1xuXG4gICAgICAgIHN0YXRlLmluSXRlcmF0aW9uID0gb2xkSW5JdGVyYXRpb247XG5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHR5cGU6IFN5bnRheC5XaGlsZVN0YXRlbWVudCxcbiAgICAgICAgICAgIHRlc3Q6IHRlc3QsXG4gICAgICAgICAgICBib2R5OiBib2R5XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcGFyc2VGb3JWYXJpYWJsZURlY2xhcmF0aW9uKCkge1xuICAgICAgICB2YXIgdG9rZW4gPSBsZXgoKTtcblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgdHlwZTogU3ludGF4LlZhcmlhYmxlRGVjbGFyYXRpb24sXG4gICAgICAgICAgICBkZWNsYXJhdGlvbnM6IHBhcnNlVmFyaWFibGVEZWNsYXJhdGlvbkxpc3QoKSxcbiAgICAgICAgICAgIGtpbmQ6IHRva2VuLnZhbHVlXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcGFyc2VGb3JTdGF0ZW1lbnQoKSB7XG4gICAgICAgIHZhciBpbml0LCB0ZXN0LCB1cGRhdGUsIGxlZnQsIHJpZ2h0LCBib2R5LCBvbGRJbkl0ZXJhdGlvbjtcblxuICAgICAgICBpbml0ID0gdGVzdCA9IHVwZGF0ZSA9IG51bGw7XG5cbiAgICAgICAgZXhwZWN0S2V5d29yZCgnZm9yJyk7XG5cbiAgICAgICAgZXhwZWN0KCcoJyk7XG5cbiAgICAgICAgaWYgKG1hdGNoKCc7JykpIHtcbiAgICAgICAgICAgIGxleCgpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaWYgKG1hdGNoS2V5d29yZCgndmFyJykgfHwgbWF0Y2hLZXl3b3JkKCdsZXQnKSkge1xuICAgICAgICAgICAgICAgIHN0YXRlLmFsbG93SW4gPSBmYWxzZTtcbiAgICAgICAgICAgICAgICBpbml0ID0gcGFyc2VGb3JWYXJpYWJsZURlY2xhcmF0aW9uKCk7XG4gICAgICAgICAgICAgICAgc3RhdGUuYWxsb3dJbiA9IHRydWU7XG5cbiAgICAgICAgICAgICAgICBpZiAoaW5pdC5kZWNsYXJhdGlvbnMubGVuZ3RoID09PSAxICYmIG1hdGNoS2V5d29yZCgnaW4nKSkge1xuICAgICAgICAgICAgICAgICAgICBsZXgoKTtcbiAgICAgICAgICAgICAgICAgICAgbGVmdCA9IGluaXQ7XG4gICAgICAgICAgICAgICAgICAgIHJpZ2h0ID0gcGFyc2VFeHByZXNzaW9uKCk7XG4gICAgICAgICAgICAgICAgICAgIGluaXQgPSBudWxsO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgc3RhdGUuYWxsb3dJbiA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIGluaXQgPSBwYXJzZUV4cHJlc3Npb24oKTtcbiAgICAgICAgICAgICAgICBzdGF0ZS5hbGxvd0luID0gdHJ1ZTtcblxuICAgICAgICAgICAgICAgIGlmIChtYXRjaEtleXdvcmQoJ2luJykpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gTGVmdEhhbmRTaWRlRXhwcmVzc2lvblxuICAgICAgICAgICAgICAgICAgICBpZiAoIWlzTGVmdEhhbmRTaWRlKGluaXQpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aHJvd0Vycm9yKHt9LCBNZXNzYWdlcy5JbnZhbGlkTEhTSW5Gb3JJbik7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICBsZXgoKTtcbiAgICAgICAgICAgICAgICAgICAgbGVmdCA9IGluaXQ7XG4gICAgICAgICAgICAgICAgICAgIHJpZ2h0ID0gcGFyc2VFeHByZXNzaW9uKCk7XG4gICAgICAgICAgICAgICAgICAgIGluaXQgPSBudWxsO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKHR5cGVvZiBsZWZ0ID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgICAgIGV4cGVjdCgnOycpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHR5cGVvZiBsZWZ0ID09PSAndW5kZWZpbmVkJykge1xuXG4gICAgICAgICAgICBpZiAoIW1hdGNoKCc7JykpIHtcbiAgICAgICAgICAgICAgICB0ZXN0ID0gcGFyc2VFeHByZXNzaW9uKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBleHBlY3QoJzsnKTtcblxuICAgICAgICAgICAgaWYgKCFtYXRjaCgnKScpKSB7XG4gICAgICAgICAgICAgICAgdXBkYXRlID0gcGFyc2VFeHByZXNzaW9uKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBleHBlY3QoJyknKTtcblxuICAgICAgICBvbGRJbkl0ZXJhdGlvbiA9IHN0YXRlLmluSXRlcmF0aW9uO1xuICAgICAgICBzdGF0ZS5pbkl0ZXJhdGlvbiA9IHRydWU7XG5cbiAgICAgICAgYm9keSA9IHBhcnNlU3RhdGVtZW50KCk7XG5cbiAgICAgICAgc3RhdGUuaW5JdGVyYXRpb24gPSBvbGRJbkl0ZXJhdGlvbjtcblxuICAgICAgICBpZiAodHlwZW9mIGxlZnQgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHR5cGU6IFN5bnRheC5Gb3JTdGF0ZW1lbnQsXG4gICAgICAgICAgICAgICAgaW5pdDogaW5pdCxcbiAgICAgICAgICAgICAgICB0ZXN0OiB0ZXN0LFxuICAgICAgICAgICAgICAgIHVwZGF0ZTogdXBkYXRlLFxuICAgICAgICAgICAgICAgIGJvZHk6IGJvZHlcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgdHlwZTogU3ludGF4LkZvckluU3RhdGVtZW50LFxuICAgICAgICAgICAgbGVmdDogbGVmdCxcbiAgICAgICAgICAgIHJpZ2h0OiByaWdodCxcbiAgICAgICAgICAgIGJvZHk6IGJvZHksXG4gICAgICAgICAgICBlYWNoOiBmYWxzZVxuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8vIDEyLjcgVGhlIGNvbnRpbnVlIHN0YXRlbWVudFxuXG4gICAgZnVuY3Rpb24gcGFyc2VDb250aW51ZVN0YXRlbWVudCgpIHtcbiAgICAgICAgdmFyIHRva2VuLCBsYWJlbCA9IG51bGw7XG5cbiAgICAgICAgZXhwZWN0S2V5d29yZCgnY29udGludWUnKTtcblxuICAgICAgICAvLyBPcHRpbWl6ZSB0aGUgbW9zdCBjb21tb24gZm9ybTogJ2NvbnRpbnVlOycuXG4gICAgICAgIGlmIChzb3VyY2VbaW5kZXhdID09PSAnOycpIHtcbiAgICAgICAgICAgIGxleCgpO1xuXG4gICAgICAgICAgICBpZiAoIXN0YXRlLmluSXRlcmF0aW9uKSB7XG4gICAgICAgICAgICAgICAgdGhyb3dFcnJvcih7fSwgTWVzc2FnZXMuSWxsZWdhbENvbnRpbnVlKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICB0eXBlOiBTeW50YXguQ29udGludWVTdGF0ZW1lbnQsXG4gICAgICAgICAgICAgICAgbGFiZWw6IG51bGxcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cblxuICAgICAgICBpZiAocGVla0xpbmVUZXJtaW5hdG9yKCkpIHtcbiAgICAgICAgICAgIGlmICghc3RhdGUuaW5JdGVyYXRpb24pIHtcbiAgICAgICAgICAgICAgICB0aHJvd0Vycm9yKHt9LCBNZXNzYWdlcy5JbGxlZ2FsQ29udGludWUpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHR5cGU6IFN5bnRheC5Db250aW51ZVN0YXRlbWVudCxcbiAgICAgICAgICAgICAgICBsYWJlbDogbnVsbFxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRva2VuID0gbG9va2FoZWFkKCk7XG4gICAgICAgIGlmICh0b2tlbi50eXBlID09PSBUb2tlbi5JZGVudGlmaWVyKSB7XG4gICAgICAgICAgICBsYWJlbCA9IHBhcnNlVmFyaWFibGVJZGVudGlmaWVyKCk7XG5cbiAgICAgICAgICAgIGlmICghT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKHN0YXRlLmxhYmVsU2V0LCBsYWJlbC5uYW1lKSkge1xuICAgICAgICAgICAgICAgIHRocm93RXJyb3Ioe30sIE1lc3NhZ2VzLlVua25vd25MYWJlbCwgbGFiZWwubmFtZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdW1lU2VtaWNvbG9uKCk7XG5cbiAgICAgICAgaWYgKGxhYmVsID09PSBudWxsICYmICFzdGF0ZS5pbkl0ZXJhdGlvbikge1xuICAgICAgICAgICAgdGhyb3dFcnJvcih7fSwgTWVzc2FnZXMuSWxsZWdhbENvbnRpbnVlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB0eXBlOiBTeW50YXguQ29udGludWVTdGF0ZW1lbnQsXG4gICAgICAgICAgICBsYWJlbDogbGFiZWxcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvLyAxMi44IFRoZSBicmVhayBzdGF0ZW1lbnRcblxuICAgIGZ1bmN0aW9uIHBhcnNlQnJlYWtTdGF0ZW1lbnQoKSB7XG4gICAgICAgIHZhciB0b2tlbiwgbGFiZWwgPSBudWxsO1xuXG4gICAgICAgIGV4cGVjdEtleXdvcmQoJ2JyZWFrJyk7XG5cbiAgICAgICAgLy8gT3B0aW1pemUgdGhlIG1vc3QgY29tbW9uIGZvcm06ICdicmVhazsnLlxuICAgICAgICBpZiAoc291cmNlW2luZGV4XSA9PT0gJzsnKSB7XG4gICAgICAgICAgICBsZXgoKTtcblxuICAgICAgICAgICAgaWYgKCEoc3RhdGUuaW5JdGVyYXRpb24gfHwgc3RhdGUuaW5Td2l0Y2gpKSB7XG4gICAgICAgICAgICAgICAgdGhyb3dFcnJvcih7fSwgTWVzc2FnZXMuSWxsZWdhbEJyZWFrKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICB0eXBlOiBTeW50YXguQnJlYWtTdGF0ZW1lbnQsXG4gICAgICAgICAgICAgICAgbGFiZWw6IG51bGxcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cblxuICAgICAgICBpZiAocGVla0xpbmVUZXJtaW5hdG9yKCkpIHtcbiAgICAgICAgICAgIGlmICghKHN0YXRlLmluSXRlcmF0aW9uIHx8IHN0YXRlLmluU3dpdGNoKSkge1xuICAgICAgICAgICAgICAgIHRocm93RXJyb3Ioe30sIE1lc3NhZ2VzLklsbGVnYWxCcmVhayk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgdHlwZTogU3ludGF4LkJyZWFrU3RhdGVtZW50LFxuICAgICAgICAgICAgICAgIGxhYmVsOiBudWxsXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG5cbiAgICAgICAgdG9rZW4gPSBsb29rYWhlYWQoKTtcbiAgICAgICAgaWYgKHRva2VuLnR5cGUgPT09IFRva2VuLklkZW50aWZpZXIpIHtcbiAgICAgICAgICAgIGxhYmVsID0gcGFyc2VWYXJpYWJsZUlkZW50aWZpZXIoKTtcblxuICAgICAgICAgICAgaWYgKCFPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwoc3RhdGUubGFiZWxTZXQsIGxhYmVsLm5hbWUpKSB7XG4gICAgICAgICAgICAgICAgdGhyb3dFcnJvcih7fSwgTWVzc2FnZXMuVW5rbm93bkxhYmVsLCBsYWJlbC5uYW1lKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN1bWVTZW1pY29sb24oKTtcblxuICAgICAgICBpZiAobGFiZWwgPT09IG51bGwgJiYgIShzdGF0ZS5pbkl0ZXJhdGlvbiB8fCBzdGF0ZS5pblN3aXRjaCkpIHtcbiAgICAgICAgICAgIHRocm93RXJyb3Ioe30sIE1lc3NhZ2VzLklsbGVnYWxCcmVhayk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgdHlwZTogU3ludGF4LkJyZWFrU3RhdGVtZW50LFxuICAgICAgICAgICAgbGFiZWw6IGxhYmVsXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLy8gMTIuOSBUaGUgcmV0dXJuIHN0YXRlbWVudFxuXG4gICAgZnVuY3Rpb24gcGFyc2VSZXR1cm5TdGF0ZW1lbnQoKSB7XG4gICAgICAgIHZhciB0b2tlbiwgYXJndW1lbnQgPSBudWxsO1xuXG4gICAgICAgIGV4cGVjdEtleXdvcmQoJ3JldHVybicpO1xuXG4gICAgICAgIGlmICghc3RhdGUuaW5GdW5jdGlvbkJvZHkpIHtcbiAgICAgICAgICAgIHRocm93RXJyb3JUb2xlcmFudCh7fSwgTWVzc2FnZXMuSWxsZWdhbFJldHVybik7XG4gICAgICAgIH1cblxuICAgICAgICAvLyAncmV0dXJuJyBmb2xsb3dlZCBieSBhIHNwYWNlIGFuZCBhbiBpZGVudGlmaWVyIGlzIHZlcnkgY29tbW9uLlxuICAgICAgICBpZiAoc291cmNlW2luZGV4XSA9PT0gJyAnKSB7XG4gICAgICAgICAgICBpZiAoaXNJZGVudGlmaWVyU3RhcnQoc291cmNlW2luZGV4ICsgMV0pKSB7XG4gICAgICAgICAgICAgICAgYXJndW1lbnQgPSBwYXJzZUV4cHJlc3Npb24oKTtcbiAgICAgICAgICAgICAgICBjb25zdW1lU2VtaWNvbG9uKCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogU3ludGF4LlJldHVyblN0YXRlbWVudCxcbiAgICAgICAgICAgICAgICAgICAgYXJndW1lbnQ6IGFyZ3VtZW50XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChwZWVrTGluZVRlcm1pbmF0b3IoKSkge1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICB0eXBlOiBTeW50YXguUmV0dXJuU3RhdGVtZW50LFxuICAgICAgICAgICAgICAgIGFyZ3VtZW50OiBudWxsXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCFtYXRjaCgnOycpKSB7XG4gICAgICAgICAgICB0b2tlbiA9IGxvb2thaGVhZCgpO1xuICAgICAgICAgICAgaWYgKCFtYXRjaCgnfScpICYmIHRva2VuLnR5cGUgIT09IFRva2VuLkVPRikge1xuICAgICAgICAgICAgICAgIGFyZ3VtZW50ID0gcGFyc2VFeHByZXNzaW9uKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdW1lU2VtaWNvbG9uKCk7XG5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHR5cGU6IFN5bnRheC5SZXR1cm5TdGF0ZW1lbnQsXG4gICAgICAgICAgICBhcmd1bWVudDogYXJndW1lbnRcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvLyAxMi4xMCBUaGUgd2l0aCBzdGF0ZW1lbnRcblxuICAgIGZ1bmN0aW9uIHBhcnNlV2l0aFN0YXRlbWVudCgpIHtcbiAgICAgICAgdmFyIG9iamVjdCwgYm9keTtcblxuICAgICAgICBpZiAoc3RyaWN0KSB7XG4gICAgICAgICAgICB0aHJvd0Vycm9yVG9sZXJhbnQoe30sIE1lc3NhZ2VzLlN0cmljdE1vZGVXaXRoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGV4cGVjdEtleXdvcmQoJ3dpdGgnKTtcblxuICAgICAgICBleHBlY3QoJygnKTtcblxuICAgICAgICBvYmplY3QgPSBwYXJzZUV4cHJlc3Npb24oKTtcblxuICAgICAgICBleHBlY3QoJyknKTtcblxuICAgICAgICBib2R5ID0gcGFyc2VTdGF0ZW1lbnQoKTtcblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgdHlwZTogU3ludGF4LldpdGhTdGF0ZW1lbnQsXG4gICAgICAgICAgICBvYmplY3Q6IG9iamVjdCxcbiAgICAgICAgICAgIGJvZHk6IGJvZHlcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvLyAxMi4xMCBUaGUgc3dpdGggc3RhdGVtZW50XG5cbiAgICBmdW5jdGlvbiBwYXJzZVN3aXRjaENhc2UoKSB7XG4gICAgICAgIHZhciB0ZXN0LFxuICAgICAgICAgICAgY29uc2VxdWVudCA9IFtdLFxuICAgICAgICAgICAgc3RhdGVtZW50O1xuXG4gICAgICAgIGlmIChtYXRjaEtleXdvcmQoJ2RlZmF1bHQnKSkge1xuICAgICAgICAgICAgbGV4KCk7XG4gICAgICAgICAgICB0ZXN0ID0gbnVsbDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGV4cGVjdEtleXdvcmQoJ2Nhc2UnKTtcbiAgICAgICAgICAgIHRlc3QgPSBwYXJzZUV4cHJlc3Npb24oKTtcbiAgICAgICAgfVxuICAgICAgICBleHBlY3QoJzonKTtcblxuICAgICAgICB3aGlsZSAoaW5kZXggPCBsZW5ndGgpIHtcbiAgICAgICAgICAgIGlmIChtYXRjaCgnfScpIHx8IG1hdGNoS2V5d29yZCgnZGVmYXVsdCcpIHx8IG1hdGNoS2V5d29yZCgnY2FzZScpKSB7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBzdGF0ZW1lbnQgPSBwYXJzZVN0YXRlbWVudCgpO1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBzdGF0ZW1lbnQgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb25zZXF1ZW50LnB1c2goc3RhdGVtZW50KTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB0eXBlOiBTeW50YXguU3dpdGNoQ2FzZSxcbiAgICAgICAgICAgIHRlc3Q6IHRlc3QsXG4gICAgICAgICAgICBjb25zZXF1ZW50OiBjb25zZXF1ZW50XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcGFyc2VTd2l0Y2hTdGF0ZW1lbnQoKSB7XG4gICAgICAgIHZhciBkaXNjcmltaW5hbnQsIGNhc2VzLCBjbGF1c2UsIG9sZEluU3dpdGNoLCBkZWZhdWx0Rm91bmQ7XG5cbiAgICAgICAgZXhwZWN0S2V5d29yZCgnc3dpdGNoJyk7XG5cbiAgICAgICAgZXhwZWN0KCcoJyk7XG5cbiAgICAgICAgZGlzY3JpbWluYW50ID0gcGFyc2VFeHByZXNzaW9uKCk7XG5cbiAgICAgICAgZXhwZWN0KCcpJyk7XG5cbiAgICAgICAgZXhwZWN0KCd7Jyk7XG5cbiAgICAgICAgaWYgKG1hdGNoKCd9JykpIHtcbiAgICAgICAgICAgIGxleCgpO1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICB0eXBlOiBTeW50YXguU3dpdGNoU3RhdGVtZW50LFxuICAgICAgICAgICAgICAgIGRpc2NyaW1pbmFudDogZGlzY3JpbWluYW50XG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG5cbiAgICAgICAgY2FzZXMgPSBbXTtcblxuICAgICAgICBvbGRJblN3aXRjaCA9IHN0YXRlLmluU3dpdGNoO1xuICAgICAgICBzdGF0ZS5pblN3aXRjaCA9IHRydWU7XG4gICAgICAgIGRlZmF1bHRGb3VuZCA9IGZhbHNlO1xuXG4gICAgICAgIHdoaWxlIChpbmRleCA8IGxlbmd0aCkge1xuICAgICAgICAgICAgaWYgKG1hdGNoKCd9JykpIHtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNsYXVzZSA9IHBhcnNlU3dpdGNoQ2FzZSgpO1xuICAgICAgICAgICAgaWYgKGNsYXVzZS50ZXN0ID09PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgaWYgKGRlZmF1bHRGb3VuZCkge1xuICAgICAgICAgICAgICAgICAgICB0aHJvd0Vycm9yKHt9LCBNZXNzYWdlcy5NdWx0aXBsZURlZmF1bHRzSW5Td2l0Y2gpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBkZWZhdWx0Rm91bmQgPSB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2FzZXMucHVzaChjbGF1c2UpO1xuICAgICAgICB9XG5cbiAgICAgICAgc3RhdGUuaW5Td2l0Y2ggPSBvbGRJblN3aXRjaDtcblxuICAgICAgICBleHBlY3QoJ30nKTtcblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgdHlwZTogU3ludGF4LlN3aXRjaFN0YXRlbWVudCxcbiAgICAgICAgICAgIGRpc2NyaW1pbmFudDogZGlzY3JpbWluYW50LFxuICAgICAgICAgICAgY2FzZXM6IGNhc2VzXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLy8gMTIuMTMgVGhlIHRocm93IHN0YXRlbWVudFxuXG4gICAgZnVuY3Rpb24gcGFyc2VUaHJvd1N0YXRlbWVudCgpIHtcbiAgICAgICAgdmFyIGFyZ3VtZW50O1xuXG4gICAgICAgIGV4cGVjdEtleXdvcmQoJ3Rocm93Jyk7XG5cbiAgICAgICAgaWYgKHBlZWtMaW5lVGVybWluYXRvcigpKSB7XG4gICAgICAgICAgICB0aHJvd0Vycm9yKHt9LCBNZXNzYWdlcy5OZXdsaW5lQWZ0ZXJUaHJvdyk7XG4gICAgICAgIH1cblxuICAgICAgICBhcmd1bWVudCA9IHBhcnNlRXhwcmVzc2lvbigpO1xuXG4gICAgICAgIGNvbnN1bWVTZW1pY29sb24oKTtcblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgdHlwZTogU3ludGF4LlRocm93U3RhdGVtZW50LFxuICAgICAgICAgICAgYXJndW1lbnQ6IGFyZ3VtZW50XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLy8gMTIuMTQgVGhlIHRyeSBzdGF0ZW1lbnRcblxuICAgIGZ1bmN0aW9uIHBhcnNlQ2F0Y2hDbGF1c2UoKSB7XG4gICAgICAgIHZhciBwYXJhbTtcblxuICAgICAgICBleHBlY3RLZXl3b3JkKCdjYXRjaCcpO1xuXG4gICAgICAgIGV4cGVjdCgnKCcpO1xuICAgICAgICBpZiAobWF0Y2goJyknKSkge1xuICAgICAgICAgICAgdGhyb3dVbmV4cGVjdGVkKGxvb2thaGVhZCgpKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHBhcmFtID0gcGFyc2VWYXJpYWJsZUlkZW50aWZpZXIoKTtcbiAgICAgICAgLy8gMTIuMTQuMVxuICAgICAgICBpZiAoc3RyaWN0ICYmIGlzUmVzdHJpY3RlZFdvcmQocGFyYW0ubmFtZSkpIHtcbiAgICAgICAgICAgIHRocm93RXJyb3JUb2xlcmFudCh7fSwgTWVzc2FnZXMuU3RyaWN0Q2F0Y2hWYXJpYWJsZSk7XG4gICAgICAgIH1cblxuICAgICAgICBleHBlY3QoJyknKTtcblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgdHlwZTogU3ludGF4LkNhdGNoQ2xhdXNlLFxuICAgICAgICAgICAgcGFyYW06IHBhcmFtLFxuICAgICAgICAgICAgYm9keTogcGFyc2VCbG9jaygpXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcGFyc2VUcnlTdGF0ZW1lbnQoKSB7XG4gICAgICAgIHZhciBibG9jaywgaGFuZGxlcnMgPSBbXSwgZmluYWxpemVyID0gbnVsbDtcblxuICAgICAgICBleHBlY3RLZXl3b3JkKCd0cnknKTtcblxuICAgICAgICBibG9jayA9IHBhcnNlQmxvY2soKTtcblxuICAgICAgICBpZiAobWF0Y2hLZXl3b3JkKCdjYXRjaCcpKSB7XG4gICAgICAgICAgICBoYW5kbGVycy5wdXNoKHBhcnNlQ2F0Y2hDbGF1c2UoKSk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAobWF0Y2hLZXl3b3JkKCdmaW5hbGx5JykpIHtcbiAgICAgICAgICAgIGxleCgpO1xuICAgICAgICAgICAgZmluYWxpemVyID0gcGFyc2VCbG9jaygpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGhhbmRsZXJzLmxlbmd0aCA9PT0gMCAmJiAhZmluYWxpemVyKSB7XG4gICAgICAgICAgICB0aHJvd0Vycm9yKHt9LCBNZXNzYWdlcy5Ob0NhdGNoT3JGaW5hbGx5KTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB0eXBlOiBTeW50YXguVHJ5U3RhdGVtZW50LFxuICAgICAgICAgICAgYmxvY2s6IGJsb2NrLFxuICAgICAgICAgICAgZ3VhcmRlZEhhbmRsZXJzOiBbXSxcbiAgICAgICAgICAgIGhhbmRsZXJzOiBoYW5kbGVycyxcbiAgICAgICAgICAgIGZpbmFsaXplcjogZmluYWxpemVyXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLy8gMTIuMTUgVGhlIGRlYnVnZ2VyIHN0YXRlbWVudFxuXG4gICAgZnVuY3Rpb24gcGFyc2VEZWJ1Z2dlclN0YXRlbWVudCgpIHtcbiAgICAgICAgZXhwZWN0S2V5d29yZCgnZGVidWdnZXInKTtcblxuICAgICAgICBjb25zdW1lU2VtaWNvbG9uKCk7XG5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHR5cGU6IFN5bnRheC5EZWJ1Z2dlclN0YXRlbWVudFxuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8vIDEyIFN0YXRlbWVudHNcblxuICAgIGZ1bmN0aW9uIHBhcnNlU3RhdGVtZW50KCkge1xuICAgICAgICB2YXIgdG9rZW4gPSBsb29rYWhlYWQoKSxcbiAgICAgICAgICAgIGV4cHIsXG4gICAgICAgICAgICBsYWJlbGVkQm9keTtcblxuICAgICAgICBpZiAodG9rZW4udHlwZSA9PT0gVG9rZW4uRU9GKSB7XG4gICAgICAgICAgICB0aHJvd1VuZXhwZWN0ZWQodG9rZW4pO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHRva2VuLnR5cGUgPT09IFRva2VuLlB1bmN0dWF0b3IpIHtcbiAgICAgICAgICAgIHN3aXRjaCAodG9rZW4udmFsdWUpIHtcbiAgICAgICAgICAgIGNhc2UgJzsnOlxuICAgICAgICAgICAgICAgIHJldHVybiBwYXJzZUVtcHR5U3RhdGVtZW50KCk7XG4gICAgICAgICAgICBjYXNlICd7JzpcbiAgICAgICAgICAgICAgICByZXR1cm4gcGFyc2VCbG9jaygpO1xuICAgICAgICAgICAgY2FzZSAnKCc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIHBhcnNlRXhwcmVzc2lvblN0YXRlbWVudCgpO1xuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0b2tlbi50eXBlID09PSBUb2tlbi5LZXl3b3JkKSB7XG4gICAgICAgICAgICBzd2l0Y2ggKHRva2VuLnZhbHVlKSB7XG4gICAgICAgICAgICBjYXNlICdicmVhayc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIHBhcnNlQnJlYWtTdGF0ZW1lbnQoKTtcbiAgICAgICAgICAgIGNhc2UgJ2NvbnRpbnVlJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gcGFyc2VDb250aW51ZVN0YXRlbWVudCgpO1xuICAgICAgICAgICAgY2FzZSAnZGVidWdnZXInOlxuICAgICAgICAgICAgICAgIHJldHVybiBwYXJzZURlYnVnZ2VyU3RhdGVtZW50KCk7XG4gICAgICAgICAgICBjYXNlICdkbyc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIHBhcnNlRG9XaGlsZVN0YXRlbWVudCgpO1xuICAgICAgICAgICAgY2FzZSAnZm9yJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gcGFyc2VGb3JTdGF0ZW1lbnQoKTtcbiAgICAgICAgICAgIGNhc2UgJ2Z1bmN0aW9uJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gcGFyc2VGdW5jdGlvbkRlY2xhcmF0aW9uKCk7XG4gICAgICAgICAgICBjYXNlICdpZic6XG4gICAgICAgICAgICAgICAgcmV0dXJuIHBhcnNlSWZTdGF0ZW1lbnQoKTtcbiAgICAgICAgICAgIGNhc2UgJ3JldHVybic6XG4gICAgICAgICAgICAgICAgcmV0dXJuIHBhcnNlUmV0dXJuU3RhdGVtZW50KCk7XG4gICAgICAgICAgICBjYXNlICdzd2l0Y2gnOlxuICAgICAgICAgICAgICAgIHJldHVybiBwYXJzZVN3aXRjaFN0YXRlbWVudCgpO1xuICAgICAgICAgICAgY2FzZSAndGhyb3cnOlxuICAgICAgICAgICAgICAgIHJldHVybiBwYXJzZVRocm93U3RhdGVtZW50KCk7XG4gICAgICAgICAgICBjYXNlICd0cnknOlxuICAgICAgICAgICAgICAgIHJldHVybiBwYXJzZVRyeVN0YXRlbWVudCgpO1xuICAgICAgICAgICAgY2FzZSAndmFyJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gcGFyc2VWYXJpYWJsZVN0YXRlbWVudCgpO1xuICAgICAgICAgICAgY2FzZSAnd2hpbGUnOlxuICAgICAgICAgICAgICAgIHJldHVybiBwYXJzZVdoaWxlU3RhdGVtZW50KCk7XG4gICAgICAgICAgICBjYXNlICd3aXRoJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gcGFyc2VXaXRoU3RhdGVtZW50KCk7XG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgZXhwciA9IHBhcnNlRXhwcmVzc2lvbigpO1xuXG4gICAgICAgIC8vIDEyLjEyIExhYmVsbGVkIFN0YXRlbWVudHNcbiAgICAgICAgaWYgKChleHByLnR5cGUgPT09IFN5bnRheC5JZGVudGlmaWVyKSAmJiBtYXRjaCgnOicpKSB7XG4gICAgICAgICAgICBsZXgoKTtcblxuICAgICAgICAgICAgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChzdGF0ZS5sYWJlbFNldCwgZXhwci5uYW1lKSkge1xuICAgICAgICAgICAgICAgIHRocm93RXJyb3Ioe30sIE1lc3NhZ2VzLlJlZGVjbGFyYXRpb24sICdMYWJlbCcsIGV4cHIubmFtZSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHN0YXRlLmxhYmVsU2V0W2V4cHIubmFtZV0gPSB0cnVlO1xuICAgICAgICAgICAgbGFiZWxlZEJvZHkgPSBwYXJzZVN0YXRlbWVudCgpO1xuICAgICAgICAgICAgZGVsZXRlIHN0YXRlLmxhYmVsU2V0W2V4cHIubmFtZV07XG5cbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgdHlwZTogU3ludGF4LkxhYmVsZWRTdGF0ZW1lbnQsXG4gICAgICAgICAgICAgICAgbGFiZWw6IGV4cHIsXG4gICAgICAgICAgICAgICAgYm9keTogbGFiZWxlZEJvZHlcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdW1lU2VtaWNvbG9uKCk7XG5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHR5cGU6IFN5bnRheC5FeHByZXNzaW9uU3RhdGVtZW50LFxuICAgICAgICAgICAgZXhwcmVzc2lvbjogZXhwclxuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8vIDEzIEZ1bmN0aW9uIERlZmluaXRpb25cblxuICAgIGZ1bmN0aW9uIHBhcnNlRnVuY3Rpb25Tb3VyY2VFbGVtZW50cygpIHtcbiAgICAgICAgdmFyIHNvdXJjZUVsZW1lbnQsIHNvdXJjZUVsZW1lbnRzID0gW10sIHRva2VuLCBkaXJlY3RpdmUsIGZpcnN0UmVzdHJpY3RlZCxcbiAgICAgICAgICAgIG9sZExhYmVsU2V0LCBvbGRJbkl0ZXJhdGlvbiwgb2xkSW5Td2l0Y2gsIG9sZEluRnVuY3Rpb25Cb2R5O1xuXG4gICAgICAgIGV4cGVjdCgneycpO1xuXG4gICAgICAgIHdoaWxlIChpbmRleCA8IGxlbmd0aCkge1xuICAgICAgICAgICAgdG9rZW4gPSBsb29rYWhlYWQoKTtcbiAgICAgICAgICAgIGlmICh0b2tlbi50eXBlICE9PSBUb2tlbi5TdHJpbmdMaXRlcmFsKSB7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHNvdXJjZUVsZW1lbnQgPSBwYXJzZVNvdXJjZUVsZW1lbnQoKTtcbiAgICAgICAgICAgIHNvdXJjZUVsZW1lbnRzLnB1c2goc291cmNlRWxlbWVudCk7XG4gICAgICAgICAgICBpZiAoc291cmNlRWxlbWVudC5leHByZXNzaW9uLnR5cGUgIT09IFN5bnRheC5MaXRlcmFsKSB7XG4gICAgICAgICAgICAgICAgLy8gdGhpcyBpcyBub3QgZGlyZWN0aXZlXG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBkaXJlY3RpdmUgPSBzbGljZVNvdXJjZSh0b2tlbi5yYW5nZVswXSArIDEsIHRva2VuLnJhbmdlWzFdIC0gMSk7XG4gICAgICAgICAgICBpZiAoZGlyZWN0aXZlID09PSAndXNlIHN0cmljdCcpIHtcbiAgICAgICAgICAgICAgICBzdHJpY3QgPSB0cnVlO1xuICAgICAgICAgICAgICAgIGlmIChmaXJzdFJlc3RyaWN0ZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhyb3dFcnJvclRvbGVyYW50KGZpcnN0UmVzdHJpY3RlZCwgTWVzc2FnZXMuU3RyaWN0T2N0YWxMaXRlcmFsKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGlmICghZmlyc3RSZXN0cmljdGVkICYmIHRva2VuLm9jdGFsKSB7XG4gICAgICAgICAgICAgICAgICAgIGZpcnN0UmVzdHJpY3RlZCA9IHRva2VuO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIG9sZExhYmVsU2V0ID0gc3RhdGUubGFiZWxTZXQ7XG4gICAgICAgIG9sZEluSXRlcmF0aW9uID0gc3RhdGUuaW5JdGVyYXRpb247XG4gICAgICAgIG9sZEluU3dpdGNoID0gc3RhdGUuaW5Td2l0Y2g7XG4gICAgICAgIG9sZEluRnVuY3Rpb25Cb2R5ID0gc3RhdGUuaW5GdW5jdGlvbkJvZHk7XG5cbiAgICAgICAgc3RhdGUubGFiZWxTZXQgPSB7fTtcbiAgICAgICAgc3RhdGUuaW5JdGVyYXRpb24gPSBmYWxzZTtcbiAgICAgICAgc3RhdGUuaW5Td2l0Y2ggPSBmYWxzZTtcbiAgICAgICAgc3RhdGUuaW5GdW5jdGlvbkJvZHkgPSB0cnVlO1xuXG4gICAgICAgIHdoaWxlIChpbmRleCA8IGxlbmd0aCkge1xuICAgICAgICAgICAgaWYgKG1hdGNoKCd9JykpIHtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHNvdXJjZUVsZW1lbnQgPSBwYXJzZVNvdXJjZUVsZW1lbnQoKTtcbiAgICAgICAgICAgIGlmICh0eXBlb2Ygc291cmNlRWxlbWVudCA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHNvdXJjZUVsZW1lbnRzLnB1c2goc291cmNlRWxlbWVudCk7XG4gICAgICAgIH1cblxuICAgICAgICBleHBlY3QoJ30nKTtcblxuICAgICAgICBzdGF0ZS5sYWJlbFNldCA9IG9sZExhYmVsU2V0O1xuICAgICAgICBzdGF0ZS5pbkl0ZXJhdGlvbiA9IG9sZEluSXRlcmF0aW9uO1xuICAgICAgICBzdGF0ZS5pblN3aXRjaCA9IG9sZEluU3dpdGNoO1xuICAgICAgICBzdGF0ZS5pbkZ1bmN0aW9uQm9keSA9IG9sZEluRnVuY3Rpb25Cb2R5O1xuXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB0eXBlOiBTeW50YXguQmxvY2tTdGF0ZW1lbnQsXG4gICAgICAgICAgICBib2R5OiBzb3VyY2VFbGVtZW50c1xuICAgICAgICB9O1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHBhcnNlRnVuY3Rpb25EZWNsYXJhdGlvbigpIHtcbiAgICAgICAgdmFyIGlkLCBwYXJhbSwgcGFyYW1zID0gW10sIGJvZHksIHRva2VuLCBzdHJpY3RlZCwgZmlyc3RSZXN0cmljdGVkLCBtZXNzYWdlLCBwcmV2aW91c1N0cmljdCwgcGFyYW1TZXQ7XG5cbiAgICAgICAgZXhwZWN0S2V5d29yZCgnZnVuY3Rpb24nKTtcbiAgICAgICAgdG9rZW4gPSBsb29rYWhlYWQoKTtcbiAgICAgICAgaWQgPSBwYXJzZVZhcmlhYmxlSWRlbnRpZmllcigpO1xuICAgICAgICBpZiAoc3RyaWN0KSB7XG4gICAgICAgICAgICBpZiAoaXNSZXN0cmljdGVkV29yZCh0b2tlbi52YWx1ZSkpIHtcbiAgICAgICAgICAgICAgICB0aHJvd0Vycm9yVG9sZXJhbnQodG9rZW4sIE1lc3NhZ2VzLlN0cmljdEZ1bmN0aW9uTmFtZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBpZiAoaXNSZXN0cmljdGVkV29yZCh0b2tlbi52YWx1ZSkpIHtcbiAgICAgICAgICAgICAgICBmaXJzdFJlc3RyaWN0ZWQgPSB0b2tlbjtcbiAgICAgICAgICAgICAgICBtZXNzYWdlID0gTWVzc2FnZXMuU3RyaWN0RnVuY3Rpb25OYW1lO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChpc1N0cmljdE1vZGVSZXNlcnZlZFdvcmQodG9rZW4udmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgZmlyc3RSZXN0cmljdGVkID0gdG9rZW47XG4gICAgICAgICAgICAgICAgbWVzc2FnZSA9IE1lc3NhZ2VzLlN0cmljdFJlc2VydmVkV29yZDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGV4cGVjdCgnKCcpO1xuXG4gICAgICAgIGlmICghbWF0Y2goJyknKSkge1xuICAgICAgICAgICAgcGFyYW1TZXQgPSB7fTtcbiAgICAgICAgICAgIHdoaWxlIChpbmRleCA8IGxlbmd0aCkge1xuICAgICAgICAgICAgICAgIHRva2VuID0gbG9va2FoZWFkKCk7XG4gICAgICAgICAgICAgICAgcGFyYW0gPSBwYXJzZVZhcmlhYmxlSWRlbnRpZmllcigpO1xuICAgICAgICAgICAgICAgIGlmIChzdHJpY3QpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGlzUmVzdHJpY3RlZFdvcmQodG9rZW4udmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzdHJpY3RlZCA9IHRva2VuO1xuICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZSA9IE1lc3NhZ2VzLlN0cmljdFBhcmFtTmFtZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBpZiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKHBhcmFtU2V0LCB0b2tlbi52YWx1ZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0cmljdGVkID0gdG9rZW47XG4gICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlID0gTWVzc2FnZXMuU3RyaWN0UGFyYW1EdXBlO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmICghZmlyc3RSZXN0cmljdGVkKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChpc1Jlc3RyaWN0ZWRXb3JkKHRva2VuLnZhbHVlKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZmlyc3RSZXN0cmljdGVkID0gdG9rZW47XG4gICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlID0gTWVzc2FnZXMuU3RyaWN0UGFyYW1OYW1lO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGlzU3RyaWN0TW9kZVJlc2VydmVkV29yZCh0b2tlbi52YWx1ZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZpcnN0UmVzdHJpY3RlZCA9IHRva2VuO1xuICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZSA9IE1lc3NhZ2VzLlN0cmljdFJlc2VydmVkV29yZDtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwocGFyYW1TZXQsIHRva2VuLnZhbHVlKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZmlyc3RSZXN0cmljdGVkID0gdG9rZW47XG4gICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlID0gTWVzc2FnZXMuU3RyaWN0UGFyYW1EdXBlO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHBhcmFtcy5wdXNoKHBhcmFtKTtcbiAgICAgICAgICAgICAgICBwYXJhbVNldFtwYXJhbS5uYW1lXSA9IHRydWU7XG4gICAgICAgICAgICAgICAgaWYgKG1hdGNoKCcpJykpIHtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGV4cGVjdCgnLCcpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgZXhwZWN0KCcpJyk7XG5cbiAgICAgICAgcHJldmlvdXNTdHJpY3QgPSBzdHJpY3Q7XG4gICAgICAgIGJvZHkgPSBwYXJzZUZ1bmN0aW9uU291cmNlRWxlbWVudHMoKTtcbiAgICAgICAgaWYgKHN0cmljdCAmJiBmaXJzdFJlc3RyaWN0ZWQpIHtcbiAgICAgICAgICAgIHRocm93RXJyb3IoZmlyc3RSZXN0cmljdGVkLCBtZXNzYWdlKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoc3RyaWN0ICYmIHN0cmljdGVkKSB7XG4gICAgICAgICAgICB0aHJvd0Vycm9yVG9sZXJhbnQoc3RyaWN0ZWQsIG1lc3NhZ2UpO1xuICAgICAgICB9XG4gICAgICAgIHN0cmljdCA9IHByZXZpb3VzU3RyaWN0O1xuXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB0eXBlOiBTeW50YXguRnVuY3Rpb25EZWNsYXJhdGlvbixcbiAgICAgICAgICAgIGlkOiBpZCxcbiAgICAgICAgICAgIHBhcmFtczogcGFyYW1zLFxuICAgICAgICAgICAgZGVmYXVsdHM6IFtdLFxuICAgICAgICAgICAgYm9keTogYm9keSxcbiAgICAgICAgICAgIHJlc3Q6IG51bGwsXG4gICAgICAgICAgICBnZW5lcmF0b3I6IGZhbHNlLFxuICAgICAgICAgICAgZXhwcmVzc2lvbjogZmFsc2VcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBwYXJzZUZ1bmN0aW9uRXhwcmVzc2lvbigpIHtcbiAgICAgICAgdmFyIHRva2VuLCBpZCA9IG51bGwsIHN0cmljdGVkLCBmaXJzdFJlc3RyaWN0ZWQsIG1lc3NhZ2UsIHBhcmFtLCBwYXJhbXMgPSBbXSwgYm9keSwgcHJldmlvdXNTdHJpY3QsIHBhcmFtU2V0O1xuXG4gICAgICAgIGV4cGVjdEtleXdvcmQoJ2Z1bmN0aW9uJyk7XG5cbiAgICAgICAgaWYgKCFtYXRjaCgnKCcpKSB7XG4gICAgICAgICAgICB0b2tlbiA9IGxvb2thaGVhZCgpO1xuICAgICAgICAgICAgaWQgPSBwYXJzZVZhcmlhYmxlSWRlbnRpZmllcigpO1xuICAgICAgICAgICAgaWYgKHN0cmljdCkge1xuICAgICAgICAgICAgICAgIGlmIChpc1Jlc3RyaWN0ZWRXb3JkKHRva2VuLnZhbHVlKSkge1xuICAgICAgICAgICAgICAgICAgICB0aHJvd0Vycm9yVG9sZXJhbnQodG9rZW4sIE1lc3NhZ2VzLlN0cmljdEZ1bmN0aW9uTmFtZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBpZiAoaXNSZXN0cmljdGVkV29yZCh0b2tlbi52YWx1ZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgZmlyc3RSZXN0cmljdGVkID0gdG9rZW47XG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UgPSBNZXNzYWdlcy5TdHJpY3RGdW5jdGlvbk5hbWU7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChpc1N0cmljdE1vZGVSZXNlcnZlZFdvcmQodG9rZW4udmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgICAgIGZpcnN0UmVzdHJpY3RlZCA9IHRva2VuO1xuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlID0gTWVzc2FnZXMuU3RyaWN0UmVzZXJ2ZWRXb3JkO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGV4cGVjdCgnKCcpO1xuXG4gICAgICAgIGlmICghbWF0Y2goJyknKSkge1xuICAgICAgICAgICAgcGFyYW1TZXQgPSB7fTtcbiAgICAgICAgICAgIHdoaWxlIChpbmRleCA8IGxlbmd0aCkge1xuICAgICAgICAgICAgICAgIHRva2VuID0gbG9va2FoZWFkKCk7XG4gICAgICAgICAgICAgICAgcGFyYW0gPSBwYXJzZVZhcmlhYmxlSWRlbnRpZmllcigpO1xuICAgICAgICAgICAgICAgIGlmIChzdHJpY3QpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGlzUmVzdHJpY3RlZFdvcmQodG9rZW4udmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzdHJpY3RlZCA9IHRva2VuO1xuICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZSA9IE1lc3NhZ2VzLlN0cmljdFBhcmFtTmFtZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBpZiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKHBhcmFtU2V0LCB0b2tlbi52YWx1ZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0cmljdGVkID0gdG9rZW47XG4gICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlID0gTWVzc2FnZXMuU3RyaWN0UGFyYW1EdXBlO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmICghZmlyc3RSZXN0cmljdGVkKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChpc1Jlc3RyaWN0ZWRXb3JkKHRva2VuLnZhbHVlKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZmlyc3RSZXN0cmljdGVkID0gdG9rZW47XG4gICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlID0gTWVzc2FnZXMuU3RyaWN0UGFyYW1OYW1lO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGlzU3RyaWN0TW9kZVJlc2VydmVkV29yZCh0b2tlbi52YWx1ZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZpcnN0UmVzdHJpY3RlZCA9IHRva2VuO1xuICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZSA9IE1lc3NhZ2VzLlN0cmljdFJlc2VydmVkV29yZDtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwocGFyYW1TZXQsIHRva2VuLnZhbHVlKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZmlyc3RSZXN0cmljdGVkID0gdG9rZW47XG4gICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlID0gTWVzc2FnZXMuU3RyaWN0UGFyYW1EdXBlO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHBhcmFtcy5wdXNoKHBhcmFtKTtcbiAgICAgICAgICAgICAgICBwYXJhbVNldFtwYXJhbS5uYW1lXSA9IHRydWU7XG4gICAgICAgICAgICAgICAgaWYgKG1hdGNoKCcpJykpIHtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGV4cGVjdCgnLCcpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgZXhwZWN0KCcpJyk7XG5cbiAgICAgICAgcHJldmlvdXNTdHJpY3QgPSBzdHJpY3Q7XG4gICAgICAgIGJvZHkgPSBwYXJzZUZ1bmN0aW9uU291cmNlRWxlbWVudHMoKTtcbiAgICAgICAgaWYgKHN0cmljdCAmJiBmaXJzdFJlc3RyaWN0ZWQpIHtcbiAgICAgICAgICAgIHRocm93RXJyb3IoZmlyc3RSZXN0cmljdGVkLCBtZXNzYWdlKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoc3RyaWN0ICYmIHN0cmljdGVkKSB7XG4gICAgICAgICAgICB0aHJvd0Vycm9yVG9sZXJhbnQoc3RyaWN0ZWQsIG1lc3NhZ2UpO1xuICAgICAgICB9XG4gICAgICAgIHN0cmljdCA9IHByZXZpb3VzU3RyaWN0O1xuXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB0eXBlOiBTeW50YXguRnVuY3Rpb25FeHByZXNzaW9uLFxuICAgICAgICAgICAgaWQ6IGlkLFxuICAgICAgICAgICAgcGFyYW1zOiBwYXJhbXMsXG4gICAgICAgICAgICBkZWZhdWx0czogW10sXG4gICAgICAgICAgICBib2R5OiBib2R5LFxuICAgICAgICAgICAgcmVzdDogbnVsbCxcbiAgICAgICAgICAgIGdlbmVyYXRvcjogZmFsc2UsXG4gICAgICAgICAgICBleHByZXNzaW9uOiBmYWxzZVxuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8vIDE0IFByb2dyYW1cblxuICAgIGZ1bmN0aW9uIHBhcnNlU291cmNlRWxlbWVudCgpIHtcbiAgICAgICAgdmFyIHRva2VuID0gbG9va2FoZWFkKCk7XG5cbiAgICAgICAgaWYgKHRva2VuLnR5cGUgPT09IFRva2VuLktleXdvcmQpIHtcbiAgICAgICAgICAgIHN3aXRjaCAodG9rZW4udmFsdWUpIHtcbiAgICAgICAgICAgIGNhc2UgJ2NvbnN0JzpcbiAgICAgICAgICAgIGNhc2UgJ2xldCc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIHBhcnNlQ29uc3RMZXREZWNsYXJhdGlvbih0b2tlbi52YWx1ZSk7XG4gICAgICAgICAgICBjYXNlICdmdW5jdGlvbic6XG4gICAgICAgICAgICAgICAgcmV0dXJuIHBhcnNlRnVuY3Rpb25EZWNsYXJhdGlvbigpO1xuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICByZXR1cm4gcGFyc2VTdGF0ZW1lbnQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0b2tlbi50eXBlICE9PSBUb2tlbi5FT0YpIHtcbiAgICAgICAgICAgIHJldHVybiBwYXJzZVN0YXRlbWVudCgpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcGFyc2VTb3VyY2VFbGVtZW50cygpIHtcbiAgICAgICAgdmFyIHNvdXJjZUVsZW1lbnQsIHNvdXJjZUVsZW1lbnRzID0gW10sIHRva2VuLCBkaXJlY3RpdmUsIGZpcnN0UmVzdHJpY3RlZDtcblxuICAgICAgICB3aGlsZSAoaW5kZXggPCBsZW5ndGgpIHtcbiAgICAgICAgICAgIHRva2VuID0gbG9va2FoZWFkKCk7XG4gICAgICAgICAgICBpZiAodG9rZW4udHlwZSAhPT0gVG9rZW4uU3RyaW5nTGl0ZXJhbCkge1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBzb3VyY2VFbGVtZW50ID0gcGFyc2VTb3VyY2VFbGVtZW50KCk7XG4gICAgICAgICAgICBzb3VyY2VFbGVtZW50cy5wdXNoKHNvdXJjZUVsZW1lbnQpO1xuICAgICAgICAgICAgaWYgKHNvdXJjZUVsZW1lbnQuZXhwcmVzc2lvbi50eXBlICE9PSBTeW50YXguTGl0ZXJhbCkge1xuICAgICAgICAgICAgICAgIC8vIHRoaXMgaXMgbm90IGRpcmVjdGl2ZVxuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZGlyZWN0aXZlID0gc2xpY2VTb3VyY2UodG9rZW4ucmFuZ2VbMF0gKyAxLCB0b2tlbi5yYW5nZVsxXSAtIDEpO1xuICAgICAgICAgICAgaWYgKGRpcmVjdGl2ZSA9PT0gJ3VzZSBzdHJpY3QnKSB7XG4gICAgICAgICAgICAgICAgc3RyaWN0ID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICBpZiAoZmlyc3RSZXN0cmljdGVkKSB7XG4gICAgICAgICAgICAgICAgICAgIHRocm93RXJyb3JUb2xlcmFudChmaXJzdFJlc3RyaWN0ZWQsIE1lc3NhZ2VzLlN0cmljdE9jdGFsTGl0ZXJhbCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBpZiAoIWZpcnN0UmVzdHJpY3RlZCAmJiB0b2tlbi5vY3RhbCkge1xuICAgICAgICAgICAgICAgICAgICBmaXJzdFJlc3RyaWN0ZWQgPSB0b2tlbjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICB3aGlsZSAoaW5kZXggPCBsZW5ndGgpIHtcbiAgICAgICAgICAgIHNvdXJjZUVsZW1lbnQgPSBwYXJzZVNvdXJjZUVsZW1lbnQoKTtcbiAgICAgICAgICAgIGlmICh0eXBlb2Ygc291cmNlRWxlbWVudCA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHNvdXJjZUVsZW1lbnRzLnB1c2goc291cmNlRWxlbWVudCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHNvdXJjZUVsZW1lbnRzO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHBhcnNlUHJvZ3JhbSgpIHtcbiAgICAgICAgdmFyIHByb2dyYW07XG4gICAgICAgIHN0cmljdCA9IGZhbHNlO1xuICAgICAgICBwcm9ncmFtID0ge1xuICAgICAgICAgICAgdHlwZTogU3ludGF4LlByb2dyYW0sXG4gICAgICAgICAgICBib2R5OiBwYXJzZVNvdXJjZUVsZW1lbnRzKClcbiAgICAgICAgfTtcbiAgICAgICAgcmV0dXJuIHByb2dyYW07XG4gICAgfVxuXG4gICAgLy8gVGhlIGZvbGxvd2luZyBmdW5jdGlvbnMgYXJlIG5lZWRlZCBvbmx5IHdoZW4gdGhlIG9wdGlvbiB0byBwcmVzZXJ2ZVxuICAgIC8vIHRoZSBjb21tZW50cyBpcyBhY3RpdmUuXG5cbiAgICBmdW5jdGlvbiBhZGRDb21tZW50KHR5cGUsIHZhbHVlLCBzdGFydCwgZW5kLCBsb2MpIHtcbiAgICAgICAgYXNzZXJ0KHR5cGVvZiBzdGFydCA9PT0gJ251bWJlcicsICdDb21tZW50IG11c3QgaGF2ZSB2YWxpZCBwb3NpdGlvbicpO1xuXG4gICAgICAgIC8vIEJlY2F1c2UgdGhlIHdheSB0aGUgYWN0dWFsIHRva2VuIGlzIHNjYW5uZWQsIG9mdGVuIHRoZSBjb21tZW50c1xuICAgICAgICAvLyAoaWYgYW55KSBhcmUgc2tpcHBlZCB0d2ljZSBkdXJpbmcgdGhlIGxleGljYWwgYW5hbHlzaXMuXG4gICAgICAgIC8vIFRodXMsIHdlIG5lZWQgdG8gc2tpcCBhZGRpbmcgYSBjb21tZW50IGlmIHRoZSBjb21tZW50IGFycmF5IGFscmVhZHlcbiAgICAgICAgLy8gaGFuZGxlZCBpdC5cbiAgICAgICAgaWYgKGV4dHJhLmNvbW1lbnRzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGlmIChleHRyYS5jb21tZW50c1tleHRyYS5jb21tZW50cy5sZW5ndGggLSAxXS5yYW5nZVsxXSA+IHN0YXJ0KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgZXh0cmEuY29tbWVudHMucHVzaCh7XG4gICAgICAgICAgICB0eXBlOiB0eXBlLFxuICAgICAgICAgICAgdmFsdWU6IHZhbHVlLFxuICAgICAgICAgICAgcmFuZ2U6IFtzdGFydCwgZW5kXSxcbiAgICAgICAgICAgIGxvYzogbG9jXG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHNjYW5Db21tZW50KCkge1xuICAgICAgICB2YXIgY29tbWVudCwgY2gsIGxvYywgc3RhcnQsIGJsb2NrQ29tbWVudCwgbGluZUNvbW1lbnQ7XG5cbiAgICAgICAgY29tbWVudCA9ICcnO1xuICAgICAgICBibG9ja0NvbW1lbnQgPSBmYWxzZTtcbiAgICAgICAgbGluZUNvbW1lbnQgPSBmYWxzZTtcblxuICAgICAgICB3aGlsZSAoaW5kZXggPCBsZW5ndGgpIHtcbiAgICAgICAgICAgIGNoID0gc291cmNlW2luZGV4XTtcblxuICAgICAgICAgICAgaWYgKGxpbmVDb21tZW50KSB7XG4gICAgICAgICAgICAgICAgY2ggPSBzb3VyY2VbaW5kZXgrK107XG4gICAgICAgICAgICAgICAgaWYgKGlzTGluZVRlcm1pbmF0b3IoY2gpKSB7XG4gICAgICAgICAgICAgICAgICAgIGxvYy5lbmQgPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBsaW5lOiBsaW5lTnVtYmVyLFxuICAgICAgICAgICAgICAgICAgICAgICAgY29sdW1uOiBpbmRleCAtIGxpbmVTdGFydCAtIDFcbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgbGluZUNvbW1lbnQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgYWRkQ29tbWVudCgnTGluZScsIGNvbW1lbnQsIHN0YXJ0LCBpbmRleCAtIDEsIGxvYyk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChjaCA9PT0gJ1xccicgJiYgc291cmNlW2luZGV4XSA9PT0gJ1xcbicpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICsraW5kZXg7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgKytsaW5lTnVtYmVyO1xuICAgICAgICAgICAgICAgICAgICBsaW5lU3RhcnQgPSBpbmRleDtcbiAgICAgICAgICAgICAgICAgICAgY29tbWVudCA9ICcnO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoaW5kZXggPj0gbGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgIGxpbmVDb21tZW50ID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgIGNvbW1lbnQgKz0gY2g7XG4gICAgICAgICAgICAgICAgICAgIGxvYy5lbmQgPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBsaW5lOiBsaW5lTnVtYmVyLFxuICAgICAgICAgICAgICAgICAgICAgICAgY29sdW1uOiBsZW5ndGggLSBsaW5lU3RhcnRcbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgYWRkQ29tbWVudCgnTGluZScsIGNvbW1lbnQsIHN0YXJ0LCBsZW5ndGgsIGxvYyk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgY29tbWVudCArPSBjaDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGJsb2NrQ29tbWVudCkge1xuICAgICAgICAgICAgICAgIGlmIChpc0xpbmVUZXJtaW5hdG9yKGNoKSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoY2ggPT09ICdcXHInICYmIHNvdXJjZVtpbmRleCArIDFdID09PSAnXFxuJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgKytpbmRleDtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbW1lbnQgKz0gJ1xcclxcbic7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb21tZW50ICs9IGNoO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICsrbGluZU51bWJlcjtcbiAgICAgICAgICAgICAgICAgICAgKytpbmRleDtcbiAgICAgICAgICAgICAgICAgICAgbGluZVN0YXJ0ID0gaW5kZXg7XG4gICAgICAgICAgICAgICAgICAgIGlmIChpbmRleCA+PSBsZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRocm93RXJyb3Ioe30sIE1lc3NhZ2VzLlVuZXhwZWN0ZWRUb2tlbiwgJ0lMTEVHQUwnKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGNoID0gc291cmNlW2luZGV4KytdO1xuICAgICAgICAgICAgICAgICAgICBpZiAoaW5kZXggPj0gbGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aHJvd0Vycm9yKHt9LCBNZXNzYWdlcy5VbmV4cGVjdGVkVG9rZW4sICdJTExFR0FMJyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgY29tbWVudCArPSBjaDtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGNoID09PSAnKicpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNoID0gc291cmNlW2luZGV4XTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjaCA9PT0gJy8nKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29tbWVudCA9IGNvbW1lbnQuc3Vic3RyKDAsIGNvbW1lbnQubGVuZ3RoIC0gMSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYmxvY2tDb21tZW50ID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgKytpbmRleDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsb2MuZW5kID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsaW5lOiBsaW5lTnVtYmVyLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb2x1bW46IGluZGV4IC0gbGluZVN0YXJ0XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhZGRDb21tZW50KCdCbG9jaycsIGNvbW1lbnQsIHN0YXJ0LCBpbmRleCwgbG9jKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb21tZW50ID0gJyc7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGNoID09PSAnLycpIHtcbiAgICAgICAgICAgICAgICBjaCA9IHNvdXJjZVtpbmRleCArIDFdO1xuICAgICAgICAgICAgICAgIGlmIChjaCA9PT0gJy8nKSB7XG4gICAgICAgICAgICAgICAgICAgIGxvYyA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0YXJ0OiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGluZTogbGluZU51bWJlcixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb2x1bW46IGluZGV4IC0gbGluZVN0YXJ0XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgIHN0YXJ0ID0gaW5kZXg7XG4gICAgICAgICAgICAgICAgICAgIGluZGV4ICs9IDI7XG4gICAgICAgICAgICAgICAgICAgIGxpbmVDb21tZW50ID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGluZGV4ID49IGxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgbG9jLmVuZCA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsaW5lOiBsaW5lTnVtYmVyLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbHVtbjogaW5kZXggLSBsaW5lU3RhcnRcbiAgICAgICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgICAgICBsaW5lQ29tbWVudCA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICAgICAgYWRkQ29tbWVudCgnTGluZScsIGNvbW1lbnQsIHN0YXJ0LCBpbmRleCwgbG9jKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoY2ggPT09ICcqJykge1xuICAgICAgICAgICAgICAgICAgICBzdGFydCA9IGluZGV4O1xuICAgICAgICAgICAgICAgICAgICBpbmRleCArPSAyO1xuICAgICAgICAgICAgICAgICAgICBibG9ja0NvbW1lbnQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICBsb2MgPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzdGFydDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxpbmU6IGxpbmVOdW1iZXIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29sdW1uOiBpbmRleCAtIGxpbmVTdGFydCAtIDJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGluZGV4ID49IGxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3dFcnJvcih7fSwgTWVzc2FnZXMuVW5leHBlY3RlZFRva2VuLCAnSUxMRUdBTCcpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIGlmIChpc1doaXRlU3BhY2UoY2gpKSB7XG4gICAgICAgICAgICAgICAgKytpbmRleDtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoaXNMaW5lVGVybWluYXRvcihjaCkpIHtcbiAgICAgICAgICAgICAgICArK2luZGV4O1xuICAgICAgICAgICAgICAgIGlmIChjaCA9PT0gICdcXHInICYmIHNvdXJjZVtpbmRleF0gPT09ICdcXG4nKSB7XG4gICAgICAgICAgICAgICAgICAgICsraW5kZXg7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICsrbGluZU51bWJlcjtcbiAgICAgICAgICAgICAgICBsaW5lU3RhcnQgPSBpbmRleDtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBmaWx0ZXJDb21tZW50TG9jYXRpb24oKSB7XG4gICAgICAgIHZhciBpLCBlbnRyeSwgY29tbWVudCwgY29tbWVudHMgPSBbXTtcblxuICAgICAgICBmb3IgKGkgPSAwOyBpIDwgZXh0cmEuY29tbWVudHMubGVuZ3RoOyArK2kpIHtcbiAgICAgICAgICAgIGVudHJ5ID0gZXh0cmEuY29tbWVudHNbaV07XG4gICAgICAgICAgICBjb21tZW50ID0ge1xuICAgICAgICAgICAgICAgIHR5cGU6IGVudHJ5LnR5cGUsXG4gICAgICAgICAgICAgICAgdmFsdWU6IGVudHJ5LnZhbHVlXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgaWYgKGV4dHJhLnJhbmdlKSB7XG4gICAgICAgICAgICAgICAgY29tbWVudC5yYW5nZSA9IGVudHJ5LnJhbmdlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGV4dHJhLmxvYykge1xuICAgICAgICAgICAgICAgIGNvbW1lbnQubG9jID0gZW50cnkubG9jO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29tbWVudHMucHVzaChjb21tZW50KTtcbiAgICAgICAgfVxuXG4gICAgICAgIGV4dHJhLmNvbW1lbnRzID0gY29tbWVudHM7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gY29sbGVjdFRva2VuKCkge1xuICAgICAgICB2YXIgc3RhcnQsIGxvYywgdG9rZW4sIHJhbmdlLCB2YWx1ZTtcblxuICAgICAgICBza2lwQ29tbWVudCgpO1xuICAgICAgICBzdGFydCA9IGluZGV4O1xuICAgICAgICBsb2MgPSB7XG4gICAgICAgICAgICBzdGFydDoge1xuICAgICAgICAgICAgICAgIGxpbmU6IGxpbmVOdW1iZXIsXG4gICAgICAgICAgICAgICAgY29sdW1uOiBpbmRleCAtIGxpbmVTdGFydFxuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIHRva2VuID0gZXh0cmEuYWR2YW5jZSgpO1xuICAgICAgICBsb2MuZW5kID0ge1xuICAgICAgICAgICAgbGluZTogbGluZU51bWJlcixcbiAgICAgICAgICAgIGNvbHVtbjogaW5kZXggLSBsaW5lU3RhcnRcbiAgICAgICAgfTtcblxuICAgICAgICBpZiAodG9rZW4udHlwZSAhPT0gVG9rZW4uRU9GKSB7XG4gICAgICAgICAgICByYW5nZSA9IFt0b2tlbi5yYW5nZVswXSwgdG9rZW4ucmFuZ2VbMV1dO1xuICAgICAgICAgICAgdmFsdWUgPSBzbGljZVNvdXJjZSh0b2tlbi5yYW5nZVswXSwgdG9rZW4ucmFuZ2VbMV0pO1xuICAgICAgICAgICAgZXh0cmEudG9rZW5zLnB1c2goe1xuICAgICAgICAgICAgICAgIHR5cGU6IFRva2VuTmFtZVt0b2tlbi50eXBlXSxcbiAgICAgICAgICAgICAgICB2YWx1ZTogdmFsdWUsXG4gICAgICAgICAgICAgICAgcmFuZ2U6IHJhbmdlLFxuICAgICAgICAgICAgICAgIGxvYzogbG9jXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB0b2tlbjtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBjb2xsZWN0UmVnZXgoKSB7XG4gICAgICAgIHZhciBwb3MsIGxvYywgcmVnZXgsIHRva2VuO1xuXG4gICAgICAgIHNraXBDb21tZW50KCk7XG5cbiAgICAgICAgcG9zID0gaW5kZXg7XG4gICAgICAgIGxvYyA9IHtcbiAgICAgICAgICAgIHN0YXJ0OiB7XG4gICAgICAgICAgICAgICAgbGluZTogbGluZU51bWJlcixcbiAgICAgICAgICAgICAgICBjb2x1bW46IGluZGV4IC0gbGluZVN0YXJ0XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgcmVnZXggPSBleHRyYS5zY2FuUmVnRXhwKCk7XG4gICAgICAgIGxvYy5lbmQgPSB7XG4gICAgICAgICAgICBsaW5lOiBsaW5lTnVtYmVyLFxuICAgICAgICAgICAgY29sdW1uOiBpbmRleCAtIGxpbmVTdGFydFxuICAgICAgICB9O1xuXG4gICAgICAgIC8vIFBvcCB0aGUgcHJldmlvdXMgdG9rZW4sIHdoaWNoIGlzIGxpa2VseSAnLycgb3IgJy89J1xuICAgICAgICBpZiAoZXh0cmEudG9rZW5zLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIHRva2VuID0gZXh0cmEudG9rZW5zW2V4dHJhLnRva2Vucy5sZW5ndGggLSAxXTtcbiAgICAgICAgICAgIGlmICh0b2tlbi5yYW5nZVswXSA9PT0gcG9zICYmIHRva2VuLnR5cGUgPT09ICdQdW5jdHVhdG9yJykge1xuICAgICAgICAgICAgICAgIGlmICh0b2tlbi52YWx1ZSA9PT0gJy8nIHx8IHRva2VuLnZhbHVlID09PSAnLz0nKSB7XG4gICAgICAgICAgICAgICAgICAgIGV4dHJhLnRva2Vucy5wb3AoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBleHRyYS50b2tlbnMucHVzaCh7XG4gICAgICAgICAgICB0eXBlOiAnUmVndWxhckV4cHJlc3Npb24nLFxuICAgICAgICAgICAgdmFsdWU6IHJlZ2V4LmxpdGVyYWwsXG4gICAgICAgICAgICByYW5nZTogW3BvcywgaW5kZXhdLFxuICAgICAgICAgICAgbG9jOiBsb2NcbiAgICAgICAgfSk7XG5cbiAgICAgICAgcmV0dXJuIHJlZ2V4O1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGZpbHRlclRva2VuTG9jYXRpb24oKSB7XG4gICAgICAgIHZhciBpLCBlbnRyeSwgdG9rZW4sIHRva2VucyA9IFtdO1xuXG4gICAgICAgIGZvciAoaSA9IDA7IGkgPCBleHRyYS50b2tlbnMubGVuZ3RoOyArK2kpIHtcbiAgICAgICAgICAgIGVudHJ5ID0gZXh0cmEudG9rZW5zW2ldO1xuICAgICAgICAgICAgdG9rZW4gPSB7XG4gICAgICAgICAgICAgICAgdHlwZTogZW50cnkudHlwZSxcbiAgICAgICAgICAgICAgICB2YWx1ZTogZW50cnkudmFsdWVcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBpZiAoZXh0cmEucmFuZ2UpIHtcbiAgICAgICAgICAgICAgICB0b2tlbi5yYW5nZSA9IGVudHJ5LnJhbmdlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGV4dHJhLmxvYykge1xuICAgICAgICAgICAgICAgIHRva2VuLmxvYyA9IGVudHJ5LmxvYztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRva2Vucy5wdXNoKHRva2VuKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGV4dHJhLnRva2VucyA9IHRva2VucztcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBjcmVhdGVMaXRlcmFsKHRva2VuKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB0eXBlOiBTeW50YXguTGl0ZXJhbCxcbiAgICAgICAgICAgIHZhbHVlOiB0b2tlbi52YWx1ZVxuICAgICAgICB9O1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGNyZWF0ZVJhd0xpdGVyYWwodG9rZW4pIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHR5cGU6IFN5bnRheC5MaXRlcmFsLFxuICAgICAgICAgICAgdmFsdWU6IHRva2VuLnZhbHVlLFxuICAgICAgICAgICAgcmF3OiBzbGljZVNvdXJjZSh0b2tlbi5yYW5nZVswXSwgdG9rZW4ucmFuZ2VbMV0pXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gY3JlYXRlTG9jYXRpb25NYXJrZXIoKSB7XG4gICAgICAgIHZhciBtYXJrZXIgPSB7fTtcblxuICAgICAgICBtYXJrZXIucmFuZ2UgPSBbaW5kZXgsIGluZGV4XTtcbiAgICAgICAgbWFya2VyLmxvYyA9IHtcbiAgICAgICAgICAgIHN0YXJ0OiB7XG4gICAgICAgICAgICAgICAgbGluZTogbGluZU51bWJlcixcbiAgICAgICAgICAgICAgICBjb2x1bW46IGluZGV4IC0gbGluZVN0YXJ0XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZW5kOiB7XG4gICAgICAgICAgICAgICAgbGluZTogbGluZU51bWJlcixcbiAgICAgICAgICAgICAgICBjb2x1bW46IGluZGV4IC0gbGluZVN0YXJ0XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgbWFya2VyLmVuZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHRoaXMucmFuZ2VbMV0gPSBpbmRleDtcbiAgICAgICAgICAgIHRoaXMubG9jLmVuZC5saW5lID0gbGluZU51bWJlcjtcbiAgICAgICAgICAgIHRoaXMubG9jLmVuZC5jb2x1bW4gPSBpbmRleCAtIGxpbmVTdGFydDtcbiAgICAgICAgfTtcblxuICAgICAgICBtYXJrZXIuYXBwbHlHcm91cCA9IGZ1bmN0aW9uIChub2RlKSB7XG4gICAgICAgICAgICBpZiAoZXh0cmEucmFuZ2UpIHtcbiAgICAgICAgICAgICAgICBub2RlLmdyb3VwUmFuZ2UgPSBbdGhpcy5yYW5nZVswXSwgdGhpcy5yYW5nZVsxXV07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoZXh0cmEubG9jKSB7XG4gICAgICAgICAgICAgICAgbm9kZS5ncm91cExvYyA9IHtcbiAgICAgICAgICAgICAgICAgICAgc3RhcnQ6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxpbmU6IHRoaXMubG9jLnN0YXJ0LmxpbmUsXG4gICAgICAgICAgICAgICAgICAgICAgICBjb2x1bW46IHRoaXMubG9jLnN0YXJ0LmNvbHVtblxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBlbmQ6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxpbmU6IHRoaXMubG9jLmVuZC5saW5lLFxuICAgICAgICAgICAgICAgICAgICAgICAgY29sdW1uOiB0aGlzLmxvYy5lbmQuY29sdW1uXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIG1hcmtlci5hcHBseSA9IGZ1bmN0aW9uIChub2RlKSB7XG4gICAgICAgICAgICBpZiAoZXh0cmEucmFuZ2UpIHtcbiAgICAgICAgICAgICAgICBub2RlLnJhbmdlID0gW3RoaXMucmFuZ2VbMF0sIHRoaXMucmFuZ2VbMV1dO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGV4dHJhLmxvYykge1xuICAgICAgICAgICAgICAgIG5vZGUubG9jID0ge1xuICAgICAgICAgICAgICAgICAgICBzdGFydDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgbGluZTogdGhpcy5sb2Muc3RhcnQubGluZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbHVtbjogdGhpcy5sb2Muc3RhcnQuY29sdW1uXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIGVuZDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgbGluZTogdGhpcy5sb2MuZW5kLmxpbmUsXG4gICAgICAgICAgICAgICAgICAgICAgICBjb2x1bW46IHRoaXMubG9jLmVuZC5jb2x1bW5cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgcmV0dXJuIG1hcmtlcjtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiB0cmFja0dyb3VwRXhwcmVzc2lvbigpIHtcbiAgICAgICAgdmFyIG1hcmtlciwgZXhwcjtcblxuICAgICAgICBza2lwQ29tbWVudCgpO1xuICAgICAgICBtYXJrZXIgPSBjcmVhdGVMb2NhdGlvbk1hcmtlcigpO1xuICAgICAgICBleHBlY3QoJygnKTtcblxuICAgICAgICBleHByID0gcGFyc2VFeHByZXNzaW9uKCk7XG5cbiAgICAgICAgZXhwZWN0KCcpJyk7XG5cbiAgICAgICAgbWFya2VyLmVuZCgpO1xuICAgICAgICBtYXJrZXIuYXBwbHlHcm91cChleHByKTtcblxuICAgICAgICByZXR1cm4gZXhwcjtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiB0cmFja0xlZnRIYW5kU2lkZUV4cHJlc3Npb24oKSB7XG4gICAgICAgIHZhciBtYXJrZXIsIGV4cHI7XG5cbiAgICAgICAgc2tpcENvbW1lbnQoKTtcbiAgICAgICAgbWFya2VyID0gY3JlYXRlTG9jYXRpb25NYXJrZXIoKTtcblxuICAgICAgICBleHByID0gbWF0Y2hLZXl3b3JkKCduZXcnKSA/IHBhcnNlTmV3RXhwcmVzc2lvbigpIDogcGFyc2VQcmltYXJ5RXhwcmVzc2lvbigpO1xuXG4gICAgICAgIHdoaWxlIChtYXRjaCgnLicpIHx8IG1hdGNoKCdbJykpIHtcbiAgICAgICAgICAgIGlmIChtYXRjaCgnWycpKSB7XG4gICAgICAgICAgICAgICAgZXhwciA9IHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogU3ludGF4Lk1lbWJlckV4cHJlc3Npb24sXG4gICAgICAgICAgICAgICAgICAgIGNvbXB1dGVkOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICBvYmplY3Q6IGV4cHIsXG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnR5OiBwYXJzZUNvbXB1dGVkTWVtYmVyKClcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIG1hcmtlci5lbmQoKTtcbiAgICAgICAgICAgICAgICBtYXJrZXIuYXBwbHkoZXhwcik7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGV4cHIgPSB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IFN5bnRheC5NZW1iZXJFeHByZXNzaW9uLFxuICAgICAgICAgICAgICAgICAgICBjb21wdXRlZDogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgIG9iamVjdDogZXhwcixcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydHk6IHBhcnNlTm9uQ29tcHV0ZWRNZW1iZXIoKVxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgbWFya2VyLmVuZCgpO1xuICAgICAgICAgICAgICAgIG1hcmtlci5hcHBseShleHByKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBleHByO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHRyYWNrTGVmdEhhbmRTaWRlRXhwcmVzc2lvbkFsbG93Q2FsbCgpIHtcbiAgICAgICAgdmFyIG1hcmtlciwgZXhwcjtcblxuICAgICAgICBza2lwQ29tbWVudCgpO1xuICAgICAgICBtYXJrZXIgPSBjcmVhdGVMb2NhdGlvbk1hcmtlcigpO1xuXG4gICAgICAgIGV4cHIgPSBtYXRjaEtleXdvcmQoJ25ldycpID8gcGFyc2VOZXdFeHByZXNzaW9uKCkgOiBwYXJzZVByaW1hcnlFeHByZXNzaW9uKCk7XG5cbiAgICAgICAgd2hpbGUgKG1hdGNoKCcuJykgfHwgbWF0Y2goJ1snKSB8fCBtYXRjaCgnKCcpKSB7XG4gICAgICAgICAgICBpZiAobWF0Y2goJygnKSkge1xuICAgICAgICAgICAgICAgIGV4cHIgPSB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IFN5bnRheC5DYWxsRXhwcmVzc2lvbixcbiAgICAgICAgICAgICAgICAgICAgY2FsbGVlOiBleHByLFxuICAgICAgICAgICAgICAgICAgICAnYXJndW1lbnRzJzogcGFyc2VBcmd1bWVudHMoKVxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgbWFya2VyLmVuZCgpO1xuICAgICAgICAgICAgICAgIG1hcmtlci5hcHBseShleHByKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAobWF0Y2goJ1snKSkge1xuICAgICAgICAgICAgICAgIGV4cHIgPSB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IFN5bnRheC5NZW1iZXJFeHByZXNzaW9uLFxuICAgICAgICAgICAgICAgICAgICBjb21wdXRlZDogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgb2JqZWN0OiBleHByLFxuICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0eTogcGFyc2VDb21wdXRlZE1lbWJlcigpXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICBtYXJrZXIuZW5kKCk7XG4gICAgICAgICAgICAgICAgbWFya2VyLmFwcGx5KGV4cHIpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBleHByID0ge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiBTeW50YXguTWVtYmVyRXhwcmVzc2lvbixcbiAgICAgICAgICAgICAgICAgICAgY29tcHV0ZWQ6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICBvYmplY3Q6IGV4cHIsXG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnR5OiBwYXJzZU5vbkNvbXB1dGVkTWVtYmVyKClcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIG1hcmtlci5lbmQoKTtcbiAgICAgICAgICAgICAgICBtYXJrZXIuYXBwbHkoZXhwcik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gZXhwcjtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBmaWx0ZXJHcm91cChub2RlKSB7XG4gICAgICAgIHZhciBuLCBpLCBlbnRyeTtcblxuICAgICAgICBuID0gKE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuYXBwbHkobm9kZSkgPT09ICdbb2JqZWN0IEFycmF5XScpID8gW10gOiB7fTtcbiAgICAgICAgZm9yIChpIGluIG5vZGUpIHtcbiAgICAgICAgICAgIGlmIChub2RlLmhhc093blByb3BlcnR5KGkpICYmIGkgIT09ICdncm91cFJhbmdlJyAmJiBpICE9PSAnZ3JvdXBMb2MnKSB7XG4gICAgICAgICAgICAgICAgZW50cnkgPSBub2RlW2ldO1xuICAgICAgICAgICAgICAgIGlmIChlbnRyeSA9PT0gbnVsbCB8fCB0eXBlb2YgZW50cnkgIT09ICdvYmplY3QnIHx8IGVudHJ5IGluc3RhbmNlb2YgUmVnRXhwKSB7XG4gICAgICAgICAgICAgICAgICAgIG5baV0gPSBlbnRyeTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBuW2ldID0gZmlsdGVyR3JvdXAoZW50cnkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbjtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiB3cmFwVHJhY2tpbmdGdW5jdGlvbihyYW5nZSwgbG9jKSB7XG5cbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIChwYXJzZUZ1bmN0aW9uKSB7XG5cbiAgICAgICAgICAgIGZ1bmN0aW9uIGlzQmluYXJ5KG5vZGUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbm9kZS50eXBlID09PSBTeW50YXguTG9naWNhbEV4cHJlc3Npb24gfHxcbiAgICAgICAgICAgICAgICAgICAgbm9kZS50eXBlID09PSBTeW50YXguQmluYXJ5RXhwcmVzc2lvbjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgZnVuY3Rpb24gdmlzaXQobm9kZSkge1xuICAgICAgICAgICAgICAgIHZhciBzdGFydCwgZW5kO1xuXG4gICAgICAgICAgICAgICAgaWYgKGlzQmluYXJ5KG5vZGUubGVmdCkpIHtcbiAgICAgICAgICAgICAgICAgICAgdmlzaXQobm9kZS5sZWZ0KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKGlzQmluYXJ5KG5vZGUucmlnaHQpKSB7XG4gICAgICAgICAgICAgICAgICAgIHZpc2l0KG5vZGUucmlnaHQpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGlmIChyYW5nZSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAobm9kZS5sZWZ0Lmdyb3VwUmFuZ2UgfHwgbm9kZS5yaWdodC5ncm91cFJhbmdlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzdGFydCA9IG5vZGUubGVmdC5ncm91cFJhbmdlID8gbm9kZS5sZWZ0Lmdyb3VwUmFuZ2VbMF0gOiBub2RlLmxlZnQucmFuZ2VbMF07XG4gICAgICAgICAgICAgICAgICAgICAgICBlbmQgPSBub2RlLnJpZ2h0Lmdyb3VwUmFuZ2UgPyBub2RlLnJpZ2h0Lmdyb3VwUmFuZ2VbMV0gOiBub2RlLnJpZ2h0LnJhbmdlWzFdO1xuICAgICAgICAgICAgICAgICAgICAgICAgbm9kZS5yYW5nZSA9IFtzdGFydCwgZW5kXTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmICh0eXBlb2Ygbm9kZS5yYW5nZSA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0YXJ0ID0gbm9kZS5sZWZ0LnJhbmdlWzBdO1xuICAgICAgICAgICAgICAgICAgICAgICAgZW5kID0gbm9kZS5yaWdodC5yYW5nZVsxXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIG5vZGUucmFuZ2UgPSBbc3RhcnQsIGVuZF07XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKGxvYykge1xuICAgICAgICAgICAgICAgICAgICBpZiAobm9kZS5sZWZ0Lmdyb3VwTG9jIHx8IG5vZGUucmlnaHQuZ3JvdXBMb2MpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0YXJ0ID0gbm9kZS5sZWZ0Lmdyb3VwTG9jID8gbm9kZS5sZWZ0Lmdyb3VwTG9jLnN0YXJ0IDogbm9kZS5sZWZ0LmxvYy5zdGFydDtcbiAgICAgICAgICAgICAgICAgICAgICAgIGVuZCA9IG5vZGUucmlnaHQuZ3JvdXBMb2MgPyBub2RlLnJpZ2h0Lmdyb3VwTG9jLmVuZCA6IG5vZGUucmlnaHQubG9jLmVuZDtcbiAgICAgICAgICAgICAgICAgICAgICAgIG5vZGUubG9jID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0YXJ0OiBzdGFydCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbmQ6IGVuZFxuICAgICAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmICh0eXBlb2Ygbm9kZS5sb2MgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBub2RlLmxvYyA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdGFydDogbm9kZS5sZWZ0LmxvYy5zdGFydCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbmQ6IG5vZGUucmlnaHQubG9jLmVuZFxuICAgICAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICB2YXIgbWFya2VyLCBub2RlO1xuXG4gICAgICAgICAgICAgICAgc2tpcENvbW1lbnQoKTtcblxuICAgICAgICAgICAgICAgIG1hcmtlciA9IGNyZWF0ZUxvY2F0aW9uTWFya2VyKCk7XG4gICAgICAgICAgICAgICAgbm9kZSA9IHBhcnNlRnVuY3Rpb24uYXBwbHkobnVsbCwgYXJndW1lbnRzKTtcbiAgICAgICAgICAgICAgICBtYXJrZXIuZW5kKCk7XG5cbiAgICAgICAgICAgICAgICBpZiAocmFuZ2UgJiYgdHlwZW9mIG5vZGUucmFuZ2UgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgICAgIG1hcmtlci5hcHBseShub2RlKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBpZiAobG9jICYmIHR5cGVvZiBub2RlLmxvYyA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgICAgICAgbWFya2VyLmFwcGx5KG5vZGUpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGlmIChpc0JpbmFyeShub2RlKSkge1xuICAgICAgICAgICAgICAgICAgICB2aXNpdChub2RlKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICByZXR1cm4gbm9kZTtcbiAgICAgICAgICAgIH07XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcGF0Y2goKSB7XG5cbiAgICAgICAgdmFyIHdyYXBUcmFja2luZztcblxuICAgICAgICBpZiAoZXh0cmEuY29tbWVudHMpIHtcbiAgICAgICAgICAgIGV4dHJhLnNraXBDb21tZW50ID0gc2tpcENvbW1lbnQ7XG4gICAgICAgICAgICBza2lwQ29tbWVudCA9IHNjYW5Db21tZW50O1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGV4dHJhLnJhdykge1xuICAgICAgICAgICAgZXh0cmEuY3JlYXRlTGl0ZXJhbCA9IGNyZWF0ZUxpdGVyYWw7XG4gICAgICAgICAgICBjcmVhdGVMaXRlcmFsID0gY3JlYXRlUmF3TGl0ZXJhbDtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChleHRyYS5yYW5nZSB8fCBleHRyYS5sb2MpIHtcblxuICAgICAgICAgICAgZXh0cmEucGFyc2VHcm91cEV4cHJlc3Npb24gPSBwYXJzZUdyb3VwRXhwcmVzc2lvbjtcbiAgICAgICAgICAgIGV4dHJhLnBhcnNlTGVmdEhhbmRTaWRlRXhwcmVzc2lvbiA9IHBhcnNlTGVmdEhhbmRTaWRlRXhwcmVzc2lvbjtcbiAgICAgICAgICAgIGV4dHJhLnBhcnNlTGVmdEhhbmRTaWRlRXhwcmVzc2lvbkFsbG93Q2FsbCA9IHBhcnNlTGVmdEhhbmRTaWRlRXhwcmVzc2lvbkFsbG93Q2FsbDtcbiAgICAgICAgICAgIHBhcnNlR3JvdXBFeHByZXNzaW9uID0gdHJhY2tHcm91cEV4cHJlc3Npb247XG4gICAgICAgICAgICBwYXJzZUxlZnRIYW5kU2lkZUV4cHJlc3Npb24gPSB0cmFja0xlZnRIYW5kU2lkZUV4cHJlc3Npb247XG4gICAgICAgICAgICBwYXJzZUxlZnRIYW5kU2lkZUV4cHJlc3Npb25BbGxvd0NhbGwgPSB0cmFja0xlZnRIYW5kU2lkZUV4cHJlc3Npb25BbGxvd0NhbGw7XG5cbiAgICAgICAgICAgIHdyYXBUcmFja2luZyA9IHdyYXBUcmFja2luZ0Z1bmN0aW9uKGV4dHJhLnJhbmdlLCBleHRyYS5sb2MpO1xuXG4gICAgICAgICAgICBleHRyYS5wYXJzZUFkZGl0aXZlRXhwcmVzc2lvbiA9IHBhcnNlQWRkaXRpdmVFeHByZXNzaW9uO1xuICAgICAgICAgICAgZXh0cmEucGFyc2VBc3NpZ25tZW50RXhwcmVzc2lvbiA9IHBhcnNlQXNzaWdubWVudEV4cHJlc3Npb247XG4gICAgICAgICAgICBleHRyYS5wYXJzZUJpdHdpc2VBTkRFeHByZXNzaW9uID0gcGFyc2VCaXR3aXNlQU5ERXhwcmVzc2lvbjtcbiAgICAgICAgICAgIGV4dHJhLnBhcnNlQml0d2lzZU9SRXhwcmVzc2lvbiA9IHBhcnNlQml0d2lzZU9SRXhwcmVzc2lvbjtcbiAgICAgICAgICAgIGV4dHJhLnBhcnNlQml0d2lzZVhPUkV4cHJlc3Npb24gPSBwYXJzZUJpdHdpc2VYT1JFeHByZXNzaW9uO1xuICAgICAgICAgICAgZXh0cmEucGFyc2VCbG9jayA9IHBhcnNlQmxvY2s7XG4gICAgICAgICAgICBleHRyYS5wYXJzZUZ1bmN0aW9uU291cmNlRWxlbWVudHMgPSBwYXJzZUZ1bmN0aW9uU291cmNlRWxlbWVudHM7XG4gICAgICAgICAgICBleHRyYS5wYXJzZUNhdGNoQ2xhdXNlID0gcGFyc2VDYXRjaENsYXVzZTtcbiAgICAgICAgICAgIGV4dHJhLnBhcnNlQ29tcHV0ZWRNZW1iZXIgPSBwYXJzZUNvbXB1dGVkTWVtYmVyO1xuICAgICAgICAgICAgZXh0cmEucGFyc2VDb25kaXRpb25hbEV4cHJlc3Npb24gPSBwYXJzZUNvbmRpdGlvbmFsRXhwcmVzc2lvbjtcbiAgICAgICAgICAgIGV4dHJhLnBhcnNlQ29uc3RMZXREZWNsYXJhdGlvbiA9IHBhcnNlQ29uc3RMZXREZWNsYXJhdGlvbjtcbiAgICAgICAgICAgIGV4dHJhLnBhcnNlRXF1YWxpdHlFeHByZXNzaW9uID0gcGFyc2VFcXVhbGl0eUV4cHJlc3Npb247XG4gICAgICAgICAgICBleHRyYS5wYXJzZUV4cHJlc3Npb24gPSBwYXJzZUV4cHJlc3Npb247XG4gICAgICAgICAgICBleHRyYS5wYXJzZUZvclZhcmlhYmxlRGVjbGFyYXRpb24gPSBwYXJzZUZvclZhcmlhYmxlRGVjbGFyYXRpb247XG4gICAgICAgICAgICBleHRyYS5wYXJzZUZ1bmN0aW9uRGVjbGFyYXRpb24gPSBwYXJzZUZ1bmN0aW9uRGVjbGFyYXRpb247XG4gICAgICAgICAgICBleHRyYS5wYXJzZUZ1bmN0aW9uRXhwcmVzc2lvbiA9IHBhcnNlRnVuY3Rpb25FeHByZXNzaW9uO1xuICAgICAgICAgICAgZXh0cmEucGFyc2VMb2dpY2FsQU5ERXhwcmVzc2lvbiA9IHBhcnNlTG9naWNhbEFOREV4cHJlc3Npb247XG4gICAgICAgICAgICBleHRyYS5wYXJzZUxvZ2ljYWxPUkV4cHJlc3Npb24gPSBwYXJzZUxvZ2ljYWxPUkV4cHJlc3Npb247XG4gICAgICAgICAgICBleHRyYS5wYXJzZU11bHRpcGxpY2F0aXZlRXhwcmVzc2lvbiA9IHBhcnNlTXVsdGlwbGljYXRpdmVFeHByZXNzaW9uO1xuICAgICAgICAgICAgZXh0cmEucGFyc2VOZXdFeHByZXNzaW9uID0gcGFyc2VOZXdFeHByZXNzaW9uO1xuICAgICAgICAgICAgZXh0cmEucGFyc2VOb25Db21wdXRlZFByb3BlcnR5ID0gcGFyc2VOb25Db21wdXRlZFByb3BlcnR5O1xuICAgICAgICAgICAgZXh0cmEucGFyc2VPYmplY3RQcm9wZXJ0eSA9IHBhcnNlT2JqZWN0UHJvcGVydHk7XG4gICAgICAgICAgICBleHRyYS5wYXJzZU9iamVjdFByb3BlcnR5S2V5ID0gcGFyc2VPYmplY3RQcm9wZXJ0eUtleTtcbiAgICAgICAgICAgIGV4dHJhLnBhcnNlUG9zdGZpeEV4cHJlc3Npb24gPSBwYXJzZVBvc3RmaXhFeHByZXNzaW9uO1xuICAgICAgICAgICAgZXh0cmEucGFyc2VQcmltYXJ5RXhwcmVzc2lvbiA9IHBhcnNlUHJpbWFyeUV4cHJlc3Npb247XG4gICAgICAgICAgICBleHRyYS5wYXJzZVByb2dyYW0gPSBwYXJzZVByb2dyYW07XG4gICAgICAgICAgICBleHRyYS5wYXJzZVByb3BlcnR5RnVuY3Rpb24gPSBwYXJzZVByb3BlcnR5RnVuY3Rpb247XG4gICAgICAgICAgICBleHRyYS5wYXJzZVJlbGF0aW9uYWxFeHByZXNzaW9uID0gcGFyc2VSZWxhdGlvbmFsRXhwcmVzc2lvbjtcbiAgICAgICAgICAgIGV4dHJhLnBhcnNlU3RhdGVtZW50ID0gcGFyc2VTdGF0ZW1lbnQ7XG4gICAgICAgICAgICBleHRyYS5wYXJzZVNoaWZ0RXhwcmVzc2lvbiA9IHBhcnNlU2hpZnRFeHByZXNzaW9uO1xuICAgICAgICAgICAgZXh0cmEucGFyc2VTd2l0Y2hDYXNlID0gcGFyc2VTd2l0Y2hDYXNlO1xuICAgICAgICAgICAgZXh0cmEucGFyc2VVbmFyeUV4cHJlc3Npb24gPSBwYXJzZVVuYXJ5RXhwcmVzc2lvbjtcbiAgICAgICAgICAgIGV4dHJhLnBhcnNlVmFyaWFibGVEZWNsYXJhdGlvbiA9IHBhcnNlVmFyaWFibGVEZWNsYXJhdGlvbjtcbiAgICAgICAgICAgIGV4dHJhLnBhcnNlVmFyaWFibGVJZGVudGlmaWVyID0gcGFyc2VWYXJpYWJsZUlkZW50aWZpZXI7XG5cbiAgICAgICAgICAgIHBhcnNlQWRkaXRpdmVFeHByZXNzaW9uID0gd3JhcFRyYWNraW5nKGV4dHJhLnBhcnNlQWRkaXRpdmVFeHByZXNzaW9uKTtcbiAgICAgICAgICAgIHBhcnNlQXNzaWdubWVudEV4cHJlc3Npb24gPSB3cmFwVHJhY2tpbmcoZXh0cmEucGFyc2VBc3NpZ25tZW50RXhwcmVzc2lvbik7XG4gICAgICAgICAgICBwYXJzZUJpdHdpc2VBTkRFeHByZXNzaW9uID0gd3JhcFRyYWNraW5nKGV4dHJhLnBhcnNlQml0d2lzZUFOREV4cHJlc3Npb24pO1xuICAgICAgICAgICAgcGFyc2VCaXR3aXNlT1JFeHByZXNzaW9uID0gd3JhcFRyYWNraW5nKGV4dHJhLnBhcnNlQml0d2lzZU9SRXhwcmVzc2lvbik7XG4gICAgICAgICAgICBwYXJzZUJpdHdpc2VYT1JFeHByZXNzaW9uID0gd3JhcFRyYWNraW5nKGV4dHJhLnBhcnNlQml0d2lzZVhPUkV4cHJlc3Npb24pO1xuICAgICAgICAgICAgcGFyc2VCbG9jayA9IHdyYXBUcmFja2luZyhleHRyYS5wYXJzZUJsb2NrKTtcbiAgICAgICAgICAgIHBhcnNlRnVuY3Rpb25Tb3VyY2VFbGVtZW50cyA9IHdyYXBUcmFja2luZyhleHRyYS5wYXJzZUZ1bmN0aW9uU291cmNlRWxlbWVudHMpO1xuICAgICAgICAgICAgcGFyc2VDYXRjaENsYXVzZSA9IHdyYXBUcmFja2luZyhleHRyYS5wYXJzZUNhdGNoQ2xhdXNlKTtcbiAgICAgICAgICAgIHBhcnNlQ29tcHV0ZWRNZW1iZXIgPSB3cmFwVHJhY2tpbmcoZXh0cmEucGFyc2VDb21wdXRlZE1lbWJlcik7XG4gICAgICAgICAgICBwYXJzZUNvbmRpdGlvbmFsRXhwcmVzc2lvbiA9IHdyYXBUcmFja2luZyhleHRyYS5wYXJzZUNvbmRpdGlvbmFsRXhwcmVzc2lvbik7XG4gICAgICAgICAgICBwYXJzZUNvbnN0TGV0RGVjbGFyYXRpb24gPSB3cmFwVHJhY2tpbmcoZXh0cmEucGFyc2VDb25zdExldERlY2xhcmF0aW9uKTtcbiAgICAgICAgICAgIHBhcnNlRXF1YWxpdHlFeHByZXNzaW9uID0gd3JhcFRyYWNraW5nKGV4dHJhLnBhcnNlRXF1YWxpdHlFeHByZXNzaW9uKTtcbiAgICAgICAgICAgIHBhcnNlRXhwcmVzc2lvbiA9IHdyYXBUcmFja2luZyhleHRyYS5wYXJzZUV4cHJlc3Npb24pO1xuICAgICAgICAgICAgcGFyc2VGb3JWYXJpYWJsZURlY2xhcmF0aW9uID0gd3JhcFRyYWNraW5nKGV4dHJhLnBhcnNlRm9yVmFyaWFibGVEZWNsYXJhdGlvbik7XG4gICAgICAgICAgICBwYXJzZUZ1bmN0aW9uRGVjbGFyYXRpb24gPSB3cmFwVHJhY2tpbmcoZXh0cmEucGFyc2VGdW5jdGlvbkRlY2xhcmF0aW9uKTtcbiAgICAgICAgICAgIHBhcnNlRnVuY3Rpb25FeHByZXNzaW9uID0gd3JhcFRyYWNraW5nKGV4dHJhLnBhcnNlRnVuY3Rpb25FeHByZXNzaW9uKTtcbiAgICAgICAgICAgIHBhcnNlTGVmdEhhbmRTaWRlRXhwcmVzc2lvbiA9IHdyYXBUcmFja2luZyhwYXJzZUxlZnRIYW5kU2lkZUV4cHJlc3Npb24pO1xuICAgICAgICAgICAgcGFyc2VMb2dpY2FsQU5ERXhwcmVzc2lvbiA9IHdyYXBUcmFja2luZyhleHRyYS5wYXJzZUxvZ2ljYWxBTkRFeHByZXNzaW9uKTtcbiAgICAgICAgICAgIHBhcnNlTG9naWNhbE9SRXhwcmVzc2lvbiA9IHdyYXBUcmFja2luZyhleHRyYS5wYXJzZUxvZ2ljYWxPUkV4cHJlc3Npb24pO1xuICAgICAgICAgICAgcGFyc2VNdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb24gPSB3cmFwVHJhY2tpbmcoZXh0cmEucGFyc2VNdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb24pO1xuICAgICAgICAgICAgcGFyc2VOZXdFeHByZXNzaW9uID0gd3JhcFRyYWNraW5nKGV4dHJhLnBhcnNlTmV3RXhwcmVzc2lvbik7XG4gICAgICAgICAgICBwYXJzZU5vbkNvbXB1dGVkUHJvcGVydHkgPSB3cmFwVHJhY2tpbmcoZXh0cmEucGFyc2VOb25Db21wdXRlZFByb3BlcnR5KTtcbiAgICAgICAgICAgIHBhcnNlT2JqZWN0UHJvcGVydHkgPSB3cmFwVHJhY2tpbmcoZXh0cmEucGFyc2VPYmplY3RQcm9wZXJ0eSk7XG4gICAgICAgICAgICBwYXJzZU9iamVjdFByb3BlcnR5S2V5ID0gd3JhcFRyYWNraW5nKGV4dHJhLnBhcnNlT2JqZWN0UHJvcGVydHlLZXkpO1xuICAgICAgICAgICAgcGFyc2VQb3N0Zml4RXhwcmVzc2lvbiA9IHdyYXBUcmFja2luZyhleHRyYS5wYXJzZVBvc3RmaXhFeHByZXNzaW9uKTtcbiAgICAgICAgICAgIHBhcnNlUHJpbWFyeUV4cHJlc3Npb24gPSB3cmFwVHJhY2tpbmcoZXh0cmEucGFyc2VQcmltYXJ5RXhwcmVzc2lvbik7XG4gICAgICAgICAgICBwYXJzZVByb2dyYW0gPSB3cmFwVHJhY2tpbmcoZXh0cmEucGFyc2VQcm9ncmFtKTtcbiAgICAgICAgICAgIHBhcnNlUHJvcGVydHlGdW5jdGlvbiA9IHdyYXBUcmFja2luZyhleHRyYS5wYXJzZVByb3BlcnR5RnVuY3Rpb24pO1xuICAgICAgICAgICAgcGFyc2VSZWxhdGlvbmFsRXhwcmVzc2lvbiA9IHdyYXBUcmFja2luZyhleHRyYS5wYXJzZVJlbGF0aW9uYWxFeHByZXNzaW9uKTtcbiAgICAgICAgICAgIHBhcnNlU3RhdGVtZW50ID0gd3JhcFRyYWNraW5nKGV4dHJhLnBhcnNlU3RhdGVtZW50KTtcbiAgICAgICAgICAgIHBhcnNlU2hpZnRFeHByZXNzaW9uID0gd3JhcFRyYWNraW5nKGV4dHJhLnBhcnNlU2hpZnRFeHByZXNzaW9uKTtcbiAgICAgICAgICAgIHBhcnNlU3dpdGNoQ2FzZSA9IHdyYXBUcmFja2luZyhleHRyYS5wYXJzZVN3aXRjaENhc2UpO1xuICAgICAgICAgICAgcGFyc2VVbmFyeUV4cHJlc3Npb24gPSB3cmFwVHJhY2tpbmcoZXh0cmEucGFyc2VVbmFyeUV4cHJlc3Npb24pO1xuICAgICAgICAgICAgcGFyc2VWYXJpYWJsZURlY2xhcmF0aW9uID0gd3JhcFRyYWNraW5nKGV4dHJhLnBhcnNlVmFyaWFibGVEZWNsYXJhdGlvbik7XG4gICAgICAgICAgICBwYXJzZVZhcmlhYmxlSWRlbnRpZmllciA9IHdyYXBUcmFja2luZyhleHRyYS5wYXJzZVZhcmlhYmxlSWRlbnRpZmllcik7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodHlwZW9mIGV4dHJhLnRva2VucyAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIGV4dHJhLmFkdmFuY2UgPSBhZHZhbmNlO1xuICAgICAgICAgICAgZXh0cmEuc2NhblJlZ0V4cCA9IHNjYW5SZWdFeHA7XG5cbiAgICAgICAgICAgIGFkdmFuY2UgPSBjb2xsZWN0VG9rZW47XG4gICAgICAgICAgICBzY2FuUmVnRXhwID0gY29sbGVjdFJlZ2V4O1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gdW5wYXRjaCgpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBleHRyYS5za2lwQ29tbWVudCA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgc2tpcENvbW1lbnQgPSBleHRyYS5za2lwQ29tbWVudDtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChleHRyYS5yYXcpIHtcbiAgICAgICAgICAgIGNyZWF0ZUxpdGVyYWwgPSBleHRyYS5jcmVhdGVMaXRlcmFsO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGV4dHJhLnJhbmdlIHx8IGV4dHJhLmxvYykge1xuICAgICAgICAgICAgcGFyc2VBZGRpdGl2ZUV4cHJlc3Npb24gPSBleHRyYS5wYXJzZUFkZGl0aXZlRXhwcmVzc2lvbjtcbiAgICAgICAgICAgIHBhcnNlQXNzaWdubWVudEV4cHJlc3Npb24gPSBleHRyYS5wYXJzZUFzc2lnbm1lbnRFeHByZXNzaW9uO1xuICAgICAgICAgICAgcGFyc2VCaXR3aXNlQU5ERXhwcmVzc2lvbiA9IGV4dHJhLnBhcnNlQml0d2lzZUFOREV4cHJlc3Npb247XG4gICAgICAgICAgICBwYXJzZUJpdHdpc2VPUkV4cHJlc3Npb24gPSBleHRyYS5wYXJzZUJpdHdpc2VPUkV4cHJlc3Npb247XG4gICAgICAgICAgICBwYXJzZUJpdHdpc2VYT1JFeHByZXNzaW9uID0gZXh0cmEucGFyc2VCaXR3aXNlWE9SRXhwcmVzc2lvbjtcbiAgICAgICAgICAgIHBhcnNlQmxvY2sgPSBleHRyYS5wYXJzZUJsb2NrO1xuICAgICAgICAgICAgcGFyc2VGdW5jdGlvblNvdXJjZUVsZW1lbnRzID0gZXh0cmEucGFyc2VGdW5jdGlvblNvdXJjZUVsZW1lbnRzO1xuICAgICAgICAgICAgcGFyc2VDYXRjaENsYXVzZSA9IGV4dHJhLnBhcnNlQ2F0Y2hDbGF1c2U7XG4gICAgICAgICAgICBwYXJzZUNvbXB1dGVkTWVtYmVyID0gZXh0cmEucGFyc2VDb21wdXRlZE1lbWJlcjtcbiAgICAgICAgICAgIHBhcnNlQ29uZGl0aW9uYWxFeHByZXNzaW9uID0gZXh0cmEucGFyc2VDb25kaXRpb25hbEV4cHJlc3Npb247XG4gICAgICAgICAgICBwYXJzZUNvbnN0TGV0RGVjbGFyYXRpb24gPSBleHRyYS5wYXJzZUNvbnN0TGV0RGVjbGFyYXRpb247XG4gICAgICAgICAgICBwYXJzZUVxdWFsaXR5RXhwcmVzc2lvbiA9IGV4dHJhLnBhcnNlRXF1YWxpdHlFeHByZXNzaW9uO1xuICAgICAgICAgICAgcGFyc2VFeHByZXNzaW9uID0gZXh0cmEucGFyc2VFeHByZXNzaW9uO1xuICAgICAgICAgICAgcGFyc2VGb3JWYXJpYWJsZURlY2xhcmF0aW9uID0gZXh0cmEucGFyc2VGb3JWYXJpYWJsZURlY2xhcmF0aW9uO1xuICAgICAgICAgICAgcGFyc2VGdW5jdGlvbkRlY2xhcmF0aW9uID0gZXh0cmEucGFyc2VGdW5jdGlvbkRlY2xhcmF0aW9uO1xuICAgICAgICAgICAgcGFyc2VGdW5jdGlvbkV4cHJlc3Npb24gPSBleHRyYS5wYXJzZUZ1bmN0aW9uRXhwcmVzc2lvbjtcbiAgICAgICAgICAgIHBhcnNlR3JvdXBFeHByZXNzaW9uID0gZXh0cmEucGFyc2VHcm91cEV4cHJlc3Npb247XG4gICAgICAgICAgICBwYXJzZUxlZnRIYW5kU2lkZUV4cHJlc3Npb24gPSBleHRyYS5wYXJzZUxlZnRIYW5kU2lkZUV4cHJlc3Npb247XG4gICAgICAgICAgICBwYXJzZUxlZnRIYW5kU2lkZUV4cHJlc3Npb25BbGxvd0NhbGwgPSBleHRyYS5wYXJzZUxlZnRIYW5kU2lkZUV4cHJlc3Npb25BbGxvd0NhbGw7XG4gICAgICAgICAgICBwYXJzZUxvZ2ljYWxBTkRFeHByZXNzaW9uID0gZXh0cmEucGFyc2VMb2dpY2FsQU5ERXhwcmVzc2lvbjtcbiAgICAgICAgICAgIHBhcnNlTG9naWNhbE9SRXhwcmVzc2lvbiA9IGV4dHJhLnBhcnNlTG9naWNhbE9SRXhwcmVzc2lvbjtcbiAgICAgICAgICAgIHBhcnNlTXVsdGlwbGljYXRpdmVFeHByZXNzaW9uID0gZXh0cmEucGFyc2VNdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb247XG4gICAgICAgICAgICBwYXJzZU5ld0V4cHJlc3Npb24gPSBleHRyYS5wYXJzZU5ld0V4cHJlc3Npb247XG4gICAgICAgICAgICBwYXJzZU5vbkNvbXB1dGVkUHJvcGVydHkgPSBleHRyYS5wYXJzZU5vbkNvbXB1dGVkUHJvcGVydHk7XG4gICAgICAgICAgICBwYXJzZU9iamVjdFByb3BlcnR5ID0gZXh0cmEucGFyc2VPYmplY3RQcm9wZXJ0eTtcbiAgICAgICAgICAgIHBhcnNlT2JqZWN0UHJvcGVydHlLZXkgPSBleHRyYS5wYXJzZU9iamVjdFByb3BlcnR5S2V5O1xuICAgICAgICAgICAgcGFyc2VQcmltYXJ5RXhwcmVzc2lvbiA9IGV4dHJhLnBhcnNlUHJpbWFyeUV4cHJlc3Npb247XG4gICAgICAgICAgICBwYXJzZVBvc3RmaXhFeHByZXNzaW9uID0gZXh0cmEucGFyc2VQb3N0Zml4RXhwcmVzc2lvbjtcbiAgICAgICAgICAgIHBhcnNlUHJvZ3JhbSA9IGV4dHJhLnBhcnNlUHJvZ3JhbTtcbiAgICAgICAgICAgIHBhcnNlUHJvcGVydHlGdW5jdGlvbiA9IGV4dHJhLnBhcnNlUHJvcGVydHlGdW5jdGlvbjtcbiAgICAgICAgICAgIHBhcnNlUmVsYXRpb25hbEV4cHJlc3Npb24gPSBleHRyYS5wYXJzZVJlbGF0aW9uYWxFeHByZXNzaW9uO1xuICAgICAgICAgICAgcGFyc2VTdGF0ZW1lbnQgPSBleHRyYS5wYXJzZVN0YXRlbWVudDtcbiAgICAgICAgICAgIHBhcnNlU2hpZnRFeHByZXNzaW9uID0gZXh0cmEucGFyc2VTaGlmdEV4cHJlc3Npb247XG4gICAgICAgICAgICBwYXJzZVN3aXRjaENhc2UgPSBleHRyYS5wYXJzZVN3aXRjaENhc2U7XG4gICAgICAgICAgICBwYXJzZVVuYXJ5RXhwcmVzc2lvbiA9IGV4dHJhLnBhcnNlVW5hcnlFeHByZXNzaW9uO1xuICAgICAgICAgICAgcGFyc2VWYXJpYWJsZURlY2xhcmF0aW9uID0gZXh0cmEucGFyc2VWYXJpYWJsZURlY2xhcmF0aW9uO1xuICAgICAgICAgICAgcGFyc2VWYXJpYWJsZUlkZW50aWZpZXIgPSBleHRyYS5wYXJzZVZhcmlhYmxlSWRlbnRpZmllcjtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0eXBlb2YgZXh0cmEuc2NhblJlZ0V4cCA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgYWR2YW5jZSA9IGV4dHJhLmFkdmFuY2U7XG4gICAgICAgICAgICBzY2FuUmVnRXhwID0gZXh0cmEuc2NhblJlZ0V4cDtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIHN0cmluZ1RvQXJyYXkoc3RyKSB7XG4gICAgICAgIHZhciBsZW5ndGggPSBzdHIubGVuZ3RoLFxuICAgICAgICAgICAgcmVzdWx0ID0gW10sXG4gICAgICAgICAgICBpO1xuICAgICAgICBmb3IgKGkgPSAwOyBpIDwgbGVuZ3RoOyArK2kpIHtcbiAgICAgICAgICAgIHJlc3VsdFtpXSA9IHN0ci5jaGFyQXQoaSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBwYXJzZShjb2RlLCBvcHRpb25zKSB7XG4gICAgICAgIHZhciBwcm9ncmFtLCB0b1N0cmluZztcblxuICAgICAgICB0b1N0cmluZyA9IFN0cmluZztcbiAgICAgICAgaWYgKHR5cGVvZiBjb2RlICE9PSAnc3RyaW5nJyAmJiAhKGNvZGUgaW5zdGFuY2VvZiBTdHJpbmcpKSB7XG4gICAgICAgICAgICBjb2RlID0gdG9TdHJpbmcoY29kZSk7XG4gICAgICAgIH1cblxuICAgICAgICBzb3VyY2UgPSBjb2RlO1xuICAgICAgICBpbmRleCA9IDA7XG4gICAgICAgIGxpbmVOdW1iZXIgPSAoc291cmNlLmxlbmd0aCA+IDApID8gMSA6IDA7XG4gICAgICAgIGxpbmVTdGFydCA9IDA7XG4gICAgICAgIGxlbmd0aCA9IHNvdXJjZS5sZW5ndGg7XG4gICAgICAgIGJ1ZmZlciA9IG51bGw7XG4gICAgICAgIHN0YXRlID0ge1xuICAgICAgICAgICAgYWxsb3dJbjogdHJ1ZSxcbiAgICAgICAgICAgIGxhYmVsU2V0OiB7fSxcbiAgICAgICAgICAgIGluRnVuY3Rpb25Cb2R5OiBmYWxzZSxcbiAgICAgICAgICAgIGluSXRlcmF0aW9uOiBmYWxzZSxcbiAgICAgICAgICAgIGluU3dpdGNoOiBmYWxzZVxuICAgICAgICB9O1xuXG4gICAgICAgIGV4dHJhID0ge307XG4gICAgICAgIGlmICh0eXBlb2Ygb3B0aW9ucyAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIGV4dHJhLnJhbmdlID0gKHR5cGVvZiBvcHRpb25zLnJhbmdlID09PSAnYm9vbGVhbicpICYmIG9wdGlvbnMucmFuZ2U7XG4gICAgICAgICAgICBleHRyYS5sb2MgPSAodHlwZW9mIG9wdGlvbnMubG9jID09PSAnYm9vbGVhbicpICYmIG9wdGlvbnMubG9jO1xuICAgICAgICAgICAgZXh0cmEucmF3ID0gKHR5cGVvZiBvcHRpb25zLnJhdyA9PT0gJ2Jvb2xlYW4nKSAmJiBvcHRpb25zLnJhdztcbiAgICAgICAgICAgIGlmICh0eXBlb2Ygb3B0aW9ucy50b2tlbnMgPT09ICdib29sZWFuJyAmJiBvcHRpb25zLnRva2Vucykge1xuICAgICAgICAgICAgICAgIGV4dHJhLnRva2VucyA9IFtdO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHR5cGVvZiBvcHRpb25zLmNvbW1lbnQgPT09ICdib29sZWFuJyAmJiBvcHRpb25zLmNvbW1lbnQpIHtcbiAgICAgICAgICAgICAgICBleHRyYS5jb21tZW50cyA9IFtdO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHR5cGVvZiBvcHRpb25zLnRvbGVyYW50ID09PSAnYm9vbGVhbicgJiYgb3B0aW9ucy50b2xlcmFudCkge1xuICAgICAgICAgICAgICAgIGV4dHJhLmVycm9ycyA9IFtdO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGlmICh0eXBlb2Ygc291cmNlWzBdID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgICAgIC8vIFRyeSBmaXJzdCB0byBjb252ZXJ0IHRvIGEgc3RyaW5nLiBUaGlzIGlzIGdvb2QgYXMgZmFzdCBwYXRoXG4gICAgICAgICAgICAgICAgLy8gZm9yIG9sZCBJRSB3aGljaCB1bmRlcnN0YW5kcyBzdHJpbmcgaW5kZXhpbmcgZm9yIHN0cmluZ1xuICAgICAgICAgICAgICAgIC8vIGxpdGVyYWxzIG9ubHkgYW5kIG5vdCBmb3Igc3RyaW5nIG9iamVjdC5cbiAgICAgICAgICAgICAgICBpZiAoY29kZSBpbnN0YW5jZW9mIFN0cmluZykge1xuICAgICAgICAgICAgICAgICAgICBzb3VyY2UgPSBjb2RlLnZhbHVlT2YoKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAvLyBGb3JjZSBhY2Nlc3NpbmcgdGhlIGNoYXJhY3RlcnMgdmlhIGFuIGFycmF5LlxuICAgICAgICAgICAgICAgIGlmICh0eXBlb2Ygc291cmNlWzBdID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgICAgICAgICBzb3VyY2UgPSBzdHJpbmdUb0FycmF5KGNvZGUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHBhdGNoKCk7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBwcm9ncmFtID0gcGFyc2VQcm9ncmFtKCk7XG4gICAgICAgICAgICBpZiAodHlwZW9mIGV4dHJhLmNvbW1lbnRzICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgICAgIGZpbHRlckNvbW1lbnRMb2NhdGlvbigpO1xuICAgICAgICAgICAgICAgIHByb2dyYW0uY29tbWVudHMgPSBleHRyYS5jb21tZW50cztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh0eXBlb2YgZXh0cmEudG9rZW5zICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgICAgIGZpbHRlclRva2VuTG9jYXRpb24oKTtcbiAgICAgICAgICAgICAgICBwcm9ncmFtLnRva2VucyA9IGV4dHJhLnRva2VucztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh0eXBlb2YgZXh0cmEuZXJyb3JzICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgICAgIHByb2dyYW0uZXJyb3JzID0gZXh0cmEuZXJyb3JzO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGV4dHJhLnJhbmdlIHx8IGV4dHJhLmxvYykge1xuICAgICAgICAgICAgICAgIHByb2dyYW0uYm9keSA9IGZpbHRlckdyb3VwKHByb2dyYW0uYm9keSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgIHRocm93IGU7XG4gICAgICAgIH0gZmluYWxseSB7XG4gICAgICAgICAgICB1bnBhdGNoKCk7XG4gICAgICAgICAgICBleHRyYSA9IHt9O1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHByb2dyYW07XG4gICAgfVxuXG4gICAgLy8gU3luYyB3aXRoIHBhY2thZ2UuanNvbi5cbiAgICBleHBvcnRzLnZlcnNpb24gPSAnMS4wLjMnO1xuXG4gICAgZXhwb3J0cy5wYXJzZSA9IHBhcnNlO1xuXG4gICAgLy8gRGVlcCBjb3B5LlxuICAgIGV4cG9ydHMuU3ludGF4ID0gKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIG5hbWUsIHR5cGVzID0ge307XG5cbiAgICAgICAgaWYgKHR5cGVvZiBPYmplY3QuY3JlYXRlID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICB0eXBlcyA9IE9iamVjdC5jcmVhdGUobnVsbCk7XG4gICAgICAgIH1cblxuICAgICAgICBmb3IgKG5hbWUgaW4gU3ludGF4KSB7XG4gICAgICAgICAgICBpZiAoU3ludGF4Lmhhc093blByb3BlcnR5KG5hbWUpKSB7XG4gICAgICAgICAgICAgICAgdHlwZXNbbmFtZV0gPSBTeW50YXhbbmFtZV07XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodHlwZW9mIE9iamVjdC5mcmVlemUgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIE9iamVjdC5mcmVlemUodHlwZXMpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHR5cGVzO1xuICAgIH0oKSk7XG5cbn0pKTtcbi8qIHZpbTogc2V0IHN3PTQgdHM9NCBldCB0dz04MCA6ICovXG4iLCIvKlxuICBDb3B5cmlnaHQgKEMpIDIwMTIgWXVzdWtlIFN1enVraSA8dXRhdGFuZS50ZWFAZ21haWwuY29tPlxuICBDb3B5cmlnaHQgKEMpIDIwMTIgQXJpeWEgSGlkYXlhdCA8YXJpeWEuaGlkYXlhdEBnbWFpbC5jb20+XG5cbiAgUmVkaXN0cmlidXRpb24gYW5kIHVzZSBpbiBzb3VyY2UgYW5kIGJpbmFyeSBmb3Jtcywgd2l0aCBvciB3aXRob3V0XG4gIG1vZGlmaWNhdGlvbiwgYXJlIHBlcm1pdHRlZCBwcm92aWRlZCB0aGF0IHRoZSBmb2xsb3dpbmcgY29uZGl0aW9ucyBhcmUgbWV0OlxuXG4gICAgKiBSZWRpc3RyaWJ1dGlvbnMgb2Ygc291cmNlIGNvZGUgbXVzdCByZXRhaW4gdGhlIGFib3ZlIGNvcHlyaWdodFxuICAgICAgbm90aWNlLCB0aGlzIGxpc3Qgb2YgY29uZGl0aW9ucyBhbmQgdGhlIGZvbGxvd2luZyBkaXNjbGFpbWVyLlxuICAgICogUmVkaXN0cmlidXRpb25zIGluIGJpbmFyeSBmb3JtIG11c3QgcmVwcm9kdWNlIHRoZSBhYm92ZSBjb3B5cmlnaHRcbiAgICAgIG5vdGljZSwgdGhpcyBsaXN0IG9mIGNvbmRpdGlvbnMgYW5kIHRoZSBmb2xsb3dpbmcgZGlzY2xhaW1lciBpbiB0aGVcbiAgICAgIGRvY3VtZW50YXRpb24gYW5kL29yIG90aGVyIG1hdGVyaWFscyBwcm92aWRlZCB3aXRoIHRoZSBkaXN0cmlidXRpb24uXG5cbiAgVEhJUyBTT0ZUV0FSRSBJUyBQUk9WSURFRCBCWSBUSEUgQ09QWVJJR0hUIEhPTERFUlMgQU5EIENPTlRSSUJVVE9SUyBcIkFTIElTXCJcbiAgQU5EIEFOWSBFWFBSRVNTIE9SIElNUExJRUQgV0FSUkFOVElFUywgSU5DTFVESU5HLCBCVVQgTk9UIExJTUlURUQgVE8sIFRIRVxuICBJTVBMSUVEIFdBUlJBTlRJRVMgT0YgTUVSQ0hBTlRBQklMSVRZIEFORCBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRVxuICBBUkUgRElTQ0xBSU1FRC4gSU4gTk8gRVZFTlQgU0hBTEwgPENPUFlSSUdIVCBIT0xERVI+IEJFIExJQUJMRSBGT1IgQU5ZXG4gIERJUkVDVCwgSU5ESVJFQ1QsIElOQ0lERU5UQUwsIFNQRUNJQUwsIEVYRU1QTEFSWSwgT1IgQ09OU0VRVUVOVElBTCBEQU1BR0VTXG4gIChJTkNMVURJTkcsIEJVVCBOT1QgTElNSVRFRCBUTywgUFJPQ1VSRU1FTlQgT0YgU1VCU1RJVFVURSBHT09EUyBPUiBTRVJWSUNFUztcbiAgTE9TUyBPRiBVU0UsIERBVEEsIE9SIFBST0ZJVFM7IE9SIEJVU0lORVNTIElOVEVSUlVQVElPTikgSE9XRVZFUiBDQVVTRUQgQU5EXG4gIE9OIEFOWSBUSEVPUlkgT0YgTElBQklMSVRZLCBXSEVUSEVSIElOIENPTlRSQUNULCBTVFJJQ1QgTElBQklMSVRZLCBPUiBUT1JUXG4gIChJTkNMVURJTkcgTkVHTElHRU5DRSBPUiBPVEhFUldJU0UpIEFSSVNJTkcgSU4gQU5ZIFdBWSBPVVQgT0YgVEhFIFVTRSBPRlxuICBUSElTIFNPRlRXQVJFLCBFVkVOIElGIEFEVklTRUQgT0YgVEhFIFBPU1NJQklMSVRZIE9GIFNVQ0ggREFNQUdFLlxuKi9cblxuLypqc2xpbnQgYml0d2lzZTp0cnVlICovXG4vKmdsb2JhbCBleHBvcnRzOnRydWUsIGRlZmluZTp0cnVlLCB3aW5kb3c6dHJ1ZSAqL1xuKGZ1bmN0aW9uIChmYWN0b3J5KSB7XG4gICAgJ3VzZSBzdHJpY3QnO1xuXG4gICAgLy8gVW5pdmVyc2FsIE1vZHVsZSBEZWZpbml0aW9uIChVTUQpIHRvIHN1cHBvcnQgQU1ELCBDb21tb25KUy9Ob2RlLmpzLFxuICAgIC8vIGFuZCBwbGFpbiBicm93c2VyIGxvYWRpbmcsXG4gICAgaWYgKHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCkge1xuICAgICAgICBkZWZpbmUoWydleHBvcnRzJ10sIGZhY3RvcnkpO1xuICAgIH0gZWxzZSBpZiAodHlwZW9mIGV4cG9ydHMgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgIGZhY3RvcnkoZXhwb3J0cyk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgZmFjdG9yeSgod2luZG93LmVzdHJhdmVyc2UgPSB7fSkpO1xuICAgIH1cbn0oZnVuY3Rpb24gKGV4cG9ydHMpIHtcbiAgICAndXNlIHN0cmljdCc7XG5cbiAgICB2YXIgU3ludGF4LFxuICAgICAgICBpc0FycmF5LFxuICAgICAgICBWaXNpdG9yT3B0aW9uLFxuICAgICAgICBWaXNpdG9yS2V5cyxcbiAgICAgICAgd3JhcHBlcnM7XG5cbiAgICBTeW50YXggPSB7XG4gICAgICAgIEFzc2lnbm1lbnRFeHByZXNzaW9uOiAnQXNzaWdubWVudEV4cHJlc3Npb24nLFxuICAgICAgICBBcnJheUV4cHJlc3Npb246ICdBcnJheUV4cHJlc3Npb24nLFxuICAgICAgICBCbG9ja1N0YXRlbWVudDogJ0Jsb2NrU3RhdGVtZW50JyxcbiAgICAgICAgQmluYXJ5RXhwcmVzc2lvbjogJ0JpbmFyeUV4cHJlc3Npb24nLFxuICAgICAgICBCcmVha1N0YXRlbWVudDogJ0JyZWFrU3RhdGVtZW50JyxcbiAgICAgICAgQ2FsbEV4cHJlc3Npb246ICdDYWxsRXhwcmVzc2lvbicsXG4gICAgICAgIENhdGNoQ2xhdXNlOiAnQ2F0Y2hDbGF1c2UnLFxuICAgICAgICBDb25kaXRpb25hbEV4cHJlc3Npb246ICdDb25kaXRpb25hbEV4cHJlc3Npb24nLFxuICAgICAgICBDb250aW51ZVN0YXRlbWVudDogJ0NvbnRpbnVlU3RhdGVtZW50JyxcbiAgICAgICAgRGVidWdnZXJTdGF0ZW1lbnQ6ICdEZWJ1Z2dlclN0YXRlbWVudCcsXG4gICAgICAgIERpcmVjdGl2ZVN0YXRlbWVudDogJ0RpcmVjdGl2ZVN0YXRlbWVudCcsXG4gICAgICAgIERvV2hpbGVTdGF0ZW1lbnQ6ICdEb1doaWxlU3RhdGVtZW50JyxcbiAgICAgICAgRW1wdHlTdGF0ZW1lbnQ6ICdFbXB0eVN0YXRlbWVudCcsXG4gICAgICAgIEV4cHJlc3Npb25TdGF0ZW1lbnQ6ICdFeHByZXNzaW9uU3RhdGVtZW50JyxcbiAgICAgICAgRm9yU3RhdGVtZW50OiAnRm9yU3RhdGVtZW50JyxcbiAgICAgICAgRm9ySW5TdGF0ZW1lbnQ6ICdGb3JJblN0YXRlbWVudCcsXG4gICAgICAgIEZ1bmN0aW9uRGVjbGFyYXRpb246ICdGdW5jdGlvbkRlY2xhcmF0aW9uJyxcbiAgICAgICAgRnVuY3Rpb25FeHByZXNzaW9uOiAnRnVuY3Rpb25FeHByZXNzaW9uJyxcbiAgICAgICAgSWRlbnRpZmllcjogJ0lkZW50aWZpZXInLFxuICAgICAgICBJZlN0YXRlbWVudDogJ0lmU3RhdGVtZW50JyxcbiAgICAgICAgTGl0ZXJhbDogJ0xpdGVyYWwnLFxuICAgICAgICBMYWJlbGVkU3RhdGVtZW50OiAnTGFiZWxlZFN0YXRlbWVudCcsXG4gICAgICAgIExvZ2ljYWxFeHByZXNzaW9uOiAnTG9naWNhbEV4cHJlc3Npb24nLFxuICAgICAgICBNZW1iZXJFeHByZXNzaW9uOiAnTWVtYmVyRXhwcmVzc2lvbicsXG4gICAgICAgIE5ld0V4cHJlc3Npb246ICdOZXdFeHByZXNzaW9uJyxcbiAgICAgICAgT2JqZWN0RXhwcmVzc2lvbjogJ09iamVjdEV4cHJlc3Npb24nLFxuICAgICAgICBQcm9ncmFtOiAnUHJvZ3JhbScsXG4gICAgICAgIFByb3BlcnR5OiAnUHJvcGVydHknLFxuICAgICAgICBSZXR1cm5TdGF0ZW1lbnQ6ICdSZXR1cm5TdGF0ZW1lbnQnLFxuICAgICAgICBTZXF1ZW5jZUV4cHJlc3Npb246ICdTZXF1ZW5jZUV4cHJlc3Npb24nLFxuICAgICAgICBTd2l0Y2hTdGF0ZW1lbnQ6ICdTd2l0Y2hTdGF0ZW1lbnQnLFxuICAgICAgICBTd2l0Y2hDYXNlOiAnU3dpdGNoQ2FzZScsXG4gICAgICAgIFRoaXNFeHByZXNzaW9uOiAnVGhpc0V4cHJlc3Npb24nLFxuICAgICAgICBUaHJvd1N0YXRlbWVudDogJ1Rocm93U3RhdGVtZW50JyxcbiAgICAgICAgVHJ5U3RhdGVtZW50OiAnVHJ5U3RhdGVtZW50JyxcbiAgICAgICAgVW5hcnlFeHByZXNzaW9uOiAnVW5hcnlFeHByZXNzaW9uJyxcbiAgICAgICAgVXBkYXRlRXhwcmVzc2lvbjogJ1VwZGF0ZUV4cHJlc3Npb24nLFxuICAgICAgICBWYXJpYWJsZURlY2xhcmF0aW9uOiAnVmFyaWFibGVEZWNsYXJhdGlvbicsXG4gICAgICAgIFZhcmlhYmxlRGVjbGFyYXRvcjogJ1ZhcmlhYmxlRGVjbGFyYXRvcicsXG4gICAgICAgIFdoaWxlU3RhdGVtZW50OiAnV2hpbGVTdGF0ZW1lbnQnLFxuICAgICAgICBXaXRoU3RhdGVtZW50OiAnV2l0aFN0YXRlbWVudCdcbiAgICB9O1xuXG4gICAgaXNBcnJheSA9IEFycmF5LmlzQXJyYXk7XG4gICAgaWYgKCFpc0FycmF5KSB7XG4gICAgICAgIGlzQXJyYXkgPSBmdW5jdGlvbiBpc0FycmF5KGFycmF5KSB7XG4gICAgICAgICAgICByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKGFycmF5KSA9PT0gJ1tvYmplY3QgQXJyYXldJztcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICBWaXNpdG9yS2V5cyA9IHtcbiAgICAgICAgQXNzaWdubWVudEV4cHJlc3Npb246IFsnbGVmdCcsICdyaWdodCddLFxuICAgICAgICBBcnJheUV4cHJlc3Npb246IFsnZWxlbWVudHMnXSxcbiAgICAgICAgQmxvY2tTdGF0ZW1lbnQ6IFsnYm9keSddLFxuICAgICAgICBCaW5hcnlFeHByZXNzaW9uOiBbJ2xlZnQnLCAncmlnaHQnXSxcbiAgICAgICAgQnJlYWtTdGF0ZW1lbnQ6IFsnbGFiZWwnXSxcbiAgICAgICAgQ2FsbEV4cHJlc3Npb246IFsnY2FsbGVlJywgJ2FyZ3VtZW50cyddLFxuICAgICAgICBDYXRjaENsYXVzZTogWydwYXJhbScsICdib2R5J10sXG4gICAgICAgIENvbmRpdGlvbmFsRXhwcmVzc2lvbjogWyd0ZXN0JywgJ2NvbnNlcXVlbnQnLCAnYWx0ZXJuYXRlJ10sXG4gICAgICAgIENvbnRpbnVlU3RhdGVtZW50OiBbJ2xhYmVsJ10sXG4gICAgICAgIERlYnVnZ2VyU3RhdGVtZW50OiBbXSxcbiAgICAgICAgRGlyZWN0aXZlU3RhdGVtZW50OiBbXSxcbiAgICAgICAgRG9XaGlsZVN0YXRlbWVudDogWydib2R5JywgJ3Rlc3QnXSxcbiAgICAgICAgRW1wdHlTdGF0ZW1lbnQ6IFtdLFxuICAgICAgICBFeHByZXNzaW9uU3RhdGVtZW50OiBbJ2V4cHJlc3Npb24nXSxcbiAgICAgICAgRm9yU3RhdGVtZW50OiBbJ2luaXQnLCAndGVzdCcsICd1cGRhdGUnLCAnYm9keSddLFxuICAgICAgICBGb3JJblN0YXRlbWVudDogWydsZWZ0JywgJ3JpZ2h0JywgJ2JvZHknXSxcbiAgICAgICAgRnVuY3Rpb25EZWNsYXJhdGlvbjogWydpZCcsICdwYXJhbXMnLCAnYm9keSddLFxuICAgICAgICBGdW5jdGlvbkV4cHJlc3Npb246IFsnaWQnLCAncGFyYW1zJywgJ2JvZHknXSxcbiAgICAgICAgSWRlbnRpZmllcjogW10sXG4gICAgICAgIElmU3RhdGVtZW50OiBbJ3Rlc3QnLCAnY29uc2VxdWVudCcsICdhbHRlcm5hdGUnXSxcbiAgICAgICAgTGl0ZXJhbDogW10sXG4gICAgICAgIExhYmVsZWRTdGF0ZW1lbnQ6IFsnbGFiZWwnLCAnYm9keSddLFxuICAgICAgICBMb2dpY2FsRXhwcmVzc2lvbjogWydsZWZ0JywgJ3JpZ2h0J10sXG4gICAgICAgIE1lbWJlckV4cHJlc3Npb246IFsnb2JqZWN0JywgJ3Byb3BlcnR5J10sXG4gICAgICAgIE5ld0V4cHJlc3Npb246IFsnY2FsbGVlJywgJ2FyZ3VtZW50cyddLFxuICAgICAgICBPYmplY3RFeHByZXNzaW9uOiBbJ3Byb3BlcnRpZXMnXSxcbiAgICAgICAgUHJvZ3JhbTogWydib2R5J10sXG4gICAgICAgIFByb3BlcnR5OiBbJ2tleScsICd2YWx1ZSddLFxuICAgICAgICBSZXR1cm5TdGF0ZW1lbnQ6IFsnYXJndW1lbnQnXSxcbiAgICAgICAgU2VxdWVuY2VFeHByZXNzaW9uOiBbJ2V4cHJlc3Npb25zJ10sXG4gICAgICAgIFN3aXRjaFN0YXRlbWVudDogWydkaXNjcmltaW5hbnQnLCAnY2FzZXMnXSxcbiAgICAgICAgU3dpdGNoQ2FzZTogWyd0ZXN0JywgJ2NvbnNlcXVlbnQnXSxcbiAgICAgICAgVGhpc0V4cHJlc3Npb246IFtdLFxuICAgICAgICBUaHJvd1N0YXRlbWVudDogWydhcmd1bWVudCddLFxuICAgICAgICBUcnlTdGF0ZW1lbnQ6IFsnYmxvY2snLCAnaGFuZGxlcnMnLCAnZmluYWxpemVyJ10sXG4gICAgICAgIFVuYXJ5RXhwcmVzc2lvbjogWydhcmd1bWVudCddLFxuICAgICAgICBVcGRhdGVFeHByZXNzaW9uOiBbJ2FyZ3VtZW50J10sXG4gICAgICAgIFZhcmlhYmxlRGVjbGFyYXRpb246IFsnZGVjbGFyYXRpb25zJ10sXG4gICAgICAgIFZhcmlhYmxlRGVjbGFyYXRvcjogWydpZCcsICdpbml0J10sXG4gICAgICAgIFdoaWxlU3RhdGVtZW50OiBbJ3Rlc3QnLCAnYm9keSddLFxuICAgICAgICBXaXRoU3RhdGVtZW50OiBbJ29iamVjdCcsICdib2R5J11cbiAgICB9O1xuXG4gICAgVmlzaXRvck9wdGlvbiA9IHtcbiAgICAgICAgQnJlYWs6IDEsXG4gICAgICAgIFNraXA6IDJcbiAgICB9O1xuXG4gICAgd3JhcHBlcnMgPSB7XG4gICAgICAgIFByb3BlcnR5V3JhcHBlcjogJ1Byb3BlcnR5J1xuICAgIH07XG5cbiAgICBmdW5jdGlvbiB0cmF2ZXJzZSh0b3AsIHZpc2l0b3IpIHtcbiAgICAgICAgdmFyIHdvcmtsaXN0LCBsZWF2ZWxpc3QsIG5vZGUsIG5vZGVUeXBlLCByZXQsIGN1cnJlbnQsIGN1cnJlbnQyLCBjYW5kaWRhdGVzLCBjYW5kaWRhdGUsIG1hcmtlciA9IHt9O1xuXG4gICAgICAgIHdvcmtsaXN0ID0gWyB0b3AgXTtcbiAgICAgICAgbGVhdmVsaXN0ID0gWyBudWxsIF07XG5cbiAgICAgICAgd2hpbGUgKHdvcmtsaXN0Lmxlbmd0aCkge1xuICAgICAgICAgICAgbm9kZSA9IHdvcmtsaXN0LnBvcCgpO1xuICAgICAgICAgICAgbm9kZVR5cGUgPSBub2RlLnR5cGU7XG5cbiAgICAgICAgICAgIGlmIChub2RlID09PSBtYXJrZXIpIHtcbiAgICAgICAgICAgICAgICBub2RlID0gbGVhdmVsaXN0LnBvcCgpO1xuICAgICAgICAgICAgICAgIGlmICh2aXNpdG9yLmxlYXZlKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldCA9IHZpc2l0b3IubGVhdmUobm9kZSwgbGVhdmVsaXN0W2xlYXZlbGlzdC5sZW5ndGggLSAxXSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0ID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAocmV0ID09PSBWaXNpdG9yT3B0aW9uLkJyZWFrKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2UgaWYgKG5vZGUpIHtcbiAgICAgICAgICAgICAgICBpZiAod3JhcHBlcnMuaGFzT3duUHJvcGVydHkobm9kZVR5cGUpKSB7XG4gICAgICAgICAgICAgICAgICAgIG5vZGUgPSBub2RlLm5vZGU7XG4gICAgICAgICAgICAgICAgICAgIG5vZGVUeXBlID0gd3JhcHBlcnNbbm9kZVR5cGVdO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGlmICh2aXNpdG9yLmVudGVyKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldCA9IHZpc2l0b3IuZW50ZXIobm9kZSwgbGVhdmVsaXN0W2xlYXZlbGlzdC5sZW5ndGggLSAxXSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0ID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGlmIChyZXQgPT09IFZpc2l0b3JPcHRpb24uQnJlYWspIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHdvcmtsaXN0LnB1c2gobWFya2VyKTtcbiAgICAgICAgICAgICAgICBsZWF2ZWxpc3QucHVzaChub2RlKTtcblxuICAgICAgICAgICAgICAgIGlmIChyZXQgIT09IFZpc2l0b3JPcHRpb24uU2tpcCkge1xuICAgICAgICAgICAgICAgICAgICBjYW5kaWRhdGVzID0gVmlzaXRvcktleXNbbm9kZVR5cGVdO1xuICAgICAgICAgICAgICAgICAgICBjdXJyZW50ID0gY2FuZGlkYXRlcy5sZW5ndGg7XG4gICAgICAgICAgICAgICAgICAgIHdoaWxlICgoY3VycmVudCAtPSAxKSA+PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjYW5kaWRhdGUgPSBub2RlW2NhbmRpZGF0ZXNbY3VycmVudF1dO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGNhbmRpZGF0ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpc0FycmF5KGNhbmRpZGF0ZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY3VycmVudDIgPSBjYW5kaWRhdGUubGVuZ3RoO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB3aGlsZSAoKGN1cnJlbnQyIC09IDEpID49IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjYW5kaWRhdGVbY3VycmVudDJdKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYobm9kZVR5cGUgPT09IFN5bnRheC5PYmplY3RFeHByZXNzaW9uICYmICdwcm9wZXJ0aWVzJyA9PT0gY2FuZGlkYXRlc1tjdXJyZW50XSAmJiBudWxsID09IGNhbmRpZGF0ZXNbY3VycmVudF0udHlwZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB3b3JrbGlzdC5wdXNoKHt0eXBlOiAnUHJvcGVydHlXcmFwcGVyJywgbm9kZTogY2FuZGlkYXRlW2N1cnJlbnQyXX0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdvcmtsaXN0LnB1c2goY2FuZGlkYXRlW2N1cnJlbnQyXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgd29ya2xpc3QucHVzaChjYW5kaWRhdGUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIHJlcGxhY2UodG9wLCB2aXNpdG9yKSB7XG4gICAgICAgIHZhciB3b3JrbGlzdCwgbGVhdmVsaXN0LCBub2RlLCBub2RlVHlwZSwgdGFyZ2V0LCB0dXBsZSwgcmV0LCBjdXJyZW50LCBjdXJyZW50MiwgY2FuZGlkYXRlcywgY2FuZGlkYXRlLCBtYXJrZXIgPSB7fSwgcmVzdWx0O1xuXG4gICAgICAgIHJlc3VsdCA9IHtcbiAgICAgICAgICAgIHRvcDogdG9wXG4gICAgICAgIH07XG5cbiAgICAgICAgdHVwbGUgPSBbIHRvcCwgcmVzdWx0LCAndG9wJyBdO1xuICAgICAgICB3b3JrbGlzdCA9IFsgdHVwbGUgXTtcbiAgICAgICAgbGVhdmVsaXN0ID0gWyB0dXBsZSBdO1xuXG4gICAgICAgIGZ1bmN0aW9uIG5vdGlmeSh2KSB7XG4gICAgICAgICAgICByZXQgPSB2O1xuICAgICAgICB9XG5cbiAgICAgICAgd2hpbGUgKHdvcmtsaXN0Lmxlbmd0aCkge1xuICAgICAgICAgICAgdHVwbGUgPSB3b3JrbGlzdC5wb3AoKTtcblxuICAgICAgICAgICAgaWYgKHR1cGxlID09PSBtYXJrZXIpIHtcbiAgICAgICAgICAgICAgICB0dXBsZSA9IGxlYXZlbGlzdC5wb3AoKTtcbiAgICAgICAgICAgICAgICByZXQgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICAgICAgaWYgKHZpc2l0b3IubGVhdmUpIHtcbiAgICAgICAgICAgICAgICAgICAgbm9kZSA9IHR1cGxlWzBdO1xuICAgICAgICAgICAgICAgICAgICB0YXJnZXQgPSB2aXNpdG9yLmxlYXZlKHR1cGxlWzBdLCBsZWF2ZWxpc3RbbGVhdmVsaXN0Lmxlbmd0aCAtIDFdWzBdLCBub3RpZnkpO1xuICAgICAgICAgICAgICAgICAgICBpZiAodGFyZ2V0ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG5vZGUgPSB0YXJnZXQ7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgdHVwbGVbMV1bdHVwbGVbMl1dID0gbm9kZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKHJldCA9PT0gVmlzaXRvck9wdGlvbi5CcmVhaykge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcmVzdWx0LnRvcDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHR1cGxlWzBdKSB7XG4gICAgICAgICAgICAgICAgcmV0ID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgICAgIG5vZGUgPSB0dXBsZVswXTtcblxuICAgICAgICAgICAgICAgIG5vZGVUeXBlID0gbm9kZS50eXBlO1xuICAgICAgICAgICAgICAgIGlmICh3cmFwcGVycy5oYXNPd25Qcm9wZXJ0eShub2RlVHlwZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgdHVwbGVbMF0gPSBub2RlID0gbm9kZS5ub2RlO1xuICAgICAgICAgICAgICAgICAgICBub2RlVHlwZSA9IHdyYXBwZXJzW25vZGVUeXBlXTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBpZiAodmlzaXRvci5lbnRlcikge1xuICAgICAgICAgICAgICAgICAgICB0YXJnZXQgPSB2aXNpdG9yLmVudGVyKHR1cGxlWzBdLCBsZWF2ZWxpc3RbbGVhdmVsaXN0Lmxlbmd0aCAtIDFdWzBdLCBub3RpZnkpO1xuICAgICAgICAgICAgICAgICAgICBpZiAodGFyZ2V0ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG5vZGUgPSB0YXJnZXQ7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgdHVwbGVbMV1bdHVwbGVbMl1dID0gbm9kZTtcbiAgICAgICAgICAgICAgICAgICAgdHVwbGVbMF0gPSBub2RlO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGlmIChyZXQgPT09IFZpc2l0b3JPcHRpb24uQnJlYWspIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJlc3VsdC50b3A7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaWYgKHR1cGxlWzBdKSB7XG4gICAgICAgICAgICAgICAgICAgIHdvcmtsaXN0LnB1c2gobWFya2VyKTtcbiAgICAgICAgICAgICAgICAgICAgbGVhdmVsaXN0LnB1c2godHVwbGUpO1xuXG4gICAgICAgICAgICAgICAgICAgIGlmIChyZXQgIT09IFZpc2l0b3JPcHRpb24uU2tpcCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY2FuZGlkYXRlcyA9IFZpc2l0b3JLZXlzW25vZGVUeXBlXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGN1cnJlbnQgPSBjYW5kaWRhdGVzLmxlbmd0aDtcbiAgICAgICAgICAgICAgICAgICAgICAgIHdoaWxlICgoY3VycmVudCAtPSAxKSA+PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FuZGlkYXRlID0gbm9kZVtjYW5kaWRhdGVzW2N1cnJlbnRdXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoY2FuZGlkYXRlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpc0FycmF5KGNhbmRpZGF0ZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGN1cnJlbnQyID0gY2FuZGlkYXRlLmxlbmd0aDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdoaWxlICgoY3VycmVudDIgLT0gMSkgPj0gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjYW5kaWRhdGVbY3VycmVudDJdKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmKG5vZGVUeXBlID09PSBTeW50YXguT2JqZWN0RXhwcmVzc2lvbiAmJiAncHJvcGVydGllcycgPT09IGNhbmRpZGF0ZXNbY3VycmVudF0gJiYgbnVsbCA9PSBjYW5kaWRhdGVzW2N1cnJlbnRdLnR5cGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdvcmtsaXN0LnB1c2goW3t0eXBlOiAnUHJvcGVydHlXcmFwcGVyJywgbm9kZTogY2FuZGlkYXRlW2N1cnJlbnQyXX0sIGNhbmRpZGF0ZSwgY3VycmVudDJdKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdvcmtsaXN0LnB1c2goW2NhbmRpZGF0ZVtjdXJyZW50Ml0sIGNhbmRpZGF0ZSwgY3VycmVudDJdKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdvcmtsaXN0LnB1c2goW2NhbmRpZGF0ZSwgbm9kZSwgY2FuZGlkYXRlc1tjdXJyZW50XV0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHJlc3VsdC50b3A7XG4gICAgfVxuXG4gICAgZXhwb3J0cy52ZXJzaW9uID0gJzAuMC40JztcbiAgICBleHBvcnRzLlN5bnRheCA9IFN5bnRheDtcbiAgICBleHBvcnRzLnRyYXZlcnNlID0gdHJhdmVyc2U7XG4gICAgZXhwb3J0cy5yZXBsYWNlID0gcmVwbGFjZTtcbiAgICBleHBvcnRzLlZpc2l0b3JLZXlzID0gVmlzaXRvcktleXM7XG4gICAgZXhwb3J0cy5WaXNpdG9yT3B0aW9uID0gVmlzaXRvck9wdGlvbjtcbn0pKTtcbi8qIHZpbTogc2V0IHN3PTQgdHM9NCBldCB0dz04MCA6ICovXG4iLCIoZnVuY3Rpb24gKG5zKSB7XG5cbiAgICB2YXIgd2FsayA9IHJlcXVpcmUoJ2VzdHJhdmVyc2UnKSxcbiAgICAgICAgQ29udGV4dCA9IHJlcXVpcmUoXCIuLy4uL2Jhc2UvY29udGV4dC5qc1wiKS5nZXRDb250ZXh0KG51bGwpLFxuICAgICAgICBTeW50YXggPSB3YWxrLlN5bnRheDtcblxuICAgIHZhciBmaW5kUGFyYW1ldGVyc0luUHJvZ3JhbSA9IGZ1bmN0aW9uIChwcm9ncmFtLCBjb250ZXh0TmFtZSwgcGFyYW0sIGFuYWx5emVkQ2FsbHMpIHtcbiAgICAgICAgdmFyIGNvbnRleHRTdGFjayA9IFtuZXcgQ29udGV4dChwcm9ncmFtLCBudWxsLCB7bmFtZTogXCJnbG9iYWxcIn0pXTtcbiAgICAgICAgdmFyIGZvdW5kUGFyYW1zID0gW107XG4gICAgICAgIGFuYWx5emVkQ2FsbHMgPSBhbmFseXplZENhbGxzIHx8IHt9O1xuICAgICAgICAvL2NvbnNvbGUubG9nKFwiTG9va2luZyBmb3I6IFwiLCBjb250ZXh0TmFtZSwgcGFyYW0pO1xuXG4gICAgICAgIHZhciBhY3RpdmVQYXJhbSA9IG51bGw7XG4gICAgICAgIHdhbGsudHJhdmVyc2UocHJvZ3JhbSwge1xuICAgICAgICAgICAgZW50ZXI6IGZ1bmN0aW9uIChub2RlKSB7XG4gICAgICAgICAgICAgICAgdmFyIHR5cGUgPSBub2RlLnR5cGUsXG4gICAgICAgICAgICAgICAgICAgIGNvbnRleHQ7XG4gICAgICAgICAgICAgICAgc3dpdGNoICh0eXBlKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgU3ludGF4LkZ1bmN0aW9uRGVjbGFyYXRpb246XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgcGFyZW50Q29udGV4dCA9IGNvbnRleHRTdGFja1tjb250ZXh0U3RhY2subGVuZ3RoIC0gMV07XG4gICAgICAgICAgICAgICAgICAgICAgICBwYXJlbnRDb250ZXh0LmRlY2xhcmVWYXJpYWJsZShub2RlLmlkLm5hbWUsIGZhbHNlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRleHQgPSBuZXcgQ29udGV4dChub2RlLCBwYXJlbnRDb250ZXh0LCB7bmFtZTogbm9kZS5pZC5uYW1lIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29udGV4dFN0YWNrLnB1c2goY29udGV4dCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoY29udGV4dC5zdHIoKSA9PSBjb250ZXh0TmFtZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChub2RlLnBhcmFtcy5sZW5ndGggPiBwYXJhbSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhY3RpdmVQYXJhbSA9IG5vZGUucGFyYW1zW3BhcmFtXS5uYW1lO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlIFN5bnRheC5DYWxsRXhwcmVzc2lvbjpcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBwb3MgPSBub2RlLmFyZ3VtZW50cy5yZWR1Y2UoZnVuY3Rpb24gKHByZXYsIGN1cnIsIGluZGV4KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGN1cnIubmFtZSA9PSBhY3RpdmVQYXJhbSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGluZGV4O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBwcmV2O1xuICAgICAgICAgICAgICAgICAgICAgICAgfSwgLTEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHBvcyAhPSAtMSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRleHQgPSBjb250ZXh0U3RhY2tbY29udGV4dFN0YWNrLmxlbmd0aCAtIDFdO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBpZCA9IGNvbnRleHQuZ2V0VmFyaWFibGVJZGVudGlmaWVyKG5vZGUuY2FsbGVlLm5hbWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICghYW5hbHl6ZWRDYWxsc1tpZF0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYW5hbHl6ZWRDYWxsc1tpZF0gPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmb3VuZFBhcmFtcyA9IGZvdW5kUGFyYW1zLmNvbmNhdChmaW5kUGFyYW1ldGVyc0luUHJvZ3JhbShwcm9ncmFtLCBpZCwgcG9zLCBhbmFseXplZENhbGxzKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgbGVhdmU6IGZ1bmN0aW9uIChub2RlKSB7XG4gICAgICAgICAgICAgICAgdmFyIHR5cGUgPSBub2RlLnR5cGU7XG4gICAgICAgICAgICAgICAgc3dpdGNoICh0eXBlKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgU3ludGF4LkZ1bmN0aW9uRGVjbGFyYXRpb246XG4gICAgICAgICAgICAgICAgICAgICAgICBjb250ZXh0U3RhY2sucG9wKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBhY3RpdmVQYXJhbSA9IG51bGw7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBTeW50YXguTWVtYmVyRXhwcmVzc2lvbjpcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChhY3RpdmVQYXJhbSAmJiBub2RlLm9iamVjdC5uYW1lID09IGFjdGl2ZVBhcmFtKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHBhcmFtZXRlck5hbWUgPSBub2RlLnByb3BlcnR5Lm5hbWU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGZvdW5kUGFyYW1zLmluZGV4T2YocGFyYW1ldGVyTmFtZSkgPT0gLTEpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZvdW5kUGFyYW1zLnB1c2gocGFyYW1ldGVyTmFtZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHJldHVybiBmb3VuZFBhcmFtcztcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogQHBhcmFtIHtvYmplY3QhfSBwcm9ncmFtXG4gICAgICogQHBhcmFtIHtvYmplY3Q/fSBvcHRcbiAgICAgKi9cbiAgICBucy5leHRyYWN0UGFyYW1ldGVycyA9IGZ1bmN0aW9uIChwcm9ncmFtLCBvcHQpIHtcbiAgICAgICAgb3B0ID0gb3B0IHx8IHt9O1xuICAgICAgICB2YXIgY29udGV4dCA9IG9wdC5jb250ZXh0IHx8IFwiZ2xvYmFsLnNoYWRlXCI7XG4gICAgICAgIHZhciBwYXJhbSA9IG9wdC5wYXJhbSB8fCAwO1xuXG4gICAgICAgIHJldHVybiBmaW5kUGFyYW1ldGVyc0luUHJvZ3JhbShwcm9ncmFtLCBjb250ZXh0LCBwYXJhbSk7XG4gICAgfTtcblxuXG59KGV4cG9ydHMpKTtcbiIsIihmdW5jdGlvbiAobnMpIHtcblxuICAgIHZhciBTeW50YXggPSByZXF1aXJlKCdlc3RyYXZlcnNlJykuU3ludGF4LFxuICAgICAgICBWaXNpdG9yT3B0aW9uID0gcmVxdWlyZSgnZXN0cmF2ZXJzZScpLlZpc2l0b3JPcHRpb24sXG4gICAgICAgIFNoYWRlID0gcmVxdWlyZShcIi4uLy4uL2ludGVyZmFjZXMuanNcIiksXG4gICAgICAgIFRZUEVTID0gU2hhZGUuVFlQRVMsXG4gICAgICAgIEFubm90YXRpb24gPSByZXF1aXJlKFwiLi8uLi8uLi9iYXNlL2Fubm90YXRpb24uanNcIikuQW5ub3RhdGlvbixcbiAgICAgICAgQmFzZSA9IHJlcXVpcmUoXCIuLy4uLy4uL2Jhc2UvaW5kZXguanNcIik7XG5cblxuICAgIHZhciBCaW5hcnlGdW5jdGlvbnMgPSB7XG4gICAgICAgIFwiK1wiIDogZnVuY3Rpb24oYSxiKSB7IHJldHVybiBhICsgYjsgfSxcbiAgICAgICAgXCItXCIgOiBmdW5jdGlvbihhLGIpIHsgcmV0dXJuIGEgLSBiOyB9LFxuICAgICAgICBcIi9cIiA6IGZ1bmN0aW9uKGEsYikgeyByZXR1cm4gYSAvIGI7IH0sXG4gICAgICAgIFwiKlwiIDogZnVuY3Rpb24oYSxiKSB7IHJldHVybiBhICogYjsgfSxcbiAgICAgICAgXCIlXCIgOiBmdW5jdGlvbihhLGIpIHsgcmV0dXJuIGEgJSBiOyB9LFxuXG4gICAgICAgIFwiPT1cIiA6IGZ1bmN0aW9uKGEsYikgeyByZXR1cm4gYSA9PSBiOyB9LFxuICAgICAgICBcIiE9XCIgOiBmdW5jdGlvbihhLGIpIHsgcmV0dXJuIGEgIT0gYjsgfSxcbiAgICAgICAgXCI9PT1cIiA6IGZ1bmN0aW9uKGEsYikgeyByZXR1cm4gYSA9PT0gYjsgfSxcbiAgICAgICAgXCIhPT1cIiA6IGZ1bmN0aW9uKGEsYikgeyByZXR1cm4gYSAhPT0gYjsgfSxcbiAgICAgICAgXCI8XCIgOiBmdW5jdGlvbihhLGIpIHsgcmV0dXJuIGEgPCBiOyB9LFxuICAgICAgICBcIjw9XCIgOiBmdW5jdGlvbihhLGIpIHsgcmV0dXJuIGEgPD0gYjsgfSxcbiAgICAgICAgXCI+XCIgOiBmdW5jdGlvbihhLGIpIHsgcmV0dXJuIGEgPiBiOyB9LFxuICAgICAgICBcIj49XCIgOiBmdW5jdGlvbihhLGIpIHsgcmV0dXJuIGEgPj0gYjsgfVxuICAgICAgICB9O1xuXG4gICAgdmFyIFVuYXJ5RnVuY3Rpb25zID0ge1xuICAgICAgICAgICAgICAgIFwiIVwiOiBmdW5jdGlvbihhKSB7IHJldHVybiAhYTsgfSxcbiAgICAgICAgICAgICAgICBcIi1cIjogZnVuY3Rpb24oYSkgeyByZXR1cm4gLWE7IH0sXG4gICAgICAgICAgICAgICAgXCIrXCI6IGZ1bmN0aW9uKGEpIHsgcmV0dXJuICthOyB9LFxuICAgICAgICAgICAgICAgIFwidHlwZW9mXCI6IGZ1bmN0aW9uKGEpIHsgcmV0dXJuIHR5cGVvZiBhOyB9LFxuICAgICAgICAgICAgICAgIFwidm9pZFwiOiBmdW5jdGlvbihhKSB7IHJldHVybiB2b2lkIGE7IH0sXG4gICAgICAgICAgICAgICAgXCJkZWxldGVcIjogZnVuY3Rpb24oYSkgeyByZXR1cm4gZGVsZXRlIGE7IH1cblxuICAgIH07XG5cblxuICAgIGZ1bmN0aW9uIGdldE9iamVjdFJlZmVyZW5jZUZyb21Ob2RlKG9iamVjdCwgY29udGV4dCkge1xuICAgICAgICBzd2l0Y2ggKG9iamVjdC50eXBlKSB7XG4gICAgICAgICAgICBjYXNlIFN5bnRheC5OZXdFeHByZXNzaW9uOlxuICAgICAgICAgICAgY2FzZSBTeW50YXguQ2FsbEV4cHJlc3Npb246XG4gICAgICAgICAgICBjYXNlIFN5bnRheC5NZW1iZXJFeHByZXNzaW9uOlxuICAgICAgICAgICAgICAgIHJldHVybiBjb250ZXh0LmNyZWF0ZVR5cGVJbmZvKG9iamVjdCk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIFN5bnRheC5JZGVudGlmaWVyOlxuICAgICAgICAgICAgICAgIHJldHVybiBjb250ZXh0LmdldEJpbmRpbmdCeU5hbWUob2JqZWN0Lm5hbWUpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBTeW50YXguVGhpc0V4cHJlc3Npb246XG4gICAgICAgICAgICAgICAgcmV0dXJuIGNvbnRleHQuZ2V0QmluZGluZ0J5TmFtZShcInRoaXNcIik7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIlVuaGFuZGxlZCBvYmplY3QgdHlwZSBpbiBUeXBlSW5mZXJlbmNlOiBcIiArIG9iamVjdC50eXBlKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHZhciBldmFsdWF0ZVRydXRoID0gZnVuY3Rpb24oZXhwKSB7XG4gICAgICAgIHJldHVybiAhIWV4cDtcbiAgICB9XG5cbiAgICB2YXIgbG9nID0gZnVuY3Rpb24oc3RyKSB7fTtcbiAgICAvL3ZhciBsb2cgPSBmdW5jdGlvbigpIHsgY29uc29sZS5sb2cuYXBwbHkoY29uc29sZSwgYXJndW1lbnRzKTsgfTtcblxuXG4gICAgdmFyIGVudGVySGFuZGxlcnMgPSB7XG4gICAgICAgIC8vIE9uIGVudGVyXG4gICAgICAgIENvbmRpdGlvbmFsRXhwcmVzc2lvbjogZnVuY3Rpb24gKG5vZGUsIHBhcmVudCwgY3R4LCByb290KSB7XG4gICAgICAgICAgICB2YXIgcmVzdWx0ID0gbmV3IEFubm90YXRpb24obm9kZSk7XG5cbiAgICAgICAgICAgIHJvb3QudHJhdmVyc2Uobm9kZS50ZXN0KTtcbiAgICAgICAgICAgIHZhciB0ZXN0ID0gY3R4LmNyZWF0ZVR5cGVJbmZvKG5vZGUudGVzdCk7XG5cbiAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKG5vZGUudGVzdCwgbm9kZS5jb25zZXF1ZW50LCBub2RlLmFsdGVybmF0ZSk7XG4gICAgICAgICAgICBpZiAodGVzdC5oYXNTdGF0aWNWYWx1ZSgpKSB7XG4gICAgICAgICAgICAgICAgdmFyIHRlc3RSZXN1bHQgPSBldmFsdWF0ZVRydXRoKHRlc3QuZ2V0U3RhdGljVmFsdWUoKSk7XG4gICAgICAgICAgICAgICAgaWYgKHRlc3RSZXN1bHQgPT09IHRydWUpIHtcbiAgICAgICAgICAgICAgICAgICAgcm9vdC50cmF2ZXJzZShub2RlLmNvbnNlcXVlbnQpO1xuICAgICAgICAgICAgICAgICAgICBjb25zZXF1ZW50ID0gY3R4LmNyZWF0ZVR5cGVJbmZvKG5vZGUuY29uc2VxdWVudCk7XG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdC5jb3B5KGNvbnNlcXVlbnQpO1xuICAgICAgICAgICAgICAgICAgICB2YXIgYWx0ZXJuYXRlID0gbmV3IEFubm90YXRpb24obm9kZS5hbHRlcm5hdGUpO1xuICAgICAgICAgICAgICAgICAgICBhbHRlcm5hdGUuZWxpbWluYXRlKCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcm9vdC50cmF2ZXJzZShub2RlLmFsdGVybmF0ZSk7XG4gICAgICAgICAgICAgICAgICAgIHZhciBhbHRlcm5hdGUgPSBjdHguY3JlYXRlVHlwZUluZm8obm9kZS5hbHRlcm5hdGUpO1xuICAgICAgICAgICAgICAgICAgICByZXN1bHQuY29weShhbHRlcm5hdGUpO1xuICAgICAgICAgICAgICAgICAgICB2YXIgY29uc2VxdWVudCA9IG5ldyBBbm5vdGF0aW9uKG5vZGUuY29uc2VxdWVudCk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNlcXVlbnQuZWxpbWluYXRlKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBXZSBjYW4ndCBkZWNpZGUsIHRodXMgdHJhdmVyc2UgYm90aDtcbiAgICAgICAgICAgICAgICByb290LnRyYXZlcnNlKG5vZGUuY29uc2VxdWVudCk7XG4gICAgICAgICAgICAgICAgcm9vdC50cmF2ZXJzZShub2RlLmFsdGVybmF0ZSk7XG4gICAgICAgICAgICAgICAgdmFyIGNvbnNlcXVlbnQgPSBjdHguY3JlYXRlVHlwZUluZm8obm9kZS5jb25zZXF1ZW50KSxcbiAgICAgICAgICAgICAgICAgICAgYWx0ZXJuYXRlID0gY3R4LmNyZWF0ZVR5cGVJbmZvKG5vZGUuYWx0ZXJuYXRlKTtcblxuXG4gICAgICAgICAgICAgICAgaWYgKGNvbnNlcXVlbnQuZXF1YWxzKGFsdGVybmF0ZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0LmNvcHkoY29uc2VxdWVudCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChjb25zZXF1ZW50LmNhbk51bWJlcigpICYmIGFsdGVybmF0ZS5jYW5OdW1iZXIoKSkge1xuICAgICAgICAgICAgICAgICAgICByZXN1bHQuc2V0VHlwZShUWVBFUy5OVU1CRVIpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIGlmICh0ZXN0LmlzTnVsbE9yVW5kZWZpbmVkKCkpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0LnNldFR5cGUoYWx0ZXJuYXRlLmdldFR5cGUoKSlcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAvLyBXZSBkb24ndCBhbGxvdyBkeW5hbWljIHR5cGVzICh0aGUgdHlwZSBvZiB0aGUgcmVzdWx0IGRlcGVuZHMgb24gdGhlIHZhbHVlIG9mIGl0J3Mgb3BlcmFuZHMpLlxuICAgICAgICAgICAgICAgICAgICAvLyBBdCB0aGlzIHBvaW50LCB0aGUgZXhwcmVzc2lvbiBuZWVkcyB0byBldmFsdWF0ZSB0byBhIHJlc3VsdCwgb3RoZXJ3aXNlIGl0J3MgYW4gZXJyb3JcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgU2hhZGUudGhyb3dFcnJvcihub2RlLCBcIlN0YXRpYyBldmFsdWF0aW9uIG5vdCBpbXBsZW1lbnRlZCB5ZXRcIik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIFZpc2l0b3JPcHRpb24uU2tpcDtcblxuICAgICAgICB9LFxuICAgICAgICBMaXRlcmFsOiBmdW5jdGlvbiAobGl0ZXJhbCkge1xuICAgICAgICAgICAgLy9jb25zb2xlLmxvZyhsaXRlcmFsKTtcbiAgICAgICAgICAgIHZhciB2YWx1ZSA9IGxpdGVyYWwucmF3ICE9PSB1bmRlZmluZWQgPyBsaXRlcmFsLnJhdyA6IGxpdGVyYWwudmFsdWUsXG4gICAgICAgICAgICAgICAgcmVzdWx0ID0gbmV3IEFubm90YXRpb24obGl0ZXJhbCk7XG5cbiAgICAgICAgICAgIHZhciBudW1iZXIgPSBwYXJzZUZsb2F0KHZhbHVlKTtcblxuICAgICAgICAgICAgaWYgKCFpc05hTihudW1iZXIpKSB7XG4gICAgICAgICAgICAgICAgaWYgKHZhbHVlLmluZGV4T2YoXCIuXCIpID09IC0xKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdC5zZXRUeXBlKFRZUEVTLklOVCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICByZXN1bHQuc2V0VHlwZShUWVBFUy5OVU1CRVIpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXN1bHQuc2V0U3RhdGljVmFsdWUobnVtYmVyKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAodmFsdWUgPT09ICd0cnVlJykge1xuICAgICAgICAgICAgICAgIHJlc3VsdC5zZXRUeXBlKFRZUEVTLkJPT0xFQU4pO1xuICAgICAgICAgICAgICAgIHJlc3VsdC5zZXRTdGF0aWNWYWx1ZSh0cnVlKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAodmFsdWUgPT09ICdmYWxzZScpIHtcbiAgICAgICAgICAgICAgICByZXN1bHQuc2V0VHlwZShUWVBFUy5CT09MRUFOKTtcbiAgICAgICAgICAgICAgICByZXN1bHQuc2V0U3RhdGljVmFsdWUoZmFsc2UpO1xuICAgICAgICAgICAgfSBlbHNlIGlmICh2YWx1ZSA9PT0gJ251bGwnKSB7XG4gICAgICAgICAgICAgICAgcmVzdWx0LnNldFR5cGUoVFlQRVMuTlVMTCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJlc3VsdC5zZXRUeXBlKFRZUEVTLlNUUklORyk7XG4gICAgICAgICAgICAgICAgcmVzdWx0LnNldFN0YXRpY1ZhbHVlKHZhbHVlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIHZhciBoYW5kbGVycyA9IHtcbiAgICAgICAgQXNzaWdubWVudEV4cHJlc3Npb246IGZ1bmN0aW9uIChub2RlLCBjdHgpIHtcbiAgICAgICAgICAgIHZhciByaWdodCA9IGN0eC5jcmVhdGVUeXBlSW5mbyhub2RlLnJpZ2h0KSxcbiAgICAgICAgICAgICAgICByZXN1bHQgPSBuZXcgQW5ub3RhdGlvbihub2RlKTtcblxuICAgICAgICAgICAgcmVzdWx0LmNvcHkocmlnaHQpO1xuICAgICAgICAgICAgaWYgKG5vZGUubGVmdC50eXBlID09IFN5bnRheC5JZGVudGlmaWVyKSB7XG4gICAgICAgICAgICAgICAgdmFyIG5hbWUgPSBub2RlLmxlZnQubmFtZTtcbiAgICAgICAgICAgICAgICBpZiAoY3R4LmluRGVjbGFyYXRpb24gPT09IHRydWUpIHtcbiAgICAgICAgICAgICAgICAgICAgY3R4LmRlY2xhcmVWYXJpYWJsZShuYW1lLCB0cnVlLCByZXN1bHQpXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGN0eC51cGRhdGVFeHByZXNzaW9uKG5hbWUsIHJpZ2h0KTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiQXNzaWdubWVudCBleHByZXNzaW9uXCIpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuXG5cbiAgICAgICAgTmV3RXhwcmVzc2lvbjogZnVuY3Rpb24obm9kZSwgcGFyZW50LCBjdHgpIHtcbiAgICAgICAgICAgIHZhciByZXN1bHQgPSBuZXcgQW5ub3RhdGlvbihub2RlKTtcblxuICAgICAgICAgICAgdmFyIGVudHJ5ID0gY3R4LmdldEJpbmRpbmdCeU5hbWUobm9kZS5jYWxsZWUubmFtZSk7XG4gICAgICAgICAgICAvL2NvbnNvbGUuZXJyb3IoZW50cnkpO1xuICAgICAgICAgICAgaWYgKGVudHJ5ICYmIGVudHJ5Lmhhc0NvbnN0cnVjdG9yKCkpIHtcbiAgICAgICAgICAgICAgICB2YXIgY29uc3RydWN0b3IgPSBlbnRyeS5nZXRDb25zdHJ1Y3RvcigpO1xuICAgICAgICAgICAgICAgIHZhciBhcmdzID0gQW5ub3RhdGlvbi5jcmVhdGVBbm5vdGF0ZWROb2RlQXJyYXkobm9kZS5hcmd1bWVudHMsIGN0eCk7XG4gICAgICAgICAgICAgICAgdmFyIGV4dHJhID0gY29uc3RydWN0b3IuZXZhbHVhdGUocmVzdWx0LCBhcmdzLCBjdHgpO1xuICAgICAgICAgICAgICAgIHJlc3VsdC5zZXRGcm9tRXh0cmEoZXh0cmEpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJSZWZlcmVuY2VFcnJvcjogXCIgKyBub2RlLmNhbGxlZS5uYW1lICsgXCIgaXMgbm90IGRlZmluZWRcIik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG5cbiAgICAgICAgVW5hcnlFeHByZXNzaW9uOiBmdW5jdGlvbiAobm9kZSwgY3R4KSB7XG4gICAgICAgICAgICB2YXIgcmVzdWx0ID0gbmV3IEFubm90YXRpb24obm9kZSksXG4gICAgICAgICAgICAgICAgYXJndW1lbnQgPSBjdHguY3JlYXRlVHlwZUluZm8obm9kZS5hcmd1bWVudCksXG4gICAgICAgICAgICAgICAgb3BlcmF0b3IgPSBub2RlLm9wZXJhdG9yLFxuICAgICAgICAgICAgICAgIGZ1bmMgPSBVbmFyeUZ1bmN0aW9uc1tvcGVyYXRvcl07XG5cbiAgICAgICAgICAgIHN3aXRjaCAob3BlcmF0b3IpIHtcbiAgICAgICAgICAgICAgICBjYXNlIFwiIVwiOlxuXG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdC5zZXRUeXBlKFRZUEVTLkJPT0xFQU4pO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIFwiK1wiOlxuICAgICAgICAgICAgICAgIGNhc2UgXCItXCI6XG4gICAgICAgICAgICAgICAgICAgIGlmIChhcmd1bWVudC5jYW5JbnQoKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVzdWx0LnNldFR5cGUoVFlQRVMuSU5UKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChhcmd1bWVudC5jYW5OdW1iZXIoKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVzdWx0LnNldFR5cGUoVFlQRVMuTlVNQkVSKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIkNhbid0IGV2YWx1YXRlICdcIiArIG9wZXJhdG9yICsgJ1wiIGZvciAnICsgYXJndW1lbnQpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgXCJ+XCI6XG4gICAgICAgICAgICAgICAgY2FzZSBcInR5cGVvZlwiOlxuICAgICAgICAgICAgICAgIGNhc2UgXCJ2b2lkXCI6XG4gICAgICAgICAgICAgICAgY2FzZSBcImRlbGV0ZVwiOlxuICAgICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIk9wZXJhdG9yIG5vdCB5ZXQgc3VwcG9ydGVkOiBcIiArIG9wZXJhdG9yKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChhcmd1bWVudC5oYXNTdGF0aWNWYWx1ZSgpKSB7XG4gICAgICAgICAgICAgICAgcmVzdWx0LnNldFN0YXRpY1ZhbHVlKGZ1bmMoYXJndW1lbnQuZ2V0U3RhdGljVmFsdWUoKSkpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXN1bHQuc2V0RHluYW1pY1ZhbHVlKCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgfSxcblxuXG4gICAgICAgIElkZW50aWZpZXI6IGZ1bmN0aW9uIChub2RlLCBjdHgpIHtcbiAgICAgICAgICAgIHZhciByZXN1bHQgPSBuZXcgQW5ub3RhdGlvbihub2RlKSxcbiAgICAgICAgICAgICAgICBuYW1lID0gbm9kZS5uYW1lO1xuXG4gICAgICAgICAgICBpZiAobmFtZSA9PT0gXCJ1bmRlZmluZWRcIikge1xuICAgICAgICAgICAgICAgIHJlc3VsdC5zZXRUeXBlKFRZUEVTLlVOREVGSU5FRCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuXG5cblxuICAgICAgICBMb2dpY2FsRXhwcmVzc2lvbjogZnVuY3Rpb24gKG5vZGUsIGN0eCkge1xuICAgICAgICAgICAgdmFyIGxlZnQgPSBjdHguY3JlYXRlVHlwZUluZm8obm9kZS5sZWZ0KSxcbiAgICAgICAgICAgICAgICByaWdodCA9IGN0eC5jcmVhdGVUeXBlSW5mbyhub2RlLnJpZ2h0KSxcbiAgICAgICAgICAgICAgICByZXN1bHQgPSBuZXcgQW5ub3RhdGlvbihub2RlKSxcbiAgICAgICAgICAgICAgICBvcGVyYXRvciA9IG5vZGUub3BlcmF0b3I7XG5cbiAgICAgICAgICAgIGlmICghKG9wZXJhdG9yID09IFwiJiZcIiB8fCBvcGVyYXRvciA9PSBcInx8XCIpKVxuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIk9wZXJhdG9yIG5vdCBzdXBwb3J0ZWQ6IFwiICsgbm9kZS5vcGVyYXRvcik7XG5cbiAgICAgICAgICAgIGlmIChsZWZ0LmlzTnVsbE9yVW5kZWZpbmVkKCkpIHsgIC8vIGV2YWx1YXRlcyB0byBmYWxzZVxuICAgICAgICAgICAgICAgIGlmIChvcGVyYXRvciA9PSBcInx8XCIpIHsgICAgICAvLyBmYWxzZSB8fCB4ID0geFxuICAgICAgICAgICAgICAgICAgICByZXN1bHQuY29weShyaWdodCk7XG4gICAgICAgICAgICAgICAgICAgIGxlZnQuZWxpbWluYXRlKCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHsgICAgICAgICAgICAgICAgICAgICAvLyBmYWxzZSAmJiB4ID0gZmFsc2VcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0LmNvcHkobGVmdCk7XG4gICAgICAgICAgICAgICAgICAgIHJpZ2h0LmVsaW1pbmF0ZSgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSBpZiAobGVmdC5pc09iamVjdCgpICYmIG9wZXJhdG9yID09IFwifHxcIikgeyAvLyBBbiBvYmplY3QgdGhhdCBpcyBub3QgbnVsbCBldmFsdWF0ZXMgdG8gdHJ1ZVxuICAgICAgICAgICAgICAgIHJlc3VsdC5jb3B5KGxlZnQpO1xuICAgICAgICAgICAgICAgIHJpZ2h0LmVsaW1pbmF0ZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAobGVmdC5nZXRUeXBlKCkgPT0gcmlnaHQuZ2V0VHlwZSgpKSB7XG4gICAgICAgICAgICAgICAgaWYgKGxlZnQuaXNPYmplY3QoKSAmJiBsZWZ0LmdldEtpbmQoKSAhPSByaWdodC5nZXRLaW5kKCkpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiQ2FuJ3QgZXZhbHVhdGUgbG9naWNhbCBleHByZXNzaW9uIHdpdGggdHdvIGRpZmZlcmVudCBraW5kIG9mIG9iamVjdHNcIik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJlc3VsdC5jb3B5KGxlZnQpOyAvLyBUT0RPOiBTdGF0aWMgdmFsdWU/XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBXZSBkb24ndCBhbGxvdyBkeW5hbWljIHR5cGVzICh0aGUgdHlwZSBvZiB0aGUgcmVzdWx0IGRlcGVuZHMgb24gdGhlIHZhbHVlIG9mIGl0J3Mgb3BlcmFuZHMpLlxuICAgICAgICAgICAgICAgIC8vIEF0IHRoaXMgcG9pbnQsIHRoZSBleHByZXNzaW9uIG5lZWRzIHRvIGV2YWx1YXRlIHRvIGEgcmVzdWx0LCBvdGhlcndpc2UgaXQncyBhbiBlcnJvclxuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIlN0YXRpYyBldmFsdWF0aW9uIG5vdCBpbXBsZW1lbnRlZCB5ZXRcIik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG5cblxuICAgICAgICBCaW5hcnlFeHByZXNzaW9uOiBmdW5jdGlvbiAobm9kZSwgY3R4KSB7XG4gICAgICAgICAgICAvL2NvbnNvbGUubG9nKG5vZGUubGVmdCwgbm9kZS5yaWdodCk7XG4gICAgICAgICAgICB2YXIgbGVmdCA9IGN0eC5jcmVhdGVUeXBlSW5mbyhub2RlLmxlZnQpLFxuICAgICAgICAgICAgICAgIHJpZ2h0ID0gY3R4LmNyZWF0ZVR5cGVJbmZvKG5vZGUucmlnaHQpLFxuICAgICAgICAgICAgICAgIHJlc3VsdCA9IG5ldyBBbm5vdGF0aW9uKG5vZGUpLFxuICAgICAgICAgICAgICAgIG9wZXJhdG9yID0gbm9kZS5vcGVyYXRvcixcbiAgICAgICAgICAgICAgICBmdW5jID0gQmluYXJ5RnVuY3Rpb25zW29wZXJhdG9yXTtcblxuICAgICAgICAgICAgc3dpdGNoIChvcGVyYXRvcikge1xuICAgICAgICAgICAgICAgIGNhc2UgXCIrXCI6XG4gICAgICAgICAgICAgICAgY2FzZSBcIi1cIjpcbiAgICAgICAgICAgICAgICBjYXNlIFwiKlwiOlxuICAgICAgICAgICAgICAgIGNhc2UgXCIvXCI6XG4gICAgICAgICAgICAgICAgY2FzZSBcIiVcIjpcbiAgICAgICAgICAgICAgICAgICAgLy8gaW50ICdvcCcgaW50ID0+IGludFxuICAgICAgICAgICAgICAgICAgICAvLyBpbnQgLyBpbnQgPT4gbnVtYmVyXG4gICAgICAgICAgICAgICAgICAgIGlmIChsZWZ0LmlzSW50KCkgJiYgcmlnaHQuaXNJbnQoKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG9wZXJhdG9yID09IFwiL1wiKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc3VsdC5zZXRUeXBlKFRZUEVTLk5VTUJFUik7XG4gICAgICAgICAgICAgICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzdWx0LnNldFR5cGUoVFlQRVMuSU5UKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAvLyBpbnQgJ29wJyBudW1iZXIgPT4gbnVtYmVyXG4gICAgICAgICAgICAgICAgICAgIGVsc2UgaWYgKGxlZnQuaXNJbnQoKSAmJiByaWdodC5pc051bWJlcigpIHx8IHJpZ2h0LmlzSW50KCkgJiYgbGVmdC5pc051bWJlcigpKVxuICAgICAgICAgICAgICAgICAgICAgICAgcmVzdWx0LnNldFR5cGUoVFlQRVMuTlVNQkVSKTtcbiAgICAgICAgICAgICAgICAgICAgLy8gbnVtYmVyICdvcCcgbnVtYmVyID0+IG51bWJlclxuICAgICAgICAgICAgICAgICAgICBlbHNlIGlmIChsZWZ0LmlzTnVtYmVyKCkgJiYgcmlnaHQuaXNOdW1iZXIoKSlcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc3VsdC5zZXRUeXBlKFRZUEVTLk5VTUJFUik7XG4gICAgICAgICAgICAgICAgICAgIC8vIGludCAnb3AnIG51bGwgPT4gaW50XG4gICAgICAgICAgICAgICAgICAgIGVsc2UgaWYgKGxlZnQuaXNJbnQoKSAmJiByaWdodC5pc051bGxPclVuZGVmaW5lZCgpIHx8IHJpZ2h0LmlzSW50KCkgJiYgbGVmdC5pc051bGxPclVuZGVmaW5lZCgpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXN1bHQuc2V0VHlwZShUWVBFUy5JTlQpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIC8vIG51bWJlciAnb3AnIG51bGwgPT4gbnVtYmVyXG4gICAgICAgICAgICAgICAgICAgIGVsc2UgaWYgKChsZWZ0LmlzTnVtYmVyKCkgJiYgcmlnaHQuaXNOdWxsT3JVbmRlZmluZWQoKSkgfHwgKHJpZ2h0LmlzTnVtYmVyKCkgJiYgbGVmdC5pc051bGxPclVuZGVmaW5lZCgpKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVzdWx0LnNldFR5cGUoVFlQRVMuTlVNQkVSKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vY29uc29sZS5lcnJvcihub2RlLCBsZWZ0LmdldFR5cGUoKSwgb3BlcmF0b3IsIHJpZ2h0LmdldFR5cGUoKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBTaGFkZS50aHJvd0Vycm9yKG5vZGUsIFwiRXZhbHVhdGVzIHRvIE5hTjogXCIgKyBsZWZ0LmdldFR5cGVTdHJpbmcoKSArIFwiIFwiICsgb3BlcmF0b3IgKyBcIiBcIiArIHJpZ2h0LmdldFR5cGVTdHJpbmcoKSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSBcIj09XCI6IC8vIGNvbXBhcmlzb25cbiAgICAgICAgICAgICAgICBjYXNlIFwiIT1cIjpcbiAgICAgICAgICAgICAgICBjYXNlIFwiPT09XCI6XG4gICAgICAgICAgICAgICAgY2FzZSBcIiE9PVwiOlxuICAgICAgICAgICAgICAgIGNhc2UgXCI+XCI6XG4gICAgICAgICAgICAgICAgY2FzZSBcIjxcIjpcbiAgICAgICAgICAgICAgICBjYXNlIFwiPj1cIjpcbiAgICAgICAgICAgICAgICBjYXNlIFwiPD1cIjpcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0LnNldFR5cGUoVFlQRVMuQk9PTEVBTik7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIk9wZXJhdG9yIG5vdCBzdXBwb3J0ZWQ6IFwiICsgb3BlcmF0b3IpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGxlZnQuaGFzU3RhdGljVmFsdWUoKSAmJiByaWdodC5oYXNTdGF0aWNWYWx1ZSgpKSB7XG4gICAgICAgICAgICAgICAgLy9jb25zb2xlLmxvZyhsZWZ0LmdldFN0YXRpY1ZhbHVlKCksIG9wZXJhdG9yLCByaWdodC5nZXRTdGF0aWNWYWx1ZSgpKTtcbiAgICAgICAgICAgICAgICByZXN1bHQuc2V0U3RhdGljVmFsdWUoZnVuYyhsZWZ0LmdldFN0YXRpY1ZhbHVlKCksIHJpZ2h0LmdldFN0YXRpY1ZhbHVlKCkpKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmVzdWx0LnNldER5bmFtaWNWYWx1ZSgpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgIH0sXG5cblxuICAgICAgICBNZW1iZXJFeHByZXNzaW9uOiBmdW5jdGlvbiAobm9kZSwgcGFyZW50LCBjdHgsIHJvb3QpIHtcbiAgICAgICAgICAgIHZhciByZXN1bHRUeXBlID0gY3R4LmNyZWF0ZVR5cGVJbmZvKG5vZGUpLFxuICAgICAgICAgICAgICAgIG9iamVjdEFubm90YXRpb24gPSBuZXcgQW5ub3RhdGlvbihub2RlLm9iamVjdCksXG4gICAgICAgICAgICAgICAgcHJvcGVydHlBbm5vdGF0aW9uID0gbmV3IEFubm90YXRpb24obm9kZS5wcm9wZXJ0eSksXG4gICAgICAgICAgICAgICAgcHJvcGVydHlOYW1lID0gbm9kZS5wcm9wZXJ0eS5uYW1lO1xuXG4gICAgICAgICAgICAvL2NvbnNvbGUubG9nKFwiTWVtYmVyXCIsIG5vZGUub2JqZWN0Lm5hbWUsIG5vZGUucHJvcGVydHkubmFtZSk7XG4gICAgICAgICAgICBpZiAobm9kZS5jb21wdXRlZCkge1xuICAgICAgICAgICAgICAgIGlmIChvYmplY3RBbm5vdGF0aW9uLmlzQXJyYXkoKSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBQcm9wZXJ0eSBpcyBjb21wdXRlZCwgdGh1cyBpdCBjb3VsZCBiZSBhIHZhcmlhYmxlXG4gICAgICAgICAgICAgICAgICAgIHZhciBwcm9wZXJ0eVR5cGUgPSAgY3R4LmNyZWF0ZVR5cGVJbmZvKG5vZGUucHJvcGVydHkpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoIXByb3BlcnR5VHlwZS5jYW5JbnQoKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgU2hhZGUudGhyb3dFcnJvcihub2RlLCBcIkV4cGVjdGVkICdpbnQnIHR5cGUgZm9yIGFycmF5IGFjY2Vzc29yXCIpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHZhciBlbGVtZW50SW5mbyA9IG9iamVjdEFubm90YXRpb24uZ2V0QXJyYXlFbGVtZW50VHlwZSgpO1xuICAgICAgICAgICAgICAgICAgICByZXN1bHRUeXBlLnNldFR5cGUoZWxlbWVudEluZm8udHlwZSwgZWxlbWVudEluZm8ua2luZCk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIFNoYWRlLnRocm93RXJyb3Iobm9kZSwgXCJUeXBlRXJyb3I6IENhbm5vdCByZWFkIHByb3BlcnR5ICdcIisgcHJvcGVydHlOYW1lICsgXCInIG9mIFwiICsgb2JqZWN0QW5ub3RhdGlvbi5nZXRUeXBlU3RyaW5nKCkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdmFyIG9iamVjdE9mSW50ZXJlc3QgPSBnZXRPYmplY3RSZWZlcmVuY2VGcm9tTm9kZShub2RlLm9iamVjdCwgY3R4KTtcblxuICAgICAgICAgICAgb2JqZWN0T2ZJbnRlcmVzdCB8fCBTaGFkZS50aHJvd0Vycm9yKG5vZGUsXCJSZWZlcmVuY2VFcnJvcjogXCIgKyBub2RlLm9iamVjdC5uYW1lICsgXCIgaXMgbm90IGRlZmluZWQuIENvbnRleHQ6IFwiICsgY3R4LnN0cigpKTtcblxuICAgICAgICAgICAgaWYgKG9iamVjdE9mSW50ZXJlc3QuZ2V0VHlwZSgpID09IFRZUEVTLlVOREVGSU5FRCkgeyAgLy8gZS5nLiB2YXIgYSA9IHVuZGVmaW5lZDsgYS51bmtub3duO1xuICAgICAgICAgICAgICAgIFNoYWRlLnRocm93RXJyb3Iobm9kZSwgXCJUeXBlRXJyb3I6IENhbm5vdCByZWFkIHByb3BlcnR5ICdcIisgcHJvcGVydHlOYW1lICtcIicgb2YgdW5kZWZpbmVkXCIpXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAob2JqZWN0T2ZJbnRlcmVzdC5nZXRUeXBlKCkgIT0gVFlQRVMuT0JKRUNUKSB7IC8vIGUuZy4gdmFyIGEgPSA1OyBhLnVua25vd247XG4gICAgICAgICAgICAgICAgcmVzdWx0VHlwZS5zZXRUeXBlKFRZUEVTLlVOREVGSU5FRCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB2YXIgb2JqZWN0SW5mbyA9IGN0eC5nZXRPYmplY3RJbmZvRm9yKG9iamVjdE9mSW50ZXJlc3QpO1xuICAgICAgICAgICAgaWYoIW9iamVjdEluZm8pXG4gICAgICAgICAgICAgICAgU2hhZGUudGhyb3dFcnJvcihub2RlLCBcIkludGVybmFsOiBJbmNvbXBsZXRlIHJlZ2lzdHJhdGlvbiBmb3Igb2JqZWN0OiBcIiArIG9iamVjdE9mSW50ZXJlc3QuZ2V0VHlwZVN0cmluZygpICsgXCIsIFwiICsgSlNPTi5zdHJpbmdpZnkobm9kZS5vYmplY3QpKTtcblxuICAgICAgICAgICAgb2JqZWN0QW5ub3RhdGlvbi5jb3B5KG9iamVjdE9mSW50ZXJlc3QpO1xuICAgICAgICAgICAgaWYgKCFvYmplY3RJbmZvLmhhc093blByb3BlcnR5KHByb3BlcnR5TmFtZSkpIHtcbiAgICAgICAgICAgICAgICByZXN1bHRUeXBlLnNldFR5cGUoVFlQRVMuVU5ERUZJTkVEKTtcbiAgICAgICAgICAgICAgICBwcm9wZXJ0eUFubm90YXRpb24uc2V0VHlwZShUWVBFUy5VTkRFRklORUQpO1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdmFyIHByb3BlcnR5VHlwZUluZm8gPSBvYmplY3RJbmZvW3Byb3BlcnR5TmFtZV07XG4gICAgICAgICAgICBwcm9wZXJ0eUFubm90YXRpb24uc2V0RnJvbUV4dHJhKHByb3BlcnR5VHlwZUluZm8pO1xuICAgICAgICAgICAgcmVzdWx0VHlwZS5zZXRGcm9tRXh0cmEocHJvcGVydHlUeXBlSW5mbyk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgQ2FsbEV4cHJlc3Npb246IGZ1bmN0aW9uIChub2RlLCBjdHgsIHJvb3QpIHtcbiAgICAgICAgICAgIHZhciByZXN1bHQgPSBuZXcgQW5ub3RhdGlvbihub2RlKTtcblxuICAgICAgICAgICAgLy8gQ2FsbCBvbiBhbiBvYmplY3QsIGUuZy4gTWF0aC5jb3MoKVxuICAgICAgICAgICAgaWYgKG5vZGUuY2FsbGVlLnR5cGUgPT0gU3ludGF4Lk1lbWJlckV4cHJlc3Npb24pIHtcbiAgICAgICAgICAgICAgICB2YXIgY2FsbGluZ09iamVjdCA9IGdldE9iamVjdFJlZmVyZW5jZUZyb21Ob2RlKG5vZGUuY2FsbGVlLCBjdHgpO1xuXG4gICAgICAgICAgICAgICAgaWYgKCFjYWxsaW5nT2JqZWN0LmlzRnVuY3Rpb24oKSkgeyAvLyBlLmcuIE1hdGguUEkoKVxuICAgICAgICAgICAgICAgICAgICBTaGFkZS50aHJvd0Vycm9yKG5vZGUsIFwiVHlwZUVycm9yOiBPYmplY3QgIzxcIiArIGNhbGxpbmdPYmplY3QuZ2V0VHlwZSgpKyBcIj4gaGFzIG5vIG1ldGhvZCAnXCIrIG5vZGUuY2FsbGVlLnByb3BlcnR5Lm5hbWUgKyBcIidcIik7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgdmFyIG9iamVjdCA9IG5vZGUuY2FsbGVlLm9iamVjdCxcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydHlOYW1lID0gbm9kZS5jYWxsZWUucHJvcGVydHkubmFtZTtcblxuICAgICAgICAgICAgICAgIHZhciBvYmplY3RSZWZlcmVuY2UgPSBnZXRPYmplY3RSZWZlcmVuY2VGcm9tTm9kZShvYmplY3QsIGN0eCk7XG4gICAgICAgICAgICAgICAgaWYoIW9iamVjdFJlZmVyZW5jZSkgIHtcbiAgICAgICAgICAgICAgICAgICAgU2hhZGUudGhyb3dFcnJvcihub2RlLCBcIkludGVybmFsOiBObyBvYmplY3QgaW5mbyBmb3I6IFwiICsgb2JqZWN0KTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICB2YXIgb2JqZWN0SW5mbyA9IGN0eC5nZXRPYmplY3RJbmZvRm9yKG9iamVjdFJlZmVyZW5jZSk7XG4gICAgICAgICAgICAgICAgaWYoIW9iamVjdEluZm8pIHsgLy8gRXZlcnkgb2JqZWN0IG5lZWRzIGFuIGluZm8sIG90aGVyd2lzZSB3ZSBkaWQgc29tZXRoaW5nIHdyb25nXG4gICAgICAgICAgICAgICAgICAgIFNoYWRlLnRocm93RXJyb3Iobm9kZSwgXCJJbnRlcm5hbCBFcnJvcjogTm8gb2JqZWN0IHJlZ2lzdGVyZWQgZm9yOiBcIiArIG9iamVjdFJlZmVyZW5jZS5nZXRUeXBlU3RyaW5nKCkgKyBKU09OLnN0cmluZ2lmeShub2RlLm9iamVjdCkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAob2JqZWN0SW5mby5oYXNPd25Qcm9wZXJ0eShwcm9wZXJ0eU5hbWUpKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBwcm9wZXJ0eUhhbmRsZXIgPSBvYmplY3RJbmZvW3Byb3BlcnR5TmFtZV07XG4gICAgICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgcHJvcGVydHlIYW5kbGVyLmV2YWx1YXRlID09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGFyZ3MgPSBBbm5vdGF0aW9uLmNyZWF0ZUFubm90YXRlZE5vZGVBcnJheShub2RlLmFyZ3VtZW50cywgY3R4KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBleHRyYSA9IHByb3BlcnR5SGFuZGxlci5ldmFsdWF0ZShyZXN1bHQsIGFyZ3MsIGN0eCwgb2JqZWN0UmVmZXJlbmNlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc3VsdC5zZXRGcm9tRXh0cmEoZXh0cmEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSAgZWxzZSBpZiAobm9kZS5jYWxsZWUudHlwZSA9PSBTeW50YXguSWRlbnRpZmllcikge1xuICAgICAgICAgICAgICAgIHZhciBmdW5jdGlvbk5hbWUgPSBub2RlLmNhbGxlZS5uYW1lO1xuICAgICAgICAgICAgICAgIHZhciBmdW5jID0gY3R4LmdldEJpbmRpbmdCeU5hbWUoZnVuY3Rpb25OYW1lKTtcbiAgICAgICAgICAgICAgICBpZiAoIWZ1bmMpIHtcbiAgICAgICAgICAgICAgICAgICAgU2hhZGUudGhyb3dFcnJvcihub2RlLCBcIlJlZmVyZW5jZUVycm9yOiBcIiArIGZ1bmN0aW9uTmFtZSArIFwiIGlzIG5vdCBkZWZpbmVkXCIpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZighZnVuYy5pc0Z1bmN0aW9uKCkpIHtcbiAgICAgICAgICAgICAgICAgICAgU2hhZGUudGhyb3dFcnJvcihub2RlLCBcIlR5cGVFcnJvcjogXCIgKyBmdW5jLmdldFR5cGVTdHJpbmcoKSArIFwiIGlzIG5vdCBhIGZ1bmN0aW9uXCIpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB2YXIgYXJncyA9IEFubm90YXRpb24uY3JlYXRlQW5ub3RhdGVkTm9kZUFycmF5KG5vZGUuYXJndW1lbnRzLCBjdHgpO1xuICAgICAgICAgICAgICAgIHZhciBkZWZpbmluZ0NvbnRleHQgPSBjdHguZ2V0Q29udGV4dEZvck5hbWUoZnVuY3Rpb25OYW1lKTtcbiAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIHZhciBleHRyYSA9IHJvb3QuZ2V0RnVuY3Rpb25JbmZvcm1hdGlvbkZvcihjdHguZ2V0VmFyaWFibGVJZGVudGlmaWVyKGZ1bmN0aW9uTmFtZSksIGFyZ3MsIGRlZmluaW5nQ29udGV4dCk7XG4gICAgICAgICAgICAgICAgfSBjYXRjaChlKSB7XG4gICAgICAgICAgICAgICAgICAgIFNoYWRlLnRocm93RXJyb3Iobm9kZSwgXCJGYWlsdXJlIGluIGZ1bmN0aW9uIGNhbGw6IFwiICsgZS5tZXNzYWdlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZXh0cmEgJiYgcmVzdWx0LnNldEZyb21FeHRyYShleHRyYSk7XG4gICAgICAgICAgICAgICAgbm9kZS5jYWxsZWUubmFtZSA9IGV4dHJhLm5ld05hbWU7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLypjYXNlIFN5bnRheC5JZGVudGlmaWVyOlxuICAgICAgICAgICAgICAgICAgICB2YXIgZnVuY3Rpb25OYW1lID0gbm9kZS5jYWxsZWUubmFtZTtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGZ1bmMgPSBjdHguZ2V0QmluZGluZ0J5TmFtZShmdW5jdGlvbk5hbWUpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoIShmdW5jICYmIGZ1bmMuaXNJbml0aWFsaXplZCgpKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGZ1bmN0aW9uTmFtZSArIFwiIGlzIG5vdCBkZWZpbmVkLiBDb250ZXh0OiBcIiArIGN0eC5zdHIoKSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgLy8gY29uc29sZS5sb2coZnVuYyk7XG4gICAgICAgICAgICAgICAgICAgIC8vdGhyb3cgbmV3IEVycm9yKFwiQ2FuJ3QgY2FsbCBcIiArIGZ1bmN0aW9uTmFtZSArIFwiKCkgaW4gdGhpcyBjb250ZXh0OiBcIiArIGN0eC5zdHIoKSk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGRlZmF1bHQ6ICAgKi9cbiAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIlVuaGFuZGxlZCBDYWxsRXhwcmVzc2lvbjpcIiArIG5vZGUuY2FsbGVlLnR5cGUpO1xuXG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgdmFyIGVudGVyRXhwcmVzc2lvbiA9IGZ1bmN0aW9uIChub2RlLCBwYXJlbnQsIGN0eCkge1xuICAgICAgICBpZiAoZW50ZXJIYW5kbGVycy5oYXNPd25Qcm9wZXJ0eShub2RlLnR5cGUpKSB7XG4gICAgICAgICAgICByZXR1cm4gZW50ZXJIYW5kbGVyc1tub2RlLnR5cGVdKG5vZGUsIHBhcmVudCwgY3R4LCB0aGlzKTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICB2YXIgZXhpdEV4cHJlc3Npb24gPSBmdW5jdGlvbiAobm9kZSwgcGFyZW50LCBjdHgpIHtcblxuICAgICAgICBzd2l0Y2ggKG5vZGUudHlwZSkge1xuICAgICAgICAgICAgY2FzZSBTeW50YXguQXNzaWdubWVudEV4cHJlc3Npb246XG4gICAgICAgICAgICAgICAgaGFuZGxlcnMuQXNzaWdubWVudEV4cHJlc3Npb24obm9kZSwgY3R4KTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgU3ludGF4LkFycmF5RXhwcmVzc2lvbjpcbiAgICAgICAgICAgICAgICBsb2cobm9kZS50eXBlICsgXCIgaXMgbm90IGhhbmRsZSB5ZXQuXCIpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBTeW50YXguQXJyYXlQYXR0ZXJuOlxuICAgICAgICAgICAgICAgIGxvZyhub2RlLnR5cGUgKyBcIiBpcyBub3QgaGFuZGxlIHlldC5cIik7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIFN5bnRheC5CaW5hcnlFeHByZXNzaW9uOlxuICAgICAgICAgICAgICAgIGhhbmRsZXJzLkJpbmFyeUV4cHJlc3Npb24obm9kZSwgY3R4KTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgU3ludGF4LkNhbGxFeHByZXNzaW9uOlxuICAgICAgICAgICAgICAgIGhhbmRsZXJzLkNhbGxFeHByZXNzaW9uKG5vZGUsIGN0eCwgdGhpcyk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIFN5bnRheC5Db25kaXRpb25hbEV4cHJlc3Npb246XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIFN5bnRheC5GdW5jdGlvbkV4cHJlc3Npb246XG4gICAgICAgICAgICAgICAgbG9nKG5vZGUudHlwZSArIFwiIGlzIG5vdCBoYW5kbGUgeWV0LlwiKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgU3ludGF4LklkZW50aWZpZXI6XG4gICAgICAgICAgICAgICAgaGFuZGxlcnMuSWRlbnRpZmllcihub2RlLCBjdHgpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBTeW50YXguTGl0ZXJhbDpcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgU3ludGF4LkxvZ2ljYWxFeHByZXNzaW9uOlxuICAgICAgICAgICAgICAgIGhhbmRsZXJzLkxvZ2ljYWxFeHByZXNzaW9uKG5vZGUsIGN0eCk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIFN5bnRheC5NZW1iZXJFeHByZXNzaW9uOlxuICAgICAgICAgICAgICAgIGhhbmRsZXJzLk1lbWJlckV4cHJlc3Npb24obm9kZSwgcGFyZW50LCBjdHgsIHRoaXMpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBTeW50YXguTmV3RXhwcmVzc2lvbjpcbiAgICAgICAgICAgICAgICBoYW5kbGVycy5OZXdFeHByZXNzaW9uKG5vZGUsIHBhcmVudCwgY3R4KTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgU3ludGF4Lk9iamVjdEV4cHJlc3Npb246XG4gICAgICAgICAgICAgICAgbG9nKG5vZGUudHlwZSArIFwiIGlzIG5vdCBoYW5kbGUgeWV0LlwiKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgU3ludGF4Lk9iamVjdFBhdHRlcm46XG4gICAgICAgICAgICAgICAgbG9nKG5vZGUudHlwZSArIFwiIGlzIG5vdCBoYW5kbGUgeWV0LlwiKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgU3ludGF4LlByb3BlcnR5OlxuICAgICAgICAgICAgICAgIGxvZyhub2RlLnR5cGUgKyBcIiBpcyBub3QgaGFuZGxlIHlldC5cIik7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIFN5bnRheC5TZXF1ZW5jZUV4cHJlc3Npb246XG4gICAgICAgICAgICAgICAgbG9nKG5vZGUudHlwZSArIFwiIGlzIG5vdCBoYW5kbGUgeWV0LlwiKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgU3ludGF4LlRoaXNFeHByZXNzaW9uOlxuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBTeW50YXguVW5hcnlFeHByZXNzaW9uOlxuICAgICAgICAgICAgICAgIGhhbmRsZXJzLlVuYXJ5RXhwcmVzc2lvbihub2RlLCBjdHgpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBTeW50YXguVXBkYXRlRXhwcmVzc2lvbjpcbiAgICAgICAgICAgICAgICBsb2cobm9kZS50eXBlICsgXCIgaXMgbm90IGhhbmRsZSB5ZXQuXCIpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBTeW50YXguWWllbGRFeHByZXNzaW9uOlxuICAgICAgICAgICAgICAgIGxvZyhub2RlLnR5cGUgKyBcIiBpcyBub3QgaGFuZGxlIHlldC5cIik7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignVW5rbm93biBub2RlIHR5cGU6ICcgKyBub2RlLnR5cGUpO1xuXG5cbiAgICAgICAgfVxuXG4gICAgfTtcblxuXG4gICAgbnMuZW50ZXJFeHByZXNzaW9uID0gZW50ZXJFeHByZXNzaW9uO1xuICAgIG5zLmV4aXRFeHByZXNzaW9uID0gZXhpdEV4cHJlc3Npb247XG59KGV4cG9ydHMpKTtcbiIsIihmdW5jdGlvbiAobnMpIHtcblxuICAgIHZhciB3YWxrID0gcmVxdWlyZSgnZXN0cmF2ZXJzZScpLFxuICAgICAgICBlbnRlckV4cHJlc3Npb24gPSByZXF1aXJlKCcuL2luZmVyX2V4cHJlc3Npb24uanMnKS5lbnRlckV4cHJlc3Npb24sXG4gICAgICAgIGV4aXRFeHByZXNzaW9uID0gcmVxdWlyZSgnLi9pbmZlcl9leHByZXNzaW9uLmpzJykuZXhpdEV4cHJlc3Npb24sXG4gICAgICAgIFN5bnRheCA9IHJlcXVpcmUoJ2VzdHJhdmVyc2UnKS5TeW50YXgsXG4gICAgICAgIFRZUEVTID0gcmVxdWlyZShcIi4uLy4uL2ludGVyZmFjZXMuanNcIikuVFlQRVMsXG4gICAgICAgIEFubm90YXRpb24gPSByZXF1aXJlKFwiLi8uLi8uLi9iYXNlL2Fubm90YXRpb24uanNcIikuQW5ub3RhdGlvbixcbiAgICAgICAgRnVuY3Rpb25Bbm5vdGF0aW9uID0gcmVxdWlyZShcIi4vLi4vLi4vYmFzZS9hbm5vdGF0aW9uLmpzXCIpLkZ1bmN0aW9uQW5ub3RhdGlvbjtcblxuICAgIHZhciBsb2cgPSBmdW5jdGlvbihzdHIpIHt9O1xuICAgIC8vdmFyIGxvZyA9IGZ1bmN0aW9uKCkgeyBjb25zb2xlLmxvZy5hcHBseShjb25zb2xlLCBhcmd1bWVudHMpOyB9O1xuXG4gICAgdmFyIGVudGVySGFuZGxlciA9IHtcbiAgICAgICAgRm9yU3RhdGVtZW50OiBmdW5jdGlvbihub2RlLCBjdHgsIHJvb3QpIHtcbiAgICAgICAgICAgIHZhciBjdHggPSByb290LmNyZWF0ZUNvbnRleHQobm9kZSwgY3R4KTtcbiAgICAgICAgICAgIHJvb3QucHVzaENvbnRleHQoY3R4KTtcblxuICAgICAgICAgICAgcm9vdC50cmF2ZXJzZShub2RlLmluaXQpO1xuICAgICAgICAgICAgcm9vdC50cmF2ZXJzZShub2RlLnRlc3QpO1xuXG4gICAgICAgICAgICB2YXIgdGVzdCA9IG5ldyBBbm5vdGF0aW9uKG5vZGUudGVzdCk7XG4gICAgICAgICAgICBpZiAodGVzdC5oYXNTdGF0aWNWYWx1ZSgpKSB7IC8vIEdyZWF0ISBXZSBjYW4gZXZhbHVhdGUgaXQhXG4gICAgICAgICAgICAgICAgLy8gVE9ET1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByb290LnRyYXZlcnNlKG5vZGUudXBkYXRlKTtcbiAgICAgICAgICAgIHJvb3QudHJhdmVyc2Uobm9kZS5ib2R5KTtcbiAgICAgICAgICAgIHJvb3QucG9wQ29udGV4dCgpO1xuICAgICAgICAgICAgcmV0dXJuIHdhbGsuVmlzaXRvck9wdGlvbi5Ta2lwO1xuICAgICAgICB9LFxuXG4gICAgICAgIElmU3RhdGVtZW50OiAoZnVuY3Rpb24oKSB7XG5cbiAgICAgICAgICAgIHZhciBjX2V2YWx1YXRlID0gZnVuY3Rpb24oZXhwKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICEhZXhwO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24obm9kZSwgY3R4LCByb290KSB7XG4gICAgICAgICAgICAgICAgcm9vdC50cmF2ZXJzZShub2RlLnRlc3QpO1xuICAgICAgICAgICAgICAgIHZhciB0ZXN0ID0gbmV3IEFubm90YXRpb24obm9kZS50ZXN0KTtcbiAgICAgICAgICAgICAgICBpZiAodGVzdC5oYXNTdGF0aWNWYWx1ZSgpKSB7IC8vIEdyZWF0ISBXZSBjYW4gZXZhbHVhdGUgaXQhXG4gICAgICAgICAgICAgICAgICAgIC8vY29uc29sZS5sb2coXCJTdGF0aWMgdmFsdWUgaW4gaWYgdGVzdCFcIik7XG4gICAgICAgICAgICAgICAgICAgIHZhciB0ZXN0UmVzdWx0ID0gY19ldmFsdWF0ZSh0ZXN0LmdldFN0YXRpY1ZhbHVlKCkpO1xuICAgICAgICAgICAgICAgICAgICBpZighdGVzdFJlc3VsdCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG5vZGUuYWx0ZXJuYXRlKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJvb3QudHJhdmVyc2Uobm9kZS5hbHRlcm5hdGUpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgY29uc2VxdWVudCA9IG5ldyBBbm5vdGF0aW9uKG5vZGUuY29uc2VxdWVudCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zZXF1ZW50LmVsaW1pbmF0ZSgpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgcm9vdC50cmF2ZXJzZShub2RlLmNvbnNlcXVlbnQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYobm9kZS5hbHRlcm5hdGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgYWx0ZXJuYXRlID0gbmV3IEFubm90YXRpb24obm9kZS5hbHRlcm5hdGUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFsdGVybmF0ZS5lbGltaW5hdGUoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gd2Fsay5WaXNpdG9yT3B0aW9uLlNraXA7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KCkpLFxuXG4gICAgICAgIFZhcmlhYmxlRGVjbGFyYXRpb246IGZ1bmN0aW9uKG5vZGUsIGN0eCkge1xuICAgICAgICAgICAgY3R4LmluRGVjbGFyYXRpb24gPSB0cnVlO1xuICAgICAgICB9LFxuXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEBwYXJhbSB7T2JqZWN0fSBub2RlXG4gICAgICAgICAqIEBwYXJhbSB7Q29udGV4dH0gcGFyZW50Q29udGV4dFxuICAgICAgICAgKiBAcGFyYW0ge1R5cGVJbmZlcmVuY2V9IHJvb3RcbiAgICAgICAgICovXG4gICAgICAgIEZ1bmN0aW9uRGVjbGFyYXRpb246IGZ1bmN0aW9uKG5vZGUsIHBhcmVudENvbnRleHQsIHJvb3QpIHtcbiAgICAgICAgICAgIHZhciByZXN1bHQgPSBuZXcgRnVuY3Rpb25Bbm5vdGF0aW9uKG5vZGUpO1xuXG4gICAgICAgICAgICBpZiAobm9kZS5pZC50eXBlICE9IFN5bnRheC5JZGVudGlmaWVyKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiRHluYW1pYyB2YXJpYWJsZSBuYW1lcyBhcmUgbm90IHlldCBzdXBwb3J0ZWRcIik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB2YXIgZnVuY3Rpb25OYW1lID0gbm9kZS5pZC5uYW1lO1xuICAgICAgICAgICAgdmFyIGZ1bmN0aW9uQ29udGV4dCA9IHJvb3QuY3JlYXRlQ29udGV4dChub2RlLCBwYXJlbnRDb250ZXh0LCBmdW5jdGlvbk5hbWUpO1xuICAgICAgICAgICAgZnVuY3Rpb25Db250ZXh0LmRlY2xhcmVQYXJhbWV0ZXJzKG5vZGUucGFyYW1zKTtcbiAgICAgICAgICAgIHJvb3QucHVzaENvbnRleHQoZnVuY3Rpb25Db250ZXh0KTtcbiAgICAgICAgICAgIGlmKGZ1bmN0aW9uQ29udGV4dC5zdHIoKSAhPSByb290LmVudHJ5UG9pbnQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gd2Fsay5WaXNpdG9yT3B0aW9uLlNraXA7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICB2YXIgZXhpdEhhbmRsZXIgPSB7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBAcGFyYW0gbm9kZVxuICAgICAgICAgKiBAcGFyYW0ge0NvbnRleHR9IGN0eFxuICAgICAgICAgKiBAcGFyYW0ge1R5cGVJbmZlcmVuY2V9IHJvb3RcbiAgICAgICAgICovXG4gICAgICAgIEZ1bmN0aW9uRGVjbGFyYXRpb246IGZ1bmN0aW9uKG5vZGUsIGN0eCwgcm9vdCkge1xuICAgICAgICAgICAgdmFyIHJlc3VsdCA9IG5ldyBGdW5jdGlvbkFubm90YXRpb24obm9kZSk7XG4gICAgICAgICAgICB2YXIgcmV0dXJuSW5mbyA9IGN0eC5nZXRSZXR1cm5JbmZvKCk7XG4gICAgICAgICAgICByZXN1bHQuc2V0UmV0dXJuSW5mbyhyZXR1cm5JbmZvIHx8IHsgdHlwZTogVFlQRVMuVU5ERUZJTkVEIH0pO1xuICAgICAgICAgICAgcm9vdC5wb3BDb250ZXh0KCk7XG4gICAgICAgIH0sXG4gICAgICAgIFZhcmlhYmxlRGVjbGFyYXRpb246IGZ1bmN0aW9uKG5vZGUsIGN0eCkge1xuICAgICAgICAgICAgY3R4LmluRGVjbGFyYXRpb24gPSBmYWxzZTtcbiAgICAgICAgfSxcbiAgICAgICAgVmFyaWFibGVEZWNsYXJhdG9yOiBmdW5jdGlvbihub2RlLCBjdHgpIHtcbiAgICAgICAgICAgIHZhciByZXN1bHQgPSBuZXcgQW5ub3RhdGlvbihub2RlKTtcblxuICAgICAgICAgICAgaWYgKG5vZGUuaWQudHlwZSAhPSBTeW50YXguSWRlbnRpZmllcikge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIkR5bmFtaWMgdmFyaWFibGUgbmFtZXMgYXJlIG5vdCB5ZXQgc3VwcG9ydGVkXCIpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFyIHZhcmlhYmxlTmFtZSA9IG5vZGUuaWQubmFtZTtcbiAgICAgICAgICAgIGN0eC5kZWNsYXJlVmFyaWFibGUodmFyaWFibGVOYW1lLCB0cnVlLCByZXN1bHQpO1xuXG4gICAgICAgICAgICBpZiAobm9kZS5pbml0KSB7XG4gICAgICAgICAgICAgICAgdmFyIGluaXQgPSBjdHguY3JlYXRlVHlwZUluZm8obm9kZS5pbml0KTtcbiAgICAgICAgICAgICAgICByZXN1bHQuY29weShpbml0KTtcbiAgICAgICAgICAgICAgICBjdHgudXBkYXRlRXhwcmVzc2lvbih2YXJpYWJsZU5hbWUsIGluaXQpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXN1bHQuc2V0VHlwZShUWVBFUy5VTkRFRklORUQpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gVE9ETzogcmVzdWx0LnNldFR5cGUoaW5pdC5nZXRUeXBlKCkpO1xuICAgICAgICB9LFxuICAgICAgICBSZXR1cm5TdGF0ZW1lbnQ6IGZ1bmN0aW9uKG5vZGUsIHBhcmVudCwgY3R4KSB7XG4gICAgICAgICAgICB2YXIgcmVzdWx0ID0gbmV3IEFubm90YXRpb24obm9kZSksXG4gICAgICAgICAgICAgICAgYXJndW1lbnQgPSBub2RlLmFyZ3VtZW50ID8gY3R4LmNyZWF0ZVR5cGVJbmZvKG5vZGUuYXJndW1lbnQpIDogbnVsbDtcblxuICAgICAgICAgICAgaWYgKGFyZ3VtZW50KSB7XG4gICAgICAgICAgICAgICAgcmVzdWx0LmNvcHkoYXJndW1lbnQpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXN1bHQuc2V0VHlwZShUWVBFUy5VTkRFRklORUQpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY3R4LnVwZGF0ZVJldHVybkluZm8ocmVzdWx0KTtcbiAgICAgICAgfVxuXG4gICAgfVxuXG5cblxuXG4gICAgdmFyIGVudGVyU3RhdGVtZW50ID0gZnVuY3Rpb24gKG5vZGUsIHBhcmVudCwgY3R4KSB7XG4gICAgICAgIHN3aXRjaCAobm9kZS50eXBlKSB7XG4gICAgICAgICAgICBjYXNlIFN5bnRheC5Gb3JTdGF0ZW1lbnQ6XG4gICAgICAgICAgICAgICAgcmV0dXJuIGVudGVySGFuZGxlci5Gb3JTdGF0ZW1lbnQobm9kZSwgY3R4LCB0aGlzKTtcbiAgICAgICAgICAgIGNhc2UgU3ludGF4LklmU3RhdGVtZW50OlxuICAgICAgICAgICAgICAgIHJldHVybiBlbnRlckhhbmRsZXIuSWZTdGF0ZW1lbnQobm9kZSwgY3R4LCB0aGlzKTtcbiAgICAgICAgICAgIGNhc2UgU3ludGF4LlZhcmlhYmxlRGVjbGFyYXRpb246XG4gICAgICAgICAgICAgICAgcmV0dXJuIGVudGVySGFuZGxlci5WYXJpYWJsZURlY2xhcmF0aW9uKG5vZGUsIGN0eCk7XG4gICAgICAgICAgICBjYXNlIFN5bnRheC5GdW5jdGlvbkRlY2xhcmF0aW9uOlxuICAgICAgICAgICAgICAgIHJldHVybiBlbnRlckhhbmRsZXIuRnVuY3Rpb25EZWNsYXJhdGlvbihub2RlLCBjdHgsIHRoaXMpO1xuXG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuO1xuXG5cbiAgICB9O1xuXG4gICAgdmFyIGV4aXRTdGF0ZW1lbnQgPSBmdW5jdGlvbiAobm9kZSwgcGFyZW50LCBjdHgpIHtcblxuICAgICAgICBzd2l0Y2ggKG5vZGUudHlwZSkge1xuICAgICAgICAgICAgY2FzZSBTeW50YXguRXhwcmVzc2lvblN0YXRlbWVudDpcbiAgICAgICAgICAgICAgICB2YXIgcmVzdWx0ID0gbmV3IEFubm90YXRpb24obm9kZSksXG4gICAgICAgICAgICAgICAgICAgIGV4cHJlc3Npb24gPSBuZXcgQW5ub3RhdGlvbihub2RlLmV4cHJlc3Npb24pO1xuXG4gICAgICAgICAgICAgICAgcmVzdWx0LmNvcHkoZXhwcmVzc2lvbik7XG5cbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgU3ludGF4LkJsb2NrU3RhdGVtZW50OlxuICAgICAgICAgICAgICAgIGxvZyhub2RlLnR5cGUgKyBcIiBpcyBub3QgaGFuZGxlIHlldC5cIik7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIFN5bnRheC5CcmVha1N0YXRlbWVudDpcbiAgICAgICAgICAgICAgICBsb2cobm9kZS50eXBlICsgXCIgaXMgbm90IGhhbmRsZSB5ZXQuXCIpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBTeW50YXguQ2F0Y2hDbGF1c2U6XG4gICAgICAgICAgICAgICAgbG9nKG5vZGUudHlwZSArIFwiIGlzIG5vdCBoYW5kbGUgeWV0LlwiKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgU3ludGF4LkNvbnRpbnVlU3RhdGVtZW50OlxuICAgICAgICAgICAgICAgIGxvZyhub2RlLnR5cGUgKyBcIiBpcyBub3QgaGFuZGxlIHlldC5cIik7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIFN5bnRheC5EaXJlY3RpdmVTdGF0ZW1lbnQ6XG4gICAgICAgICAgICAgICAgbG9nKG5vZGUudHlwZSArIFwiIGlzIG5vdCBoYW5kbGUgeWV0LlwiKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgU3ludGF4LkRvV2hpbGVTdGF0ZW1lbnQ6XG4gICAgICAgICAgICAgICAgbG9nKG5vZGUudHlwZSArIFwiIGlzIG5vdCBoYW5kbGUgeWV0LlwiKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgU3ludGF4LkRlYnVnZ2VyU3RhdGVtZW50OlxuICAgICAgICAgICAgICAgIGxvZyhub2RlLnR5cGUgKyBcIiBpcyBub3QgaGFuZGxlIHlldC5cIik7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIFN5bnRheC5FbXB0eVN0YXRlbWVudDpcbiAgICAgICAgICAgICAgICBsb2cobm9kZS50eXBlICsgXCIgaXMgbm90IGhhbmRsZSB5ZXQuXCIpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBTeW50YXguRm9yU3RhdGVtZW50OlxuICAgICAgICAgICAgICAgIGxvZyhub2RlLnR5cGUgKyBcIiBpcyBub3QgaGFuZGxlIHlldC5cIik7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIFN5bnRheC5Gb3JJblN0YXRlbWVudDpcbiAgICAgICAgICAgICAgICBsb2cobm9kZS50eXBlICsgXCIgaXMgbm90IGhhbmRsZSB5ZXQuXCIpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBTeW50YXguRnVuY3Rpb25EZWNsYXJhdGlvbjpcbiAgICAgICAgICAgICAgICByZXR1cm4gZXhpdEhhbmRsZXIuRnVuY3Rpb25EZWNsYXJhdGlvbihub2RlLCBjdHgsIHRoaXMpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBTeW50YXguSWZTdGF0ZW1lbnQ6XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIFN5bnRheC5MYWJlbGVkU3RhdGVtZW50OlxuICAgICAgICAgICAgICAgIGxvZyhub2RlLnR5cGUgKyBcIiBpcyBub3QgaGFuZGxlIHlldC5cIik7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIFN5bnRheC5Qcm9ncmFtOlxuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBTeW50YXguUmV0dXJuU3RhdGVtZW50OlxuICAgICAgICAgICAgICAgIHJldHVybiBleGl0SGFuZGxlci5SZXR1cm5TdGF0ZW1lbnQobm9kZSwgcGFyZW50LCBjdHgpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBTeW50YXguU3dpdGNoU3RhdGVtZW50OlxuICAgICAgICAgICAgICAgIGxvZyhub2RlLnR5cGUgKyBcIiBpcyBub3QgaGFuZGxlIHlldC5cIik7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIFN5bnRheC5Td2l0Y2hDYXNlOlxuICAgICAgICAgICAgICAgIGxvZyhub2RlLnR5cGUgKyBcIiBpcyBub3QgaGFuZGxlIHlldC5cIik7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIFN5bnRheC5UaHJvd1N0YXRlbWVudDpcbiAgICAgICAgICAgICAgICBsb2cobm9kZS50eXBlICsgXCIgaXMgbm90IGhhbmRsZSB5ZXQuXCIpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBTeW50YXguVHJ5U3RhdGVtZW50OlxuICAgICAgICAgICAgICAgIGxvZyhub2RlLnR5cGUgKyBcIiBpcyBub3QgaGFuZGxlIHlldC5cIik7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIFN5bnRheC5WYXJpYWJsZURlY2xhcmF0aW9uOlxuICAgICAgICAgICAgICAgIHJldHVybiBleGl0SGFuZGxlci5WYXJpYWJsZURlY2xhcmF0aW9uKG5vZGUsIGN0eCk7XG4gICAgICAgICAgICBjYXNlIFN5bnRheC5WYXJpYWJsZURlY2xhcmF0b3I6XG4gICAgICAgICAgICAgICAgZXhpdEhhbmRsZXIuVmFyaWFibGVEZWNsYXJhdG9yKG5vZGUsIGN0eCk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIFN5bnRheC5XaGlsZVN0YXRlbWVudDpcbiAgICAgICAgICAgICAgICBsb2cobm9kZS50eXBlICsgXCIgaXMgbm90IGhhbmRsZSB5ZXQuXCIpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBTeW50YXguV2l0aFN0YXRlbWVudDpcbiAgICAgICAgICAgICAgICBsb2cobm9kZS50eXBlICsgXCIgaXMgbm90IGhhbmRsZSB5ZXQuXCIpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1Vua25vd24gbm9kZSB0eXBlOiAnICsgbm9kZS50eXBlKTtcbiAgICAgICAgfVxuXG4gICAgfTtcblxuICAgIG5zLmVudGVyU3RhdGVtZW50ID0gZW50ZXJTdGF0ZW1lbnQ7XG4gICAgbnMuZXhpdFN0YXRlbWVudCA9IGV4aXRTdGF0ZW1lbnQ7XG59KGV4cG9ydHMpKTtcbiIsIihmdW5jdGlvbihucyl7XG5cbiAgICB2YXIgU2hhZGUgPSByZXF1aXJlKFwiLi4vLi4vLi4vaW50ZXJmYWNlcy5qc1wiKSxcbiAgICAgICAgVFlQRVMgPSBTaGFkZS5UWVBFUyxcbiAgICAgICAgS0lORFMgPSBTaGFkZS5PQkpFQ1RfS0lORFMsXG4gICAgICAgIFRvb2xzID0gcmVxdWlyZShcIi4vdG9vbHMuanNcIik7XG5cbiAgICB2YXIgQ29sb3JDbG9zdXJlSW5zdGFuY2UgPSB7XG4gICAgICAgIG11bHRpcGx5OiB7XG4gICAgICAgICAgICB0eXBlOiBUWVBFUy5GVU5DVElPTixcbiAgICAgICAgICAgIGV2YWx1YXRlOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiBUWVBFUy5PQkpFQ1QsXG4gICAgICAgICAgICAgICAgICAgIGtpbmQ6IEtJTkRTLkNPTE9SX0NMT1NVUkVcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBhZGQ6IHtcbiAgICAgICAgICAgIHR5cGU6IFRZUEVTLkZVTkNUSU9OLFxuICAgICAgICAgICAgZXZhbHVhdGU6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IFRZUEVTLk9CSkVDVCxcbiAgICAgICAgICAgICAgICAgICAga2luZDogS0lORFMuQ09MT1JfQ0xPU1VSRVxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgVG9vbHMuZXh0ZW5kKG5zLCB7XG4gICAgICAgIGlkOiBcIkNvbG9yQ2xvc3VyZVwiLFxuICAgICAgICBraW5kOiBLSU5EUy5DT0xPUl9DTE9TVVJFLFxuICAgICAgICBvYmplY3Q6IG51bGwsXG4gICAgICAgIGluc3RhbmNlOiBDb2xvckNsb3N1cmVJbnN0YW5jZVxuICAgIH0pO1xuXG5cbn0oZXhwb3J0cykpO1xuIiwiKGZ1bmN0aW9uIChucykge1xuXG4gICAgdmFyIG9iamVjdHMgPSB7XG4gICAgICAgIFNoYWRlIDogcmVxdWlyZShcIi4vc2hhZGUuanNcIiksXG4gICAgICAgIE1hdHJpeDQgOiByZXF1aXJlKFwiLi9tYXRyaXguanNcIiksXG4gICAgICAgIE1hdGggOiByZXF1aXJlKFwiLi9tYXRoLmpzXCIpLFxuICAgICAgICBWZWMyIDogcmVxdWlyZShcIi4vdmVjMi5qc1wiKSxcbiAgICAgICAgVmVjMyA6IHJlcXVpcmUoXCIuL3ZlYzMuanNcIiksXG4gICAgICAgIENvbG9yOiByZXF1aXJlKFwiLi92ZWMzLmpzXCIpLFxuICAgICAgICBWZWM0IDogcmVxdWlyZShcIi4vdmVjNC5qc1wiKSxcbiAgICAgICAgVGV4dHVyZSA6IHJlcXVpcmUoXCIuL3RleHR1cmUuanNcIiksXG4gICAgICAgIFN5c3RlbTogcmVxdWlyZShcIi4vc3lzdGVtLmpzXCIpLFxuICAgICAgICBDb2xvckNsb3N1cmU6IHJlcXVpcmUoXCIuL2NvbG9yY2xvc3VyZS5qc1wiKVxuICAgIH07XG5cbiAgICBleHBvcnRzLlJlZ2lzdHJ5ID0ge1xuICAgICAgICBuYW1lOiBcIlR5cGVJbmZlcmVuY2VcIixcbiAgICAgICAgZ2V0QnlOYW1lOiBmdW5jdGlvbihuYW1lKSB7XG4gICAgICAgICAgICB2YXIgcmVzdWx0ID0gb2JqZWN0c1tuYW1lXTtcbiAgICAgICAgICAgIHJldHVybiByZXN1bHQgfHwgbnVsbDtcbiAgICAgICAgfSxcbiAgICAgICAgZ2V0SW5zdGFuY2VGb3JLaW5kOiBmdW5jdGlvbihraW5kKSB7XG4gICAgICAgICAgICBmb3IodmFyIG9iaiBpbiBvYmplY3RzKSB7XG4gICAgICAgICAgICAgICAgaWYgKG9iamVjdHNbb2JqXS5raW5kID09IGtpbmQpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG9iamVjdHNbb2JqXS5pbnN0YW5jZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgfVxuICAgIH1cblxufShleHBvcnRzKSk7XG4iLCIoZnVuY3Rpb24gKG5zKSB7XG5cbiAgICB2YXIgU2hhZGUgPSByZXF1aXJlKFwiLi4vLi4vLi4vaW50ZXJmYWNlcy5qc1wiKSxcbiAgICAgICAgVFlQRVMgPSBTaGFkZS5UWVBFUyxcbiAgICAgICAgQmFzZSA9IHJlcXVpcmUoXCIuLi8uLi8uLi9iYXNlL2luZGV4LmpzXCIpLFxuICAgICAgICBUb29scyA9IHJlcXVpcmUoXCIuL3Rvb2xzLmpzXCIpO1xuXG5cbiAgICB2YXIgZXZhbHVhdGVNZXRob2QgPSBmdW5jdGlvbiAobmFtZSwgcGFyYW1Db3VudCwgcmV0dXJuVHlwZSkge1xuICAgICAgICAvKipcbiAgICAgICAgICogQHBhcmFtIHtBbm5vdGF0aW9ufSByZXN1bHRcbiAgICAgICAgICogQHBhcmFtIHtBcnJheS48QW5ub3RhdGlvbj59IGFyZ3NcbiAgICAgICAgICogQHBhcmFtIHtDb250ZXh0fSBjdHhcbiAgICAgICAgICovXG4gICAgICAgIHJldHVybiBmdW5jdGlvbiAocmVzdWx0LCBhcmdzLCBjdHgpIHtcbiAgICAgICAgICAgIGlmIChwYXJhbUNvdW50ICE9IC0xKSB7IC8vIEFyYml0cmFyeSBudW1iZXIgb2YgYXJndW1lbnRzXG4gICAgICAgICAgICAgICAgaWYgKCFhcmdzIHx8IGFyZ3MubGVuZ3RoICE9IHBhcmFtQ291bnQpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiSW52YWxpZCBudW1iZXIgb2YgcGFyYW1ldGVycyBmb3IgTWF0aC5cIiArIG5hbWUgKyBcIiwgZXhwZWN0ZWQgXCIgKyBwYXJhbUNvdW50KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHZhciBhcmdBcnJheSA9IFtdO1xuICAgICAgICAgICAgdmFyIGlzU3RhdGljID0gdHJ1ZTtcbiAgICAgICAgICAgIGFyZ3MuZm9yRWFjaChmdW5jdGlvbiAocGFyYW0sIGluZGV4KSB7XG4gICAgICAgICAgICAgICAgaWYgKCFwYXJhbS5jYW5OdW1iZXIoKSlcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiUGFyYW1ldGVyIFwiICsgaW5kZXggKyBcIiBoYXMgaW52YWxpZCB0eXBlIGZvciBNYXRoLlwiICsgbmFtZSArIFwiLCBleHBlY3RlZCAnbnVtYmVyJywgYnV0IGdvdCBcIiArIHBhcmFtLmdldFR5cGUoKSk7XG4gICAgICAgICAgICAgICAgaXNTdGF0aWMgPSBpc1N0YXRpYyAmJiBwYXJhbS5oYXNTdGF0aWNWYWx1ZSgpO1xuICAgICAgICAgICAgICAgIGlmIChpc1N0YXRpYylcbiAgICAgICAgICAgICAgICAgICAgYXJnQXJyYXkucHVzaChwYXJhbS5nZXRTdGF0aWNWYWx1ZSgpKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgdmFyIHR5cGVJbmZvID0ge1xuICAgICAgICAgICAgICAgIHR5cGU6IHJldHVyblR5cGUgfHwgVFlQRVMuTlVNQkVSXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoaXNTdGF0aWMpIHtcbiAgICAgICAgICAgICAgICB0eXBlSW5mby5zdGF0aWNWYWx1ZSA9IE1hdGhbbmFtZV0uYXBwbHkodW5kZWZpbmVkLCBhcmdBcnJheSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gdHlwZUluZm87XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICB2YXIgTWF0aE9iamVjdCA9IHtcbiAgICAgICAgcmFuZG9tOiB7XG4gICAgICAgICAgICB0eXBlOiBUWVBFUy5GVU5DVElPTixcbiAgICAgICAgICAgIGV2YWx1YXRlOiBmdW5jdGlvbihub2RlLCBhcmdzKSB7XG4gICAgICAgICAgICAgICAgaWYgKGFyZ3MubGVuZ3RoKVxuICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJNYXRoLnJhbmRvbSBoYXMgbm8gcGFyYW1ldGVycy5cIik7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogVFlQRVMuTlVNQkVSXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBhYnM6IHtcbiAgICAgICAgICAgIHR5cGU6IFRZUEVTLkZVTkNUSU9OLFxuICAgICAgICAgICAgZXZhbHVhdGU6IGZ1bmN0aW9uKHJlc3VsdCwgYXJncykge1xuICAgICAgICAgICAgICAgIFRvb2xzLmNoZWNrUGFyYW1Db3VudChyZXN1bHQubm9kZSwgXCJNYXRoLmFic1wiLCBbMV0sIGFyZ3MubGVuZ3RoKTtcbiAgICAgICAgICAgICAgICB2YXIgdHlwZUluZm8gPSB7fTtcbiAgICAgICAgICAgICAgICBzd2l0Y2goYXJnc1swXS5nZXRUeXBlKCkpIHtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBUWVBFUy5OVU1CRVI6XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgVFlQRVMuSU5UOlxuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZUluZm8udHlwZSA9IGFyZ3NbMF0uZ2V0VHlwZSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgICAgICAgICBTaGFkZS50aHJvd0Vycm9yKHJlc3VsdC5ub2RlLCBcIkludmFsaWRUeXBlIGZvciBNYXRoLmFic1wiKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIHR5cGVJbmZvO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfTtcblxuICAgIHZhciBNYXRoQ29uc3RhbnRzID0gW1wiRVwiLCBcIlBJXCIsIFwiTE4yXCIsIFwiTE9HMkVcIiwgXCJMT0cxMEVcIiwgXCJQSVwiLCBcIlNRUlQxXzJcIiwgXCJTUVJUMlwiXTtcbiAgICB2YXIgT25lUGFyYW1ldGVyTnVtYmVyTWV0aG9kcyA9IFtcImFjb3NcIiwgXCJhc2luXCIsIFwiYXRhblwiLCBcImNvc1wiLCBcImV4cFwiLCBcImxvZ1wiLCBcInJvdW5kXCIsIFwic2luXCIsIFwic3FydFwiLCBcInRhblwiXTtcbiAgICB2YXIgT25lUGFyYW1ldGVySW50TWV0aG9kcyA9IFtcImNlaWxcIiwgXCJmbG9vclwiXTtcbiAgICB2YXIgVHdvUGFyYW1ldGVyTnVtYmVyTWV0aG9kcyA9IFtcImF0YW4yXCIsIFwicG93XCJdO1xuICAgIHZhciBBcmJpdHJhcnlQYXJhbWV0ZXJOdW1iZXJNZXRob2RzID0gW1wibWF4XCIsIFwibWluXCJdO1xuXG4gICAgTWF0aENvbnN0YW50cy5mb3JFYWNoKGZ1bmN0aW9uIChjb25zdGFudCkge1xuICAgICAgICBNYXRoT2JqZWN0W2NvbnN0YW50XSA9IHsgdHlwZTogVFlQRVMuTlVNQkVSLCBzdGF0aWNWYWx1ZTogTWF0aFtjb25zdGFudF0gfTtcbiAgICB9KTtcblxuICAgIE9uZVBhcmFtZXRlck51bWJlck1ldGhvZHMuZm9yRWFjaChmdW5jdGlvbiAobWV0aG9kKSB7XG4gICAgICAgIE1hdGhPYmplY3RbbWV0aG9kXSA9IHsgdHlwZTogVFlQRVMuRlVOQ1RJT04sIGV2YWx1YXRlOiBldmFsdWF0ZU1ldGhvZChtZXRob2QsIDEpIH07XG4gICAgfSk7XG5cbiAgICBUd29QYXJhbWV0ZXJOdW1iZXJNZXRob2RzLmZvckVhY2goZnVuY3Rpb24gKG1ldGhvZCkge1xuICAgICAgICBNYXRoT2JqZWN0W21ldGhvZF0gPSB7IHR5cGU6IFRZUEVTLkZVTkNUSU9OLCBldmFsdWF0ZTogZXZhbHVhdGVNZXRob2QobWV0aG9kLCAyKSB9O1xuICAgIH0pO1xuXG4gICAgT25lUGFyYW1ldGVySW50TWV0aG9kcy5mb3JFYWNoKGZ1bmN0aW9uIChtZXRob2QpIHtcbiAgICAgICAgTWF0aE9iamVjdFttZXRob2RdID0geyB0eXBlOiBUWVBFUy5GVU5DVElPTiwgZXZhbHVhdGU6IGV2YWx1YXRlTWV0aG9kKG1ldGhvZCwgMSwgVFlQRVMuSU5UKSB9O1xuICAgIH0pO1xuXG4gICAgQXJiaXRyYXJ5UGFyYW1ldGVyTnVtYmVyTWV0aG9kcy5mb3JFYWNoKGZ1bmN0aW9uIChtZXRob2QpIHtcbiAgICAgICAgTWF0aE9iamVjdFttZXRob2RdID0geyB0eXBlOiBUWVBFUy5GVU5DVElPTiwgZXZhbHVhdGU6IGV2YWx1YXRlTWV0aG9kKG1ldGhvZCwgLTEpIH07XG4gICAgfSk7XG5cbiAgICBCYXNlLmV4dGVuZChucywge1xuICAgICAgICBpZDogXCJNYXRoXCIsXG4gICAgICAgIG9iamVjdDoge1xuICAgICAgICAgICAgY29uc3RydWN0b3I6IG51bGwsXG4gICAgICAgICAgICBzdGF0aWM6IE1hdGhPYmplY3RcbiAgICAgICAgfSxcbiAgICAgICAgaW5zdGFuY2U6IE1hdGhPYmplY3RcbiAgICB9KTtcblxuXG59KGV4cG9ydHMpKTtcbiIsIihmdW5jdGlvbiAobnMpIHtcblxuICAgIHZhciBpbnRlcmZhY2VzID0gcmVxdWlyZShcIi4uLy4uLy4uL2ludGVyZmFjZXMuanNcIiksXG4gICAgVG9vbHMgPSByZXF1aXJlKFwiLi90b29scy5qc1wiKTtcblxuICAgIHZhciBUWVBFUyA9IGludGVyZmFjZXMuVFlQRVMsXG4gICAgICAgIEtJTkRTID0gaW50ZXJmYWNlcy5PQkpFQ1RfS0lORFM7XG5cbiAgICB2YXIgTWF0cml4SW5zdGFuY2UgPSB7XG4gICAgICAgIHRyYW5zZm9ybVBvaW50OiB7XG4gICAgICAgICAgICB0eXBlOiBUWVBFUy5VTkRFRklORUQsXG4gICAgICAgICAgICBldmFsdWF0ZTogZnVuY3Rpb24ocmVzdWx0LCBhcmdzKSB7XG4gICAgICAgICAgICAgICAgVG9vbHMuY2hlY2tQYXJhbUNvdW50KHJlc3VsdC5ub2RlLCBcIk1hdHJpeDo6dHJhbnNmb3JtUG9pbnRcIiwgWzEsMl0sIGFyZ3MubGVuZ3RoKTtcbiAgICAgICAgICAgICAgICB2YXIgc291cmNlUG9pbnQgPSB0YXJnZXRQb2ludCA9IGFyZ3NbMF07XG4gICAgICAgICAgICAgICAgaWYgKCEoc291cmNlUG9pbnQuaXNPYmplY3QoKSAmJiBzb3VyY2VQb2ludC5jYW5Ob3JtYWwoKSkpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiRmlyc3QgYXJndW1lbnQgb2YgTWF0cml4Ojp0cmFuc2Zvcm1Qb2ludCBtdXN0IGV2YWx1YXRlIHRvIGEgcG9pbnQsIGZvdW5kOiBcIiArIHNvdXJjZVBvaW50LmdldFR5cGVTdHJpbmcoKSk7XG4gICAgICAgICAgICAgICAgfVxuXG5cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIFRvb2xzLmV4dGVuZChucywge1xuICAgICAgICBpZDogXCJNYXRyaXg0XCIsXG4gICAgICAgIGtpbmQ6IFwibWF0cml4NFwiLFxuICAgICAgICBvYmplY3Q6IHtcbiAgICAgICAgICAgIGNvbnN0cnVjdG9yOiBudWxsLFxuICAgICAgICAgICAgc3RhdGljOiBudWxsXG4gICAgICAgIH0sXG4gICAgICAgIGluc3RhbmNlOiBNYXRyaXhJbnN0YW5jZVxuICAgIH0pO1xuXG59KGV4cG9ydHMpKTtcbiIsIihmdW5jdGlvbihucyl7XG5cbiAgICB2YXIgU2hhZGUgPSByZXF1aXJlKFwiLi4vLi4vLi4vaW50ZXJmYWNlcy5qc1wiKSxcbiAgICAgICAgVFlQRVMgPSBTaGFkZS5UWVBFUyxcbiAgICAgICAgS0lORFMgPSBTaGFkZS5PQkpFQ1RfS0lORFMsXG4gICAgICAgIEJhc2UgPSByZXF1aXJlKFwiLi4vLi4vLi4vYmFzZS9pbmRleC5qc1wiKSxcbiAgICAgICAgVG9vbHMgPSByZXF1aXJlKFwiLi90b29scy5qc1wiKTtcblxuICAgIHZhciBTaGFkZU9iamVjdCA9IHtcbiAgICAgICAgZGlmZnVzZToge1xuICAgICAgICAgICAgdHlwZTogVFlQRVMuRlVOQ1RJT04sXG4gICAgICAgICAgICBldmFsdWF0ZTogZnVuY3Rpb24ocmVzdWx0LCBhcmdzLCBjdHgpIHtcbiAgICAgICAgICAgICAgICBpZiAoYXJncy5sZW5ndGggPCAxKVxuICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJTaGFkZS5kaWZmdXNlIGV4cGVjdHMgYXQgbGVhc3QgMSBwYXJhbWV0ZXIuXCIpXG4gICAgICAgICAgICAgICAgdmFyIG5vcm1hbCA9IGFyZ3NbMF07XG4gICAgICAgICAgICAgICAgaWYoIShub3JtYWwgJiYgbm9ybWFsLmNhbk5vcm1hbCgpKSkge1xuICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJGaXJzdCBhcmd1bWVudCBvZiBTaGFkZS5kaWZmdXNlIG11c3QgZXZhbHVhdGUgdG8gYSBub3JtYWxcIik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChhcmdzLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGNvbG9yID0gYXJnc1sxXTtcbiAgICAgICAgICAgICAgICAgICAgLy9jb25zb2xlLmxvZyhcIkNvbG9yOiBcIiwgY29sb3Iuc3RyKCksIGNvbG9yLmdldFR5cGUoY3R4KSk7XG4gICAgICAgICAgICAgICAgICAgIGlmKCFjb2xvci5jYW5Db2xvcigpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJTZWNvbmQgYXJndW1lbnQgb2YgU2hhZGUuZGlmZnVzZSBtdXN0IGV2YWx1YXRlIHRvIGEgY29sb3IuIEZvdW5kOiBcIiArIGNvbG9yLnN0cigpKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiBUWVBFUy5PQkpFQ1QsXG4gICAgICAgICAgICAgICAgICAgIGtpbmQ6IEtJTkRTLkNPTE9SX0NMT1NVUkVcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBwaG9uZzoge1xuICAgICAgICAgICAgdHlwZTogVFlQRVMuRlVOQ1RJT04sXG4gICAgICAgICAgICBldmFsdWF0ZTogZnVuY3Rpb24ocmVzdWx0LCBhcmdzLCBjdHgpIHtcbiAgICAgICAgICAgICAgICBpZiAoYXJncy5sZW5ndGggPCAxKVxuICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJTaGFkZS5waG9uZyBleHBlY3RzIGF0IGxlYXN0IDEgcGFyYW1ldGVyLlwiKVxuICAgICAgICAgICAgICAgIHZhciBub3JtYWwgPSBhcmdzWzBdO1xuICAgICAgICAgICAgICAgIGlmKCEobm9ybWFsICYmIG5vcm1hbC5jYW5Ob3JtYWwoKSkpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiRmlyc3QgYXJndW1lbnQgb2YgU2hhZGUucGhvbmcgbXVzdCBldmFsdWF0ZSB0byBhIG5vcm1hbFwiKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKGFyZ3MubGVuZ3RoID4gMSkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgc2hpbmluZXNzID0gYXJnc1sxXTtcbiAgICAgICAgICAgICAgICAgICAgLy9jb25zb2xlLmxvZyhcIkNvbG9yOiBcIiwgY29sb3Iuc3RyKCksIGNvbG9yLmdldFR5cGUoY3R4KSk7XG4gICAgICAgICAgICAgICAgICAgIGlmKCFzaGluaW5lc3MuY2FuTnVtYmVyKCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIlNlY29uZCBhcmd1bWVudCBvZiBTaGFkZS5waG9uZyBtdXN0IGV2YWx1YXRlIHRvIGEgbnVtYmVyLiBGb3VuZDogXCIgKyBjb2xvci5zdHIoKSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogVFlQRVMuT0JKRUNULFxuICAgICAgICAgICAgICAgICAgICBraW5kOiBLSU5EUy5DT0xPUl9DTE9TVVJFXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgY2xhbXA6IHtcbiAgICAgICAgICAgIHR5cGU6IFRZUEVTLkZVTkNUSU9OLFxuICAgICAgICAgICAgZXZhbHVhdGU6IGZ1bmN0aW9uKHJlc3VsdCwgYXJncykge1xuICAgICAgICAgICAgICAgIFRvb2xzLmNoZWNrUGFyYW1Db3VudChyZXN1bHQubm9kZSwgXCJTaGFkZS5jbGFtcFwiLCBbM10sIGFyZ3MubGVuZ3RoKTtcblxuICAgICAgICAgICAgICAgIGlmIChhcmdzLmV2ZXJ5KGZ1bmN0aW9uKGUpIHsgcmV0dXJuIGUuY2FuTnVtYmVyKCk7IH0pKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciB0eXBlSW5mbyA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6IFRZUEVTLk5VTUJFUlxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGlmIChUb29scy5hbGxBcmd1bWVudHNBcmVTdGF0aWMoYXJncykpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBjYWxsQXJncyA9IGFyZ3MubWFwKGZ1bmN0aW9uKGEpIHtyZXR1cm4gYS5nZXRTdGF0aWNWYWx1ZSgpOyB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGVJbmZvLnN0YXRpY1ZhbHVlID0gU2hhZGUuU2hhZGUuY2xhbXAuYXBwbHkobnVsbCwgY2FsbEFyZ3MpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0eXBlSW5mbztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgU2hhZGUudGhyb3dFcnJvcihyZXN1bHQubm9kZSwgXCJTaGFkZS5jbGFtcCBub3Qgc3VwcG9ydGVkIHdpdGggYXJndW1lbnQgdHlwZXM6IFwiICsgYXJncy5tYXAoZnVuY3Rpb24oYXJnKSB7IHJldHVybiBhcmcuZ2V0VHlwZVN0cmluZygpOyB9KS5qb2luKFwiLCBcIikpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBzbW9vdGhzdGVwOiB7XG4gICAgICAgICAgICB0eXBlOiBUWVBFUy5GVU5DVElPTixcbiAgICAgICAgICAgIGV2YWx1YXRlOiBmdW5jdGlvbihyZXN1bHQsIGFyZ3MsIGN0eCkge1xuICAgICAgICAgICAgICAgIFRvb2xzLmNoZWNrUGFyYW1Db3VudChyZXN1bHQubm9kZSwgXCJTaGFkZS5zbW9vdGhzdGVwXCIsIFszXSwgYXJncy5sZW5ndGgpO1xuXG4gICAgICAgICAgICAgICAgaWYgKGFyZ3MuZXZlcnkoZnVuY3Rpb24oZSkgeyByZXR1cm4gZS5jYW5OdW1iZXIoKTsgfSkpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHR5cGVJbmZvID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogVFlQRVMuTlVNQkVSXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgaWYgKFRvb2xzLmFsbEFyZ3VtZW50c0FyZVN0YXRpYyhhcmdzKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGNhbGxBcmdzID0gYXJncy5tYXAoZnVuY3Rpb24oYSkge3JldHVybiBhLmdldFN0YXRpY1ZhbHVlKCk7IH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZUluZm8uc3RhdGljVmFsdWUgPSBTaGFkZS5TaGFkZS5zbW9vdGhzdGVwLmFwcGx5KG51bGwsIGNhbGxBcmdzKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHlwZUluZm87XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFNoYWRlLnRocm93RXJyb3IocmVzdWx0Lm5vZGUsIFwiU2hhZGUuc21vb3Roc3RlcCBub3Qgc3VwcG9ydGVkIHdpdGggYXJndW1lbnQgdHlwZXM6IFwiICsgYXJncy5tYXAoZnVuY3Rpb24oYXJnKSB7IHJldHVybiBhcmcuZ2V0VHlwZVN0cmluZygpOyB9KS5qb2luKFwiLCBcIikpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBzdGVwOiB7XG4gICAgICAgICAgICB0eXBlOiBUWVBFUy5GVU5DVElPTixcbiAgICAgICAgICAgIGV2YWx1YXRlOiBmdW5jdGlvbihyZXN1bHQsIGFyZ3MsIGN0eCkge1xuICAgICAgICAgICAgICAgIFRvb2xzLmNoZWNrUGFyYW1Db3VudChyZXN1bHQubm9kZSwgXCJTaGFkZS5zdGVwXCIsIFsyXSwgYXJncy5sZW5ndGgpO1xuXG4gICAgICAgICAgICAgICAgaWYgKGFyZ3MuZXZlcnkoZnVuY3Rpb24oZSkgeyByZXR1cm4gZS5jYW5OdW1iZXIoKTsgfSkpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHR5cGVJbmZvID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogVFlQRVMuTlVNQkVSXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgaWYgKFRvb2xzLmFsbEFyZ3VtZW50c0FyZVN0YXRpYyhhcmdzKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGNhbGxBcmdzID0gYXJncy5tYXAoZnVuY3Rpb24oYSkge3JldHVybiBhLmdldFN0YXRpY1ZhbHVlKCk7IH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZUluZm8uc3RhdGljVmFsdWUgPSBTaGFkZS5TaGFkZS5zdGVwLmFwcGx5KG51bGwsIGNhbGxBcmdzKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHlwZUluZm87XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFNoYWRlLnRocm93RXJyb3IocmVzdWx0Lm5vZGUsIFwiU2hhZGUuc3RlcCBub3Qgc3VwcG9ydGVkIHdpdGggYXJndW1lbnQgdHlwZXM6IFwiICsgYXJncy5tYXAoZnVuY3Rpb24oYXJnKSB7IHJldHVybiBhcmcuZ2V0VHlwZVN0cmluZygpOyB9KS5qb2luKFwiLCBcIikpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBmcmFjdDoge1xuICAgICAgICAgICAgdHlwZTogVFlQRVMuRlVOQ1RJT04sXG4gICAgICAgICAgICBldmFsdWF0ZTogZnVuY3Rpb24ocmVzdWx0LCBhcmdzKSB7XG4gICAgICAgICAgICAgICAgVG9vbHMuY2hlY2tQYXJhbUNvdW50KHJlc3VsdC5ub2RlLCBcIlNoYWRlLmZyYWN0XCIsIFsxXSwgYXJncy5sZW5ndGgpO1xuXG4gICAgICAgICAgICAgICAgdmFyIHggPSBhcmdzWzBdO1xuICAgICAgICAgICAgICAgIGlmICh4LmNhbk51bWJlcigpKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciB0eXBlSW5mbyA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6IFRZUEVTLk5VTUJFUlxuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKHguaGFzU3RhdGljVmFsdWUoKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZUluZm8uc3RhdGljVmFsdWUgPSBTaGFkZS5TaGFkZS5mcmFjdCh4LmdldFN0YXRpY1ZhbHVlKCkpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0eXBlSW5mbztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgU2hhZGUudGhyb3dFcnJvcihyZXN1bHQubm9kZSwgXCJTaGFkZS5mcmFjdCBub3Qgc3VwcG9ydGVkIHdpdGggYXJndW1lbnQgdHlwZXM6IFwiICsgYXJncy5tYXAoZnVuY3Rpb24oYXJnKSB7IHJldHVybiBhcmcuZ2V0VHlwZVN0cmluZygpOyB9KS5qb2luKFwiLCBcIikpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfTtcblxuICAgIEJhc2UuZXh0ZW5kKG5zLCB7XG4gICAgICAgIGlkOiBcIlNoYWRlXCIsXG4gICAgICAgIG9iamVjdDoge1xuICAgICAgICAgICAgY29uc3RydWN0b3I6IG51bGwsXG4gICAgICAgICAgICBzdGF0aWM6IFNoYWRlT2JqZWN0XG4gICAgICAgIH0sXG4gICAgICAgIGluc3RhbmNlOiBudWxsXG4gICAgfSk7XG5cbn0oZXhwb3J0cykpO1xuIiwiKGZ1bmN0aW9uKG5zKXtcblxuICAgIHZhciBTaGFkZSA9IHJlcXVpcmUoXCIuLi8uLi8uLi9pbnRlcmZhY2VzLmpzXCIpLFxuICAgICAgICBUWVBFUyA9IFNoYWRlLlRZUEVTLFxuICAgICAgICBLSU5EUyA9IFNoYWRlLk9CSkVDVF9LSU5EUyxcbiAgICAgICAgQmFzZSA9IHJlcXVpcmUoXCIuLi8uLi8uLi9iYXNlL2luZGV4LmpzXCIpO1xuXG4gICAgdmFyIFN5c3RlbU9iamVjdCA9IHtcbiAgICAgICAgY29vcmRzOiB7XG4gICAgICAgICAgICB0eXBlOiBUWVBFUy5PQkpFQ1QsXG4gICAgICAgICAgICBraW5kOiBLSU5EUy5GTE9BVDNcbiAgICAgICAgfSxcbiAgICAgICAgbm9ybWFsaXplZENvb3Jkczoge1xuICAgICAgICAgICAgdHlwZTogVFlQRVMuT0JKRUNULFxuICAgICAgICAgICAga2luZDogS0lORFMuRkxPQVQzXG4gICAgICAgIH0sXG4gICAgICAgIGhlaWdodDoge1xuICAgICAgICAgICAgdHlwZTogVFlQRVMuSU5UXG4gICAgICAgIH0sXG4gICAgICAgIHdpZHRoOiB7XG4gICAgICAgICAgICB0eXBlOiBUWVBFUy5JTlRcbiAgICAgICAgfVxuXG4gICAgfTtcblxuICAgIEJhc2UuZXh0ZW5kKG5zLCB7XG4gICAgICAgIGlkOiBcIlN5c3RlbVwiLFxuICAgICAgICBvYmplY3Q6IHtcbiAgICAgICAgICAgIGNvbnN0cnVjdG9yOiBudWxsLFxuICAgICAgICAgICAgc3RhdGljOiBTeXN0ZW1PYmplY3RcbiAgICAgICAgfSxcbiAgICAgICAgaW5zdGFuY2U6IG51bGxcbiAgICB9KTtcblxufShleHBvcnRzKSk7XG4iLCIoZnVuY3Rpb24obnMpe1xuXG4gICAgdmFyIFNoYWRlID0gcmVxdWlyZShcIi4uLy4uLy4uL2ludGVyZmFjZXMuanNcIiksXG4gICAgICAgIFRZUEVTID0gU2hhZGUuVFlQRVMsXG4gICAgICAgIEtJTkRTID0gU2hhZGUuT0JKRUNUX0tJTkRTLFxuICAgICAgICBUb29scyA9IHJlcXVpcmUoXCIuL3Rvb2xzLmpzXCIpO1xuXG4gICAgdmFyIFRleHR1cmVDb25zdHJ1Y3RvciA9ICB7XG4gICAgICAgIHR5cGU6IFRZUEVTLk9CSkVDVCxcbiAgICAgICAga2luZDogS0lORFMuVEVYVFVSRSxcbiAgICAgICAgLyoqXG4gICAgICAgICAqIEBwYXJhbSB7QW5ub3RhdGlvbn0gcmVzdWx0XG4gICAgICAgICAqIEBwYXJhbSB7QXJyYXkuPEFubm90YXRpb24+fSBhcmdzXG4gICAgICAgICAqIEBwYXJhbSB7Q29udGV4dH0gY3R4XG4gICAgICAgICAqL1xuICAgICAgICBldmFsdWF0ZTogZnVuY3Rpb24ocmVzdWx0LCBhcmdzLCBjdHgpIHtcbiAgICAgICAgICAgIFNoYWRlLnRocm93RXJyb3IocmVzdWx0Lm5vZGUsIFwiQ29uc3RydWN0aW9uIG9mIFRleHR1cmVzIGlzIG5vdCBzdXBwb3J0ZWQuXCIgKTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICB2YXIgVGV4dHVyZVN0YXRpY09iamVjdCA9IHtcbiAgICB9O1xuXG4gICAgdmFyIFRleHR1cmVJbnN0YW5jZSA9IHtcbiAgICB9O1xuICAgIFRvb2xzLlZlYy5hdHRhY2hWZWNNZXRob2RzKFRleHR1cmVJbnN0YW5jZSwgXCJUZXh0dXJlXCIsIGZhbHNlLCA0LCAyLCBbJ3NhbXBsZTJEJ10pO1xuXG5cbiAgICBUb29scy5leHRlbmQobnMsIHtcbiAgICAgICAgaWQ6IFwiVGV4dHVyZVwiLFxuICAgICAgICBraW5kOiBLSU5EUy5URVhUVVJFLFxuICAgICAgICBvYmplY3Q6IHtcbiAgICAgICAgICAgIGNvbnN0cnVjdG9yOiBUZXh0dXJlQ29uc3RydWN0b3IsXG4gICAgICAgICAgICBzdGF0aWM6IFRleHR1cmVTdGF0aWNPYmplY3RcbiAgICAgICAgfSxcbiAgICAgICAgaW5zdGFuY2U6IFRleHR1cmVJbnN0YW5jZVxuICAgIH0pO1xuXG5cbn0oZXhwb3J0cykpO1xuIiwiKGZ1bmN0aW9uKG5zKXtcbiAgICB2YXIgQmFzZSA9IHJlcXVpcmUoXCIuLi8uLi8uLi9iYXNlL2luZGV4LmpzXCIpO1xuICAgIHZhciBTaGFkZSA9IHJlcXVpcmUoXCIuLi8uLi8uLi9pbnRlcmZhY2VzLmpzXCIpLFxuICAgICAgICBUWVBFUyA9IFNoYWRlLlRZUEVTLFxuICAgICAgICBLSU5EUyA9IFNoYWRlLk9CSkVDVF9LSU5EUyxcbiAgICAgICAgVmVjQmFzZSA9IHJlcXVpcmUoXCIuLi8uLi8uLi9iYXNlL3ZlYy5qc1wiKTtcblxuICAgIHZhciBhbGxBcmd1bWVudHNBcmVTdGF0aWMgPSBmdW5jdGlvbiAoYXJncykge1xuICAgICAgICByZXR1cm4gYXJncy5ldmVyeShmdW5jdGlvbiAoYXJnKSB7XG4gICAgICAgICAgICByZXR1cm4gYXJnLmhhc1N0YXRpY1ZhbHVlKClcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgbnMuY2hlY2tQYXJhbUNvdW50ID0gZnVuY3Rpb24obm9kZSwgbmFtZSwgYWxsb3dlZCwgaXMpIHtcbiAgICAgICAgaWYgKGFsbG93ZWQuaW5kZXhPZihpcykgPT0gLTEpIHtcbiAgICAgICAgICAgIFNoYWRlLnRocm93RXJyb3Iobm9kZSwgXCJJbnZhbGlkIG51bWJlciBvZiBwYXJhbWV0ZXJzIGZvciBcIiArIG5hbWUgKyBcIiwgZXhwZWN0ZWQgXCIgKyBhbGxvd2VkLmpvaW4oXCIgb3IgXCIpICsgXCIsIGZvdW5kOiBcIiArIGlzKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIG5zLnNpbmdsZUFjY2Vzc29yID0gZnVuY3Rpb24gKG5hbWUsIG9iaiwgdmFsaWRBcmdDb3VudHMsIHN0YXRpY1ZhbHVlRnVuY3Rpb24pIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHR5cGU6IFRZUEVTLkZVTkNUSU9OLFxuICAgICAgICAgICAgZXZhbHVhdGU6IGZ1bmN0aW9uIChyZXN1bHQsIGFyZ3MsIGN0eCwgY2FsbE9iamVjdCkge1xuICAgICAgICAgICAgICAgIG5zLmNoZWNrUGFyYW1Db3VudChyZXN1bHQubm9kZSwgbmFtZSwgdmFsaWRBcmdDb3VudHMsIGFyZ3MubGVuZ3RoKTtcbiAgICAgICAgICAgICAgICB2YXIgdHlwZUluZm8gPSAgYXJncy5sZW5ndGggPyBvYmogOiB7IHR5cGU6IFRZUEVTLk5VTUJFUiB9O1xuXG4gICAgICAgICAgICAgICAgaWYgKHN0YXRpY1ZhbHVlRnVuY3Rpb24gJiYgY2FsbE9iamVjdC5oYXNTdGF0aWNWYWx1ZSgpICYmIGFyZ3MuZXZlcnkoZnVuY3Rpb24oYSkge3JldHVybiBhLmhhc1N0YXRpY1ZhbHVlKCk7IH0pKSB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGVJbmZvLnN0YXRpY1ZhbHVlID0gc3RhdGljVmFsdWVGdW5jdGlvbihjYWxsT2JqZWN0LmdldFN0YXRpY1ZhbHVlKCksIGFyZ3MpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gdHlwZUluZm87XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgbnMuZXh0ZW5kID0gQmFzZS5leHRlbmQ7XG5cbiAgICB2YXIgVmVjID0ge1xuICAgICAgICBUWVBFUzoge1xuICAgICAgICAgICAgMTogeyB0eXBlOiBUWVBFUy5OVU1CRVIgfSxcbiAgICAgICAgICAgIDI6IHsgdHlwZTogVFlQRVMuT0JKRUNULCBraW5kOiBLSU5EUy5GTE9BVDIgfSxcbiAgICAgICAgICAgIDM6IHsgdHlwZTogVFlQRVMuT0JKRUNULCBraW5kOiBLSU5EUy5GTE9BVDMgfSxcbiAgICAgICAgICAgIDQ6IHsgdHlwZTogVFlQRVMuT0JKRUNULCBraW5kOiBLSU5EUy5GTE9BVDQgfSxcbiAgICAgICAgICAgIGNvbG9yOiB7IHR5cGU6IFRZUEVTLk9CSkVDVCwga2luZDogS0lORFMuRkxPQVQzIH1cbiAgICAgICAgfSxcbiAgICAgICAgZ2V0VHlwZTogZnVuY3Rpb24oZGVzdFZlY3RvciwgY29sb3Ipe1xuICAgICAgICAgICAgaWYoZGVzdFZlY3RvciA9PSA0ICYmIGNvbG9yKVxuICAgICAgICAgICAgICAgIHJldHVybiBWZWMuVFlQRVMuY29sb3I7XG4gICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgICAgcmV0dXJuIFZlYy5UWVBFU1tkZXN0VmVjdG9yXTtcbiAgICAgICAgfSxcbiAgICAgICAgZ2V0U3RhdGljVmFsdWU6IGZ1bmN0aW9uKHR5cGVJbmZvLCBtZXRob2ROYW1lLCBhcmdzLCBjYWxsT2JqZWN0KXtcbiAgICAgICAgICAgIGlmKGNhbGxPYmplY3QuaGFzU3RhdGljVmFsdWUoKSAmJiBhbGxBcmd1bWVudHNBcmVTdGF0aWMoYXJncykpe1xuICAgICAgICAgICAgICAgIHZhciBvYmplY3QgPSBjYWxsT2JqZWN0LmdldFN0YXRpY1ZhbHVlKCk7XG4gICAgICAgICAgICAgICAgdmFyIGNhbGxBcmdzID0gYXJncy5tYXAoZnVuY3Rpb24oYSkge3JldHVybiBhLmdldFN0YXRpY1ZhbHVlKCk7IH0pO1xuICAgICAgICAgICAgICAgIHZhciBtZXRob2QgPSBvYmplY3RbbWV0aG9kTmFtZV07XG4gICAgICAgICAgICAgICAgaWYobWV0aG9kKVxuICAgICAgICAgICAgICAgICAgICB0eXBlSW5mby5zdGF0aWNWYWx1ZSA9IG1ldGhvZC5hcHBseShvYmplY3QsIGNhbGxBcmdzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgY2hlY2tWZWNBcmd1bWVudHM6IGZ1bmN0aW9uKG1ldGhvZE5hbWUsIGNvbG9yLCB2ZWNTaXplLCB3aXRoRW1wdHksIHJlc3VsdCwgYXJncyl7XG4gICAgICAgICAgICB3aXRoRW1wdHkgPSAod2l0aEVtcHR5IHx8IHZlY1NpemUgPT0gMCk7XG4gICAgICAgICAgICBjb2xvciA9IGNvbG9yICYmIHZlY1NpemUgPT0gNDtcbiAgICAgICAgICAgIHZhciBhbGxvd2VkID0gW107XG4gICAgICAgICAgICBmb3IodmFyIGkgPSB3aXRoRW1wdHkgPyAwIDogMTsgaSA8PSB2ZWNTaXplOyArK2kpIGFsbG93ZWQucHVzaChpKTtcbiAgICAgICAgICAgIG5zLmNoZWNrUGFyYW1Db3VudChyZXN1bHQubm9kZSwgbWV0aG9kTmFtZSwgYWxsb3dlZCwgYXJncy5sZW5ndGgpO1xuXG4gICAgICAgICAgICBpZih3aXRoRW1wdHkgJiYgYXJncy5sZW5ndGggPT0gMClcbiAgICAgICAgICAgICAgICByZXR1cm47XG5cbiAgICAgICAgICAgIGlmKGFyZ3MubGVuZ3RoID09IDEgJiYgYXJnc1swXS5jYW5OdW1iZXIoKSlcbiAgICAgICAgICAgICAgICByZXR1cm47XG5cbiAgICAgICAgICAgIHZhciBpZHggPSAwO1xuICAgICAgICAgICAgZm9yKHZhciBpID0gMDsgaWR4IDwgdmVjU2l6ZSAmJiBpIDwgYXJncy5sZW5ndGg7ICsraSl7XG4gICAgICAgICAgICAgICAgdmFyIGFyZz0gYXJnc1tpXSwgY250O1xuICAgICAgICAgICAgICAgIGlmKGFyZy5jYW5OdW1iZXIoKSkgY250ID0gMTtcbiAgICAgICAgICAgICAgICBlbHNlIGlmKGFyZy5pc09mS2luZChLSU5EUy5GTE9BVDIpKSBjbnQgPSAyO1xuICAgICAgICAgICAgICAgIGVsc2UgaWYoYXJnLmlzT2ZLaW5kKEtJTkRTLkZMT0FUMykpIGNudCA9IDM7XG4gICAgICAgICAgICAgICAgZWxzZSBpZihhcmcuaXNPZktpbmQoS0lORFMuRkxPQVQ0KSkgY250ID0gNDtcbiAgICAgICAgICAgICAgICBlbHNlIFNoYWRlLnRocm93RXJyb3IocmVzdWx0Lm5vZGUsIFwiSW5hdmxpZCBwYXJhbWV0ZXIgZm9yIFwiICsgbWV0aG9kTmFtZSArIFwiLCB0eXBlIGlzIG5vdCBzdXBwb3J0ZWRcIik7XG4gICAgICAgICAgICAgICAgLy8gVE9ETzogUHJpbnQgVHlwZT9cbiAgICAgICAgICAgICAgICBpZHggKz0gY250O1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZihpZHggPCB2ZWNTaXplICYmICghY29sb3IgfHwgaWR4ICsgMSA8IHZlY1NpemUpKVxuICAgICAgICAgICAgICAgIFNoYWRlLnRocm93RXJyb3IocmVzdWx0Lm5vZGUsIFwiSW5hdmxpZCBwYXJhbWV0ZXJzIGZvciBcIiArIG1ldGhvZE5hbWUgKyBcIiwgZXhwZWN0ZWQgXCIgKyB2ZWNTaXplICsgXCIgc2NhbGFyIHZhbHVlcywgZ290IFwiICsgaWR4KTtcbiAgICAgICAgICAgIGVsc2UgaWYoaSA8IGFyZ3MubGVuZ3RoKXtcbiAgICAgICAgICAgICAgICBTaGFkZS50aHJvd0Vycm9yKHJlc3VsdC5ub2RlLCBcIkluYXZsaWQgcGFyYW1ldGVycyBmb3IgXCIgKyBtZXRob2ROYW1lICsgXCIsIHRvbyBtYW55IHBhcmFtZXRlcnNcIik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIHZlY0V2YWx1YXRlOiBmdW5jdGlvbihvYmplY3ROYW1lLCBtZXRob2ROYW1lLCBjb2xvciwgZGVzdFZlY1NpemUsIHNyY1ZlY1NpemUsIHJlc3VsdCwgYXJncywgY3R4LCBjYWxsT2JqZWN0KXtcbiAgICAgICAgICAgIFZlYy5jaGVja1ZlY0FyZ3VtZW50cyhvYmplY3ROYW1lICsgXCIuXCIgKyBtZXRob2ROYW1lLCBjb2xvciwgc3JjVmVjU2l6ZSwgZmFsc2UsIHJlc3VsdCwgYXJncyk7XG5cbiAgICAgICAgICAgIHZhciB0eXBlSW5mbyA9IHt9O1xuICAgICAgICAgICAgQmFzZS5leHRlbmQodHlwZUluZm8sIFZlYy5nZXRUeXBlKGRlc3RWZWNTaXplLCBjb2xvcikpO1xuXG4gICAgICAgICAgICBWZWMuZ2V0U3RhdGljVmFsdWUodHlwZUluZm8sIG1ldGhvZE5hbWUsIGFyZ3MsIGNhbGxPYmplY3QpO1xuICAgICAgICAgICAgcmV0dXJuIHR5cGVJbmZvO1xuICAgICAgICB9LFxuXG4gICAgICAgIG9wdGlvbmFsWmVyb0V2YWx1YXRlOiBmdW5jdGlvbihvYmplY3ROYW1lLCBjb2xvciwgbWV0aG9kTmFtZSwgZGVzdFZlY1NpemUsIHplcm9EZXN0VmVjU2l6ZSwgc3JjVmVjU2l6ZSwgcmVzdWx0LCBhcmdzLCBjdHgsIGNhbGxPYmplY3QpIHtcbiAgICAgICAgICAgIHZhciBxdWFsaWZpZWROYW1lID0gb2JqZWN0TmFtZSArIFwiLlwiICsgbWV0aG9kTmFtZTtcbiAgICAgICAgICAgIHZhciB0eXBlSW5mbyA9IHt9O1xuXG4gICAgICAgICAgICBpZihhcmdzLmxlbmd0aCA9PSAwKXtcbiAgICAgICAgICAgICAgICBCYXNlLmV4dGVuZCh0eXBlSW5mbywgVmVjLmdldFR5cGUoemVyb0Rlc3RWZWNTaXplLCBjb2xvcikpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZXtcbiAgICAgICAgICAgICAgICBWZWMuY2hlY2tWZWNBcmd1bWVudHMocXVhbGlmaWVkTmFtZSwgY29sb3IsIHNyY1ZlY1NpemUsIHRydWUsIHJlc3VsdCwgYXJncyk7XG4gICAgICAgICAgICAgICAgQmFzZS5leHRlbmQodHlwZUluZm8sIFZlYy5nZXRUeXBlKGRlc3RWZWNTaXplLCBjb2xvcikpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgVmVjLmdldFN0YXRpY1ZhbHVlKHR5cGVJbmZvLCBtZXRob2ROYW1lLCBhcmdzLCBjYWxsT2JqZWN0KTtcblxuICAgICAgICAgICAgcmV0dXJuIHR5cGVJbmZvO1xuICAgICAgICB9LFxuXG4gICAgICAgIHN3aXp6bGVFdmFsdWF0ZTogZnVuY3Rpb24ob2JqZWN0TmFtZSwgY29sb3IsIHZlY1NpemUsIHN3aXp6bGUsIHdpdGhTZXR0ZXIsIHJlc3VsdCwgYXJncywgY3R4LCBjYWxsT2JqZWN0KSB7XG4gICAgICAgICAgICBpZih3aXRoU2V0dGVyKXtcbiAgICAgICAgICAgICAgICByZXR1cm4gVmVjLm9wdGlvbmFsWmVyb0V2YWx1YXRlKG9iamVjdE5hbWUsIGNvbG9yLCBzd2l6emxlLCB2ZWNTaXplLCBzd2l6emxlLmxlbmd0aCwgc3dpenpsZS5sZW5ndGgsXG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdCwgYXJncywgY3R4LCBjYWxsT2JqZWN0KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2V7XG4gICAgICAgICAgICAgICAgcmV0dXJuIFZlYy52ZWNFdmFsdWF0ZShvYmplY3ROYW1lLCBzd2l6emxlLCBjb2xvciwgc3dpenpsZS5sZW5ndGgsIDAsIHJlc3VsdCwgYXJncywgY3R4LCBjYWxsT2JqZWN0KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgZ2V0U3dpenpsZUV2YWx1YXRlOiBmdW5jdGlvbihvYmplY3ROYW1lLCBjb2xvciwgdmVjU2l6ZSwgc3dpenpsZSl7XG4gICAgICAgICAgICB2YXIgaW5kaWNlcyA9IFtdLCB3aXRoU2V0dGVyID0gKHN3aXp6bGUubGVuZ3RoIDw9IHZlY1NpemUpO1xuICAgICAgICAgICAgZm9yKHZhciBpID0gMDsgd2l0aFNldHRlciAmJiBpIDwgc3dpenpsZS5sZW5ndGg7ICsraSl7XG4gICAgICAgICAgICAgICAgdmFyIGlkeCA9IFZlY0Jhc2Uuc3dpenpsZVRvSW5kZXgoc3dpenpsZS5jaGFyQXQoaSkpO1xuICAgICAgICAgICAgICAgIGlmKGluZGljZXNbaWR4XSlcbiAgICAgICAgICAgICAgICAgICAgd2l0aFNldHRlciA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgICAgICAgaW5kaWNlc1tpZHhdID0gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiAge1xuICAgICAgICAgICAgICAgIHR5cGU6IFRZUEVTLkZVTkNUSU9OLFxuICAgICAgICAgICAgICAgIGV2YWx1YXRlOiBWZWMuc3dpenpsZUV2YWx1YXRlLmJpbmQobnVsbCwgb2JqZWN0TmFtZSwgY29sb3IsIHZlY1NpemUsIHN3aXp6bGUsIHdpdGhTZXR0ZXIpXG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIGF0dGFjaFN3aXp6bGVzOiBmdW5jdGlvbiAoaW5zdGFuY2UsIG9iamVjdE5hbWUsIGNvbG9yLCB2ZWNDb3VudCl7XG4gICAgICAgICAgICBmb3IodmFyIHMgPSAwOyBzIDwgVmVjQmFzZS5zd2l6emxlU2V0cy5sZW5ndGg7ICsrcyl7XG4gICAgICAgICAgICAgICAgZm9yKHZhciBjb3VudCA9IDE7IGNvdW50IDw9IDQ7ICsrY291bnQpe1xuICAgICAgICAgICAgICAgICAgICB2YXIgbWF4ID0gTWF0aC5wb3codmVjQ291bnQsIGNvdW50KTtcbiAgICAgICAgICAgICAgICAgICAgIGZvcih2YXIgaSA9IDA7IGkgPCBtYXg7ICsraSl7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgdmFsID0gaTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBrZXkgPSBcIlwiO1xuICAgICAgICAgICAgICAgICAgICAgICAgZm9yKHZhciAgaiA9IDA7IGogPCBjb3VudDsgKytqKXtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgaWR4ID0gdmFsICUgdmVjQ291bnQ7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFsID0gTWF0aC5mbG9vcih2YWwgLyB2ZWNDb3VudCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAga2V5Kz0gVmVjQmFzZS5zd2l6emxlU2V0c1tzXVtpZHhdO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgaW5zdGFuY2Vba2V5XSA9IFZlYy5nZXRTd2l6emxlRXZhbHVhdGUob2JqZWN0TmFtZSwgY29sb3IsIHZlY0NvdW50LCBrZXkpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBhdHRhY2hWZWNNZXRob2RzOiBmdW5jdGlvbihpbnN0YW5jZSwgb2JqZWN0TmFtZSwgY29sb3IsIGRlc3RWZWNTaXplLCBzcmNWZWNTaXplLCBtZXRob2ROYW1lcyl7XG4gICAgICAgICAgICBmb3IodmFyIGkgPSAwOyBpIDwgbWV0aG9kTmFtZXMubGVuZ3RoOyArK2kpe1xuICAgICAgICAgICAgICAgIHZhciBtZXRob2ROYW1lID0gbWV0aG9kTmFtZXNbaV07XG4gICAgICAgICAgICAgICAgaW5zdGFuY2VbbWV0aG9kTmFtZV0gPSB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IFRZUEVTLkZVTkNUSU9OLFxuICAgICAgICAgICAgICAgICAgICBldmFsdWF0ZTogVmVjLnZlY0V2YWx1YXRlLmJpbmQobnVsbCwgb2JqZWN0TmFtZSwgbWV0aG9kTmFtZSwgY29sb3IsIGRlc3RWZWNTaXplLCBzcmNWZWNTaXplKVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgY29uc3RydWN0b3JFdmFsdWF0ZTogZnVuY3Rpb24ob2JqZWN0TmFtZSwgY29sb3IsIHZlY1NpemUsIHJlc3VsdCwgYXJncywgY3R4KSB7XG4gICAgICAgICAgICBWZWMuY2hlY2tWZWNBcmd1bWVudHMob2JqZWN0TmFtZSwgY29sb3IsIHZlY1NpemUsIHRydWUsIHJlc3VsdCwgYXJncyk7XG4gICAgICAgICAgICB2YXIgYXJnQXJyYXkgPSBbXTtcbiAgICAgICAgICAgIHZhciBpc1N0YXRpYyA9IHRydWU7XG4gICAgICAgICAgICBhcmdzLmZvckVhY2goZnVuY3Rpb24gKHBhcmFtLCBpbmRleCkge1xuICAgICAgICAgICAgICAgIGlzU3RhdGljID0gaXNTdGF0aWMgJiYgcGFyYW0uaGFzU3RhdGljVmFsdWUoKTtcbiAgICAgICAgICAgICAgICBpZiAoaXNTdGF0aWMpXG4gICAgICAgICAgICAgICAgICAgIGFyZ0FycmF5LnB1c2gocGFyYW0uZ2V0U3RhdGljVmFsdWUoKSk7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgdmFyIHR5cGVJbmZvID0gQmFzZS5leHRlbmQoe30sVmVjLmdldFR5cGUodmVjU2l6ZSwgY29sb3IpKTtcblxuICAgICAgICAgICAgaWYgKGlzU3RhdGljKSB7XG4gICAgICAgICAgICAgICAgdmFyIHYgPSBuZXcgU2hhZGVbb2JqZWN0TmFtZV0oKTtcbiAgICAgICAgICAgICAgICBTaGFkZVtvYmplY3ROYW1lXS5hcHBseSh2LCBhcmdBcnJheSk7XG4gICAgICAgICAgICAgICAgdHlwZUluZm8uc3RhdGljVmFsdWUgPSB2O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHR5cGVJbmZvO1xuICAgICAgICB9XG5cbiAgICB9O1xuICAgIG5zLlZlYyA9IFZlYztcbiAgICBucy5hbGxBcmd1bWVudHNBcmVTdGF0aWMgPSBhbGxBcmd1bWVudHNBcmVTdGF0aWM7XG5cblxufShleHBvcnRzKSk7XG4iLCIoZnVuY3Rpb24obnMpe1xuXG4gICAgdmFyIFNoYWRlID0gcmVxdWlyZShcIi4uLy4uLy4uL2ludGVyZmFjZXMuanNcIiksXG4gICAgICAgIFRZUEVTID0gU2hhZGUuVFlQRVMsXG4gICAgICAgIEtJTkRTID0gU2hhZGUuT0JKRUNUX0tJTkRTLFxuICAgICAgICBUb29scyA9IHJlcXVpcmUoXCIuL3Rvb2xzLmpzXCIpO1xuXG4gICAgdmFyIFZlY3RvcjJDb25zdHJ1Y3RvciA9ICB7XG4gICAgICAgIHR5cGU6IFRZUEVTLk9CSkVDVCxcbiAgICAgICAga2luZDogS0lORFMuRkxPQVQyLFxuICAgICAgICAvKipcbiAgICAgICAgICogQHBhcmFtIHtBbm5vdGF0aW9ufSByZXN1bHRcbiAgICAgICAgICogQHBhcmFtIHtBcnJheS48QW5ub3RhdGlvbj59IGFyZ3NcbiAgICAgICAgICogQHBhcmFtIHtDb250ZXh0fSBjdHhcbiAgICAgICAgICovXG4gICAgICAgIGV2YWx1YXRlOiBUb29scy5WZWMuY29uc3RydWN0b3JFdmFsdWF0ZS5iaW5kKG51bGwsIFwiVmVjMlwiLCBmYWxzZSwgMilcbiAgICB9O1xuXG4gICAgdmFyIFZlY3RvcjJTdGF0aWNPYmplY3QgPSB7XG4gICAgfTtcblxuICAgIHZhciBWZWN0b3IySW5zdGFuY2UgPSB7XG4gICAgICAgIGxlbmd0aDoge1xuICAgICAgICAgICAgdHlwZTogVFlQRVMuRlVOQ1RJT04sXG4gICAgICAgICAgICBldmFsdWF0ZTogVG9vbHMuVmVjLm9wdGlvbmFsWmVyb0V2YWx1YXRlLmJpbmQobnVsbCxcIlZlYzJcIiwgZmFsc2UsIFwibGVuZ3RoXCIsIDIsIDEsIDEpXG4gICAgICAgIH1cbiAgICB9O1xuICAgIFRvb2xzLlZlYy5hdHRhY2hTd2l6emxlcyhWZWN0b3IySW5zdGFuY2UsIFwiVmVjMlwiLCBmYWxzZSwgMik7XG4gICAgVG9vbHMuVmVjLmF0dGFjaFZlY01ldGhvZHMoVmVjdG9yMkluc3RhbmNlLCBcIlZlYzJcIiwgZmFsc2UsIDIsIDIsIFsnYWRkJywgJ3N1YicsICdtdWwnLCAnZGl2JywgJ21vZCddKTtcbiAgICBUb29scy5WZWMuYXR0YWNoVmVjTWV0aG9kcyhWZWN0b3IySW5zdGFuY2UsIFwiVmVjMlwiLCBmYWxzZSwgMSwgMiwgWydkb3QnXSk7XG4gICAgVG9vbHMuVmVjLmF0dGFjaFZlY01ldGhvZHMoVmVjdG9yMkluc3RhbmNlLCBcIlZlYzJcIiwgZmFsc2UsIDIsIDAsIFsnbm9ybWFsaXplJ10pO1xuXG5cbiAgICBUb29scy5leHRlbmQobnMsIHtcbiAgICAgICAgaWQ6IFwiVmVjMlwiLFxuICAgICAgICBraW5kOiBLSU5EUy5GTE9BVDIsXG4gICAgICAgIG9iamVjdDoge1xuICAgICAgICAgICAgY29uc3RydWN0b3I6IFZlY3RvcjJDb25zdHJ1Y3RvcixcbiAgICAgICAgICAgIHN0YXRpYzogVmVjdG9yMlN0YXRpY09iamVjdFxuICAgICAgICB9LFxuICAgICAgICBpbnN0YW5jZTogVmVjdG9yMkluc3RhbmNlXG4gICAgfSk7XG5cblxufShleHBvcnRzKSk7XG4iLCIoZnVuY3Rpb24obnMpe1xuXG4gICAgdmFyIFNoYWRlID0gcmVxdWlyZShcIi4uLy4uLy4uL2ludGVyZmFjZXMuanNcIiksXG4gICAgICAgIFRZUEVTID0gU2hhZGUuVFlQRVMsXG4gICAgICAgIEtJTkRTID0gU2hhZGUuT0JKRUNUX0tJTkRTLFxuICAgICAgICBUb29scyA9IHJlcXVpcmUoXCIuL3Rvb2xzLmpzXCIpO1xuXG4gICAgdmFyIFZlY3RvcjNDb25zdHJ1Y3RvciA9ICB7XG4gICAgICAgIHR5cGU6IFRZUEVTLk9CSkVDVCxcbiAgICAgICAga2luZDogS0lORFMuRkxPQVQzLFxuICAgICAgICAvKipcbiAgICAgICAgICogQHBhcmFtIHtBbm5vdGF0aW9ufSByZXN1bHRcbiAgICAgICAgICogQHBhcmFtIHtBcnJheS48QW5ub3RhdGlvbj59IGFyZ3NcbiAgICAgICAgICogQHBhcmFtIHtDb250ZXh0fSBjdHhcbiAgICAgICAgICovXG4gICAgICAgIGV2YWx1YXRlOiBUb29scy5WZWMuY29uc3RydWN0b3JFdmFsdWF0ZS5iaW5kKG51bGwsIFwiVmVjM1wiLCBmYWxzZSwgMylcbiAgICB9O1xuXG4gICAgdmFyIFZlY3RvcjNTdGF0aWNPYmplY3QgPSB7XG4gICAgfTtcblxuICAgIHZhciBWZWN0b3IzSW5zdGFuY2UgPSB7XG4gICAgICAgIGxlbmd0aDoge1xuICAgICAgICAgICAgdHlwZTogVFlQRVMuRlVOQ1RJT04sXG4gICAgICAgICAgICBldmFsdWF0ZTogVG9vbHMuVmVjLm9wdGlvbmFsWmVyb0V2YWx1YXRlLmJpbmQobnVsbCxcIlZlYzNcIiwgZmFsc2UsIFwibGVuZ3RoXCIsIDMsIDEsIDEpXG4gICAgICAgIH1cbiAgICB9O1xuICAgIFRvb2xzLlZlYy5hdHRhY2hTd2l6emxlcyhWZWN0b3IzSW5zdGFuY2UsIFwiVmVjM1wiLCBmYWxzZSwgMyk7XG4gICAgVG9vbHMuVmVjLmF0dGFjaFZlY01ldGhvZHMoVmVjdG9yM0luc3RhbmNlLCBcIlZlYzNcIiwgZmFsc2UsIDMsIDMsIFsnYWRkJywgJ3N1YicsICdtdWwnLCAnZGl2JywgJ21vZCddKTtcbiAgICBUb29scy5WZWMuYXR0YWNoVmVjTWV0aG9kcyhWZWN0b3IzSW5zdGFuY2UsIFwiVmVjM1wiLCBmYWxzZSwgMSwgMywgWydkb3QnXSk7XG4gICAgVG9vbHMuVmVjLmF0dGFjaFZlY01ldGhvZHMoVmVjdG9yM0luc3RhbmNlLCBcIlZlYzNcIiwgZmFsc2UsIDMsIDAsIFsnbm9ybWFsaXplJ10pO1xuXG5cbiAgICBUb29scy5leHRlbmQobnMsIHtcbiAgICAgICAgaWQ6IFwiVmVjM1wiLFxuICAgICAgICBraW5kOiBLSU5EUy5GTE9BVDMsXG4gICAgICAgIG9iamVjdDoge1xuICAgICAgICAgICAgY29uc3RydWN0b3I6IFZlY3RvcjNDb25zdHJ1Y3RvcixcbiAgICAgICAgICAgIHN0YXRpYzogVmVjdG9yM1N0YXRpY09iamVjdFxuICAgICAgICB9LFxuICAgICAgICBpbnN0YW5jZTogVmVjdG9yM0luc3RhbmNlXG4gICAgfSk7XG5cblxufShleHBvcnRzKSk7XG4iLCIoZnVuY3Rpb24obnMpe1xuXG4gICAgdmFyIFNoYWRlID0gcmVxdWlyZShcIi4uLy4uLy4uL2ludGVyZmFjZXMuanNcIiksXG4gICAgICAgIFRZUEVTID0gU2hhZGUuVFlQRVMsXG4gICAgICAgIEtJTkRTID0gU2hhZGUuT0JKRUNUX0tJTkRTLFxuICAgICAgICBUb29scyA9IHJlcXVpcmUoXCIuL3Rvb2xzLmpzXCIpO1xuXG4gICAgdmFyIFZlY3RvcjRDb25zdHJ1Y3RvciA9ICB7XG4gICAgICAgIHR5cGU6IFRZUEVTLk9CSkVDVCxcbiAgICAgICAga2luZDogS0lORFMuRkxPQVQ0LFxuICAgICAgICAvKipcbiAgICAgICAgICogQHBhcmFtIHtBbm5vdGF0aW9ufSByZXN1bHRcbiAgICAgICAgICogQHBhcmFtIHtBcnJheS48QW5ub3RhdGlvbj59IGFyZ3NcbiAgICAgICAgICogQHBhcmFtIHtDb250ZXh0fSBjdHhcbiAgICAgICAgICovXG4gICAgICAgIGV2YWx1YXRlOiBUb29scy5WZWMuY29uc3RydWN0b3JFdmFsdWF0ZS5iaW5kKG51bGwsIFwiVmVjNFwiLCBmYWxzZSwgNClcbiAgICB9O1xuXG4gICAgdmFyIFZlY3RvcjRTdGF0aWNPYmplY3QgPSB7XG4gICAgfTtcblxuICAgIHZhciBWZWN0b3I0SW5zdGFuY2UgPSB7XG4gICAgICAgIGxlbmd0aDoge1xuICAgICAgICAgICAgdHlwZTogVFlQRVMuRlVOQ1RJT04sXG4gICAgICAgICAgICBldmFsdWF0ZTogVG9vbHMuVmVjLm9wdGlvbmFsWmVyb0V2YWx1YXRlLmJpbmQobnVsbCxcIlZlYzRcIiwgZmFsc2UsIFwibGVuZ3RoXCIsIDQsIDEsIDEpXG4gICAgICAgIH1cbiAgICB9O1xuICAgIFRvb2xzLlZlYy5hdHRhY2hTd2l6emxlcyhWZWN0b3I0SW5zdGFuY2UsIFwiVmVjNFwiLCBmYWxzZSwgNCk7XG4gICAgVG9vbHMuVmVjLmF0dGFjaFZlY01ldGhvZHMoVmVjdG9yNEluc3RhbmNlLCBcIlZlYzRcIiwgZmFsc2UsIDQsIDQsIFsnYWRkJywgJ3N1YicsICdtdWwnLCAnZGl2JywgJ21vZCddKTtcbiAgICBUb29scy5WZWMuYXR0YWNoVmVjTWV0aG9kcyhWZWN0b3I0SW5zdGFuY2UsIFwiVmVjNFwiLCBmYWxzZSwgMSwgNCwgWydkb3QnXSk7XG4gICAgVG9vbHMuVmVjLmF0dGFjaFZlY01ldGhvZHMoVmVjdG9yNEluc3RhbmNlLCBcIlZlYzRcIiwgZmFsc2UsIDQsIDAsIFsnbm9ybWFsaXplJ10pO1xuXG5cbiAgICBUb29scy5leHRlbmQobnMsIHtcbiAgICAgICAgaWQ6IFwiVmVjNFwiLFxuICAgICAgICBraW5kOiBLSU5EUy5GTE9BVDQsXG4gICAgICAgIG9iamVjdDoge1xuICAgICAgICAgICAgY29uc3RydWN0b3I6IFZlY3RvcjRDb25zdHJ1Y3RvcixcbiAgICAgICAgICAgIHN0YXRpYzogVmVjdG9yNFN0YXRpY09iamVjdFxuICAgICAgICB9LFxuICAgICAgICBpbnN0YW5jZTogVmVjdG9yNEluc3RhbmNlXG4gICAgfSk7XG5cblxufShleHBvcnRzKSk7XG4iLCIoZnVuY3Rpb24gKG5zKSB7XG4gICAgLyoqXG4gICAgICogU2hhZGUuanMgc3BlY2lmaWMgdHlwZSBpbmZlcmVuY2UgdGhhdCBpcyBhbHNvIGluZmVycmluZ1xuICAgICAqIHZpcnR1YWwgdHlwZXMge0BsaW5rIFNoYWRlLlRZUEVTIH1cbiAgICAgKi9cblxuICAgIHZhciB3YWxrID0gcmVxdWlyZSgnZXN0cmF2ZXJzZScpLFxuICAgICAgICBlbnRlckV4cHJlc3Npb24gPSByZXF1aXJlKCcuL2luZmVyX2V4cHJlc3Npb24uanMnKS5lbnRlckV4cHJlc3Npb24sXG4gICAgICAgIGV4aXRFeHByZXNzaW9uID0gcmVxdWlyZSgnLi9pbmZlcl9leHByZXNzaW9uLmpzJykuZXhpdEV4cHJlc3Npb24sXG4gICAgICAgIGVudGVyU3RhdGVtZW50ID0gcmVxdWlyZSgnLi9pbmZlcl9zdGF0ZW1lbnQuanMnKS5lbnRlclN0YXRlbWVudCxcbiAgICAgICAgZXhpdFN0YXRlbWVudCA9IHJlcXVpcmUoJy4vaW5mZXJfc3RhdGVtZW50LmpzJykuZXhpdFN0YXRlbWVudCxcblxuICAgICAgICBPYmplY3RSZWdpc3RyeSA9IHJlcXVpcmUoXCIuL3JlZ2lzdHJ5L2luZGV4LmpzXCIpLlJlZ2lzdHJ5LFxuICAgICAgICBDb250ZXh0ID0gcmVxdWlyZShcIi4vLi4vLi4vYmFzZS9jb250ZXh0LmpzXCIpLmdldENvbnRleHQoT2JqZWN0UmVnaXN0cnkpLFxuICAgICAgICBCYXNlID0gcmVxdWlyZShcIi4uLy4uL2Jhc2UvaW5kZXguanNcIiksXG4gICAgICAgIEFubm90YXRpb24gPSByZXF1aXJlKFwiLi8uLi8uLi9iYXNlL2Fubm90YXRpb24uanNcIikuQW5ub3RhdGlvbixcbiAgICAgICAgRnVuY3Rpb25Bbm5vdGF0aW9uID0gcmVxdWlyZShcIi4vLi4vLi4vYmFzZS9hbm5vdGF0aW9uLmpzXCIpLkZ1bmN0aW9uQW5ub3RhdGlvbjtcblxuXG5cbiAgICB2YXIgU3ludGF4ID0gd2Fsay5TeW50YXg7XG5cblxuICAgIHZhciByZWdpc3Rlckdsb2JhbENvbnRleHQgPSBmdW5jdGlvbiAocHJvZ3JhbSkge1xuICAgICAgICB2YXIgY3R4ID0gbmV3IENvbnRleHQocHJvZ3JhbSwgbnVsbCwge25hbWU6IFwiZ2xvYmFsXCJ9KTtcbiAgICAgICAgY3R4LnJlZ2lzdGVyT2JqZWN0KFwiTWF0aFwiLCBPYmplY3RSZWdpc3RyeS5nZXRCeU5hbWUoXCJNYXRoXCIpKTtcbiAgICAgICAgY3R4LnJlZ2lzdGVyT2JqZWN0KFwiQ29sb3JcIiwgT2JqZWN0UmVnaXN0cnkuZ2V0QnlOYW1lKFwiQ29sb3JcIikpO1xuICAgICAgICBjdHgucmVnaXN0ZXJPYmplY3QoXCJWZWMyXCIsIE9iamVjdFJlZ2lzdHJ5LmdldEJ5TmFtZShcIlZlYzJcIikpO1xuICAgICAgICBjdHgucmVnaXN0ZXJPYmplY3QoXCJWZWMzXCIsIE9iamVjdFJlZ2lzdHJ5LmdldEJ5TmFtZShcIlZlYzNcIikpO1xuICAgICAgICBjdHgucmVnaXN0ZXJPYmplY3QoXCJWZWM0XCIsIE9iamVjdFJlZ2lzdHJ5LmdldEJ5TmFtZShcIlZlYzRcIikpO1xuICAgICAgICBjdHgucmVnaXN0ZXJPYmplY3QoXCJUZXh0dXJlXCIsIE9iamVjdFJlZ2lzdHJ5LmdldEJ5TmFtZShcIlRleHR1cmVcIikpO1xuICAgICAgICBjdHgucmVnaXN0ZXJPYmplY3QoXCJTaGFkZVwiLCBPYmplY3RSZWdpc3RyeS5nZXRCeU5hbWUoXCJTaGFkZVwiKSk7XG4gICAgICAgIGN0eC5yZWdpc3Rlck9iamVjdChcInRoaXNcIiwgT2JqZWN0UmVnaXN0cnkuZ2V0QnlOYW1lKFwiU3lzdGVtXCIpKTtcbiAgICAgICAgcmV0dXJuIGN0eDtcbiAgICB9XG5cbiAgICB2YXIgVHlwZUluZmVyZW5jZSA9IGZ1bmN0aW9uIChyb290LCBvcHQpIHtcbiAgICAgICAgb3B0ID0gb3B0IHx8IHt9O1xuICAgICAgICB0aGlzLnJvb3QgPSByb290O1xuICAgICAgICB0aGlzLmNvbnRleHQgPSBbXTtcbiAgICAgICAgLyoqIEB0eXBlIHtPYmplY3QuPFN0cmluZywgQXJyYXkuPFR5cGVJbmZvPn0gKiovXG4gICAgICAgIHRoaXMuaW5qZWN0aW9ucyA9IHt9O1xuICAgICAgICB0aGlzLmVudHJ5UG9pbnQgPSBvcHQuZW50cnkgfHwgXCJnbG9iYWwuc2hhZGVcIjtcbiAgICAgICAgdGhpcy5yb290LmluamVjdGlvbnMgPSB0aGlzLmluamVjdGlvbnM7XG4gICAgICAgIHRoaXMuZnVuY3Rpb25zID0ge1xuICAgICAgICAgICAgb3JpZzoge30sXG4gICAgICAgICAgICBkZXJpdmVkOiB7fVxuICAgICAgICB9XG5cbiAgICB9XG5cbiAgICBCYXNlLmV4dGVuZChUeXBlSW5mZXJlbmNlLnByb3RvdHlwZSwge1xuICAgICAgICBwdXNoQ29udGV4dDogZnVuY3Rpb24gKGNvbnRleHQpIHtcbiAgICAgICAgICAgIHRoaXMuY29udGV4dC5wdXNoKGNvbnRleHQpO1xuICAgICAgICAgICAgdmFyIGluamVjdGlvbiA9IHRoaXMuaW5qZWN0aW9uc1tjb250ZXh0LnN0cigpXTtcbiAgICAgICAgICAgIGlmIChpbmplY3Rpb24pIHtcbiAgICAgICAgICAgICAgICBjb250ZXh0LmluamVjdFBhcmFtZXRlcnMoaW5qZWN0aW9uKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgcG9wQ29udGV4dDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdGhpcy5jb250ZXh0LnBvcCgpO1xuICAgICAgICB9LFxuICAgICAgICBwZWVrQ29udGV4dDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuY29udGV4dFt0aGlzLmNvbnRleHQubGVuZ3RoIC0gMV07XG4gICAgICAgIH0sXG4gICAgICAgIGNyZWF0ZUNvbnRleHQ6IGZ1bmN0aW9uIChub2RlLCBwYXJlbnRDb250ZXh0LCBuYW1lKSB7XG4gICAgICAgICAgIHZhciByZXN1bHQgPSBuZXcgQ29udGV4dChub2RlLCBwYXJlbnRDb250ZXh0LCB7bmFtZTogbmFtZSB9ICk7XG4gICAgICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICAgIH0sXG5cbiAgICAgICAgYW5ub3RhdGVQYXJhbWV0ZXJzOiBmdW5jdGlvbihhcnIpIHtcbiAgICAgICAgICAgIHJldHVybiBhcnIgPyBhcnIubWFwKGZ1bmN0aW9uKHBhcmFtKSB7XG4gICAgICAgICAgICAgICAgdmFyIGFubm90YXRlZCA9ICBuZXcgQW5ub3RhdGlvbihwYXJhbSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGFubm90YXRlZDtcbiAgICAgICAgICAgIH0pIDogW107XG4gICAgICAgIH0sXG5cblxuICAgICAgICBidWlsZEZ1bmN0aW9uTWFwOiBmdW5jdGlvbihwcmcpIHtcbiAgICAgICAgICAgIHZhciB0aGF0ID0gdGhpcztcbiAgICAgICAgICAgIHdhbGsucmVwbGFjZShwcmcsIHtcbiAgICAgICAgICAgICAgICBlbnRlcjogZnVuY3Rpb24obm9kZSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAobm9kZS50eXBlID09IFN5bnRheC5GdW5jdGlvbkRlY2xhcmF0aW9uKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgcmVzdWx0ID0gbmV3IEZ1bmN0aW9uQW5ub3RhdGlvbihub2RlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBmdW5jdGlvbk5hbWUgPSBub2RlLmlkLm5hbWU7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgcGFyZW50Q29udGV4dCA9IHRoYXQucGVla0NvbnRleHQoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBmdW5jdGlvbkNvbnRleHQgPSB0aGF0LmNyZWF0ZUNvbnRleHQobm9kZSwgcGFyZW50Q29udGV4dCwgZnVuY3Rpb25OYW1lKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uQ29udGV4dC5kZWNsYXJlUGFyYW1ldGVycyhub2RlLnBhcmFtcyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBwYXJlbnRDb250ZXh0LmRlY2xhcmVWYXJpYWJsZShmdW5jdGlvbk5hbWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcGFyZW50Q29udGV4dC51cGRhdGVFeHByZXNzaW9uKGZ1bmN0aW9uTmFtZSwgcmVzdWx0KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQucHVzaENvbnRleHQoZnVuY3Rpb25Db250ZXh0KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQuZnVuY3Rpb25zLm9yaWdbZnVuY3Rpb25Db250ZXh0LnN0cigpXSA9IG5vZGU7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIGxlYXZlOiBmdW5jdGlvbihub2RlKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChub2RlLnR5cGUgPT0gU3ludGF4LkZ1bmN0aW9uRGVjbGFyYXRpb24pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQucG9wQ29udGV4dCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHsgdHlwZTogU3ludGF4LkVtcHR5U3RhdGVtZW50IH07XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgcHJnLmJvZHkgPSBwcmcuYm9keS5maWx0ZXIoZnVuY3Rpb24oYSkgeyByZXR1cm4gYS50eXBlICE9IFN5bnRheC5FbXB0eVN0YXRlbWVudDsgfSk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgdHJhdmVyc2U6IGZ1bmN0aW9uIChub2RlKSB7XG4gICAgICAgICAgICB3YWxrLnRyYXZlcnNlKG5vZGUsIHtcbiAgICAgICAgICAgICAgICBlbnRlcjogdGhpcy5lbnRlck5vZGUuYmluZCh0aGlzKSxcbiAgICAgICAgICAgICAgICBsZWF2ZTogdGhpcy5leGl0Tm9kZS5iaW5kKHRoaXMpXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHJldHVybiBub2RlO1xuICAgICAgICB9LFxuXG4gICAgICAgIGVudGVyTm9kZTogZnVuY3Rpb24gKG5vZGUsIHBhcmVudCkge1xuICAgICAgICAgICAgdmFyIGNvbnRleHQgPSB0aGlzLmNvbnRleHRbdGhpcy5jb250ZXh0Lmxlbmd0aCAtIDFdO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuc3dpdGNoS2luZChub2RlLCBwYXJlbnQsIGNvbnRleHQsIGVudGVyU3RhdGVtZW50LCBlbnRlckV4cHJlc3Npb24pO1xuICAgICAgICB9LFxuXG4gICAgICAgIGV4aXROb2RlOiBmdW5jdGlvbiAobm9kZSwgcGFyZW50KSB7XG4gICAgICAgICAgICB2YXIgY29udGV4dCA9IHRoaXMuY29udGV4dFt0aGlzLmNvbnRleHQubGVuZ3RoIC0gMV07XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5zd2l0Y2hLaW5kKG5vZGUsIHBhcmVudCwgY29udGV4dCwgZXhpdFN0YXRlbWVudCwgZXhpdEV4cHJlc3Npb24pO1xuICAgICAgICB9LFxuXG4gICAgICAgIHN3aXRjaEtpbmQ6IGZ1bmN0aW9uIChub2RlLCBwYXJlbnQsIGN0eCwgc3RhdGVtZW50LCBleHByZXNzaW9uKSB7XG4gICAgICAgICAgICBzd2l0Y2ggKG5vZGUudHlwZSkge1xuICAgICAgICAgICAgICAgIGNhc2UgU3ludGF4LkJsb2NrU3RhdGVtZW50OlxuICAgICAgICAgICAgICAgIGNhc2UgU3ludGF4LkJyZWFrU3RhdGVtZW50OlxuICAgICAgICAgICAgICAgIGNhc2UgU3ludGF4LkNhdGNoQ2xhdXNlOlxuICAgICAgICAgICAgICAgIGNhc2UgU3ludGF4LkNvbnRpbnVlU3RhdGVtZW50OlxuICAgICAgICAgICAgICAgIGNhc2UgU3ludGF4LkRpcmVjdGl2ZVN0YXRlbWVudDpcbiAgICAgICAgICAgICAgICBjYXNlIFN5bnRheC5Eb1doaWxlU3RhdGVtZW50OlxuICAgICAgICAgICAgICAgIGNhc2UgU3ludGF4LkRlYnVnZ2VyU3RhdGVtZW50OlxuICAgICAgICAgICAgICAgIGNhc2UgU3ludGF4LkVtcHR5U3RhdGVtZW50OlxuICAgICAgICAgICAgICAgIGNhc2UgU3ludGF4LkV4cHJlc3Npb25TdGF0ZW1lbnQ6XG4gICAgICAgICAgICAgICAgY2FzZSBTeW50YXguRm9yU3RhdGVtZW50OlxuICAgICAgICAgICAgICAgIGNhc2UgU3ludGF4LkZvckluU3RhdGVtZW50OlxuICAgICAgICAgICAgICAgIGNhc2UgU3ludGF4LkZ1bmN0aW9uRGVjbGFyYXRpb246XG4gICAgICAgICAgICAgICAgY2FzZSBTeW50YXguSWZTdGF0ZW1lbnQ6XG4gICAgICAgICAgICAgICAgY2FzZSBTeW50YXguTGFiZWxlZFN0YXRlbWVudDpcbiAgICAgICAgICAgICAgICBjYXNlIFN5bnRheC5Qcm9ncmFtOlxuICAgICAgICAgICAgICAgIGNhc2UgU3ludGF4LlJldHVyblN0YXRlbWVudDpcbiAgICAgICAgICAgICAgICBjYXNlIFN5bnRheC5Td2l0Y2hTdGF0ZW1lbnQ6XG4gICAgICAgICAgICAgICAgY2FzZSBTeW50YXguU3dpdGNoQ2FzZTpcbiAgICAgICAgICAgICAgICBjYXNlIFN5bnRheC5UaHJvd1N0YXRlbWVudDpcbiAgICAgICAgICAgICAgICBjYXNlIFN5bnRheC5UcnlTdGF0ZW1lbnQ6XG4gICAgICAgICAgICAgICAgY2FzZSBTeW50YXguVmFyaWFibGVEZWNsYXJhdGlvbjpcbiAgICAgICAgICAgICAgICBjYXNlIFN5bnRheC5WYXJpYWJsZURlY2xhcmF0b3I6XG4gICAgICAgICAgICAgICAgY2FzZSBTeW50YXguV2hpbGVTdGF0ZW1lbnQ6XG4gICAgICAgICAgICAgICAgY2FzZSBTeW50YXguV2l0aFN0YXRlbWVudDpcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHN0YXRlbWVudC5jYWxsKHRoaXMsIG5vZGUsIHBhcmVudCwgY3R4KTtcblxuICAgICAgICAgICAgICAgIGNhc2UgU3ludGF4LkFzc2lnbm1lbnRFeHByZXNzaW9uOlxuICAgICAgICAgICAgICAgIGNhc2UgU3ludGF4LkFycmF5RXhwcmVzc2lvbjpcbiAgICAgICAgICAgICAgICBjYXNlIFN5bnRheC5BcnJheVBhdHRlcm46XG4gICAgICAgICAgICAgICAgY2FzZSBTeW50YXguQmluYXJ5RXhwcmVzc2lvbjpcbiAgICAgICAgICAgICAgICBjYXNlIFN5bnRheC5DYWxsRXhwcmVzc2lvbjpcbiAgICAgICAgICAgICAgICBjYXNlIFN5bnRheC5Db25kaXRpb25hbEV4cHJlc3Npb246XG4gICAgICAgICAgICAgICAgY2FzZSBTeW50YXguRnVuY3Rpb25FeHByZXNzaW9uOlxuICAgICAgICAgICAgICAgIGNhc2UgU3ludGF4LklkZW50aWZpZXI6XG4gICAgICAgICAgICAgICAgY2FzZSBTeW50YXguTGl0ZXJhbDpcbiAgICAgICAgICAgICAgICBjYXNlIFN5bnRheC5Mb2dpY2FsRXhwcmVzc2lvbjpcbiAgICAgICAgICAgICAgICBjYXNlIFN5bnRheC5NZW1iZXJFeHByZXNzaW9uOlxuICAgICAgICAgICAgICAgIGNhc2UgU3ludGF4Lk5ld0V4cHJlc3Npb246XG4gICAgICAgICAgICAgICAgY2FzZSBTeW50YXguT2JqZWN0RXhwcmVzc2lvbjpcbiAgICAgICAgICAgICAgICBjYXNlIFN5bnRheC5PYmplY3RQYXR0ZXJuOlxuICAgICAgICAgICAgICAgIGNhc2UgU3ludGF4LlByb3BlcnR5OlxuICAgICAgICAgICAgICAgIGNhc2UgU3ludGF4LlNlcXVlbmNlRXhwcmVzc2lvbjpcbiAgICAgICAgICAgICAgICBjYXNlIFN5bnRheC5UaGlzRXhwcmVzc2lvbjpcbiAgICAgICAgICAgICAgICBjYXNlIFN5bnRheC5VbmFyeUV4cHJlc3Npb246XG4gICAgICAgICAgICAgICAgY2FzZSBTeW50YXguVXBkYXRlRXhwcmVzc2lvbjpcbiAgICAgICAgICAgICAgICBjYXNlIFN5bnRheC5ZaWVsZEV4cHJlc3Npb246XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBleHByZXNzaW9uLmNhbGwodGhpcywgbm9kZSwgcGFyZW50LCBjdHgpO1xuXG4gICAgICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdVbmtub3duIG5vZGUgdHlwZTogJyArIG5vZGUudHlwZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqXG4gICAgICAgICAqIEBwYXJhbSB7T2JqZWN0fSBmdW5jdGlvbkFTVFxuICAgICAgICAgKiBAcGFyYW0ge0FycmF5LjxUeXBlSW5mbz4gcGFyYW1zXG4gICAgICAgICAqIEBwYXJhbSB7Q29udGV4dH0gcGFyZW50Q29udGV4dFxuICAgICAgICAgKiBAcmV0dXJucyB7Kn1cbiAgICAgICAgICovXG4gICAgICAgIGluZmVyRnVuY3Rpb246IGZ1bmN0aW9uIChmdW5jdGlvbkFTVCwgcGFyYW1zLCBwYXJlbnRDb250ZXh0KSB7XG4gICAgICAgICAgICB2YXIgZnVuY3Rpb25OYW1lID0gZnVuY3Rpb25BU1QuaWQubmFtZTtcbiAgICAgICAgICAgIHZhciB0YXJnZXRDb250ZXh0TmFtZSA9IHBhcmVudENvbnRleHQuZ2V0VmFyaWFibGVJZGVudGlmaWVyKGZ1bmN0aW9uTmFtZSk7XG4gICAgICAgICAgICB0aGlzLmluamVjdGlvbnNbdGFyZ2V0Q29udGV4dE5hbWVdID0gcGFyYW1zO1xuXG4gICAgICAgICAgICAvLyBXZSBoYXZlIGEgc3BlY2lmYyB0eXBlIHNldCBpbiBwYXJhbXMgdGhhdCB3ZSBhbm5vdGF0ZSB0byB0aGVcbiAgICAgICAgICAgIC8vIGZ1bmN0aW9uIEFTVFxuICAgICAgICAgICAgZm9yKHZhciBpID0gMDsgaSA8IHBhcmFtcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgIGlmIChpID09IGZ1bmN0aW9uQVNULnBhcmFtcy5sZW5ndGgpXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIHZhciBmdW5jUGFyYW0gPSBuZXcgQW5ub3RhdGlvbihmdW5jdGlvbkFTVC5wYXJhbXNbaV0pO1xuICAgICAgICAgICAgICAgIGZ1bmNQYXJhbS5zZXRGcm9tRXh0cmEocGFyYW1zW2ldLmdldEV4dHJhKCkpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB2YXIgb2xkRW50cnlQb2ludCA9IHRoaXMuZW50cnlQb2ludDtcbiAgICAgICAgICAgIHRoaXMuZW50cnlQb2ludCA9IHRhcmdldENvbnRleHROYW1lO1xuICAgICAgICAgICAgdGhpcy5wdXNoQ29udGV4dChwYXJlbnRDb250ZXh0KTtcbiAgICAgICAgICAgIC8vY29uc29sZS5sb2coXCJTdGFydGluZyB0byB0cmF2ZXJzZTogXCIgKyBmdW5jdGlvbk5hbWUgKyBcIiBpbiBjb250ZXh0IFwiICsgcGFyZW50Q29udGV4dC5zdHIoKSlcbiAgICAgICAgICAgIHZhciBhc3QgPSB0aGlzLnRyYXZlcnNlKGZ1bmN0aW9uQVNUKTtcbiAgICAgICAgICAgIHRoaXMucG9wQ29udGV4dCgpO1xuICAgICAgICAgICAgdGhpcy5lbnRyeVBvaW50ID0gb2xkRW50cnlQb2ludDtcblxuICAgICAgICAgICAgcmV0dXJuIGFzdDtcbiAgICAgICAgfSxcblxuICAgICAgICBpbmZlclByb2dyYW06IGZ1bmN0aW9uKHByZywgcGFyYW1zKSB7XG4gICAgICAgICAgICB2YXIgcGFyYW1zID0gcGFyYW1zIHx8IHt9O1xuICAgICAgICAgICAgdmFyIHByb2dyYW1Db250ZXh0ID0gcmVnaXN0ZXJHbG9iYWxDb250ZXh0KHByZyk7XG5cbiAgICAgICAgICAgIHRoaXMucHVzaENvbnRleHQocHJvZ3JhbUNvbnRleHQpO1xuICAgICAgICAgICAgdGhpcy5idWlsZEZ1bmN0aW9uTWFwKHByZyk7XG4gICAgICAgICAgICB0aGlzLnRyYXZlcnNlKHByZyk7XG4gICAgICAgICAgICB0aGlzLnBvcENvbnRleHQoKTtcblxuICAgICAgICAgICAgdmFyIGVudHJ5UG9pbnQgPSB0aGlzLmVudHJ5UG9pbnQ7XG4gICAgICAgICAgICBpZiAodGhpcy5mdW5jdGlvbnMub3JpZy5oYXNPd25Qcm9wZXJ0eShlbnRyeVBvaW50KSkge1xuICAgICAgICAgICAgICAgIHZhciBhc3QgPSB0aGlzLmZ1bmN0aW9ucy5vcmlnW2VudHJ5UG9pbnRdO1xuICAgICAgICAgICAgICAgIHZhciBwYXJhbXMgPSB0aGlzLmFubm90YXRlUGFyYW1ldGVycyhwYXJhbXNbZW50cnlQb2ludF0pO1xuICAgICAgICAgICAgICAgIHZhciBhYXN0ID0gdGhpcy5pbmZlckZ1bmN0aW9uKGFzdCwgcGFyYW1zLCBwcm9ncmFtQ29udGV4dCk7XG4gICAgICAgICAgICAgICAgZm9yKHZhciBmdW5jIGluIHRoaXMuZnVuY3Rpb25zLmRlcml2ZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHZhcmlhdGlvbnMgPSB0aGlzLmZ1bmN0aW9ucy5kZXJpdmVkW2Z1bmNdO1xuICAgICAgICAgICAgICAgICAgICBmb3IgKHZhciBzaWduYXR1cmUgaW4gdmFyaWF0aW9ucykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcHJnLmJvZHkucHVzaCh2YXJpYXRpb25zW3NpZ25hdHVyZV0uYXN0KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHByZy5ib2R5LnB1c2goYWFzdCk7XG5cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKHRoaXMuY29udGV4dC5sZW5ndGgpXG4gICAgICAgICAgICAgICAgdGhyb3cgRXJyb3IoXCJTb21ldGhpbmcgd2VudCB3cm9uZ1wiKTtcbiAgICAgICAgICAgIHJldHVybiBwcmc7XG4gICAgICAgIH0sXG4gICAgICAgIGdldEZ1bmN0aW9uSW5mb3JtYXRpb25Gb3I6IGZ1bmN0aW9uKG5hbWUsIGFyZ3MsIGRlZmluaW5nQ29udGV4dCkge1xuICAgICAgICAgICAgdmFyIHNpZ25hdHVyZSA9IGFyZ3MucmVkdWNlKGZ1bmN0aW9uKHN0ciwgYXJnKSB7IHJldHVybiBzdHIgKyBhcmcuZ2V0VHlwZVN0cmluZygpfSwgXCJcIik7XG4gICAgICAgICAgICBpZiAodGhpcy5mdW5jdGlvbnMuZGVyaXZlZC5oYXNPd25Qcm9wZXJ0eShuYW1lKSkge1xuICAgICAgICAgICAgICAgIHZhciBkZXJpdmVkRnVuY3Rpb24gPSB0aGlzLmZ1bmN0aW9ucy5kZXJpdmVkW25hbWVdO1xuICAgICAgICAgICAgICAgIGlmIChkZXJpdmVkRnVuY3Rpb24uaGFzT3duUHJvcGVydHkoc2lnbmF0dXJlKSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZGVyaXZlZEZ1bmN0aW9uW3NpZ25hdHVyZV0uaW5mbztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodGhpcy5mdW5jdGlvbnMub3JpZy5oYXNPd25Qcm9wZXJ0eShuYW1lKSkge1xuICAgICAgICAgICAgICAgIHZhciBhc3QgPSB0aGlzLmZ1bmN0aW9ucy5vcmlnW25hbWVdO1xuICAgICAgICAgICAgICAgIHZhciB2YXJpYXRpb25zID0gdGhpcy5mdW5jdGlvbnMuZGVyaXZlZFtuYW1lXSA9IHRoaXMuZnVuY3Rpb25zLmRlcml2ZWRbbmFtZV0gfHwge307XG4gICAgICAgICAgICAgICAgdmFyIGRlcml2ZWQgPSB2YXJpYXRpb25zW3NpZ25hdHVyZV0gPSB7fTtcbiAgICAgICAgICAgICAgICBkZXJpdmVkLmFzdCA9IHRoaXMuaW5mZXJGdW5jdGlvbihKU09OLnBhcnNlKEpTT04uc3RyaW5naWZ5KGFzdCkpLCBhcmdzLCBkZWZpbmluZ0NvbnRleHQpO1xuICAgICAgICAgICAgICAgIGRlcml2ZWQuaW5mbyA9IGRlcml2ZWQuYXN0LmV4dHJhLnJldHVybkluZm87XG4gICAgICAgICAgICAgICAgZGVyaXZlZC5pbmZvLm5ld05hbWUgPSBuYW1lLnJlcGxhY2UoL1xcLi9nLCAnXycpICsgT2JqZWN0LmtleXModmFyaWF0aW9ucykubGVuZ3RoO1xuICAgICAgICAgICAgICAgIGRlcml2ZWQuYXN0LmlkLm5hbWUgPSBkZXJpdmVkLmluZm8ubmV3TmFtZTtcbiAgICAgICAgICAgICAgICByZXR1cm4gZGVyaXZlZC5pbmZvO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiQ291bGQgbm90IHJlc29sdmUgZnVuY3Rpb24gXCIgKyBuYW1lKTtcbiAgICAgICAgfVxuXG4gICAgfSk7XG5cblxuICAgIG5zLmluZmVyID0gZnVuY3Rpb24gKGFzdCwgb3B0KSB7XG4gICAgICAgIHZhciB0aSA9IG5ldyBUeXBlSW5mZXJlbmNlKGFzdCwgb3B0KTtcbiAgICAgICAgcmV0dXJuIHRpLmluZmVyUHJvZ3JhbSh0aS5yb290LCBvcHQuaW5qZWN0KTtcbiAgICB9O1xuXG5cbn0oZXhwb3J0cykpO1xuIiwiKGZ1bmN0aW9uKG5zKXtcblxuICAgIHZhciBTaGFkZSA9IHJlcXVpcmUoXCIuLi9pbnRlcmZhY2VzLmpzXCIpLFxuICAgICAgICBTeW50YXggPSByZXF1aXJlKCdlc3RyYXZlcnNlJykuU3ludGF4LFxuICAgICAgICBCYXNlID0gcmVxdWlyZShcIi4vaW5kZXguanNcIiksXG4gICAgICAgIFR5cGVJbmZvID0gcmVxdWlyZShcIi4vdHlwZWluZm8uanNcIikuVHlwZUluZm87XG5cbiAgICB2YXIgVFlQRVMgPSBTaGFkZS5UWVBFUyxcbiAgICAgICAgS0lORFMgPSBTaGFkZS5PQkpFQ1RfS0lORFM7XG5cblxuICAgIC8qKlxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBub2RlXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGV4dHJhXG4gICAgICogQGV4dGVuZHMgVHlwZUluZm9cbiAgICAgKiBAY29uc3RydWN0b3JcbiAgICAgKi9cbiAgICB2YXIgQW5ub3RhdGlvbiA9IGZ1bmN0aW9uIChub2RlLCBleHRyYSkge1xuICAgICAgICBUeXBlSW5mby5jYWxsKHRoaXMsIG5vZGUsIGV4dHJhKTtcbiAgICB9O1xuXG4gICAgQmFzZS5jcmVhdGVDbGFzcyhBbm5vdGF0aW9uLCBUeXBlSW5mbywge1xuXG4gICAgICAgIHNldENhbGwgOiBmdW5jdGlvbihjYWxsKSB7XG4gICAgICAgICAgICB2YXIgZXh0cmEgPSB0aGlzLmdldEV4dHJhKCk7XG4gICAgICAgICAgICBleHRyYS5ldmFsdWF0ZSA9IGNhbGw7XG4gICAgICAgIH0sXG4gICAgICAgIGdldENhbGwgOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmdldEV4dHJhKCkuZXZhbHVhdGU7XG4gICAgICAgIH0sXG4gICAgICAgIGNsZWFyQ2FsbDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICB2YXIgZXh0cmEgPSB0aGlzLmdldEV4dHJhKCk7XG4gICAgICAgICAgICBkZWxldGUgZXh0cmEuZXZhbHVhdGU7XG4gICAgICAgIH0sXG4gICAgICAgIGVsaW1pbmF0ZSA6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgdmFyIGV4dHJhID0gdGhpcy5nZXRFeHRyYSgpO1xuICAgICAgICAgICAgZXh0cmEuZWxpbWluYXRlID0gdHJ1ZTtcbiAgICAgICAgfSxcbiAgICAgICAgY2FuRWxpbWluYXRlIDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICB2YXIgZXh0cmEgPSB0aGlzLmdldEV4dHJhKCk7XG4gICAgICAgICAgICByZXR1cm4gZXh0cmEuZWxpbWluYXRlID09IHRydWU7XG4gICAgICAgIH1cblxuICAgIH0pO1xuXG4gICAgLyoqXG4gICAgICogQHBhcmFtIHtBcnJheS48b2JqZWN0Pn0gYXJyIEFycmF5IG9mIG5vZGVzXG4gICAgICogQHBhcmFtIHtDb250ZXh0fSBjdHhcbiAgICAgKiBAcmV0dXJucyB7QXJyYXkuPEFubm90YXRpb24+fVxuICAgICAqL1xuICAgIEFubm90YXRpb24uY3JlYXRlQW5ub3RhdGVkTm9kZUFycmF5ID0gZnVuY3Rpb24oYXJyLCBjdHgpIHtcbiAgICAgICAgcmV0dXJuIGFyci5tYXAoZnVuY3Rpb24gKGFyZykge1xuICAgICAgICAgICAgcmV0dXJuIGN0eC5jcmVhdGVUeXBlSW5mbyhhcmcpO1xuICAgICAgICB9KTtcbiAgICB9XG5cblxuICAgIC8qKlxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBub2RlXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGV4dHJhXG4gICAgICogQGV4dGVuZHMgQW5ub3RhdGlvblxuICAgICAqIEBjb25zdHJ1Y3RvclxuICAgICAqL1xuICAgIHZhciBGdW5jdGlvbkFubm90YXRpb24gPSBmdW5jdGlvbiAobm9kZSwgZXh0cmEpIHtcbiAgICAgICAgQW5ub3RhdGlvbi5jYWxsKHRoaXMsIG5vZGUsIGV4dHJhKTtcbiAgICAgICAgdGhpcy5zZXRUeXBlKFRZUEVTLkZVTkNUSU9OKTtcbiAgICB9O1xuXG4gICAgQmFzZS5jcmVhdGVDbGFzcyhGdW5jdGlvbkFubm90YXRpb24sIEFubm90YXRpb24sIHtcbiAgICAgICAgZ2V0UmV0dXJuSW5mbzogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5nZXRFeHRyYSgpLnJldHVybkluZm87XG4gICAgICAgIH0sXG4gICAgICAgIHNldFJldHVybkluZm86IGZ1bmN0aW9uKGluZm8pIHtcbiAgICAgICAgICAgIHRoaXMuZ2V0RXh0cmEoKS5yZXR1cm5JbmZvID0gaW5mbztcbiAgICAgICAgfSxcbiAgICAgICAgaXNVc2VkOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHJldHVybiAhIXRoaXMuZ2V0RXh0cmEoKS51c2VkO1xuICAgICAgICB9LFxuICAgICAgICBzZXRVc2VkOiBmdW5jdGlvbih2KSB7XG4gICAgICAgICAgICB0aGlzLmdldEV4dHJhKCkudXNlZCA9IHY7XG4gICAgICAgIH1cbiAgICB9KTtcblxuICAgIG5zLkFubm90YXRpb24gPSBBbm5vdGF0aW9uO1xuICAgIG5zLkZ1bmN0aW9uQW5ub3RhdGlvbiA9IEZ1bmN0aW9uQW5ub3RhdGlvbjtcbiAgICBucy5BTk5PID0gZnVuY3Rpb24ob2JqZWN0KXtyZXR1cm4gbmV3IEFubm90YXRpb24ob2JqZWN0KX07XG5cbn0oZXhwb3J0cykpO1xuIiwiKGZ1bmN0aW9uKG5zKXtcblxuICAgIHZhciBCYXNlID0gcmVxdWlyZShcIi4vaW5kZXguanNcIiksXG4gICAgICAgIFNoYWRlID0gcmVxdWlyZShcIi4uL2ludGVyZmFjZXMuanNcIiksXG4gICAgICAgIFRZUEVTID0gU2hhZGUuVFlQRVMsXG4gICAgICAgIEFubm90YXRpb24gPSByZXF1aXJlKFwiLi9hbm5vdGF0aW9uLmpzXCIpLkFubm90YXRpb24sXG4gICAgICAgIFR5cGVJbmZvID0gcmVxdWlyZShcIi4vdHlwZWluZm8uanNcIikuVHlwZUluZm8sXG4gICAgICAgIFN5bnRheCA9IHJlcXVpcmUoJ2VzdHJhdmVyc2UnKS5TeW50YXg7XG5cbiAgICBucy5nZXRDb250ZXh0ID0gZnVuY3Rpb24ocmVnaXN0cnkpIHtcblxuICAgIC8qKlxuICAgICAqXG4gICAgICogQHBhcmFtIGJpbmRpbmdcbiAgICAgKiBAZXh0ZW5kcyBUeXBlSW5mb1xuICAgICAqIEBjb25zdHJ1Y3RvclxuICAgICAqL1xuICAgIHZhciBCaW5kaW5nID0gZnVuY3Rpb24oYmluZGluZywgcmVnaXN0ZXJ5KSB7XG4gICAgICAgIFR5cGVJbmZvLmNhbGwodGhpcywgYmluZGluZyk7XG4gICAgICAgIGlmKHRoaXMubm9kZS5yZWYpIHtcbiAgICAgICAgICAgIGlmICghcmVnaXN0ZXJ5W3RoaXMubm9kZS5yZWZdKVxuICAgICAgICAgICAgICAgIHRocm93IEVycm9yKFwiTm8gb2JqZWN0IGhhcyBiZWVuIHJlZ2lzdGVyZWQgZm9yOiBcIiArIHRoaXMubm9kZS5yZWYpO1xuICAgICAgICAgICAgdGhpcy5nbG9iYWxPYmplY3QgPSByZWdpc3RlcnlbdGhpcy5ub2RlLnJlZl0ub2JqZWN0O1xuICAgICAgICAgICAgaWYgKHRoaXMuZ2xvYmFsT2JqZWN0KSB7XG4gICAgICAgICAgICAgICAgdGhpcy5zZXRUeXBlKFRZUEVTLk9CSkVDVCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9O1xuXG5cbiAgICBCYXNlLmNyZWF0ZUNsYXNzKEJpbmRpbmcsIFR5cGVJbmZvLCB7XG4gICAgICAgIGhhc0NvbnN0cnVjdG9yOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHJldHVybiAhIXRoaXMuZ2V0Q29uc3RydWN0b3IoKTtcbiAgICAgICAgfSxcbiAgICAgICAgZ2V0Q29uc3RydWN0b3I6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuZ2xvYmFsT2JqZWN0ICYmIHRoaXMuZ2xvYmFsT2JqZWN0LmNvbnN0cnVjdG9yO1xuICAgICAgICB9LFxuICAgICAgICBpc0luaXRpYWxpemVkOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLm5vZGUuaW5pdGlhbGl6ZWQ7XG4gICAgICAgIH0sXG4gICAgICAgIHNldEluaXRpYWxpemVkOiBmdW5jdGlvbih2KSB7XG4gICAgICAgICAgICB0aGlzLm5vZGUuaW5pdGlhbGl6ZWQgPSB2O1xuICAgICAgICB9LFxuICAgICAgICBoYXNTdGF0aWNWYWx1ZTogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH0sXG4gICAgICAgIGlzR2xvYmFsOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLm5vZGUuaW5mbyAmJiB0aGlzLm5vZGUuaW5mby5fZ2xvYmFsIHx8IFR5cGVJbmZvLnByb3RvdHlwZS5pc0dsb2JhbC5jYWxsKHRoaXMpO1xuICAgICAgICB9LFxuICAgICAgICBnZXRUeXBlOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmdsb2JhbE9iamVjdD8gVFlQRVMuT0JKRUNUIDogVHlwZUluZm8ucHJvdG90eXBlLmdldFR5cGUuY2FsbCh0aGlzKTtcbiAgICAgICAgfSxcbiAgICAgICAgZ2V0T2JqZWN0SW5mbzogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5nbG9iYWxPYmplY3QpXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuZ2xvYmFsT2JqZWN0LnN0YXRpYztcbiAgICAgICAgICAgIGlmICh0aGlzLmlzT2JqZWN0KCkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5ub2RlLmluZm8gfHwgcmVnaXN0cnkuZ2V0SW5zdGFuY2VGb3JLaW5kKHRoaXMuZ2V0S2luZCgpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9LFxuICAgICAgICBnZXRJbmZvRm9yU2lnbmF0dXJlOiBmdW5jdGlvbihzaWduYXR1cmUpIHtcbiAgICAgICAgICAgIHZhciBleHRyYSA9IHRoaXMuZ2V0RXh0cmEoKTtcbiAgICAgICAgICAgIGlmKCFleHRyYS5zaWduYXR1cmVzKVxuICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICAgICAgcmV0dXJuIGV4dHJhLnNpZ25hdHVyZXNbc2lnbmF0dXJlXTtcbiAgICAgICAgfSxcbiAgICAgICAgc2V0SW5mb0ZvclNpZ25hdHVyZTogZnVuY3Rpb24oc2lnbmF0dXJlLCBpbmZvKSB7XG4gICAgICAgICAgICB2YXIgZXh0cmEgPSB0aGlzLmdldEV4dHJhKCk7XG4gICAgICAgICAgICBpZighZXh0cmEuc2lnbmF0dXJlcylcbiAgICAgICAgICAgICAgICBleHRyYS5zaWduYXR1cmVzID0ge307XG4gICAgICAgICAgICByZXR1cm4gZXh0cmEuc2lnbmF0dXJlc1tzaWduYXR1cmVdID0gaW5mbztcbiAgICAgICAgfVxuXG5cbiAgICB9KVxuXG5cbiAgICAvKipcbiAgICAgKiBAcGFyYW0ge0NvbnRleHR8bnVsbH0gcGFyZW50XG4gICAgICogQHBhcmFtIG9wdFxuICAgICAqIEBjb25zdHJ1Y3RvclxuICAgICAqL1xuICAgIHZhciBDb250ZXh0ID0gZnVuY3Rpb24obm9kZSwgcGFyZW50LCBvcHQpIHtcbiAgICAgICAgb3B0ID0gb3B0IHx8IHt9O1xuXG4gICAgICAgIC8qKiBAdHlwZSAoQ29udGV4dHxudWxsKSAqL1xuICAgICAgICB0aGlzLnBhcmVudCA9IHBhcmVudCB8fCBvcHQucGFyZW50IHx8IG51bGw7XG4gICAgICAgIHRoaXMucmVnaXN0ZXJ5ID0gcGFyZW50ID8gcGFyZW50LnJlZ2lzdGVyeSA6IHt9O1xuXG4gICAgICAgIHRoaXMuY29udGV4dCA9IG5vZGUuY29udGV4dCA9IG5vZGUuY29udGV4dCB8fCB7fTtcblxuICAgICAgICAvKiogQHR5cGUge09iamVjdC48c3RyaW5nLCB7aW5pdGlhbGl6ZWQ6IGJvb2xlYW4sIGFubm90YXRpb246IEFubm90YXRpb259Pn0gKi9cbiAgICAgICAgdGhpcy5jb250ZXh0LmJpbmRpbmdzID0gdGhpcy5jb250ZXh0LmJpbmRpbmdzIHx8IHt9O1xuICAgICAgICBpZihvcHQuYmluZGluZ3MpIHtcbiAgICAgICAgICAgIEJhc2UuZXh0ZW5kKHRoaXMuY29udGV4dC5iaW5kaW5ncywgb3B0LmJpbmRpbmdzKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuY29udGV4dC5uYW1lID0gb3B0Lm5hbWUgfHwgbm9kZS5uYW1lIHx8IFwiPGFub255bW91cz5cIjtcblxuICAgIH07XG5cbiAgICBCYXNlLmV4dGVuZChDb250ZXh0LnByb3RvdHlwZSwge1xuXG4gICAgICAgIGdldE5hbWU6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuY29udGV4dC5uYW1lO1xuICAgICAgICB9LFxuXG4gICAgICAgIGdldEJpbmRpbmdzOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmNvbnRleHQuYmluZGluZ3M7XG4gICAgICAgIH0sXG5cbiAgICAgICAgdXBkYXRlUmV0dXJuSW5mbzogZnVuY3Rpb24oYW5ub3RhdGlvbikge1xuICAgICAgICAgICAgdGhpcy5jb250ZXh0LnJldHVybkluZm8gPSBhbm5vdGF0aW9uLmdldEV4dHJhKCk7XG4gICAgICAgIH0sXG4gICAgICAgIGdldFJldHVybkluZm86IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuY29udGV4dC5yZXR1cm5JbmZvO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBAcGFyYW0ge3N0cmluZ30gbmFtZVxuICAgICAgICAgKiBAcmV0dXJucyB7Kn1cbiAgICAgICAgICovXG4gICAgICAgIGdldEJpbmRpbmdCeU5hbWU6IGZ1bmN0aW9uKG5hbWUpIHtcbiAgICAgICAgICAgIHZhciBiaW5kaW5ncyA9IHRoaXMuZ2V0QmluZGluZ3MoKTtcbiAgICAgICAgICAgIHZhciBiaW5kaW5nID0gYmluZGluZ3NbbmFtZV07XG4gICAgICAgICAgICBpZihiaW5kaW5nICE9PSB1bmRlZmluZWQpXG4gICAgICAgICAgICAgICAgcmV0dXJuIG5ldyBCaW5kaW5nKGJpbmRpbmcsIHRoaXMucmVnaXN0ZXJ5KTtcbiAgICAgICAgICAgIGlmICh0aGlzLnBhcmVudClcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5wYXJlbnQuZ2V0QmluZGluZ0J5TmFtZShuYW1lKTtcbiAgICAgICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICAgIH0sXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEBwYXJhbSB7c3RyaW5nfSBuYW1lXG4gICAgICAgICAqIEByZXR1cm5zIHtDb250ZXh0fG51bGx9XG4gICAgICAgICAqL1xuICAgICAgICBnZXRDb250ZXh0Rm9yTmFtZTogZnVuY3Rpb24obmFtZSkge1xuICAgICAgICAgICAgdmFyIGJpbmRpbmdzID0gdGhpcy5nZXRCaW5kaW5ncygpO1xuICAgICAgICAgICAgaWYoYmluZGluZ3NbbmFtZV0gIT09IHVuZGVmaW5lZClcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgICAgIGlmICh0aGlzLnBhcmVudClcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5wYXJlbnQuZ2V0Q29udGV4dEZvck5hbWUobmFtZSk7XG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgfSxcblxuICAgICAgICBnZXRWYXJpYWJsZUlkZW50aWZpZXI6IGZ1bmN0aW9uKG5hbWUpIHtcbiAgICAgICAgICAgIHZhciBjb250ZXh0ID0gdGhpcy5nZXRDb250ZXh0Rm9yTmFtZShuYW1lKTtcbiAgICAgICAgICAgIGlmKCFjb250ZXh0KVxuICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICAgICAgcmV0dXJuIGNvbnRleHQuc3RyKCkgKyBcIi5cIiArIG5hbWU7XG4gICAgICAgIH0sXG5cbiAgICAgICAgZGVjbGFyZVZhcmlhYmxlOiBmdW5jdGlvbihuYW1lLCBmYWlsLCBwb3NpdGlvbikge1xuICAgICAgICAgICAgdmFyIGJpbmRpbmdzID0gdGhpcy5nZXRCaW5kaW5ncygpO1xuICAgICAgICAgICAgZmFpbCA9IChmYWlsID09IHVuZGVmaW5lZCkgPyB0cnVlIDogZmFpbDtcbiAgICAgICAgICAgIGlmIChiaW5kaW5nc1tuYW1lXSkge1xuICAgICAgICAgICAgICAgIGlmIChmYWlsKSB7XG4gICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihuYW1lICsgXCIgd2FzIGFscmVhZHkgZGVjbGFyZWQgaW4gdGhpcyBzY29wZS5cIilcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB2YXIgaW5pdCA9IHtcbiAgICAgICAgICAgICAgICBpbml0aWFsaXplZCA6IGZhbHNlLFxuICAgICAgICAgICAgICAgIGluaXRQb3NpdGlvbjogcG9zaXRpb24sXG4gICAgICAgICAgICAgICAgZXh0cmE6IHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogVFlQRVMuVU5ERUZJTkVEXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIGJpbmRpbmdzW25hbWVdID0gaW5pdDtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKlxuICAgICAgICAgKiBAcGFyYW0ge3N0cmluZ30gbmFtZVxuICAgICAgICAgKiBAcGFyYW0ge1R5cGVJbmZvfSB0eXBlSW5mb1xuICAgICAgICAgKi9cbiAgICAgICAgdXBkYXRlRXhwcmVzc2lvbjogZnVuY3Rpb24gKG5hbWUsIHR5cGVJbmZvKSB7XG4gICAgICAgICAgICB2YXIgdiA9IHRoaXMuZ2V0QmluZGluZ0J5TmFtZShuYW1lKTtcbiAgICAgICAgICAgIGlmICghdikge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIlZhcmlhYmxlIHdhcyBub3QgZGVjbGFyZWQgaW4gdGhpcyBzY29wZTogXCIgKyBuYW1lKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh2LmlzSW5pdGlhbGl6ZWQoKSAmJiB2LmdldFR5cGUoKSAhPT0gdHlwZUluZm8uZ2V0VHlwZSgpKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiVmFyaWFibGUgbWF5IG5vdCBjaGFuZ2UgaXQncyB0eXBlOiBcIiArIG5hbWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKCF2LmlzSW5pdGlhbGl6ZWQoKSkge1xuICAgICAgICAgICAgICAgIC8vIEFubm90YXRlIHRoZSBkZWNsYXJhdGlvbiwgaWYgb25lIGlzIGdpdmVuXG4gICAgICAgICAgICAgICAgaWYodi5ub2RlLmluaXRQb3NpdGlvbilcbiAgICAgICAgICAgICAgICAgICAgdi5ub2RlLmluaXRQb3NpdGlvbi5jb3B5KHR5cGVJbmZvKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdi5jb3B5KHR5cGVJbmZvKTtcbiAgICAgICAgICAgIHYuc2V0RHluYW1pY1ZhbHVlKCk7XG4gICAgICAgICAgICB2LnNldEluaXRpYWxpemVkKCF0eXBlSW5mby5pc1VuZGVmaW5lZCgpKTtcbiAgICAgICAgfSxcblxuICAgICAgICByZWdpc3Rlck9iamVjdDogZnVuY3Rpb24obmFtZSwgb2JqKSB7XG4gICAgICAgICAgICB0aGlzLnJlZ2lzdGVyeVtvYmouaWRdID0gb2JqO1xuICAgICAgICAgICAgdmFyIGJpbmRpbmdzID0gdGhpcy5nZXRCaW5kaW5ncygpO1xuICAgICAgICAgICAgYmluZGluZ3NbbmFtZV0gPSB7XG4gICAgICAgICAgICAgICAgZXh0cmE6IHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogVFlQRVMuT0JKRUNUXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICByZWY6IG9iai5pZFxuICAgICAgICAgICAgfTtcbiAgICAgICAgfSxcblxuICAgICAgICBkZWNsYXJlUGFyYW1ldGVyczogZnVuY3Rpb24ocGFyYW1zKSB7XG4gICAgICAgICAgICB2YXIgYmluZGluZ3MgPSB0aGlzLmdldEJpbmRpbmdzKCk7XG4gICAgICAgICAgICB0aGlzLnBhcmFtcyA9IFtdO1xuICAgICAgICAgICAgZm9yKHZhciBpID0gMDsgaSA8IHBhcmFtcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgIHZhciBwYXJhbWV0ZXIgPSBwYXJhbXNbaV07XG4gICAgICAgICAgICAgICAgdGhpcy5wYXJhbXNbaV0gPSBwYXJhbWV0ZXIubmFtZTtcbiAgICAgICAgICAgICAgICBiaW5kaW5nc1twYXJhbWV0ZXIubmFtZV0gPSB7IHR5cGU6IFRZUEVTLlVOREVGSU5FRCB9O1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKlxuICAgICAgICAgKiBAcGFyYW0ge0FycmF5LjxUeXBlSW5mbz59IDxwYXJhbXNcbiAgICAgICAgICovXG4gICAgICAgIGluamVjdFBhcmFtZXRlcnM6IGZ1bmN0aW9uKHBhcmFtcykge1xuICAgICAgICAgICAgZm9yKHZhciBpID0gMDsgaTwgcGFyYW1zLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgaWYgKGkgPT0gdGhpcy5wYXJhbXMubGVuZ3RoKVxuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB2YXIgbmFtZSA9IHRoaXMucGFyYW1zW2ldO1xuICAgICAgICAgICAgICAgIHZhciBiaW5kaW5ncyA9IHRoaXMuZ2V0QmluZGluZ3MoKTtcbiAgICAgICAgICAgICAgICBiaW5kaW5nc1tuYW1lXSA9IHsgZXh0cmE6IHt9IH07XG4gICAgICAgICAgICAgICAgQmFzZS5kZWVwRXh0ZW5kKGJpbmRpbmdzW25hbWVdLmV4dHJhLCBwYXJhbXNbaV0uZ2V0RXh0cmEoKSk7XG4gICAgICAgICAgICAgICAgaWYgKHBhcmFtc1tpXS5nZXROb2RlSW5mbygpKSB7XG4gICAgICAgICAgICAgICAgICAgIGJpbmRpbmdzW25hbWVdLmluZm8gPSB7fTtcbiAgICAgICAgICAgICAgICAgICAgQmFzZS5kZWVwRXh0ZW5kKGJpbmRpbmdzW25hbWVdLmluZm8sIHBhcmFtc1tpXS5nZXROb2RlSW5mbygpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG5cbiAgICAgICAgc3RyOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHZhciBjdHggPSB0aGlzO1xuICAgICAgICAgICAgdmFyIG5hbWVzID0gW107XG4gICAgICAgICAgICB3aGlsZShjdHgpIHtcbiAgICAgICAgICAgICAgICBuYW1lcy51bnNoaWZ0KGN0eC5nZXROYW1lKCkpO1xuICAgICAgICAgICAgICAgIGN0eCA9IGN0eC5wYXJlbnQ7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gbmFtZXMuam9pbihcIi5cIik7XG4gICAgICAgIH0sXG5cbiAgICAgICAgZ2V0QWxsQmluZGluZ3M6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgdmFyIHJlc3VsdCA9IE9iamVjdC5rZXlzKHRoaXMuZ2V0QmluZGluZ3MoKSk7XG4gICAgICAgICAgICBpZiAodGhpcy5wYXJlbnQpIHtcbiAgICAgICAgICAgICAgICB2YXIgcGFyZW50QmluZGluZ3MgPSB0aGlzLnBhcmVudC5nZXRBbGxCaW5kaW5ncygpO1xuICAgICAgICAgICAgICAgIGZvcih2YXIgaSA9IDA7IGkgPCBwYXJlbnRCaW5kaW5ncy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICBpZiAocmVzdWx0LmluZGV4T2YocGFyZW50QmluZGluZ3NbaV0pICE9PSAtMSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVzdWx0LnB1c2gocGFyZW50QmluZGluZ3NbaV0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgfSxcblxuICAgICAgICAvKipcbiAgICAgICAgICpcbiAgICAgICAgICogQHBhcmFtIG5vZGVcbiAgICAgICAgICogQHJldHVybnMge1R5cGVJbmZvfVxuICAgICAgICAgKi9cbiAgICAgICAgY3JlYXRlVHlwZUluZm86IGZ1bmN0aW9uIChub2RlKSB7XG4gICAgICAgICAgICBpZiAobm9kZS50eXBlID09IFN5bnRheC5JZGVudGlmaWVyKSB7XG4gICAgICAgICAgICAgICAgdmFyIG5hbWUgPSBub2RlLm5hbWU7XG4gICAgICAgICAgICAgICAgdmFyIGJpbmRpbmcgPSB0aGlzLmdldEJpbmRpbmdCeU5hbWUobmFtZSk7XG4gICAgICAgICAgICAgICAgaWYgKGJpbmRpbmcpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGJpbmRpbmc7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFyIHJlc3VsdCA9IG5ldyBBbm5vdGF0aW9uKG5vZGUpO1xuICAgICAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgfSxcblxuICAgICAgICBnZXRPYmplY3RJbmZvRm9yOiBmdW5jdGlvbihvYmopIHtcbiAgICAgICAgICAgIGlmICghb2JqLmlzT2JqZWN0KCkpXG4gICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XG5cbiAgICAgICAgICAgIC8qIFRoZSBUeXBlSW5mbyBtaWdodCBrbm93IGFib3V0IGl0J3Mgb2JqZWN0IHR5cGUgKi9cbiAgICAgICAgICAgIGlmIChvYmouZ2V0T2JqZWN0SW5mbykge1xuICAgICAgICAgICAgICAgIHJldHVybiBvYmouZ2V0T2JqZWN0SW5mbygpO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgdmFyIG5vZGVJbmZvID0gb2JqLmdldE5vZGVJbmZvKCk7XG4gICAgICAgICAgICBpZiAobm9kZUluZm8pIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbm9kZUluZm87XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gcmVnaXN0cnkuZ2V0SW5zdGFuY2VGb3JLaW5kKG9iai5nZXRLaW5kKCkpXG4gICAgICAgIH1cblxuICAgIH0pO1xuXG5cbiAgICAgICAgcmV0dXJuIENvbnRleHQ7XG5cbiAgICB9O1xuXG5cblxufShleHBvcnRzKSk7XG4iLCIoZnVuY3Rpb24obnMpe1xuXG4gICAgbnMuZXh0ZW5kID0gZnVuY3Rpb24oYSwgYikge1xuICAgICAgICBmb3IgKCB2YXIgcHJvcCBpbiBiKSB7XG4gICAgICAgICAgICB2YXIgZyA9IGIuX19sb29rdXBHZXR0ZXJfXyhwcm9wKSwgcyA9IGIuX19sb29rdXBTZXR0ZXJfXyhwcm9wKTtcbiAgICAgICAgICAgIGlmIChnfHxzKSB7XG4gICAgICAgICAgICAgICAgaWYgKGcpIHtcbiAgICAgICAgICAgICAgICAgICAgYS5fX2RlZmluZUdldHRlcl9fKHByb3AsIGcpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAocykge1xuICAgICAgICAgICAgICAgICAgICBhLl9fZGVmaW5lU2V0dGVyX18ocHJvcCwgcyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBpZiAoYltwcm9wXSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgIGRlbGV0ZSBhW3Byb3BdO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAocHJvcCAhPT0gXCJjb25zdHJ1Y3RvclwiIHx8IGEgIT09IHdpbmRvdykge1xuICAgICAgICAgICAgICAgICAgICBhW3Byb3BdID0gYltwcm9wXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGE7XG4gICAgfTtcblxuICAgIG5zLmRlZXBFeHRlbmQgPSBmdW5jdGlvbihkZXN0aW5hdGlvbiwgc291cmNlKSB7XG4gICAgICAgIGZvciAodmFyIHByb3BlcnR5IGluIHNvdXJjZSkge1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBzb3VyY2VbcHJvcGVydHldID09PSBcIm9iamVjdFwiICYmIHNvdXJjZVtwcm9wZXJ0eV0gIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICBkZXN0aW5hdGlvbltwcm9wZXJ0eV0gPSBkZXN0aW5hdGlvbltwcm9wZXJ0eV0gfHwge307XG4gICAgICAgICAgICAgICAgbnMuZGVlcEV4dGVuZChkZXN0aW5hdGlvbltwcm9wZXJ0eV0sIHNvdXJjZVtwcm9wZXJ0eV0pO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBkZXN0aW5hdGlvbltwcm9wZXJ0eV0gPSBzb3VyY2VbcHJvcGVydHldO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqXG4gICAgICogQHBhcmFtIHtPYmplY3R9IGN0b3IgQ29uc3RydWN0b3JcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcGFyZW50IFBhcmVudCBjbGFzc1xuICAgICAqIEBwYXJhbSB7T2JqZWN0PX0gbWV0aG9kcyBNZXRob2RzIHRvIGFkZCB0byB0aGUgY2xhc3NcbiAgICAgKiBAcmV0dXJuIHtPYmplY3QhfVxuICAgICAqL1xuICAgIG5zLmNyZWF0ZUNsYXNzID0gZnVuY3Rpb24oY3RvciwgcGFyZW50LCBtZXRob2RzKSB7XG4gICAgICAgIG1ldGhvZHMgPSBtZXRob2RzIHx8IHt9O1xuICAgICAgICBpZiAocGFyZW50KSB7XG4gICAgICAgICAgICAvKiogQGNvbnN0cnVjdG9yICovXG4gICAgICAgICAgICB2YXIgRiA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIEYucHJvdG90eXBlID0gcGFyZW50LnByb3RvdHlwZTtcbiAgICAgICAgICAgIGN0b3IucHJvdG90eXBlID0gbmV3IEYoKTtcbiAgICAgICAgICAgIGN0b3IucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gY3RvcjtcbiAgICAgICAgICAgIGN0b3Iuc3VwZXJjbGFzcyA9IHBhcmVudC5wcm90b3R5cGU7XG4gICAgICAgIH1cbiAgICAgICAgZm9yICggdmFyIG0gaW4gbWV0aG9kcykge1xuICAgICAgICAgICAgY3Rvci5wcm90b3R5cGVbbV0gPSBtZXRob2RzW21dO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBjdG9yO1xuICAgIH07XG5cblxufShleHBvcnRzKSlcbiIsIihmdW5jdGlvbihucyl7XG5cbiAgICB2YXIgU2hhZGUgPSByZXF1aXJlKFwiLi4vaW50ZXJmYWNlcy5qc1wiKSxcbiAgICAgICAgU3ludGF4ID0gcmVxdWlyZSgnZXN0cmF2ZXJzZScpLlN5bnRheCxcbiAgICAgICAgQmFzZSA9IHJlcXVpcmUoXCIuL2luZGV4LmpzXCIpO1xuXG4gICAgdmFyIFRZUEVTID0gU2hhZGUuVFlQRVMsXG4gICAgICAgIEtJTkRTID0gU2hhZGUuT0JKRUNUX0tJTkRTO1xuXG5cbiAgICAvKipcbiAgICAgKiBAcGFyYW0geyp9IG5vZGUgQ2FycmllciBvYmplY3QgZm9yIHRoZSB0eXBlIGluZm8sIG9ubHkgbm9kZS5leHRyYSBnZXRzIHBvbGx1dGVkXG4gICAgICogQHBhcmFtIHtPYmplY3Q/fSBleHRyYVxuICAgICAqIEBjb25zdHJ1Y3RvclxuICAgICAqL1xuICAgIHZhciBUeXBlSW5mbyA9IGZ1bmN0aW9uIChub2RlLCBleHRyYSkge1xuICAgICAgICB0aGlzLm5vZGUgPSBub2RlO1xuICAgICAgICB0aGlzLm5vZGUuZXh0cmEgPSB0aGlzLm5vZGUuZXh0cmEgfHwge307XG4gICAgICAgIGlmIChleHRyYSkge1xuICAgICAgICAgICAgQmFzZS5kZWVwRXh0ZW5kKHRoaXMubm9kZS5leHRyYSwgZXh0cmEpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgVHlwZUluZm8uY3JlYXRlRm9yQ29udGV4dCA9IGZ1bmN0aW9uKG5vZGUsIGN0eCkge1xuICAgICAgICB2YXIgcmVzdWx0ID0gbmV3IFR5cGVJbmZvKG5vZGUpO1xuICAgICAgICBpZiAocmVzdWx0LmdldFR5cGUoKSAhPT0gVFlQRVMuQU5ZKSB7XG4gICAgICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKG5vZGUudHlwZSA9PSBTeW50YXguSWRlbnRpZmllcikge1xuICAgICAgICAgICAgdmFyIG5hbWUgPSBub2RlLm5hbWU7XG4gICAgICAgICAgICB2YXIgdmFyaWFibGUgPSBjdHguZ2V0QmluZGluZ0J5TmFtZShuYW1lKTtcbiAgICAgICAgICAgIHJldHVybiBuZXcgVHlwZUluZm8obm9kZSwgdmFyaWFibGUpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxuXG4gICAgVHlwZUluZm8ucHJvdG90eXBlID0ge1xuICAgICAgICBnZXRFeHRyYTogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMubm9kZS5leHRyYTtcbiAgICAgICAgfSxcbiAgICAgICAgZ2V0VHlwZTogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdmFyIGV4dHJhID0gdGhpcy5nZXRFeHRyYSgpO1xuICAgICAgICAgICAgaWYgKGV4dHJhLnR5cGUgIT0gdW5kZWZpbmVkKVxuICAgICAgICAgICAgICAgIHJldHVybiBleHRyYS50eXBlO1xuICAgICAgICAgICAgcmV0dXJuIFRZUEVTLkFOWTtcbiAgICAgICAgfSxcblxuICAgICAgICBzZXRLaW5kOiBmdW5jdGlvbiAoa2luZCkge1xuICAgICAgICAgICAgdmFyIGV4dHJhID0gdGhpcy5nZXRFeHRyYSgpO1xuICAgICAgICAgICAgZXh0cmEua2luZCA9IGtpbmQ7XG4gICAgICAgIH0sXG5cbiAgICAgICAgZ2V0S2luZDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgaWYgKCF0aGlzLmlzT2JqZWN0KCkpXG4gICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5nZXRFeHRyYSgpLmtpbmQgfHwgS0lORFMuQU5ZO1xuICAgICAgICB9LFxuXG4gICAgICAgIGdldEFycmF5RWxlbWVudFR5cGU6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGlmKCF0aGlzLmlzQXJyYXkoKSlcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJDYWxsZWQgZ2V0QXJyYXlFbGVtZW50VHlwZSBvbiBcIiArIHRoaXMuZ2V0VHlwZSgpKTtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmdldEV4dHJhKCkuZWxlbWVudHM7XG4gICAgICAgIH0sXG5cbiAgICAgICAgaXNPZktpbmQ6IGZ1bmN0aW9uKGtpbmQpIHtcbiAgICAgICAgICAgIGlmICghdGhpcy5pc09iamVjdCgpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuZ2V0S2luZCgpID09IGtpbmQ7XG4gICAgICAgIH0sXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEBwYXJhbSB7c3RyaW5nfSB0eXBlXG4gICAgICAgICAqIEBwYXJhbSB7c3RyaW5nP30ga2luZFxuICAgICAgICAgKi9cbiAgICAgICAgc2V0VHlwZTogZnVuY3Rpb24gKHR5cGUsIGtpbmQpIHtcbiAgICAgICAgICAgIHZhciBleHRyYSA9IHRoaXMuZ2V0RXh0cmEoKTtcbiAgICAgICAgICAgIGV4dHJhLnR5cGUgPSB0eXBlO1xuICAgICAgICAgICAgaWYgKGtpbmQpXG4gICAgICAgICAgICAgICAgdGhpcy5zZXRLaW5kKGtpbmQpO1xuICAgICAgICB9LFxuXG4gICAgICAgIGlzT2ZUeXBlOiBmdW5jdGlvbiAodHlwZSkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuZ2V0VHlwZSgpID09IHR5cGU7XG4gICAgICAgIH0sXG5cbiAgICAgICAgZXF1YWxzOiBmdW5jdGlvbiAob3RoZXIpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmdldFR5cGUoKSA9PSBvdGhlci5nZXRUeXBlKCkgJiYgdGhpcy5nZXRLaW5kKCkgPT0gb3RoZXIuZ2V0S2luZCgpO1xuICAgICAgICB9LFxuXG4gICAgICAgIGlzSW50OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5pc09mVHlwZShUWVBFUy5JTlQpO1xuICAgICAgICB9LFxuICAgICAgICBpc051bWJlcjogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuaXNPZlR5cGUoVFlQRVMuTlVNQkVSKTtcbiAgICAgICAgfSxcbiAgICAgICAgaXNOdWxsT3JVbmRlZmluZWQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmlzTnVsbCgpIHx8IHRoaXMuaXNVbmRlZmluZWQoKTtcbiAgICAgICAgfSxcbiAgICAgICAgaXNOdWxsOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5pc09mVHlwZShUWVBFUy5OVUxMKTtcbiAgICAgICAgfSxcbiAgICAgICAgaXNVbmRlZmluZWQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmlzT2ZUeXBlKFRZUEVTLlVOREVGSU5FRCk7XG4gICAgICAgIH0sXG4gICAgICAgIGlzQm9vbDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuaXNPZlR5cGUoVFlQRVMuQk9PTEVBTik7XG4gICAgICAgIH0sXG4gICAgICAgIGlzU3RyaW5nOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5pc09mVHlwZShUWVBFUy5TVFJJTkcpO1xuICAgICAgICB9LFxuICAgICAgICBpc0FycmF5OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5pc09mVHlwZShUWVBFUy5BUlJBWSk7XG4gICAgICAgIH0sXG4gICAgICAgIGlzRnVuY3Rpb246IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmlzT2ZUeXBlKFRZUEVTLkZVTkNUSU9OKTtcbiAgICAgICAgfSxcbiAgICAgICAgaXNPYmplY3Q6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmlzT2ZUeXBlKFRZUEVTLk9CSkVDVCk7XG4gICAgICAgIH0sXG4gICAgICAgIGlzR2xvYmFsOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHJldHVybiAhIXRoaXMuZ2V0RXh0cmEoKS5nbG9iYWw7XG4gICAgICAgIH0sXG4gICAgICAgIHNldEdsb2JhbDogZnVuY3Rpb24gKGdsb2JhbCkge1xuICAgICAgICAgICAgdmFyIGV4dHJhID0gdGhpcy5nZXRFeHRyYSgpO1xuICAgICAgICAgICAgZXh0cmEuZ2xvYmFsID0gZ2xvYmFsO1xuICAgICAgICB9LFxuICAgICAgICBjYW5OdW1iZXI6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmlzTnVtYmVyKCkgfHwgdGhpcy5pc0ludCgpIHx8IHRoaXMuaXNCb29sKCk7XG4gICAgICAgIH0sXG4gICAgICAgIGNhbkludDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuaXNJbnQoKSB8fCB0aGlzLmlzQm9vbCgpO1xuICAgICAgICB9LFxuICAgICAgICBoYXNTdGF0aWNWYWx1ZSA6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgdmFyIGV4dHJhID0gdGhpcy5nZXRFeHRyYSgpO1xuICAgICAgICAgICAgaWYgKHRoaXMuaXNOdWxsT3JVbmRlZmluZWQoKSlcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIHJldHVybiBleHRyYS5oYXNPd25Qcm9wZXJ0eShcInN0YXRpY1ZhbHVlXCIpO1xuICAgICAgICB9LFxuICAgICAgICBzZXRTdGF0aWNWYWx1ZSA6IGZ1bmN0aW9uKHYpIHtcbiAgICAgICAgICAgIHZhciBleHRyYSA9IHRoaXMuZ2V0RXh0cmEoKTtcbiAgICAgICAgICAgIGlmICh0aGlzLmlzTnVsbE9yVW5kZWZpbmVkKCkpXG4gICAgICAgICAgICAgICAgdGhyb3coXCJOdWxsIGFuZCB1bmRlZmluZWQgaGF2ZSBwcmVkZWZpbmVkIHZhbHVlcy5cIik7XG4gICAgICAgICAgICBleHRyYS5zdGF0aWNWYWx1ZSA9IHY7XG4gICAgICAgIH0sXG4gICAgICAgIGdldFN0YXRpY1ZhbHVlIDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBpZiAoIXRoaXMuaGFzU3RhdGljVmFsdWUoKSkge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIk5vZGUgaGFzIG5vIHN0YXRpYyB2YWx1ZTogXCIgKyB0aGlzLm5vZGUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHRoaXMuaXNOdWxsKCkpXG4gICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgICBpZiAodGhpcy5pc1VuZGVmaW5lZCgpKVxuICAgICAgICAgICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5nZXRFeHRyYSgpLnN0YXRpY1ZhbHVlO1xuICAgICAgICB9LFxuICAgICAgICBzZXREeW5hbWljVmFsdWUgOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGRlbGV0ZSB0aGlzLmdldEV4dHJhKCkuc3RhdGljVmFsdWU7XG4gICAgICAgIH0sXG4gICAgICAgIHNldENhbGwgOiBmdW5jdGlvbihjYWxsKSB7XG4gICAgICAgICAgICB2YXIgZXh0cmEgPSB0aGlzLmdldEV4dHJhKCk7XG4gICAgICAgICAgICBleHRyYS5ldmFsdWF0ZSA9IGNhbGw7XG4gICAgICAgIH0sXG4gICAgICAgIGdldENhbGwgOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmdldEV4dHJhKCkuZXZhbHVhdGU7XG4gICAgICAgIH0sXG4gICAgICAgIGNsZWFyQ2FsbDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICB2YXIgZXh0cmEgPSB0aGlzLmdldEV4dHJhKCk7XG4gICAgICAgICAgICBkZWxldGUgZXh0cmEuZXZhbHVhdGU7XG4gICAgICAgIH0sXG4gICAgICAgIGNvcHk6IGZ1bmN0aW9uKG90aGVyKSB7XG4gICAgICAgICAgICBCYXNlLmRlZXBFeHRlbmQodGhpcy5ub2RlLmV4dHJhLCBvdGhlci5nZXRFeHRyYSgpKTtcbiAgICAgICAgfSxcbiAgICAgICAgc3RyOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHZhciBleHRyYSA9IHRoaXMuZ2V0RXh0cmEoKTtcbiAgICAgICAgICAgIHJldHVybiBKU09OLnN0cmluZ2lmeShleHRyYSwgbnVsbCwgMSk7XG4gICAgICAgIH0sXG4gICAgICAgIGNhbk5vcm1hbDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5pc09iamVjdCgpICYmICh0aGlzLmlzT2ZLaW5kKEtJTkRTLk5PUk1BTCkgfHwgdGhpcy5pc09mS2luZChLSU5EUy5GTE9BVDMpKTtcbiAgICAgICAgfSxcbiAgICAgICAgY2FuQ29sb3I6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuaXNPYmplY3QoKSAmJiAodGhpcy5pc09mS2luZChLSU5EUy5GTE9BVDQpIHx8IHRoaXMuaXNPZktpbmQoS0lORFMuRkxPQVQzKSk7XG4gICAgICAgIH0sXG4gICAgICAgIGVsaW1pbmF0ZSA6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgdmFyIGV4dHJhID0gdGhpcy5nZXRFeHRyYSgpO1xuICAgICAgICAgICAgZXh0cmEuZWxpbWluYXRlID0gdHJ1ZTtcbiAgICAgICAgfSxcbiAgICAgICAgY2FuRWxpbWluYXRlIDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICB2YXIgZXh0cmEgPSB0aGlzLmdldEV4dHJhKCk7XG4gICAgICAgICAgICByZXR1cm4gZXh0cmEuZWxpbWluYXRlID09IHRydWU7XG4gICAgICAgIH0sXG4gICAgICAgIHNldEZyb21FeHRyYTogZnVuY3Rpb24oZXh0cmEpe1xuICAgICAgICAgICAgdGhpcy5zZXRUeXBlKGV4dHJhLnR5cGUpO1xuICAgICAgICAgICAgaWYgKGV4dHJhLmtpbmQgIT0gdW5kZWZpbmVkKVxuICAgICAgICAgICAgICAgIHRoaXMuc2V0S2luZChleHRyYS5raW5kKTtcbiAgICAgICAgICAgIHRoaXMuc2V0R2xvYmFsKGV4dHJhLmdsb2JhbCk7XG4gICAgICAgICAgICBpZiAoZXh0cmEuc3RhdGljVmFsdWUgIT0gdW5kZWZpbmVkKVxuICAgICAgICAgICAgICAgIHRoaXMuc2V0U3RhdGljVmFsdWUoZXh0cmEuc3RhdGljVmFsdWUpO1xuICAgICAgICAgICAgaWYgKGV4dHJhLmV2YWx1YXRlICE9IHVuZGVmaW5lZClcbiAgICAgICAgICAgICAgICB0aGlzLnNldENhbGwoZXh0cmEuZXZhbHVhdGUpO1xuICAgICAgICAgICAgaWYgKGV4dHJhLnNvdXJjZSAhPSB1bmRlZmluZWQpXG4gICAgICAgICAgICAgICAgdGhpcy5zZXRTb3VyY2UoZXh0cmEuc291cmNlKTtcbiAgICAgICAgfSxcbiAgICAgICAgZ2V0Tm9kZUluZm86IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgaWYgKHRoaXMuaXNPYmplY3QoKSlcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5nZXRFeHRyYSgpLmluZm87XG4gICAgICAgIH0sXG4gICAgICAgIGdldFR5cGVTdHJpbmc6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgaWYgKHRoaXMuaXNPYmplY3QoKSlcbiAgICAgICAgICAgICAgICByZXR1cm4gXCJPYmplY3QgIzxcIiArIHRoaXMuZ2V0S2luZCgpICsgXCI+XCI7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5nZXRUeXBlKCk7XG4gICAgICAgIH0sXG4gICAgICAgIHNldFNvdXJjZTogZnVuY3Rpb24oc291cmNlKSB7XG4gICAgICAgICAgICB2YXIgZXh0cmEgPSB0aGlzLmdldEV4dHJhKCk7XG4gICAgICAgICAgICBleHRyYS5zb3VyY2UgPSBzb3VyY2U7XG4gICAgICAgIH0sXG4gICAgICAgIGdldFNvdXJjZTogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5nZXRFeHRyYSgpLnNvdXJjZTtcbiAgICAgICAgfVxuXG4gICAgfVxuXG4gICAgbnMuVHlwZUluZm8gPSBUeXBlSW5mbztcblxufShleHBvcnRzKSk7XG4iLCIoZnVuY3Rpb24obnMpe1xuXG4gICAgbnMuc3dpenpsZVRvSW5kZXggPSBmdW5jdGlvbihzd2l6emxlS2V5KXtcbiAgICAgICAgc3dpdGNoKHN3aXp6bGVLZXkpe1xuICAgICAgICAgICAgY2FzZSAneCc6Y2FzZSAncicgOmNhc2UgJ3MnOiByZXR1cm4gMDtcbiAgICAgICAgICAgIGNhc2UgJ3knOmNhc2UgJ2cnIDpjYXNlICd0JzogcmV0dXJuIDE7XG4gICAgICAgICAgICBjYXNlICd6JzpjYXNlICdiJyA6Y2FzZSAncCc6IHJldHVybiAyO1xuICAgICAgICAgICAgY2FzZSAndyc6Y2FzZSAnYScgOmNhc2UgJ3EnOiByZXR1cm4gMztcbiAgICAgICAgfVxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJVbmtub3duIHN3aXp6bGUga2V5OiAnXCIgKyBzd2l6emxlS2V5ICsgXCInXCIpO1xuICAgIH07XG4gICAgbnMuaW5kZXhUb1N3aXp6bGUgPSBmdW5jdGlvbihpbmRleCl7XG4gICAgICAgIHN3aXRjaChpbmRleCl7XG4gICAgICAgICAgICBjYXNlIDA6IHJldHVybiAneCc7XG4gICAgICAgICAgICBjYXNlIDE6IHJldHVybiAneSc7XG4gICAgICAgICAgICBjYXNlIDI6IHJldHVybiAneic7XG4gICAgICAgICAgICBjYXNlIDM6IHJldHVybiAndyc7XG4gICAgICAgIH1cbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiVW5rbm93biBzd2l6emxlIGluZGV4OiAnXCIgKyBpbmRleCArIFwiJ1wiKTtcbiAgICB9O1xuICAgIG5zLnN3aXp6bGVTZXRzID0gW1xuICAgICAgICBbJ3gnLCAneScsICd6JywgJ3cnXSxcbiAgICAgICAgWydyJywgJ2cnLCAnYicsICdhJ10sXG4gICAgICAgIFsncycsICd0JywgJ3AnLCAncSddXG4gICAgXTtcblxufShleHBvcnRzKSlcbiIsIihmdW5jdGlvbiAobnMpIHtcblxuICAgIHZhciBCYXNlID0gcmVxdWlyZShcIi4uLy4uL2Jhc2UvaW5kZXguanNcIik7XG5cbiAgICB2YXIgVHJhbnNmb3JtZXIgPSByZXF1aXJlKFwiLi90cmFuc2Zvcm0uanNcIikuR0xBU1RUcmFuc2Zvcm1lcjtcbiAgICB2YXIgZ2VuZXJhdGUgPSByZXF1aXJlKFwiLi9nbHNsLWdlbmVyYXRlLmpzXCIpLmdlbmVyYXRlO1xuXG4gICAgdmFyIEdMU0xDb21waWxlciA9IGZ1bmN0aW9uICgpIHtcblxuICAgIH07XG5cbiAgICBCYXNlLmV4dGVuZChHTFNMQ29tcGlsZXIucHJvdG90eXBlLCB7XG5cbiAgICAgICAgY29tcGlsZUZyYWdtZW50U2hhZGVyOiBmdW5jdGlvbiAoYWFzdCwgb3B0KSB7XG5cbiAgICAgICAgICAgIHZhciB0cmFuc2Zvcm1lciA9IG5ldyBUcmFuc2Zvcm1lcihcImdsb2JhbC5zaGFkZVwiKTtcblxuICAgICAgICAgICAgLy9jb25zb2xlLmxvZyhKU09OLnN0cmluZ2lmeShhYXN0LCAwLCBcIiBcIikpO1xuXG4gICAgICAgICAgICB2YXIgdHJhbnNmb3JtZWQgPSB0cmFuc2Zvcm1lci50cmFuc2Zvcm1BQVNUKGFhc3QpO1xuXG4gICAgICAgICAgICAvL2NvbnNvbGUubG9nKEpTT04uc3RyaW5naWZ5KGFhc3QsIDAsIFwiIFwiKSk7XG5cbiAgICAgICAgICAgIHZhciBjb2RlID0gZ2VuZXJhdGUodHJhbnNmb3JtZWQsIG9wdCk7XG5cbiAgICAgICAgICAgIHJldHVybiBjb2RlO1xuICAgICAgICB9XG5cbiAgICB9KTtcblxuXG4gICAgbnMuR0xTTENvbXBpbGVyID0gR0xTTENvbXBpbGVyO1xuXG59KGV4cG9ydHMpKTtcbiIsIihmdW5jdGlvbiAobnMpIHtcblxuICAgIHZhciBGdW5jdGlvbkFubm90YXRpb24gPSByZXF1aXJlKFwiLi8uLi8uLi9iYXNlL2Fubm90YXRpb24uanNcIikuRnVuY3Rpb25Bbm5vdGF0aW9uO1xuICAgIHZhciBTaGFkZSA9IHJlcXVpcmUoXCIuLy4uLy4uL2ludGVyZmFjZXMuanNcIik7XG4gICAgdmFyIHdhbGsgPSByZXF1aXJlKCdlc3RyYXZlcnNlJyksXG4gICAgICAgIFN5bnRheCA9IHdhbGsuU3ludGF4LFxuICAgICAgICBWaXNpdG9yT3B0aW9uID0gd2Fsay5WaXNpdG9yT3B0aW9uO1xuXG4gICAgdmFyIFR5cGVzID0gU2hhZGUuVFlQRVMsXG4gICAgICAgIEtpbmRzID0gU2hhZGUuT0JKRUNUX0tJTkRTLFxuICAgICAgICBTb3VyY2VzID0gU2hhZGUuU09VUkNFUztcblxuXG5cbiAgICAvKipcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gb3B0XG4gICAgICovXG4gICAgdmFyIGdldEhlYWRlciA9IGZ1bmN0aW9uIChvcHQpIHtcbiAgICAgICAgaWYgKG9wdC5vbWl0SGVhZGVyID09IHRydWUpXG4gICAgICAgICAgICByZXR1cm4gW107XG4gICAgICAgIHZhciBoZWFkZXIgPSBbXG4gICAgICAgICAgICBcIi8vIEdlbmVyYXRlZCBieSBzaGFkZS5qc1wiXG4gICAgICAgIF07XG4gICAgICAgIHZhciBmbG9hdFByZWNpc2lvbiA9IG9wdC5mbG9hdFByZWNpc2lvbiB8fCBcIm1lZGl1bXBcIjtcbiAgICAgICAgaGVhZGVyLnB1c2goXCJwcmVjaXNpb24gXCIgKyBmbG9hdFByZWNpc2lvbiArIFwiIGZsb2F0O1wiKTtcbiAgICAgICAgcmV0dXJuIGhlYWRlcjtcbiAgICB9XG5cbiAgICB2YXIgdG9HTFNMVHlwZSA9IGZ1bmN0aW9uIChpbmZvLCBhbGxvd1VuZGVmaW5lZCkge1xuICAgICAgICBzd2l0Y2ggKGluZm8udHlwZSkge1xuICAgICAgICAgICAgY2FzZSBUeXBlcy5PQkpFQ1Q6XG4gICAgICAgICAgICAgICAgc3dpdGNoIChpbmZvLmtpbmQpIHtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBLaW5kcy5GTE9BVDQ6XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gXCJ2ZWM0XCI7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgS2luZHMuRkxPQVQzOlxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFwidmVjM1wiO1xuICAgICAgICAgICAgICAgICAgICBjYXNlIEtpbmRzLkZMT0FUMjpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBcInZlYzJcIjtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBLaW5kcy5URVhUVVJFOlxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFwic2FtcGxlcjJEXCJcbiAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBcIjx1bmRlZmluZWQ+XCI7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2FzZSBUeXBlcy5VTkRFRklORUQ6XG4gICAgICAgICAgICAgICAgaWYgKGFsbG93VW5kZWZpbmVkKVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gXCJ2b2lkXCI7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiQ291bGQgbm90IGRldGVybWluZSB0eXBlXCIpO1xuICAgICAgICAgICAgY2FzZSBUeXBlcy5OVU1CRVI6XG4gICAgICAgICAgICAgICAgcmV0dXJuIFwiZmxvYXRcIjtcbiAgICAgICAgICAgIGNhc2UgVHlwZXMuQk9PTEVBTjpcbiAgICAgICAgICAgICAgICByZXR1cm4gXCJib29sXCI7XG4gICAgICAgICAgICBjYXNlIFR5cGVzLklOVDpcbiAgICAgICAgICAgICAgICByZXR1cm4gXCJpbnRcIjtcbiAgICAgICAgICAgIGNhc2UgVHlwZXMuQk9PTEVBTjpcbiAgICAgICAgICAgICAgICByZXR1cm4gXCJib29sXCI7XG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcInRvR0xTTFR5cGU6IFVuaGFuZGxlZCB0eXBlOiBcIiArIGluZm8udHlwZSk7XG5cbiAgICAgICAgfVxuICAgIH1cblxuICAgIHZhciB0b0dMU0xTb3VyY2UgPSBmdW5jdGlvbihpbmZvKSB7XG4gICAgICAgIGlmICghaW5mby5zb3VyY2UpXG4gICAgICAgICAgICByZXR1cm4gXCJcIjtcbiAgICAgICAgaWYgKGluZm8uc291cmNlID09IFNvdXJjZXMuVkVSVEVYKVxuICAgICAgICAgICAgcmV0dXJuIFwidmFyeWluZ1wiO1xuICAgICAgICBpZiAoaW5mby5zb3VyY2UgPT0gU291cmNlcy5VTklGT1JNKVxuICAgICAgICAgICAgcmV0dXJuIFwidW5pZm9ybVwiO1xuICAgICAgICBpZiAoaW5mby5zb3VyY2UgPT0gU291cmNlcy5DT05TVEFOVClcbiAgICAgICAgICAgIHJldHVybiBcImNvbnN0XCI7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcInRvR0xTTFNvdXJjZTogVW5oYW5kbGVkIHR5cGU6IFwiICsgaW5mby5zb3VyY2UpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGNyZWF0ZUxpbmVTdGFjaygpIHtcbiAgICAgICAgdmFyIGFyciA9IFtdO1xuICAgICAgICBhcnIucHVzaC5hcHBseShhcnIsIGFyZ3VtZW50cyk7XG4gICAgICAgIHZhciBpbmRlbnQgPSBcIlwiO1xuICAgICAgICBhcnIuYXBwZW5kTGluZSA9IGZ1bmN0aW9uKGxpbmUpe1xuICAgICAgICAgICAgdGhpcy5wdXNoKGluZGVudCArIGxpbmUpO1xuICAgICAgICB9O1xuICAgICAgICBhcnIuY2hhbmdlSW5kZW50aW9uID0gZnVuY3Rpb24oYWRkKXtcbiAgICAgICAgICAgIHdoaWxlKGFkZCA+IDApe1xuICAgICAgICAgICAgICAgIGluZGVudCArPSBcIiAgICBcIjsgYWRkLS07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZihhZGQgPCAwKXtcbiAgICAgICAgICAgICAgICBpbmRlbnQgPSBpbmRlbnQuc3Vic3RyKDAsIGluZGVudC5sZW5ndGggKyBhZGQqNCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgICAgIGFyci5hcHBlbmQgPSBmdW5jdGlvbihzdHIpe1xuICAgICAgICAgICAgdGhpc1t0aGlzLmxlbmd0aC0xXSA9IHRoaXNbdGhpcy5sZW5ndGgtMV0gKyBzdHI7XG4gICAgICAgIH07XG4gICAgICAgIHJldHVybiBhcnI7XG4gICAgfTtcblxuXG4gICAgLypCYXNlLmV4dGVuZChMaW5lU3RhY2sucHJvdG90eXBlLCB7XG5cbiAgICB9KTsqL1xuXG4gICAgdmFyIGdlbmVyYXRlID0gZnVuY3Rpb24gKGFzdCwgb3B0KSB7XG5cbiAgICAgICAgb3B0ID0gb3B0IHx8IHt9O1xuXG4gICAgICAgIHZhciBpbmRlbnQgPSBcIlwiO1xuICAgICAgICB2YXIgbGluZXMgPSBjcmVhdGVMaW5lU3RhY2soKTtcblxuICAgICAgICB0cmF2ZXJzZShhc3QsIGxpbmVzLCBvcHQpO1xuXG4gICAgICAgIHJldHVybiBsaW5lcy5qb2luKFwiXFxuXCIpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHRyYXZlcnNlKGFzdCwgbGluZXMsIG9wdCkge1xuICAgICAgICB3YWxrLnRyYXZlcnNlKGFzdCwge1xuICAgICAgICAgICAgICAgIGVudGVyOiBmdW5jdGlvbiAobm9kZSkge1xuICAgICAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHR5cGUgPSBub2RlLnR5cGU7XG4gICAgICAgICAgICAgICAgICAgICAgICBzd2l0Y2ggKHR5cGUpIHtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgU3ludGF4LlByb2dyYW06XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGdldEhlYWRlcihvcHQpLmZvckVhY2goZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxpbmVzLnB1c2goZSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuXG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXNlIFN5bnRheC5GdW5jdGlvbkRlY2xhcmF0aW9uOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgZnVuYyA9IG5ldyBGdW5jdGlvbkFubm90YXRpb24obm9kZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBtZXRob2RTdGFydCA9IFt0b0dMU0xUeXBlKGZ1bmMuZ2V0UmV0dXJuSW5mbygpLCB0cnVlKV07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1ldGhvZFN0YXJ0LnB1c2gobm9kZS5pZC5uYW1lLCAnKCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoIShub2RlLnBhcmFtcyAmJiBub2RlLnBhcmFtcy5sZW5ndGgpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtZXRob2RTdGFydC5wdXNoKFwidm9pZFwiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5vZGUucGFyYW1zLmZvckVhY2goZnVuY3Rpb24gKHBhcmFtKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbWV0aG9kU3RhcnQucHVzaCh0b0dMU0xUeXBlKHBhcmFtLmV4dHJhKSwgcGFyYW0ubmFtZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1ldGhvZFN0YXJ0LnB1c2goJykgeycpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsaW5lcy5hcHBlbmRMaW5lKG1ldGhvZFN0YXJ0LmpvaW4oXCIgXCIpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGluZXMuY2hhbmdlSW5kZW50aW9uKDEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG5cblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgU3ludGF4LlJldHVyblN0YXRlbWVudDpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGhhc0FyZ3VtZW50cyA9IG5vZGUuYXJndW1lbnQ7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxpbmVzLmFwcGVuZExpbmUoXCJyZXR1cm4gXCIgKyAoaGFzQXJndW1lbnRzID8gaGFuZGxlRXhwcmVzc2lvbihub2RlLmFyZ3VtZW50KSA6IFwiXCIpICsgXCI7XCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXNlIFN5bnRheC5WYXJpYWJsZURlY2xhcmF0b3IgOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBjb25zb2xlLmxvZyhcIk1lZXAhXCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgc291cmNlID0gdG9HTFNMU291cmNlKG5vZGUuZXh0cmEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgbGluZSA9IHNvdXJjZSA/IHNvdXJjZSArIFwiIFwiIDogXCJcIjtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGluZSArPSB0b0dMU0xUeXBlKG5vZGUuZXh0cmEpICsgXCIgXCIgKyBub2RlLmlkLm5hbWU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChub2RlLmluaXQpIGxpbmUgKz0gXCIgPSBcIiArIGhhbmRsZUV4cHJlc3Npb24obm9kZS5pbml0KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGluZXMuYXBwZW5kTGluZShsaW5lICsgXCI7XCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXNlIFN5bnRheC5Bc3NpZ25tZW50RXhwcmVzc2lvbjpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGluZXMuYXBwZW5kTGluZShoYW5kbGVFeHByZXNzaW9uKG5vZGUpICsgXCI7XCIpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgU3ludGF4LkV4cHJlc3Npb25TdGF0ZW1lbnQ6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxpbmVzLmFwcGVuZExpbmUoaGFuZGxlRXhwcmVzc2lvbihub2RlLmV4cHJlc3Npb24pICsgXCI7XCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gVmlzaXRvck9wdGlvbi5Ta2lwO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSBTeW50YXguSWZTdGF0ZW1lbnQ6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxpbmVzLmFwcGVuZExpbmUoXCJpZihcIiArIGhhbmRsZUV4cHJlc3Npb24obm9kZS50ZXN0KSArIFwiKSB7XCIpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxpbmVzLmNoYW5nZUluZGVudGlvbigxKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdHJhdmVyc2Uobm9kZS5jb25zZXF1ZW50LCBsaW5lcywgb3B0KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGluZXMuY2hhbmdlSW5kZW50aW9uKC0xKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAobm9kZS5hbHRlcm5hdGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxpbmVzLmFwcGVuZExpbmUoXCJ9IGVsc2Uge1wiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxpbmVzLmNoYW5nZUluZGVudGlvbigxKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRyYXZlcnNlKG5vZGUuYWx0ZXJuYXRlLCBsaW5lcywgb3B0KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxpbmVzLmNoYW5nZUluZGVudGlvbigtMSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGluZXMuYXBwZW5kTGluZShcIn1cIik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBWaXNpdG9yT3B0aW9uLlNraXA7XG5cblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy9jb25zb2xlLmxvZyhcIlVuaGFuZGxlZDogXCIgKyB0eXBlKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBTaGFkZS50aHJvd0Vycm9yKG5vZGUsIGUubWVzc2FnZSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIGxlYXZlOiBmdW5jdGlvbiAobm9kZSkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgdHlwZSA9IG5vZGUudHlwZTtcbiAgICAgICAgICAgICAgICAgICAgc3dpdGNoICh0eXBlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjYXNlIFN5bnRheC5Qcm9ncmFtOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSBTeW50YXguRnVuY3Rpb25EZWNsYXJhdGlvbjpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsaW5lcy5jaGFuZ2VJbmRlbnRpb24oLTEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxpbmVzLmFwcGVuZExpbmUoXCJ9XCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICApO1xuICAgIH1cblxuICAgIHZhciBnZW5lcmF0ZUZsb2F0ID0gZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgaWYoaXNOYU4odmFsdWUpKVxuICAgICAgICAgICAgdGhyb3cgRXJyb3IoXCJJbnRlcm5hbDogRXhwcmVzc2lvbiBnZW5lcmF0ZWQgTmFOIVwiKTtcbiAgICAgICAgdmFyIHJlc3VsdCA9ICcnICsgdmFsdWU7XG4gICAgICAgIGlmIChyZXN1bHQuaW5kZXhPZihcIi5cIikgPT0gLTEpIHtcbiAgICAgICAgICAgIHJlc3VsdCArPSBcIi4wXCI7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKlxuICAgICAqIEBwYXJhbSBub2RlXG4gICAgICogQHJldHVybnMge3N0cmluZ31cbiAgICAgKi9cbiAgICB2YXIgaGFuZGxlRXhwcmVzc2lvbiA9IGZ1bmN0aW9uKG5vZGUpIHtcbiAgICAgICAgdmFyIHJlc3VsdCA9IFwiPHVuaGFuZGxlZDogXCIgKyBub2RlLnR5cGUrIFwiPlwiO1xuICAgICAgICBzd2l0Y2gobm9kZS50eXBlKSB7XG4gICAgICAgICAgICBjYXNlIFN5bnRheC5OZXdFeHByZXNzaW9uOlxuICAgICAgICAgICAgICAgIHJlc3VsdCA9IHRvR0xTTFR5cGUobm9kZS5leHRyYSk7XG4gICAgICAgICAgICAgICAgcmVzdWx0ICs9IGhhbmRsZUFyZ3VtZW50cyhub2RlLmFyZ3VtZW50cyk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgIGNhc2UgU3ludGF4LkxpdGVyYWw6XG4gICAgICAgICAgICAgICAgdmFyIHZhbHVlID0gbm9kZS5leHRyYS5zdGF0aWNWYWx1ZSAhPT0gdW5kZWZpbmVkID8gbm9kZS5leHRyYS5zdGF0aWNWYWx1ZSA6IG5vZGUudmFsdWU7XG4gICAgICAgICAgICAgICAgaWYgKG5vZGUuZXh0cmEudHlwZSA9PSBUeXBlcy5OVU1CRVIpXG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdCA9IGdlbmVyYXRlRmxvYXQodmFsdWUpO1xuICAgICAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0ID0gdmFsdWU7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG5cblxuICAgICAgICAgICAgY2FzZSBTeW50YXguSWRlbnRpZmllcjpcbiAgICAgICAgICAgICAgICByZXN1bHQgPSBub2RlLm5hbWU7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgIGNhc2UgU3ludGF4LkJpbmFyeUV4cHJlc3Npb246XG4gICAgICAgICAgICBjYXNlIFN5bnRheC5Mb2dpY2FsRXhwcmVzc2lvbjpcbiAgICAgICAgICAgIGNhc2UgU3ludGF4LkFzc2lnbm1lbnRFeHByZXNzaW9uOlxuICAgICAgICAgICAgICAgIHJlc3VsdCA9IGhhbmRsZUJpbmFyeUFyZ3VtZW50KG5vZGUubGVmdCk7XG4gICAgICAgICAgICAgICAgcmVzdWx0ICs9IFwiIFwiICsgbm9kZS5vcGVyYXRvciArIFwiIFwiO1xuICAgICAgICAgICAgICAgIHJlc3VsdCArPSBoYW5kbGVCaW5hcnlBcmd1bWVudChub2RlLnJpZ2h0KTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgU3ludGF4LlVuYXJ5RXhwcmVzc2lvbjpcbiAgICAgICAgICAgICAgICByZXN1bHQgPSBub2RlLm9wZXJhdG9yO1xuICAgICAgICAgICAgICAgIHJlc3VsdCArPSBoYW5kbGVCaW5hcnlBcmd1bWVudChub2RlLmFyZ3VtZW50KTtcbiAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgY2FzZSBTeW50YXguQ2FsbEV4cHJlc3Npb246XG4gICAgICAgICAgICAgICAgcmVzdWx0ID0gaGFuZGxlRXhwcmVzc2lvbihub2RlLmNhbGxlZSk7XG4gICAgICAgICAgICAgICAgcmVzdWx0ICs9IGhhbmRsZUFyZ3VtZW50cyhub2RlLmFyZ3VtZW50cyk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgIGNhc2UgU3ludGF4Lk1lbWJlckV4cHJlc3Npb246XG4gICAgICAgICAgICAgICAgcmVzdWx0ID0gaGFuZGxlRXhwcmVzc2lvbihub2RlLm9iamVjdCk7XG4gICAgICAgICAgICAgICAgcmVzdWx0ICs9IFwiLlwiO1xuICAgICAgICAgICAgICAgIHJlc3VsdCArPSBoYW5kbGVFeHByZXNzaW9uKG5vZGUucHJvcGVydHkpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICBjYXNlIFN5bnRheC5Db25kaXRpb25hbEV4cHJlc3Npb246XG4gICAgICAgICAgICAgICAgcmVzdWx0ID0gaGFuZGxlRXhwcmVzc2lvbihub2RlLnRlc3QpO1xuICAgICAgICAgICAgICAgIHJlc3VsdCArPSBcIiA/IFwiO1xuICAgICAgICAgICAgICAgIHJlc3VsdCArPSBoYW5kbGVFeHByZXNzaW9uKG5vZGUuY29uc2VxdWVudCk7XG4gICAgICAgICAgICAgICAgcmVzdWx0ICs9IFwiIDogXCI7XG4gICAgICAgICAgICAgICAgcmVzdWx0ICs9IGhhbmRsZUV4cHJlc3Npb24obm9kZS5hbHRlcm5hdGUpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgIC8vY29uc29sZS5sb2coXCJVbmhhbmRsZWQ6IFwiICwgbm9kZS50eXBlKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGhhbmRsZUJpbmFyeUFyZ3VtZW50KG5vZGUpe1xuICAgICAgICB2YXIgcmVzdWx0ID0gaGFuZGxlRXhwcmVzc2lvbihub2RlKTtcbiAgICAgICAgc3dpdGNoKG5vZGUudHlwZSkge1xuICAgICAgICAgICAgY2FzZSBTeW50YXguQmluYXJ5RXhwcmVzc2lvbjpcbiAgICAgICAgICAgIGNhc2UgU3ludGF4LkxvZ2ljYWxFeHByZXNzaW9uOlxuICAgICAgICAgICAgY2FzZSBTeW50YXguQXNzaWdubWVudEV4cHJlc3Npb246IHJlc3VsdCA9IFwiKCBcIiArIHJlc3VsdCArIFwiIClcIjsgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBoYW5kbGVBcmd1bWVudHMoY29udGFpbmVyKSB7XG4gICAgICAgIHZhciByZXN1bHQgPSBcIihcIjtcbiAgICAgICAgY29udGFpbmVyLmZvckVhY2goZnVuY3Rpb24gKGFyZywgaW5kZXgpIHtcbiAgICAgICAgICAgIHJlc3VsdCArPSBoYW5kbGVFeHByZXNzaW9uKGFyZyk7XG4gICAgICAgICAgICBpZiAoaW5kZXggPCBjb250YWluZXIubGVuZ3RoIC0gMSkge1xuICAgICAgICAgICAgICAgIHJlc3VsdCArPSBcIiwgXCI7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gcmVzdWx0ICsgXCIpXCI7XG4gICAgfVxuXG5cbiAgICBleHBvcnRzLmdlbmVyYXRlID0gZ2VuZXJhdGU7XG5cblxufShleHBvcnRzKSk7XG4iLCIoZnVuY3Rpb24obnMpe1xuXG4gICAgdmFyIFNoYWRlID0gcmVxdWlyZShcIi4uLy4uLy4uL2ludGVyZmFjZXMuanNcIik7XG4gICAgdmFyIFRvb2xzID0gcmVxdWlyZShcIi4vdG9vbHMuanNcIik7XG5cbiAgICB2YXIgQ29sb3JDbG9zdXJlSW5zdGFuY2UgPSB7XG5cbiAgICB9O1xuXG4gICAgVG9vbHMuZXh0ZW5kKG5zLCB7XG4gICAgICAgIGlkOiBcIkNvbG9yQ2xvc3VyZVwiLFxuICAgICAgICBraW5kOiBTaGFkZS5PQkpFQ1RfS0lORFMuQ09MT1JfQ0xPU1VSRSxcbiAgICAgICAgb2JqZWN0OiB7XG4gICAgICAgICAgICBjb25zdHJ1Y3RvcjogbnVsbCxcbiAgICAgICAgICAgIHN0YXRpYzoge31cbiAgICAgICAgfSxcbiAgICAgICAgaW5zdGFuY2U6IENvbG9yQ2xvc3VyZUluc3RhbmNlXG4gICAgfSk7XG59KGV4cG9ydHMpKTtcbiIsIihmdW5jdGlvbihucykge1xuXG4gICAgdmFyIG9iamVjdHMgPSB7XG4gICAgICAgIC8vQ29sb3IgOiByZXF1aXJlKFwiLi9jb2xvci5qc1wiKSxcbiAgICAgICAgU2hhZGUgOiByZXF1aXJlKFwiLi9zaGFkZS5qc1wiKSxcbiAgICAgICAgLy9NYXRyaXg0IDogcmVxdWlyZShcIi4vbWF0cml4LmpzXCIpLFxuICAgICAgICBNYXRoIDogcmVxdWlyZShcIi4vbWF0aC5qc1wiKSxcbiAgICAgICAgU3lzdGVtIDogcmVxdWlyZShcIi4vc3lzdGVtLmpzXCIpLFxuICAgICAgICBWZWMyIDogcmVxdWlyZShcIi4vdmVjMi5qc1wiKSxcbiAgICAgICAgVmVjMyA6IHJlcXVpcmUoXCIuL3ZlYzMuanNcIiksXG4gICAgICAgIENvbG9yOiByZXF1aXJlKFwiLi92ZWMzLmpzXCIpLFxuICAgICAgICBWZWM0IDogcmVxdWlyZShcIi4vdmVjNC5qc1wiKSxcbiAgICAgICAgVGV4dHVyZSA6IHJlcXVpcmUoXCIuL3RleHR1cmUuanNcIiksXG4gICAgICAgIENvbG9yQ2xvc3VyZTogcmVxdWlyZShcIi4vY29sb3JjbG9zdXJlLmpzXCIpXG4gICAgfTtcblxuICAgIG5zLlJlZ2lzdHJ5ID0ge1xuICAgICAgICBuYW1lOiBcIkdMU0xUcmFuc2Zvcm1SZWdpc3RyeVwiLFxuICAgICAgICBnZXRCeU5hbWU6IGZ1bmN0aW9uKG5hbWUpIHtcbiAgICAgICAgICAgIHZhciByZXN1bHQgPSBvYmplY3RzW25hbWVdO1xuICAgICAgICAgICAgcmV0dXJuIHJlc3VsdCB8fCBudWxsO1xuICAgICAgICB9LFxuICAgICAgICBnZXRJbnN0YW5jZUZvcktpbmQ6IGZ1bmN0aW9uKGtpbmQpIHtcbiAgICAgICAgICAgIGZvcih2YXIgb2JqIGluIG9iamVjdHMpIHtcbiAgICAgICAgICAgICAgICBpZiAob2JqZWN0c1tvYmpdLmtpbmQgPT0ga2luZCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gb2JqZWN0c1tvYmpdLmluc3RhbmNlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9XG4gICAgfVxuXG5cbn0oZXhwb3J0cykpO1xuIiwiKGZ1bmN0aW9uKG5zKXtcblxuICAgdmFyIFNoYWRlID0gcmVxdWlyZShcIi4uLy4uLy4uL2ludGVyZmFjZXMuanNcIik7XG4gICB2YXIgU3ludGF4ID0gcmVxdWlyZSgnZXN0cmF2ZXJzZScpLlN5bnRheDtcbiAgIHZhciBUb29scyA9IHJlcXVpcmUoJy4vdG9vbHMuanMnKTtcblxuICAgIHZhciBNYXRoQ29uc3RhbnRzID0gW1wiRVwiLCBcIlBJXCIsIFwiTE4yXCIsIFwiTE9HMkVcIiwgXCJMT0cxMEVcIiwgXCJQSVwiLCBcIlNRUlQxXzJcIiwgXCJTUVJUMlwiXTtcblxuXG5cbiAgICB2YXIgaGFuZGxlSW50VmVyc2lvbiA9IGZ1bmN0aW9uKG5vZGUsIHBhcmVudCkge1xuICAgICAgICBwYXJlbnQuZXh0cmEudHlwZSA9IFNoYWRlLlRZUEVTLk5VTUJFUjtcbiAgICAgICAgcmV0dXJuIFRvb2xzLnJlbW92ZU1lbWJlckZyb21FeHByZXNzaW9uKG5vZGUpO1xuICAgIH1cblxuXG4gICAgdmFyIE1hdGhFbnRyeSAgPSB7XG4gICAgICAgIGFiczogeyBwcm9wZXJ0eTogVG9vbHMucmVtb3ZlTWVtYmVyRnJvbUV4cHJlc3Npb24gfSxcbiAgICAgICAgYWNvczogeyBwcm9wZXJ0eTogVG9vbHMucmVtb3ZlTWVtYmVyRnJvbUV4cHJlc3Npb24gfSxcbiAgICAgICAgYXNpbjogeyBwcm9wZXJ0eTogVG9vbHMucmVtb3ZlTWVtYmVyRnJvbUV4cHJlc3Npb24gfSxcbiAgICAgICAgYXRhbjogeyBwcm9wZXJ0eTogVG9vbHMucmVtb3ZlTWVtYmVyRnJvbUV4cHJlc3Npb24gfSxcbiAgICAgICAgYXRhbjI6IHsgcHJvcGVydHk6IGZ1bmN0aW9uKCkgeyByZXR1cm4geyB0eXBlOiBTeW50YXguSWRlbnRpZmllciwgbmFtZTogXCJhdGFuXCIgfSB9fSxcbiAgICAgICAgY2VpbDogeyBwcm9wZXJ0eTogaGFuZGxlSW50VmVyc2lvbiB9LFxuICAgICAgICBjb3M6ICB7IHByb3BlcnR5OiBUb29scy5yZW1vdmVNZW1iZXJGcm9tRXhwcmVzc2lvbiB9LFxuICAgICAgICBleHA6IHsgcHJvcGVydHk6IFRvb2xzLnJlbW92ZU1lbWJlckZyb21FeHByZXNzaW9uIH0sXG4gICAgICAgIGZsb29yOiB7IHByb3BlcnR5OiBoYW5kbGVJbnRWZXJzaW9uIH0sXG4gICAgICAgIC8vIGltdWw6IHsgcHJvcGVydHk6IFRvb2xzLnJlbW92ZU1lbWJlckZyb21FeHByZXNzaW9uIH0sXG4gICAgICAgIGxvZzogeyBwcm9wZXJ0eTogVG9vbHMucmVtb3ZlTWVtYmVyRnJvbUV4cHJlc3Npb24gfSxcbiAgICAgICAgbWF4OiB7IHByb3BlcnR5OiBUb29scy5yZW1vdmVNZW1iZXJGcm9tRXhwcmVzc2lvbiB9LFxuICAgICAgICBtaW46IHsgcHJvcGVydHk6IFRvb2xzLnJlbW92ZU1lbWJlckZyb21FeHByZXNzaW9uIH0sXG4gICAgICAgIHBvdzogeyBwcm9wZXJ0eTogVG9vbHMucmVtb3ZlTWVtYmVyRnJvbUV4cHJlc3Npb24gfSxcbiAgICAgICAgLy8gcmFuZG9tOiBmdW5jdGlvbiByYW5kb20oKSB7IFtuYXRpdmUgY29kZV0gfVxuICAgICAgICByb3VuZDogeyBwcm9wZXJ0eTogVG9vbHMucmVtb3ZlTWVtYmVyRnJvbUV4cHJlc3Npb24gfSwgLy8gU2luY2UgR0xTTCAxLjMsIHdoYXQgZG9lcyBXZWJHTCB1c2U/XG4gICAgICAgIHNpbjogIHsgcHJvcGVydHk6IFRvb2xzLnJlbW92ZU1lbWJlckZyb21FeHByZXNzaW9uIH0sXG4gICAgICAgIHNxcnQ6IHsgcHJvcGVydHk6IFRvb2xzLnJlbW92ZU1lbWJlckZyb21FeHByZXNzaW9uIH0sXG4gICAgICAgIHRhbjogeyBwcm9wZXJ0eTogVG9vbHMucmVtb3ZlTWVtYmVyRnJvbUV4cHJlc3Npb24gfVxuICAgIH07XG5cbiAgICBNYXRoQ29uc3RhbnRzLmZvckVhY2goZnVuY3Rpb24gKGNvbnN0YW50KSB7XG4gICAgICAgIE1hdGhFbnRyeVtjb25zdGFudF0gPSB7XG4gICAgICAgICAgICBwcm9wZXJ0eTogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiAgeyB0eXBlOiBTeW50YXguTGl0ZXJhbCwgdmFsdWU6IE1hdGhbY29uc3RhbnRdLCBleHRyYTogeyB0eXBlOiBTaGFkZS5UWVBFUy5OVU1CRVIgfSB9O1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSk7XG5cbiAgICBUb29scy5leHRlbmQobnMsIHtcbiAgICAgICAgaWQ6IFwiTWF0aFwiLFxuICAgICAgICBvYmplY3Q6IHtcbiAgICAgICAgICAgIGNvbnN0cnVjdG9yOiBudWxsLFxuICAgICAgICAgICAgc3RhdGljOiBNYXRoRW50cnlcbiAgICAgICAgfSxcbiAgICAgICAgaW5zdGFuY2U6IE1hdGhFbnRyeVxuICAgIH0pO1xuXG59KGV4cG9ydHMpKTtcbiIsIihmdW5jdGlvbihucyl7XG5cbiAgICB2YXIgU2hhZGUgPSByZXF1aXJlKFwiLi4vLi4vLi4vaW50ZXJmYWNlcy5qc1wiKTtcbiAgICB2YXIgU3ludGF4ID0gcmVxdWlyZSgnZXN0cmF2ZXJzZScpLlN5bnRheDtcbiAgICB2YXIgVG9vbHMgPSByZXF1aXJlKCcuL3Rvb2xzLmpzJyk7XG5cbiAgICB2YXIgU2hhZGVPYmplY3QgPSB7XG4gICAgICAgIGRpZmZ1c2U6IHt9LFxuICAgICAgICBwaG9uZzoge30sXG4gICAgICAgIGZyYWN0OiB7IHByb3BlcnR5OiBUb29scy5yZW1vdmVNZW1iZXJGcm9tRXhwcmVzc2lvbiB9LFxuICAgICAgICBjbGFtcDogeyBwcm9wZXJ0eTogVG9vbHMucmVtb3ZlTWVtYmVyRnJvbUV4cHJlc3Npb24gfSxcbiAgICAgICAgc3RlcDogeyBwcm9wZXJ0eTogVG9vbHMucmVtb3ZlTWVtYmVyRnJvbUV4cHJlc3Npb24gfSxcbiAgICAgICAgc21vb3Roc3RlcDogeyBwcm9wZXJ0eTogVG9vbHMucmVtb3ZlTWVtYmVyRnJvbUV4cHJlc3Npb24gfVxuICAgIH1cblxuICAgIFRvb2xzLmV4dGVuZChucywge1xuICAgIGlkOiBcIlNoYWRlXCIsXG4gICAgb2JqZWN0OiB7XG4gICAgICAgIGNvbnN0cnVjdG9yOiBudWxsLFxuICAgICAgICBzdGF0aWM6IFNoYWRlT2JqZWN0XG4gICAgfSxcbiAgICBpbnN0YW5jZTogbnVsbFxufSk7XG5cbn0oZXhwb3J0cykpO1xuIiwiKGZ1bmN0aW9uIChucykge1xuXG4gICAgdmFyIEJhc2UgPSByZXF1aXJlKFwiLi4vLi4vLi4vYmFzZS9pbmRleC5qc1wiKSxcbiAgICAgICAgU2hhZGUgPSByZXF1aXJlKFwiLi4vLi4vLi4vaW50ZXJmYWNlcy5qc1wiKSxcbiAgICAgICAgU3ludGF4ID0gcmVxdWlyZSgnZXN0cmF2ZXJzZScpLlN5bnRheDtcblxuXG4gICAgdmFyIFN5c3RlbVBhcmFtZXRlck5hbWVzID0ge1xuICAgICAgICBcImNvb3Jkc1wiIDogXCJfc3lzX2Nvb3Jkc1wiLFxuICAgICAgICBcImhlaWdodFwiOiBcIl9zeXNfaGVpZ2h0XCIsXG4gICAgICAgIFwid2lkdGhcIjogXCJfc3lzX3dpZHRoXCJcbiAgICB9XG5cbiAgICB2YXIgQ29vcmRzVHlwZSA9ICB7XG4gICAgICAgIHR5cGU6IFNoYWRlLlRZUEVTLk9CSkVDVCxcbiAgICAgICAga2luZDogU2hhZGUuT0JKRUNUX0tJTkRTLkZMT0FUMyxcbiAgICAgICAgc291cmNlOiBTaGFkZS5TT1VSQ0VTLlVOSUZPUk1cbiAgICB9O1xuXG4gICAgdmFyIFN5c3RlbUVudHJ5ID0ge1xuICAgICAgICBjb29yZHM6IHtcbiAgICAgICAgICAgIHByb3BlcnR5OiBmdW5jdGlvbiAobm9kZSkge1xuICAgICAgICAgICAgICAgIG5vZGUucHJvcGVydHkubmFtZSA9IFwiZ2xfRnJhZ0Nvb3JkXCI7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG5vZGUucHJvcGVydHk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIG5vcm1hbGl6ZWRDb29yZHM6IHtcbiAgICAgICAgICAgIHByb3BlcnR5OiBmdW5jdGlvbiAobm9kZSwgcGFyZW50LCBjb250ZXh0LCBzdGF0ZSkge1xuICAgICAgICAgICAgICAgIHN0YXRlLmdsb2JhbFBhcmFtZXRlcnNbU3lzdGVtUGFyYW1ldGVyTmFtZXMuY29vcmRzXSA9IENvb3Jkc1R5cGU7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogU3ludGF4Lk5ld0V4cHJlc3Npb24sXG4gICAgICAgICAgICAgICAgICAgIGNhbGxlZToge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogU3ludGF4LklkZW50aWZpZXIsXG4gICAgICAgICAgICAgICAgICAgICAgICBuYW1lOiBcIlZlYzNcIlxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBhcmd1bWVudHM6IFtcbiAgICAgICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiBTeW50YXguQmluYXJ5RXhwcmVzc2lvbixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZWZ0OiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6IFN5bnRheC5NZW1iZXJFeHByZXNzaW9uLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvYmplY3Q6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6IFN5bnRheC5JZGVudGlmaWVyLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbmFtZTogXCJnbF9GcmFnQ29vcmRcIlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0eToge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogU3ludGF4LklkZW50aWZpZXIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBuYW1lOiBcInh5elwiXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJpZ2h0OiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6IFN5bnRheC5JZGVudGlmaWVyLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBuYW1lOiBTeXN0ZW1QYXJhbWV0ZXJOYW1lcy5jb29yZHNcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9wZXJhdG9yOiBcIi9cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBleHRyYToge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiBTaGFkZS5UWVBFUy5PQkpFQ1QsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGtpbmQ6IFNoYWRlLk9CSkVDVF9LSU5EUy5GTE9BVDNcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgICAgIGV4dHJhOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiBTaGFkZS5UWVBFUy5PQkpFQ1QsXG4gICAgICAgICAgICAgICAgICAgICAgICBraW5kOiBTaGFkZS5PQkpFQ1RfS0lORFMuRkxPQVQzXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIGhlaWdodDoge1xuICAgICAgICAgICAgcHJvcGVydHk6IGZ1bmN0aW9uIChub2RlLCBwYXJlbnQsIGNvbnRleHQsIHN0YXRlKSB7XG4gICAgICAgICAgICAgICAgc3RhdGUuZ2xvYmFsUGFyYW1ldGVyc1tTeXN0ZW1QYXJhbWV0ZXJOYW1lcy5jb29yZHNdID0gQ29vcmRzVHlwZTtcbiAgICAgICAgICAgICAgICBub2RlLnByb3BlcnR5Lm5hbWUgPSBTeXN0ZW1QYXJhbWV0ZXJOYW1lcy5jb29yZHMgKyBcIi55XCI7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG5vZGUucHJvcGVydHk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIHdpZHRoOiB7XG4gICAgICAgICAgICBwcm9wZXJ0eTogZnVuY3Rpb24gKG5vZGUsIHBhcmVudCwgY29udGV4dCwgc3RhdGUpIHtcbiAgICAgICAgICAgICAgICBzdGF0ZS5nbG9iYWxQYXJhbWV0ZXJzW1N5c3RlbVBhcmFtZXRlck5hbWVzLmNvb3Jkc10gPSBDb29yZHNUeXBlO1xuICAgICAgICAgICAgICAgIG5vZGUucHJvcGVydHkubmFtZSA9IFN5c3RlbVBhcmFtZXRlck5hbWVzLmNvb3JkcyArIFwiLnhcIjtcbiAgICAgICAgICAgICAgICByZXR1cm4gbm9kZS5wcm9wZXJ0eTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgfTtcblxuICAgIEJhc2UuZXh0ZW5kKG5zLCB7XG4gICAgICAgIGlkOiBcIlN5c3RlbVwiLFxuICAgICAgICBvYmplY3Q6IHtcbiAgICAgICAgICAgIGNvbnN0cnVjdG9yOiBudWxsLFxuICAgICAgICAgICAgc3RhdGljOiBTeXN0ZW1FbnRyeVxuICAgICAgICB9LFxuICAgICAgICBpbnN0YW5jZTogbnVsbFxuICAgIH0pO1xufShleHBvcnRzKSk7XG4iLCIoZnVuY3Rpb24obnMpe1xuXG4gICAgdmFyIFNoYWRlID0gcmVxdWlyZShcIi4uLy4uLy4uL2ludGVyZmFjZXMuanNcIik7XG4gICAgdmFyIFN5bnRheCA9IHJlcXVpcmUoJ2VzdHJhdmVyc2UnKS5TeW50YXg7XG4gICAgdmFyIFRvb2xzID0gcmVxdWlyZShcIi4vdG9vbHMuanNcIik7XG4gICAgdmFyIEFOTk8gPSByZXF1aXJlKFwiLi4vLi4vLi4vYmFzZS9hbm5vdGF0aW9uLmpzXCIpLkFOTk87XG5cbiAgICB2YXIgVFlQRVMgPSBTaGFkZS5UWVBFUyxcbiAgICAgICAgS0lORFMgPSBTaGFkZS5PQkpFQ1RfS0lORFM7XG5cbiAgICB2YXIgVGV4dHVyZUluc3RhbmNlID0ge1xuICAgICAgICBzYW1wbGUyRDoge1xuICAgICAgICAgICAgY2FsbEV4cDogVG9vbHMuVmVjLmNyZWF0ZUZ1bmN0aW9uQ2FsbC5iaW5kKG51bGwsICd0ZXh0dXJlMkQnLCAyKVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgVG9vbHMuZXh0ZW5kKG5zLCB7XG4gICAgICAgIGlkOiBcIlRleHR1cmVcIixcbiAgICAgICAga2luZDogS0lORFMuVEVYVFVSRSxcbiAgICAgICAgb2JqZWN0OiB7XG4gICAgICAgICAgICBjb25zdHJ1Y3RvcjogbnVsbCxcbiAgICAgICAgICAgIHN0YXRpYzoge31cbiAgICAgICAgfSxcbiAgICAgICAgaW5zdGFuY2U6IFRleHR1cmVJbnN0YW5jZVxuICAgIH0pO1xuXG59KGV4cG9ydHMpKTtcbiIsIihmdW5jdGlvbiAobnMpIHtcblxuICAgIHZhciBTeW50YXggPSByZXF1aXJlKCdlc3RyYXZlcnNlJykuU3ludGF4O1xuICAgIHZhciBCYXNlID0gcmVxdWlyZShcIi4uLy4uLy4uL2Jhc2UvaW5kZXguanNcIik7XG4gICAgdmFyIEFOTk8gPSByZXF1aXJlKFwiLi4vLi4vLi4vYmFzZS9hbm5vdGF0aW9uLmpzXCIpLkFOTk87XG4gICAgdmFyIFNoYWRlID0gcmVxdWlyZShcIi4uLy4uLy4uL2ludGVyZmFjZXMuanNcIiksXG4gICAgICAgIFRZUEVTID0gU2hhZGUuVFlQRVMsXG4gICAgICAgIEtJTkRTID0gU2hhZGUuT0JKRUNUX0tJTkRTLFxuICAgICAgICBWZWNCYXNlID0gcmVxdWlyZShcIi4uLy4uLy4uL2Jhc2UvdmVjLmpzXCIpO1xuXG5cbiAgICBucy5yZW1vdmVNZW1iZXJGcm9tRXhwcmVzc2lvbiA9IGZ1bmN0aW9uIChub2RlKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB0eXBlOiBTeW50YXguSWRlbnRpZmllcixcbiAgICAgICAgICAgIG5hbWU6IG5vZGUucHJvcGVydHkubmFtZVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgdmFyIFZlYyA9IHtcbiAgICAgICAgZ2VuZXJhdGVWZWNGcm9tQXJnczogZnVuY3Rpb24odmVjQ291bnQsIGFyZ3Mpe1xuICAgICAgICAgICAgaWYodmVjQ291bnQgPT0gMSlcbiAgICAgICAgICAgICAgICByZXR1cm4gYXJnc1swXTtcbiAgICAgICAgICAgIGlmKGFyZ3MubGVuZ3RoID09IDEgJiYgQU5OTyhhcmdzWzBdKS5pc09mS2luZChLSU5EU1snRkxPQVQnICsgdmVjQ291bnRdKSlcbiAgICAgICAgICAgICAgICByZXR1cm4gYXJnc1swXTtcbiAgICAgICAgICAgIHZhciByZXN1bHQgPSB7XG4gICAgICAgICAgICAgICAgdHlwZTogU3ludGF4Lk5ld0V4cHJlc3Npb24sXG4gICAgICAgICAgICAgICAgY2FsbGVlOiB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IFN5bnRheC5JZGVudGlmaWVyLFxuICAgICAgICAgICAgICAgICAgICBuYW1lOiBcIlZlY1wiICsgdmVjQ291bnRcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIGFyZ3VtZW50czogYXJnc1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIEFOTk8ocmVzdWx0KS5zZXRUeXBlKFRZUEVTLk9CSkVDVCwgS0lORFNbJ0ZMT0FUJyArIHZlY0NvdW50XSk7XG4gICAgICAgICAgICBBTk5PKHJlc3VsdC5jYWxsZWUpLnNldFR5cGUoVFlQRVMuRlVOQ1RJT04pO1xuICAgICAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgfSxcblxuICAgICAgICBjcmVhdGVTd2l6emxlOiBmdW5jdGlvbih2ZWNDb3VudCwgc3dpenpsZSwgbm9kZSwgYXJncywgcGFyZW50KXtcbiAgICAgICAgICAgIGlmIChhcmdzLmxlbmd0aCA9PSAwKSB7XG4gICAgICAgICAgICAgICAgbm9kZS5jYWxsZWUuZXh0cmEgPSBub2RlLmV4dHJhO1xuICAgICAgICAgICAgICAgIHJldHVybiBub2RlLmNhbGxlZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZhciBzaW5ndWxhciA9IHN3aXp6bGUubGVuZ3RoID09IDE7XG4gICAgICAgICAgICB2YXIgYXJnT2JqZWN0ID0gc2luZ3VsYXIgPyBub2RlLmFyZ3VtZW50c1swXSA6IFZlYy5nZW5lcmF0ZVZlY0Zyb21BcmdzKHN3aXp6bGUubGVuZ3RoLCBub2RlLmFyZ3VtZW50cyk7XG4gICAgICAgICAgICB2YXIgcmVwbGFjZSA9IHtcbiAgICAgICAgICAgICAgICB0eXBlOiBTeW50YXguTmV3RXhwcmVzc2lvbixcbiAgICAgICAgICAgICAgICBjYWxsZWU6IHtcbiAgICAgICAgICAgICAgICAgICB0eXBlOiBTeW50YXguSWRlbnRpZmllcixcbiAgICAgICAgICAgICAgICAgICBuYW1lOiBcIlZlY1wiICsgdmVjQ291bnRcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIGFyZ3VtZW50czogW11cbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICB2YXIgaW5kaWNlcyA9IFtdO1xuICAgICAgICAgICAgZm9yKHZhciBpID0gMDsgaSA8IHN3aXp6bGUubGVuZ3RoOyArK2kpe1xuICAgICAgICAgICAgICAgIHZhciBpZHggPSBWZWNCYXNlLnN3aXp6bGVUb0luZGV4KHN3aXp6bGUuY2hhckF0KGkpKTtcbiAgICAgICAgICAgICAgICBpbmRpY2VzW2lkeF0gPSBpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZm9yKHZhciBpID0gMDsgaSA8IHZlY0NvdW50OyArK2kpe1xuICAgICAgICAgICAgICAgIGlmKGluZGljZXNbaV0gIT09IHVuZGVmaW5lZCl7XG4gICAgICAgICAgICAgICAgICAgIHJlcGxhY2UuYXJndW1lbnRzW2ldID0gc2luZ3VsYXIgPyBhcmdPYmplY3QgOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiBTeW50YXguTWVtYmVyRXhwcmVzc2lvbixcbiAgICAgICAgICAgICAgICAgICAgICAgIG9iamVjdDogYXJnT2JqZWN0LFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvcGVydHk6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiBTeW50YXguSWRlbnRpZmllcixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBuYW1lOiBWZWNCYXNlLmluZGV4VG9Td2l6emxlKGluZGljZXNbaV0pXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2V7XG4gICAgICAgICAgICAgICAgICAgcmVwbGFjZS5hcmd1bWVudHNbaV0gPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiBTeW50YXguTWVtYmVyRXhwcmVzc2lvbixcbiAgICAgICAgICAgICAgICAgICAgICAgIG9iamVjdDogbm9kZS5jYWxsZWUub2JqZWN0LFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvcGVydHk6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiBTeW50YXguSWRlbnRpZmllcixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBuYW1lOiBWZWNCYXNlLmluZGV4VG9Td2l6emxlKGkpXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgQU5OTyhyZXBsYWNlKS5jb3B5KEFOTk8obm9kZSkpO1xuICAgICAgICAgICAgcmV0dXJuIHJlcGxhY2U7XG4gICAgICAgIH0sXG5cbiAgICAgICAgYXR0YWNoU3dpenpsZXM6IGZ1bmN0aW9uIChpbnN0YW5jZSwgdmVjQ291bnQpe1xuICAgICAgICAgICAgZm9yKHZhciBzID0gMDsgcyA8IFZlY0Jhc2Uuc3dpenpsZVNldHMubGVuZ3RoOyArK3Mpe1xuICAgICAgICAgICAgICAgIGZvcih2YXIgY291bnQgPSAxOyBjb3VudCA8PSA0OyArK2NvdW50KXtcbiAgICAgICAgICAgICAgICAgICAgdmFyIG1heCA9IE1hdGgucG93KHZlY0NvdW50LCBjb3VudCk7XG4gICAgICAgICAgICAgICAgICAgICBmb3IodmFyIGkgPSAwOyBpIDwgbWF4OyArK2kpe1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHZhbCA9IGk7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIga2V5ID0gXCJcIjtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvcih2YXIgIGogPSAwOyBqIDwgY291bnQ7ICsrail7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGlkeCA9IHZhbCAlIHZlY0NvdW50O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhbCA9IE1hdGguZmxvb3IodmFsIC8gdmVjQ291bnQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGtleSs9IFZlY0Jhc2Uuc3dpenpsZVNldHNbc11baWR4XTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGluc3RhbmNlW2tleV0gPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FsbEV4cDogVmVjLmNyZWF0ZVN3aXp6bGUuYmluZChudWxsLCB2ZWNDb3VudCwga2V5KVxuICAgICAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcblxuICAgICAgICBjcmVhdGVPcGVyYXRvcjogZnVuY3Rpb24odmVjQ291bnQsIG9wZXJhdG9yLCBub2RlLCBhcmdzLCBwYXJlbnQpIHtcbiAgICAgICAgICAgIHZhciBvdGhlciA9IFZlYy5nZW5lcmF0ZVZlY0Zyb21BcmdzKHZlY0NvdW50LCBub2RlLmFyZ3VtZW50cyk7XG4gICAgICAgICAgICB2YXIgcmVwbGFjZSA9IHtcbiAgICAgICAgICAgICAgICB0eXBlOiBTeW50YXguQmluYXJ5RXhwcmVzc2lvbixcbiAgICAgICAgICAgICAgICBvcGVyYXRvcjogb3BlcmF0b3IsXG4gICAgICAgICAgICAgICAgbGVmdDogbm9kZS5jYWxsZWUub2JqZWN0LFxuICAgICAgICAgICAgICAgIHJpZ2h0OiBvdGhlclxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIEFOTk8ocmVwbGFjZSkuY29weShBTk5PKG5vZGUpKTtcbiAgICAgICAgICAgIHJldHVybiByZXBsYWNlO1xuICAgICAgICB9LFxuXG4gICAgICAgIGF0dGFjaE9wZXJhdG9yczogZnVuY3Rpb24oaW5zdGFuY2UsIHZlY0NvdW50LCBvcGVyYXRvcnMpe1xuICAgICAgICAgICAgZm9yKHZhciBuYW1lIGluIG9wZXJhdG9ycyl7XG4gICAgICAgICAgICAgICAgdmFyIG9wZXJhdG9yID0gb3BlcmF0b3JzW25hbWVdO1xuICAgICAgICAgICAgICAgIGluc3RhbmNlW25hbWVdID0ge1xuICAgICAgICAgICAgICAgICAgICBjYWxsRXhwOiBWZWMuY3JlYXRlT3BlcmF0b3IuYmluZChudWxsLCB2ZWNDb3VudCwgb3BlcmF0b3IpXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuXG4gICAgICAgIGNyZWF0ZUZ1bmN0aW9uQ2FsbDogZnVuY3Rpb24oZnVuY3Rpb25OYW1lLCBzZWNvbmRWZWNTaXplLCBub2RlLCBhcmdzLCBwYXJlbnQpIHtcbiAgICAgICAgICAgIHZhciByZXBsYWNlID0ge1xuICAgICAgICAgICAgICAgIHR5cGU6IFN5bnRheC5DYWxsRXhwcmVzc2lvbixcbiAgICAgICAgICAgICAgICBjYWxsZWU6IHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogU3ludGF4LklkZW50aWZpZXIsXG4gICAgICAgICAgICAgICAgICAgIG5hbWU6IGZ1bmN0aW9uTmFtZVxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgYXJndW1lbnRzOiBbXG4gICAgICAgICAgICAgICAgICAgIG5vZGUuY2FsbGVlLm9iamVjdFxuICAgICAgICAgICAgICAgIF1cbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBpZihzZWNvbmRWZWNTaXplKXtcbiAgICAgICAgICAgICAgICB2YXIgb3RoZXIgPSBWZWMuZ2VuZXJhdGVWZWNGcm9tQXJncyhzZWNvbmRWZWNTaXplLCBub2RlLmFyZ3VtZW50cyk7XG4gICAgICAgICAgICAgICAgcmVwbGFjZS5hcmd1bWVudHMucHVzaChvdGhlcik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBBTk5PKHJlcGxhY2UpLmNvcHkoQU5OTyhub2RlKSk7XG4gICAgICAgICAgICByZXR1cm4gcmVwbGFjZTtcbiAgICAgICAgfSxcblxuICAgICAgICBnZW5lcmF0ZUxlbmd0aENhbGw6IGZ1bmN0aW9uKG5vZGUsIGFyZ3MsIHBhcmVudCl7XG4gICAgICAgICAgICAgICAgaWYoYXJncy5sZW5ndGggPT0gMCl7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBWZWMuY3JlYXRlRnVuY3Rpb25DYWxsKCdsZW5ndGgnLCAwLCBub2RlLCBhcmdzLCBwYXJlbnQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNle1xuICAgICAgICAgICAgICAgICAgICAgdmFyIHJlcGxhY2UgPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiBTeW50YXguQmluYXJ5RXhwcmVzc2lvbixcbiAgICAgICAgICAgICAgICAgICAgICAgIG9wZXJhdG9yOiAnKicsXG4gICAgICAgICAgICAgICAgICAgICAgICBsZWZ0OiBub2RlLmNhbGxlZS5vYmplY3QsXG4gICAgICAgICAgICAgICAgICAgICAgICByaWdodDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6IFN5bnRheC5CaW5hcnlFeHByZXNzaW9uLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9wZXJhdG9yOiAnLycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGVmdDogbm9kZS5hcmd1bWVudHNbMF0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmlnaHQ6IFZlYy5jcmVhdGVGdW5jdGlvbkNhbGwoJ2xlbmd0aCcsIDAsIG5vZGUsIGFyZ3MsIHBhcmVudClcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgQU5OTyhyZXBsYWNlLnJpZ2h0KS5zZXRUeXBlKFRZUEVTLk5VTUJFUik7XG4gICAgICAgICAgICAgICAgICAgIEFOTk8ocmVwbGFjZSkuY29weShBTk5PKG5vZGUpKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJlcGxhY2U7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgIH07XG4gICAgbnMuVmVjID0gVmVjO1xuXG4gICAgbnMuZXh0ZW5kID0gQmFzZS5leHRlbmQ7XG5cblxufShleHBvcnRzKSk7XG4iLCIoZnVuY3Rpb24obnMpe1xuXG4gICAgdmFyIFNoYWRlID0gcmVxdWlyZShcIi4uLy4uLy4uL2ludGVyZmFjZXMuanNcIik7XG4gICAgdmFyIFN5bnRheCA9IHJlcXVpcmUoJ2VzdHJhdmVyc2UnKS5TeW50YXg7XG4gICAgdmFyIFRvb2xzID0gcmVxdWlyZShcIi4vdG9vbHMuanNcIik7XG4gICAgdmFyIEFOTk8gPSByZXF1aXJlKFwiLi4vLi4vLi4vYmFzZS9hbm5vdGF0aW9uLmpzXCIpLkFOTk87XG5cbiAgICB2YXIgVFlQRVMgPSBTaGFkZS5UWVBFUyxcbiAgICAgICAgS0lORFMgPSBTaGFkZS5PQkpFQ1RfS0lORFM7XG5cbiAgICB2YXIgVmVjMkluc3RhbmNlID0ge1xuICAgICAgICBub3JtYWxpemU6IHtcbiAgICAgICAgICAgIGNhbGxFeHA6IFRvb2xzLlZlYy5jcmVhdGVGdW5jdGlvbkNhbGwuYmluZChudWxsLCAnbm9ybWFsaXplJywgMClcbiAgICAgICAgfSxcbiAgICAgICAgZG90OiB7XG4gICAgICAgICAgICBjYWxsRXhwOiBUb29scy5WZWMuY3JlYXRlRnVuY3Rpb25DYWxsLmJpbmQobnVsbCwgJ2RvdCcsIDIpXG4gICAgICAgIH0sXG4gICAgICAgIGxlbmd0aDoge1xuICAgICAgICAgICAgY2FsbEV4cDogVG9vbHMuVmVjLmdlbmVyYXRlTGVuZ3RoQ2FsbFxuICAgICAgICB9XG4gICAgfVxuICAgIFRvb2xzLlZlYy5hdHRhY2hTd2l6emxlcyhWZWMySW5zdGFuY2UsIDIpO1xuICAgIFRvb2xzLlZlYy5hdHRhY2hPcGVyYXRvcnMoVmVjMkluc3RhbmNlLCAyLCB7XG4gICAgICAgIGFkZDogJysnLFxuICAgICAgICBzdWI6ICctJyxcbiAgICAgICAgbXVsOiAnKicsXG4gICAgICAgIGRpdjogJy8nLFxuICAgICAgICBtb2Q6ICclJ1xuICAgIH0pXG5cblxuICAgIFRvb2xzLmV4dGVuZChucywge1xuICAgICAgICBpZDogXCJWZWMyXCIsXG4gICAgICAgIGtpbmQ6IEtJTkRTLkZMT0FUMixcbiAgICAgICAgb2JqZWN0OiB7XG4gICAgICAgICAgICBjb25zdHJ1Y3RvcjogbnVsbCxcbiAgICAgICAgICAgIHN0YXRpYzoge31cbiAgICAgICAgfSxcbiAgICAgICAgaW5zdGFuY2U6IFZlYzJJbnN0YW5jZVxuICAgIH0pO1xuXG59KGV4cG9ydHMpKTtcbiIsIihmdW5jdGlvbihucyl7XG5cbiAgICB2YXIgU2hhZGUgPSByZXF1aXJlKFwiLi4vLi4vLi4vaW50ZXJmYWNlcy5qc1wiKTtcbiAgICB2YXIgU3ludGF4ID0gcmVxdWlyZSgnZXN0cmF2ZXJzZScpLlN5bnRheDtcbiAgICB2YXIgVG9vbHMgPSByZXF1aXJlKFwiLi90b29scy5qc1wiKTtcbiAgICB2YXIgQU5OTyA9IHJlcXVpcmUoXCIuLi8uLi8uLi9iYXNlL2Fubm90YXRpb24uanNcIikuQU5OTztcblxuICAgIHZhciBUWVBFUyA9IFNoYWRlLlRZUEVTLFxuICAgICAgICBLSU5EUyA9IFNoYWRlLk9CSkVDVF9LSU5EUztcblxuICAgIHZhciBWZWMzSW5zdGFuY2UgPSB7XG4gICAgICAgIG5vcm1hbGl6ZToge1xuICAgICAgICAgICAgY2FsbEV4cDogVG9vbHMuVmVjLmNyZWF0ZUZ1bmN0aW9uQ2FsbC5iaW5kKG51bGwsICdub3JtYWxpemUnLCAwKVxuICAgICAgICB9LFxuICAgICAgICBkb3Q6IHtcbiAgICAgICAgICAgIGNhbGxFeHA6IFRvb2xzLlZlYy5jcmVhdGVGdW5jdGlvbkNhbGwuYmluZChudWxsLCAnZG90JywgMylcbiAgICAgICAgfSxcbiAgICAgICAgbGVuZ3RoOiB7XG4gICAgICAgICAgICBjYWxsRXhwOiBUb29scy5WZWMuZ2VuZXJhdGVMZW5ndGhDYWxsXG4gICAgICAgIH1cbiAgICB9XG4gICAgVG9vbHMuVmVjLmF0dGFjaFN3aXp6bGVzKFZlYzNJbnN0YW5jZSwgMyk7XG4gICAgVG9vbHMuVmVjLmF0dGFjaE9wZXJhdG9ycyhWZWMzSW5zdGFuY2UsIDMsIHtcbiAgICAgICAgYWRkOiAnKycsXG4gICAgICAgIHN1YjogJy0nLFxuICAgICAgICBtdWw6ICcqJyxcbiAgICAgICAgZGl2OiAnLycsXG4gICAgICAgIG1vZDogJyUnXG4gICAgfSlcblxuXG4gICAgVG9vbHMuZXh0ZW5kKG5zLCB7XG4gICAgICAgIGlkOiBcIlZlYzNcIixcbiAgICAgICAga2luZDogS0lORFMuRkxPQVQzLFxuICAgICAgICBvYmplY3Q6IHtcbiAgICAgICAgICAgIGNvbnN0cnVjdG9yOiBudWxsLFxuICAgICAgICAgICAgc3RhdGljOiB7fVxuICAgICAgICB9LFxuICAgICAgICBpbnN0YW5jZTogVmVjM0luc3RhbmNlXG4gICAgfSk7XG5cbn0oZXhwb3J0cykpO1xuIiwiKGZ1bmN0aW9uKG5zKXtcblxuICAgIHZhciBTaGFkZSA9IHJlcXVpcmUoXCIuLi8uLi8uLi9pbnRlcmZhY2VzLmpzXCIpO1xuICAgIHZhciBTeW50YXggPSByZXF1aXJlKCdlc3RyYXZlcnNlJykuU3ludGF4O1xuICAgIHZhciBUb29scyA9IHJlcXVpcmUoXCIuL3Rvb2xzLmpzXCIpO1xuICAgIHZhciBBTk5PID0gcmVxdWlyZShcIi4uLy4uLy4uL2Jhc2UvYW5ub3RhdGlvbi5qc1wiKS5BTk5PO1xuXG4gICAgdmFyIFRZUEVTID0gU2hhZGUuVFlQRVMsXG4gICAgICAgIEtJTkRTID0gU2hhZGUuT0JKRUNUX0tJTkRTO1xuXG4gICAgdmFyIFZlYzRJbnN0YW5jZSA9IHtcbiAgICAgICAgbm9ybWFsaXplOiB7XG4gICAgICAgICAgICBjYWxsRXhwOiBUb29scy5WZWMuY3JlYXRlRnVuY3Rpb25DYWxsLmJpbmQobnVsbCwgJ25vcm1hbGl6ZScsIDApXG4gICAgICAgIH0sXG4gICAgICAgIGRvdDoge1xuICAgICAgICAgICAgY2FsbEV4cDogVG9vbHMuVmVjLmNyZWF0ZUZ1bmN0aW9uQ2FsbC5iaW5kKG51bGwsICdkb3QnLCA0KVxuICAgICAgICB9LFxuICAgICAgICBsZW5ndGg6IHtcbiAgICAgICAgICAgIGNhbGxFeHA6IFRvb2xzLlZlYy5nZW5lcmF0ZUxlbmd0aENhbGxcbiAgICAgICAgfVxuICAgIH1cbiAgICBUb29scy5WZWMuYXR0YWNoU3dpenpsZXMoVmVjNEluc3RhbmNlLCA0KTtcbiAgICBUb29scy5WZWMuYXR0YWNoT3BlcmF0b3JzKFZlYzRJbnN0YW5jZSwgNCwge1xuICAgICAgICBhZGQ6ICcrJyxcbiAgICAgICAgc3ViOiAnLScsXG4gICAgICAgIG11bDogJyonLFxuICAgICAgICBkaXY6ICcvJyxcbiAgICAgICAgbW9kOiAnJSdcbiAgICB9KVxuXG5cbiAgICBUb29scy5leHRlbmQobnMsIHtcbiAgICAgICAgaWQ6IFwiVmVjNFwiLFxuICAgICAgICBraW5kOiBLSU5EUy5GTE9BVDQsXG4gICAgICAgIG9iamVjdDoge1xuICAgICAgICAgICAgY29uc3RydWN0b3I6IG51bGwsXG4gICAgICAgICAgICBzdGF0aWM6IHt9XG4gICAgICAgIH0sXG4gICAgICAgIGluc3RhbmNlOiBWZWM0SW5zdGFuY2VcbiAgICB9KTtcblxufShleHBvcnRzKSk7XG4iLCIoZnVuY3Rpb24gKG5zKSB7XG5cbiAgICB2YXIgQmFzZSA9IHJlcXVpcmUoXCIuLi8uLi9iYXNlL2luZGV4LmpzXCIpLFxuICAgICAgICBBTk5PID0gcmVxdWlyZShcIi4uLy4uL2Jhc2UvYW5ub3RhdGlvbi5qc1wiKS5BTk5PLFxuICAgICAgICBBbm5vdGF0aW9uID0gcmVxdWlyZShcIi4uLy4uL2Jhc2UvYW5ub3RhdGlvbi5qc1wiKS5Bbm5vdGF0aW9uLFxuICAgICAgICBGdW5jdGlvbkFubm90YXRpb24gPSByZXF1aXJlKFwiLi4vLi4vYmFzZS9hbm5vdGF0aW9uLmpzXCIpLkZ1bmN0aW9uQW5ub3RhdGlvbixcbiAgICAgICAgVHlwZUluZm8gPSByZXF1aXJlKFwiLi4vLi4vYmFzZS90eXBlaW5mby5qc1wiKS5UeXBlSW5mbyxcbiAgICAgICAgU2hhZGUgPSByZXF1aXJlKFwiLi8uLi8uLi9pbnRlcmZhY2VzLmpzXCIpLFxuICAgICAgICBUeXBlcyA9IFNoYWRlLlRZUEVTLFxuICAgICAgICBLaW5kcyA9IFNoYWRlLk9CSkVDVF9LSU5EUyxcbiAgICAgICAgU291cmNlcyA9IHJlcXVpcmUoXCIuLy4uLy4uL2ludGVyZmFjZXMuanNcIikuU09VUkNFUztcblxuICAgIHZhciBPYmplY3RSZWdpc3RyeSA9IHJlcXVpcmUoXCIuL3JlZ2lzdHJ5L2luZGV4LmpzXCIpLlJlZ2lzdHJ5LFxuICAgICAgICBDb250ZXh0ID0gcmVxdWlyZShcIi4uLy4uL2Jhc2UvY29udGV4dC5qc1wiKS5nZXRDb250ZXh0KE9iamVjdFJlZ2lzdHJ5KTtcblxuXG4gICAgdmFyIHdhbGsgPSByZXF1aXJlKCdlc3RyYXZlcnNlJyk7XG4gICAgdmFyIFN5bnRheCA9IHdhbGsuU3ludGF4O1xuXG5cbiAgICAvKipcbiAgICAgKiBUcmFuc2Zvcm1zIHRoZSBKUyBBU1QgdG8gYW4gQVNUIHJlcHJlc2VudGF0aW9uIGNvbnZlbmllbnRcbiAgICAgKiBmb3IgY29kZSBnZW5lcmF0aW9uXG4gICAgICogQGNvbnN0cnVjdG9yXG4gICAgICovXG4gICAgdmFyIEdMQVNUVHJhbnNmb3JtZXIgPSBmdW5jdGlvbiAobWFpbklkKSB7XG4gICAgICAgIHRoaXMubWFpbklkID0gbWFpbklkO1xuICAgIH07XG5cbiAgICBCYXNlLmV4dGVuZChHTEFTVFRyYW5zZm9ybWVyLnByb3RvdHlwZSwge1xuICAgICAgICByZWdpc3Rlckdsb2JhbENvbnRleHQgOiBmdW5jdGlvbiAocHJvZ3JhbSkge1xuICAgICAgICAgICAgdmFyIGN0eCA9IG5ldyBDb250ZXh0KHByb2dyYW0sIG51bGwsIHtuYW1lOiBcImdsb2JhbFwifSk7XG4gICAgICAgICAgICBjdHgucmVnaXN0ZXJPYmplY3QoXCJNYXRoXCIsIE9iamVjdFJlZ2lzdHJ5LmdldEJ5TmFtZShcIk1hdGhcIikpO1xuICAgICAgICAgICAgY3R4LnJlZ2lzdGVyT2JqZWN0KFwidGhpc1wiLCBPYmplY3RSZWdpc3RyeS5nZXRCeU5hbWUoXCJTeXN0ZW1cIikpO1xuICAgICAgICAgICAgY3R4LnJlZ2lzdGVyT2JqZWN0KFwiU2hhZGVcIiwgT2JqZWN0UmVnaXN0cnkuZ2V0QnlOYW1lKFwiU2hhZGVcIikpO1xuICAgICAgICAgICAgY3R4LnJlZ2lzdGVyT2JqZWN0KFwiVmVjMlwiLCBPYmplY3RSZWdpc3RyeS5nZXRCeU5hbWUoXCJWZWMyXCIpKTtcbiAgICAgICAgICAgIGN0eC5yZWdpc3Rlck9iamVjdChcIlZlYzNcIiwgT2JqZWN0UmVnaXN0cnkuZ2V0QnlOYW1lKFwiVmVjM1wiKSk7XG4gICAgICAgICAgICBjdHgucmVnaXN0ZXJPYmplY3QoXCJDb2xvclwiLCBPYmplY3RSZWdpc3RyeS5nZXRCeU5hbWUoXCJWZWMzXCIpKTtcbiAgICAgICAgICAgIGN0eC5yZWdpc3Rlck9iamVjdChcIlRleHR1cmVcIiwgT2JqZWN0UmVnaXN0cnkuZ2V0QnlOYW1lKFwiVGV4dHVyZVwiKSk7XG4gICAgICAgICAgICBjdHguZGVjbGFyZVZhcmlhYmxlKFwiZ2xfRnJhZ0Nvb3JkXCIsIGZhbHNlKTtcbiAgICAgICAgICAgIGN0eC51cGRhdGVFeHByZXNzaW9uKFwiZ2xfRnJhZ0Nvb3JkXCIsIG5ldyBUeXBlSW5mbyh7XG4gICAgICAgICAgICAgICAgZXh0cmE6IHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogVHlwZXMuT0JKRUNULFxuICAgICAgICAgICAgICAgICAgICBraW5kOiBLaW5kcy5GTE9BVDNcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KSk7XG4gICAgICAgICAgICBjdHguZGVjbGFyZVZhcmlhYmxlKFwiX3N5c19ub3JtYWxpemVkQ29vcmRzXCIsIGZhbHNlKTtcbiAgICAgICAgICAgIGN0eC51cGRhdGVFeHByZXNzaW9uKFwiX3N5c19ub3JtYWxpemVkQ29vcmRzXCIsIG5ldyBUeXBlSW5mbyh7XG4gICAgICAgICAgICAgICAgZXh0cmE6IHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogVHlwZXMuT0JKRUNULFxuICAgICAgICAgICAgICAgICAgICBraW5kOiBLaW5kcy5GTE9BVDNcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KSk7XG5cbiAgICAgICAgICAgIHJldHVybiBjdHg7XG4gICAgICAgIH0sXG4gICAgICAgIHRyYW5zZm9ybUFBU1Q6IGZ1bmN0aW9uIChwcm9ncmFtKSB7XG4gICAgICAgICAgICB0aGlzLnJvb3QgPSBwcm9ncmFtO1xuICAgICAgICAgICAgdmFyIGNvbnRleHQgPSB0aGlzLnJlZ2lzdGVyR2xvYmFsQ29udGV4dChwcm9ncmFtKTtcblxuICAgICAgICAgICAgdmFyIHN0YXRlID0ge1xuICAgICAgICAgICAgICAgICBjb250ZXh0OiBjb250ZXh0LFxuICAgICAgICAgICAgICAgICBjb250ZXh0U3RhY2s6IFtjb250ZXh0XSxcbiAgICAgICAgICAgICAgICAgaW5NYWluOiAgdGhpcy5tYWluSWQgPT0gY29udGV4dC5zdHIoKSxcbiAgICAgICAgICAgICAgICAgZ2xvYmFsUGFyYW1ldGVycyA6IHByb2dyYW0uaW5qZWN0aW9uc1t0aGlzLm1haW5JZF0gJiYgcHJvZ3JhbS5pbmplY3Rpb25zW3RoaXMubWFpbklkXVswXSA/IHByb2dyYW0uaW5qZWN0aW9uc1t0aGlzLm1haW5JZF1bMF0ubm9kZS5leHRyYS5pbmZvIDoge30sXG4gICAgICAgICAgICAgICAgIGJsb2NrZWROYW1lcyA6IFtdLFxuICAgICAgICAgICAgICAgICB0b3BEZWNsYXJhdGlvbnMgOiBbXSxcbiAgICAgICAgICAgICAgICAgaWROYW1lTWFwIDoge31cbiAgICAgICAgICAgIH1cblxuXG5cbiAgICAgICAgICAgIGZvcih2YXIgbmFtZSBpbiBzdGF0ZS5nbG9iYWxQYXJhbWV0ZXJzKXtcbiAgICAgICAgICAgICAgICBzdGF0ZS5ibG9ja2VkTmFtZXMucHVzaChuYW1lKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdGhpcy5yZXBsYWNlKHByb2dyYW0sIHN0YXRlKTtcblxuICAgICAgICAgICAgZm9yKHZhciBuYW1lIGluIHN0YXRlLmdsb2JhbFBhcmFtZXRlcnMpe1xuICAgICAgICAgICAgICAgIHZhciBkZWNsID0gaGFuZGxlVG9wRGVjbGFyYXRpb24obmFtZSwgc3RhdGUuZ2xvYmFsUGFyYW1ldGVycyk7XG4gICAgICAgICAgICAgICAgaWYgKGRlY2wpXG4gICAgICAgICAgICAgICAgICAgIHByb2dyYW0uYm9keS51bnNoaWZ0KGRlY2wpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gcHJvZ3JhbTtcbiAgICAgICAgfSxcbiAgICAgICAgLyoqXG4gICAgICAgICAqXG4gICAgICAgICAqIEBwYXJhbSB7T2JqZWN0IX0gYXN0XG4gICAgICAgICAqIEBwYXJhbSB7T2JqZWN0IX0gc3RhdGVcbiAgICAgICAgICogQHJldHVybnMgeyp9XG4gICAgICAgICAqL1xuICAgICAgICByZXBsYWNlOiBmdW5jdGlvbihhc3QsIHN0YXRlKSB7XG4gICAgICAgICAgICB3YWxrLnJlcGxhY2UoYXN0LCB7XG5cbiAgICAgICAgICAgICAgICBlbnRlcjogZnVuY3Rpb24gKG5vZGUsIHBhcmVudCkge1xuICAgICAgICAgICAgICAgICAgICAvL2NvbnNvbGUubG9nKFwiRW50ZXI6XCIsIG5vZGUudHlwZSk7XG4gICAgICAgICAgICAgICAgICAgIHN3aXRjaCAobm9kZS50eXBlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjYXNlIFN5bnRheC5JZGVudGlmaWVyOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBoYW5kbGVJZGVudGlmaWVyKG5vZGUsIHBhcmVudCwgc3RhdGUuYmxvY2tlZE5hbWVzLCBzdGF0ZS5pZE5hbWVNYXApO1xuICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSBTeW50YXguSWZTdGF0ZW1lbnQ6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGhhbmRsZUlmU3RhdGVtZW50KG5vZGUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSBTeW50YXguQ29uZGl0aW9uYWxFeHByZXNzaW9uOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBoYW5kbGVDb25kaXRpb25hbEV4cHJlc3Npb24obm9kZSwgc3RhdGUsIHRoaXMpO1xuICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSBTeW50YXguTG9naWNhbEV4cHJlc3Npb246XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGhhbmRsZUxvZ2ljYWxFeHByZXNzaW9uKG5vZGUsIHRoaXMsIHN0YXRlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgU3ludGF4LkZ1bmN0aW9uRGVjbGFyYXRpb246XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gTm8gbmVlZCB0byBkZWNsYXJlLCB0aGlzIGhhcyBiZWVuIGFubm90YXRlZCBhbHJlYWR5XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHBhcmVudENvbnRleHQgPSBzdGF0ZS5jb250ZXh0U3RhY2tbc3RhdGUuY29udGV4dFN0YWNrLmxlbmd0aCAtIDFdO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBjb250ZXh0ID0gbmV3IENvbnRleHQobm9kZSwgcGFyZW50Q29udGV4dCwge25hbWU6IG5vZGUuaWQubmFtZSB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdGF0ZS5jb250ZXh0ID0gY29udGV4dDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdGF0ZS5jb250ZXh0U3RhY2sucHVzaChjb250ZXh0KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdGF0ZS5pbk1haW4gPSB0aGlzLm1haW5JZCA9PSBjb250ZXh0LnN0cigpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfS5iaW5kKHRoaXMpLFxuXG4gICAgICAgICAgICAgICAgbGVhdmU6IGZ1bmN0aW9uKG5vZGUsIHBhcmVudCkge1xuICAgICAgICAgICAgICAgICAgICBzd2l0Y2gobm9kZS50eXBlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjYXNlIFN5bnRheC5NZW1iZXJFeHByZXNzaW9uOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBoYW5kbGVNZW1iZXJFeHByZXNzaW9uKG5vZGUsIHBhcmVudCwgc3RhdGUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSBTeW50YXguQ2FsbEV4cHJlc3Npb246XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGhhbmRsZUNhbGxFeHByZXNzaW9uKG5vZGUsIHBhcmVudCwgc3RhdGUudG9wRGVjbGFyYXRpb25zLCBzdGF0ZS5jb250ZXh0KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgU3ludGF4LkZ1bmN0aW9uRGVjbGFyYXRpb246XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RhdGUuY29udGV4dCA9IHN0YXRlLmNvbnRleHRTdGFjay5wb3AoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdGF0ZS5pbk1haW4gPSBzdGF0ZS5jb250ZXh0LnN0cigpID09IHRoaXMubWFpbklkO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzdGF0ZS5pbk1haW4pXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBoYW5kbGVNYWluRnVuY3Rpb24obm9kZSwgcGFyZW50LCBzdGF0ZS5jb250ZXh0KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgU3ludGF4LlJldHVyblN0YXRlbWVudDpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZihzdGF0ZS5pbk1haW4pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGhhbmRsZVJldHVybkluTWFpbihub2RlLCBzdGF0ZS5jb250ZXh0KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgICAgICBjYXNlIFN5bnRheC5CaW5hcnlFeHByZXNzaW9uOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBoYW5kbGVCaW5hcnlFeHByZXNzaW9uKG5vZGUsIHBhcmVudCk7XG5cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0uYmluZCh0aGlzKVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICByZXR1cm4gYXN0O1xuICAgICAgICB9XG4gICAgfSk7XG5cbiAgICB2YXIgaGFuZGxlVG9wRGVjbGFyYXRpb24gPSBmdW5jdGlvbihuYW1lLCBnbG9iYWxQYXJhbWV0ZXJzKXtcbiAgICAgICAgdmFyIHByb3BlcnR5TGl0ZXJhbCA9ICB7IHR5cGU6IFN5bnRheC5JZGVudGlmaWVyLCBuYW1lOiBnZXROYW1lRm9yR2xvYmFsKGdsb2JhbFBhcmFtZXRlcnMsIG5hbWUpfTtcbiAgICAgICAgdmFyIHByb3BlcnR5QW5ub3RhdGlvbiA9ICBBTk5PKHByb3BlcnR5TGl0ZXJhbCk7XG4gICAgICAgIHByb3BlcnR5QW5ub3RhdGlvbi5zZXRGcm9tRXh0cmEoZ2xvYmFsUGFyYW1ldGVyc1tuYW1lXSk7XG5cbiAgICAgICAgaWYgKHByb3BlcnR5QW5ub3RhdGlvbi5pc051bGxPclVuZGVmaW5lZCgpKVxuICAgICAgICAgICAgcmV0dXJuO1xuXG4gICAgICAgIHZhciBkZWNsID0ge1xuICAgICAgICAgICAgdHlwZTogU3ludGF4LlZhcmlhYmxlRGVjbGFyYXRpb24sXG4gICAgICAgICAgICBkZWNsYXJhdGlvbnM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IFN5bnRheC5WYXJpYWJsZURlY2xhcmF0b3IsXG4gICAgICAgICAgICAgICAgICAgIGlkOiBwcm9wZXJ0eUxpdGVyYWwsXG4gICAgICAgICAgICAgICAgICAgIGluaXQ6IG51bGxcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAga2luZDogXCJ2YXJcIlxuICAgICAgICB9O1xuICAgICAgICB2YXIgZGVjbEFubm90YXRpb24gPSAgQU5OTyhkZWNsLmRlY2xhcmF0aW9uc1swXSk7XG4gICAgICAgIGRlY2xBbm5vdGF0aW9uLmNvcHkocHJvcGVydHlBbm5vdGF0aW9uKTtcbiAgICAgICAgcmV0dXJuIGRlY2w7XG4gICAgfVxuXG4gICAgdmFyIGhhbmRsZUlkZW50aWZpZXIgPSBmdW5jdGlvbihub2RlLCBwYXJlbnQsIGJsb2NrZWROYW1lcywgaWROYW1lTWFwKXtcbiAgICAgICAgaWYocGFyZW50LnR5cGUgPT0gU3ludGF4LkZ1bmN0aW9uRGVjbGFyYXRpb24pXG4gICAgICAgICAgICByZXR1cm4gbm9kZTtcbiAgICAgICAgaWYocGFyZW50LnR5cGUgPT0gU3ludGF4Lk1lbWJlckV4cHJlc3Npb24gJiYgQU5OTyhwYXJlbnQub2JqZWN0KS5pc0dsb2JhbCgpKVxuICAgICAgICAgICAgcmV0dXJuIG5vZGU7XG5cblxuICAgICAgICB2YXIgbmFtZSA9IG5vZGUubmFtZTtcbiAgICAgICAgaWYoaWROYW1lTWFwW25hbWVdKSBub2RlLm5hbWUgPSBpZE5hbWVNYXBbbmFtZV07XG4gICAgICAgIHZhciBuZXdOYW1lID0gbmFtZSwgaSA9IDE7XG4gICAgICAgIHdoaWxlKGJsb2NrZWROYW1lcy5pbmRleE9mKG5ld05hbWUpICE9IC0xKXtcbiAgICAgICAgICAgIG5ld05hbWUgPSBuYW1lICsgXCJfXCIgKyAoKytpKTtcbiAgICAgICAgfVxuICAgICAgICBpZE5hbWVNYXBbbmFtZV0gPSBuZXdOYW1lO1xuICAgICAgICBub2RlLm5hbWUgPSBuZXdOYW1lO1xuICAgICAgICByZXR1cm4gbm9kZTtcbiAgICB9XG5cblxuICAgIHZhciBoYW5kbGVSZXR1cm5Jbk1haW4gPSBmdW5jdGlvbihub2RlLCBjb250ZXh0KSB7XG4gICAgICAgIGlmIChub2RlLmFyZ3VtZW50KSB7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHR5cGU6IFN5bnRheC5CbG9ja1N0YXRlbWVudCxcbiAgICAgICAgICAgICAgICBib2R5OiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6IFN5bnRheC5Bc3NpZ25tZW50RXhwcmVzc2lvbixcbiAgICAgICAgICAgICAgICAgICAgICAgIG9wZXJhdG9yOiBcIj1cIixcbiAgICAgICAgICAgICAgICAgICAgICAgIGxlZnQ6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiBTeW50YXguSWRlbnRpZmllcixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBuYW1lOiBcImdsX0ZyYWdDb2xvclwiXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgcmlnaHQ6IGNhc3RUb1ZlYzQobm9kZS5hcmd1bWVudCwgY29udGV4dClcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogU3ludGF4LlJldHVyblN0YXRlbWVudFxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXVxuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICB0eXBlOiBTeW50YXguRXhwcmVzc2lvblN0YXRlbWVudCxcbiAgICAgICAgICAgICAgICBleHByZXNzaW9uIDoge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiBTeW50YXguSWRlbnRpZmllcixcbiAgICAgICAgICAgICAgICAgICAgbmFtZTogXCJkaXNjYXJkXCJcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgdmFyIGhhbmRsZU1haW5GdW5jdGlvbiA9IGZ1bmN0aW9uKG5vZGUsIHBhcmVudCwgY29udGV4dCkge1xuICAgICAgICB2YXIgYW5ubyA9IG5ldyBGdW5jdGlvbkFubm90YXRpb24obm9kZSk7XG4gICAgICAgIGFubm8uc2V0UmV0dXJuSW5mbyh7IHR5cGU6IFR5cGVzLlVOREVGSU5FRCB9KTtcblxuICAgICAgICAvLyBjb25zb2xlLmxvZyhjb250ZXh0KTtcbiAgICAgICAgLy8gTWFpbiBoYXMgbm8gcGFyYW1ldGVyc1xuICAgICAgICBub2RlLnBhcmFtcyA9IFtdO1xuICAgICAgICAvLyBSZW5hbWUgdG8gJ21haW4nXG4gICAgICAgIG5vZGUuaWQubmFtZSA9IFwibWFpblwiO1xuICAgICAgICAvL2NvbnNvbGUubG9nKG5vZGUpO1xuICAgIH1cblxuXG4gICAgZnVuY3Rpb24gZ2V0TmFtZU9mTm9kZShub2RlKSB7XG4gICAgICAgIHN3aXRjaCAobm9kZS50eXBlKSB7XG4gICAgICAgICAgICBjYXNlIFN5bnRheC5JZGVudGlmaWVyOlxuICAgICAgICAgICAgICAgIHJldHVybiBub2RlLm5hbWU7XG4gICAgICAgICAgICBjYXNlIFN5bnRheC5NZW1iZXJFeHByZXNzaW9uOlxuICAgICAgICAgICAgICAgIHJldHVybiBnZXROYW1lT2ZOb2RlKG5vZGUub2JqZWN0KSArIFwiLlwiICsgZ2V0TmFtZU9mTm9kZShub2RlLnByb3BlcnR5KTtcbiAgICAgICAgICAgIGNhc2UgU3ludGF4Lk5ld0V4cHJlc3Npb246XG4gICAgICAgICAgICAgICAgcmV0dXJuIGdldE5hbWVPZk5vZGUobm9kZS5jYWxsZWUpO1xuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICByZXR1cm4gXCJ1bmtub3duKFwiICsgbm9kZS50eXBlICsgXCIpXCI7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgZnVuY3Rpb24gZ2V0T2JqZWN0UmVmZXJlbmNlRnJvbU5vZGUob2JqZWN0LCBjb250ZXh0KSB7XG4gICAgICAgIHN3aXRjaCAob2JqZWN0LnR5cGUpIHtcbiAgICAgICAgICAgIGNhc2UgU3ludGF4Lk5ld0V4cHJlc3Npb246XG4gICAgICAgICAgICBjYXNlIFN5bnRheC5DYWxsRXhwcmVzc2lvbjpcbiAgICAgICAgICAgIGNhc2UgU3ludGF4Lk1lbWJlckV4cHJlc3Npb246XG4gICAgICAgICAgICBjYXNlIFN5bnRheC5CaW5hcnlFeHByZXNzaW9uOlxuICAgICAgICAgICAgY2FzZSBTeW50YXguSWRlbnRpZmllcjpcbiAgICAgICAgICAgICAgICByZXR1cm4gY29udGV4dC5jcmVhdGVUeXBlSW5mbyhvYmplY3QpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBTeW50YXguVGhpc0V4cHJlc3Npb246XG4gICAgICAgICAgICAgICAgcmV0dXJuIGNvbnRleHQuZ2V0QmluZGluZ0J5TmFtZShcInRoaXNcIik7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIlVuaGFuZGxlZCBvYmplY3QgdHlwZSBpbiBHTFNMIGdlbmVyYXRpb246IFwiICsgb2JqZWN0LnR5cGUpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgdmFyIGhhbmRsZUNhbGxFeHByZXNzaW9uID0gZnVuY3Rpb24gKGNhbGxFeHByZXNzaW9uLCBwYXJlbnQsIHRvcERlY2xhcmF0aW9ucywgY29udGV4dCkge1xuXG4gICAgICAgIC8vIElzIHRoaXMgYSBjYWxsIG9uIGFuIG9iamVjdD9cbiAgICAgICAgaWYgKGNhbGxFeHByZXNzaW9uLmNhbGxlZS50eXBlID09IFN5bnRheC5NZW1iZXJFeHByZXNzaW9uKSB7XG4gICAgICAgICAgICB2YXIgY2FsbGVlUmVmZXJlbmNlID0gZ2V0T2JqZWN0UmVmZXJlbmNlRnJvbU5vZGUoY2FsbEV4cHJlc3Npb24uY2FsbGVlLCBjb250ZXh0KTtcbiAgICAgICAgICAgIGlmKCEoY2FsbGVlUmVmZXJlbmNlICYmIGNhbGxlZVJlZmVyZW5jZS5pc0Z1bmN0aW9uKCkpKVxuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIlNvbWV0aGluZyB3ZW50IHdyb25nIGluIHR5cGUgaW5mZXJlbmNlXCIpO1xuXG4gICAgICAgICAgICB2YXIgb2JqZWN0ID0gY2FsbEV4cHJlc3Npb24uY2FsbGVlLm9iamVjdCxcbiAgICAgICAgICAgICAgICBwcm9wZXJ0eU5hbWUgPSBjYWxsRXhwcmVzc2lvbi5jYWxsZWUucHJvcGVydHkubmFtZTtcblxuICAgICAgICAgICAgdmFyIG9iamVjdFJlZmVyZW5jZSA9IGdldE9iamVjdFJlZmVyZW5jZUZyb21Ob2RlKG9iamVjdCwgY29udGV4dCk7XG4gICAgICAgICAgICBpZighb2JqZWN0UmVmZXJlbmNlKSAge1xuICAgICAgICAgICAgICAgIFNoYWRlLnRocm93RXJyb3IoY2FsbEV4cHJlc3Npb24sIFwiSW50ZXJuYWw6IE5vIG9iamVjdCBpbmZvIGZvcjogXCIgKyBvYmplY3QpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB2YXIgb2JqZWN0SW5mbyA9IGNvbnRleHQuZ2V0T2JqZWN0SW5mb0ZvcihvYmplY3RSZWZlcmVuY2UpO1xuICAgICAgICAgICAgaWYoIW9iamVjdEluZm8pIHsgLy8gRXZlcnkgb2JqZWN0IG5lZWRzIGFuIGluZm8sIG90aGVyd2lzZSB3ZSBkaWQgc29tZXRoaW5nIHdyb25nXG4gICAgICAgICAgICAgICAgU2hhZGUudGhyb3dFcnJvcihjYWxsRXhwcmVzc2lvbiwgXCJJbnRlcm5hbCBFcnJvcjogTm8gb2JqZWN0IHJlZ2lzdGVyZWQgZm9yOiBcIiArIG9iamVjdFJlZmVyZW5jZS5nZXRUeXBlU3RyaW5nKCkgKyBcIiwgXCIgKyBnZXROYW1lT2ZOb2RlKGNhbGxFeHByZXNzaW9uLmNhbGxlZS5vYmplY3QpK1wiLCBcIitjYWxsRXhwcmVzc2lvbi5jYWxsZWUub2JqZWN0LnR5cGUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKG9iamVjdEluZm8uaGFzT3duUHJvcGVydHkocHJvcGVydHlOYW1lKSkge1xuICAgICAgICAgICAgICAgIHZhciBwcm9wZXJ0eUhhbmRsZXIgPSBvYmplY3RJbmZvW3Byb3BlcnR5TmFtZV07XG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBwcm9wZXJ0eUhhbmRsZXIuY2FsbEV4cCA9PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGFyZ3MgPSBBbm5vdGF0aW9uLmNyZWF0ZUFubm90YXRlZE5vZGVBcnJheShjYWxsRXhwcmVzc2lvbi5hcmd1bWVudHMsIGNvbnRleHQpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcHJvcGVydHlIYW5kbGVyLmNhbGxFeHAoY2FsbEV4cHJlc3Npb24sIGFyZ3MsIHBhcmVudCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgIH1cblxuICAgIH1cblxuXG4gICAgdmFyIGhhbmRsZU1lbWJlckV4cHJlc3Npb24gPSBmdW5jdGlvbiAobWVtYmVyRXhwcmVzc2lvbiwgcGFyZW50LCBzdGF0ZSkge1xuICAgICAgICB2YXIgcHJvcGVydHlOYW1lID0gbWVtYmVyRXhwcmVzc2lvbi5wcm9wZXJ0eS5uYW1lLFxuICAgICAgICAgICAgY29udGV4dCA9IHN0YXRlLmNvbnRleHQ7XG5cbiAgICAgICAgdmFyIG9iamVjdFJlZmVyZW5jZSA9IGdldE9iamVjdFJlZmVyZW5jZUZyb21Ob2RlKG1lbWJlckV4cHJlc3Npb24ub2JqZWN0LCBjb250ZXh0KTtcblxuICAgICAgICBpZiAob2JqZWN0UmVmZXJlbmNlICYmIG9iamVjdFJlZmVyZW5jZS5pc09iamVjdCgpKSB7XG4gICAgICAgICAgICB2YXIgb2JqZWN0SW5mbyA9IGNvbnRleHQuZ2V0T2JqZWN0SW5mb0ZvcihvYmplY3RSZWZlcmVuY2UpO1xuICAgICAgICAgICAgaWYoIW9iamVjdEluZm8pIHsvLyBFdmVyeSBvYmplY3QgbmVlZHMgYW4gaW5mbywgb3RoZXJ3aXNlIHdlIGRpZCBzb21ldGhpbmcgd3JvbmdcbiAgICAgICAgICAgICAgICBTaGFkZS50aHJvd0Vycm9yKG1lbWJlckV4cHJlc3Npb24sIFwiSW50ZXJuYWwgRXJyb3I6IE5vIG9iamVjdCByZWdpc3RlcmVkIGZvcjogXCIgKyBvYmplY3RSZWZlcmVuY2UuZ2V0VHlwZVN0cmluZygpICsgSlNPTi5zdHJpbmdpZnkobWVtYmVyRXhwcmVzc2lvbi5vYmplY3QpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChvYmplY3RJbmZvLmhhc093blByb3BlcnR5KHByb3BlcnR5TmFtZSkpIHtcbiAgICAgICAgICAgICAgICB2YXIgcHJvcGVydHlIYW5kbGVyID0gb2JqZWN0SW5mb1twcm9wZXJ0eU5hbWVdO1xuICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgcHJvcGVydHlIYW5kbGVyLnByb3BlcnR5ID09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICAgICAgICAgICAgICB2YXIgcmVzdWx0ID0gcHJvcGVydHlIYW5kbGVyLnByb3BlcnR5KG1lbWJlckV4cHJlc3Npb24sIHBhcmVudCwgY29udGV4dCwgc3RhdGUpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGlmKG9iamVjdFJlZmVyZW5jZSAmJiBvYmplY3RSZWZlcmVuY2UuaXNHbG9iYWwoKSkge1xuICAgICAgICAgICAgdmFyIHByb3BlcnR5TGl0ZXJhbCA9ICB7IHR5cGU6IFN5bnRheC5JZGVudGlmaWVyLCBuYW1lOiBnZXROYW1lRm9yR2xvYmFsKG9iamVjdFJlZmVyZW5jZSwgcHJvcGVydHlOYW1lKX07XG4gICAgICAgICAgICBBTk5PKHByb3BlcnR5TGl0ZXJhbCkuY29weShBTk5PKG1lbWJlckV4cHJlc3Npb24pKTtcbiAgICAgICAgICAgIHJldHVybiBwcm9wZXJ0eUxpdGVyYWw7XG4gICAgICAgIH1cblxuICAgIH07XG5cbiAgICB2YXIgZ2V0TmFtZUZvckdsb2JhbCA9IGZ1bmN0aW9uKHJlZmVyZW5jZSwgYmFzZU5hbWUpIHtcbiAgICAgICAgdmFyIGVudHJ5ID0gcmVmZXJlbmNlW2Jhc2VOYW1lXTtcbiAgICAgICAgaWYoZW50cnkpIHtcbiAgICAgICAgICAgIGlmIChlbnRyeS5zb3VyY2UgPT0gU291cmNlcy5WRVJURVgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gXCJmcmFnX1wiICsgYmFzZU5hbWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGJhc2VOYW1lO1xuICAgIH1cblxuICAgIHZhciBoYW5kbGVCaW5hcnlFeHByZXNzaW9uID0gZnVuY3Rpb24gKGJpbmFyeUV4cHJlc3Npb24sIHBhcmVudCwgY2IpIHtcbiAgICAgICAgLy8gSW4gR0wsIHdlIGNhbid0IG1peCB1cCBmbG9hdHMsIGludHMgYW5kIGJvb2xkIGZvciBiaW5hcnkgZXhwcmVzc2lvbnNcbiAgICAgICAgdmFyIGxlZnQgPSBBTk5PKGJpbmFyeUV4cHJlc3Npb24ubGVmdCksXG4gICAgICAgICAgICByaWdodCA9IEFOTk8oYmluYXJ5RXhwcmVzc2lvbi5yaWdodCk7XG5cbiAgICAgICAgaWYgKGxlZnQuaXNOdW1iZXIoKSAmJiByaWdodC5pc0ludCgpKSB7XG4gICAgICAgICAgICBiaW5hcnlFeHByZXNzaW9uLnJpZ2h0ID0gY2FzdFRvRmxvYXQoYmluYXJ5RXhwcmVzc2lvbi5yaWdodCk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAocmlnaHQuaXNOdW1iZXIoKSAmJiBsZWZ0LmlzSW50KCkpIHtcbiAgICAgICAgICAgIGJpbmFyeUV4cHJlc3Npb24ubGVmdCA9IGNhc3RUb0Zsb2F0KGJpbmFyeUV4cHJlc3Npb24ubGVmdCk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoYmluYXJ5RXhwcmVzc2lvbi5vcGVyYXRvciA9PSBcIiVcIikge1xuICAgICAgICAgICAgcmV0dXJuIGhhbmRsZU1vZHVsbyhiaW5hcnlFeHByZXNzaW9uKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gYmluYXJ5RXhwcmVzc2lvbjtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBjYXN0VG9GbG9hdChhc3QpIHtcbiAgICAgICAgdmFyIGV4cCA9IEFOTk8oYXN0KTtcblxuICAgICAgICBpZiAoIWV4cC5pc051bWJlcigpKSB7ICAgLy8gQ2FzdFxuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICB0eXBlOiBTeW50YXguQ2FsbEV4cHJlc3Npb24sXG4gICAgICAgICAgICAgICAgY2FsbGVlOiB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IFN5bnRheC5JZGVudGlmaWVyLFxuICAgICAgICAgICAgICAgICAgICBuYW1lOiBcImZsb2F0XCJcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIGFyZ3VtZW50czogW2FzdF1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gYXN0O1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGNhc3RUb0ludChhc3QsIGZvcmNlKSB7XG4gICAgICAgIHZhciBleHAgPSBBTk5PKGFzdCk7XG5cbiAgICAgICAgaWYgKCFleHAuaXNJbnQoKSB8fCBmb3JjZSkgeyAgIC8vIENhc3RcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgdHlwZTogU3ludGF4LkNhbGxFeHByZXNzaW9uLFxuICAgICAgICAgICAgICAgIGNhbGxlZToge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiBTeW50YXguSWRlbnRpZmllcixcbiAgICAgICAgICAgICAgICAgICAgbmFtZTogXCJpbnRcIlxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgYXJndW1lbnRzOiBbYXN0XVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBhc3Q7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gY2FzdFRvVmVjNChhc3QsIGNvbnRleHQpIHtcbiAgICAgICAgdmFyIGV4cCA9IFR5cGVJbmZvLmNyZWF0ZUZvckNvbnRleHQoYXN0LCBjb250ZXh0KTtcblxuICAgICAgICBpZiAoZXhwLmlzT2ZLaW5kKEtpbmRzLkZMT0FUNCkpXG4gICAgICAgICAgICByZXR1cm4gYXN0O1xuXG4gICAgICAgIGlmIChleHAuaXNPZktpbmQoS2luZHMuRkxPQVQzKSkge1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICB0eXBlOiBTeW50YXguQ2FsbEV4cHJlc3Npb24sXG4gICAgICAgICAgICAgICAgY2FsbGVlOiB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IFN5bnRheC5JZGVudGlmaWVyLFxuICAgICAgICAgICAgICAgICAgICBuYW1lOiBcInZlYzRcIlxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgYXJndW1lbnRzOiBbYXN0LCB7IHR5cGU6IFN5bnRheC5MaXRlcmFsLCB2YWx1ZTogMS4wLCBleHRyYTogeyB0eXBlOiBUeXBlcy5OVU1CRVJ9IH1dXG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiQ2FuJ3QgY2FzdCBmcm9tIFwiICsgZXhwLmdldFR5cGVTdHJpbmcoKSArIFwidG8gdmVjNFwiKTtcbiAgICB9XG5cbiAgICB2YXIgaGFuZGxlTW9kdWxvID0gZnVuY3Rpb24gKGJpbmFyeUV4cHJlc3Npb24pIHtcbiAgICAgICAgYmluYXJ5RXhwcmVzc2lvbi5yaWdodCA9IGNhc3RUb0Zsb2F0KGJpbmFyeUV4cHJlc3Npb24ucmlnaHQpO1xuICAgICAgICBiaW5hcnlFeHByZXNzaW9uLmxlZnQgPSBjYXN0VG9GbG9hdChiaW5hcnlFeHByZXNzaW9uLmxlZnQpO1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgdHlwZTogU3ludGF4LkNhbGxFeHByZXNzaW9uLFxuICAgICAgICAgICAgY2FsbGVlOiB7XG4gICAgICAgICAgICAgICAgdHlwZTogU3ludGF4LklkZW50aWZpZXIsXG4gICAgICAgICAgICAgICAgbmFtZTogXCJtb2RcIlxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGFyZ3VtZW50czogW1xuICAgICAgICAgICAgICAgIGJpbmFyeUV4cHJlc3Npb24ubGVmdCxcbiAgICAgICAgICAgICAgICBiaW5hcnlFeHByZXNzaW9uLnJpZ2h0XG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgZXh0cmE6IHtcbiAgICAgICAgICAgICAgICB0eXBlOiBUeXBlcy5OVU1CRVJcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIHZhciBoYW5kbGVDb25kaXRpb25hbEV4cHJlc3Npb24gPSBmdW5jdGlvbihub2RlLCBzdGF0ZSwgcm9vdCkge1xuICAgICAgICB2YXIgY29uc2VxdWVudCA9IEFOTk8obm9kZS5jb25zZXF1ZW50KTtcbiAgICAgICAgdmFyIGFsdGVybmF0ZSA9IEFOTk8obm9kZS5hbHRlcm5hdGUpO1xuICAgICAgICBpZiAoY29uc2VxdWVudC5jYW5FbGltaW5hdGUoKSkge1xuICAgICAgICAgICAgcmV0dXJuIHJvb3QucmVwbGFjZShub2RlLmFsdGVybmF0ZSwgc3RhdGUpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChhbHRlcm5hdGUuY2FuRWxpbWluYXRlKCkpIHtcbiAgICAgICAgICAgIHJldHVybiByb290LnJlcGxhY2Uobm9kZS5jb25zZXF1ZW50LCBzdGF0ZSk7XG4gICAgICAgIH1cblxuICAgIH1cblxuICAgIHZhciBoYW5kbGVJZlN0YXRlbWVudCA9IGZ1bmN0aW9uIChub2RlKSB7XG4gICAgICAgIHZhciBjb25zZXF1ZW50ID0gQU5OTyhub2RlLmNvbnNlcXVlbnQpO1xuICAgICAgICB2YXIgYWx0ZXJuYXRlID0gbm9kZS5hbHRlcm5hdGUgPyBBTk5PKG5vZGUuYWx0ZXJuYXRlKSA6IG51bGw7XG4gICAgICAgIGlmIChjb25zZXF1ZW50LmNhbkVsaW1pbmF0ZSgpKSB7XG4gICAgICAgICAgICBpZiAoYWx0ZXJuYXRlKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG5vZGUuYWx0ZXJuYXRlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICB0eXBlOiBTeW50YXguRW1wdHlTdGF0ZW1lbnRcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmIChhbHRlcm5hdGUgJiYgYWx0ZXJuYXRlLmNhbkVsaW1pbmF0ZSgpKSB7XG4gICAgICAgICAgICByZXR1cm4gbm9kZS5jb25zZXF1ZW50O1xuICAgICAgICB9XG4gICAgICAgIC8vIFdlIHN0aWxsIGhhdmUgYSByZWFsIGlmIHN0YXRlbWVudFxuICAgICAgIHZhciB0ZXN0ID0gQU5OTyhub2RlLnRlc3QpO1xuICAgICAgIHN3aXRjaCh0ZXN0LmdldFR5cGUoKSkge1xuICAgICAgICAgICBjYXNlIFR5cGVzLklOVDpcbiAgICAgICAgICAgY2FzZSBUeXBlcy5OVU1CRVI6XG4gICAgICAgICAgICAgICBub2RlLnRlc3QgPSB7XG4gICAgICAgICAgICAgICAgICAgdHlwZTogU3ludGF4LkJpbmFyeUV4cHJlc3Npb24sXG4gICAgICAgICAgICAgICAgICAgb3BlcmF0b3I6IFwiIT1cIixcbiAgICAgICAgICAgICAgICAgICBsZWZ0OiBub2RlLnRlc3QsXG4gICAgICAgICAgICAgICAgICAgcmlnaHQ6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogU3ludGF4LkxpdGVyYWwsXG4gICAgICAgICAgICAgICAgICAgICAgIHZhbHVlOiAwLFxuICAgICAgICAgICAgICAgICAgICAgICBleHRyYToge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogdGVzdC5nZXRUeXBlKClcbiAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgIH1cbiAgICAgICB9XG5cblxuICAgIH07XG5cbiAgICB2YXIgaGFuZGxlTG9naWNhbEV4cHJlc3Npb24gPSBmdW5jdGlvbiAobm9kZSwgcm9vdCwgc3RhdGUpIHtcbiAgICAgICAgdmFyIGxlZnQgPSBBTk5PKG5vZGUubGVmdCk7XG4gICAgICAgIHZhciByaWdodCA9IEFOTk8obm9kZS5yaWdodCk7XG4gICAgICAgIGlmIChsZWZ0LmNhbkVsaW1pbmF0ZSgpKVxuICAgICAgICAgICAgcmV0dXJuIHJvb3QucmVwbGFjZShub2RlLnJpZ2h0LCBzdGF0ZSk7XG4gICAgICAgIGlmIChyaWdodC5jYW5FbGltaW5hdGUoKSlcbiAgICAgICAgICAgIHJldHVybiByb290LnJlcGxhY2Uobm9kZS5sZWZ0LCBzdGF0ZSk7XG4gICAgfVxuXG4gICAgLy8gRXhwb3J0c1xuICAgIG5zLkdMQVNUVHJhbnNmb3JtZXIgPSBHTEFTVFRyYW5zZm9ybWVyO1xuXG5cbn0oZXhwb3J0cykpO1xuIiwiKGZ1bmN0aW9uIChucykge1xuICAgIHZhciBCYXNlID0gcmVxdWlyZShcIi4vYmFzZS9pbmRleC5qc1wiKTtcbiAgICAvKipcbiAgICAgKiBAZW51bSB7c3RyaW5nfVxuICAgICAqL1xuICAgIG5zLlRZUEVTID0ge1xuICAgICAgICBBTlk6IFwiYW55XCIsXG4gICAgICAgIElOVDogXCJpbnRcIixcbiAgICAgICAgTlVNQkVSOiBcIm51bWJlclwiLFxuICAgICAgICBCT09MRUFOOiBcImJvb2xlYW5cIixcbiAgICAgICAgT0JKRUNUOiBcIm9iamVjdFwiLFxuICAgICAgICBBUlJBWTogXCJhcnJheVwiLFxuICAgICAgICBOVUxMOiBcIm51bGxcIixcbiAgICAgICAgVU5ERUZJTkVEOiBcInVuZGVmaW5lZFwiLFxuICAgICAgICBGVU5DVElPTjogXCJmdW5jdGlvblwiLFxuICAgICAgICBTVFJJTkc6IFwic3RyaW5nXCJcbiAgICB9XG5cbiAgICBucy5PQkpFQ1RfS0lORFMgPSB7XG4gICAgICAgIEFOWTogXCJhbnlcIixcbiAgICAgICAgRkxPQVQyOiBcImZsb2F0MlwiLCAvLyB2aXJ0dWFsIGtpbmRzXG4gICAgICAgIEZMT0FUMzogXCJmbG9hdDNcIiwgLy8gdmlydHVhbCBraW5kc1xuICAgICAgICBGTE9BVDQ6IFwiZmxvYXQ0XCIsIC8vIHZpcnR1YWwga2luZHNcbiAgICAgICAgTk9STUFMOiBcIm5vcm1hbFwiLFxuICAgICAgICBNQVRSSVg0OiBcIm1hdHJpeDRcIixcbiAgICAgICAgTUFUUklYMzogXCJtYXRyaXgzXCIsXG4gICAgICAgIFRFWFRVUkU6IFwidGV4dHVyZVwiLFxuICAgICAgICBDT0xPUl9DTE9TVVJFOiBcImNvbG9yX2Nsb3N1cmVcIlxuICAgIH1cblxuICAgIG5zLlNPVVJDRVMgPSB7XG4gICAgICAgIFVOSUZPUk06IFwidW5pZm9ybVwiLFxuICAgICAgICBWRVJURVg6IFwidmVydGV4XCIsXG4gICAgICAgIENPTlNUQU5UOiBcImNvbnN0YW50XCJcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBmaWxsVmVjdG9yKGRlc3QsIHZlY1NpemUsIGFyZ3VtZW50cyl7XG4gICAgICAgIHZhciBjb2xvciA9IGZhbHNlO1xuICAgICAgICBpZihhcmd1bWVudHMubGVuZ3RoID09IDAgKXtcbiAgICAgICAgICAgIGZvcih2YXIgaSA9IDA7IGkgPCB2ZWNTaXplOyArK2kpXG4gICAgICAgICAgICAgICAgZGVzdFtpXSA9IDA7XG4gICAgICAgICAgICBpZihjb2xvcikgZGVzdFszXSA9IDE7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgaWYoYXJndW1lbnRzLmxlbmd0aCA9PSAxICYmICFpc05hTihhcmd1bWVudHNbMF0pKXtcbiAgICAgICAgICAgIGZvcih2YXIgaSA9IDA7IGkgPCB2ZWNTaXplOyArK2kpXG4gICAgICAgICAgICAgICAgZGVzdFtpXSA9IGFyZ3VtZW50c1swXTtcbiAgICAgICAgICAgIGlmKGNvbG9yKSBkZXN0WzNdID0gMTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBpZHggPSAwO1xuICAgICAgICBmb3IodmFyIGkgPSAwOyBpZHggPCB2ZWNTaXplICYmIGkgPCBhcmd1bWVudHMubGVuZ3RoOyArK2kpe1xuICAgICAgICAgICAgdmFyIGFyZz0gYXJndW1lbnRzW2ldLCBjbnQgPSAxO1xuICAgICAgICAgICAgaWYoYXJnIGluc3RhbmNlb2YgVmVjMikgY250ID0gMjtcbiAgICAgICAgICAgIGVsc2UgaWYoYXJnIGluc3RhbmNlb2YgVmVjMykgY250ID0gMztcbiAgICAgICAgICAgIGVsc2UgaWYoYXJnIGluc3RhbmNlb2YgVmVjNCkgY250ID0gNDtcblxuICAgICAgICAgICAgaWYoY250ID09IDEpXG4gICAgICAgICAgICAgICAgZGVzdFtpZHgrK10gPSBhcmcgfHwgMDtcbiAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgICBmb3IodmFyIGogPSAwOyBpZHggPCB2ZWNTaXplICYmIGogPCBjbnQ7ICsrail7XG4gICAgICAgICAgICAgICAgICAgIGRlc3RbaWR4KytdID0gYXJnW2pdO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZihpIDwgYXJndW1lbnRzLmxlbmd0aClcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIlRvbyBtYW55IGFyZ3VtZW50cyBmb3IgXCIgKyAoY29sb3IgPyBcIkNvbG9yXCIgOiBcIlZlY1wiICsgdmVjU2l6ZSkgKyBcIi5cIik7XG4gICAgICAgIGlmKGlkeCA8IHZlY1NpemUpe1xuICAgICAgICAgICAgaWYoY29sb3IgJiYgKGlkeCA9PSAzKSlcbiAgICAgICAgICAgICAgICBkZXN0WzNdID0gMTtcbiAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJOb3QgZW5vdWdoIGFyZ3VtZW50cyBmb3IgXCIgKyAoY29sb3IgPyBcIkNvbG9yXCIgOiBcIlZlY1wiICsgdmVjU2l6ZSkgKyBcIi5cIik7XG4gICAgICAgIH1cbiAgICB9XG5cblxuICAgIC8vIFRPRE86IEdlbmVyYXRlIFN3aXp6bGUgZnVuY3Rpb25zXG4gICAgdmFyIFNXSVpaTEVfS0VZUyA9IFtcbiAgICAgICAgWyd4JywneScsJ3onLCd3J10sXG4gICAgICAgIFsncicsICdnJywgJ2InLCAnYSddLFxuICAgICAgICBbJ3MnLCAndCcsICdwJywgJ3EnXVxuICAgIF1cblxuICAgIGZ1bmN0aW9uIGFkZFN3aXp6bGVzKHByb3RvdHlwZSwgdmVjQ291bnQsIG1hc2tDb3VudCwgd2l0aFNldHRlcil7XG4gICAgICAgIHZhciBtYXggPSBNYXRoLnBvdyh2ZWNDb3VudCwgbWFza0NvdW50KTtcbiAgICAgICAgZm9yKHZhciBpID0gMDsgaSA8IG1heDsgKytpKXtcbiAgICAgICAgICAgIHZhciBpbmRpY2VzID0gW10sIGtleXMgPSBbXCJcIiwgXCJcIiwgXCJcIl0sIHZhbCA9IGksIGFyZ3MgPSBbXTtcbiAgICAgICAgICAgIHZhciBzZXR0ZXJBcmdzID0gW10sIGdlbmVyYXRlU2V0dGVyID0gd2l0aFNldHRlcjtcbiAgICAgICAgICAgIGZvcih2YXIgaiA9IDA7IGogPCBtYXNrQ291bnQ7ICsrail7XG4gICAgICAgICAgICAgICAgdmFyIGlkeCA9IHZhbCAlIHZlY0NvdW50O1xuICAgICAgICAgICAgICAgIGluZGljZXMucHVzaChpZHgpO1xuICAgICAgICAgICAgICAgIGlmKGdlbmVyYXRlU2V0dGVyKXtcbiAgICAgICAgICAgICAgICAgICAgaWYoc2V0dGVyQXJnc1tpZHhdID09PSB1bmRlZmluZWQpXG4gICAgICAgICAgICAgICAgICAgICAgICBzZXR0ZXJBcmdzW2lkeF0gPSAnb3RoZXJbJyArIGogKyAnXSc7XG4gICAgICAgICAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgICAgICAgICAgIGdlbmVyYXRlU2V0dGVyID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGZvcih2YXIgayA9IDA7IGsgPCBTV0laWkxFX0tFWVMubGVuZ3RoOyArK2spe1xuICAgICAgICAgICAgICAgICAgICBrZXlzW2tdICs9IFNXSVpaTEVfS0VZU1trXVtpZHhdO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB2YWwgPSBNYXRoLmZsb29yKHZhbCAvIHZlY0NvdW50KTtcbiAgICAgICAgICAgICAgICBhcmdzLnB1c2goJ3RoaXNbJysgaWR4ICsgJ10nICk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHZhciBmdW5jQXJncyA9IFwiXCI7XG4gICAgICAgICAgICB2YXIgYm9keSA9ICcgIHJldHVybiBnZXRWZWMnICsgbWFza0NvdW50ICsgJy5hcHBseShudWxsLCBhcmd1bWVudHMpO1xcbic7XG4gICAgICAgICAgICBpZihnZW5lcmF0ZVNldHRlcil7XG4gICAgICAgICAgICAgICAgZm9yKHZhciBqID0gMDsgaiA8IHZlY0NvdW50OyArK2ope1xuICAgICAgICAgICAgICAgICAgICBpZihzZXR0ZXJBcmdzW2pdID09PSB1bmRlZmluZWQpXG4gICAgICAgICAgICAgICAgICAgICAgICBzZXR0ZXJBcmdzW2pdID0gJ3RoaXNbJyArIGogKyAnXSc7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHN3aXRjaChtYXNrQ291bnQpe1xuICAgICAgICAgICAgICAgICAgICBjYXNlIDIgOiBmdW5jQXJncyA9IFwieCwgeVwiOyBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAzIDogZnVuY0FyZ3MgPSBcIngsIHksIHpcIjsgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgNCA6IGZ1bmNBcmdzID0gXCJ4LCB5LCB6LCB3XCI7IGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGJvZHkgPSBcIiAgaWYoYXJndW1lbnRzLmxlbmd0aCA9PSAwKVxcbiAgXCIgKyBib2R5ICtcbiAgICAgICAgICAgICAgICAgICAgICAgXCIgIGVsc2V7XFxuXCIgK1xuICAgICAgICAgICAgICAgICAgICAgICBcIiAgICB2YXIgb3RoZXI9Z2V0VmVjXCIgKyBtYXNrQ291bnQgKyAnLmFwcGx5KG51bGwsIGFyZ3VtZW50cyk7XFxuJyArXG4gICAgICAgICAgICAgICAgICAgICAgIFwiICAgIHJldHVybiBnZXRWZWNcIiArIHZlY0NvdW50ICsgJygnICsgc2V0dGVyQXJncy5qb2luKFwiLCBcIikgKyAnKTtcXG4nICtcbiAgICAgICAgICAgICAgICAgICAgICAgXCIgIH1cXG5cIjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZhciBmdW5jdGlvbkNvZGUgPSAnZnVuY3Rpb24oJyArIGZ1bmNBcmdzICsgICcpe1xcbicgKyBib2R5ICsgJ30nO1xuICAgICAgICAgICAgdHJ5e1xuICAgICAgICAgICAgICAgIHZhciByZXN1bHQgPSBldmFsKFwiKFwiICsgZnVuY3Rpb25Db2RlICsgXCIpXCIpO1xuICAgICAgICAgICAgICAgIGZvcih2YXIgaiA9IDA7IGogPCBrZXlzLmxlbmd0aDsgKytqKVxuICAgICAgICAgICAgICAgICAgICBwcm90b3R5cGVba2V5c1tqXV0gPSByZXN1bHQ7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjYXRjaChlKXtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKFwiRXJyb3IgQ29tcGlsaW5nIENvZGU6XFxuXCIgKyBmdW5jdGlvbkNvZGUpO1xuICAgICAgICAgICAgICAgIHRocm93IGU7XG5cbiAgICAgICAgICAgIH1cblxuXG4gICAgICAgIH1cbiAgICB9XG5cblxuICAgIC8qKlxuICAgICAqIFRoZSB2aXJ0dWFsIFZlYzIgdHlwZVxuICAgICAqIEBjb25zdHJ1Y3RvclxuICAgICAqL1xuICAgICB2YXIgVmVjMiA9IGZ1bmN0aW9uKHgsIHkpe1xuICAgICAgICBmaWxsVmVjdG9yKHRoaXMsIDIsIGFyZ3VtZW50cyk7XG4gICAgIH1cblxuXG4gICAgIGZ1bmN0aW9uIGdldFZlYzIoKXtcbiAgICAgICAgaWYoYXJndW1lbnRzWzBdIGluc3RhbmNlb2YgVmVjMilcbiAgICAgICAgICAgIHJldHVybiBhcmd1bWVudHNbMF07XG4gICAgICAgIHZhciBvYmogPSAgbmV3IFZlYzIoKTtcbiAgICAgICAgVmVjMi5hcHBseShvYmosIGFyZ3VtZW50cyk7XG4gICAgICAgIHJldHVybiBvYmo7XG4gICAgIH1cblxuICAgICBWZWMyLnByb3RvdHlwZS5hZGQgPSBmdW5jdGlvbih4LCB5KXsgLy8gMCBhcmd1bWVudHMgPT4gaWRlbnRpdHkgb3IgZXJyb3I/XG4gICAgICAgIHZhciBhZGQgPSBnZXRWZWMyLmFwcGx5KG51bGwsIGFyZ3VtZW50cyk7XG4gICAgICAgIHJldHVybiBuZXcgVmVjMih0aGlzWzBdICsgYWRkWzBdLCB0aGlzWzFdICsgYWRkWzFdKTtcbiAgICAgfVxuICAgICBWZWMyLnByb3RvdHlwZS5zdWIgPSBmdW5jdGlvbih4LCB5KXtcbiAgICAgICAgdmFyIHN1YiA9IGdldFZlYzIuYXBwbHkobnVsbCwgYXJndW1lbnRzKTtcbiAgICAgICAgcmV0dXJuIG5ldyBWZWMyKHRoaXNbMF0gLSBzdWJbMF0sIHRoaXNbMV0gLSBzdWJbMV0pO1xuICAgICB9XG4gICAgIFZlYzIucHJvdG90eXBlLm11bCA9IGZ1bmN0aW9uKHgsIHkpe1xuICAgICAgICB2YXIgb3RoZXIgPSBnZXRWZWMyLmFwcGx5KG51bGwsIGFyZ3VtZW50cyk7XG4gICAgICAgIHJldHVybiBuZXcgVmVjMih0aGlzWzBdICogb3RoZXJbMF0sIHRoaXNbMV0gKiBvdGhlclsxXSk7XG4gICAgIH1cbiAgICAgVmVjMi5wcm90b3R5cGUuZGl2ID0gZnVuY3Rpb24oeCwgeSl7XG4gICAgICAgIHZhciBvdGhlciA9IGdldFZlYzIuYXBwbHkobnVsbCwgYXJndW1lbnRzKTtcbiAgICAgICAgcmV0dXJuIG5ldyBWZWMyKHRoaXNbMF0gLyBvdGhlclswXSwgdGhpc1sxXSAvIG90aGVyWzFdKTtcbiAgICAgfVxuICAgICBWZWMyLnByb3RvdHlwZS5tb2QgPSBmdW5jdGlvbih4LCB5KXtcbiAgICAgICAgdmFyIG90aGVyID0gZ2V0VmVjMi5hcHBseShudWxsLCBhcmd1bWVudHMpO1xuICAgICAgICByZXR1cm4gbmV3IFZlYzIodGhpc1swXSAlIG90aGVyWzBdLCB0aGlzWzFdICUgb3RoZXJbMV0pO1xuICAgICB9XG4gICAgIFZlYzIucHJvdG90eXBlLmRvdCA9IGZ1bmN0aW9uKHgsIHkpe1xuICAgICAgICB2YXIgb3RoZXIgPSBnZXRWZWMyLmFwcGx5KG51bGwsIGFyZ3VtZW50cyk7XG4gICAgICAgIHJldHVybiB0aGlzWzBdKm90aGVyWzBdICsgdGhpc1sxXSpvdGhlclsxXTtcbiAgICAgfVxuICAgICBWZWMyLnByb3RvdHlwZS5hYnMgPSBmdW5jdGlvbigpe1xuICAgICAgICByZXR1cm4gbmV3IFZlYzIoTWF0aC5hYnModGhpc1swXSksIE1hdGguYWJzKHRoaXNbMV0pKTtcbiAgICAgfVxuICAgICBWZWMyLnByb3RvdHlwZS5sZW5ndGggPSBmdW5jdGlvbihsZW5ndGgpe1xuICAgICAgICBpZihhcmd1bWVudHMubGVuZ3RoID09IDApXG4gICAgICAgICAgICByZXR1cm4gTWF0aC5zcXJ0KHRoaXMuZG90KHRoaXMpKTtcbiAgICAgICAgZWxzZXtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLm11bChsZW5ndGggLyB0aGlzLmxlbmd0aCgpKTtcbiAgICAgICAgfVxuICAgICB9XG4gICAgIFZlYzIucHJvdG90eXBlLm5vcm1hbGl6ZSA9IGZ1bmN0aW9uKCl7XG4gICAgICAgIHJldHVybiB0aGlzLmxlbmd0aCgxKTtcbiAgICAgfVxuXG4gICAgIFZlYzIucHJvdG90eXBlLnh5ID0gVmVjMi5wcm90b3R5cGUucmcgPSBWZWMyLnByb3RvdHlwZS5zdCA9IGZ1bmN0aW9uKHgseSl7XG4gICAgICAgIGlmKGFyZ3VtZW50cy5sZW5ndGggPT0gMClcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICBlbHNle1xuICAgICAgICAgICAgcmV0dXJuIGdldFZlYzIuYXBwbHkobnVsbCwgYXJndW1lbnRzKTtcbiAgICAgICAgfVxuICAgICB9XG4gICAgIFZlYzIucHJvdG90eXBlLnggPSBWZWMyLnByb3RvdHlwZS5yID0gVmVjMi5wcm90b3R5cGUucyA9IGZ1bmN0aW9uKHgpe1xuICAgICAgICBpZihhcmd1bWVudHMubGVuZ3RoID09IDApXG4gICAgICAgICAgICByZXR1cm4gdGhpc1swXTtcbiAgICAgICAgZWxzZVxuICAgICAgICAgICAgcmV0dXJuIHRoaXMueHkoeCwgdGhpc1sxXSk7XG4gICAgIH1cbiAgICAgVmVjMi5wcm90b3R5cGUueSA9IFZlYzIucHJvdG90eXBlLmcgPSBWZWMyLnByb3RvdHlwZS50ID0gZnVuY3Rpb24oeSl7XG4gICAgICAgIGlmKGFyZ3VtZW50cy5sZW5ndGggPT0gMClcbiAgICAgICAgICAgIHJldHVybiB0aGlzWzFdO1xuICAgICAgICBlbHNlXG4gICAgICAgICAgICByZXR1cm4gdGhpcy54eSh0aGlzWzBdLCB5KTtcbiAgICAgfVxuXG4gICAgIGFkZFN3aXp6bGVzKFZlYzIucHJvdG90eXBlLCAyLCAyLCB0cnVlKTtcbiAgICAgYWRkU3dpenpsZXMoVmVjMi5wcm90b3R5cGUsIDIsIDMsIGZhbHNlKTtcbiAgICAgYWRkU3dpenpsZXMoVmVjMi5wcm90b3R5cGUsIDIsIDQsIGZhbHNlKTtcblxuXG5cbiAgICAgLyoqXG4gICAgICAqIFRoZSB2aXJ0dWFsIFZlYzMgdHlwZVxuICAgICAgKiBAY29uc3RydWN0b3JcbiAgICAgICovXG4gICAgIHZhciBWZWMzID0gZnVuY3Rpb24oeCwgeSwgeiApe1xuICAgICAgICBmaWxsVmVjdG9yKHRoaXMsIDMsIGFyZ3VtZW50cyk7XG4gICAgIH1cblxuICAgICBmdW5jdGlvbiBnZXRWZWMzKCl7XG4gICAgICAgIGlmKGFyZ3VtZW50c1swXSBpbnN0YW5jZW9mIFZlYzMpXG4gICAgICAgICAgICByZXR1cm4gYXJndW1lbnRzWzBdO1xuICAgICAgICB2YXIgb2JqID0gbmV3IFZlYzMoKTtcbiAgICAgICAgVmVjMy5hcHBseShvYmosIGFyZ3VtZW50cyk7XG4gICAgICAgIHJldHVybiBvYmo7XG4gICAgIH1cblxuICAgICBWZWMzLnByb3RvdHlwZS5hZGQgPSBmdW5jdGlvbih4LCB5LCB6KXtcbiAgICAgICAgdmFyIG90aGVyID0gZ2V0VmVjMy5hcHBseShudWxsLCBhcmd1bWVudHMpO1xuICAgICAgICByZXR1cm4gbmV3IFZlYzModGhpc1swXSArIG90aGVyWzBdLCB0aGlzWzFdICsgb3RoZXJbMV0sIHRoaXNbMl0gKyBvdGhlclsyXSk7XG4gICAgIH1cbiAgICAgVmVjMy5wcm90b3R5cGUuc3ViID0gZnVuY3Rpb24oeCwgeSwgeil7XG4gICAgICAgIHZhciBvdGhlciA9IGdldFZlYzMuYXBwbHkobnVsbCwgYXJndW1lbnRzKTtcbiAgICAgICAgcmV0dXJuIG5ldyBWZWMzKHRoaXNbMF0gLSBvdGhlclswXSwgdGhpc1sxXSAtIG90aGVyWzFdLCB0aGlzWzJdIC0gb3RoZXJbMl0pO1xuICAgICB9XG4gICAgIFZlYzMucHJvdG90eXBlLm11bCA9IGZ1bmN0aW9uKHgsIHksIHope1xuICAgICAgICB2YXIgb3RoZXIgPSBnZXRWZWMzLmFwcGx5KG51bGwsIGFyZ3VtZW50cyk7XG4gICAgICAgIHJldHVybiBuZXcgVmVjMyh0aGlzWzBdICogb3RoZXJbMF0sIHRoaXNbMV0gKiBvdGhlclsxXSwgdGhpc1syXSAqIG90aGVyWzJdKTtcbiAgICAgfVxuICAgICBWZWMzLnByb3RvdHlwZS5kaXYgPSBmdW5jdGlvbih4LCB5LCB6KXtcbiAgICAgICAgdmFyIG90aGVyID0gZ2V0VmVjMy5hcHBseShudWxsLCBhcmd1bWVudHMpO1xuICAgICAgICByZXR1cm4gbmV3IFZlYzModGhpc1swXSAvIG90aGVyWzBdLCB0aGlzWzFdIC8gb3RoZXJbMV0sIHRoaXNbMl0gLyBvdGhlclsyXSk7XG4gICAgIH1cbiAgICAgVmVjMy5wcm90b3R5cGUubW9kID0gZnVuY3Rpb24oeCwgeSwgeil7XG4gICAgICAgIHZhciBvdGhlciA9IGdldFZlYzMuYXBwbHkobnVsbCwgYXJndW1lbnRzKTtcbiAgICAgICAgcmV0dXJuIG5ldyBWZWMzKHRoaXNbMF0gJSBvdGhlclswXSwgdGhpc1sxXSAlIG90aGVyWzFdLCB0aGlzWzJdICUgb3RoZXJbMl0pO1xuICAgICB9XG4gICAgIFZlYzMucHJvdG90eXBlLmFicyA9IGZ1bmN0aW9uKCl7XG4gICAgICAgIHJldHVybiBuZXcgVmVjMyhNYXRoLmFicyh0aGlzWzBdKSwgTWF0aC5hYnModGhpc1sxXSksIE1hdGguYWJzKHRoaXNbMl0pKTtcbiAgICAgfVxuICAgICBWZWMzLnByb3RvdHlwZS5kb3QgPSBmdW5jdGlvbih4LCB5LCB6KXtcbiAgICAgICAgdmFyIG90aGVyID0gZ2V0VmVjMy5hcHBseShudWxsLCBhcmd1bWVudHMpO1xuICAgICAgICByZXR1cm4gdGhpc1swXSpvdGhlclswXSArIHRoaXNbMV0qb3RoZXJbMV0gKyB0aGlzWzJdKm90aGVyWzJdO1xuICAgICB9XG4gICAgIFZlYzMucHJvdG90eXBlLmNyb3NzID0gZnVuY3Rpb24oeCwgeSwgeil7XG4gICAgICAgIHZhciBvdGhlciA9IGdldFZlYzMuYXBwbHkobnVsbCwgYXJndW1lbnRzKTtcbiAgICAgICAgdmFyIHggPSB0aGlzWzFdKm90aGVyWzJdIC0gb3RoZXJbMV0qdGhpc1syXTtcbiAgICAgICAgdmFyIHkgPSB0aGlzWzJdKm90aGVyWzBdIC0gb3RoZXJbMl0qdGhpc1swXTtcbiAgICAgICAgdmFyIHogPSB0aGlzWzBdKm90aGVyWzFdIC0gb3RoZXJbMF0qdGhpc1sxXTtcbiAgICAgICAgcmV0dXJuIG5ldyBWZWMzKHgsIHksIHopO1xuICAgICB9XG4gICAgIFZlYzMucHJvdG90eXBlLmxlbmd0aCA9IGZ1bmN0aW9uKGxlbmd0aCl7XG4gICAgICAgIGlmKGFyZ3VtZW50cy5sZW5ndGggPT0gMClcbiAgICAgICAgICAgIHJldHVybiBNYXRoLnNxcnQodGhpcy5kb3QodGhpcykpO1xuICAgICAgICBlbHNle1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMubXVsKGxlbmd0aCAvIHRoaXMubGVuZ3RoKCkpO1xuICAgICAgICB9XG4gICAgIH1cbiAgICAgVmVjMy5wcm90b3R5cGUubm9ybWFsaXplID0gZnVuY3Rpb24oKXtcbiAgICAgICAgcmV0dXJuIHRoaXMubGVuZ3RoKDEpO1xuICAgICB9XG4gICAgIFZlYzMucHJvdG90eXBlLnh5eiA9IFZlYzMucHJvdG90eXBlLnJnYiA9IFZlYzMucHJvdG90eXBlLnN0cCA9IGZ1bmN0aW9uKHgsIHksIHope1xuICAgICAgICBpZihhcmd1bWVudHMubGVuZ3RoID09IDApXG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgZWxzZVxuICAgICAgICAgICAgcmV0dXJuIG5ldyBWZWMzKHgsIHksIHopO1xuICAgICB9XG4gICAgIFZlYzMucHJvdG90eXBlLnggPSBWZWMzLnByb3RvdHlwZS5yID0gVmVjMy5wcm90b3R5cGUucyA9IGZ1bmN0aW9uKHgpe1xuICAgICAgICBpZihhcmd1bWVudHMubGVuZ3RoID09IDApXG4gICAgICAgICAgICByZXR1cm4gdGhpc1swXTtcbiAgICAgICAgZWxzZVxuICAgICAgICAgICAgcmV0dXJuIG5ldyBWZWMzKHgsIHRoaXNbMV0sIHRoaXNbMl0pO1xuICAgICB9XG4gICAgIFZlYzMucHJvdG90eXBlLnkgPSBWZWMzLnByb3RvdHlwZS5nID0gVmVjMy5wcm90b3R5cGUudCA9IGZ1bmN0aW9uKHkpe1xuICAgICAgICBpZihhcmd1bWVudHMubGVuZ3RoID09IDApXG4gICAgICAgICAgICByZXR1cm4gdGhpc1sxXTtcbiAgICAgICAgZWxzZVxuICAgICAgICAgICAgcmV0dXJuIG5ldyBWZWMzKHRoaXNbMF0sIHksIHRoaXNbMl0pO1xuICAgICB9XG4gICAgIFZlYzMucHJvdG90eXBlLnogPSBWZWMzLnByb3RvdHlwZS5iID0gVmVjMy5wcm90b3R5cGUucCA9IGZ1bmN0aW9uKHope1xuICAgICAgICBpZihhcmd1bWVudHMubGVuZ3RoID09IDApXG4gICAgICAgICAgICByZXR1cm4gdGhpc1syXTtcbiAgICAgICAgZWxzZVxuICAgICAgICAgICAgcmV0dXJuIG5ldyBWZWMzKHRoaXNbMF0sIHRoaXNbMV0sIHopO1xuICAgICB9XG4gICAgIGFkZFN3aXp6bGVzKFZlYzMucHJvdG90eXBlLCAzLCAyLCB0cnVlKTtcbiAgICAgYWRkU3dpenpsZXMoVmVjMy5wcm90b3R5cGUsIDMsIDMsIHRydWUpO1xuICAgICBhZGRTd2l6emxlcyhWZWMzLnByb3RvdHlwZSwgMywgNCwgZmFsc2UpO1xuXG5cbiAgICAgLyoqXG4gICAgICAqIFRoZSB2aXJ0dWFsIFZlYzQgdHlwZVxuICAgICAgKiBAY29uc3RydWN0b3JcbiAgICAgICovXG4gICAgIHZhciBWZWM0ID0gZnVuY3Rpb24oeCwgeSwgeiwgdyApe1xuICAgICAgICBmaWxsVmVjdG9yKHRoaXMsIDQsIGFyZ3VtZW50cylcbiAgICAgfVxuXG4gICAgIGZ1bmN0aW9uIGdldFZlYzQoKXtcbiAgICAgICAgaWYoYXJndW1lbnRzWzBdIGluc3RhbmNlb2YgVmVjNClcbiAgICAgICAgICAgIHJldHVybiBhcmd1bWVudHNbMF07XG4gICAgICAgIHZhciBvYmogPSBuZXcgVmVjNCgpO1xuICAgICAgICBWZWM0LmFwcGx5KG9iaiwgYXJndW1lbnRzKTtcbiAgICAgICAgcmV0dXJuIG9iajtcbiAgICAgfVxuXG4gICAgIFZlYzQucHJvdG90eXBlLmFkZCA9IGZ1bmN0aW9uKHgsIHksIHosIHcpe1xuICAgICAgICB2YXIgb3RoZXIgPSBnZXRWZWM0LmFwcGx5KG51bGwsIGFyZ3VtZW50cyk7XG4gICAgICAgIHJldHVybiBuZXcgVmVjNCh0aGlzWzBdICsgb3RoZXJbMF0sIHRoaXNbMV0gKyBvdGhlclsxXSwgdGhpc1syXSArIG90aGVyWzJdLCB0aGlzWzNdICsgb3RoZXJbM10pO1xuICAgICB9XG4gICAgIFZlYzQucHJvdG90eXBlLnN1YiA9IGZ1bmN0aW9uKHgsIHksIHosIHcpe1xuICAgICAgICB2YXIgb3RoZXIgPSBnZXRWZWM0LmFwcGx5KG51bGwsIGFyZ3VtZW50cyk7XG4gICAgICAgIHJldHVybiBuZXcgVmVjNCh0aGlzWzBdIC0gb3RoZXJbMF0sIHRoaXNbMV0gLSBvdGhlclsxXSwgdGhpc1syXSAtIG90aGVyWzJdLCB0aGlzWzNdIC0gb3RoZXJbM10pO1xuICAgICB9XG4gICAgIFZlYzQucHJvdG90eXBlLm11bCA9IGZ1bmN0aW9uKHgsIHksIHosIHcpe1xuICAgICAgICB2YXIgb3RoZXIgPSBnZXRWZWM0LmFwcGx5KG51bGwsIGFyZ3VtZW50cyk7XG4gICAgICAgIHJldHVybiBuZXcgVmVjNCh0aGlzWzBdICogb3RoZXJbMF0sIHRoaXNbMV0gKiBvdGhlclsxXSwgdGhpc1syXSAqIG90aGVyWzJdLCB0aGlzWzNdICogb3RoZXJbM10pO1xuICAgICB9XG4gICAgIFZlYzQucHJvdG90eXBlLmRpdiA9IGZ1bmN0aW9uKHgsIHksIHosIHcpe1xuICAgICAgICB2YXIgb3RoZXIgPSBnZXRWZWM0LmFwcGx5KG51bGwsIGFyZ3VtZW50cyk7XG4gICAgICAgIHJldHVybiBuZXcgVmVjNCh0aGlzWzBdIC8gb3RoZXJbMF0sIHRoaXNbMV0gLyBvdGhlclsxXSwgdGhpc1syXSAvIG90aGVyWzJdLCB0aGlzWzNdIC8gb3RoZXJbM10pO1xuICAgICB9XG4gICAgIFZlYzQucHJvdG90eXBlLm1vZCA9IGZ1bmN0aW9uKHgsIHksIHosIHcpe1xuICAgICAgICB2YXIgb3RoZXIgPSBnZXRWZWM0LmFwcGx5KG51bGwsIGFyZ3VtZW50cyk7XG4gICAgICAgIHJldHVybiBuZXcgVmVjNCh0aGlzWzBdICUgb3RoZXJbMF0sIHRoaXNbMV0gJSBvdGhlclsxXSwgdGhpc1syXSAlIG90aGVyWzJdLCB0aGlzWzNdICUgb3RoZXJbM10pO1xuICAgICB9XG4gICAgIFZlYzQucHJvdG90eXBlLmFicyA9IGZ1bmN0aW9uKCl7XG4gICAgICAgIHJldHVybiBuZXcgVmVjNChNYXRoLmFicyh0aGlzWzBdKSwgTWF0aC5hYnModGhpc1sxXSksIE1hdGguYWJzKHRoaXNbMl0pLCBNYXRoLmFicyh0aGlzWzNdKSk7XG4gICAgIH1cbiAgICAgVmVjNC5wcm90b3R5cGUuZG90ID0gZnVuY3Rpb24oeCwgeSwgeiwgdyl7XG4gICAgICAgIHZhciBvdGhlciA9IGdldFZlYzQuYXBwbHkobnVsbCwgYXJndW1lbnRzKTtcbiAgICAgICAgcmV0dXJuIHRoaXNbMF0qb3RoZXJbMF0gKyB0aGlzWzFdKm90aGVyWzFdICsgdGhpc1syXSpvdGhlclsyXSArIHRoaXNbM10qb3RoZXJbM107XG4gICAgIH1cbiAgICAgVmVjNC5wcm90b3R5cGUubGVuZ3RoID0gZnVuY3Rpb24obGVuZ3RoKXtcbiAgICAgICAgaWYoYXJndW1lbnRzLmxlbmd0aCA9PSAwKVxuICAgICAgICAgICAgcmV0dXJuIE1hdGguc3FydCh0aGlzLmRvdCh0aGlzKSk7XG4gICAgICAgIGVsc2V7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5tdWwobGVuZ3RoIC8gdGhpcy5sZW5ndGgoKSk7XG4gICAgICAgIH1cbiAgICAgfVxuICAgICBWZWM0LnByb3RvdHlwZS5ub3JtYWxpemUgPSBmdW5jdGlvbigpe1xuICAgICAgICByZXR1cm4gdGhpcy5sZW5ndGgoMSk7XG4gICAgIH1cbiAgICAgVmVjNC5wcm90b3R5cGUueHl6dyA9IFZlYzQucHJvdG90eXBlLnJnYmEgPSBWZWM0LnByb3RvdHlwZS5zdHBxID0gZnVuY3Rpb24oeCwgeSwgeiwgdyl7XG4gICAgICAgIGlmKGFyZ3VtZW50cy5sZW5ndGggPT0gMClcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICBlbHNlXG4gICAgICAgICAgICByZXR1cm4gZ2V0VmVjNC5hcHBseShudWxsLCBhcmd1bWVudHMpO1xuICAgICB9XG4gICAgIFZlYzQucHJvdG90eXBlLnggPSBWZWM0LnByb3RvdHlwZS5yID0gVmVjNC5wcm90b3R5cGUucyA9IGZ1bmN0aW9uKHgpe1xuICAgICAgICBpZihhcmd1bWVudHMubGVuZ3RoID09IDApXG4gICAgICAgICAgICByZXR1cm4gdGhpc1swXTtcbiAgICAgICAgZWxzZVxuICAgICAgICAgICAgcmV0dXJuIGdldFZlYzQoeCwgdGhpc1sxXSwgdGhpc1syXSwgdGhpc1szXSk7XG4gICAgIH1cblxuICAgICBWZWM0LnByb3RvdHlwZS55ID0gVmVjNC5wcm90b3R5cGUuZyA9IFZlYzQucHJvdG90eXBlLnQgPSBmdW5jdGlvbih5KXtcbiAgICAgICAgaWYoYXJndW1lbnRzLmxlbmd0aCA9PSAwKVxuICAgICAgICAgICAgcmV0dXJuIHRoaXNbMV07XG4gICAgICAgIGVsc2VcbiAgICAgICAgICAgIHJldHVybiBnZXRWZWM0KHRoaXNbMF0sIHksIHRoaXNbMl0sIHRoaXNbM10pO1xuICAgICB9XG4gICAgIFZlYzQucHJvdG90eXBlLnogPSBWZWM0LnByb3RvdHlwZS5iID0gVmVjNC5wcm90b3R5cGUucCA9IGZ1bmN0aW9uKHope1xuICAgICAgICBpZihhcmd1bWVudHMubGVuZ3RoID09IDApXG4gICAgICAgICAgICByZXR1cm4gdGhpc1syXTtcbiAgICAgICAgZWxzZVxuICAgICAgICAgICAgcmV0dXJuIGdldFZlYzQodGhpc1swXSwgdGhpc1sxXSwgeiwgdGhpc1szXSk7XG4gICAgIH1cbiAgICAgVmVjNC5wcm90b3R5cGUudyA9IFZlYzQucHJvdG90eXBlLmEgPSBWZWM0LnByb3RvdHlwZS5xID0gZnVuY3Rpb24odyl7XG4gICAgICAgIGlmKGFyZ3VtZW50cy5sZW5ndGggPT0gMClcbiAgICAgICAgICAgIHJldHVybiB0aGlzWzNdO1xuICAgICAgICBlbHNlXG4gICAgICAgICAgICByZXR1cm4gZ2V0VmVjNCh0aGlzWzBdLCB0aGlzWzFdLHRoaXNbMl0sIHcgKTtcbiAgICAgfVxuICAgICBhZGRTd2l6emxlcyhWZWM0LnByb3RvdHlwZSwgNCwgMiwgdHJ1ZSk7XG4gICAgIGFkZFN3aXp6bGVzKFZlYzQucHJvdG90eXBlLCA0LCAzLCB0cnVlKTtcbiAgICAgYWRkU3dpenpsZXMoVmVjNC5wcm90b3R5cGUsIDQsIDQsIHRydWUpO1xuXG4gICAgIC8qKlxuICAgICAgKiBUaGUgdmlydHVhbCBDb2xvciB0eXBlXG4gICAgICAqIEBjb25zdHJ1Y3RvclxuICAgICAgKi9cbiAgICAgdmFyIENvbG9yID0gVmVjNDtcblxuICAgICB2YXIgVGV4dHVyZSA9IGZ1bmN0aW9uKGltYWdlKXtcbiAgICAgICAgdGhpcy5pbWFnZSA9IGltYWdlO1xuICAgICB9XG5cbiAgICAgVGV4dHVyZS5wcm90b3R5cGUuc2FtcGxlMkQgPSBmdW5jdGlvbih4LCB5KXtcbiAgICAgICAgcmV0dXJuIG5ldyBWZWM0KDAsMCwwLDApO1xuICAgICB9XG5cblxuICAgIHZhciBTaGFkZSA9IHt9O1xuXG4gICAgU2hhZGUuY2xhbXAgPSBmdW5jdGlvbih4LCBtaW5WYWwsIG1heFZhbCkge1xuICAgICAgICByZXR1cm4gTWF0aC5taW4oTWF0aC5tYXgoeCwgbWluVmFsKSwgbWF4VmFsKTtcbiAgICB9O1xuXG4gICAgU2hhZGUuc21vb3Roc3RlcCA9IGZ1bmN0aW9uKGVkZ2UxLCBlZGdlMiwgeCkge1xuICAgICAgICB2YXIgdCA9IFNoYWRlLmNsYW1wKCh4IC0gZWRnZTEpIC8gKGVkZ2UyIC0gZWRnZTEpLCAwLjAsIDEuMCk7XG4gICAgICAgIHJldHVybiB0ICogdCAqICgzLjAgLSAyLjAgKiB0KTtcbiAgICB9O1xuXG4gICAgU2hhZGUuc3RlcCA9IGZ1bmN0aW9uKGVkZ2UsIHgpIHtcbiAgICAgICAgcmV0dXJuIHggPCBlZGdlID8gMCA6IDE7XG4gICAgfTtcblxuICAgIFNoYWRlLmZyYWN0ID0gZnVuY3Rpb24oeCkge1xuICAgICAgICByZXR1cm4geCAtIE1hdGguZmxvb3IoeCk7XG4gICAgfVxuXG5cbiAgICAvKipcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gbm9kZVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBtc2dcbiAgICAgKi9cbiAgICBucy50aHJvd0Vycm9yID0gZnVuY3Rpb24obm9kZSwgbXNnKSB7XG4gICAgICAgIHZhciBsb2MgPSBub2RlICYmIG5vZGUubG9jO1xuICAgICAgICBpZiAobG9jICYmIGxvYy5zdGFydC5saW5lKSB7XG4gICAgICAgICAgICBtc2cgPSBcIkxpbmUgXCIgKyBsb2Muc3RhcnQubGluZSArIFwiOiBcIiArIG1zZztcbiAgICAgICAgfVxuICAgICAgICB2YXIgZXJyb3IgPSBuZXcgRXJyb3IobXNnKTtcbiAgICAgICAgZXJyb3IubG9jID0gbG9jO1xuICAgICAgICB0aHJvdyBlcnJvcjtcbiAgICB9XG5cbiAgICBucy5WZWMyID0gVmVjMjtcbiAgICBucy5WZWMzID0gVmVjMztcbiAgICBucy5WZWM0ID0gVmVjNDtcbiAgICBucy5Db2xvciA9IENvbG9yO1xuICAgIG5zLlNoYWRlID0gU2hhZGU7XG5cbn0oZXhwb3J0cykpO1xuIiwiKGZ1bmN0aW9uIChucykge1xuICAgIHZhciBwYXJzZXIgPSByZXF1aXJlKCdlc3ByaW1hJyksXG4gICAgICAgIHBhcmFtZXRlcnMgPSByZXF1aXJlKFwiLi9hbmFseXplL3BhcmFtZXRlcnMuanNcIiksXG4gICAgICAgIGludGVyZmFjZXMgPSByZXF1aXJlKFwiLi9pbnRlcmZhY2VzLmpzXCIpLFxuICAgICAgICBpbmZlcmVuY2UgPSByZXF1aXJlKFwiLi9hbmFseXplL3R5cGVpbmZlcmVuY2UvdHlwZWluZmVyZW5jZS5qc1wiKSxcbiAgICAgICAgQmFzZSA9IHJlcXVpcmUoXCIuL2Jhc2UvaW5kZXguanNcIiksXG4gICAgICAgIEdMU0xDb21waWxlciA9IHJlcXVpcmUoXCIuL2dlbmVyYXRlL2dsc2wvY29tcGlsZXIuanNcIikuR0xTTENvbXBpbGVyO1xuXG5cblxuICAgIEJhc2UuZXh0ZW5kKG5zLCB7XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEFuYWx5emVzIGEgamF2YXNjcmlwdCBwcm9ncmFtIGFuZCByZXR1cm5zIGEgbGlzdCBvZiBwYXJhbWV0ZXJzXG4gICAgICAgICAqIEBwYXJhbSB7ZnVuY3Rpb24oKXxzdHJpbmcpIGZ1bmNcbiAgICAgICAgICogQHJldHVybnMge29iamVjdCF9XG4gICAgICAgICAqL1xuICAgICAgICBleHRyYWN0UGFyYW1ldGVyczogZnVuY3Rpb24gKGZ1bmMsIG9wdCkge1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBmdW5jID09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgICAgICBmdW5jID0gZnVuYy50b1N0cmluZygpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFyIGFzdCA9IHBhcnNlci5wYXJzZShmdW5jKTtcblxuICAgICAgICAgICAgcmV0dXJuIHBhcmFtZXRlcnMuZXh0cmFjdFBhcmFtZXRlcnMoYXN0LCBvcHQpO1xuICAgICAgICB9LFxuXG4gICAgICAgIHBhcnNlQW5kSW5mZXJlbmNlRXhwcmVzc2lvbjogZnVuY3Rpb24gKHN0ciwgb3B0KSB7XG4gICAgICAgICAgICBvcHQgPSBvcHQgfHwge307XG4gICAgICAgICAgICB2YXIgYXN0ID0gcGFyc2VyLnBhcnNlKHN0ciwge3JhdzogdHJ1ZSwgbG9jOiBvcHQubG9jIHx8IGZhbHNlIH0pO1xuICAgICAgICAgICAgdmFyIGFhc3QgPSBpbmZlcmVuY2UuaW5mZXIoYXN0LCBvcHQpO1xuICAgICAgICAgICAgcmV0dXJuIGFhc3Q7XG4gICAgICAgIH0sXG5cbiAgICAgICAgY29tcGlsZUZyYWdtZW50U2hhZGVyOiBmdW5jdGlvbihhYXN0KXtcbiAgICAgICAgICAgIHJldHVybiBuZXcgR0xTTENvbXBpbGVyKCkuY29tcGlsZUZyYWdtZW50U2hhZGVyKGFhc3QpO1xuICAgICAgICB9LFxuXG4gICAgICAgIFRZUEVTIDogaW50ZXJmYWNlcy5UWVBFUyxcbiAgICAgICAgT0JKRUNUX0tJTkRTIDogaW50ZXJmYWNlcy5PQkpFQ1RfS0lORFMsXG4gICAgICAgIFNPVVJDRVM6IGludGVyZmFjZXMuU09VUkNFUyxcbiAgICAgICAgVmVjMjogaW50ZXJmYWNlcy5WZWMyLFxuICAgICAgICBWZWMzOiBpbnRlcmZhY2VzLlZlYzMsXG4gICAgICAgIFZlYzQ6IGludGVyZmFjZXMuVmVjNCxcbiAgICAgICAgVGV4dHVyZTogaW50ZXJmYWNlcy5UZXh0dXJlLFxuICAgICAgICBDb2xvcjogaW50ZXJmYWNlcy5Db2xvclxuXG59KTtcbiAgICAvKipcbiAgICAgKiBMaWJyYXJ5IHZlcnNpb246XG4gICAgICovXG4gICAgbnMudmVyc2lvbiA9ICcwLjAuMSc7XG5cbn0oZXhwb3J0cykpO1xuIl19
;