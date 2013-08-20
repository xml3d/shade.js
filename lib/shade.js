;(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function () {
    var global = typeof window !== 'undefined' ? window : {};
    global.Shade = require("../index.js");
}());

},{"../index.js":2}],2:[function(require,module,exports){
module.exports = require('./src/shade.js');
},{"./src/shade.js":37}],3:[function(require,module,exports){
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

},{"./../base/context.js":20,"estraverse":4}],6:[function(require,module,exports){
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

},{"../../interfaces.js":36,"./../../base/annotation.js":19,"./../../base/index.js":21,"estraverse":4}],7:[function(require,module,exports){
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

},{"../../interfaces.js":36,"./../../base/annotation.js":19,"./infer_expression.js":6,"estraverse":4}],8:[function(require,module,exports){
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

},{"../../../interfaces.js":36,"./tools.js":14}],9:[function(require,module,exports){
(function (ns) {

    var objects = {
        Shade : require("./shade.js"),
        Matrix4 : require("./matrix.js"),
        Math : require("./math.js"),
        Vec2 : require("./vec2.js"),
        Vec3 : require("./vec3.js"),
        Color: require("./vec3.js"),
        Vec4 : require("./vec4.js"),
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

},{"./colorclosure.js":8,"./math.js":10,"./matrix.js":11,"./shade.js":12,"./system.js":13,"./vec2.js":15,"./vec3.js":16,"./vec4.js":17}],10:[function(require,module,exports){
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

},{"../../../base/index.js":21,"../../../interfaces.js":36,"./tools.js":14}],11:[function(require,module,exports){
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

},{"../../../interfaces.js":36,"./tools.js":14}],12:[function(require,module,exports){
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

},{"../../../base/index.js":21,"../../../interfaces.js":36,"./tools.js":14}],13:[function(require,module,exports){
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

},{"../../../base/index.js":21,"../../../interfaces.js":36}],14:[function(require,module,exports){
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

},{"../../../base/index.js":21,"../../../base/vec.js":23,"../../../interfaces.js":36}],15:[function(require,module,exports){
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

},{"../../../interfaces.js":36,"./tools.js":14}],16:[function(require,module,exports){
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

},{"../../../interfaces.js":36,"./tools.js":14}],17:[function(require,module,exports){
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

},{"../../../interfaces.js":36,"./tools.js":14}],18:[function(require,module,exports){
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

},{"../../base/index.js":21,"./../../base/annotation.js":19,"./../../base/context.js":20,"./infer_expression.js":6,"./infer_statement.js":7,"./registry/index.js":9,"estraverse":4}],19:[function(require,module,exports){
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

},{"../interfaces.js":36,"./index.js":21,"./typeinfo.js":22,"estraverse":4}],20:[function(require,module,exports){
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
            if (result.getType() !== TYPES.ANY) {
                return result;
            }

            if (node.type == Syntax.Identifier) {
                var name = node.name;
                var binding = this.getBindingByName(name);
                if (!binding) {
                    Shade.throwError(node, "ReferenceError: " + name + " is not defined");
                }
                return binding;
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
                console.error("Found NodeInfo");
                return nodeInfo;
            }
            return registry.getInstanceForKind(obj.getKind())
        }

    });


        return Context;

    };



}(exports));

},{"../interfaces.js":36,"./annotation.js":19,"./index.js":21,"./typeinfo.js":22,"estraverse":4}],21:[function(require,module,exports){
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

},{}],22:[function(require,module,exports){
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
                return this.node.info;
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

},{"../interfaces.js":36,"./index.js":21,"estraverse":4}],23:[function(require,module,exports){
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

},{}],24:[function(require,module,exports){
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

},{"../../base/index.js":21,"./glsl-generate.js":25,"./transform.js":35}],25:[function(require,module,exports){
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

},{"./../../base/annotation.js":19,"./../../interfaces.js":36,"estraverse":4}],26:[function(require,module,exports){
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

},{"../../../interfaces.js":36,"./tools.js":31}],27:[function(require,module,exports){
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

},{"./colorclosure.js":26,"./math.js":28,"./shade.js":29,"./system.js":30,"./vec2.js":32,"./vec3.js":33,"./vec4.js":34}],28:[function(require,module,exports){
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

},{"../../../interfaces.js":36,"./tools.js":31,"estraverse":4}],29:[function(require,module,exports){
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

},{"../../../interfaces.js":36,"./tools.js":31,"estraverse":4}],30:[function(require,module,exports){
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

},{"../../../base/index.js":21,"../../../interfaces.js":36,"estraverse":4}],31:[function(require,module,exports){
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

},{"../../../base/annotation.js":19,"../../../base/index.js":21,"../../../base/vec.js":23,"../../../interfaces.js":36,"estraverse":4}],32:[function(require,module,exports){
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

},{"../../../base/annotation.js":19,"../../../interfaces.js":36,"./tools.js":31,"estraverse":4}],33:[function(require,module,exports){
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

},{"../../../base/annotation.js":19,"../../../interfaces.js":36,"./tools.js":31,"estraverse":4}],34:[function(require,module,exports){
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

},{"../../../base/annotation.js":19,"../../../interfaces.js":36,"./tools.js":31,"estraverse":4}],35:[function(require,module,exports){
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
                 globalParameters : program.injections[this.mainId] && program.injections[this.mainId][0] ? program.injections[this.mainId][0].node.info : {},
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
                                return handleReturnInMain(node, parent);
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


    var handleReturnInMain = function(node, parent) {
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
                        right: node.argument
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
                return context.createTypeInfo(object);
                break;
            case Syntax.Identifier:
                return context.getBindingByName(object.name);
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

},{"../../base/annotation.js":19,"../../base/context.js":20,"../../base/index.js":21,"../../base/typeinfo.js":22,"./../../interfaces.js":36,"./registry/index.js":27,"estraverse":4}],36:[function(require,module,exports){
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

},{"./base/index.js":21}],37:[function(require,module,exports){
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
        Color: interfaces.Color

});
    /**
     * Library version:
     */
    ns.version = '0.0.1';

}(exports));

},{"./analyze/parameters.js":5,"./analyze/typeinference/typeinference.js":18,"./base/index.js":21,"./generate/glsl/compiler.js":24,"./interfaces.js":36,"esprima":3}]},{},[1])
//@ sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyJlOlxcQ29kZVxcaHRkb2NzXFxzaGFkZWpzXFxidWlsZFxcc2hhZGUuanMiLCJlOlxcQ29kZVxcaHRkb2NzXFxzaGFkZWpzXFxpbmRleC5qcyIsImU6XFxDb2RlXFxodGRvY3NcXHNoYWRlanNcXG5vZGVfbW9kdWxlc1xcZXNwcmltYVxcZXNwcmltYS5qcyIsImU6XFxDb2RlXFxodGRvY3NcXHNoYWRlanNcXG5vZGVfbW9kdWxlc1xcZXN0cmF2ZXJzZVxcZXN0cmF2ZXJzZS5qcyIsImU6XFxDb2RlXFxodGRvY3NcXHNoYWRlanNcXHNyY1xcYW5hbHl6ZVxccGFyYW1ldGVycy5qcyIsImU6XFxDb2RlXFxodGRvY3NcXHNoYWRlanNcXHNyY1xcYW5hbHl6ZVxcdHlwZWluZmVyZW5jZVxcaW5mZXJfZXhwcmVzc2lvbi5qcyIsImU6XFxDb2RlXFxodGRvY3NcXHNoYWRlanNcXHNyY1xcYW5hbHl6ZVxcdHlwZWluZmVyZW5jZVxcaW5mZXJfc3RhdGVtZW50LmpzIiwiZTpcXENvZGVcXGh0ZG9jc1xcc2hhZGVqc1xcc3JjXFxhbmFseXplXFx0eXBlaW5mZXJlbmNlXFxyZWdpc3RyeVxcY29sb3JjbG9zdXJlLmpzIiwiZTpcXENvZGVcXGh0ZG9jc1xcc2hhZGVqc1xcc3JjXFxhbmFseXplXFx0eXBlaW5mZXJlbmNlXFxyZWdpc3RyeVxcaW5kZXguanMiLCJlOlxcQ29kZVxcaHRkb2NzXFxzaGFkZWpzXFxzcmNcXGFuYWx5emVcXHR5cGVpbmZlcmVuY2VcXHJlZ2lzdHJ5XFxtYXRoLmpzIiwiZTpcXENvZGVcXGh0ZG9jc1xcc2hhZGVqc1xcc3JjXFxhbmFseXplXFx0eXBlaW5mZXJlbmNlXFxyZWdpc3RyeVxcbWF0cml4LmpzIiwiZTpcXENvZGVcXGh0ZG9jc1xcc2hhZGVqc1xcc3JjXFxhbmFseXplXFx0eXBlaW5mZXJlbmNlXFxyZWdpc3RyeVxcc2hhZGUuanMiLCJlOlxcQ29kZVxcaHRkb2NzXFxzaGFkZWpzXFxzcmNcXGFuYWx5emVcXHR5cGVpbmZlcmVuY2VcXHJlZ2lzdHJ5XFxzeXN0ZW0uanMiLCJlOlxcQ29kZVxcaHRkb2NzXFxzaGFkZWpzXFxzcmNcXGFuYWx5emVcXHR5cGVpbmZlcmVuY2VcXHJlZ2lzdHJ5XFx0b29scy5qcyIsImU6XFxDb2RlXFxodGRvY3NcXHNoYWRlanNcXHNyY1xcYW5hbHl6ZVxcdHlwZWluZmVyZW5jZVxccmVnaXN0cnlcXHZlYzIuanMiLCJlOlxcQ29kZVxcaHRkb2NzXFxzaGFkZWpzXFxzcmNcXGFuYWx5emVcXHR5cGVpbmZlcmVuY2VcXHJlZ2lzdHJ5XFx2ZWMzLmpzIiwiZTpcXENvZGVcXGh0ZG9jc1xcc2hhZGVqc1xcc3JjXFxhbmFseXplXFx0eXBlaW5mZXJlbmNlXFxyZWdpc3RyeVxcdmVjNC5qcyIsImU6XFxDb2RlXFxodGRvY3NcXHNoYWRlanNcXHNyY1xcYW5hbHl6ZVxcdHlwZWluZmVyZW5jZVxcdHlwZWluZmVyZW5jZS5qcyIsImU6XFxDb2RlXFxodGRvY3NcXHNoYWRlanNcXHNyY1xcYmFzZVxcYW5ub3RhdGlvbi5qcyIsImU6XFxDb2RlXFxodGRvY3NcXHNoYWRlanNcXHNyY1xcYmFzZVxcY29udGV4dC5qcyIsImU6XFxDb2RlXFxodGRvY3NcXHNoYWRlanNcXHNyY1xcYmFzZVxcaW5kZXguanMiLCJlOlxcQ29kZVxcaHRkb2NzXFxzaGFkZWpzXFxzcmNcXGJhc2VcXHR5cGVpbmZvLmpzIiwiZTpcXENvZGVcXGh0ZG9jc1xcc2hhZGVqc1xcc3JjXFxiYXNlXFx2ZWMuanMiLCJlOlxcQ29kZVxcaHRkb2NzXFxzaGFkZWpzXFxzcmNcXGdlbmVyYXRlXFxnbHNsXFxjb21waWxlci5qcyIsImU6XFxDb2RlXFxodGRvY3NcXHNoYWRlanNcXHNyY1xcZ2VuZXJhdGVcXGdsc2xcXGdsc2wtZ2VuZXJhdGUuanMiLCJlOlxcQ29kZVxcaHRkb2NzXFxzaGFkZWpzXFxzcmNcXGdlbmVyYXRlXFxnbHNsXFxyZWdpc3RyeVxcY29sb3JjbG9zdXJlLmpzIiwiZTpcXENvZGVcXGh0ZG9jc1xcc2hhZGVqc1xcc3JjXFxnZW5lcmF0ZVxcZ2xzbFxccmVnaXN0cnlcXGluZGV4LmpzIiwiZTpcXENvZGVcXGh0ZG9jc1xcc2hhZGVqc1xcc3JjXFxnZW5lcmF0ZVxcZ2xzbFxccmVnaXN0cnlcXG1hdGguanMiLCJlOlxcQ29kZVxcaHRkb2NzXFxzaGFkZWpzXFxzcmNcXGdlbmVyYXRlXFxnbHNsXFxyZWdpc3RyeVxcc2hhZGUuanMiLCJlOlxcQ29kZVxcaHRkb2NzXFxzaGFkZWpzXFxzcmNcXGdlbmVyYXRlXFxnbHNsXFxyZWdpc3RyeVxcc3lzdGVtLmpzIiwiZTpcXENvZGVcXGh0ZG9jc1xcc2hhZGVqc1xcc3JjXFxnZW5lcmF0ZVxcZ2xzbFxccmVnaXN0cnlcXHRvb2xzLmpzIiwiZTpcXENvZGVcXGh0ZG9jc1xcc2hhZGVqc1xcc3JjXFxnZW5lcmF0ZVxcZ2xzbFxccmVnaXN0cnlcXHZlYzIuanMiLCJlOlxcQ29kZVxcaHRkb2NzXFxzaGFkZWpzXFxzcmNcXGdlbmVyYXRlXFxnbHNsXFxyZWdpc3RyeVxcdmVjMy5qcyIsImU6XFxDb2RlXFxodGRvY3NcXHNoYWRlanNcXHNyY1xcZ2VuZXJhdGVcXGdsc2xcXHJlZ2lzdHJ5XFx2ZWM0LmpzIiwiZTpcXENvZGVcXGh0ZG9jc1xcc2hhZGVqc1xcc3JjXFxnZW5lcmF0ZVxcZ2xzbFxcdHJhbnNmb3JtLmpzIiwiZTpcXENvZGVcXGh0ZG9jc1xcc2hhZGVqc1xcc3JjXFxpbnRlcmZhY2VzLmpzIiwiZTpcXENvZGVcXGh0ZG9jc1xcc2hhZGVqc1xcc3JjXFxzaGFkZS5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNKQTs7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcDBIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzVEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pnQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaFBBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1UUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0VEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNURBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pPQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3U0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN2NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzViQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uICgpIHtcclxuICAgIHZhciBnbG9iYWwgPSB0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJyA/IHdpbmRvdyA6IHt9O1xyXG4gICAgZ2xvYmFsLlNoYWRlID0gcmVxdWlyZShcIi4uL2luZGV4LmpzXCIpO1xyXG59KCkpO1xyXG4iLCJtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoJy4vc3JjL3NoYWRlLmpzJyk7IiwiLypcbiAgQ29weXJpZ2h0IChDKSAyMDEyIEFyaXlhIEhpZGF5YXQgPGFyaXlhLmhpZGF5YXRAZ21haWwuY29tPlxuICBDb3B5cmlnaHQgKEMpIDIwMTIgTWF0aGlhcyBCeW5lbnMgPG1hdGhpYXNAcWl3aS5iZT5cbiAgQ29weXJpZ2h0IChDKSAyMDEyIEpvb3N0LVdpbSBCb2VrZXN0ZWlqbiA8am9vc3Qtd2ltQGJvZWtlc3RlaWpuLm5sPlxuICBDb3B5cmlnaHQgKEMpIDIwMTIgS3JpcyBLb3dhbCA8a3Jpcy5rb3dhbEBjaXhhci5jb20+XG4gIENvcHlyaWdodCAoQykgMjAxMiBZdXN1a2UgU3V6dWtpIDx1dGF0YW5lLnRlYUBnbWFpbC5jb20+XG4gIENvcHlyaWdodCAoQykgMjAxMiBBcnBhZCBCb3Jzb3MgPGFycGFkLmJvcnNvc0Bnb29nbGVtYWlsLmNvbT5cbiAgQ29weXJpZ2h0IChDKSAyMDExIEFyaXlhIEhpZGF5YXQgPGFyaXlhLmhpZGF5YXRAZ21haWwuY29tPlxuXG4gIFJlZGlzdHJpYnV0aW9uIGFuZCB1c2UgaW4gc291cmNlIGFuZCBiaW5hcnkgZm9ybXMsIHdpdGggb3Igd2l0aG91dFxuICBtb2RpZmljYXRpb24sIGFyZSBwZXJtaXR0ZWQgcHJvdmlkZWQgdGhhdCB0aGUgZm9sbG93aW5nIGNvbmRpdGlvbnMgYXJlIG1ldDpcblxuICAgICogUmVkaXN0cmlidXRpb25zIG9mIHNvdXJjZSBjb2RlIG11c3QgcmV0YWluIHRoZSBhYm92ZSBjb3B5cmlnaHRcbiAgICAgIG5vdGljZSwgdGhpcyBsaXN0IG9mIGNvbmRpdGlvbnMgYW5kIHRoZSBmb2xsb3dpbmcgZGlzY2xhaW1lci5cbiAgICAqIFJlZGlzdHJpYnV0aW9ucyBpbiBiaW5hcnkgZm9ybSBtdXN0IHJlcHJvZHVjZSB0aGUgYWJvdmUgY29weXJpZ2h0XG4gICAgICBub3RpY2UsIHRoaXMgbGlzdCBvZiBjb25kaXRpb25zIGFuZCB0aGUgZm9sbG93aW5nIGRpc2NsYWltZXIgaW4gdGhlXG4gICAgICBkb2N1bWVudGF0aW9uIGFuZC9vciBvdGhlciBtYXRlcmlhbHMgcHJvdmlkZWQgd2l0aCB0aGUgZGlzdHJpYnV0aW9uLlxuXG4gIFRISVMgU09GVFdBUkUgSVMgUFJPVklERUQgQlkgVEhFIENPUFlSSUdIVCBIT0xERVJTIEFORCBDT05UUklCVVRPUlMgXCJBUyBJU1wiXG4gIEFORCBBTlkgRVhQUkVTUyBPUiBJTVBMSUVEIFdBUlJBTlRJRVMsIElOQ0xVRElORywgQlVUIE5PVCBMSU1JVEVEIFRPLCBUSEVcbiAgSU1QTElFRCBXQVJSQU5USUVTIE9GIE1FUkNIQU5UQUJJTElUWSBBTkQgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0VcbiAgQVJFIERJU0NMQUlNRUQuIElOIE5PIEVWRU5UIFNIQUxMIDxDT1BZUklHSFQgSE9MREVSPiBCRSBMSUFCTEUgRk9SIEFOWVxuICBESVJFQ1QsIElORElSRUNULCBJTkNJREVOVEFMLCBTUEVDSUFMLCBFWEVNUExBUlksIE9SIENPTlNFUVVFTlRJQUwgREFNQUdFU1xuICAoSU5DTFVESU5HLCBCVVQgTk9UIExJTUlURUQgVE8sIFBST0NVUkVNRU5UIE9GIFNVQlNUSVRVVEUgR09PRFMgT1IgU0VSVklDRVM7XG4gIExPU1MgT0YgVVNFLCBEQVRBLCBPUiBQUk9GSVRTOyBPUiBCVVNJTkVTUyBJTlRFUlJVUFRJT04pIEhPV0VWRVIgQ0FVU0VEIEFORFxuICBPTiBBTlkgVEhFT1JZIE9GIExJQUJJTElUWSwgV0hFVEhFUiBJTiBDT05UUkFDVCwgU1RSSUNUIExJQUJJTElUWSwgT1IgVE9SVFxuICAoSU5DTFVESU5HIE5FR0xJR0VOQ0UgT1IgT1RIRVJXSVNFKSBBUklTSU5HIElOIEFOWSBXQVkgT1VUIE9GIFRIRSBVU0UgT0ZcbiAgVEhJUyBTT0ZUV0FSRSwgRVZFTiBJRiBBRFZJU0VEIE9GIFRIRSBQT1NTSUJJTElUWSBPRiBTVUNIIERBTUFHRS5cbiovXG5cbi8qanNsaW50IGJpdHdpc2U6dHJ1ZSBwbHVzcGx1czp0cnVlICovXG4vKmdsb2JhbCBlc3ByaW1hOnRydWUsIGRlZmluZTp0cnVlLCBleHBvcnRzOnRydWUsIHdpbmRvdzogdHJ1ZSxcbnRocm93RXJyb3I6IHRydWUsIGNyZWF0ZUxpdGVyYWw6IHRydWUsIGdlbmVyYXRlU3RhdGVtZW50OiB0cnVlLFxucGFyc2VBc3NpZ25tZW50RXhwcmVzc2lvbjogdHJ1ZSwgcGFyc2VCbG9jazogdHJ1ZSwgcGFyc2VFeHByZXNzaW9uOiB0cnVlLFxucGFyc2VGdW5jdGlvbkRlY2xhcmF0aW9uOiB0cnVlLCBwYXJzZUZ1bmN0aW9uRXhwcmVzc2lvbjogdHJ1ZSxcbnBhcnNlRnVuY3Rpb25Tb3VyY2VFbGVtZW50czogdHJ1ZSwgcGFyc2VWYXJpYWJsZUlkZW50aWZpZXI6IHRydWUsXG5wYXJzZUxlZnRIYW5kU2lkZUV4cHJlc3Npb246IHRydWUsXG5wYXJzZVN0YXRlbWVudDogdHJ1ZSwgcGFyc2VTb3VyY2VFbGVtZW50OiB0cnVlICovXG5cbihmdW5jdGlvbiAocm9vdCwgZmFjdG9yeSkge1xuICAgICd1c2Ugc3RyaWN0JztcblxuICAgIC8vIFVuaXZlcnNhbCBNb2R1bGUgRGVmaW5pdGlvbiAoVU1EKSB0byBzdXBwb3J0IEFNRCwgQ29tbW9uSlMvTm9kZS5qcyxcbiAgICAvLyBSaGlubywgYW5kIHBsYWluIGJyb3dzZXIgbG9hZGluZy5cbiAgICBpZiAodHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kKSB7XG4gICAgICAgIGRlZmluZShbJ2V4cG9ydHMnXSwgZmFjdG9yeSk7XG4gICAgfSBlbHNlIGlmICh0eXBlb2YgZXhwb3J0cyAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgZmFjdG9yeShleHBvcnRzKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBmYWN0b3J5KChyb290LmVzcHJpbWEgPSB7fSkpO1xuICAgIH1cbn0odGhpcywgZnVuY3Rpb24gKGV4cG9ydHMpIHtcbiAgICAndXNlIHN0cmljdCc7XG5cbiAgICB2YXIgVG9rZW4sXG4gICAgICAgIFRva2VuTmFtZSxcbiAgICAgICAgU3ludGF4LFxuICAgICAgICBQcm9wZXJ0eUtpbmQsXG4gICAgICAgIE1lc3NhZ2VzLFxuICAgICAgICBSZWdleCxcbiAgICAgICAgc291cmNlLFxuICAgICAgICBzdHJpY3QsXG4gICAgICAgIGluZGV4LFxuICAgICAgICBsaW5lTnVtYmVyLFxuICAgICAgICBsaW5lU3RhcnQsXG4gICAgICAgIGxlbmd0aCxcbiAgICAgICAgYnVmZmVyLFxuICAgICAgICBzdGF0ZSxcbiAgICAgICAgZXh0cmE7XG5cbiAgICBUb2tlbiA9IHtcbiAgICAgICAgQm9vbGVhbkxpdGVyYWw6IDEsXG4gICAgICAgIEVPRjogMixcbiAgICAgICAgSWRlbnRpZmllcjogMyxcbiAgICAgICAgS2V5d29yZDogNCxcbiAgICAgICAgTnVsbExpdGVyYWw6IDUsXG4gICAgICAgIE51bWVyaWNMaXRlcmFsOiA2LFxuICAgICAgICBQdW5jdHVhdG9yOiA3LFxuICAgICAgICBTdHJpbmdMaXRlcmFsOiA4XG4gICAgfTtcblxuICAgIFRva2VuTmFtZSA9IHt9O1xuICAgIFRva2VuTmFtZVtUb2tlbi5Cb29sZWFuTGl0ZXJhbF0gPSAnQm9vbGVhbic7XG4gICAgVG9rZW5OYW1lW1Rva2VuLkVPRl0gPSAnPGVuZD4nO1xuICAgIFRva2VuTmFtZVtUb2tlbi5JZGVudGlmaWVyXSA9ICdJZGVudGlmaWVyJztcbiAgICBUb2tlbk5hbWVbVG9rZW4uS2V5d29yZF0gPSAnS2V5d29yZCc7XG4gICAgVG9rZW5OYW1lW1Rva2VuLk51bGxMaXRlcmFsXSA9ICdOdWxsJztcbiAgICBUb2tlbk5hbWVbVG9rZW4uTnVtZXJpY0xpdGVyYWxdID0gJ051bWVyaWMnO1xuICAgIFRva2VuTmFtZVtUb2tlbi5QdW5jdHVhdG9yXSA9ICdQdW5jdHVhdG9yJztcbiAgICBUb2tlbk5hbWVbVG9rZW4uU3RyaW5nTGl0ZXJhbF0gPSAnU3RyaW5nJztcblxuICAgIFN5bnRheCA9IHtcbiAgICAgICAgQXNzaWdubWVudEV4cHJlc3Npb246ICdBc3NpZ25tZW50RXhwcmVzc2lvbicsXG4gICAgICAgIEFycmF5RXhwcmVzc2lvbjogJ0FycmF5RXhwcmVzc2lvbicsXG4gICAgICAgIEJsb2NrU3RhdGVtZW50OiAnQmxvY2tTdGF0ZW1lbnQnLFxuICAgICAgICBCaW5hcnlFeHByZXNzaW9uOiAnQmluYXJ5RXhwcmVzc2lvbicsXG4gICAgICAgIEJyZWFrU3RhdGVtZW50OiAnQnJlYWtTdGF0ZW1lbnQnLFxuICAgICAgICBDYWxsRXhwcmVzc2lvbjogJ0NhbGxFeHByZXNzaW9uJyxcbiAgICAgICAgQ2F0Y2hDbGF1c2U6ICdDYXRjaENsYXVzZScsXG4gICAgICAgIENvbmRpdGlvbmFsRXhwcmVzc2lvbjogJ0NvbmRpdGlvbmFsRXhwcmVzc2lvbicsXG4gICAgICAgIENvbnRpbnVlU3RhdGVtZW50OiAnQ29udGludWVTdGF0ZW1lbnQnLFxuICAgICAgICBEb1doaWxlU3RhdGVtZW50OiAnRG9XaGlsZVN0YXRlbWVudCcsXG4gICAgICAgIERlYnVnZ2VyU3RhdGVtZW50OiAnRGVidWdnZXJTdGF0ZW1lbnQnLFxuICAgICAgICBFbXB0eVN0YXRlbWVudDogJ0VtcHR5U3RhdGVtZW50JyxcbiAgICAgICAgRXhwcmVzc2lvblN0YXRlbWVudDogJ0V4cHJlc3Npb25TdGF0ZW1lbnQnLFxuICAgICAgICBGb3JTdGF0ZW1lbnQ6ICdGb3JTdGF0ZW1lbnQnLFxuICAgICAgICBGb3JJblN0YXRlbWVudDogJ0ZvckluU3RhdGVtZW50JyxcbiAgICAgICAgRnVuY3Rpb25EZWNsYXJhdGlvbjogJ0Z1bmN0aW9uRGVjbGFyYXRpb24nLFxuICAgICAgICBGdW5jdGlvbkV4cHJlc3Npb246ICdGdW5jdGlvbkV4cHJlc3Npb24nLFxuICAgICAgICBJZGVudGlmaWVyOiAnSWRlbnRpZmllcicsXG4gICAgICAgIElmU3RhdGVtZW50OiAnSWZTdGF0ZW1lbnQnLFxuICAgICAgICBMaXRlcmFsOiAnTGl0ZXJhbCcsXG4gICAgICAgIExhYmVsZWRTdGF0ZW1lbnQ6ICdMYWJlbGVkU3RhdGVtZW50JyxcbiAgICAgICAgTG9naWNhbEV4cHJlc3Npb246ICdMb2dpY2FsRXhwcmVzc2lvbicsXG4gICAgICAgIE1lbWJlckV4cHJlc3Npb246ICdNZW1iZXJFeHByZXNzaW9uJyxcbiAgICAgICAgTmV3RXhwcmVzc2lvbjogJ05ld0V4cHJlc3Npb24nLFxuICAgICAgICBPYmplY3RFeHByZXNzaW9uOiAnT2JqZWN0RXhwcmVzc2lvbicsXG4gICAgICAgIFByb2dyYW06ICdQcm9ncmFtJyxcbiAgICAgICAgUHJvcGVydHk6ICdQcm9wZXJ0eScsXG4gICAgICAgIFJldHVyblN0YXRlbWVudDogJ1JldHVyblN0YXRlbWVudCcsXG4gICAgICAgIFNlcXVlbmNlRXhwcmVzc2lvbjogJ1NlcXVlbmNlRXhwcmVzc2lvbicsXG4gICAgICAgIFN3aXRjaFN0YXRlbWVudDogJ1N3aXRjaFN0YXRlbWVudCcsXG4gICAgICAgIFN3aXRjaENhc2U6ICdTd2l0Y2hDYXNlJyxcbiAgICAgICAgVGhpc0V4cHJlc3Npb246ICdUaGlzRXhwcmVzc2lvbicsXG4gICAgICAgIFRocm93U3RhdGVtZW50OiAnVGhyb3dTdGF0ZW1lbnQnLFxuICAgICAgICBUcnlTdGF0ZW1lbnQ6ICdUcnlTdGF0ZW1lbnQnLFxuICAgICAgICBVbmFyeUV4cHJlc3Npb246ICdVbmFyeUV4cHJlc3Npb24nLFxuICAgICAgICBVcGRhdGVFeHByZXNzaW9uOiAnVXBkYXRlRXhwcmVzc2lvbicsXG4gICAgICAgIFZhcmlhYmxlRGVjbGFyYXRpb246ICdWYXJpYWJsZURlY2xhcmF0aW9uJyxcbiAgICAgICAgVmFyaWFibGVEZWNsYXJhdG9yOiAnVmFyaWFibGVEZWNsYXJhdG9yJyxcbiAgICAgICAgV2hpbGVTdGF0ZW1lbnQ6ICdXaGlsZVN0YXRlbWVudCcsXG4gICAgICAgIFdpdGhTdGF0ZW1lbnQ6ICdXaXRoU3RhdGVtZW50J1xuICAgIH07XG5cbiAgICBQcm9wZXJ0eUtpbmQgPSB7XG4gICAgICAgIERhdGE6IDEsXG4gICAgICAgIEdldDogMixcbiAgICAgICAgU2V0OiA0XG4gICAgfTtcblxuICAgIC8vIEVycm9yIG1lc3NhZ2VzIHNob3VsZCBiZSBpZGVudGljYWwgdG8gVjguXG4gICAgTWVzc2FnZXMgPSB7XG4gICAgICAgIFVuZXhwZWN0ZWRUb2tlbjogICdVbmV4cGVjdGVkIHRva2VuICUwJyxcbiAgICAgICAgVW5leHBlY3RlZE51bWJlcjogICdVbmV4cGVjdGVkIG51bWJlcicsXG4gICAgICAgIFVuZXhwZWN0ZWRTdHJpbmc6ICAnVW5leHBlY3RlZCBzdHJpbmcnLFxuICAgICAgICBVbmV4cGVjdGVkSWRlbnRpZmllcjogICdVbmV4cGVjdGVkIGlkZW50aWZpZXInLFxuICAgICAgICBVbmV4cGVjdGVkUmVzZXJ2ZWQ6ICAnVW5leHBlY3RlZCByZXNlcnZlZCB3b3JkJyxcbiAgICAgICAgVW5leHBlY3RlZEVPUzogICdVbmV4cGVjdGVkIGVuZCBvZiBpbnB1dCcsXG4gICAgICAgIE5ld2xpbmVBZnRlclRocm93OiAgJ0lsbGVnYWwgbmV3bGluZSBhZnRlciB0aHJvdycsXG4gICAgICAgIEludmFsaWRSZWdFeHA6ICdJbnZhbGlkIHJlZ3VsYXIgZXhwcmVzc2lvbicsXG4gICAgICAgIFVudGVybWluYXRlZFJlZ0V4cDogICdJbnZhbGlkIHJlZ3VsYXIgZXhwcmVzc2lvbjogbWlzc2luZyAvJyxcbiAgICAgICAgSW52YWxpZExIU0luQXNzaWdubWVudDogICdJbnZhbGlkIGxlZnQtaGFuZCBzaWRlIGluIGFzc2lnbm1lbnQnLFxuICAgICAgICBJbnZhbGlkTEhTSW5Gb3JJbjogICdJbnZhbGlkIGxlZnQtaGFuZCBzaWRlIGluIGZvci1pbicsXG4gICAgICAgIE11bHRpcGxlRGVmYXVsdHNJblN3aXRjaDogJ01vcmUgdGhhbiBvbmUgZGVmYXVsdCBjbGF1c2UgaW4gc3dpdGNoIHN0YXRlbWVudCcsXG4gICAgICAgIE5vQ2F0Y2hPckZpbmFsbHk6ICAnTWlzc2luZyBjYXRjaCBvciBmaW5hbGx5IGFmdGVyIHRyeScsXG4gICAgICAgIFVua25vd25MYWJlbDogJ1VuZGVmaW5lZCBsYWJlbCBcXCclMFxcJycsXG4gICAgICAgIFJlZGVjbGFyYXRpb246ICclMCBcXCclMVxcJyBoYXMgYWxyZWFkeSBiZWVuIGRlY2xhcmVkJyxcbiAgICAgICAgSWxsZWdhbENvbnRpbnVlOiAnSWxsZWdhbCBjb250aW51ZSBzdGF0ZW1lbnQnLFxuICAgICAgICBJbGxlZ2FsQnJlYWs6ICdJbGxlZ2FsIGJyZWFrIHN0YXRlbWVudCcsXG4gICAgICAgIElsbGVnYWxSZXR1cm46ICdJbGxlZ2FsIHJldHVybiBzdGF0ZW1lbnQnLFxuICAgICAgICBTdHJpY3RNb2RlV2l0aDogICdTdHJpY3QgbW9kZSBjb2RlIG1heSBub3QgaW5jbHVkZSBhIHdpdGggc3RhdGVtZW50JyxcbiAgICAgICAgU3RyaWN0Q2F0Y2hWYXJpYWJsZTogICdDYXRjaCB2YXJpYWJsZSBtYXkgbm90IGJlIGV2YWwgb3IgYXJndW1lbnRzIGluIHN0cmljdCBtb2RlJyxcbiAgICAgICAgU3RyaWN0VmFyTmFtZTogICdWYXJpYWJsZSBuYW1lIG1heSBub3QgYmUgZXZhbCBvciBhcmd1bWVudHMgaW4gc3RyaWN0IG1vZGUnLFxuICAgICAgICBTdHJpY3RQYXJhbU5hbWU6ICAnUGFyYW1ldGVyIG5hbWUgZXZhbCBvciBhcmd1bWVudHMgaXMgbm90IGFsbG93ZWQgaW4gc3RyaWN0IG1vZGUnLFxuICAgICAgICBTdHJpY3RQYXJhbUR1cGU6ICdTdHJpY3QgbW9kZSBmdW5jdGlvbiBtYXkgbm90IGhhdmUgZHVwbGljYXRlIHBhcmFtZXRlciBuYW1lcycsXG4gICAgICAgIFN0cmljdEZ1bmN0aW9uTmFtZTogICdGdW5jdGlvbiBuYW1lIG1heSBub3QgYmUgZXZhbCBvciBhcmd1bWVudHMgaW4gc3RyaWN0IG1vZGUnLFxuICAgICAgICBTdHJpY3RPY3RhbExpdGVyYWw6ICAnT2N0YWwgbGl0ZXJhbHMgYXJlIG5vdCBhbGxvd2VkIGluIHN0cmljdCBtb2RlLicsXG4gICAgICAgIFN0cmljdERlbGV0ZTogICdEZWxldGUgb2YgYW4gdW5xdWFsaWZpZWQgaWRlbnRpZmllciBpbiBzdHJpY3QgbW9kZS4nLFxuICAgICAgICBTdHJpY3REdXBsaWNhdGVQcm9wZXJ0eTogICdEdXBsaWNhdGUgZGF0YSBwcm9wZXJ0eSBpbiBvYmplY3QgbGl0ZXJhbCBub3QgYWxsb3dlZCBpbiBzdHJpY3QgbW9kZScsXG4gICAgICAgIEFjY2Vzc29yRGF0YVByb3BlcnR5OiAgJ09iamVjdCBsaXRlcmFsIG1heSBub3QgaGF2ZSBkYXRhIGFuZCBhY2Nlc3NvciBwcm9wZXJ0eSB3aXRoIHRoZSBzYW1lIG5hbWUnLFxuICAgICAgICBBY2Nlc3NvckdldFNldDogICdPYmplY3QgbGl0ZXJhbCBtYXkgbm90IGhhdmUgbXVsdGlwbGUgZ2V0L3NldCBhY2Nlc3NvcnMgd2l0aCB0aGUgc2FtZSBuYW1lJyxcbiAgICAgICAgU3RyaWN0TEhTQXNzaWdubWVudDogICdBc3NpZ25tZW50IHRvIGV2YWwgb3IgYXJndW1lbnRzIGlzIG5vdCBhbGxvd2VkIGluIHN0cmljdCBtb2RlJyxcbiAgICAgICAgU3RyaWN0TEhTUG9zdGZpeDogICdQb3N0Zml4IGluY3JlbWVudC9kZWNyZW1lbnQgbWF5IG5vdCBoYXZlIGV2YWwgb3IgYXJndW1lbnRzIG9wZXJhbmQgaW4gc3RyaWN0IG1vZGUnLFxuICAgICAgICBTdHJpY3RMSFNQcmVmaXg6ICAnUHJlZml4IGluY3JlbWVudC9kZWNyZW1lbnQgbWF5IG5vdCBoYXZlIGV2YWwgb3IgYXJndW1lbnRzIG9wZXJhbmQgaW4gc3RyaWN0IG1vZGUnLFxuICAgICAgICBTdHJpY3RSZXNlcnZlZFdvcmQ6ICAnVXNlIG9mIGZ1dHVyZSByZXNlcnZlZCB3b3JkIGluIHN0cmljdCBtb2RlJ1xuICAgIH07XG5cbiAgICAvLyBTZWUgYWxzbyB0b29scy9nZW5lcmF0ZS11bmljb2RlLXJlZ2V4LnB5LlxuICAgIFJlZ2V4ID0ge1xuICAgICAgICBOb25Bc2NpaUlkZW50aWZpZXJTdGFydDogbmV3IFJlZ0V4cCgnW1xceGFhXFx4YjVcXHhiYVxceGMwLVxceGQ2XFx4ZDgtXFx4ZjZcXHhmOC1cXHUwMmMxXFx1MDJjNi1cXHUwMmQxXFx1MDJlMC1cXHUwMmU0XFx1MDJlY1xcdTAyZWVcXHUwMzcwLVxcdTAzNzRcXHUwMzc2XFx1MDM3N1xcdTAzN2EtXFx1MDM3ZFxcdTAzODZcXHUwMzg4LVxcdTAzOGFcXHUwMzhjXFx1MDM4ZS1cXHUwM2ExXFx1MDNhMy1cXHUwM2Y1XFx1MDNmNy1cXHUwNDgxXFx1MDQ4YS1cXHUwNTI3XFx1MDUzMS1cXHUwNTU2XFx1MDU1OVxcdTA1NjEtXFx1MDU4N1xcdTA1ZDAtXFx1MDVlYVxcdTA1ZjAtXFx1MDVmMlxcdTA2MjAtXFx1MDY0YVxcdTA2NmVcXHUwNjZmXFx1MDY3MS1cXHUwNmQzXFx1MDZkNVxcdTA2ZTVcXHUwNmU2XFx1MDZlZVxcdTA2ZWZcXHUwNmZhLVxcdTA2ZmNcXHUwNmZmXFx1MDcxMFxcdTA3MTItXFx1MDcyZlxcdTA3NGQtXFx1MDdhNVxcdTA3YjFcXHUwN2NhLVxcdTA3ZWFcXHUwN2Y0XFx1MDdmNVxcdTA3ZmFcXHUwODAwLVxcdTA4MTVcXHUwODFhXFx1MDgyNFxcdTA4MjhcXHUwODQwLVxcdTA4NThcXHUwOGEwXFx1MDhhMi1cXHUwOGFjXFx1MDkwNC1cXHUwOTM5XFx1MDkzZFxcdTA5NTBcXHUwOTU4LVxcdTA5NjFcXHUwOTcxLVxcdTA5NzdcXHUwOTc5LVxcdTA5N2ZcXHUwOTg1LVxcdTA5OGNcXHUwOThmXFx1MDk5MFxcdTA5OTMtXFx1MDlhOFxcdTA5YWEtXFx1MDliMFxcdTA5YjJcXHUwOWI2LVxcdTA5YjlcXHUwOWJkXFx1MDljZVxcdTA5ZGNcXHUwOWRkXFx1MDlkZi1cXHUwOWUxXFx1MDlmMFxcdTA5ZjFcXHUwYTA1LVxcdTBhMGFcXHUwYTBmXFx1MGExMFxcdTBhMTMtXFx1MGEyOFxcdTBhMmEtXFx1MGEzMFxcdTBhMzJcXHUwYTMzXFx1MGEzNVxcdTBhMzZcXHUwYTM4XFx1MGEzOVxcdTBhNTktXFx1MGE1Y1xcdTBhNWVcXHUwYTcyLVxcdTBhNzRcXHUwYTg1LVxcdTBhOGRcXHUwYThmLVxcdTBhOTFcXHUwYTkzLVxcdTBhYThcXHUwYWFhLVxcdTBhYjBcXHUwYWIyXFx1MGFiM1xcdTBhYjUtXFx1MGFiOVxcdTBhYmRcXHUwYWQwXFx1MGFlMFxcdTBhZTFcXHUwYjA1LVxcdTBiMGNcXHUwYjBmXFx1MGIxMFxcdTBiMTMtXFx1MGIyOFxcdTBiMmEtXFx1MGIzMFxcdTBiMzJcXHUwYjMzXFx1MGIzNS1cXHUwYjM5XFx1MGIzZFxcdTBiNWNcXHUwYjVkXFx1MGI1Zi1cXHUwYjYxXFx1MGI3MVxcdTBiODNcXHUwYjg1LVxcdTBiOGFcXHUwYjhlLVxcdTBiOTBcXHUwYjkyLVxcdTBiOTVcXHUwYjk5XFx1MGI5YVxcdTBiOWNcXHUwYjllXFx1MGI5ZlxcdTBiYTNcXHUwYmE0XFx1MGJhOC1cXHUwYmFhXFx1MGJhZS1cXHUwYmI5XFx1MGJkMFxcdTBjMDUtXFx1MGMwY1xcdTBjMGUtXFx1MGMxMFxcdTBjMTItXFx1MGMyOFxcdTBjMmEtXFx1MGMzM1xcdTBjMzUtXFx1MGMzOVxcdTBjM2RcXHUwYzU4XFx1MGM1OVxcdTBjNjBcXHUwYzYxXFx1MGM4NS1cXHUwYzhjXFx1MGM4ZS1cXHUwYzkwXFx1MGM5Mi1cXHUwY2E4XFx1MGNhYS1cXHUwY2IzXFx1MGNiNS1cXHUwY2I5XFx1MGNiZFxcdTBjZGVcXHUwY2UwXFx1MGNlMVxcdTBjZjFcXHUwY2YyXFx1MGQwNS1cXHUwZDBjXFx1MGQwZS1cXHUwZDEwXFx1MGQxMi1cXHUwZDNhXFx1MGQzZFxcdTBkNGVcXHUwZDYwXFx1MGQ2MVxcdTBkN2EtXFx1MGQ3ZlxcdTBkODUtXFx1MGQ5NlxcdTBkOWEtXFx1MGRiMVxcdTBkYjMtXFx1MGRiYlxcdTBkYmRcXHUwZGMwLVxcdTBkYzZcXHUwZTAxLVxcdTBlMzBcXHUwZTMyXFx1MGUzM1xcdTBlNDAtXFx1MGU0NlxcdTBlODFcXHUwZTgyXFx1MGU4NFxcdTBlODdcXHUwZTg4XFx1MGU4YVxcdTBlOGRcXHUwZTk0LVxcdTBlOTdcXHUwZTk5LVxcdTBlOWZcXHUwZWExLVxcdTBlYTNcXHUwZWE1XFx1MGVhN1xcdTBlYWFcXHUwZWFiXFx1MGVhZC1cXHUwZWIwXFx1MGViMlxcdTBlYjNcXHUwZWJkXFx1MGVjMC1cXHUwZWM0XFx1MGVjNlxcdTBlZGMtXFx1MGVkZlxcdTBmMDBcXHUwZjQwLVxcdTBmNDdcXHUwZjQ5LVxcdTBmNmNcXHUwZjg4LVxcdTBmOGNcXHUxMDAwLVxcdTEwMmFcXHUxMDNmXFx1MTA1MC1cXHUxMDU1XFx1MTA1YS1cXHUxMDVkXFx1MTA2MVxcdTEwNjVcXHUxMDY2XFx1MTA2ZS1cXHUxMDcwXFx1MTA3NS1cXHUxMDgxXFx1MTA4ZVxcdTEwYTAtXFx1MTBjNVxcdTEwYzdcXHUxMGNkXFx1MTBkMC1cXHUxMGZhXFx1MTBmYy1cXHUxMjQ4XFx1MTI0YS1cXHUxMjRkXFx1MTI1MC1cXHUxMjU2XFx1MTI1OFxcdTEyNWEtXFx1MTI1ZFxcdTEyNjAtXFx1MTI4OFxcdTEyOGEtXFx1MTI4ZFxcdTEyOTAtXFx1MTJiMFxcdTEyYjItXFx1MTJiNVxcdTEyYjgtXFx1MTJiZVxcdTEyYzBcXHUxMmMyLVxcdTEyYzVcXHUxMmM4LVxcdTEyZDZcXHUxMmQ4LVxcdTEzMTBcXHUxMzEyLVxcdTEzMTVcXHUxMzE4LVxcdTEzNWFcXHUxMzgwLVxcdTEzOGZcXHUxM2EwLVxcdTEzZjRcXHUxNDAxLVxcdTE2NmNcXHUxNjZmLVxcdTE2N2ZcXHUxNjgxLVxcdTE2OWFcXHUxNmEwLVxcdTE2ZWFcXHUxNmVlLVxcdTE2ZjBcXHUxNzAwLVxcdTE3MGNcXHUxNzBlLVxcdTE3MTFcXHUxNzIwLVxcdTE3MzFcXHUxNzQwLVxcdTE3NTFcXHUxNzYwLVxcdTE3NmNcXHUxNzZlLVxcdTE3NzBcXHUxNzgwLVxcdTE3YjNcXHUxN2Q3XFx1MTdkY1xcdTE4MjAtXFx1MTg3N1xcdTE4ODAtXFx1MThhOFxcdTE4YWFcXHUxOGIwLVxcdTE4ZjVcXHUxOTAwLVxcdTE5MWNcXHUxOTUwLVxcdTE5NmRcXHUxOTcwLVxcdTE5NzRcXHUxOTgwLVxcdTE5YWJcXHUxOWMxLVxcdTE5YzdcXHUxYTAwLVxcdTFhMTZcXHUxYTIwLVxcdTFhNTRcXHUxYWE3XFx1MWIwNS1cXHUxYjMzXFx1MWI0NS1cXHUxYjRiXFx1MWI4My1cXHUxYmEwXFx1MWJhZVxcdTFiYWZcXHUxYmJhLVxcdTFiZTVcXHUxYzAwLVxcdTFjMjNcXHUxYzRkLVxcdTFjNGZcXHUxYzVhLVxcdTFjN2RcXHUxY2U5LVxcdTFjZWNcXHUxY2VlLVxcdTFjZjFcXHUxY2Y1XFx1MWNmNlxcdTFkMDAtXFx1MWRiZlxcdTFlMDAtXFx1MWYxNVxcdTFmMTgtXFx1MWYxZFxcdTFmMjAtXFx1MWY0NVxcdTFmNDgtXFx1MWY0ZFxcdTFmNTAtXFx1MWY1N1xcdTFmNTlcXHUxZjViXFx1MWY1ZFxcdTFmNWYtXFx1MWY3ZFxcdTFmODAtXFx1MWZiNFxcdTFmYjYtXFx1MWZiY1xcdTFmYmVcXHUxZmMyLVxcdTFmYzRcXHUxZmM2LVxcdTFmY2NcXHUxZmQwLVxcdTFmZDNcXHUxZmQ2LVxcdTFmZGJcXHUxZmUwLVxcdTFmZWNcXHUxZmYyLVxcdTFmZjRcXHUxZmY2LVxcdTFmZmNcXHUyMDcxXFx1MjA3ZlxcdTIwOTAtXFx1MjA5Y1xcdTIxMDJcXHUyMTA3XFx1MjEwYS1cXHUyMTEzXFx1MjExNVxcdTIxMTktXFx1MjExZFxcdTIxMjRcXHUyMTI2XFx1MjEyOFxcdTIxMmEtXFx1MjEyZFxcdTIxMmYtXFx1MjEzOVxcdTIxM2MtXFx1MjEzZlxcdTIxNDUtXFx1MjE0OVxcdTIxNGVcXHUyMTYwLVxcdTIxODhcXHUyYzAwLVxcdTJjMmVcXHUyYzMwLVxcdTJjNWVcXHUyYzYwLVxcdTJjZTRcXHUyY2ViLVxcdTJjZWVcXHUyY2YyXFx1MmNmM1xcdTJkMDAtXFx1MmQyNVxcdTJkMjdcXHUyZDJkXFx1MmQzMC1cXHUyZDY3XFx1MmQ2ZlxcdTJkODAtXFx1MmQ5NlxcdTJkYTAtXFx1MmRhNlxcdTJkYTgtXFx1MmRhZVxcdTJkYjAtXFx1MmRiNlxcdTJkYjgtXFx1MmRiZVxcdTJkYzAtXFx1MmRjNlxcdTJkYzgtXFx1MmRjZVxcdTJkZDAtXFx1MmRkNlxcdTJkZDgtXFx1MmRkZVxcdTJlMmZcXHUzMDA1LVxcdTMwMDdcXHUzMDIxLVxcdTMwMjlcXHUzMDMxLVxcdTMwMzVcXHUzMDM4LVxcdTMwM2NcXHUzMDQxLVxcdTMwOTZcXHUzMDlkLVxcdTMwOWZcXHUzMGExLVxcdTMwZmFcXHUzMGZjLVxcdTMwZmZcXHUzMTA1LVxcdTMxMmRcXHUzMTMxLVxcdTMxOGVcXHUzMWEwLVxcdTMxYmFcXHUzMWYwLVxcdTMxZmZcXHUzNDAwLVxcdTRkYjVcXHU0ZTAwLVxcdTlmY2NcXHVhMDAwLVxcdWE0OGNcXHVhNGQwLVxcdWE0ZmRcXHVhNTAwLVxcdWE2MGNcXHVhNjEwLVxcdWE2MWZcXHVhNjJhXFx1YTYyYlxcdWE2NDAtXFx1YTY2ZVxcdWE2N2YtXFx1YTY5N1xcdWE2YTAtXFx1YTZlZlxcdWE3MTctXFx1YTcxZlxcdWE3MjItXFx1YTc4OFxcdWE3OGItXFx1YTc4ZVxcdWE3OTAtXFx1YTc5M1xcdWE3YTAtXFx1YTdhYVxcdWE3ZjgtXFx1YTgwMVxcdWE4MDMtXFx1YTgwNVxcdWE4MDctXFx1YTgwYVxcdWE4MGMtXFx1YTgyMlxcdWE4NDAtXFx1YTg3M1xcdWE4ODItXFx1YThiM1xcdWE4ZjItXFx1YThmN1xcdWE4ZmJcXHVhOTBhLVxcdWE5MjVcXHVhOTMwLVxcdWE5NDZcXHVhOTYwLVxcdWE5N2NcXHVhOTg0LVxcdWE5YjJcXHVhOWNmXFx1YWEwMC1cXHVhYTI4XFx1YWE0MC1cXHVhYTQyXFx1YWE0NC1cXHVhYTRiXFx1YWE2MC1cXHVhYTc2XFx1YWE3YVxcdWFhODAtXFx1YWFhZlxcdWFhYjFcXHVhYWI1XFx1YWFiNlxcdWFhYjktXFx1YWFiZFxcdWFhYzBcXHVhYWMyXFx1YWFkYi1cXHVhYWRkXFx1YWFlMC1cXHVhYWVhXFx1YWFmMi1cXHVhYWY0XFx1YWIwMS1cXHVhYjA2XFx1YWIwOS1cXHVhYjBlXFx1YWIxMS1cXHVhYjE2XFx1YWIyMC1cXHVhYjI2XFx1YWIyOC1cXHVhYjJlXFx1YWJjMC1cXHVhYmUyXFx1YWMwMC1cXHVkN2EzXFx1ZDdiMC1cXHVkN2M2XFx1ZDdjYi1cXHVkN2ZiXFx1ZjkwMC1cXHVmYTZkXFx1ZmE3MC1cXHVmYWQ5XFx1ZmIwMC1cXHVmYjA2XFx1ZmIxMy1cXHVmYjE3XFx1ZmIxZFxcdWZiMWYtXFx1ZmIyOFxcdWZiMmEtXFx1ZmIzNlxcdWZiMzgtXFx1ZmIzY1xcdWZiM2VcXHVmYjQwXFx1ZmI0MVxcdWZiNDNcXHVmYjQ0XFx1ZmI0Ni1cXHVmYmIxXFx1ZmJkMy1cXHVmZDNkXFx1ZmQ1MC1cXHVmZDhmXFx1ZmQ5Mi1cXHVmZGM3XFx1ZmRmMC1cXHVmZGZiXFx1ZmU3MC1cXHVmZTc0XFx1ZmU3Ni1cXHVmZWZjXFx1ZmYyMS1cXHVmZjNhXFx1ZmY0MS1cXHVmZjVhXFx1ZmY2Ni1cXHVmZmJlXFx1ZmZjMi1cXHVmZmM3XFx1ZmZjYS1cXHVmZmNmXFx1ZmZkMi1cXHVmZmQ3XFx1ZmZkYS1cXHVmZmRjXScpLFxuICAgICAgICBOb25Bc2NpaUlkZW50aWZpZXJQYXJ0OiBuZXcgUmVnRXhwKCdbXFx4YWFcXHhiNVxceGJhXFx4YzAtXFx4ZDZcXHhkOC1cXHhmNlxceGY4LVxcdTAyYzFcXHUwMmM2LVxcdTAyZDFcXHUwMmUwLVxcdTAyZTRcXHUwMmVjXFx1MDJlZVxcdTAzMDAtXFx1MDM3NFxcdTAzNzZcXHUwMzc3XFx1MDM3YS1cXHUwMzdkXFx1MDM4NlxcdTAzODgtXFx1MDM4YVxcdTAzOGNcXHUwMzhlLVxcdTAzYTFcXHUwM2EzLVxcdTAzZjVcXHUwM2Y3LVxcdTA0ODFcXHUwNDgzLVxcdTA0ODdcXHUwNDhhLVxcdTA1MjdcXHUwNTMxLVxcdTA1NTZcXHUwNTU5XFx1MDU2MS1cXHUwNTg3XFx1MDU5MS1cXHUwNWJkXFx1MDViZlxcdTA1YzFcXHUwNWMyXFx1MDVjNFxcdTA1YzVcXHUwNWM3XFx1MDVkMC1cXHUwNWVhXFx1MDVmMC1cXHUwNWYyXFx1MDYxMC1cXHUwNjFhXFx1MDYyMC1cXHUwNjY5XFx1MDY2ZS1cXHUwNmQzXFx1MDZkNS1cXHUwNmRjXFx1MDZkZi1cXHUwNmU4XFx1MDZlYS1cXHUwNmZjXFx1MDZmZlxcdTA3MTAtXFx1MDc0YVxcdTA3NGQtXFx1MDdiMVxcdTA3YzAtXFx1MDdmNVxcdTA3ZmFcXHUwODAwLVxcdTA4MmRcXHUwODQwLVxcdTA4NWJcXHUwOGEwXFx1MDhhMi1cXHUwOGFjXFx1MDhlNC1cXHUwOGZlXFx1MDkwMC1cXHUwOTYzXFx1MDk2Ni1cXHUwOTZmXFx1MDk3MS1cXHUwOTc3XFx1MDk3OS1cXHUwOTdmXFx1MDk4MS1cXHUwOTgzXFx1MDk4NS1cXHUwOThjXFx1MDk4ZlxcdTA5OTBcXHUwOTkzLVxcdTA5YThcXHUwOWFhLVxcdTA5YjBcXHUwOWIyXFx1MDliNi1cXHUwOWI5XFx1MDliYy1cXHUwOWM0XFx1MDljN1xcdTA5YzhcXHUwOWNiLVxcdTA5Y2VcXHUwOWQ3XFx1MDlkY1xcdTA5ZGRcXHUwOWRmLVxcdTA5ZTNcXHUwOWU2LVxcdTA5ZjFcXHUwYTAxLVxcdTBhMDNcXHUwYTA1LVxcdTBhMGFcXHUwYTBmXFx1MGExMFxcdTBhMTMtXFx1MGEyOFxcdTBhMmEtXFx1MGEzMFxcdTBhMzJcXHUwYTMzXFx1MGEzNVxcdTBhMzZcXHUwYTM4XFx1MGEzOVxcdTBhM2NcXHUwYTNlLVxcdTBhNDJcXHUwYTQ3XFx1MGE0OFxcdTBhNGItXFx1MGE0ZFxcdTBhNTFcXHUwYTU5LVxcdTBhNWNcXHUwYTVlXFx1MGE2Ni1cXHUwYTc1XFx1MGE4MS1cXHUwYTgzXFx1MGE4NS1cXHUwYThkXFx1MGE4Zi1cXHUwYTkxXFx1MGE5My1cXHUwYWE4XFx1MGFhYS1cXHUwYWIwXFx1MGFiMlxcdTBhYjNcXHUwYWI1LVxcdTBhYjlcXHUwYWJjLVxcdTBhYzVcXHUwYWM3LVxcdTBhYzlcXHUwYWNiLVxcdTBhY2RcXHUwYWQwXFx1MGFlMC1cXHUwYWUzXFx1MGFlNi1cXHUwYWVmXFx1MGIwMS1cXHUwYjAzXFx1MGIwNS1cXHUwYjBjXFx1MGIwZlxcdTBiMTBcXHUwYjEzLVxcdTBiMjhcXHUwYjJhLVxcdTBiMzBcXHUwYjMyXFx1MGIzM1xcdTBiMzUtXFx1MGIzOVxcdTBiM2MtXFx1MGI0NFxcdTBiNDdcXHUwYjQ4XFx1MGI0Yi1cXHUwYjRkXFx1MGI1NlxcdTBiNTdcXHUwYjVjXFx1MGI1ZFxcdTBiNWYtXFx1MGI2M1xcdTBiNjYtXFx1MGI2ZlxcdTBiNzFcXHUwYjgyXFx1MGI4M1xcdTBiODUtXFx1MGI4YVxcdTBiOGUtXFx1MGI5MFxcdTBiOTItXFx1MGI5NVxcdTBiOTlcXHUwYjlhXFx1MGI5Y1xcdTBiOWVcXHUwYjlmXFx1MGJhM1xcdTBiYTRcXHUwYmE4LVxcdTBiYWFcXHUwYmFlLVxcdTBiYjlcXHUwYmJlLVxcdTBiYzJcXHUwYmM2LVxcdTBiYzhcXHUwYmNhLVxcdTBiY2RcXHUwYmQwXFx1MGJkN1xcdTBiZTYtXFx1MGJlZlxcdTBjMDEtXFx1MGMwM1xcdTBjMDUtXFx1MGMwY1xcdTBjMGUtXFx1MGMxMFxcdTBjMTItXFx1MGMyOFxcdTBjMmEtXFx1MGMzM1xcdTBjMzUtXFx1MGMzOVxcdTBjM2QtXFx1MGM0NFxcdTBjNDYtXFx1MGM0OFxcdTBjNGEtXFx1MGM0ZFxcdTBjNTVcXHUwYzU2XFx1MGM1OFxcdTBjNTlcXHUwYzYwLVxcdTBjNjNcXHUwYzY2LVxcdTBjNmZcXHUwYzgyXFx1MGM4M1xcdTBjODUtXFx1MGM4Y1xcdTBjOGUtXFx1MGM5MFxcdTBjOTItXFx1MGNhOFxcdTBjYWEtXFx1MGNiM1xcdTBjYjUtXFx1MGNiOVxcdTBjYmMtXFx1MGNjNFxcdTBjYzYtXFx1MGNjOFxcdTBjY2EtXFx1MGNjZFxcdTBjZDVcXHUwY2Q2XFx1MGNkZVxcdTBjZTAtXFx1MGNlM1xcdTBjZTYtXFx1MGNlZlxcdTBjZjFcXHUwY2YyXFx1MGQwMlxcdTBkMDNcXHUwZDA1LVxcdTBkMGNcXHUwZDBlLVxcdTBkMTBcXHUwZDEyLVxcdTBkM2FcXHUwZDNkLVxcdTBkNDRcXHUwZDQ2LVxcdTBkNDhcXHUwZDRhLVxcdTBkNGVcXHUwZDU3XFx1MGQ2MC1cXHUwZDYzXFx1MGQ2Ni1cXHUwZDZmXFx1MGQ3YS1cXHUwZDdmXFx1MGQ4MlxcdTBkODNcXHUwZDg1LVxcdTBkOTZcXHUwZDlhLVxcdTBkYjFcXHUwZGIzLVxcdTBkYmJcXHUwZGJkXFx1MGRjMC1cXHUwZGM2XFx1MGRjYVxcdTBkY2YtXFx1MGRkNFxcdTBkZDZcXHUwZGQ4LVxcdTBkZGZcXHUwZGYyXFx1MGRmM1xcdTBlMDEtXFx1MGUzYVxcdTBlNDAtXFx1MGU0ZVxcdTBlNTAtXFx1MGU1OVxcdTBlODFcXHUwZTgyXFx1MGU4NFxcdTBlODdcXHUwZTg4XFx1MGU4YVxcdTBlOGRcXHUwZTk0LVxcdTBlOTdcXHUwZTk5LVxcdTBlOWZcXHUwZWExLVxcdTBlYTNcXHUwZWE1XFx1MGVhN1xcdTBlYWFcXHUwZWFiXFx1MGVhZC1cXHUwZWI5XFx1MGViYi1cXHUwZWJkXFx1MGVjMC1cXHUwZWM0XFx1MGVjNlxcdTBlYzgtXFx1MGVjZFxcdTBlZDAtXFx1MGVkOVxcdTBlZGMtXFx1MGVkZlxcdTBmMDBcXHUwZjE4XFx1MGYxOVxcdTBmMjAtXFx1MGYyOVxcdTBmMzVcXHUwZjM3XFx1MGYzOVxcdTBmM2UtXFx1MGY0N1xcdTBmNDktXFx1MGY2Y1xcdTBmNzEtXFx1MGY4NFxcdTBmODYtXFx1MGY5N1xcdTBmOTktXFx1MGZiY1xcdTBmYzZcXHUxMDAwLVxcdTEwNDlcXHUxMDUwLVxcdTEwOWRcXHUxMGEwLVxcdTEwYzVcXHUxMGM3XFx1MTBjZFxcdTEwZDAtXFx1MTBmYVxcdTEwZmMtXFx1MTI0OFxcdTEyNGEtXFx1MTI0ZFxcdTEyNTAtXFx1MTI1NlxcdTEyNThcXHUxMjVhLVxcdTEyNWRcXHUxMjYwLVxcdTEyODhcXHUxMjhhLVxcdTEyOGRcXHUxMjkwLVxcdTEyYjBcXHUxMmIyLVxcdTEyYjVcXHUxMmI4LVxcdTEyYmVcXHUxMmMwXFx1MTJjMi1cXHUxMmM1XFx1MTJjOC1cXHUxMmQ2XFx1MTJkOC1cXHUxMzEwXFx1MTMxMi1cXHUxMzE1XFx1MTMxOC1cXHUxMzVhXFx1MTM1ZC1cXHUxMzVmXFx1MTM4MC1cXHUxMzhmXFx1MTNhMC1cXHUxM2Y0XFx1MTQwMS1cXHUxNjZjXFx1MTY2Zi1cXHUxNjdmXFx1MTY4MS1cXHUxNjlhXFx1MTZhMC1cXHUxNmVhXFx1MTZlZS1cXHUxNmYwXFx1MTcwMC1cXHUxNzBjXFx1MTcwZS1cXHUxNzE0XFx1MTcyMC1cXHUxNzM0XFx1MTc0MC1cXHUxNzUzXFx1MTc2MC1cXHUxNzZjXFx1MTc2ZS1cXHUxNzcwXFx1MTc3MlxcdTE3NzNcXHUxNzgwLVxcdTE3ZDNcXHUxN2Q3XFx1MTdkY1xcdTE3ZGRcXHUxN2UwLVxcdTE3ZTlcXHUxODBiLVxcdTE4MGRcXHUxODEwLVxcdTE4MTlcXHUxODIwLVxcdTE4NzdcXHUxODgwLVxcdTE4YWFcXHUxOGIwLVxcdTE4ZjVcXHUxOTAwLVxcdTE5MWNcXHUxOTIwLVxcdTE5MmJcXHUxOTMwLVxcdTE5M2JcXHUxOTQ2LVxcdTE5NmRcXHUxOTcwLVxcdTE5NzRcXHUxOTgwLVxcdTE5YWJcXHUxOWIwLVxcdTE5YzlcXHUxOWQwLVxcdTE5ZDlcXHUxYTAwLVxcdTFhMWJcXHUxYTIwLVxcdTFhNWVcXHUxYTYwLVxcdTFhN2NcXHUxYTdmLVxcdTFhODlcXHUxYTkwLVxcdTFhOTlcXHUxYWE3XFx1MWIwMC1cXHUxYjRiXFx1MWI1MC1cXHUxYjU5XFx1MWI2Yi1cXHUxYjczXFx1MWI4MC1cXHUxYmYzXFx1MWMwMC1cXHUxYzM3XFx1MWM0MC1cXHUxYzQ5XFx1MWM0ZC1cXHUxYzdkXFx1MWNkMC1cXHUxY2QyXFx1MWNkNC1cXHUxY2Y2XFx1MWQwMC1cXHUxZGU2XFx1MWRmYy1cXHUxZjE1XFx1MWYxOC1cXHUxZjFkXFx1MWYyMC1cXHUxZjQ1XFx1MWY0OC1cXHUxZjRkXFx1MWY1MC1cXHUxZjU3XFx1MWY1OVxcdTFmNWJcXHUxZjVkXFx1MWY1Zi1cXHUxZjdkXFx1MWY4MC1cXHUxZmI0XFx1MWZiNi1cXHUxZmJjXFx1MWZiZVxcdTFmYzItXFx1MWZjNFxcdTFmYzYtXFx1MWZjY1xcdTFmZDAtXFx1MWZkM1xcdTFmZDYtXFx1MWZkYlxcdTFmZTAtXFx1MWZlY1xcdTFmZjItXFx1MWZmNFxcdTFmZjYtXFx1MWZmY1xcdTIwMGNcXHUyMDBkXFx1MjAzZlxcdTIwNDBcXHUyMDU0XFx1MjA3MVxcdTIwN2ZcXHUyMDkwLVxcdTIwOWNcXHUyMGQwLVxcdTIwZGNcXHUyMGUxXFx1MjBlNS1cXHUyMGYwXFx1MjEwMlxcdTIxMDdcXHUyMTBhLVxcdTIxMTNcXHUyMTE1XFx1MjExOS1cXHUyMTFkXFx1MjEyNFxcdTIxMjZcXHUyMTI4XFx1MjEyYS1cXHUyMTJkXFx1MjEyZi1cXHUyMTM5XFx1MjEzYy1cXHUyMTNmXFx1MjE0NS1cXHUyMTQ5XFx1MjE0ZVxcdTIxNjAtXFx1MjE4OFxcdTJjMDAtXFx1MmMyZVxcdTJjMzAtXFx1MmM1ZVxcdTJjNjAtXFx1MmNlNFxcdTJjZWItXFx1MmNmM1xcdTJkMDAtXFx1MmQyNVxcdTJkMjdcXHUyZDJkXFx1MmQzMC1cXHUyZDY3XFx1MmQ2ZlxcdTJkN2YtXFx1MmQ5NlxcdTJkYTAtXFx1MmRhNlxcdTJkYTgtXFx1MmRhZVxcdTJkYjAtXFx1MmRiNlxcdTJkYjgtXFx1MmRiZVxcdTJkYzAtXFx1MmRjNlxcdTJkYzgtXFx1MmRjZVxcdTJkZDAtXFx1MmRkNlxcdTJkZDgtXFx1MmRkZVxcdTJkZTAtXFx1MmRmZlxcdTJlMmZcXHUzMDA1LVxcdTMwMDdcXHUzMDIxLVxcdTMwMmZcXHUzMDMxLVxcdTMwMzVcXHUzMDM4LVxcdTMwM2NcXHUzMDQxLVxcdTMwOTZcXHUzMDk5XFx1MzA5YVxcdTMwOWQtXFx1MzA5ZlxcdTMwYTEtXFx1MzBmYVxcdTMwZmMtXFx1MzBmZlxcdTMxMDUtXFx1MzEyZFxcdTMxMzEtXFx1MzE4ZVxcdTMxYTAtXFx1MzFiYVxcdTMxZjAtXFx1MzFmZlxcdTM0MDAtXFx1NGRiNVxcdTRlMDAtXFx1OWZjY1xcdWEwMDAtXFx1YTQ4Y1xcdWE0ZDAtXFx1YTRmZFxcdWE1MDAtXFx1YTYwY1xcdWE2MTAtXFx1YTYyYlxcdWE2NDAtXFx1YTY2ZlxcdWE2NzQtXFx1YTY3ZFxcdWE2N2YtXFx1YTY5N1xcdWE2OWYtXFx1YTZmMVxcdWE3MTctXFx1YTcxZlxcdWE3MjItXFx1YTc4OFxcdWE3OGItXFx1YTc4ZVxcdWE3OTAtXFx1YTc5M1xcdWE3YTAtXFx1YTdhYVxcdWE3ZjgtXFx1YTgyN1xcdWE4NDAtXFx1YTg3M1xcdWE4ODAtXFx1YThjNFxcdWE4ZDAtXFx1YThkOVxcdWE4ZTAtXFx1YThmN1xcdWE4ZmJcXHVhOTAwLVxcdWE5MmRcXHVhOTMwLVxcdWE5NTNcXHVhOTYwLVxcdWE5N2NcXHVhOTgwLVxcdWE5YzBcXHVhOWNmLVxcdWE5ZDlcXHVhYTAwLVxcdWFhMzZcXHVhYTQwLVxcdWFhNGRcXHVhYTUwLVxcdWFhNTlcXHVhYTYwLVxcdWFhNzZcXHVhYTdhXFx1YWE3YlxcdWFhODAtXFx1YWFjMlxcdWFhZGItXFx1YWFkZFxcdWFhZTAtXFx1YWFlZlxcdWFhZjItXFx1YWFmNlxcdWFiMDEtXFx1YWIwNlxcdWFiMDktXFx1YWIwZVxcdWFiMTEtXFx1YWIxNlxcdWFiMjAtXFx1YWIyNlxcdWFiMjgtXFx1YWIyZVxcdWFiYzAtXFx1YWJlYVxcdWFiZWNcXHVhYmVkXFx1YWJmMC1cXHVhYmY5XFx1YWMwMC1cXHVkN2EzXFx1ZDdiMC1cXHVkN2M2XFx1ZDdjYi1cXHVkN2ZiXFx1ZjkwMC1cXHVmYTZkXFx1ZmE3MC1cXHVmYWQ5XFx1ZmIwMC1cXHVmYjA2XFx1ZmIxMy1cXHVmYjE3XFx1ZmIxZC1cXHVmYjI4XFx1ZmIyYS1cXHVmYjM2XFx1ZmIzOC1cXHVmYjNjXFx1ZmIzZVxcdWZiNDBcXHVmYjQxXFx1ZmI0M1xcdWZiNDRcXHVmYjQ2LVxcdWZiYjFcXHVmYmQzLVxcdWZkM2RcXHVmZDUwLVxcdWZkOGZcXHVmZDkyLVxcdWZkYzdcXHVmZGYwLVxcdWZkZmJcXHVmZTAwLVxcdWZlMGZcXHVmZTIwLVxcdWZlMjZcXHVmZTMzXFx1ZmUzNFxcdWZlNGQtXFx1ZmU0ZlxcdWZlNzAtXFx1ZmU3NFxcdWZlNzYtXFx1ZmVmY1xcdWZmMTAtXFx1ZmYxOVxcdWZmMjEtXFx1ZmYzYVxcdWZmM2ZcXHVmZjQxLVxcdWZmNWFcXHVmZjY2LVxcdWZmYmVcXHVmZmMyLVxcdWZmYzdcXHVmZmNhLVxcdWZmY2ZcXHVmZmQyLVxcdWZmZDdcXHVmZmRhLVxcdWZmZGNdJylcbiAgICB9O1xuXG4gICAgLy8gRW5zdXJlIHRoZSBjb25kaXRpb24gaXMgdHJ1ZSwgb3RoZXJ3aXNlIHRocm93IGFuIGVycm9yLlxuICAgIC8vIFRoaXMgaXMgb25seSB0byBoYXZlIGEgYmV0dGVyIGNvbnRyYWN0IHNlbWFudGljLCBpLmUuIGFub3RoZXIgc2FmZXR5IG5ldFxuICAgIC8vIHRvIGNhdGNoIGEgbG9naWMgZXJyb3IuIFRoZSBjb25kaXRpb24gc2hhbGwgYmUgZnVsZmlsbGVkIGluIG5vcm1hbCBjYXNlLlxuICAgIC8vIERvIE5PVCB1c2UgdGhpcyB0byBlbmZvcmNlIGEgY2VydGFpbiBjb25kaXRpb24gb24gYW55IHVzZXIgaW5wdXQuXG5cbiAgICBmdW5jdGlvbiBhc3NlcnQoY29uZGl0aW9uLCBtZXNzYWdlKSB7XG4gICAgICAgIGlmICghY29uZGl0aW9uKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0FTU0VSVDogJyArIG1lc3NhZ2UpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gc2xpY2VTb3VyY2UoZnJvbSwgdG8pIHtcbiAgICAgICAgcmV0dXJuIHNvdXJjZS5zbGljZShmcm9tLCB0byk7XG4gICAgfVxuXG4gICAgaWYgKHR5cGVvZiAnZXNwcmltYSdbMF0gPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgIHNsaWNlU291cmNlID0gZnVuY3Rpb24gc2xpY2VBcnJheVNvdXJjZShmcm9tLCB0bykge1xuICAgICAgICAgICAgcmV0dXJuIHNvdXJjZS5zbGljZShmcm9tLCB0bykuam9pbignJyk7XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gaXNEZWNpbWFsRGlnaXQoY2gpIHtcbiAgICAgICAgcmV0dXJuICcwMTIzNDU2Nzg5Jy5pbmRleE9mKGNoKSA+PSAwO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGlzSGV4RGlnaXQoY2gpIHtcbiAgICAgICAgcmV0dXJuICcwMTIzNDU2Nzg5YWJjZGVmQUJDREVGJy5pbmRleE9mKGNoKSA+PSAwO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGlzT2N0YWxEaWdpdChjaCkge1xuICAgICAgICByZXR1cm4gJzAxMjM0NTY3Jy5pbmRleE9mKGNoKSA+PSAwO1xuICAgIH1cblxuXG4gICAgLy8gNy4yIFdoaXRlIFNwYWNlXG5cbiAgICBmdW5jdGlvbiBpc1doaXRlU3BhY2UoY2gpIHtcbiAgICAgICAgcmV0dXJuIChjaCA9PT0gJyAnKSB8fCAoY2ggPT09ICdcXHUwMDA5JykgfHwgKGNoID09PSAnXFx1MDAwQicpIHx8XG4gICAgICAgICAgICAoY2ggPT09ICdcXHUwMDBDJykgfHwgKGNoID09PSAnXFx1MDBBMCcpIHx8XG4gICAgICAgICAgICAoY2guY2hhckNvZGVBdCgwKSA+PSAweDE2ODAgJiZcbiAgICAgICAgICAgICAnXFx1MTY4MFxcdTE4MEVcXHUyMDAwXFx1MjAwMVxcdTIwMDJcXHUyMDAzXFx1MjAwNFxcdTIwMDVcXHUyMDA2XFx1MjAwN1xcdTIwMDhcXHUyMDA5XFx1MjAwQVxcdTIwMkZcXHUyMDVGXFx1MzAwMFxcdUZFRkYnLmluZGV4T2YoY2gpID49IDApO1xuICAgIH1cblxuICAgIC8vIDcuMyBMaW5lIFRlcm1pbmF0b3JzXG5cbiAgICBmdW5jdGlvbiBpc0xpbmVUZXJtaW5hdG9yKGNoKSB7XG4gICAgICAgIHJldHVybiAoY2ggPT09ICdcXG4nIHx8IGNoID09PSAnXFxyJyB8fCBjaCA9PT0gJ1xcdTIwMjgnIHx8IGNoID09PSAnXFx1MjAyOScpO1xuICAgIH1cblxuICAgIC8vIDcuNiBJZGVudGlmaWVyIE5hbWVzIGFuZCBJZGVudGlmaWVyc1xuXG4gICAgZnVuY3Rpb24gaXNJZGVudGlmaWVyU3RhcnQoY2gpIHtcbiAgICAgICAgcmV0dXJuIChjaCA9PT0gJyQnKSB8fCAoY2ggPT09ICdfJykgfHwgKGNoID09PSAnXFxcXCcpIHx8XG4gICAgICAgICAgICAoY2ggPj0gJ2EnICYmIGNoIDw9ICd6JykgfHwgKGNoID49ICdBJyAmJiBjaCA8PSAnWicpIHx8XG4gICAgICAgICAgICAoKGNoLmNoYXJDb2RlQXQoMCkgPj0gMHg4MCkgJiYgUmVnZXguTm9uQXNjaWlJZGVudGlmaWVyU3RhcnQudGVzdChjaCkpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGlzSWRlbnRpZmllclBhcnQoY2gpIHtcbiAgICAgICAgcmV0dXJuIChjaCA9PT0gJyQnKSB8fCAoY2ggPT09ICdfJykgfHwgKGNoID09PSAnXFxcXCcpIHx8XG4gICAgICAgICAgICAoY2ggPj0gJ2EnICYmIGNoIDw9ICd6JykgfHwgKGNoID49ICdBJyAmJiBjaCA8PSAnWicpIHx8XG4gICAgICAgICAgICAoKGNoID49ICcwJykgJiYgKGNoIDw9ICc5JykpIHx8XG4gICAgICAgICAgICAoKGNoLmNoYXJDb2RlQXQoMCkgPj0gMHg4MCkgJiYgUmVnZXguTm9uQXNjaWlJZGVudGlmaWVyUGFydC50ZXN0KGNoKSk7XG4gICAgfVxuXG4gICAgLy8gNy42LjEuMiBGdXR1cmUgUmVzZXJ2ZWQgV29yZHNcblxuICAgIGZ1bmN0aW9uIGlzRnV0dXJlUmVzZXJ2ZWRXb3JkKGlkKSB7XG4gICAgICAgIHN3aXRjaCAoaWQpIHtcblxuICAgICAgICAvLyBGdXR1cmUgcmVzZXJ2ZWQgd29yZHMuXG4gICAgICAgIGNhc2UgJ2NsYXNzJzpcbiAgICAgICAgY2FzZSAnZW51bSc6XG4gICAgICAgIGNhc2UgJ2V4cG9ydCc6XG4gICAgICAgIGNhc2UgJ2V4dGVuZHMnOlxuICAgICAgICBjYXNlICdpbXBvcnQnOlxuICAgICAgICBjYXNlICdzdXBlcic6XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBpc1N0cmljdE1vZGVSZXNlcnZlZFdvcmQoaWQpIHtcbiAgICAgICAgc3dpdGNoIChpZCkge1xuXG4gICAgICAgIC8vIFN0cmljdCBNb2RlIHJlc2VydmVkIHdvcmRzLlxuICAgICAgICBjYXNlICdpbXBsZW1lbnRzJzpcbiAgICAgICAgY2FzZSAnaW50ZXJmYWNlJzpcbiAgICAgICAgY2FzZSAncGFja2FnZSc6XG4gICAgICAgIGNhc2UgJ3ByaXZhdGUnOlxuICAgICAgICBjYXNlICdwcm90ZWN0ZWQnOlxuICAgICAgICBjYXNlICdwdWJsaWMnOlxuICAgICAgICBjYXNlICdzdGF0aWMnOlxuICAgICAgICBjYXNlICd5aWVsZCc6XG4gICAgICAgIGNhc2UgJ2xldCc6XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBpc1Jlc3RyaWN0ZWRXb3JkKGlkKSB7XG4gICAgICAgIHJldHVybiBpZCA9PT0gJ2V2YWwnIHx8IGlkID09PSAnYXJndW1lbnRzJztcbiAgICB9XG5cbiAgICAvLyA3LjYuMS4xIEtleXdvcmRzXG5cbiAgICBmdW5jdGlvbiBpc0tleXdvcmQoaWQpIHtcbiAgICAgICAgdmFyIGtleXdvcmQgPSBmYWxzZTtcbiAgICAgICAgc3dpdGNoIChpZC5sZW5ndGgpIHtcbiAgICAgICAgY2FzZSAyOlxuICAgICAgICAgICAga2V5d29yZCA9IChpZCA9PT0gJ2lmJykgfHwgKGlkID09PSAnaW4nKSB8fCAoaWQgPT09ICdkbycpO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgMzpcbiAgICAgICAgICAgIGtleXdvcmQgPSAoaWQgPT09ICd2YXInKSB8fCAoaWQgPT09ICdmb3InKSB8fCAoaWQgPT09ICduZXcnKSB8fCAoaWQgPT09ICd0cnknKTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIDQ6XG4gICAgICAgICAgICBrZXl3b3JkID0gKGlkID09PSAndGhpcycpIHx8IChpZCA9PT0gJ2Vsc2UnKSB8fCAoaWQgPT09ICdjYXNlJykgfHwgKGlkID09PSAndm9pZCcpIHx8IChpZCA9PT0gJ3dpdGgnKTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIDU6XG4gICAgICAgICAgICBrZXl3b3JkID0gKGlkID09PSAnd2hpbGUnKSB8fCAoaWQgPT09ICdicmVhaycpIHx8IChpZCA9PT0gJ2NhdGNoJykgfHwgKGlkID09PSAndGhyb3cnKTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIDY6XG4gICAgICAgICAgICBrZXl3b3JkID0gKGlkID09PSAncmV0dXJuJykgfHwgKGlkID09PSAndHlwZW9mJykgfHwgKGlkID09PSAnZGVsZXRlJykgfHwgKGlkID09PSAnc3dpdGNoJyk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSA3OlxuICAgICAgICAgICAga2V5d29yZCA9IChpZCA9PT0gJ2RlZmF1bHQnKSB8fCAoaWQgPT09ICdmaW5hbGx5Jyk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSA4OlxuICAgICAgICAgICAga2V5d29yZCA9IChpZCA9PT0gJ2Z1bmN0aW9uJykgfHwgKGlkID09PSAnY29udGludWUnKSB8fCAoaWQgPT09ICdkZWJ1Z2dlcicpO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgMTA6XG4gICAgICAgICAgICBrZXl3b3JkID0gKGlkID09PSAnaW5zdGFuY2VvZicpO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoa2V5d29yZCkge1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cblxuICAgICAgICBzd2l0Y2ggKGlkKSB7XG4gICAgICAgIC8vIEZ1dHVyZSByZXNlcnZlZCB3b3Jkcy5cbiAgICAgICAgLy8gJ2NvbnN0JyBpcyBzcGVjaWFsaXplZCBhcyBLZXl3b3JkIGluIFY4LlxuICAgICAgICBjYXNlICdjb25zdCc6XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcblxuICAgICAgICAvLyBGb3IgY29tcGF0aWJsaXR5IHRvIFNwaWRlck1vbmtleSBhbmQgRVMubmV4dFxuICAgICAgICBjYXNlICd5aWVsZCc6XG4gICAgICAgIGNhc2UgJ2xldCc6XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChzdHJpY3QgJiYgaXNTdHJpY3RNb2RlUmVzZXJ2ZWRXb3JkKGlkKSkge1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gaXNGdXR1cmVSZXNlcnZlZFdvcmQoaWQpO1xuICAgIH1cblxuICAgIC8vIDcuNCBDb21tZW50c1xuXG4gICAgZnVuY3Rpb24gc2tpcENvbW1lbnQoKSB7XG4gICAgICAgIHZhciBjaCwgYmxvY2tDb21tZW50LCBsaW5lQ29tbWVudDtcblxuICAgICAgICBibG9ja0NvbW1lbnQgPSBmYWxzZTtcbiAgICAgICAgbGluZUNvbW1lbnQgPSBmYWxzZTtcblxuICAgICAgICB3aGlsZSAoaW5kZXggPCBsZW5ndGgpIHtcbiAgICAgICAgICAgIGNoID0gc291cmNlW2luZGV4XTtcblxuICAgICAgICAgICAgaWYgKGxpbmVDb21tZW50KSB7XG4gICAgICAgICAgICAgICAgY2ggPSBzb3VyY2VbaW5kZXgrK107XG4gICAgICAgICAgICAgICAgaWYgKGlzTGluZVRlcm1pbmF0b3IoY2gpKSB7XG4gICAgICAgICAgICAgICAgICAgIGxpbmVDb21tZW50ID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgIGlmIChjaCA9PT0gJ1xccicgJiYgc291cmNlW2luZGV4XSA9PT0gJ1xcbicpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICsraW5kZXg7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgKytsaW5lTnVtYmVyO1xuICAgICAgICAgICAgICAgICAgICBsaW5lU3RhcnQgPSBpbmRleDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGJsb2NrQ29tbWVudCkge1xuICAgICAgICAgICAgICAgIGlmIChpc0xpbmVUZXJtaW5hdG9yKGNoKSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoY2ggPT09ICdcXHInICYmIHNvdXJjZVtpbmRleCArIDFdID09PSAnXFxuJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgKytpbmRleDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICArK2xpbmVOdW1iZXI7XG4gICAgICAgICAgICAgICAgICAgICsraW5kZXg7XG4gICAgICAgICAgICAgICAgICAgIGxpbmVTdGFydCA9IGluZGV4O1xuICAgICAgICAgICAgICAgICAgICBpZiAoaW5kZXggPj0gbGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aHJvd0Vycm9yKHt9LCBNZXNzYWdlcy5VbmV4cGVjdGVkVG9rZW4sICdJTExFR0FMJyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBjaCA9IHNvdXJjZVtpbmRleCsrXTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGluZGV4ID49IGxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3dFcnJvcih7fSwgTWVzc2FnZXMuVW5leHBlY3RlZFRva2VuLCAnSUxMRUdBTCcpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGlmIChjaCA9PT0gJyonKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjaCA9IHNvdXJjZVtpbmRleF07XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoY2ggPT09ICcvJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICsraW5kZXg7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYmxvY2tDb21tZW50ID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGNoID09PSAnLycpIHtcbiAgICAgICAgICAgICAgICBjaCA9IHNvdXJjZVtpbmRleCArIDFdO1xuICAgICAgICAgICAgICAgIGlmIChjaCA9PT0gJy8nKSB7XG4gICAgICAgICAgICAgICAgICAgIGluZGV4ICs9IDI7XG4gICAgICAgICAgICAgICAgICAgIGxpbmVDb21tZW50ID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGNoID09PSAnKicpIHtcbiAgICAgICAgICAgICAgICAgICAgaW5kZXggKz0gMjtcbiAgICAgICAgICAgICAgICAgICAgYmxvY2tDb21tZW50ID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGluZGV4ID49IGxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3dFcnJvcih7fSwgTWVzc2FnZXMuVW5leHBlY3RlZFRva2VuLCAnSUxMRUdBTCcpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIGlmIChpc1doaXRlU3BhY2UoY2gpKSB7XG4gICAgICAgICAgICAgICAgKytpbmRleDtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoaXNMaW5lVGVybWluYXRvcihjaCkpIHtcbiAgICAgICAgICAgICAgICArK2luZGV4O1xuICAgICAgICAgICAgICAgIGlmIChjaCA9PT0gICdcXHInICYmIHNvdXJjZVtpbmRleF0gPT09ICdcXG4nKSB7XG4gICAgICAgICAgICAgICAgICAgICsraW5kZXg7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICsrbGluZU51bWJlcjtcbiAgICAgICAgICAgICAgICBsaW5lU3RhcnQgPSBpbmRleDtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBzY2FuSGV4RXNjYXBlKHByZWZpeCkge1xuICAgICAgICB2YXIgaSwgbGVuLCBjaCwgY29kZSA9IDA7XG5cbiAgICAgICAgbGVuID0gKHByZWZpeCA9PT0gJ3UnKSA/IDQgOiAyO1xuICAgICAgICBmb3IgKGkgPSAwOyBpIDwgbGVuOyArK2kpIHtcbiAgICAgICAgICAgIGlmIChpbmRleCA8IGxlbmd0aCAmJiBpc0hleERpZ2l0KHNvdXJjZVtpbmRleF0pKSB7XG4gICAgICAgICAgICAgICAgY2ggPSBzb3VyY2VbaW5kZXgrK107XG4gICAgICAgICAgICAgICAgY29kZSA9IGNvZGUgKiAxNiArICcwMTIzNDU2Nzg5YWJjZGVmJy5pbmRleE9mKGNoLnRvTG93ZXJDYXNlKCkpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gJyc7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIFN0cmluZy5mcm9tQ2hhckNvZGUoY29kZSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gc2NhbklkZW50aWZpZXIoKSB7XG4gICAgICAgIHZhciBjaCwgc3RhcnQsIGlkLCByZXN0b3JlO1xuXG4gICAgICAgIGNoID0gc291cmNlW2luZGV4XTtcbiAgICAgICAgaWYgKCFpc0lkZW50aWZpZXJTdGFydChjaCkpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIHN0YXJ0ID0gaW5kZXg7XG4gICAgICAgIGlmIChjaCA9PT0gJ1xcXFwnKSB7XG4gICAgICAgICAgICArK2luZGV4O1xuICAgICAgICAgICAgaWYgKHNvdXJjZVtpbmRleF0gIT09ICd1Jykge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgICsraW5kZXg7XG4gICAgICAgICAgICByZXN0b3JlID0gaW5kZXg7XG4gICAgICAgICAgICBjaCA9IHNjYW5IZXhFc2NhcGUoJ3UnKTtcbiAgICAgICAgICAgIGlmIChjaCkge1xuICAgICAgICAgICAgICAgIGlmIChjaCA9PT0gJ1xcXFwnIHx8ICFpc0lkZW50aWZpZXJTdGFydChjaCkpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZCA9IGNoO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBpbmRleCA9IHJlc3RvcmU7XG4gICAgICAgICAgICAgICAgaWQgPSAndSc7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBpZCA9IHNvdXJjZVtpbmRleCsrXTtcbiAgICAgICAgfVxuXG4gICAgICAgIHdoaWxlIChpbmRleCA8IGxlbmd0aCkge1xuICAgICAgICAgICAgY2ggPSBzb3VyY2VbaW5kZXhdO1xuICAgICAgICAgICAgaWYgKCFpc0lkZW50aWZpZXJQYXJ0KGNoKSkge1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGNoID09PSAnXFxcXCcpIHtcbiAgICAgICAgICAgICAgICArK2luZGV4O1xuICAgICAgICAgICAgICAgIGlmIChzb3VyY2VbaW5kZXhdICE9PSAndScpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICArK2luZGV4O1xuICAgICAgICAgICAgICAgIHJlc3RvcmUgPSBpbmRleDtcbiAgICAgICAgICAgICAgICBjaCA9IHNjYW5IZXhFc2NhcGUoJ3UnKTtcbiAgICAgICAgICAgICAgICBpZiAoY2gpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGNoID09PSAnXFxcXCcgfHwgIWlzSWRlbnRpZmllclBhcnQoY2gpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgaWQgKz0gY2g7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgaW5kZXggPSByZXN0b3JlO1xuICAgICAgICAgICAgICAgICAgICBpZCArPSAndSc7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBpZCArPSBzb3VyY2VbaW5kZXgrK107XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyBUaGVyZSBpcyBubyBrZXl3b3JkIG9yIGxpdGVyYWwgd2l0aCBvbmx5IG9uZSBjaGFyYWN0ZXIuXG4gICAgICAgIC8vIFRodXMsIGl0IG11c3QgYmUgYW4gaWRlbnRpZmllci5cbiAgICAgICAgaWYgKGlkLmxlbmd0aCA9PT0gMSkge1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICB0eXBlOiBUb2tlbi5JZGVudGlmaWVyLFxuICAgICAgICAgICAgICAgIHZhbHVlOiBpZCxcbiAgICAgICAgICAgICAgICBsaW5lTnVtYmVyOiBsaW5lTnVtYmVyLFxuICAgICAgICAgICAgICAgIGxpbmVTdGFydDogbGluZVN0YXJ0LFxuICAgICAgICAgICAgICAgIHJhbmdlOiBbc3RhcnQsIGluZGV4XVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChpc0tleXdvcmQoaWQpKSB7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHR5cGU6IFRva2VuLktleXdvcmQsXG4gICAgICAgICAgICAgICAgdmFsdWU6IGlkLFxuICAgICAgICAgICAgICAgIGxpbmVOdW1iZXI6IGxpbmVOdW1iZXIsXG4gICAgICAgICAgICAgICAgbGluZVN0YXJ0OiBsaW5lU3RhcnQsXG4gICAgICAgICAgICAgICAgcmFuZ2U6IFtzdGFydCwgaW5kZXhdXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gNy44LjEgTnVsbCBMaXRlcmFsc1xuXG4gICAgICAgIGlmIChpZCA9PT0gJ251bGwnKSB7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHR5cGU6IFRva2VuLk51bGxMaXRlcmFsLFxuICAgICAgICAgICAgICAgIHZhbHVlOiBpZCxcbiAgICAgICAgICAgICAgICBsaW5lTnVtYmVyOiBsaW5lTnVtYmVyLFxuICAgICAgICAgICAgICAgIGxpbmVTdGFydDogbGluZVN0YXJ0LFxuICAgICAgICAgICAgICAgIHJhbmdlOiBbc3RhcnQsIGluZGV4XVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIDcuOC4yIEJvb2xlYW4gTGl0ZXJhbHNcblxuICAgICAgICBpZiAoaWQgPT09ICd0cnVlJyB8fCBpZCA9PT0gJ2ZhbHNlJykge1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICB0eXBlOiBUb2tlbi5Cb29sZWFuTGl0ZXJhbCxcbiAgICAgICAgICAgICAgICB2YWx1ZTogaWQsXG4gICAgICAgICAgICAgICAgbGluZU51bWJlcjogbGluZU51bWJlcixcbiAgICAgICAgICAgICAgICBsaW5lU3RhcnQ6IGxpbmVTdGFydCxcbiAgICAgICAgICAgICAgICByYW5nZTogW3N0YXJ0LCBpbmRleF1cbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgdHlwZTogVG9rZW4uSWRlbnRpZmllcixcbiAgICAgICAgICAgIHZhbHVlOiBpZCxcbiAgICAgICAgICAgIGxpbmVOdW1iZXI6IGxpbmVOdW1iZXIsXG4gICAgICAgICAgICBsaW5lU3RhcnQ6IGxpbmVTdGFydCxcbiAgICAgICAgICAgIHJhbmdlOiBbc3RhcnQsIGluZGV4XVxuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8vIDcuNyBQdW5jdHVhdG9yc1xuXG4gICAgZnVuY3Rpb24gc2NhblB1bmN0dWF0b3IoKSB7XG4gICAgICAgIHZhciBzdGFydCA9IGluZGV4LFxuICAgICAgICAgICAgY2gxID0gc291cmNlW2luZGV4XSxcbiAgICAgICAgICAgIGNoMixcbiAgICAgICAgICAgIGNoMyxcbiAgICAgICAgICAgIGNoNDtcblxuICAgICAgICAvLyBDaGVjayBmb3IgbW9zdCBjb21tb24gc2luZ2xlLWNoYXJhY3RlciBwdW5jdHVhdG9ycy5cblxuICAgICAgICBpZiAoY2gxID09PSAnOycgfHwgY2gxID09PSAneycgfHwgY2gxID09PSAnfScpIHtcbiAgICAgICAgICAgICsraW5kZXg7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHR5cGU6IFRva2VuLlB1bmN0dWF0b3IsXG4gICAgICAgICAgICAgICAgdmFsdWU6IGNoMSxcbiAgICAgICAgICAgICAgICBsaW5lTnVtYmVyOiBsaW5lTnVtYmVyLFxuICAgICAgICAgICAgICAgIGxpbmVTdGFydDogbGluZVN0YXJ0LFxuICAgICAgICAgICAgICAgIHJhbmdlOiBbc3RhcnQsIGluZGV4XVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChjaDEgPT09ICcsJyB8fCBjaDEgPT09ICcoJyB8fCBjaDEgPT09ICcpJykge1xuICAgICAgICAgICAgKytpbmRleDtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgdHlwZTogVG9rZW4uUHVuY3R1YXRvcixcbiAgICAgICAgICAgICAgICB2YWx1ZTogY2gxLFxuICAgICAgICAgICAgICAgIGxpbmVOdW1iZXI6IGxpbmVOdW1iZXIsXG4gICAgICAgICAgICAgICAgbGluZVN0YXJ0OiBsaW5lU3RhcnQsXG4gICAgICAgICAgICAgICAgcmFuZ2U6IFtzdGFydCwgaW5kZXhdXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gRG90ICguKSBjYW4gYWxzbyBzdGFydCBhIGZsb2F0aW5nLXBvaW50IG51bWJlciwgaGVuY2UgdGhlIG5lZWRcbiAgICAgICAgLy8gdG8gY2hlY2sgdGhlIG5leHQgY2hhcmFjdGVyLlxuXG4gICAgICAgIGNoMiA9IHNvdXJjZVtpbmRleCArIDFdO1xuICAgICAgICBpZiAoY2gxID09PSAnLicgJiYgIWlzRGVjaW1hbERpZ2l0KGNoMikpIHtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgdHlwZTogVG9rZW4uUHVuY3R1YXRvcixcbiAgICAgICAgICAgICAgICB2YWx1ZTogc291cmNlW2luZGV4KytdLFxuICAgICAgICAgICAgICAgIGxpbmVOdW1iZXI6IGxpbmVOdW1iZXIsXG4gICAgICAgICAgICAgICAgbGluZVN0YXJ0OiBsaW5lU3RhcnQsXG4gICAgICAgICAgICAgICAgcmFuZ2U6IFtzdGFydCwgaW5kZXhdXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gUGVlayBtb3JlIGNoYXJhY3RlcnMuXG5cbiAgICAgICAgY2gzID0gc291cmNlW2luZGV4ICsgMl07XG4gICAgICAgIGNoNCA9IHNvdXJjZVtpbmRleCArIDNdO1xuXG4gICAgICAgIC8vIDQtY2hhcmFjdGVyIHB1bmN0dWF0b3I6ID4+Pj1cblxuICAgICAgICBpZiAoY2gxID09PSAnPicgJiYgY2gyID09PSAnPicgJiYgY2gzID09PSAnPicpIHtcbiAgICAgICAgICAgIGlmIChjaDQgPT09ICc9Jykge1xuICAgICAgICAgICAgICAgIGluZGV4ICs9IDQ7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogVG9rZW4uUHVuY3R1YXRvcixcbiAgICAgICAgICAgICAgICAgICAgdmFsdWU6ICc+Pj49JyxcbiAgICAgICAgICAgICAgICAgICAgbGluZU51bWJlcjogbGluZU51bWJlcixcbiAgICAgICAgICAgICAgICAgICAgbGluZVN0YXJ0OiBsaW5lU3RhcnQsXG4gICAgICAgICAgICAgICAgICAgIHJhbmdlOiBbc3RhcnQsIGluZGV4XVxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyAzLWNoYXJhY3RlciBwdW5jdHVhdG9yczogPT09ICE9PSA+Pj4gPDw9ID4+PVxuXG4gICAgICAgIGlmIChjaDEgPT09ICc9JyAmJiBjaDIgPT09ICc9JyAmJiBjaDMgPT09ICc9Jykge1xuICAgICAgICAgICAgaW5kZXggKz0gMztcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgdHlwZTogVG9rZW4uUHVuY3R1YXRvcixcbiAgICAgICAgICAgICAgICB2YWx1ZTogJz09PScsXG4gICAgICAgICAgICAgICAgbGluZU51bWJlcjogbGluZU51bWJlcixcbiAgICAgICAgICAgICAgICBsaW5lU3RhcnQ6IGxpbmVTdGFydCxcbiAgICAgICAgICAgICAgICByYW5nZTogW3N0YXJ0LCBpbmRleF1cbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoY2gxID09PSAnIScgJiYgY2gyID09PSAnPScgJiYgY2gzID09PSAnPScpIHtcbiAgICAgICAgICAgIGluZGV4ICs9IDM7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHR5cGU6IFRva2VuLlB1bmN0dWF0b3IsXG4gICAgICAgICAgICAgICAgdmFsdWU6ICchPT0nLFxuICAgICAgICAgICAgICAgIGxpbmVOdW1iZXI6IGxpbmVOdW1iZXIsXG4gICAgICAgICAgICAgICAgbGluZVN0YXJ0OiBsaW5lU3RhcnQsXG4gICAgICAgICAgICAgICAgcmFuZ2U6IFtzdGFydCwgaW5kZXhdXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGNoMSA9PT0gJz4nICYmIGNoMiA9PT0gJz4nICYmIGNoMyA9PT0gJz4nKSB7XG4gICAgICAgICAgICBpbmRleCArPSAzO1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICB0eXBlOiBUb2tlbi5QdW5jdHVhdG9yLFxuICAgICAgICAgICAgICAgIHZhbHVlOiAnPj4+JyxcbiAgICAgICAgICAgICAgICBsaW5lTnVtYmVyOiBsaW5lTnVtYmVyLFxuICAgICAgICAgICAgICAgIGxpbmVTdGFydDogbGluZVN0YXJ0LFxuICAgICAgICAgICAgICAgIHJhbmdlOiBbc3RhcnQsIGluZGV4XVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChjaDEgPT09ICc8JyAmJiBjaDIgPT09ICc8JyAmJiBjaDMgPT09ICc9Jykge1xuICAgICAgICAgICAgaW5kZXggKz0gMztcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgdHlwZTogVG9rZW4uUHVuY3R1YXRvcixcbiAgICAgICAgICAgICAgICB2YWx1ZTogJzw8PScsXG4gICAgICAgICAgICAgICAgbGluZU51bWJlcjogbGluZU51bWJlcixcbiAgICAgICAgICAgICAgICBsaW5lU3RhcnQ6IGxpbmVTdGFydCxcbiAgICAgICAgICAgICAgICByYW5nZTogW3N0YXJ0LCBpbmRleF1cbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoY2gxID09PSAnPicgJiYgY2gyID09PSAnPicgJiYgY2gzID09PSAnPScpIHtcbiAgICAgICAgICAgIGluZGV4ICs9IDM7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHR5cGU6IFRva2VuLlB1bmN0dWF0b3IsXG4gICAgICAgICAgICAgICAgdmFsdWU6ICc+Pj0nLFxuICAgICAgICAgICAgICAgIGxpbmVOdW1iZXI6IGxpbmVOdW1iZXIsXG4gICAgICAgICAgICAgICAgbGluZVN0YXJ0OiBsaW5lU3RhcnQsXG4gICAgICAgICAgICAgICAgcmFuZ2U6IFtzdGFydCwgaW5kZXhdXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gMi1jaGFyYWN0ZXIgcHVuY3R1YXRvcnM6IDw9ID49ID09ICE9ICsrIC0tIDw8ID4+ICYmIHx8XG4gICAgICAgIC8vICs9IC09ICo9ICU9ICY9IHw9IF49IC89XG5cbiAgICAgICAgaWYgKGNoMiA9PT0gJz0nKSB7XG4gICAgICAgICAgICBpZiAoJzw+PSErLSolJnxeLycuaW5kZXhPZihjaDEpID49IDApIHtcbiAgICAgICAgICAgICAgICBpbmRleCArPSAyO1xuICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IFRva2VuLlB1bmN0dWF0b3IsXG4gICAgICAgICAgICAgICAgICAgIHZhbHVlOiBjaDEgKyBjaDIsXG4gICAgICAgICAgICAgICAgICAgIGxpbmVOdW1iZXI6IGxpbmVOdW1iZXIsXG4gICAgICAgICAgICAgICAgICAgIGxpbmVTdGFydDogbGluZVN0YXJ0LFxuICAgICAgICAgICAgICAgICAgICByYW5nZTogW3N0YXJ0LCBpbmRleF1cbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGNoMSA9PT0gY2gyICYmICgnKy08PiZ8Jy5pbmRleE9mKGNoMSkgPj0gMCkpIHtcbiAgICAgICAgICAgIGlmICgnKy08PiZ8Jy5pbmRleE9mKGNoMikgPj0gMCkge1xuICAgICAgICAgICAgICAgIGluZGV4ICs9IDI7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogVG9rZW4uUHVuY3R1YXRvcixcbiAgICAgICAgICAgICAgICAgICAgdmFsdWU6IGNoMSArIGNoMixcbiAgICAgICAgICAgICAgICAgICAgbGluZU51bWJlcjogbGluZU51bWJlcixcbiAgICAgICAgICAgICAgICAgICAgbGluZVN0YXJ0OiBsaW5lU3RhcnQsXG4gICAgICAgICAgICAgICAgICAgIHJhbmdlOiBbc3RhcnQsIGluZGV4XVxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyBUaGUgcmVtYWluaW5nIDEtY2hhcmFjdGVyIHB1bmN0dWF0b3JzLlxuXG4gICAgICAgIGlmICgnW108PistKiUmfF4hfj86PS8nLmluZGV4T2YoY2gxKSA+PSAwKSB7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHR5cGU6IFRva2VuLlB1bmN0dWF0b3IsXG4gICAgICAgICAgICAgICAgdmFsdWU6IHNvdXJjZVtpbmRleCsrXSxcbiAgICAgICAgICAgICAgICBsaW5lTnVtYmVyOiBsaW5lTnVtYmVyLFxuICAgICAgICAgICAgICAgIGxpbmVTdGFydDogbGluZVN0YXJ0LFxuICAgICAgICAgICAgICAgIHJhbmdlOiBbc3RhcnQsIGluZGV4XVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8vIDcuOC4zIE51bWVyaWMgTGl0ZXJhbHNcblxuICAgIGZ1bmN0aW9uIHNjYW5OdW1lcmljTGl0ZXJhbCgpIHtcbiAgICAgICAgdmFyIG51bWJlciwgc3RhcnQsIGNoO1xuXG4gICAgICAgIGNoID0gc291cmNlW2luZGV4XTtcbiAgICAgICAgYXNzZXJ0KGlzRGVjaW1hbERpZ2l0KGNoKSB8fCAoY2ggPT09ICcuJyksXG4gICAgICAgICAgICAnTnVtZXJpYyBsaXRlcmFsIG11c3Qgc3RhcnQgd2l0aCBhIGRlY2ltYWwgZGlnaXQgb3IgYSBkZWNpbWFsIHBvaW50Jyk7XG5cbiAgICAgICAgc3RhcnQgPSBpbmRleDtcbiAgICAgICAgbnVtYmVyID0gJyc7XG4gICAgICAgIGlmIChjaCAhPT0gJy4nKSB7XG4gICAgICAgICAgICBudW1iZXIgPSBzb3VyY2VbaW5kZXgrK107XG4gICAgICAgICAgICBjaCA9IHNvdXJjZVtpbmRleF07XG5cbiAgICAgICAgICAgIC8vIEhleCBudW1iZXIgc3RhcnRzIHdpdGggJzB4Jy5cbiAgICAgICAgICAgIC8vIE9jdGFsIG51bWJlciBzdGFydHMgd2l0aCAnMCcuXG4gICAgICAgICAgICBpZiAobnVtYmVyID09PSAnMCcpIHtcbiAgICAgICAgICAgICAgICBpZiAoY2ggPT09ICd4JyB8fCBjaCA9PT0gJ1gnKSB7XG4gICAgICAgICAgICAgICAgICAgIG51bWJlciArPSBzb3VyY2VbaW5kZXgrK107XG4gICAgICAgICAgICAgICAgICAgIHdoaWxlIChpbmRleCA8IGxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY2ggPSBzb3VyY2VbaW5kZXhdO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFpc0hleERpZ2l0KGNoKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgbnVtYmVyICs9IHNvdXJjZVtpbmRleCsrXTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIGlmIChudW1iZXIubGVuZ3RoIDw9IDIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIG9ubHkgMHhcbiAgICAgICAgICAgICAgICAgICAgICAgIHRocm93RXJyb3Ioe30sIE1lc3NhZ2VzLlVuZXhwZWN0ZWRUb2tlbiwgJ0lMTEVHQUwnKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIGlmIChpbmRleCA8IGxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY2ggPSBzb3VyY2VbaW5kZXhdO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGlzSWRlbnRpZmllclN0YXJ0KGNoKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRocm93RXJyb3Ioe30sIE1lc3NhZ2VzLlVuZXhwZWN0ZWRUb2tlbiwgJ0lMTEVHQUwnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogVG9rZW4uTnVtZXJpY0xpdGVyYWwsXG4gICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZTogcGFyc2VJbnQobnVtYmVyLCAxNiksXG4gICAgICAgICAgICAgICAgICAgICAgICBsaW5lTnVtYmVyOiBsaW5lTnVtYmVyLFxuICAgICAgICAgICAgICAgICAgICAgICAgbGluZVN0YXJ0OiBsaW5lU3RhcnQsXG4gICAgICAgICAgICAgICAgICAgICAgICByYW5nZTogW3N0YXJ0LCBpbmRleF1cbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGlzT2N0YWxEaWdpdChjaCkpIHtcbiAgICAgICAgICAgICAgICAgICAgbnVtYmVyICs9IHNvdXJjZVtpbmRleCsrXTtcbiAgICAgICAgICAgICAgICAgICAgd2hpbGUgKGluZGV4IDwgbGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjaCA9IHNvdXJjZVtpbmRleF07XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIWlzT2N0YWxEaWdpdChjaCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIG51bWJlciArPSBzb3VyY2VbaW5kZXgrK107XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICBpZiAoaW5kZXggPCBsZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNoID0gc291cmNlW2luZGV4XTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpc0lkZW50aWZpZXJTdGFydChjaCkgfHwgaXNEZWNpbWFsRGlnaXQoY2gpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3dFcnJvcih7fSwgTWVzc2FnZXMuVW5leHBlY3RlZFRva2VuLCAnSUxMRUdBTCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiBUb2tlbi5OdW1lcmljTGl0ZXJhbCxcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlOiBwYXJzZUludChudW1iZXIsIDgpLFxuICAgICAgICAgICAgICAgICAgICAgICAgb2N0YWw6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgICAgICBsaW5lTnVtYmVyOiBsaW5lTnVtYmVyLFxuICAgICAgICAgICAgICAgICAgICAgICAgbGluZVN0YXJ0OiBsaW5lU3RhcnQsXG4gICAgICAgICAgICAgICAgICAgICAgICByYW5nZTogW3N0YXJ0LCBpbmRleF1cbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAvLyBkZWNpbWFsIG51bWJlciBzdGFydHMgd2l0aCAnMCcgc3VjaCBhcyAnMDknIGlzIGlsbGVnYWwuXG4gICAgICAgICAgICAgICAgaWYgKGlzRGVjaW1hbERpZ2l0KGNoKSkge1xuICAgICAgICAgICAgICAgICAgICB0aHJvd0Vycm9yKHt9LCBNZXNzYWdlcy5VbmV4cGVjdGVkVG9rZW4sICdJTExFR0FMJyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB3aGlsZSAoaW5kZXggPCBsZW5ndGgpIHtcbiAgICAgICAgICAgICAgICBjaCA9IHNvdXJjZVtpbmRleF07XG4gICAgICAgICAgICAgICAgaWYgKCFpc0RlY2ltYWxEaWdpdChjaCkpIHtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIG51bWJlciArPSBzb3VyY2VbaW5kZXgrK107XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoY2ggPT09ICcuJykge1xuICAgICAgICAgICAgbnVtYmVyICs9IHNvdXJjZVtpbmRleCsrXTtcbiAgICAgICAgICAgIHdoaWxlIChpbmRleCA8IGxlbmd0aCkge1xuICAgICAgICAgICAgICAgIGNoID0gc291cmNlW2luZGV4XTtcbiAgICAgICAgICAgICAgICBpZiAoIWlzRGVjaW1hbERpZ2l0KGNoKSkge1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgbnVtYmVyICs9IHNvdXJjZVtpbmRleCsrXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChjaCA9PT0gJ2UnIHx8IGNoID09PSAnRScpIHtcbiAgICAgICAgICAgIG51bWJlciArPSBzb3VyY2VbaW5kZXgrK107XG5cbiAgICAgICAgICAgIGNoID0gc291cmNlW2luZGV4XTtcbiAgICAgICAgICAgIGlmIChjaCA9PT0gJysnIHx8IGNoID09PSAnLScpIHtcbiAgICAgICAgICAgICAgICBudW1iZXIgKz0gc291cmNlW2luZGV4KytdO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjaCA9IHNvdXJjZVtpbmRleF07XG4gICAgICAgICAgICBpZiAoaXNEZWNpbWFsRGlnaXQoY2gpKSB7XG4gICAgICAgICAgICAgICAgbnVtYmVyICs9IHNvdXJjZVtpbmRleCsrXTtcbiAgICAgICAgICAgICAgICB3aGlsZSAoaW5kZXggPCBsZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgY2ggPSBzb3VyY2VbaW5kZXhdO1xuICAgICAgICAgICAgICAgICAgICBpZiAoIWlzRGVjaW1hbERpZ2l0KGNoKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgbnVtYmVyICs9IHNvdXJjZVtpbmRleCsrXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNoID0gJ2NoYXJhY3RlciAnICsgY2g7XG4gICAgICAgICAgICAgICAgaWYgKGluZGV4ID49IGxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICBjaCA9ICc8ZW5kPic7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHRocm93RXJyb3Ioe30sIE1lc3NhZ2VzLlVuZXhwZWN0ZWRUb2tlbiwgJ0lMTEVHQUwnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChpbmRleCA8IGxlbmd0aCkge1xuICAgICAgICAgICAgY2ggPSBzb3VyY2VbaW5kZXhdO1xuICAgICAgICAgICAgaWYgKGlzSWRlbnRpZmllclN0YXJ0KGNoKSkge1xuICAgICAgICAgICAgICAgIHRocm93RXJyb3Ioe30sIE1lc3NhZ2VzLlVuZXhwZWN0ZWRUb2tlbiwgJ0lMTEVHQUwnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB0eXBlOiBUb2tlbi5OdW1lcmljTGl0ZXJhbCxcbiAgICAgICAgICAgIHZhbHVlOiBwYXJzZUZsb2F0KG51bWJlciksXG4gICAgICAgICAgICBsaW5lTnVtYmVyOiBsaW5lTnVtYmVyLFxuICAgICAgICAgICAgbGluZVN0YXJ0OiBsaW5lU3RhcnQsXG4gICAgICAgICAgICByYW5nZTogW3N0YXJ0LCBpbmRleF1cbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvLyA3LjguNCBTdHJpbmcgTGl0ZXJhbHNcblxuICAgIGZ1bmN0aW9uIHNjYW5TdHJpbmdMaXRlcmFsKCkge1xuICAgICAgICB2YXIgc3RyID0gJycsIHF1b3RlLCBzdGFydCwgY2gsIGNvZGUsIHVuZXNjYXBlZCwgcmVzdG9yZSwgb2N0YWwgPSBmYWxzZTtcblxuICAgICAgICBxdW90ZSA9IHNvdXJjZVtpbmRleF07XG4gICAgICAgIGFzc2VydCgocXVvdGUgPT09ICdcXCcnIHx8IHF1b3RlID09PSAnXCInKSxcbiAgICAgICAgICAgICdTdHJpbmcgbGl0ZXJhbCBtdXN0IHN0YXJ0cyB3aXRoIGEgcXVvdGUnKTtcblxuICAgICAgICBzdGFydCA9IGluZGV4O1xuICAgICAgICArK2luZGV4O1xuXG4gICAgICAgIHdoaWxlIChpbmRleCA8IGxlbmd0aCkge1xuICAgICAgICAgICAgY2ggPSBzb3VyY2VbaW5kZXgrK107XG5cbiAgICAgICAgICAgIGlmIChjaCA9PT0gcXVvdGUpIHtcbiAgICAgICAgICAgICAgICBxdW90ZSA9ICcnO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChjaCA9PT0gJ1xcXFwnKSB7XG4gICAgICAgICAgICAgICAgY2ggPSBzb3VyY2VbaW5kZXgrK107XG4gICAgICAgICAgICAgICAgaWYgKCFpc0xpbmVUZXJtaW5hdG9yKGNoKSkge1xuICAgICAgICAgICAgICAgICAgICBzd2l0Y2ggKGNoKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ24nOlxuICAgICAgICAgICAgICAgICAgICAgICAgc3RyICs9ICdcXG4nO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ3InOlxuICAgICAgICAgICAgICAgICAgICAgICAgc3RyICs9ICdcXHInO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ3QnOlxuICAgICAgICAgICAgICAgICAgICAgICAgc3RyICs9ICdcXHQnO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ3UnOlxuICAgICAgICAgICAgICAgICAgICBjYXNlICd4JzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc3RvcmUgPSBpbmRleDtcbiAgICAgICAgICAgICAgICAgICAgICAgIHVuZXNjYXBlZCA9IHNjYW5IZXhFc2NhcGUoY2gpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHVuZXNjYXBlZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0ciArPSB1bmVzY2FwZWQ7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGluZGV4ID0gcmVzdG9yZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdHIgKz0gY2g7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnYic6XG4gICAgICAgICAgICAgICAgICAgICAgICBzdHIgKz0gJ1xcYic7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnZic6XG4gICAgICAgICAgICAgICAgICAgICAgICBzdHIgKz0gJ1xcZic7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAndic6XG4gICAgICAgICAgICAgICAgICAgICAgICBzdHIgKz0gJ1xceDBCJztcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoaXNPY3RhbERpZ2l0KGNoKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvZGUgPSAnMDEyMzQ1NjcnLmluZGV4T2YoY2gpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gXFwwIGlzIG5vdCBvY3RhbCBlc2NhcGUgc2VxdWVuY2VcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoY29kZSAhPT0gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvY3RhbCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGluZGV4IDwgbGVuZ3RoICYmIGlzT2N0YWxEaWdpdChzb3VyY2VbaW5kZXhdKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvY3RhbCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvZGUgPSBjb2RlICogOCArICcwMTIzNDU2NycuaW5kZXhPZihzb3VyY2VbaW5kZXgrK10pO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIDMgZGlnaXRzIGFyZSBvbmx5IGFsbG93ZWQgd2hlbiBzdHJpbmcgc3RhcnRzXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIHdpdGggMCwgMSwgMiwgM1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoJzAxMjMnLmluZGV4T2YoY2gpID49IDAgJiZcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpbmRleCA8IGxlbmd0aCAmJlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlzT2N0YWxEaWdpdChzb3VyY2VbaW5kZXhdKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29kZSA9IGNvZGUgKiA4ICsgJzAxMjM0NTY3Jy5pbmRleE9mKHNvdXJjZVtpbmRleCsrXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RyICs9IFN0cmluZy5mcm9tQ2hhckNvZGUoY29kZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0ciArPSBjaDtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgKytsaW5lTnVtYmVyO1xuICAgICAgICAgICAgICAgICAgICBpZiAoY2ggPT09ICAnXFxyJyAmJiBzb3VyY2VbaW5kZXhdID09PSAnXFxuJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgKytpbmRleDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSBpZiAoaXNMaW5lVGVybWluYXRvcihjaCkpIHtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgc3RyICs9IGNoO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHF1b3RlICE9PSAnJykge1xuICAgICAgICAgICAgdGhyb3dFcnJvcih7fSwgTWVzc2FnZXMuVW5leHBlY3RlZFRva2VuLCAnSUxMRUdBTCcpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHR5cGU6IFRva2VuLlN0cmluZ0xpdGVyYWwsXG4gICAgICAgICAgICB2YWx1ZTogc3RyLFxuICAgICAgICAgICAgb2N0YWw6IG9jdGFsLFxuICAgICAgICAgICAgbGluZU51bWJlcjogbGluZU51bWJlcixcbiAgICAgICAgICAgIGxpbmVTdGFydDogbGluZVN0YXJ0LFxuICAgICAgICAgICAgcmFuZ2U6IFtzdGFydCwgaW5kZXhdXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gc2NhblJlZ0V4cCgpIHtcbiAgICAgICAgdmFyIHN0ciwgY2gsIHN0YXJ0LCBwYXR0ZXJuLCBmbGFncywgdmFsdWUsIGNsYXNzTWFya2VyID0gZmFsc2UsIHJlc3RvcmUsIHRlcm1pbmF0ZWQgPSBmYWxzZTtcblxuICAgICAgICBidWZmZXIgPSBudWxsO1xuICAgICAgICBza2lwQ29tbWVudCgpO1xuXG4gICAgICAgIHN0YXJ0ID0gaW5kZXg7XG4gICAgICAgIGNoID0gc291cmNlW2luZGV4XTtcbiAgICAgICAgYXNzZXJ0KGNoID09PSAnLycsICdSZWd1bGFyIGV4cHJlc3Npb24gbGl0ZXJhbCBtdXN0IHN0YXJ0IHdpdGggYSBzbGFzaCcpO1xuICAgICAgICBzdHIgPSBzb3VyY2VbaW5kZXgrK107XG5cbiAgICAgICAgd2hpbGUgKGluZGV4IDwgbGVuZ3RoKSB7XG4gICAgICAgICAgICBjaCA9IHNvdXJjZVtpbmRleCsrXTtcbiAgICAgICAgICAgIHN0ciArPSBjaDtcbiAgICAgICAgICAgIGlmIChjbGFzc01hcmtlcikge1xuICAgICAgICAgICAgICAgIGlmIChjaCA9PT0gJ10nKSB7XG4gICAgICAgICAgICAgICAgICAgIGNsYXNzTWFya2VyID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBpZiAoY2ggPT09ICdcXFxcJykge1xuICAgICAgICAgICAgICAgICAgICBjaCA9IHNvdXJjZVtpbmRleCsrXTtcbiAgICAgICAgICAgICAgICAgICAgLy8gRUNNQS0yNjIgNy44LjVcbiAgICAgICAgICAgICAgICAgICAgaWYgKGlzTGluZVRlcm1pbmF0b3IoY2gpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aHJvd0Vycm9yKHt9LCBNZXNzYWdlcy5VbnRlcm1pbmF0ZWRSZWdFeHApO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHN0ciArPSBjaDtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGNoID09PSAnLycpIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybWluYXRlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoY2ggPT09ICdbJykge1xuICAgICAgICAgICAgICAgICAgICBjbGFzc01hcmtlciA9IHRydWU7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChpc0xpbmVUZXJtaW5hdG9yKGNoKSkge1xuICAgICAgICAgICAgICAgICAgICB0aHJvd0Vycm9yKHt9LCBNZXNzYWdlcy5VbnRlcm1pbmF0ZWRSZWdFeHApO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghdGVybWluYXRlZCkge1xuICAgICAgICAgICAgdGhyb3dFcnJvcih7fSwgTWVzc2FnZXMuVW50ZXJtaW5hdGVkUmVnRXhwKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEV4Y2x1ZGUgbGVhZGluZyBhbmQgdHJhaWxpbmcgc2xhc2guXG4gICAgICAgIHBhdHRlcm4gPSBzdHIuc3Vic3RyKDEsIHN0ci5sZW5ndGggLSAyKTtcblxuICAgICAgICBmbGFncyA9ICcnO1xuICAgICAgICB3aGlsZSAoaW5kZXggPCBsZW5ndGgpIHtcbiAgICAgICAgICAgIGNoID0gc291cmNlW2luZGV4XTtcbiAgICAgICAgICAgIGlmICghaXNJZGVudGlmaWVyUGFydChjaCkpIHtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgKytpbmRleDtcbiAgICAgICAgICAgIGlmIChjaCA9PT0gJ1xcXFwnICYmIGluZGV4IDwgbGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgY2ggPSBzb3VyY2VbaW5kZXhdO1xuICAgICAgICAgICAgICAgIGlmIChjaCA9PT0gJ3UnKSB7XG4gICAgICAgICAgICAgICAgICAgICsraW5kZXg7XG4gICAgICAgICAgICAgICAgICAgIHJlc3RvcmUgPSBpbmRleDtcbiAgICAgICAgICAgICAgICAgICAgY2ggPSBzY2FuSGV4RXNjYXBlKCd1Jyk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChjaCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZmxhZ3MgKz0gY2g7XG4gICAgICAgICAgICAgICAgICAgICAgICBzdHIgKz0gJ1xcXFx1JztcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvciAoOyByZXN0b3JlIDwgaW5kZXg7ICsrcmVzdG9yZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0ciArPSBzb3VyY2VbcmVzdG9yZV07XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpbmRleCA9IHJlc3RvcmU7XG4gICAgICAgICAgICAgICAgICAgICAgICBmbGFncyArPSAndSc7XG4gICAgICAgICAgICAgICAgICAgICAgICBzdHIgKz0gJ1xcXFx1JztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHN0ciArPSAnXFxcXCc7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBmbGFncyArPSBjaDtcbiAgICAgICAgICAgICAgICBzdHIgKz0gY2g7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgdmFsdWUgPSBuZXcgUmVnRXhwKHBhdHRlcm4sIGZsYWdzKTtcbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgdGhyb3dFcnJvcih7fSwgTWVzc2FnZXMuSW52YWxpZFJlZ0V4cCk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgbGl0ZXJhbDogc3RyLFxuICAgICAgICAgICAgdmFsdWU6IHZhbHVlLFxuICAgICAgICAgICAgcmFuZ2U6IFtzdGFydCwgaW5kZXhdXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gaXNJZGVudGlmaWVyTmFtZSh0b2tlbikge1xuICAgICAgICByZXR1cm4gdG9rZW4udHlwZSA9PT0gVG9rZW4uSWRlbnRpZmllciB8fFxuICAgICAgICAgICAgdG9rZW4udHlwZSA9PT0gVG9rZW4uS2V5d29yZCB8fFxuICAgICAgICAgICAgdG9rZW4udHlwZSA9PT0gVG9rZW4uQm9vbGVhbkxpdGVyYWwgfHxcbiAgICAgICAgICAgIHRva2VuLnR5cGUgPT09IFRva2VuLk51bGxMaXRlcmFsO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGFkdmFuY2UoKSB7XG4gICAgICAgIHZhciBjaCwgdG9rZW47XG5cbiAgICAgICAgc2tpcENvbW1lbnQoKTtcblxuICAgICAgICBpZiAoaW5kZXggPj0gbGVuZ3RoKSB7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHR5cGU6IFRva2VuLkVPRixcbiAgICAgICAgICAgICAgICBsaW5lTnVtYmVyOiBsaW5lTnVtYmVyLFxuICAgICAgICAgICAgICAgIGxpbmVTdGFydDogbGluZVN0YXJ0LFxuICAgICAgICAgICAgICAgIHJhbmdlOiBbaW5kZXgsIGluZGV4XVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRva2VuID0gc2NhblB1bmN0dWF0b3IoKTtcbiAgICAgICAgaWYgKHR5cGVvZiB0b2tlbiAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIHJldHVybiB0b2tlbjtcbiAgICAgICAgfVxuXG4gICAgICAgIGNoID0gc291cmNlW2luZGV4XTtcblxuICAgICAgICBpZiAoY2ggPT09ICdcXCcnIHx8IGNoID09PSAnXCInKSB7XG4gICAgICAgICAgICByZXR1cm4gc2NhblN0cmluZ0xpdGVyYWwoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChjaCA9PT0gJy4nIHx8IGlzRGVjaW1hbERpZ2l0KGNoKSkge1xuICAgICAgICAgICAgcmV0dXJuIHNjYW5OdW1lcmljTGl0ZXJhbCgpO1xuICAgICAgICB9XG5cbiAgICAgICAgdG9rZW4gPSBzY2FuSWRlbnRpZmllcigpO1xuICAgICAgICBpZiAodHlwZW9mIHRva2VuICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgcmV0dXJuIHRva2VuO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhyb3dFcnJvcih7fSwgTWVzc2FnZXMuVW5leHBlY3RlZFRva2VuLCAnSUxMRUdBTCcpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGxleCgpIHtcbiAgICAgICAgdmFyIHRva2VuO1xuXG4gICAgICAgIGlmIChidWZmZXIpIHtcbiAgICAgICAgICAgIGluZGV4ID0gYnVmZmVyLnJhbmdlWzFdO1xuICAgICAgICAgICAgbGluZU51bWJlciA9IGJ1ZmZlci5saW5lTnVtYmVyO1xuICAgICAgICAgICAgbGluZVN0YXJ0ID0gYnVmZmVyLmxpbmVTdGFydDtcbiAgICAgICAgICAgIHRva2VuID0gYnVmZmVyO1xuICAgICAgICAgICAgYnVmZmVyID0gbnVsbDtcbiAgICAgICAgICAgIHJldHVybiB0b2tlbjtcbiAgICAgICAgfVxuXG4gICAgICAgIGJ1ZmZlciA9IG51bGw7XG4gICAgICAgIHJldHVybiBhZHZhbmNlKCk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gbG9va2FoZWFkKCkge1xuICAgICAgICB2YXIgcG9zLCBsaW5lLCBzdGFydDtcblxuICAgICAgICBpZiAoYnVmZmVyICE9PSBudWxsKSB7XG4gICAgICAgICAgICByZXR1cm4gYnVmZmVyO1xuICAgICAgICB9XG5cbiAgICAgICAgcG9zID0gaW5kZXg7XG4gICAgICAgIGxpbmUgPSBsaW5lTnVtYmVyO1xuICAgICAgICBzdGFydCA9IGxpbmVTdGFydDtcbiAgICAgICAgYnVmZmVyID0gYWR2YW5jZSgpO1xuICAgICAgICBpbmRleCA9IHBvcztcbiAgICAgICAgbGluZU51bWJlciA9IGxpbmU7XG4gICAgICAgIGxpbmVTdGFydCA9IHN0YXJ0O1xuXG4gICAgICAgIHJldHVybiBidWZmZXI7XG4gICAgfVxuXG4gICAgLy8gUmV0dXJuIHRydWUgaWYgdGhlcmUgaXMgYSBsaW5lIHRlcm1pbmF0b3IgYmVmb3JlIHRoZSBuZXh0IHRva2VuLlxuXG4gICAgZnVuY3Rpb24gcGVla0xpbmVUZXJtaW5hdG9yKCkge1xuICAgICAgICB2YXIgcG9zLCBsaW5lLCBzdGFydCwgZm91bmQ7XG5cbiAgICAgICAgcG9zID0gaW5kZXg7XG4gICAgICAgIGxpbmUgPSBsaW5lTnVtYmVyO1xuICAgICAgICBzdGFydCA9IGxpbmVTdGFydDtcbiAgICAgICAgc2tpcENvbW1lbnQoKTtcbiAgICAgICAgZm91bmQgPSBsaW5lTnVtYmVyICE9PSBsaW5lO1xuICAgICAgICBpbmRleCA9IHBvcztcbiAgICAgICAgbGluZU51bWJlciA9IGxpbmU7XG4gICAgICAgIGxpbmVTdGFydCA9IHN0YXJ0O1xuXG4gICAgICAgIHJldHVybiBmb3VuZDtcbiAgICB9XG5cbiAgICAvLyBUaHJvdyBhbiBleGNlcHRpb25cblxuICAgIGZ1bmN0aW9uIHRocm93RXJyb3IodG9rZW4sIG1lc3NhZ2VGb3JtYXQpIHtcbiAgICAgICAgdmFyIGVycm9yLFxuICAgICAgICAgICAgYXJncyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMiksXG4gICAgICAgICAgICBtc2cgPSBtZXNzYWdlRm9ybWF0LnJlcGxhY2UoXG4gICAgICAgICAgICAgICAgLyUoXFxkKS9nLFxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uICh3aG9sZSwgaW5kZXgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGFyZ3NbaW5kZXhdIHx8ICcnO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICk7XG5cbiAgICAgICAgaWYgKHR5cGVvZiB0b2tlbi5saW5lTnVtYmVyID09PSAnbnVtYmVyJykge1xuICAgICAgICAgICAgZXJyb3IgPSBuZXcgRXJyb3IoJ0xpbmUgJyArIHRva2VuLmxpbmVOdW1iZXIgKyAnOiAnICsgbXNnKTtcbiAgICAgICAgICAgIGVycm9yLmluZGV4ID0gdG9rZW4ucmFuZ2VbMF07XG4gICAgICAgICAgICBlcnJvci5saW5lTnVtYmVyID0gdG9rZW4ubGluZU51bWJlcjtcbiAgICAgICAgICAgIGVycm9yLmNvbHVtbiA9IHRva2VuLnJhbmdlWzBdIC0gbGluZVN0YXJ0ICsgMTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGVycm9yID0gbmV3IEVycm9yKCdMaW5lICcgKyBsaW5lTnVtYmVyICsgJzogJyArIG1zZyk7XG4gICAgICAgICAgICBlcnJvci5pbmRleCA9IGluZGV4O1xuICAgICAgICAgICAgZXJyb3IubGluZU51bWJlciA9IGxpbmVOdW1iZXI7XG4gICAgICAgICAgICBlcnJvci5jb2x1bW4gPSBpbmRleCAtIGxpbmVTdGFydCArIDE7XG4gICAgICAgIH1cblxuICAgICAgICB0aHJvdyBlcnJvcjtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiB0aHJvd0Vycm9yVG9sZXJhbnQoKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICB0aHJvd0Vycm9yLmFwcGx5KG51bGwsIGFyZ3VtZW50cyk7XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgIGlmIChleHRyYS5lcnJvcnMpIHtcbiAgICAgICAgICAgICAgICBleHRyYS5lcnJvcnMucHVzaChlKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuXG4gICAgLy8gVGhyb3cgYW4gZXhjZXB0aW9uIGJlY2F1c2Ugb2YgdGhlIHRva2VuLlxuXG4gICAgZnVuY3Rpb24gdGhyb3dVbmV4cGVjdGVkKHRva2VuKSB7XG4gICAgICAgIGlmICh0b2tlbi50eXBlID09PSBUb2tlbi5FT0YpIHtcbiAgICAgICAgICAgIHRocm93RXJyb3IodG9rZW4sIE1lc3NhZ2VzLlVuZXhwZWN0ZWRFT1MpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHRva2VuLnR5cGUgPT09IFRva2VuLk51bWVyaWNMaXRlcmFsKSB7XG4gICAgICAgICAgICB0aHJvd0Vycm9yKHRva2VuLCBNZXNzYWdlcy5VbmV4cGVjdGVkTnVtYmVyKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0b2tlbi50eXBlID09PSBUb2tlbi5TdHJpbmdMaXRlcmFsKSB7XG4gICAgICAgICAgICB0aHJvd0Vycm9yKHRva2VuLCBNZXNzYWdlcy5VbmV4cGVjdGVkU3RyaW5nKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0b2tlbi50eXBlID09PSBUb2tlbi5JZGVudGlmaWVyKSB7XG4gICAgICAgICAgICB0aHJvd0Vycm9yKHRva2VuLCBNZXNzYWdlcy5VbmV4cGVjdGVkSWRlbnRpZmllcik7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodG9rZW4udHlwZSA9PT0gVG9rZW4uS2V5d29yZCkge1xuICAgICAgICAgICAgaWYgKGlzRnV0dXJlUmVzZXJ2ZWRXb3JkKHRva2VuLnZhbHVlKSkge1xuICAgICAgICAgICAgICAgIHRocm93RXJyb3IodG9rZW4sIE1lc3NhZ2VzLlVuZXhwZWN0ZWRSZXNlcnZlZCk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHN0cmljdCAmJiBpc1N0cmljdE1vZGVSZXNlcnZlZFdvcmQodG9rZW4udmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgdGhyb3dFcnJvclRvbGVyYW50KHRva2VuLCBNZXNzYWdlcy5TdHJpY3RSZXNlcnZlZFdvcmQpO1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRocm93RXJyb3IodG9rZW4sIE1lc3NhZ2VzLlVuZXhwZWN0ZWRUb2tlbiwgdG9rZW4udmFsdWUpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQm9vbGVhbkxpdGVyYWwsIE51bGxMaXRlcmFsLCBvciBQdW5jdHVhdG9yLlxuICAgICAgICB0aHJvd0Vycm9yKHRva2VuLCBNZXNzYWdlcy5VbmV4cGVjdGVkVG9rZW4sIHRva2VuLnZhbHVlKTtcbiAgICB9XG5cbiAgICAvLyBFeHBlY3QgdGhlIG5leHQgdG9rZW4gdG8gbWF0Y2ggdGhlIHNwZWNpZmllZCBwdW5jdHVhdG9yLlxuICAgIC8vIElmIG5vdCwgYW4gZXhjZXB0aW9uIHdpbGwgYmUgdGhyb3duLlxuXG4gICAgZnVuY3Rpb24gZXhwZWN0KHZhbHVlKSB7XG4gICAgICAgIHZhciB0b2tlbiA9IGxleCgpO1xuICAgICAgICBpZiAodG9rZW4udHlwZSAhPT0gVG9rZW4uUHVuY3R1YXRvciB8fCB0b2tlbi52YWx1ZSAhPT0gdmFsdWUpIHtcbiAgICAgICAgICAgIHRocm93VW5leHBlY3RlZCh0b2tlbik7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBFeHBlY3QgdGhlIG5leHQgdG9rZW4gdG8gbWF0Y2ggdGhlIHNwZWNpZmllZCBrZXl3b3JkLlxuICAgIC8vIElmIG5vdCwgYW4gZXhjZXB0aW9uIHdpbGwgYmUgdGhyb3duLlxuXG4gICAgZnVuY3Rpb24gZXhwZWN0S2V5d29yZChrZXl3b3JkKSB7XG4gICAgICAgIHZhciB0b2tlbiA9IGxleCgpO1xuICAgICAgICBpZiAodG9rZW4udHlwZSAhPT0gVG9rZW4uS2V5d29yZCB8fCB0b2tlbi52YWx1ZSAhPT0ga2V5d29yZCkge1xuICAgICAgICAgICAgdGhyb3dVbmV4cGVjdGVkKHRva2VuKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8vIFJldHVybiB0cnVlIGlmIHRoZSBuZXh0IHRva2VuIG1hdGNoZXMgdGhlIHNwZWNpZmllZCBwdW5jdHVhdG9yLlxuXG4gICAgZnVuY3Rpb24gbWF0Y2godmFsdWUpIHtcbiAgICAgICAgdmFyIHRva2VuID0gbG9va2FoZWFkKCk7XG4gICAgICAgIHJldHVybiB0b2tlbi50eXBlID09PSBUb2tlbi5QdW5jdHVhdG9yICYmIHRva2VuLnZhbHVlID09PSB2YWx1ZTtcbiAgICB9XG5cbiAgICAvLyBSZXR1cm4gdHJ1ZSBpZiB0aGUgbmV4dCB0b2tlbiBtYXRjaGVzIHRoZSBzcGVjaWZpZWQga2V5d29yZFxuXG4gICAgZnVuY3Rpb24gbWF0Y2hLZXl3b3JkKGtleXdvcmQpIHtcbiAgICAgICAgdmFyIHRva2VuID0gbG9va2FoZWFkKCk7XG4gICAgICAgIHJldHVybiB0b2tlbi50eXBlID09PSBUb2tlbi5LZXl3b3JkICYmIHRva2VuLnZhbHVlID09PSBrZXl3b3JkO1xuICAgIH1cblxuICAgIC8vIFJldHVybiB0cnVlIGlmIHRoZSBuZXh0IHRva2VuIGlzIGFuIGFzc2lnbm1lbnQgb3BlcmF0b3JcblxuICAgIGZ1bmN0aW9uIG1hdGNoQXNzaWduKCkge1xuICAgICAgICB2YXIgdG9rZW4gPSBsb29rYWhlYWQoKSxcbiAgICAgICAgICAgIG9wID0gdG9rZW4udmFsdWU7XG5cbiAgICAgICAgaWYgKHRva2VuLnR5cGUgIT09IFRva2VuLlB1bmN0dWF0b3IpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gb3AgPT09ICc9JyB8fFxuICAgICAgICAgICAgb3AgPT09ICcqPScgfHxcbiAgICAgICAgICAgIG9wID09PSAnLz0nIHx8XG4gICAgICAgICAgICBvcCA9PT0gJyU9JyB8fFxuICAgICAgICAgICAgb3AgPT09ICcrPScgfHxcbiAgICAgICAgICAgIG9wID09PSAnLT0nIHx8XG4gICAgICAgICAgICBvcCA9PT0gJzw8PScgfHxcbiAgICAgICAgICAgIG9wID09PSAnPj49JyB8fFxuICAgICAgICAgICAgb3AgPT09ICc+Pj49JyB8fFxuICAgICAgICAgICAgb3AgPT09ICcmPScgfHxcbiAgICAgICAgICAgIG9wID09PSAnXj0nIHx8XG4gICAgICAgICAgICBvcCA9PT0gJ3w9JztcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBjb25zdW1lU2VtaWNvbG9uKCkge1xuICAgICAgICB2YXIgdG9rZW4sIGxpbmU7XG5cbiAgICAgICAgLy8gQ2F0Y2ggdGhlIHZlcnkgY29tbW9uIGNhc2UgZmlyc3QuXG4gICAgICAgIGlmIChzb3VyY2VbaW5kZXhdID09PSAnOycpIHtcbiAgICAgICAgICAgIGxleCgpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgbGluZSA9IGxpbmVOdW1iZXI7XG4gICAgICAgIHNraXBDb21tZW50KCk7XG4gICAgICAgIGlmIChsaW5lTnVtYmVyICE9PSBsaW5lKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBpZiAobWF0Y2goJzsnKSkge1xuICAgICAgICAgICAgbGV4KCk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICB0b2tlbiA9IGxvb2thaGVhZCgpO1xuICAgICAgICBpZiAodG9rZW4udHlwZSAhPT0gVG9rZW4uRU9GICYmICFtYXRjaCgnfScpKSB7XG4gICAgICAgICAgICB0aHJvd1VuZXhwZWN0ZWQodG9rZW4pO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy8gUmV0dXJuIHRydWUgaWYgcHJvdmlkZWQgZXhwcmVzc2lvbiBpcyBMZWZ0SGFuZFNpZGVFeHByZXNzaW9uXG5cbiAgICBmdW5jdGlvbiBpc0xlZnRIYW5kU2lkZShleHByKSB7XG4gICAgICAgIHJldHVybiBleHByLnR5cGUgPT09IFN5bnRheC5JZGVudGlmaWVyIHx8IGV4cHIudHlwZSA9PT0gU3ludGF4Lk1lbWJlckV4cHJlc3Npb247XG4gICAgfVxuXG4gICAgLy8gMTEuMS40IEFycmF5IEluaXRpYWxpc2VyXG5cbiAgICBmdW5jdGlvbiBwYXJzZUFycmF5SW5pdGlhbGlzZXIoKSB7XG4gICAgICAgIHZhciBlbGVtZW50cyA9IFtdO1xuXG4gICAgICAgIGV4cGVjdCgnWycpO1xuXG4gICAgICAgIHdoaWxlICghbWF0Y2goJ10nKSkge1xuICAgICAgICAgICAgaWYgKG1hdGNoKCcsJykpIHtcbiAgICAgICAgICAgICAgICBsZXgoKTtcbiAgICAgICAgICAgICAgICBlbGVtZW50cy5wdXNoKG51bGwpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBlbGVtZW50cy5wdXNoKHBhcnNlQXNzaWdubWVudEV4cHJlc3Npb24oKSk7XG5cbiAgICAgICAgICAgICAgICBpZiAoIW1hdGNoKCddJykpIHtcbiAgICAgICAgICAgICAgICAgICAgZXhwZWN0KCcsJyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgZXhwZWN0KCddJyk7XG5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHR5cGU6IFN5bnRheC5BcnJheUV4cHJlc3Npb24sXG4gICAgICAgICAgICBlbGVtZW50czogZWxlbWVudHNcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvLyAxMS4xLjUgT2JqZWN0IEluaXRpYWxpc2VyXG5cbiAgICBmdW5jdGlvbiBwYXJzZVByb3BlcnR5RnVuY3Rpb24ocGFyYW0sIGZpcnN0KSB7XG4gICAgICAgIHZhciBwcmV2aW91c1N0cmljdCwgYm9keTtcblxuICAgICAgICBwcmV2aW91c1N0cmljdCA9IHN0cmljdDtcbiAgICAgICAgYm9keSA9IHBhcnNlRnVuY3Rpb25Tb3VyY2VFbGVtZW50cygpO1xuICAgICAgICBpZiAoZmlyc3QgJiYgc3RyaWN0ICYmIGlzUmVzdHJpY3RlZFdvcmQocGFyYW1bMF0ubmFtZSkpIHtcbiAgICAgICAgICAgIHRocm93RXJyb3JUb2xlcmFudChmaXJzdCwgTWVzc2FnZXMuU3RyaWN0UGFyYW1OYW1lKTtcbiAgICAgICAgfVxuICAgICAgICBzdHJpY3QgPSBwcmV2aW91c1N0cmljdDtcblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgdHlwZTogU3ludGF4LkZ1bmN0aW9uRXhwcmVzc2lvbixcbiAgICAgICAgICAgIGlkOiBudWxsLFxuICAgICAgICAgICAgcGFyYW1zOiBwYXJhbSxcbiAgICAgICAgICAgIGRlZmF1bHRzOiBbXSxcbiAgICAgICAgICAgIGJvZHk6IGJvZHksXG4gICAgICAgICAgICByZXN0OiBudWxsLFxuICAgICAgICAgICAgZ2VuZXJhdG9yOiBmYWxzZSxcbiAgICAgICAgICAgIGV4cHJlc3Npb246IGZhbHNlXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcGFyc2VPYmplY3RQcm9wZXJ0eUtleSgpIHtcbiAgICAgICAgdmFyIHRva2VuID0gbGV4KCk7XG5cbiAgICAgICAgLy8gTm90ZTogVGhpcyBmdW5jdGlvbiBpcyBjYWxsZWQgb25seSBmcm9tIHBhcnNlT2JqZWN0UHJvcGVydHkoKSwgd2hlcmVcbiAgICAgICAgLy8gRU9GIGFuZCBQdW5jdHVhdG9yIHRva2VucyBhcmUgYWxyZWFkeSBmaWx0ZXJlZCBvdXQuXG5cbiAgICAgICAgaWYgKHRva2VuLnR5cGUgPT09IFRva2VuLlN0cmluZ0xpdGVyYWwgfHwgdG9rZW4udHlwZSA9PT0gVG9rZW4uTnVtZXJpY0xpdGVyYWwpIHtcbiAgICAgICAgICAgIGlmIChzdHJpY3QgJiYgdG9rZW4ub2N0YWwpIHtcbiAgICAgICAgICAgICAgICB0aHJvd0Vycm9yVG9sZXJhbnQodG9rZW4sIE1lc3NhZ2VzLlN0cmljdE9jdGFsTGl0ZXJhbCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gY3JlYXRlTGl0ZXJhbCh0b2tlbik7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgdHlwZTogU3ludGF4LklkZW50aWZpZXIsXG4gICAgICAgICAgICBuYW1lOiB0b2tlbi52YWx1ZVxuICAgICAgICB9O1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHBhcnNlT2JqZWN0UHJvcGVydHkoKSB7XG4gICAgICAgIHZhciB0b2tlbiwga2V5LCBpZCwgcGFyYW07XG5cbiAgICAgICAgdG9rZW4gPSBsb29rYWhlYWQoKTtcblxuICAgICAgICBpZiAodG9rZW4udHlwZSA9PT0gVG9rZW4uSWRlbnRpZmllcikge1xuXG4gICAgICAgICAgICBpZCA9IHBhcnNlT2JqZWN0UHJvcGVydHlLZXkoKTtcblxuICAgICAgICAgICAgLy8gUHJvcGVydHkgQXNzaWdubWVudDogR2V0dGVyIGFuZCBTZXR0ZXIuXG5cbiAgICAgICAgICAgIGlmICh0b2tlbi52YWx1ZSA9PT0gJ2dldCcgJiYgIW1hdGNoKCc6JykpIHtcbiAgICAgICAgICAgICAgICBrZXkgPSBwYXJzZU9iamVjdFByb3BlcnR5S2V5KCk7XG4gICAgICAgICAgICAgICAgZXhwZWN0KCcoJyk7XG4gICAgICAgICAgICAgICAgZXhwZWN0KCcpJyk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogU3ludGF4LlByb3BlcnR5LFxuICAgICAgICAgICAgICAgICAgICBrZXk6IGtleSxcbiAgICAgICAgICAgICAgICAgICAgdmFsdWU6IHBhcnNlUHJvcGVydHlGdW5jdGlvbihbXSksXG4gICAgICAgICAgICAgICAgICAgIGtpbmQ6ICdnZXQnXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAodG9rZW4udmFsdWUgPT09ICdzZXQnICYmICFtYXRjaCgnOicpKSB7XG4gICAgICAgICAgICAgICAga2V5ID0gcGFyc2VPYmplY3RQcm9wZXJ0eUtleSgpO1xuICAgICAgICAgICAgICAgIGV4cGVjdCgnKCcpO1xuICAgICAgICAgICAgICAgIHRva2VuID0gbG9va2FoZWFkKCk7XG4gICAgICAgICAgICAgICAgaWYgKHRva2VuLnR5cGUgIT09IFRva2VuLklkZW50aWZpZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgZXhwZWN0KCcpJyk7XG4gICAgICAgICAgICAgICAgICAgIHRocm93RXJyb3JUb2xlcmFudCh0b2tlbiwgTWVzc2FnZXMuVW5leHBlY3RlZFRva2VuLCB0b2tlbi52YWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiBTeW50YXguUHJvcGVydHksXG4gICAgICAgICAgICAgICAgICAgICAgICBrZXk6IGtleSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlOiBwYXJzZVByb3BlcnR5RnVuY3Rpb24oW10pLFxuICAgICAgICAgICAgICAgICAgICAgICAga2luZDogJ3NldCdcbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBwYXJhbSA9IFsgcGFyc2VWYXJpYWJsZUlkZW50aWZpZXIoKSBdO1xuICAgICAgICAgICAgICAgICAgICBleHBlY3QoJyknKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6IFN5bnRheC5Qcm9wZXJ0eSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGtleToga2V5LFxuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6IHBhcnNlUHJvcGVydHlGdW5jdGlvbihwYXJhbSwgdG9rZW4pLFxuICAgICAgICAgICAgICAgICAgICAgICAga2luZDogJ3NldCdcbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGV4cGVjdCgnOicpO1xuICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IFN5bnRheC5Qcm9wZXJ0eSxcbiAgICAgICAgICAgICAgICAgICAga2V5OiBpZCxcbiAgICAgICAgICAgICAgICAgICAgdmFsdWU6IHBhcnNlQXNzaWdubWVudEV4cHJlc3Npb24oKSxcbiAgICAgICAgICAgICAgICAgICAga2luZDogJ2luaXQnXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmICh0b2tlbi50eXBlID09PSBUb2tlbi5FT0YgfHwgdG9rZW4udHlwZSA9PT0gVG9rZW4uUHVuY3R1YXRvcikge1xuICAgICAgICAgICAgdGhyb3dVbmV4cGVjdGVkKHRva2VuKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGtleSA9IHBhcnNlT2JqZWN0UHJvcGVydHlLZXkoKTtcbiAgICAgICAgICAgIGV4cGVjdCgnOicpO1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICB0eXBlOiBTeW50YXguUHJvcGVydHksXG4gICAgICAgICAgICAgICAga2V5OiBrZXksXG4gICAgICAgICAgICAgICAgdmFsdWU6IHBhcnNlQXNzaWdubWVudEV4cHJlc3Npb24oKSxcbiAgICAgICAgICAgICAgICBraW5kOiAnaW5pdCdcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBwYXJzZU9iamVjdEluaXRpYWxpc2VyKCkge1xuICAgICAgICB2YXIgcHJvcGVydGllcyA9IFtdLCBwcm9wZXJ0eSwgbmFtZSwga2luZCwgbWFwID0ge30sIHRvU3RyaW5nID0gU3RyaW5nO1xuXG4gICAgICAgIGV4cGVjdCgneycpO1xuXG4gICAgICAgIHdoaWxlICghbWF0Y2goJ30nKSkge1xuICAgICAgICAgICAgcHJvcGVydHkgPSBwYXJzZU9iamVjdFByb3BlcnR5KCk7XG5cbiAgICAgICAgICAgIGlmIChwcm9wZXJ0eS5rZXkudHlwZSA9PT0gU3ludGF4LklkZW50aWZpZXIpIHtcbiAgICAgICAgICAgICAgICBuYW1lID0gcHJvcGVydHkua2V5Lm5hbWU7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIG5hbWUgPSB0b1N0cmluZyhwcm9wZXJ0eS5rZXkudmFsdWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAga2luZCA9IChwcm9wZXJ0eS5raW5kID09PSAnaW5pdCcpID8gUHJvcGVydHlLaW5kLkRhdGEgOiAocHJvcGVydHkua2luZCA9PT0gJ2dldCcpID8gUHJvcGVydHlLaW5kLkdldCA6IFByb3BlcnR5S2luZC5TZXQ7XG4gICAgICAgICAgICBpZiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG1hcCwgbmFtZSkpIHtcbiAgICAgICAgICAgICAgICBpZiAobWFwW25hbWVdID09PSBQcm9wZXJ0eUtpbmQuRGF0YSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoc3RyaWN0ICYmIGtpbmQgPT09IFByb3BlcnR5S2luZC5EYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aHJvd0Vycm9yVG9sZXJhbnQoe30sIE1lc3NhZ2VzLlN0cmljdER1cGxpY2F0ZVByb3BlcnR5KTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChraW5kICE9PSBQcm9wZXJ0eUtpbmQuRGF0YSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3dFcnJvclRvbGVyYW50KHt9LCBNZXNzYWdlcy5BY2Nlc3NvckRhdGFQcm9wZXJ0eSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBpZiAoa2luZCA9PT0gUHJvcGVydHlLaW5kLkRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRocm93RXJyb3JUb2xlcmFudCh7fSwgTWVzc2FnZXMuQWNjZXNzb3JEYXRhUHJvcGVydHkpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKG1hcFtuYW1lXSAmIGtpbmQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRocm93RXJyb3JUb2xlcmFudCh7fSwgTWVzc2FnZXMuQWNjZXNzb3JHZXRTZXQpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIG1hcFtuYW1lXSB8PSBraW5kO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBtYXBbbmFtZV0gPSBraW5kO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBwcm9wZXJ0aWVzLnB1c2gocHJvcGVydHkpO1xuXG4gICAgICAgICAgICBpZiAoIW1hdGNoKCd9JykpIHtcbiAgICAgICAgICAgICAgICBleHBlY3QoJywnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGV4cGVjdCgnfScpO1xuXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB0eXBlOiBTeW50YXguT2JqZWN0RXhwcmVzc2lvbixcbiAgICAgICAgICAgIHByb3BlcnRpZXM6IHByb3BlcnRpZXNcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvLyAxMS4xLjYgVGhlIEdyb3VwaW5nIE9wZXJhdG9yXG5cbiAgICBmdW5jdGlvbiBwYXJzZUdyb3VwRXhwcmVzc2lvbigpIHtcbiAgICAgICAgdmFyIGV4cHI7XG5cbiAgICAgICAgZXhwZWN0KCcoJyk7XG5cbiAgICAgICAgZXhwciA9IHBhcnNlRXhwcmVzc2lvbigpO1xuXG4gICAgICAgIGV4cGVjdCgnKScpO1xuXG4gICAgICAgIHJldHVybiBleHByO1xuICAgIH1cblxuXG4gICAgLy8gMTEuMSBQcmltYXJ5IEV4cHJlc3Npb25zXG5cbiAgICBmdW5jdGlvbiBwYXJzZVByaW1hcnlFeHByZXNzaW9uKCkge1xuICAgICAgICB2YXIgdG9rZW4gPSBsb29rYWhlYWQoKSxcbiAgICAgICAgICAgIHR5cGUgPSB0b2tlbi50eXBlO1xuXG4gICAgICAgIGlmICh0eXBlID09PSBUb2tlbi5JZGVudGlmaWVyKSB7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHR5cGU6IFN5bnRheC5JZGVudGlmaWVyLFxuICAgICAgICAgICAgICAgIG5hbWU6IGxleCgpLnZhbHVlXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHR5cGUgPT09IFRva2VuLlN0cmluZ0xpdGVyYWwgfHwgdHlwZSA9PT0gVG9rZW4uTnVtZXJpY0xpdGVyYWwpIHtcbiAgICAgICAgICAgIGlmIChzdHJpY3QgJiYgdG9rZW4ub2N0YWwpIHtcbiAgICAgICAgICAgICAgICB0aHJvd0Vycm9yVG9sZXJhbnQodG9rZW4sIE1lc3NhZ2VzLlN0cmljdE9jdGFsTGl0ZXJhbCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gY3JlYXRlTGl0ZXJhbChsZXgoKSk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodHlwZSA9PT0gVG9rZW4uS2V5d29yZCkge1xuICAgICAgICAgICAgaWYgKG1hdGNoS2V5d29yZCgndGhpcycpKSB7XG4gICAgICAgICAgICAgICAgbGV4KCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogU3ludGF4LlRoaXNFeHByZXNzaW9uXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKG1hdGNoS2V5d29yZCgnZnVuY3Rpb24nKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBwYXJzZUZ1bmN0aW9uRXhwcmVzc2lvbigpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHR5cGUgPT09IFRva2VuLkJvb2xlYW5MaXRlcmFsKSB7XG4gICAgICAgICAgICBsZXgoKTtcbiAgICAgICAgICAgIHRva2VuLnZhbHVlID0gKHRva2VuLnZhbHVlID09PSAndHJ1ZScpO1xuICAgICAgICAgICAgcmV0dXJuIGNyZWF0ZUxpdGVyYWwodG9rZW4pO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHR5cGUgPT09IFRva2VuLk51bGxMaXRlcmFsKSB7XG4gICAgICAgICAgICBsZXgoKTtcbiAgICAgICAgICAgIHRva2VuLnZhbHVlID0gbnVsbDtcbiAgICAgICAgICAgIHJldHVybiBjcmVhdGVMaXRlcmFsKHRva2VuKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChtYXRjaCgnWycpKSB7XG4gICAgICAgICAgICByZXR1cm4gcGFyc2VBcnJheUluaXRpYWxpc2VyKCk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAobWF0Y2goJ3snKSkge1xuICAgICAgICAgICAgcmV0dXJuIHBhcnNlT2JqZWN0SW5pdGlhbGlzZXIoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChtYXRjaCgnKCcpKSB7XG4gICAgICAgICAgICByZXR1cm4gcGFyc2VHcm91cEV4cHJlc3Npb24oKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChtYXRjaCgnLycpIHx8IG1hdGNoKCcvPScpKSB7XG4gICAgICAgICAgICByZXR1cm4gY3JlYXRlTGl0ZXJhbChzY2FuUmVnRXhwKCkpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHRocm93VW5leHBlY3RlZChsZXgoKSk7XG4gICAgfVxuXG4gICAgLy8gMTEuMiBMZWZ0LUhhbmQtU2lkZSBFeHByZXNzaW9uc1xuXG4gICAgZnVuY3Rpb24gcGFyc2VBcmd1bWVudHMoKSB7XG4gICAgICAgIHZhciBhcmdzID0gW107XG5cbiAgICAgICAgZXhwZWN0KCcoJyk7XG5cbiAgICAgICAgaWYgKCFtYXRjaCgnKScpKSB7XG4gICAgICAgICAgICB3aGlsZSAoaW5kZXggPCBsZW5ndGgpIHtcbiAgICAgICAgICAgICAgICBhcmdzLnB1c2gocGFyc2VBc3NpZ25tZW50RXhwcmVzc2lvbigpKTtcbiAgICAgICAgICAgICAgICBpZiAobWF0Y2goJyknKSkge1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZXhwZWN0KCcsJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBleHBlY3QoJyknKTtcblxuICAgICAgICByZXR1cm4gYXJncztcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBwYXJzZU5vbkNvbXB1dGVkUHJvcGVydHkoKSB7XG4gICAgICAgIHZhciB0b2tlbiA9IGxleCgpO1xuXG4gICAgICAgIGlmICghaXNJZGVudGlmaWVyTmFtZSh0b2tlbikpIHtcbiAgICAgICAgICAgIHRocm93VW5leHBlY3RlZCh0b2tlbik7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgdHlwZTogU3ludGF4LklkZW50aWZpZXIsXG4gICAgICAgICAgICBuYW1lOiB0b2tlbi52YWx1ZVxuICAgICAgICB9O1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHBhcnNlTm9uQ29tcHV0ZWRNZW1iZXIoKSB7XG4gICAgICAgIGV4cGVjdCgnLicpO1xuXG4gICAgICAgIHJldHVybiBwYXJzZU5vbkNvbXB1dGVkUHJvcGVydHkoKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBwYXJzZUNvbXB1dGVkTWVtYmVyKCkge1xuICAgICAgICB2YXIgZXhwcjtcblxuICAgICAgICBleHBlY3QoJ1snKTtcblxuICAgICAgICBleHByID0gcGFyc2VFeHByZXNzaW9uKCk7XG5cbiAgICAgICAgZXhwZWN0KCddJyk7XG5cbiAgICAgICAgcmV0dXJuIGV4cHI7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcGFyc2VOZXdFeHByZXNzaW9uKCkge1xuICAgICAgICB2YXIgZXhwcjtcblxuICAgICAgICBleHBlY3RLZXl3b3JkKCduZXcnKTtcblxuICAgICAgICBleHByID0ge1xuICAgICAgICAgICAgdHlwZTogU3ludGF4Lk5ld0V4cHJlc3Npb24sXG4gICAgICAgICAgICBjYWxsZWU6IHBhcnNlTGVmdEhhbmRTaWRlRXhwcmVzc2lvbigpLFxuICAgICAgICAgICAgJ2FyZ3VtZW50cyc6IFtdXG4gICAgICAgIH07XG5cbiAgICAgICAgaWYgKG1hdGNoKCcoJykpIHtcbiAgICAgICAgICAgIGV4cHJbJ2FyZ3VtZW50cyddID0gcGFyc2VBcmd1bWVudHMoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBleHByO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHBhcnNlTGVmdEhhbmRTaWRlRXhwcmVzc2lvbkFsbG93Q2FsbCgpIHtcbiAgICAgICAgdmFyIGV4cHI7XG5cbiAgICAgICAgZXhwciA9IG1hdGNoS2V5d29yZCgnbmV3JykgPyBwYXJzZU5ld0V4cHJlc3Npb24oKSA6IHBhcnNlUHJpbWFyeUV4cHJlc3Npb24oKTtcblxuICAgICAgICB3aGlsZSAobWF0Y2goJy4nKSB8fCBtYXRjaCgnWycpIHx8IG1hdGNoKCcoJykpIHtcbiAgICAgICAgICAgIGlmIChtYXRjaCgnKCcpKSB7XG4gICAgICAgICAgICAgICAgZXhwciA9IHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogU3ludGF4LkNhbGxFeHByZXNzaW9uLFxuICAgICAgICAgICAgICAgICAgICBjYWxsZWU6IGV4cHIsXG4gICAgICAgICAgICAgICAgICAgICdhcmd1bWVudHMnOiBwYXJzZUFyZ3VtZW50cygpXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAobWF0Y2goJ1snKSkge1xuICAgICAgICAgICAgICAgIGV4cHIgPSB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IFN5bnRheC5NZW1iZXJFeHByZXNzaW9uLFxuICAgICAgICAgICAgICAgICAgICBjb21wdXRlZDogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgb2JqZWN0OiBleHByLFxuICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0eTogcGFyc2VDb21wdXRlZE1lbWJlcigpXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgZXhwciA9IHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogU3ludGF4Lk1lbWJlckV4cHJlc3Npb24sXG4gICAgICAgICAgICAgICAgICAgIGNvbXB1dGVkOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgb2JqZWN0OiBleHByLFxuICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0eTogcGFyc2VOb25Db21wdXRlZE1lbWJlcigpXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBleHByO1xuICAgIH1cblxuXG4gICAgZnVuY3Rpb24gcGFyc2VMZWZ0SGFuZFNpZGVFeHByZXNzaW9uKCkge1xuICAgICAgICB2YXIgZXhwcjtcblxuICAgICAgICBleHByID0gbWF0Y2hLZXl3b3JkKCduZXcnKSA/IHBhcnNlTmV3RXhwcmVzc2lvbigpIDogcGFyc2VQcmltYXJ5RXhwcmVzc2lvbigpO1xuXG4gICAgICAgIHdoaWxlIChtYXRjaCgnLicpIHx8IG1hdGNoKCdbJykpIHtcbiAgICAgICAgICAgIGlmIChtYXRjaCgnWycpKSB7XG4gICAgICAgICAgICAgICAgZXhwciA9IHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogU3ludGF4Lk1lbWJlckV4cHJlc3Npb24sXG4gICAgICAgICAgICAgICAgICAgIGNvbXB1dGVkOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICBvYmplY3Q6IGV4cHIsXG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnR5OiBwYXJzZUNvbXB1dGVkTWVtYmVyKClcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBleHByID0ge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiBTeW50YXguTWVtYmVyRXhwcmVzc2lvbixcbiAgICAgICAgICAgICAgICAgICAgY29tcHV0ZWQ6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICBvYmplY3Q6IGV4cHIsXG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnR5OiBwYXJzZU5vbkNvbXB1dGVkTWVtYmVyKClcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGV4cHI7XG4gICAgfVxuXG4gICAgLy8gMTEuMyBQb3N0Zml4IEV4cHJlc3Npb25zXG5cbiAgICBmdW5jdGlvbiBwYXJzZVBvc3RmaXhFeHByZXNzaW9uKCkge1xuICAgICAgICB2YXIgZXhwciA9IHBhcnNlTGVmdEhhbmRTaWRlRXhwcmVzc2lvbkFsbG93Q2FsbCgpLCB0b2tlbjtcblxuICAgICAgICB0b2tlbiA9IGxvb2thaGVhZCgpO1xuICAgICAgICBpZiAodG9rZW4udHlwZSAhPT0gVG9rZW4uUHVuY3R1YXRvcikge1xuICAgICAgICAgICAgcmV0dXJuIGV4cHI7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoKG1hdGNoKCcrKycpIHx8IG1hdGNoKCctLScpKSAmJiAhcGVla0xpbmVUZXJtaW5hdG9yKCkpIHtcbiAgICAgICAgICAgIC8vIDExLjMuMSwgMTEuMy4yXG4gICAgICAgICAgICBpZiAoc3RyaWN0ICYmIGV4cHIudHlwZSA9PT0gU3ludGF4LklkZW50aWZpZXIgJiYgaXNSZXN0cmljdGVkV29yZChleHByLm5hbWUpKSB7XG4gICAgICAgICAgICAgICAgdGhyb3dFcnJvclRvbGVyYW50KHt9LCBNZXNzYWdlcy5TdHJpY3RMSFNQb3N0Zml4KTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKCFpc0xlZnRIYW5kU2lkZShleHByKSkge1xuICAgICAgICAgICAgICAgIHRocm93RXJyb3Ioe30sIE1lc3NhZ2VzLkludmFsaWRMSFNJbkFzc2lnbm1lbnQpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBleHByID0ge1xuICAgICAgICAgICAgICAgIHR5cGU6IFN5bnRheC5VcGRhdGVFeHByZXNzaW9uLFxuICAgICAgICAgICAgICAgIG9wZXJhdG9yOiBsZXgoKS52YWx1ZSxcbiAgICAgICAgICAgICAgICBhcmd1bWVudDogZXhwcixcbiAgICAgICAgICAgICAgICBwcmVmaXg6IGZhbHNlXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGV4cHI7XG4gICAgfVxuXG4gICAgLy8gMTEuNCBVbmFyeSBPcGVyYXRvcnNcblxuICAgIGZ1bmN0aW9uIHBhcnNlVW5hcnlFeHByZXNzaW9uKCkge1xuICAgICAgICB2YXIgdG9rZW4sIGV4cHI7XG5cbiAgICAgICAgdG9rZW4gPSBsb29rYWhlYWQoKTtcbiAgICAgICAgaWYgKHRva2VuLnR5cGUgIT09IFRva2VuLlB1bmN0dWF0b3IgJiYgdG9rZW4udHlwZSAhPT0gVG9rZW4uS2V5d29yZCkge1xuICAgICAgICAgICAgcmV0dXJuIHBhcnNlUG9zdGZpeEV4cHJlc3Npb24oKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChtYXRjaCgnKysnKSB8fCBtYXRjaCgnLS0nKSkge1xuICAgICAgICAgICAgdG9rZW4gPSBsZXgoKTtcbiAgICAgICAgICAgIGV4cHIgPSBwYXJzZVVuYXJ5RXhwcmVzc2lvbigpO1xuICAgICAgICAgICAgLy8gMTEuNC40LCAxMS40LjVcbiAgICAgICAgICAgIGlmIChzdHJpY3QgJiYgZXhwci50eXBlID09PSBTeW50YXguSWRlbnRpZmllciAmJiBpc1Jlc3RyaWN0ZWRXb3JkKGV4cHIubmFtZSkpIHtcbiAgICAgICAgICAgICAgICB0aHJvd0Vycm9yVG9sZXJhbnQoe30sIE1lc3NhZ2VzLlN0cmljdExIU1ByZWZpeCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmICghaXNMZWZ0SGFuZFNpZGUoZXhwcikpIHtcbiAgICAgICAgICAgICAgICB0aHJvd0Vycm9yKHt9LCBNZXNzYWdlcy5JbnZhbGlkTEhTSW5Bc3NpZ25tZW50KTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgZXhwciA9IHtcbiAgICAgICAgICAgICAgICB0eXBlOiBTeW50YXguVXBkYXRlRXhwcmVzc2lvbixcbiAgICAgICAgICAgICAgICBvcGVyYXRvcjogdG9rZW4udmFsdWUsXG4gICAgICAgICAgICAgICAgYXJndW1lbnQ6IGV4cHIsXG4gICAgICAgICAgICAgICAgcHJlZml4OiB0cnVlXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgcmV0dXJuIGV4cHI7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAobWF0Y2goJysnKSB8fCBtYXRjaCgnLScpIHx8IG1hdGNoKCd+JykgfHwgbWF0Y2goJyEnKSkge1xuICAgICAgICAgICAgZXhwciA9IHtcbiAgICAgICAgICAgICAgICB0eXBlOiBTeW50YXguVW5hcnlFeHByZXNzaW9uLFxuICAgICAgICAgICAgICAgIG9wZXJhdG9yOiBsZXgoKS52YWx1ZSxcbiAgICAgICAgICAgICAgICBhcmd1bWVudDogcGFyc2VVbmFyeUV4cHJlc3Npb24oKSxcbiAgICAgICAgICAgICAgICBwcmVmaXg6IHRydWVcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICByZXR1cm4gZXhwcjtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChtYXRjaEtleXdvcmQoJ2RlbGV0ZScpIHx8IG1hdGNoS2V5d29yZCgndm9pZCcpIHx8IG1hdGNoS2V5d29yZCgndHlwZW9mJykpIHtcbiAgICAgICAgICAgIGV4cHIgPSB7XG4gICAgICAgICAgICAgICAgdHlwZTogU3ludGF4LlVuYXJ5RXhwcmVzc2lvbixcbiAgICAgICAgICAgICAgICBvcGVyYXRvcjogbGV4KCkudmFsdWUsXG4gICAgICAgICAgICAgICAgYXJndW1lbnQ6IHBhcnNlVW5hcnlFeHByZXNzaW9uKCksXG4gICAgICAgICAgICAgICAgcHJlZml4OiB0cnVlXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgaWYgKHN0cmljdCAmJiBleHByLm9wZXJhdG9yID09PSAnZGVsZXRlJyAmJiBleHByLmFyZ3VtZW50LnR5cGUgPT09IFN5bnRheC5JZGVudGlmaWVyKSB7XG4gICAgICAgICAgICAgICAgdGhyb3dFcnJvclRvbGVyYW50KHt9LCBNZXNzYWdlcy5TdHJpY3REZWxldGUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIGV4cHI7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gcGFyc2VQb3N0Zml4RXhwcmVzc2lvbigpO1xuICAgIH1cblxuICAgIC8vIDExLjUgTXVsdGlwbGljYXRpdmUgT3BlcmF0b3JzXG5cbiAgICBmdW5jdGlvbiBwYXJzZU11bHRpcGxpY2F0aXZlRXhwcmVzc2lvbigpIHtcbiAgICAgICAgdmFyIGV4cHIgPSBwYXJzZVVuYXJ5RXhwcmVzc2lvbigpO1xuXG4gICAgICAgIHdoaWxlIChtYXRjaCgnKicpIHx8IG1hdGNoKCcvJykgfHwgbWF0Y2goJyUnKSkge1xuICAgICAgICAgICAgZXhwciA9IHtcbiAgICAgICAgICAgICAgICB0eXBlOiBTeW50YXguQmluYXJ5RXhwcmVzc2lvbixcbiAgICAgICAgICAgICAgICBvcGVyYXRvcjogbGV4KCkudmFsdWUsXG4gICAgICAgICAgICAgICAgbGVmdDogZXhwcixcbiAgICAgICAgICAgICAgICByaWdodDogcGFyc2VVbmFyeUV4cHJlc3Npb24oKVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBleHByO1xuICAgIH1cblxuICAgIC8vIDExLjYgQWRkaXRpdmUgT3BlcmF0b3JzXG5cbiAgICBmdW5jdGlvbiBwYXJzZUFkZGl0aXZlRXhwcmVzc2lvbigpIHtcbiAgICAgICAgdmFyIGV4cHIgPSBwYXJzZU11bHRpcGxpY2F0aXZlRXhwcmVzc2lvbigpO1xuXG4gICAgICAgIHdoaWxlIChtYXRjaCgnKycpIHx8IG1hdGNoKCctJykpIHtcbiAgICAgICAgICAgIGV4cHIgPSB7XG4gICAgICAgICAgICAgICAgdHlwZTogU3ludGF4LkJpbmFyeUV4cHJlc3Npb24sXG4gICAgICAgICAgICAgICAgb3BlcmF0b3I6IGxleCgpLnZhbHVlLFxuICAgICAgICAgICAgICAgIGxlZnQ6IGV4cHIsXG4gICAgICAgICAgICAgICAgcmlnaHQ6IHBhcnNlTXVsdGlwbGljYXRpdmVFeHByZXNzaW9uKClcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gZXhwcjtcbiAgICB9XG5cbiAgICAvLyAxMS43IEJpdHdpc2UgU2hpZnQgT3BlcmF0b3JzXG5cbiAgICBmdW5jdGlvbiBwYXJzZVNoaWZ0RXhwcmVzc2lvbigpIHtcbiAgICAgICAgdmFyIGV4cHIgPSBwYXJzZUFkZGl0aXZlRXhwcmVzc2lvbigpO1xuXG4gICAgICAgIHdoaWxlIChtYXRjaCgnPDwnKSB8fCBtYXRjaCgnPj4nKSB8fCBtYXRjaCgnPj4+JykpIHtcbiAgICAgICAgICAgIGV4cHIgPSB7XG4gICAgICAgICAgICAgICAgdHlwZTogU3ludGF4LkJpbmFyeUV4cHJlc3Npb24sXG4gICAgICAgICAgICAgICAgb3BlcmF0b3I6IGxleCgpLnZhbHVlLFxuICAgICAgICAgICAgICAgIGxlZnQ6IGV4cHIsXG4gICAgICAgICAgICAgICAgcmlnaHQ6IHBhcnNlQWRkaXRpdmVFeHByZXNzaW9uKClcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gZXhwcjtcbiAgICB9XG4gICAgLy8gMTEuOCBSZWxhdGlvbmFsIE9wZXJhdG9yc1xuXG4gICAgZnVuY3Rpb24gcGFyc2VSZWxhdGlvbmFsRXhwcmVzc2lvbigpIHtcbiAgICAgICAgdmFyIGV4cHIsIHByZXZpb3VzQWxsb3dJbjtcblxuICAgICAgICBwcmV2aW91c0FsbG93SW4gPSBzdGF0ZS5hbGxvd0luO1xuICAgICAgICBzdGF0ZS5hbGxvd0luID0gdHJ1ZTtcblxuICAgICAgICBleHByID0gcGFyc2VTaGlmdEV4cHJlc3Npb24oKTtcblxuICAgICAgICB3aGlsZSAobWF0Y2goJzwnKSB8fCBtYXRjaCgnPicpIHx8IG1hdGNoKCc8PScpIHx8IG1hdGNoKCc+PScpIHx8IChwcmV2aW91c0FsbG93SW4gJiYgbWF0Y2hLZXl3b3JkKCdpbicpKSB8fCBtYXRjaEtleXdvcmQoJ2luc3RhbmNlb2YnKSkge1xuICAgICAgICAgICAgZXhwciA9IHtcbiAgICAgICAgICAgICAgICB0eXBlOiBTeW50YXguQmluYXJ5RXhwcmVzc2lvbixcbiAgICAgICAgICAgICAgICBvcGVyYXRvcjogbGV4KCkudmFsdWUsXG4gICAgICAgICAgICAgICAgbGVmdDogZXhwcixcbiAgICAgICAgICAgICAgICByaWdodDogcGFyc2VTaGlmdEV4cHJlc3Npb24oKVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuXG4gICAgICAgIHN0YXRlLmFsbG93SW4gPSBwcmV2aW91c0FsbG93SW47XG4gICAgICAgIHJldHVybiBleHByO1xuICAgIH1cblxuICAgIC8vIDExLjkgRXF1YWxpdHkgT3BlcmF0b3JzXG5cbiAgICBmdW5jdGlvbiBwYXJzZUVxdWFsaXR5RXhwcmVzc2lvbigpIHtcbiAgICAgICAgdmFyIGV4cHIgPSBwYXJzZVJlbGF0aW9uYWxFeHByZXNzaW9uKCk7XG5cbiAgICAgICAgd2hpbGUgKG1hdGNoKCc9PScpIHx8IG1hdGNoKCchPScpIHx8IG1hdGNoKCc9PT0nKSB8fCBtYXRjaCgnIT09JykpIHtcbiAgICAgICAgICAgIGV4cHIgPSB7XG4gICAgICAgICAgICAgICAgdHlwZTogU3ludGF4LkJpbmFyeUV4cHJlc3Npb24sXG4gICAgICAgICAgICAgICAgb3BlcmF0b3I6IGxleCgpLnZhbHVlLFxuICAgICAgICAgICAgICAgIGxlZnQ6IGV4cHIsXG4gICAgICAgICAgICAgICAgcmlnaHQ6IHBhcnNlUmVsYXRpb25hbEV4cHJlc3Npb24oKVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBleHByO1xuICAgIH1cblxuICAgIC8vIDExLjEwIEJpbmFyeSBCaXR3aXNlIE9wZXJhdG9yc1xuXG4gICAgZnVuY3Rpb24gcGFyc2VCaXR3aXNlQU5ERXhwcmVzc2lvbigpIHtcbiAgICAgICAgdmFyIGV4cHIgPSBwYXJzZUVxdWFsaXR5RXhwcmVzc2lvbigpO1xuXG4gICAgICAgIHdoaWxlIChtYXRjaCgnJicpKSB7XG4gICAgICAgICAgICBsZXgoKTtcbiAgICAgICAgICAgIGV4cHIgPSB7XG4gICAgICAgICAgICAgICAgdHlwZTogU3ludGF4LkJpbmFyeUV4cHJlc3Npb24sXG4gICAgICAgICAgICAgICAgb3BlcmF0b3I6ICcmJyxcbiAgICAgICAgICAgICAgICBsZWZ0OiBleHByLFxuICAgICAgICAgICAgICAgIHJpZ2h0OiBwYXJzZUVxdWFsaXR5RXhwcmVzc2lvbigpXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGV4cHI7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcGFyc2VCaXR3aXNlWE9SRXhwcmVzc2lvbigpIHtcbiAgICAgICAgdmFyIGV4cHIgPSBwYXJzZUJpdHdpc2VBTkRFeHByZXNzaW9uKCk7XG5cbiAgICAgICAgd2hpbGUgKG1hdGNoKCdeJykpIHtcbiAgICAgICAgICAgIGxleCgpO1xuICAgICAgICAgICAgZXhwciA9IHtcbiAgICAgICAgICAgICAgICB0eXBlOiBTeW50YXguQmluYXJ5RXhwcmVzc2lvbixcbiAgICAgICAgICAgICAgICBvcGVyYXRvcjogJ14nLFxuICAgICAgICAgICAgICAgIGxlZnQ6IGV4cHIsXG4gICAgICAgICAgICAgICAgcmlnaHQ6IHBhcnNlQml0d2lzZUFOREV4cHJlc3Npb24oKVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBleHByO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHBhcnNlQml0d2lzZU9SRXhwcmVzc2lvbigpIHtcbiAgICAgICAgdmFyIGV4cHIgPSBwYXJzZUJpdHdpc2VYT1JFeHByZXNzaW9uKCk7XG5cbiAgICAgICAgd2hpbGUgKG1hdGNoKCd8JykpIHtcbiAgICAgICAgICAgIGxleCgpO1xuICAgICAgICAgICAgZXhwciA9IHtcbiAgICAgICAgICAgICAgICB0eXBlOiBTeW50YXguQmluYXJ5RXhwcmVzc2lvbixcbiAgICAgICAgICAgICAgICBvcGVyYXRvcjogJ3wnLFxuICAgICAgICAgICAgICAgIGxlZnQ6IGV4cHIsXG4gICAgICAgICAgICAgICAgcmlnaHQ6IHBhcnNlQml0d2lzZVhPUkV4cHJlc3Npb24oKVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBleHByO1xuICAgIH1cblxuICAgIC8vIDExLjExIEJpbmFyeSBMb2dpY2FsIE9wZXJhdG9yc1xuXG4gICAgZnVuY3Rpb24gcGFyc2VMb2dpY2FsQU5ERXhwcmVzc2lvbigpIHtcbiAgICAgICAgdmFyIGV4cHIgPSBwYXJzZUJpdHdpc2VPUkV4cHJlc3Npb24oKTtcblxuICAgICAgICB3aGlsZSAobWF0Y2goJyYmJykpIHtcbiAgICAgICAgICAgIGxleCgpO1xuICAgICAgICAgICAgZXhwciA9IHtcbiAgICAgICAgICAgICAgICB0eXBlOiBTeW50YXguTG9naWNhbEV4cHJlc3Npb24sXG4gICAgICAgICAgICAgICAgb3BlcmF0b3I6ICcmJicsXG4gICAgICAgICAgICAgICAgbGVmdDogZXhwcixcbiAgICAgICAgICAgICAgICByaWdodDogcGFyc2VCaXR3aXNlT1JFeHByZXNzaW9uKClcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gZXhwcjtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBwYXJzZUxvZ2ljYWxPUkV4cHJlc3Npb24oKSB7XG4gICAgICAgIHZhciBleHByID0gcGFyc2VMb2dpY2FsQU5ERXhwcmVzc2lvbigpO1xuXG4gICAgICAgIHdoaWxlIChtYXRjaCgnfHwnKSkge1xuICAgICAgICAgICAgbGV4KCk7XG4gICAgICAgICAgICBleHByID0ge1xuICAgICAgICAgICAgICAgIHR5cGU6IFN5bnRheC5Mb2dpY2FsRXhwcmVzc2lvbixcbiAgICAgICAgICAgICAgICBvcGVyYXRvcjogJ3x8JyxcbiAgICAgICAgICAgICAgICBsZWZ0OiBleHByLFxuICAgICAgICAgICAgICAgIHJpZ2h0OiBwYXJzZUxvZ2ljYWxBTkRFeHByZXNzaW9uKClcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gZXhwcjtcbiAgICB9XG5cbiAgICAvLyAxMS4xMiBDb25kaXRpb25hbCBPcGVyYXRvclxuXG4gICAgZnVuY3Rpb24gcGFyc2VDb25kaXRpb25hbEV4cHJlc3Npb24oKSB7XG4gICAgICAgIHZhciBleHByLCBwcmV2aW91c0FsbG93SW4sIGNvbnNlcXVlbnQ7XG5cbiAgICAgICAgZXhwciA9IHBhcnNlTG9naWNhbE9SRXhwcmVzc2lvbigpO1xuXG4gICAgICAgIGlmIChtYXRjaCgnPycpKSB7XG4gICAgICAgICAgICBsZXgoKTtcbiAgICAgICAgICAgIHByZXZpb3VzQWxsb3dJbiA9IHN0YXRlLmFsbG93SW47XG4gICAgICAgICAgICBzdGF0ZS5hbGxvd0luID0gdHJ1ZTtcbiAgICAgICAgICAgIGNvbnNlcXVlbnQgPSBwYXJzZUFzc2lnbm1lbnRFeHByZXNzaW9uKCk7XG4gICAgICAgICAgICBzdGF0ZS5hbGxvd0luID0gcHJldmlvdXNBbGxvd0luO1xuICAgICAgICAgICAgZXhwZWN0KCc6Jyk7XG5cbiAgICAgICAgICAgIGV4cHIgPSB7XG4gICAgICAgICAgICAgICAgdHlwZTogU3ludGF4LkNvbmRpdGlvbmFsRXhwcmVzc2lvbixcbiAgICAgICAgICAgICAgICB0ZXN0OiBleHByLFxuICAgICAgICAgICAgICAgIGNvbnNlcXVlbnQ6IGNvbnNlcXVlbnQsXG4gICAgICAgICAgICAgICAgYWx0ZXJuYXRlOiBwYXJzZUFzc2lnbm1lbnRFeHByZXNzaW9uKClcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gZXhwcjtcbiAgICB9XG5cbiAgICAvLyAxMS4xMyBBc3NpZ25tZW50IE9wZXJhdG9yc1xuXG4gICAgZnVuY3Rpb24gcGFyc2VBc3NpZ25tZW50RXhwcmVzc2lvbigpIHtcbiAgICAgICAgdmFyIHRva2VuLCBleHByO1xuXG4gICAgICAgIHRva2VuID0gbG9va2FoZWFkKCk7XG4gICAgICAgIGV4cHIgPSBwYXJzZUNvbmRpdGlvbmFsRXhwcmVzc2lvbigpO1xuXG4gICAgICAgIGlmIChtYXRjaEFzc2lnbigpKSB7XG4gICAgICAgICAgICAvLyBMZWZ0SGFuZFNpZGVFeHByZXNzaW9uXG4gICAgICAgICAgICBpZiAoIWlzTGVmdEhhbmRTaWRlKGV4cHIpKSB7XG4gICAgICAgICAgICAgICAgdGhyb3dFcnJvcih7fSwgTWVzc2FnZXMuSW52YWxpZExIU0luQXNzaWdubWVudCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIDExLjEzLjFcbiAgICAgICAgICAgIGlmIChzdHJpY3QgJiYgZXhwci50eXBlID09PSBTeW50YXguSWRlbnRpZmllciAmJiBpc1Jlc3RyaWN0ZWRXb3JkKGV4cHIubmFtZSkpIHtcbiAgICAgICAgICAgICAgICB0aHJvd0Vycm9yVG9sZXJhbnQodG9rZW4sIE1lc3NhZ2VzLlN0cmljdExIU0Fzc2lnbm1lbnQpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBleHByID0ge1xuICAgICAgICAgICAgICAgIHR5cGU6IFN5bnRheC5Bc3NpZ25tZW50RXhwcmVzc2lvbixcbiAgICAgICAgICAgICAgICBvcGVyYXRvcjogbGV4KCkudmFsdWUsXG4gICAgICAgICAgICAgICAgbGVmdDogZXhwcixcbiAgICAgICAgICAgICAgICByaWdodDogcGFyc2VBc3NpZ25tZW50RXhwcmVzc2lvbigpXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGV4cHI7XG4gICAgfVxuXG4gICAgLy8gMTEuMTQgQ29tbWEgT3BlcmF0b3JcblxuICAgIGZ1bmN0aW9uIHBhcnNlRXhwcmVzc2lvbigpIHtcbiAgICAgICAgdmFyIGV4cHIgPSBwYXJzZUFzc2lnbm1lbnRFeHByZXNzaW9uKCk7XG5cbiAgICAgICAgaWYgKG1hdGNoKCcsJykpIHtcbiAgICAgICAgICAgIGV4cHIgPSB7XG4gICAgICAgICAgICAgICAgdHlwZTogU3ludGF4LlNlcXVlbmNlRXhwcmVzc2lvbixcbiAgICAgICAgICAgICAgICBleHByZXNzaW9uczogWyBleHByIF1cbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHdoaWxlIChpbmRleCA8IGxlbmd0aCkge1xuICAgICAgICAgICAgICAgIGlmICghbWF0Y2goJywnKSkge1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgbGV4KCk7XG4gICAgICAgICAgICAgICAgZXhwci5leHByZXNzaW9ucy5wdXNoKHBhcnNlQXNzaWdubWVudEV4cHJlc3Npb24oKSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZXhwcjtcbiAgICB9XG5cbiAgICAvLyAxMi4xIEJsb2NrXG5cbiAgICBmdW5jdGlvbiBwYXJzZVN0YXRlbWVudExpc3QoKSB7XG4gICAgICAgIHZhciBsaXN0ID0gW10sXG4gICAgICAgICAgICBzdGF0ZW1lbnQ7XG5cbiAgICAgICAgd2hpbGUgKGluZGV4IDwgbGVuZ3RoKSB7XG4gICAgICAgICAgICBpZiAobWF0Y2goJ30nKSkge1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgc3RhdGVtZW50ID0gcGFyc2VTb3VyY2VFbGVtZW50KCk7XG4gICAgICAgICAgICBpZiAodHlwZW9mIHN0YXRlbWVudCA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGxpc3QucHVzaChzdGF0ZW1lbnQpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGxpc3Q7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcGFyc2VCbG9jaygpIHtcbiAgICAgICAgdmFyIGJsb2NrO1xuXG4gICAgICAgIGV4cGVjdCgneycpO1xuXG4gICAgICAgIGJsb2NrID0gcGFyc2VTdGF0ZW1lbnRMaXN0KCk7XG5cbiAgICAgICAgZXhwZWN0KCd9Jyk7XG5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHR5cGU6IFN5bnRheC5CbG9ja1N0YXRlbWVudCxcbiAgICAgICAgICAgIGJvZHk6IGJsb2NrXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLy8gMTIuMiBWYXJpYWJsZSBTdGF0ZW1lbnRcblxuICAgIGZ1bmN0aW9uIHBhcnNlVmFyaWFibGVJZGVudGlmaWVyKCkge1xuICAgICAgICB2YXIgdG9rZW4gPSBsZXgoKTtcblxuICAgICAgICBpZiAodG9rZW4udHlwZSAhPT0gVG9rZW4uSWRlbnRpZmllcikge1xuICAgICAgICAgICAgdGhyb3dVbmV4cGVjdGVkKHRva2VuKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB0eXBlOiBTeW50YXguSWRlbnRpZmllcixcbiAgICAgICAgICAgIG5hbWU6IHRva2VuLnZhbHVlXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcGFyc2VWYXJpYWJsZURlY2xhcmF0aW9uKGtpbmQpIHtcbiAgICAgICAgdmFyIGlkID0gcGFyc2VWYXJpYWJsZUlkZW50aWZpZXIoKSxcbiAgICAgICAgICAgIGluaXQgPSBudWxsO1xuXG4gICAgICAgIC8vIDEyLjIuMVxuICAgICAgICBpZiAoc3RyaWN0ICYmIGlzUmVzdHJpY3RlZFdvcmQoaWQubmFtZSkpIHtcbiAgICAgICAgICAgIHRocm93RXJyb3JUb2xlcmFudCh7fSwgTWVzc2FnZXMuU3RyaWN0VmFyTmFtZSk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoa2luZCA9PT0gJ2NvbnN0Jykge1xuICAgICAgICAgICAgZXhwZWN0KCc9Jyk7XG4gICAgICAgICAgICBpbml0ID0gcGFyc2VBc3NpZ25tZW50RXhwcmVzc2lvbigpO1xuICAgICAgICB9IGVsc2UgaWYgKG1hdGNoKCc9JykpIHtcbiAgICAgICAgICAgIGxleCgpO1xuICAgICAgICAgICAgaW5pdCA9IHBhcnNlQXNzaWdubWVudEV4cHJlc3Npb24oKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB0eXBlOiBTeW50YXguVmFyaWFibGVEZWNsYXJhdG9yLFxuICAgICAgICAgICAgaWQ6IGlkLFxuICAgICAgICAgICAgaW5pdDogaW5pdFxuICAgICAgICB9O1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHBhcnNlVmFyaWFibGVEZWNsYXJhdGlvbkxpc3Qoa2luZCkge1xuICAgICAgICB2YXIgbGlzdCA9IFtdO1xuXG4gICAgICAgIGRvIHtcbiAgICAgICAgICAgIGxpc3QucHVzaChwYXJzZVZhcmlhYmxlRGVjbGFyYXRpb24oa2luZCkpO1xuICAgICAgICAgICAgaWYgKCFtYXRjaCgnLCcpKSB7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBsZXgoKTtcbiAgICAgICAgfSB3aGlsZSAoaW5kZXggPCBsZW5ndGgpO1xuXG4gICAgICAgIHJldHVybiBsaXN0O1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHBhcnNlVmFyaWFibGVTdGF0ZW1lbnQoKSB7XG4gICAgICAgIHZhciBkZWNsYXJhdGlvbnM7XG5cbiAgICAgICAgZXhwZWN0S2V5d29yZCgndmFyJyk7XG5cbiAgICAgICAgZGVjbGFyYXRpb25zID0gcGFyc2VWYXJpYWJsZURlY2xhcmF0aW9uTGlzdCgpO1xuXG4gICAgICAgIGNvbnN1bWVTZW1pY29sb24oKTtcblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgdHlwZTogU3ludGF4LlZhcmlhYmxlRGVjbGFyYXRpb24sXG4gICAgICAgICAgICBkZWNsYXJhdGlvbnM6IGRlY2xhcmF0aW9ucyxcbiAgICAgICAgICAgIGtpbmQ6ICd2YXInXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLy8ga2luZCBtYXkgYmUgYGNvbnN0YCBvciBgbGV0YFxuICAgIC8vIEJvdGggYXJlIGV4cGVyaW1lbnRhbCBhbmQgbm90IGluIHRoZSBzcGVjaWZpY2F0aW9uIHlldC5cbiAgICAvLyBzZWUgaHR0cDovL3dpa2kuZWNtYXNjcmlwdC5vcmcvZG9rdS5waHA/aWQ9aGFybW9ueTpjb25zdFxuICAgIC8vIGFuZCBodHRwOi8vd2lraS5lY21hc2NyaXB0Lm9yZy9kb2t1LnBocD9pZD1oYXJtb255OmxldFxuICAgIGZ1bmN0aW9uIHBhcnNlQ29uc3RMZXREZWNsYXJhdGlvbihraW5kKSB7XG4gICAgICAgIHZhciBkZWNsYXJhdGlvbnM7XG5cbiAgICAgICAgZXhwZWN0S2V5d29yZChraW5kKTtcblxuICAgICAgICBkZWNsYXJhdGlvbnMgPSBwYXJzZVZhcmlhYmxlRGVjbGFyYXRpb25MaXN0KGtpbmQpO1xuXG4gICAgICAgIGNvbnN1bWVTZW1pY29sb24oKTtcblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgdHlwZTogU3ludGF4LlZhcmlhYmxlRGVjbGFyYXRpb24sXG4gICAgICAgICAgICBkZWNsYXJhdGlvbnM6IGRlY2xhcmF0aW9ucyxcbiAgICAgICAgICAgIGtpbmQ6IGtpbmRcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvLyAxMi4zIEVtcHR5IFN0YXRlbWVudFxuXG4gICAgZnVuY3Rpb24gcGFyc2VFbXB0eVN0YXRlbWVudCgpIHtcbiAgICAgICAgZXhwZWN0KCc7Jyk7XG5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHR5cGU6IFN5bnRheC5FbXB0eVN0YXRlbWVudFxuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8vIDEyLjQgRXhwcmVzc2lvbiBTdGF0ZW1lbnRcblxuICAgIGZ1bmN0aW9uIHBhcnNlRXhwcmVzc2lvblN0YXRlbWVudCgpIHtcbiAgICAgICAgdmFyIGV4cHIgPSBwYXJzZUV4cHJlc3Npb24oKTtcblxuICAgICAgICBjb25zdW1lU2VtaWNvbG9uKCk7XG5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHR5cGU6IFN5bnRheC5FeHByZXNzaW9uU3RhdGVtZW50LFxuICAgICAgICAgICAgZXhwcmVzc2lvbjogZXhwclxuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8vIDEyLjUgSWYgc3RhdGVtZW50XG5cbiAgICBmdW5jdGlvbiBwYXJzZUlmU3RhdGVtZW50KCkge1xuICAgICAgICB2YXIgdGVzdCwgY29uc2VxdWVudCwgYWx0ZXJuYXRlO1xuXG4gICAgICAgIGV4cGVjdEtleXdvcmQoJ2lmJyk7XG5cbiAgICAgICAgZXhwZWN0KCcoJyk7XG5cbiAgICAgICAgdGVzdCA9IHBhcnNlRXhwcmVzc2lvbigpO1xuXG4gICAgICAgIGV4cGVjdCgnKScpO1xuXG4gICAgICAgIGNvbnNlcXVlbnQgPSBwYXJzZVN0YXRlbWVudCgpO1xuXG4gICAgICAgIGlmIChtYXRjaEtleXdvcmQoJ2Vsc2UnKSkge1xuICAgICAgICAgICAgbGV4KCk7XG4gICAgICAgICAgICBhbHRlcm5hdGUgPSBwYXJzZVN0YXRlbWVudCgpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgYWx0ZXJuYXRlID0gbnVsbDtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB0eXBlOiBTeW50YXguSWZTdGF0ZW1lbnQsXG4gICAgICAgICAgICB0ZXN0OiB0ZXN0LFxuICAgICAgICAgICAgY29uc2VxdWVudDogY29uc2VxdWVudCxcbiAgICAgICAgICAgIGFsdGVybmF0ZTogYWx0ZXJuYXRlXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLy8gMTIuNiBJdGVyYXRpb24gU3RhdGVtZW50c1xuXG4gICAgZnVuY3Rpb24gcGFyc2VEb1doaWxlU3RhdGVtZW50KCkge1xuICAgICAgICB2YXIgYm9keSwgdGVzdCwgb2xkSW5JdGVyYXRpb247XG5cbiAgICAgICAgZXhwZWN0S2V5d29yZCgnZG8nKTtcblxuICAgICAgICBvbGRJbkl0ZXJhdGlvbiA9IHN0YXRlLmluSXRlcmF0aW9uO1xuICAgICAgICBzdGF0ZS5pbkl0ZXJhdGlvbiA9IHRydWU7XG5cbiAgICAgICAgYm9keSA9IHBhcnNlU3RhdGVtZW50KCk7XG5cbiAgICAgICAgc3RhdGUuaW5JdGVyYXRpb24gPSBvbGRJbkl0ZXJhdGlvbjtcblxuICAgICAgICBleHBlY3RLZXl3b3JkKCd3aGlsZScpO1xuXG4gICAgICAgIGV4cGVjdCgnKCcpO1xuXG4gICAgICAgIHRlc3QgPSBwYXJzZUV4cHJlc3Npb24oKTtcblxuICAgICAgICBleHBlY3QoJyknKTtcblxuICAgICAgICBpZiAobWF0Y2goJzsnKSkge1xuICAgICAgICAgICAgbGV4KCk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgdHlwZTogU3ludGF4LkRvV2hpbGVTdGF0ZW1lbnQsXG4gICAgICAgICAgICBib2R5OiBib2R5LFxuICAgICAgICAgICAgdGVzdDogdGVzdFxuICAgICAgICB9O1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHBhcnNlV2hpbGVTdGF0ZW1lbnQoKSB7XG4gICAgICAgIHZhciB0ZXN0LCBib2R5LCBvbGRJbkl0ZXJhdGlvbjtcblxuICAgICAgICBleHBlY3RLZXl3b3JkKCd3aGlsZScpO1xuXG4gICAgICAgIGV4cGVjdCgnKCcpO1xuXG4gICAgICAgIHRlc3QgPSBwYXJzZUV4cHJlc3Npb24oKTtcblxuICAgICAgICBleHBlY3QoJyknKTtcblxuICAgICAgICBvbGRJbkl0ZXJhdGlvbiA9IHN0YXRlLmluSXRlcmF0aW9uO1xuICAgICAgICBzdGF0ZS5pbkl0ZXJhdGlvbiA9IHRydWU7XG5cbiAgICAgICAgYm9keSA9IHBhcnNlU3RhdGVtZW50KCk7XG5cbiAgICAgICAgc3RhdGUuaW5JdGVyYXRpb24gPSBvbGRJbkl0ZXJhdGlvbjtcblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgdHlwZTogU3ludGF4LldoaWxlU3RhdGVtZW50LFxuICAgICAgICAgICAgdGVzdDogdGVzdCxcbiAgICAgICAgICAgIGJvZHk6IGJvZHlcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBwYXJzZUZvclZhcmlhYmxlRGVjbGFyYXRpb24oKSB7XG4gICAgICAgIHZhciB0b2tlbiA9IGxleCgpO1xuXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB0eXBlOiBTeW50YXguVmFyaWFibGVEZWNsYXJhdGlvbixcbiAgICAgICAgICAgIGRlY2xhcmF0aW9uczogcGFyc2VWYXJpYWJsZURlY2xhcmF0aW9uTGlzdCgpLFxuICAgICAgICAgICAga2luZDogdG9rZW4udmFsdWVcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBwYXJzZUZvclN0YXRlbWVudCgpIHtcbiAgICAgICAgdmFyIGluaXQsIHRlc3QsIHVwZGF0ZSwgbGVmdCwgcmlnaHQsIGJvZHksIG9sZEluSXRlcmF0aW9uO1xuXG4gICAgICAgIGluaXQgPSB0ZXN0ID0gdXBkYXRlID0gbnVsbDtcblxuICAgICAgICBleHBlY3RLZXl3b3JkKCdmb3InKTtcblxuICAgICAgICBleHBlY3QoJygnKTtcblxuICAgICAgICBpZiAobWF0Y2goJzsnKSkge1xuICAgICAgICAgICAgbGV4KCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBpZiAobWF0Y2hLZXl3b3JkKCd2YXInKSB8fCBtYXRjaEtleXdvcmQoJ2xldCcpKSB7XG4gICAgICAgICAgICAgICAgc3RhdGUuYWxsb3dJbiA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIGluaXQgPSBwYXJzZUZvclZhcmlhYmxlRGVjbGFyYXRpb24oKTtcbiAgICAgICAgICAgICAgICBzdGF0ZS5hbGxvd0luID0gdHJ1ZTtcblxuICAgICAgICAgICAgICAgIGlmIChpbml0LmRlY2xhcmF0aW9ucy5sZW5ndGggPT09IDEgJiYgbWF0Y2hLZXl3b3JkKCdpbicpKSB7XG4gICAgICAgICAgICAgICAgICAgIGxleCgpO1xuICAgICAgICAgICAgICAgICAgICBsZWZ0ID0gaW5pdDtcbiAgICAgICAgICAgICAgICAgICAgcmlnaHQgPSBwYXJzZUV4cHJlc3Npb24oKTtcbiAgICAgICAgICAgICAgICAgICAgaW5pdCA9IG51bGw7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBzdGF0ZS5hbGxvd0luID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgaW5pdCA9IHBhcnNlRXhwcmVzc2lvbigpO1xuICAgICAgICAgICAgICAgIHN0YXRlLmFsbG93SW4gPSB0cnVlO1xuXG4gICAgICAgICAgICAgICAgaWYgKG1hdGNoS2V5d29yZCgnaW4nKSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBMZWZ0SGFuZFNpZGVFeHByZXNzaW9uXG4gICAgICAgICAgICAgICAgICAgIGlmICghaXNMZWZ0SGFuZFNpZGUoaW5pdCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRocm93RXJyb3Ioe30sIE1lc3NhZ2VzLkludmFsaWRMSFNJbkZvckluKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIGxleCgpO1xuICAgICAgICAgICAgICAgICAgICBsZWZ0ID0gaW5pdDtcbiAgICAgICAgICAgICAgICAgICAgcmlnaHQgPSBwYXJzZUV4cHJlc3Npb24oKTtcbiAgICAgICAgICAgICAgICAgICAgaW5pdCA9IG51bGw7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAodHlwZW9mIGxlZnQgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgZXhwZWN0KCc7Jyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodHlwZW9mIGxlZnQgPT09ICd1bmRlZmluZWQnKSB7XG5cbiAgICAgICAgICAgIGlmICghbWF0Y2goJzsnKSkge1xuICAgICAgICAgICAgICAgIHRlc3QgPSBwYXJzZUV4cHJlc3Npb24oKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGV4cGVjdCgnOycpO1xuXG4gICAgICAgICAgICBpZiAoIW1hdGNoKCcpJykpIHtcbiAgICAgICAgICAgICAgICB1cGRhdGUgPSBwYXJzZUV4cHJlc3Npb24oKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGV4cGVjdCgnKScpO1xuXG4gICAgICAgIG9sZEluSXRlcmF0aW9uID0gc3RhdGUuaW5JdGVyYXRpb247XG4gICAgICAgIHN0YXRlLmluSXRlcmF0aW9uID0gdHJ1ZTtcblxuICAgICAgICBib2R5ID0gcGFyc2VTdGF0ZW1lbnQoKTtcblxuICAgICAgICBzdGF0ZS5pbkl0ZXJhdGlvbiA9IG9sZEluSXRlcmF0aW9uO1xuXG4gICAgICAgIGlmICh0eXBlb2YgbGVmdCA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgdHlwZTogU3ludGF4LkZvclN0YXRlbWVudCxcbiAgICAgICAgICAgICAgICBpbml0OiBpbml0LFxuICAgICAgICAgICAgICAgIHRlc3Q6IHRlc3QsXG4gICAgICAgICAgICAgICAgdXBkYXRlOiB1cGRhdGUsXG4gICAgICAgICAgICAgICAgYm9keTogYm9keVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB0eXBlOiBTeW50YXguRm9ySW5TdGF0ZW1lbnQsXG4gICAgICAgICAgICBsZWZ0OiBsZWZ0LFxuICAgICAgICAgICAgcmlnaHQ6IHJpZ2h0LFxuICAgICAgICAgICAgYm9keTogYm9keSxcbiAgICAgICAgICAgIGVhY2g6IGZhbHNlXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLy8gMTIuNyBUaGUgY29udGludWUgc3RhdGVtZW50XG5cbiAgICBmdW5jdGlvbiBwYXJzZUNvbnRpbnVlU3RhdGVtZW50KCkge1xuICAgICAgICB2YXIgdG9rZW4sIGxhYmVsID0gbnVsbDtcblxuICAgICAgICBleHBlY3RLZXl3b3JkKCdjb250aW51ZScpO1xuXG4gICAgICAgIC8vIE9wdGltaXplIHRoZSBtb3N0IGNvbW1vbiBmb3JtOiAnY29udGludWU7Jy5cbiAgICAgICAgaWYgKHNvdXJjZVtpbmRleF0gPT09ICc7Jykge1xuICAgICAgICAgICAgbGV4KCk7XG5cbiAgICAgICAgICAgIGlmICghc3RhdGUuaW5JdGVyYXRpb24pIHtcbiAgICAgICAgICAgICAgICB0aHJvd0Vycm9yKHt9LCBNZXNzYWdlcy5JbGxlZ2FsQ29udGludWUpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHR5cGU6IFN5bnRheC5Db250aW51ZVN0YXRlbWVudCxcbiAgICAgICAgICAgICAgICBsYWJlbDogbnVsbFxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChwZWVrTGluZVRlcm1pbmF0b3IoKSkge1xuICAgICAgICAgICAgaWYgKCFzdGF0ZS5pbkl0ZXJhdGlvbikge1xuICAgICAgICAgICAgICAgIHRocm93RXJyb3Ioe30sIE1lc3NhZ2VzLklsbGVnYWxDb250aW51ZSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgdHlwZTogU3ludGF4LkNvbnRpbnVlU3RhdGVtZW50LFxuICAgICAgICAgICAgICAgIGxhYmVsOiBudWxsXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG5cbiAgICAgICAgdG9rZW4gPSBsb29rYWhlYWQoKTtcbiAgICAgICAgaWYgKHRva2VuLnR5cGUgPT09IFRva2VuLklkZW50aWZpZXIpIHtcbiAgICAgICAgICAgIGxhYmVsID0gcGFyc2VWYXJpYWJsZUlkZW50aWZpZXIoKTtcblxuICAgICAgICAgICAgaWYgKCFPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwoc3RhdGUubGFiZWxTZXQsIGxhYmVsLm5hbWUpKSB7XG4gICAgICAgICAgICAgICAgdGhyb3dFcnJvcih7fSwgTWVzc2FnZXMuVW5rbm93bkxhYmVsLCBsYWJlbC5uYW1lKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN1bWVTZW1pY29sb24oKTtcblxuICAgICAgICBpZiAobGFiZWwgPT09IG51bGwgJiYgIXN0YXRlLmluSXRlcmF0aW9uKSB7XG4gICAgICAgICAgICB0aHJvd0Vycm9yKHt9LCBNZXNzYWdlcy5JbGxlZ2FsQ29udGludWUpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHR5cGU6IFN5bnRheC5Db250aW51ZVN0YXRlbWVudCxcbiAgICAgICAgICAgIGxhYmVsOiBsYWJlbFxuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8vIDEyLjggVGhlIGJyZWFrIHN0YXRlbWVudFxuXG4gICAgZnVuY3Rpb24gcGFyc2VCcmVha1N0YXRlbWVudCgpIHtcbiAgICAgICAgdmFyIHRva2VuLCBsYWJlbCA9IG51bGw7XG5cbiAgICAgICAgZXhwZWN0S2V5d29yZCgnYnJlYWsnKTtcblxuICAgICAgICAvLyBPcHRpbWl6ZSB0aGUgbW9zdCBjb21tb24gZm9ybTogJ2JyZWFrOycuXG4gICAgICAgIGlmIChzb3VyY2VbaW5kZXhdID09PSAnOycpIHtcbiAgICAgICAgICAgIGxleCgpO1xuXG4gICAgICAgICAgICBpZiAoIShzdGF0ZS5pbkl0ZXJhdGlvbiB8fCBzdGF0ZS5pblN3aXRjaCkpIHtcbiAgICAgICAgICAgICAgICB0aHJvd0Vycm9yKHt9LCBNZXNzYWdlcy5JbGxlZ2FsQnJlYWspO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHR5cGU6IFN5bnRheC5CcmVha1N0YXRlbWVudCxcbiAgICAgICAgICAgICAgICBsYWJlbDogbnVsbFxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChwZWVrTGluZVRlcm1pbmF0b3IoKSkge1xuICAgICAgICAgICAgaWYgKCEoc3RhdGUuaW5JdGVyYXRpb24gfHwgc3RhdGUuaW5Td2l0Y2gpKSB7XG4gICAgICAgICAgICAgICAgdGhyb3dFcnJvcih7fSwgTWVzc2FnZXMuSWxsZWdhbEJyZWFrKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICB0eXBlOiBTeW50YXguQnJlYWtTdGF0ZW1lbnQsXG4gICAgICAgICAgICAgICAgbGFiZWw6IG51bGxcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cblxuICAgICAgICB0b2tlbiA9IGxvb2thaGVhZCgpO1xuICAgICAgICBpZiAodG9rZW4udHlwZSA9PT0gVG9rZW4uSWRlbnRpZmllcikge1xuICAgICAgICAgICAgbGFiZWwgPSBwYXJzZVZhcmlhYmxlSWRlbnRpZmllcigpO1xuXG4gICAgICAgICAgICBpZiAoIU9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChzdGF0ZS5sYWJlbFNldCwgbGFiZWwubmFtZSkpIHtcbiAgICAgICAgICAgICAgICB0aHJvd0Vycm9yKHt9LCBNZXNzYWdlcy5Vbmtub3duTGFiZWwsIGxhYmVsLm5hbWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgY29uc3VtZVNlbWljb2xvbigpO1xuXG4gICAgICAgIGlmIChsYWJlbCA9PT0gbnVsbCAmJiAhKHN0YXRlLmluSXRlcmF0aW9uIHx8IHN0YXRlLmluU3dpdGNoKSkge1xuICAgICAgICAgICAgdGhyb3dFcnJvcih7fSwgTWVzc2FnZXMuSWxsZWdhbEJyZWFrKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB0eXBlOiBTeW50YXguQnJlYWtTdGF0ZW1lbnQsXG4gICAgICAgICAgICBsYWJlbDogbGFiZWxcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvLyAxMi45IFRoZSByZXR1cm4gc3RhdGVtZW50XG5cbiAgICBmdW5jdGlvbiBwYXJzZVJldHVyblN0YXRlbWVudCgpIHtcbiAgICAgICAgdmFyIHRva2VuLCBhcmd1bWVudCA9IG51bGw7XG5cbiAgICAgICAgZXhwZWN0S2V5d29yZCgncmV0dXJuJyk7XG5cbiAgICAgICAgaWYgKCFzdGF0ZS5pbkZ1bmN0aW9uQm9keSkge1xuICAgICAgICAgICAgdGhyb3dFcnJvclRvbGVyYW50KHt9LCBNZXNzYWdlcy5JbGxlZ2FsUmV0dXJuKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vICdyZXR1cm4nIGZvbGxvd2VkIGJ5IGEgc3BhY2UgYW5kIGFuIGlkZW50aWZpZXIgaXMgdmVyeSBjb21tb24uXG4gICAgICAgIGlmIChzb3VyY2VbaW5kZXhdID09PSAnICcpIHtcbiAgICAgICAgICAgIGlmIChpc0lkZW50aWZpZXJTdGFydChzb3VyY2VbaW5kZXggKyAxXSkpIHtcbiAgICAgICAgICAgICAgICBhcmd1bWVudCA9IHBhcnNlRXhwcmVzc2lvbigpO1xuICAgICAgICAgICAgICAgIGNvbnN1bWVTZW1pY29sb24oKTtcbiAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiBTeW50YXguUmV0dXJuU3RhdGVtZW50LFxuICAgICAgICAgICAgICAgICAgICBhcmd1bWVudDogYXJndW1lbnRcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHBlZWtMaW5lVGVybWluYXRvcigpKSB7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHR5cGU6IFN5bnRheC5SZXR1cm5TdGF0ZW1lbnQsXG4gICAgICAgICAgICAgICAgYXJndW1lbnQ6IG51bGxcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIW1hdGNoKCc7JykpIHtcbiAgICAgICAgICAgIHRva2VuID0gbG9va2FoZWFkKCk7XG4gICAgICAgICAgICBpZiAoIW1hdGNoKCd9JykgJiYgdG9rZW4udHlwZSAhPT0gVG9rZW4uRU9GKSB7XG4gICAgICAgICAgICAgICAgYXJndW1lbnQgPSBwYXJzZUV4cHJlc3Npb24oKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN1bWVTZW1pY29sb24oKTtcblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgdHlwZTogU3ludGF4LlJldHVyblN0YXRlbWVudCxcbiAgICAgICAgICAgIGFyZ3VtZW50OiBhcmd1bWVudFxuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8vIDEyLjEwIFRoZSB3aXRoIHN0YXRlbWVudFxuXG4gICAgZnVuY3Rpb24gcGFyc2VXaXRoU3RhdGVtZW50KCkge1xuICAgICAgICB2YXIgb2JqZWN0LCBib2R5O1xuXG4gICAgICAgIGlmIChzdHJpY3QpIHtcbiAgICAgICAgICAgIHRocm93RXJyb3JUb2xlcmFudCh7fSwgTWVzc2FnZXMuU3RyaWN0TW9kZVdpdGgpO1xuICAgICAgICB9XG5cbiAgICAgICAgZXhwZWN0S2V5d29yZCgnd2l0aCcpO1xuXG4gICAgICAgIGV4cGVjdCgnKCcpO1xuXG4gICAgICAgIG9iamVjdCA9IHBhcnNlRXhwcmVzc2lvbigpO1xuXG4gICAgICAgIGV4cGVjdCgnKScpO1xuXG4gICAgICAgIGJvZHkgPSBwYXJzZVN0YXRlbWVudCgpO1xuXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB0eXBlOiBTeW50YXguV2l0aFN0YXRlbWVudCxcbiAgICAgICAgICAgIG9iamVjdDogb2JqZWN0LFxuICAgICAgICAgICAgYm9keTogYm9keVxuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8vIDEyLjEwIFRoZSBzd2l0aCBzdGF0ZW1lbnRcblxuICAgIGZ1bmN0aW9uIHBhcnNlU3dpdGNoQ2FzZSgpIHtcbiAgICAgICAgdmFyIHRlc3QsXG4gICAgICAgICAgICBjb25zZXF1ZW50ID0gW10sXG4gICAgICAgICAgICBzdGF0ZW1lbnQ7XG5cbiAgICAgICAgaWYgKG1hdGNoS2V5d29yZCgnZGVmYXVsdCcpKSB7XG4gICAgICAgICAgICBsZXgoKTtcbiAgICAgICAgICAgIHRlc3QgPSBudWxsO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZXhwZWN0S2V5d29yZCgnY2FzZScpO1xuICAgICAgICAgICAgdGVzdCA9IHBhcnNlRXhwcmVzc2lvbigpO1xuICAgICAgICB9XG4gICAgICAgIGV4cGVjdCgnOicpO1xuXG4gICAgICAgIHdoaWxlIChpbmRleCA8IGxlbmd0aCkge1xuICAgICAgICAgICAgaWYgKG1hdGNoKCd9JykgfHwgbWF0Y2hLZXl3b3JkKCdkZWZhdWx0JykgfHwgbWF0Y2hLZXl3b3JkKCdjYXNlJykpIHtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHN0YXRlbWVudCA9IHBhcnNlU3RhdGVtZW50KCk7XG4gICAgICAgICAgICBpZiAodHlwZW9mIHN0YXRlbWVudCA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbnNlcXVlbnQucHVzaChzdGF0ZW1lbnQpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHR5cGU6IFN5bnRheC5Td2l0Y2hDYXNlLFxuICAgICAgICAgICAgdGVzdDogdGVzdCxcbiAgICAgICAgICAgIGNvbnNlcXVlbnQ6IGNvbnNlcXVlbnRcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBwYXJzZVN3aXRjaFN0YXRlbWVudCgpIHtcbiAgICAgICAgdmFyIGRpc2NyaW1pbmFudCwgY2FzZXMsIGNsYXVzZSwgb2xkSW5Td2l0Y2gsIGRlZmF1bHRGb3VuZDtcblxuICAgICAgICBleHBlY3RLZXl3b3JkKCdzd2l0Y2gnKTtcblxuICAgICAgICBleHBlY3QoJygnKTtcblxuICAgICAgICBkaXNjcmltaW5hbnQgPSBwYXJzZUV4cHJlc3Npb24oKTtcblxuICAgICAgICBleHBlY3QoJyknKTtcblxuICAgICAgICBleHBlY3QoJ3snKTtcblxuICAgICAgICBpZiAobWF0Y2goJ30nKSkge1xuICAgICAgICAgICAgbGV4KCk7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHR5cGU6IFN5bnRheC5Td2l0Y2hTdGF0ZW1lbnQsXG4gICAgICAgICAgICAgICAgZGlzY3JpbWluYW50OiBkaXNjcmltaW5hbnRcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cblxuICAgICAgICBjYXNlcyA9IFtdO1xuXG4gICAgICAgIG9sZEluU3dpdGNoID0gc3RhdGUuaW5Td2l0Y2g7XG4gICAgICAgIHN0YXRlLmluU3dpdGNoID0gdHJ1ZTtcbiAgICAgICAgZGVmYXVsdEZvdW5kID0gZmFsc2U7XG5cbiAgICAgICAgd2hpbGUgKGluZGV4IDwgbGVuZ3RoKSB7XG4gICAgICAgICAgICBpZiAobWF0Y2goJ30nKSkge1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2xhdXNlID0gcGFyc2VTd2l0Y2hDYXNlKCk7XG4gICAgICAgICAgICBpZiAoY2xhdXNlLnRlc3QgPT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICBpZiAoZGVmYXVsdEZvdW5kKSB7XG4gICAgICAgICAgICAgICAgICAgIHRocm93RXJyb3Ioe30sIE1lc3NhZ2VzLk11bHRpcGxlRGVmYXVsdHNJblN3aXRjaCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGRlZmF1bHRGb3VuZCA9IHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjYXNlcy5wdXNoKGNsYXVzZSk7XG4gICAgICAgIH1cblxuICAgICAgICBzdGF0ZS5pblN3aXRjaCA9IG9sZEluU3dpdGNoO1xuXG4gICAgICAgIGV4cGVjdCgnfScpO1xuXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB0eXBlOiBTeW50YXguU3dpdGNoU3RhdGVtZW50LFxuICAgICAgICAgICAgZGlzY3JpbWluYW50OiBkaXNjcmltaW5hbnQsXG4gICAgICAgICAgICBjYXNlczogY2FzZXNcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvLyAxMi4xMyBUaGUgdGhyb3cgc3RhdGVtZW50XG5cbiAgICBmdW5jdGlvbiBwYXJzZVRocm93U3RhdGVtZW50KCkge1xuICAgICAgICB2YXIgYXJndW1lbnQ7XG5cbiAgICAgICAgZXhwZWN0S2V5d29yZCgndGhyb3cnKTtcblxuICAgICAgICBpZiAocGVla0xpbmVUZXJtaW5hdG9yKCkpIHtcbiAgICAgICAgICAgIHRocm93RXJyb3Ioe30sIE1lc3NhZ2VzLk5ld2xpbmVBZnRlclRocm93KTtcbiAgICAgICAgfVxuXG4gICAgICAgIGFyZ3VtZW50ID0gcGFyc2VFeHByZXNzaW9uKCk7XG5cbiAgICAgICAgY29uc3VtZVNlbWljb2xvbigpO1xuXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB0eXBlOiBTeW50YXguVGhyb3dTdGF0ZW1lbnQsXG4gICAgICAgICAgICBhcmd1bWVudDogYXJndW1lbnRcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvLyAxMi4xNCBUaGUgdHJ5IHN0YXRlbWVudFxuXG4gICAgZnVuY3Rpb24gcGFyc2VDYXRjaENsYXVzZSgpIHtcbiAgICAgICAgdmFyIHBhcmFtO1xuXG4gICAgICAgIGV4cGVjdEtleXdvcmQoJ2NhdGNoJyk7XG5cbiAgICAgICAgZXhwZWN0KCcoJyk7XG4gICAgICAgIGlmIChtYXRjaCgnKScpKSB7XG4gICAgICAgICAgICB0aHJvd1VuZXhwZWN0ZWQobG9va2FoZWFkKCkpO1xuICAgICAgICB9XG5cbiAgICAgICAgcGFyYW0gPSBwYXJzZVZhcmlhYmxlSWRlbnRpZmllcigpO1xuICAgICAgICAvLyAxMi4xNC4xXG4gICAgICAgIGlmIChzdHJpY3QgJiYgaXNSZXN0cmljdGVkV29yZChwYXJhbS5uYW1lKSkge1xuICAgICAgICAgICAgdGhyb3dFcnJvclRvbGVyYW50KHt9LCBNZXNzYWdlcy5TdHJpY3RDYXRjaFZhcmlhYmxlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGV4cGVjdCgnKScpO1xuXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB0eXBlOiBTeW50YXguQ2F0Y2hDbGF1c2UsXG4gICAgICAgICAgICBwYXJhbTogcGFyYW0sXG4gICAgICAgICAgICBib2R5OiBwYXJzZUJsb2NrKClcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBwYXJzZVRyeVN0YXRlbWVudCgpIHtcbiAgICAgICAgdmFyIGJsb2NrLCBoYW5kbGVycyA9IFtdLCBmaW5hbGl6ZXIgPSBudWxsO1xuXG4gICAgICAgIGV4cGVjdEtleXdvcmQoJ3RyeScpO1xuXG4gICAgICAgIGJsb2NrID0gcGFyc2VCbG9jaygpO1xuXG4gICAgICAgIGlmIChtYXRjaEtleXdvcmQoJ2NhdGNoJykpIHtcbiAgICAgICAgICAgIGhhbmRsZXJzLnB1c2gocGFyc2VDYXRjaENsYXVzZSgpKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChtYXRjaEtleXdvcmQoJ2ZpbmFsbHknKSkge1xuICAgICAgICAgICAgbGV4KCk7XG4gICAgICAgICAgICBmaW5hbGl6ZXIgPSBwYXJzZUJsb2NrKCk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoaGFuZGxlcnMubGVuZ3RoID09PSAwICYmICFmaW5hbGl6ZXIpIHtcbiAgICAgICAgICAgIHRocm93RXJyb3Ioe30sIE1lc3NhZ2VzLk5vQ2F0Y2hPckZpbmFsbHkpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHR5cGU6IFN5bnRheC5UcnlTdGF0ZW1lbnQsXG4gICAgICAgICAgICBibG9jazogYmxvY2ssXG4gICAgICAgICAgICBndWFyZGVkSGFuZGxlcnM6IFtdLFxuICAgICAgICAgICAgaGFuZGxlcnM6IGhhbmRsZXJzLFxuICAgICAgICAgICAgZmluYWxpemVyOiBmaW5hbGl6ZXJcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvLyAxMi4xNSBUaGUgZGVidWdnZXIgc3RhdGVtZW50XG5cbiAgICBmdW5jdGlvbiBwYXJzZURlYnVnZ2VyU3RhdGVtZW50KCkge1xuICAgICAgICBleHBlY3RLZXl3b3JkKCdkZWJ1Z2dlcicpO1xuXG4gICAgICAgIGNvbnN1bWVTZW1pY29sb24oKTtcblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgdHlwZTogU3ludGF4LkRlYnVnZ2VyU3RhdGVtZW50XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLy8gMTIgU3RhdGVtZW50c1xuXG4gICAgZnVuY3Rpb24gcGFyc2VTdGF0ZW1lbnQoKSB7XG4gICAgICAgIHZhciB0b2tlbiA9IGxvb2thaGVhZCgpLFxuICAgICAgICAgICAgZXhwcixcbiAgICAgICAgICAgIGxhYmVsZWRCb2R5O1xuXG4gICAgICAgIGlmICh0b2tlbi50eXBlID09PSBUb2tlbi5FT0YpIHtcbiAgICAgICAgICAgIHRocm93VW5leHBlY3RlZCh0b2tlbik7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodG9rZW4udHlwZSA9PT0gVG9rZW4uUHVuY3R1YXRvcikge1xuICAgICAgICAgICAgc3dpdGNoICh0b2tlbi52YWx1ZSkge1xuICAgICAgICAgICAgY2FzZSAnOyc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIHBhcnNlRW1wdHlTdGF0ZW1lbnQoKTtcbiAgICAgICAgICAgIGNhc2UgJ3snOlxuICAgICAgICAgICAgICAgIHJldHVybiBwYXJzZUJsb2NrKCk7XG4gICAgICAgICAgICBjYXNlICcoJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gcGFyc2VFeHByZXNzaW9uU3RhdGVtZW50KCk7XG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHRva2VuLnR5cGUgPT09IFRva2VuLktleXdvcmQpIHtcbiAgICAgICAgICAgIHN3aXRjaCAodG9rZW4udmFsdWUpIHtcbiAgICAgICAgICAgIGNhc2UgJ2JyZWFrJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gcGFyc2VCcmVha1N0YXRlbWVudCgpO1xuICAgICAgICAgICAgY2FzZSAnY29udGludWUnOlxuICAgICAgICAgICAgICAgIHJldHVybiBwYXJzZUNvbnRpbnVlU3RhdGVtZW50KCk7XG4gICAgICAgICAgICBjYXNlICdkZWJ1Z2dlcic6XG4gICAgICAgICAgICAgICAgcmV0dXJuIHBhcnNlRGVidWdnZXJTdGF0ZW1lbnQoKTtcbiAgICAgICAgICAgIGNhc2UgJ2RvJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gcGFyc2VEb1doaWxlU3RhdGVtZW50KCk7XG4gICAgICAgICAgICBjYXNlICdmb3InOlxuICAgICAgICAgICAgICAgIHJldHVybiBwYXJzZUZvclN0YXRlbWVudCgpO1xuICAgICAgICAgICAgY2FzZSAnZnVuY3Rpb24nOlxuICAgICAgICAgICAgICAgIHJldHVybiBwYXJzZUZ1bmN0aW9uRGVjbGFyYXRpb24oKTtcbiAgICAgICAgICAgIGNhc2UgJ2lmJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gcGFyc2VJZlN0YXRlbWVudCgpO1xuICAgICAgICAgICAgY2FzZSAncmV0dXJuJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gcGFyc2VSZXR1cm5TdGF0ZW1lbnQoKTtcbiAgICAgICAgICAgIGNhc2UgJ3N3aXRjaCc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIHBhcnNlU3dpdGNoU3RhdGVtZW50KCk7XG4gICAgICAgICAgICBjYXNlICd0aHJvdyc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIHBhcnNlVGhyb3dTdGF0ZW1lbnQoKTtcbiAgICAgICAgICAgIGNhc2UgJ3RyeSc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIHBhcnNlVHJ5U3RhdGVtZW50KCk7XG4gICAgICAgICAgICBjYXNlICd2YXInOlxuICAgICAgICAgICAgICAgIHJldHVybiBwYXJzZVZhcmlhYmxlU3RhdGVtZW50KCk7XG4gICAgICAgICAgICBjYXNlICd3aGlsZSc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIHBhcnNlV2hpbGVTdGF0ZW1lbnQoKTtcbiAgICAgICAgICAgIGNhc2UgJ3dpdGgnOlxuICAgICAgICAgICAgICAgIHJldHVybiBwYXJzZVdpdGhTdGF0ZW1lbnQoKTtcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBleHByID0gcGFyc2VFeHByZXNzaW9uKCk7XG5cbiAgICAgICAgLy8gMTIuMTIgTGFiZWxsZWQgU3RhdGVtZW50c1xuICAgICAgICBpZiAoKGV4cHIudHlwZSA9PT0gU3ludGF4LklkZW50aWZpZXIpICYmIG1hdGNoKCc6JykpIHtcbiAgICAgICAgICAgIGxleCgpO1xuXG4gICAgICAgICAgICBpZiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKHN0YXRlLmxhYmVsU2V0LCBleHByLm5hbWUpKSB7XG4gICAgICAgICAgICAgICAgdGhyb3dFcnJvcih7fSwgTWVzc2FnZXMuUmVkZWNsYXJhdGlvbiwgJ0xhYmVsJywgZXhwci5uYW1lKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgc3RhdGUubGFiZWxTZXRbZXhwci5uYW1lXSA9IHRydWU7XG4gICAgICAgICAgICBsYWJlbGVkQm9keSA9IHBhcnNlU3RhdGVtZW50KCk7XG4gICAgICAgICAgICBkZWxldGUgc3RhdGUubGFiZWxTZXRbZXhwci5uYW1lXTtcblxuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICB0eXBlOiBTeW50YXguTGFiZWxlZFN0YXRlbWVudCxcbiAgICAgICAgICAgICAgICBsYWJlbDogZXhwcixcbiAgICAgICAgICAgICAgICBib2R5OiBsYWJlbGVkQm9keVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN1bWVTZW1pY29sb24oKTtcblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgdHlwZTogU3ludGF4LkV4cHJlc3Npb25TdGF0ZW1lbnQsXG4gICAgICAgICAgICBleHByZXNzaW9uOiBleHByXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLy8gMTMgRnVuY3Rpb24gRGVmaW5pdGlvblxuXG4gICAgZnVuY3Rpb24gcGFyc2VGdW5jdGlvblNvdXJjZUVsZW1lbnRzKCkge1xuICAgICAgICB2YXIgc291cmNlRWxlbWVudCwgc291cmNlRWxlbWVudHMgPSBbXSwgdG9rZW4sIGRpcmVjdGl2ZSwgZmlyc3RSZXN0cmljdGVkLFxuICAgICAgICAgICAgb2xkTGFiZWxTZXQsIG9sZEluSXRlcmF0aW9uLCBvbGRJblN3aXRjaCwgb2xkSW5GdW5jdGlvbkJvZHk7XG5cbiAgICAgICAgZXhwZWN0KCd7Jyk7XG5cbiAgICAgICAgd2hpbGUgKGluZGV4IDwgbGVuZ3RoKSB7XG4gICAgICAgICAgICB0b2tlbiA9IGxvb2thaGVhZCgpO1xuICAgICAgICAgICAgaWYgKHRva2VuLnR5cGUgIT09IFRva2VuLlN0cmluZ0xpdGVyYWwpIHtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgc291cmNlRWxlbWVudCA9IHBhcnNlU291cmNlRWxlbWVudCgpO1xuICAgICAgICAgICAgc291cmNlRWxlbWVudHMucHVzaChzb3VyY2VFbGVtZW50KTtcbiAgICAgICAgICAgIGlmIChzb3VyY2VFbGVtZW50LmV4cHJlc3Npb24udHlwZSAhPT0gU3ludGF4LkxpdGVyYWwpIHtcbiAgICAgICAgICAgICAgICAvLyB0aGlzIGlzIG5vdCBkaXJlY3RpdmVcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGRpcmVjdGl2ZSA9IHNsaWNlU291cmNlKHRva2VuLnJhbmdlWzBdICsgMSwgdG9rZW4ucmFuZ2VbMV0gLSAxKTtcbiAgICAgICAgICAgIGlmIChkaXJlY3RpdmUgPT09ICd1c2Ugc3RyaWN0Jykge1xuICAgICAgICAgICAgICAgIHN0cmljdCA9IHRydWU7XG4gICAgICAgICAgICAgICAgaWYgKGZpcnN0UmVzdHJpY3RlZCkge1xuICAgICAgICAgICAgICAgICAgICB0aHJvd0Vycm9yVG9sZXJhbnQoZmlyc3RSZXN0cmljdGVkLCBNZXNzYWdlcy5TdHJpY3RPY3RhbExpdGVyYWwpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgaWYgKCFmaXJzdFJlc3RyaWN0ZWQgJiYgdG9rZW4ub2N0YWwpIHtcbiAgICAgICAgICAgICAgICAgICAgZmlyc3RSZXN0cmljdGVkID0gdG9rZW47XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgb2xkTGFiZWxTZXQgPSBzdGF0ZS5sYWJlbFNldDtcbiAgICAgICAgb2xkSW5JdGVyYXRpb24gPSBzdGF0ZS5pbkl0ZXJhdGlvbjtcbiAgICAgICAgb2xkSW5Td2l0Y2ggPSBzdGF0ZS5pblN3aXRjaDtcbiAgICAgICAgb2xkSW5GdW5jdGlvbkJvZHkgPSBzdGF0ZS5pbkZ1bmN0aW9uQm9keTtcblxuICAgICAgICBzdGF0ZS5sYWJlbFNldCA9IHt9O1xuICAgICAgICBzdGF0ZS5pbkl0ZXJhdGlvbiA9IGZhbHNlO1xuICAgICAgICBzdGF0ZS5pblN3aXRjaCA9IGZhbHNlO1xuICAgICAgICBzdGF0ZS5pbkZ1bmN0aW9uQm9keSA9IHRydWU7XG5cbiAgICAgICAgd2hpbGUgKGluZGV4IDwgbGVuZ3RoKSB7XG4gICAgICAgICAgICBpZiAobWF0Y2goJ30nKSkge1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgc291cmNlRWxlbWVudCA9IHBhcnNlU291cmNlRWxlbWVudCgpO1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBzb3VyY2VFbGVtZW50ID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgc291cmNlRWxlbWVudHMucHVzaChzb3VyY2VFbGVtZW50KTtcbiAgICAgICAgfVxuXG4gICAgICAgIGV4cGVjdCgnfScpO1xuXG4gICAgICAgIHN0YXRlLmxhYmVsU2V0ID0gb2xkTGFiZWxTZXQ7XG4gICAgICAgIHN0YXRlLmluSXRlcmF0aW9uID0gb2xkSW5JdGVyYXRpb247XG4gICAgICAgIHN0YXRlLmluU3dpdGNoID0gb2xkSW5Td2l0Y2g7XG4gICAgICAgIHN0YXRlLmluRnVuY3Rpb25Cb2R5ID0gb2xkSW5GdW5jdGlvbkJvZHk7XG5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHR5cGU6IFN5bnRheC5CbG9ja1N0YXRlbWVudCxcbiAgICAgICAgICAgIGJvZHk6IHNvdXJjZUVsZW1lbnRzXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcGFyc2VGdW5jdGlvbkRlY2xhcmF0aW9uKCkge1xuICAgICAgICB2YXIgaWQsIHBhcmFtLCBwYXJhbXMgPSBbXSwgYm9keSwgdG9rZW4sIHN0cmljdGVkLCBmaXJzdFJlc3RyaWN0ZWQsIG1lc3NhZ2UsIHByZXZpb3VzU3RyaWN0LCBwYXJhbVNldDtcblxuICAgICAgICBleHBlY3RLZXl3b3JkKCdmdW5jdGlvbicpO1xuICAgICAgICB0b2tlbiA9IGxvb2thaGVhZCgpO1xuICAgICAgICBpZCA9IHBhcnNlVmFyaWFibGVJZGVudGlmaWVyKCk7XG4gICAgICAgIGlmIChzdHJpY3QpIHtcbiAgICAgICAgICAgIGlmIChpc1Jlc3RyaWN0ZWRXb3JkKHRva2VuLnZhbHVlKSkge1xuICAgICAgICAgICAgICAgIHRocm93RXJyb3JUb2xlcmFudCh0b2tlbiwgTWVzc2FnZXMuU3RyaWN0RnVuY3Rpb25OYW1lKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGlmIChpc1Jlc3RyaWN0ZWRXb3JkKHRva2VuLnZhbHVlKSkge1xuICAgICAgICAgICAgICAgIGZpcnN0UmVzdHJpY3RlZCA9IHRva2VuO1xuICAgICAgICAgICAgICAgIG1lc3NhZ2UgPSBNZXNzYWdlcy5TdHJpY3RGdW5jdGlvbk5hbWU7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGlzU3RyaWN0TW9kZVJlc2VydmVkV29yZCh0b2tlbi52YWx1ZSkpIHtcbiAgICAgICAgICAgICAgICBmaXJzdFJlc3RyaWN0ZWQgPSB0b2tlbjtcbiAgICAgICAgICAgICAgICBtZXNzYWdlID0gTWVzc2FnZXMuU3RyaWN0UmVzZXJ2ZWRXb3JkO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgZXhwZWN0KCcoJyk7XG5cbiAgICAgICAgaWYgKCFtYXRjaCgnKScpKSB7XG4gICAgICAgICAgICBwYXJhbVNldCA9IHt9O1xuICAgICAgICAgICAgd2hpbGUgKGluZGV4IDwgbGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgdG9rZW4gPSBsb29rYWhlYWQoKTtcbiAgICAgICAgICAgICAgICBwYXJhbSA9IHBhcnNlVmFyaWFibGVJZGVudGlmaWVyKCk7XG4gICAgICAgICAgICAgICAgaWYgKHN0cmljdCkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoaXNSZXN0cmljdGVkV29yZCh0b2tlbi52YWx1ZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0cmljdGVkID0gdG9rZW47XG4gICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlID0gTWVzc2FnZXMuU3RyaWN0UGFyYW1OYW1lO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwocGFyYW1TZXQsIHRva2VuLnZhbHVlKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgc3RyaWN0ZWQgPSB0b2tlbjtcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UgPSBNZXNzYWdlcy5TdHJpY3RQYXJhbUR1cGU7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKCFmaXJzdFJlc3RyaWN0ZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGlzUmVzdHJpY3RlZFdvcmQodG9rZW4udmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBmaXJzdFJlc3RyaWN0ZWQgPSB0b2tlbjtcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UgPSBNZXNzYWdlcy5TdHJpY3RQYXJhbU5hbWU7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoaXNTdHJpY3RNb2RlUmVzZXJ2ZWRXb3JkKHRva2VuLnZhbHVlKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZmlyc3RSZXN0cmljdGVkID0gdG9rZW47XG4gICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlID0gTWVzc2FnZXMuU3RyaWN0UmVzZXJ2ZWRXb3JkO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChwYXJhbVNldCwgdG9rZW4udmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBmaXJzdFJlc3RyaWN0ZWQgPSB0b2tlbjtcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UgPSBNZXNzYWdlcy5TdHJpY3RQYXJhbUR1cGU7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcGFyYW1zLnB1c2gocGFyYW0pO1xuICAgICAgICAgICAgICAgIHBhcmFtU2V0W3BhcmFtLm5hbWVdID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICBpZiAobWF0Y2goJyknKSkge1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZXhwZWN0KCcsJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBleHBlY3QoJyknKTtcblxuICAgICAgICBwcmV2aW91c1N0cmljdCA9IHN0cmljdDtcbiAgICAgICAgYm9keSA9IHBhcnNlRnVuY3Rpb25Tb3VyY2VFbGVtZW50cygpO1xuICAgICAgICBpZiAoc3RyaWN0ICYmIGZpcnN0UmVzdHJpY3RlZCkge1xuICAgICAgICAgICAgdGhyb3dFcnJvcihmaXJzdFJlc3RyaWN0ZWQsIG1lc3NhZ2UpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChzdHJpY3QgJiYgc3RyaWN0ZWQpIHtcbiAgICAgICAgICAgIHRocm93RXJyb3JUb2xlcmFudChzdHJpY3RlZCwgbWVzc2FnZSk7XG4gICAgICAgIH1cbiAgICAgICAgc3RyaWN0ID0gcHJldmlvdXNTdHJpY3Q7XG5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHR5cGU6IFN5bnRheC5GdW5jdGlvbkRlY2xhcmF0aW9uLFxuICAgICAgICAgICAgaWQ6IGlkLFxuICAgICAgICAgICAgcGFyYW1zOiBwYXJhbXMsXG4gICAgICAgICAgICBkZWZhdWx0czogW10sXG4gICAgICAgICAgICBib2R5OiBib2R5LFxuICAgICAgICAgICAgcmVzdDogbnVsbCxcbiAgICAgICAgICAgIGdlbmVyYXRvcjogZmFsc2UsXG4gICAgICAgICAgICBleHByZXNzaW9uOiBmYWxzZVxuICAgICAgICB9O1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHBhcnNlRnVuY3Rpb25FeHByZXNzaW9uKCkge1xuICAgICAgICB2YXIgdG9rZW4sIGlkID0gbnVsbCwgc3RyaWN0ZWQsIGZpcnN0UmVzdHJpY3RlZCwgbWVzc2FnZSwgcGFyYW0sIHBhcmFtcyA9IFtdLCBib2R5LCBwcmV2aW91c1N0cmljdCwgcGFyYW1TZXQ7XG5cbiAgICAgICAgZXhwZWN0S2V5d29yZCgnZnVuY3Rpb24nKTtcblxuICAgICAgICBpZiAoIW1hdGNoKCcoJykpIHtcbiAgICAgICAgICAgIHRva2VuID0gbG9va2FoZWFkKCk7XG4gICAgICAgICAgICBpZCA9IHBhcnNlVmFyaWFibGVJZGVudGlmaWVyKCk7XG4gICAgICAgICAgICBpZiAoc3RyaWN0KSB7XG4gICAgICAgICAgICAgICAgaWYgKGlzUmVzdHJpY3RlZFdvcmQodG9rZW4udmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgICAgIHRocm93RXJyb3JUb2xlcmFudCh0b2tlbiwgTWVzc2FnZXMuU3RyaWN0RnVuY3Rpb25OYW1lKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGlmIChpc1Jlc3RyaWN0ZWRXb3JkKHRva2VuLnZhbHVlKSkge1xuICAgICAgICAgICAgICAgICAgICBmaXJzdFJlc3RyaWN0ZWQgPSB0b2tlbjtcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZSA9IE1lc3NhZ2VzLlN0cmljdEZ1bmN0aW9uTmFtZTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGlzU3RyaWN0TW9kZVJlc2VydmVkV29yZCh0b2tlbi52YWx1ZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgZmlyc3RSZXN0cmljdGVkID0gdG9rZW47XG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UgPSBNZXNzYWdlcy5TdHJpY3RSZXNlcnZlZFdvcmQ7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgZXhwZWN0KCcoJyk7XG5cbiAgICAgICAgaWYgKCFtYXRjaCgnKScpKSB7XG4gICAgICAgICAgICBwYXJhbVNldCA9IHt9O1xuICAgICAgICAgICAgd2hpbGUgKGluZGV4IDwgbGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgdG9rZW4gPSBsb29rYWhlYWQoKTtcbiAgICAgICAgICAgICAgICBwYXJhbSA9IHBhcnNlVmFyaWFibGVJZGVudGlmaWVyKCk7XG4gICAgICAgICAgICAgICAgaWYgKHN0cmljdCkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoaXNSZXN0cmljdGVkV29yZCh0b2tlbi52YWx1ZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0cmljdGVkID0gdG9rZW47XG4gICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlID0gTWVzc2FnZXMuU3RyaWN0UGFyYW1OYW1lO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwocGFyYW1TZXQsIHRva2VuLnZhbHVlKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgc3RyaWN0ZWQgPSB0b2tlbjtcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UgPSBNZXNzYWdlcy5TdHJpY3RQYXJhbUR1cGU7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKCFmaXJzdFJlc3RyaWN0ZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGlzUmVzdHJpY3RlZFdvcmQodG9rZW4udmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBmaXJzdFJlc3RyaWN0ZWQgPSB0b2tlbjtcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UgPSBNZXNzYWdlcy5TdHJpY3RQYXJhbU5hbWU7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoaXNTdHJpY3RNb2RlUmVzZXJ2ZWRXb3JkKHRva2VuLnZhbHVlKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZmlyc3RSZXN0cmljdGVkID0gdG9rZW47XG4gICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlID0gTWVzc2FnZXMuU3RyaWN0UmVzZXJ2ZWRXb3JkO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChwYXJhbVNldCwgdG9rZW4udmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBmaXJzdFJlc3RyaWN0ZWQgPSB0b2tlbjtcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UgPSBNZXNzYWdlcy5TdHJpY3RQYXJhbUR1cGU7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcGFyYW1zLnB1c2gocGFyYW0pO1xuICAgICAgICAgICAgICAgIHBhcmFtU2V0W3BhcmFtLm5hbWVdID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICBpZiAobWF0Y2goJyknKSkge1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZXhwZWN0KCcsJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBleHBlY3QoJyknKTtcblxuICAgICAgICBwcmV2aW91c1N0cmljdCA9IHN0cmljdDtcbiAgICAgICAgYm9keSA9IHBhcnNlRnVuY3Rpb25Tb3VyY2VFbGVtZW50cygpO1xuICAgICAgICBpZiAoc3RyaWN0ICYmIGZpcnN0UmVzdHJpY3RlZCkge1xuICAgICAgICAgICAgdGhyb3dFcnJvcihmaXJzdFJlc3RyaWN0ZWQsIG1lc3NhZ2UpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChzdHJpY3QgJiYgc3RyaWN0ZWQpIHtcbiAgICAgICAgICAgIHRocm93RXJyb3JUb2xlcmFudChzdHJpY3RlZCwgbWVzc2FnZSk7XG4gICAgICAgIH1cbiAgICAgICAgc3RyaWN0ID0gcHJldmlvdXNTdHJpY3Q7XG5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHR5cGU6IFN5bnRheC5GdW5jdGlvbkV4cHJlc3Npb24sXG4gICAgICAgICAgICBpZDogaWQsXG4gICAgICAgICAgICBwYXJhbXM6IHBhcmFtcyxcbiAgICAgICAgICAgIGRlZmF1bHRzOiBbXSxcbiAgICAgICAgICAgIGJvZHk6IGJvZHksXG4gICAgICAgICAgICByZXN0OiBudWxsLFxuICAgICAgICAgICAgZ2VuZXJhdG9yOiBmYWxzZSxcbiAgICAgICAgICAgIGV4cHJlc3Npb246IGZhbHNlXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLy8gMTQgUHJvZ3JhbVxuXG4gICAgZnVuY3Rpb24gcGFyc2VTb3VyY2VFbGVtZW50KCkge1xuICAgICAgICB2YXIgdG9rZW4gPSBsb29rYWhlYWQoKTtcblxuICAgICAgICBpZiAodG9rZW4udHlwZSA9PT0gVG9rZW4uS2V5d29yZCkge1xuICAgICAgICAgICAgc3dpdGNoICh0b2tlbi52YWx1ZSkge1xuICAgICAgICAgICAgY2FzZSAnY29uc3QnOlxuICAgICAgICAgICAgY2FzZSAnbGV0JzpcbiAgICAgICAgICAgICAgICByZXR1cm4gcGFyc2VDb25zdExldERlY2xhcmF0aW9uKHRva2VuLnZhbHVlKTtcbiAgICAgICAgICAgIGNhc2UgJ2Z1bmN0aW9uJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gcGFyc2VGdW5jdGlvbkRlY2xhcmF0aW9uKCk7XG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgIHJldHVybiBwYXJzZVN0YXRlbWVudCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHRva2VuLnR5cGUgIT09IFRva2VuLkVPRikge1xuICAgICAgICAgICAgcmV0dXJuIHBhcnNlU3RhdGVtZW50KCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBwYXJzZVNvdXJjZUVsZW1lbnRzKCkge1xuICAgICAgICB2YXIgc291cmNlRWxlbWVudCwgc291cmNlRWxlbWVudHMgPSBbXSwgdG9rZW4sIGRpcmVjdGl2ZSwgZmlyc3RSZXN0cmljdGVkO1xuXG4gICAgICAgIHdoaWxlIChpbmRleCA8IGxlbmd0aCkge1xuICAgICAgICAgICAgdG9rZW4gPSBsb29rYWhlYWQoKTtcbiAgICAgICAgICAgIGlmICh0b2tlbi50eXBlICE9PSBUb2tlbi5TdHJpbmdMaXRlcmFsKSB7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHNvdXJjZUVsZW1lbnQgPSBwYXJzZVNvdXJjZUVsZW1lbnQoKTtcbiAgICAgICAgICAgIHNvdXJjZUVsZW1lbnRzLnB1c2goc291cmNlRWxlbWVudCk7XG4gICAgICAgICAgICBpZiAoc291cmNlRWxlbWVudC5leHByZXNzaW9uLnR5cGUgIT09IFN5bnRheC5MaXRlcmFsKSB7XG4gICAgICAgICAgICAgICAgLy8gdGhpcyBpcyBub3QgZGlyZWN0aXZlXG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBkaXJlY3RpdmUgPSBzbGljZVNvdXJjZSh0b2tlbi5yYW5nZVswXSArIDEsIHRva2VuLnJhbmdlWzFdIC0gMSk7XG4gICAgICAgICAgICBpZiAoZGlyZWN0aXZlID09PSAndXNlIHN0cmljdCcpIHtcbiAgICAgICAgICAgICAgICBzdHJpY3QgPSB0cnVlO1xuICAgICAgICAgICAgICAgIGlmIChmaXJzdFJlc3RyaWN0ZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhyb3dFcnJvclRvbGVyYW50KGZpcnN0UmVzdHJpY3RlZCwgTWVzc2FnZXMuU3RyaWN0T2N0YWxMaXRlcmFsKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGlmICghZmlyc3RSZXN0cmljdGVkICYmIHRva2VuLm9jdGFsKSB7XG4gICAgICAgICAgICAgICAgICAgIGZpcnN0UmVzdHJpY3RlZCA9IHRva2VuO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHdoaWxlIChpbmRleCA8IGxlbmd0aCkge1xuICAgICAgICAgICAgc291cmNlRWxlbWVudCA9IHBhcnNlU291cmNlRWxlbWVudCgpO1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBzb3VyY2VFbGVtZW50ID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgc291cmNlRWxlbWVudHMucHVzaChzb3VyY2VFbGVtZW50KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gc291cmNlRWxlbWVudHM7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcGFyc2VQcm9ncmFtKCkge1xuICAgICAgICB2YXIgcHJvZ3JhbTtcbiAgICAgICAgc3RyaWN0ID0gZmFsc2U7XG4gICAgICAgIHByb2dyYW0gPSB7XG4gICAgICAgICAgICB0eXBlOiBTeW50YXguUHJvZ3JhbSxcbiAgICAgICAgICAgIGJvZHk6IHBhcnNlU291cmNlRWxlbWVudHMoKVxuICAgICAgICB9O1xuICAgICAgICByZXR1cm4gcHJvZ3JhbTtcbiAgICB9XG5cbiAgICAvLyBUaGUgZm9sbG93aW5nIGZ1bmN0aW9ucyBhcmUgbmVlZGVkIG9ubHkgd2hlbiB0aGUgb3B0aW9uIHRvIHByZXNlcnZlXG4gICAgLy8gdGhlIGNvbW1lbnRzIGlzIGFjdGl2ZS5cblxuICAgIGZ1bmN0aW9uIGFkZENvbW1lbnQodHlwZSwgdmFsdWUsIHN0YXJ0LCBlbmQsIGxvYykge1xuICAgICAgICBhc3NlcnQodHlwZW9mIHN0YXJ0ID09PSAnbnVtYmVyJywgJ0NvbW1lbnQgbXVzdCBoYXZlIHZhbGlkIHBvc2l0aW9uJyk7XG5cbiAgICAgICAgLy8gQmVjYXVzZSB0aGUgd2F5IHRoZSBhY3R1YWwgdG9rZW4gaXMgc2Nhbm5lZCwgb2Z0ZW4gdGhlIGNvbW1lbnRzXG4gICAgICAgIC8vIChpZiBhbnkpIGFyZSBza2lwcGVkIHR3aWNlIGR1cmluZyB0aGUgbGV4aWNhbCBhbmFseXNpcy5cbiAgICAgICAgLy8gVGh1cywgd2UgbmVlZCB0byBza2lwIGFkZGluZyBhIGNvbW1lbnQgaWYgdGhlIGNvbW1lbnQgYXJyYXkgYWxyZWFkeVxuICAgICAgICAvLyBoYW5kbGVkIGl0LlxuICAgICAgICBpZiAoZXh0cmEuY29tbWVudHMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgaWYgKGV4dHJhLmNvbW1lbnRzW2V4dHJhLmNvbW1lbnRzLmxlbmd0aCAtIDFdLnJhbmdlWzFdID4gc3RhcnQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBleHRyYS5jb21tZW50cy5wdXNoKHtcbiAgICAgICAgICAgIHR5cGU6IHR5cGUsXG4gICAgICAgICAgICB2YWx1ZTogdmFsdWUsXG4gICAgICAgICAgICByYW5nZTogW3N0YXJ0LCBlbmRdLFxuICAgICAgICAgICAgbG9jOiBsb2NcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gc2NhbkNvbW1lbnQoKSB7XG4gICAgICAgIHZhciBjb21tZW50LCBjaCwgbG9jLCBzdGFydCwgYmxvY2tDb21tZW50LCBsaW5lQ29tbWVudDtcblxuICAgICAgICBjb21tZW50ID0gJyc7XG4gICAgICAgIGJsb2NrQ29tbWVudCA9IGZhbHNlO1xuICAgICAgICBsaW5lQ29tbWVudCA9IGZhbHNlO1xuXG4gICAgICAgIHdoaWxlIChpbmRleCA8IGxlbmd0aCkge1xuICAgICAgICAgICAgY2ggPSBzb3VyY2VbaW5kZXhdO1xuXG4gICAgICAgICAgICBpZiAobGluZUNvbW1lbnQpIHtcbiAgICAgICAgICAgICAgICBjaCA9IHNvdXJjZVtpbmRleCsrXTtcbiAgICAgICAgICAgICAgICBpZiAoaXNMaW5lVGVybWluYXRvcihjaCkpIHtcbiAgICAgICAgICAgICAgICAgICAgbG9jLmVuZCA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxpbmU6IGxpbmVOdW1iZXIsXG4gICAgICAgICAgICAgICAgICAgICAgICBjb2x1bW46IGluZGV4IC0gbGluZVN0YXJ0IC0gMVxuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICBsaW5lQ29tbWVudCA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICBhZGRDb21tZW50KCdMaW5lJywgY29tbWVudCwgc3RhcnQsIGluZGV4IC0gMSwgbG9jKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGNoID09PSAnXFxyJyAmJiBzb3VyY2VbaW5kZXhdID09PSAnXFxuJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgKytpbmRleDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICArK2xpbmVOdW1iZXI7XG4gICAgICAgICAgICAgICAgICAgIGxpbmVTdGFydCA9IGluZGV4O1xuICAgICAgICAgICAgICAgICAgICBjb21tZW50ID0gJyc7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChpbmRleCA+PSBsZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgbGluZUNvbW1lbnQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgY29tbWVudCArPSBjaDtcbiAgICAgICAgICAgICAgICAgICAgbG9jLmVuZCA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxpbmU6IGxpbmVOdW1iZXIsXG4gICAgICAgICAgICAgICAgICAgICAgICBjb2x1bW46IGxlbmd0aCAtIGxpbmVTdGFydFxuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICBhZGRDb21tZW50KCdMaW5lJywgY29tbWVudCwgc3RhcnQsIGxlbmd0aCwgbG9jKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBjb21tZW50ICs9IGNoO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSBpZiAoYmxvY2tDb21tZW50KSB7XG4gICAgICAgICAgICAgICAgaWYgKGlzTGluZVRlcm1pbmF0b3IoY2gpKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChjaCA9PT0gJ1xccicgJiYgc291cmNlW2luZGV4ICsgMV0gPT09ICdcXG4nKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICArK2luZGV4O1xuICAgICAgICAgICAgICAgICAgICAgICAgY29tbWVudCArPSAnXFxyXFxuJztcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbW1lbnQgKz0gY2g7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgKytsaW5lTnVtYmVyO1xuICAgICAgICAgICAgICAgICAgICArK2luZGV4O1xuICAgICAgICAgICAgICAgICAgICBsaW5lU3RhcnQgPSBpbmRleDtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGluZGV4ID49IGxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3dFcnJvcih7fSwgTWVzc2FnZXMuVW5leHBlY3RlZFRva2VuLCAnSUxMRUdBTCcpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgY2ggPSBzb3VyY2VbaW5kZXgrK107XG4gICAgICAgICAgICAgICAgICAgIGlmIChpbmRleCA+PSBsZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRocm93RXJyb3Ioe30sIE1lc3NhZ2VzLlVuZXhwZWN0ZWRUb2tlbiwgJ0lMTEVHQUwnKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBjb21tZW50ICs9IGNoO1xuICAgICAgICAgICAgICAgICAgICBpZiAoY2ggPT09ICcqJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgY2ggPSBzb3VyY2VbaW5kZXhdO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGNoID09PSAnLycpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb21tZW50ID0gY29tbWVudC5zdWJzdHIoMCwgY29tbWVudC5sZW5ndGggLSAxKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBibG9ja0NvbW1lbnQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICArK2luZGV4O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxvYy5lbmQgPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxpbmU6IGxpbmVOdW1iZXIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbHVtbjogaW5kZXggLSBsaW5lU3RhcnRcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFkZENvbW1lbnQoJ0Jsb2NrJywgY29tbWVudCwgc3RhcnQsIGluZGV4LCBsb2MpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbW1lbnQgPSAnJztcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSBpZiAoY2ggPT09ICcvJykge1xuICAgICAgICAgICAgICAgIGNoID0gc291cmNlW2luZGV4ICsgMV07XG4gICAgICAgICAgICAgICAgaWYgKGNoID09PSAnLycpIHtcbiAgICAgICAgICAgICAgICAgICAgbG9jID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgc3RhcnQ6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsaW5lOiBsaW5lTnVtYmVyLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbHVtbjogaW5kZXggLSBsaW5lU3RhcnRcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgc3RhcnQgPSBpbmRleDtcbiAgICAgICAgICAgICAgICAgICAgaW5kZXggKz0gMjtcbiAgICAgICAgICAgICAgICAgICAgbGluZUNvbW1lbnQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICBpZiAoaW5kZXggPj0gbGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBsb2MuZW5kID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxpbmU6IGxpbmVOdW1iZXIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29sdW1uOiBpbmRleCAtIGxpbmVTdGFydFxuICAgICAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxpbmVDb21tZW50ID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgICAgICBhZGRDb21tZW50KCdMaW5lJywgY29tbWVudCwgc3RhcnQsIGluZGV4LCBsb2MpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChjaCA9PT0gJyonKSB7XG4gICAgICAgICAgICAgICAgICAgIHN0YXJ0ID0gaW5kZXg7XG4gICAgICAgICAgICAgICAgICAgIGluZGV4ICs9IDI7XG4gICAgICAgICAgICAgICAgICAgIGJsb2NrQ29tbWVudCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIGxvYyA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0YXJ0OiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGluZTogbGluZU51bWJlcixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb2x1bW46IGluZGV4IC0gbGluZVN0YXJ0IC0gMlxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICBpZiAoaW5kZXggPj0gbGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aHJvd0Vycm9yKHt9LCBNZXNzYWdlcy5VbmV4cGVjdGVkVG9rZW4sICdJTExFR0FMJyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGlzV2hpdGVTcGFjZShjaCkpIHtcbiAgICAgICAgICAgICAgICArK2luZGV4O1xuICAgICAgICAgICAgfSBlbHNlIGlmIChpc0xpbmVUZXJtaW5hdG9yKGNoKSkge1xuICAgICAgICAgICAgICAgICsraW5kZXg7XG4gICAgICAgICAgICAgICAgaWYgKGNoID09PSAgJ1xccicgJiYgc291cmNlW2luZGV4XSA9PT0gJ1xcbicpIHtcbiAgICAgICAgICAgICAgICAgICAgKytpbmRleDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgKytsaW5lTnVtYmVyO1xuICAgICAgICAgICAgICAgIGxpbmVTdGFydCA9IGluZGV4O1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGZpbHRlckNvbW1lbnRMb2NhdGlvbigpIHtcbiAgICAgICAgdmFyIGksIGVudHJ5LCBjb21tZW50LCBjb21tZW50cyA9IFtdO1xuXG4gICAgICAgIGZvciAoaSA9IDA7IGkgPCBleHRyYS5jb21tZW50cy5sZW5ndGg7ICsraSkge1xuICAgICAgICAgICAgZW50cnkgPSBleHRyYS5jb21tZW50c1tpXTtcbiAgICAgICAgICAgIGNvbW1lbnQgPSB7XG4gICAgICAgICAgICAgICAgdHlwZTogZW50cnkudHlwZSxcbiAgICAgICAgICAgICAgICB2YWx1ZTogZW50cnkudmFsdWVcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBpZiAoZXh0cmEucmFuZ2UpIHtcbiAgICAgICAgICAgICAgICBjb21tZW50LnJhbmdlID0gZW50cnkucmFuZ2U7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoZXh0cmEubG9jKSB7XG4gICAgICAgICAgICAgICAgY29tbWVudC5sb2MgPSBlbnRyeS5sb2M7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb21tZW50cy5wdXNoKGNvbW1lbnQpO1xuICAgICAgICB9XG5cbiAgICAgICAgZXh0cmEuY29tbWVudHMgPSBjb21tZW50cztcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBjb2xsZWN0VG9rZW4oKSB7XG4gICAgICAgIHZhciBzdGFydCwgbG9jLCB0b2tlbiwgcmFuZ2UsIHZhbHVlO1xuXG4gICAgICAgIHNraXBDb21tZW50KCk7XG4gICAgICAgIHN0YXJ0ID0gaW5kZXg7XG4gICAgICAgIGxvYyA9IHtcbiAgICAgICAgICAgIHN0YXJ0OiB7XG4gICAgICAgICAgICAgICAgbGluZTogbGluZU51bWJlcixcbiAgICAgICAgICAgICAgICBjb2x1bW46IGluZGV4IC0gbGluZVN0YXJ0XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgdG9rZW4gPSBleHRyYS5hZHZhbmNlKCk7XG4gICAgICAgIGxvYy5lbmQgPSB7XG4gICAgICAgICAgICBsaW5lOiBsaW5lTnVtYmVyLFxuICAgICAgICAgICAgY29sdW1uOiBpbmRleCAtIGxpbmVTdGFydFxuICAgICAgICB9O1xuXG4gICAgICAgIGlmICh0b2tlbi50eXBlICE9PSBUb2tlbi5FT0YpIHtcbiAgICAgICAgICAgIHJhbmdlID0gW3Rva2VuLnJhbmdlWzBdLCB0b2tlbi5yYW5nZVsxXV07XG4gICAgICAgICAgICB2YWx1ZSA9IHNsaWNlU291cmNlKHRva2VuLnJhbmdlWzBdLCB0b2tlbi5yYW5nZVsxXSk7XG4gICAgICAgICAgICBleHRyYS50b2tlbnMucHVzaCh7XG4gICAgICAgICAgICAgICAgdHlwZTogVG9rZW5OYW1lW3Rva2VuLnR5cGVdLFxuICAgICAgICAgICAgICAgIHZhbHVlOiB2YWx1ZSxcbiAgICAgICAgICAgICAgICByYW5nZTogcmFuZ2UsXG4gICAgICAgICAgICAgICAgbG9jOiBsb2NcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHRva2VuO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGNvbGxlY3RSZWdleCgpIHtcbiAgICAgICAgdmFyIHBvcywgbG9jLCByZWdleCwgdG9rZW47XG5cbiAgICAgICAgc2tpcENvbW1lbnQoKTtcblxuICAgICAgICBwb3MgPSBpbmRleDtcbiAgICAgICAgbG9jID0ge1xuICAgICAgICAgICAgc3RhcnQ6IHtcbiAgICAgICAgICAgICAgICBsaW5lOiBsaW5lTnVtYmVyLFxuICAgICAgICAgICAgICAgIGNvbHVtbjogaW5kZXggLSBsaW5lU3RhcnRcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICByZWdleCA9IGV4dHJhLnNjYW5SZWdFeHAoKTtcbiAgICAgICAgbG9jLmVuZCA9IHtcbiAgICAgICAgICAgIGxpbmU6IGxpbmVOdW1iZXIsXG4gICAgICAgICAgICBjb2x1bW46IGluZGV4IC0gbGluZVN0YXJ0XG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gUG9wIHRoZSBwcmV2aW91cyB0b2tlbiwgd2hpY2ggaXMgbGlrZWx5ICcvJyBvciAnLz0nXG4gICAgICAgIGlmIChleHRyYS50b2tlbnMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgdG9rZW4gPSBleHRyYS50b2tlbnNbZXh0cmEudG9rZW5zLmxlbmd0aCAtIDFdO1xuICAgICAgICAgICAgaWYgKHRva2VuLnJhbmdlWzBdID09PSBwb3MgJiYgdG9rZW4udHlwZSA9PT0gJ1B1bmN0dWF0b3InKSB7XG4gICAgICAgICAgICAgICAgaWYgKHRva2VuLnZhbHVlID09PSAnLycgfHwgdG9rZW4udmFsdWUgPT09ICcvPScpIHtcbiAgICAgICAgICAgICAgICAgICAgZXh0cmEudG9rZW5zLnBvcCgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGV4dHJhLnRva2Vucy5wdXNoKHtcbiAgICAgICAgICAgIHR5cGU6ICdSZWd1bGFyRXhwcmVzc2lvbicsXG4gICAgICAgICAgICB2YWx1ZTogcmVnZXgubGl0ZXJhbCxcbiAgICAgICAgICAgIHJhbmdlOiBbcG9zLCBpbmRleF0sXG4gICAgICAgICAgICBsb2M6IGxvY1xuICAgICAgICB9KTtcblxuICAgICAgICByZXR1cm4gcmVnZXg7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZmlsdGVyVG9rZW5Mb2NhdGlvbigpIHtcbiAgICAgICAgdmFyIGksIGVudHJ5LCB0b2tlbiwgdG9rZW5zID0gW107XG5cbiAgICAgICAgZm9yIChpID0gMDsgaSA8IGV4dHJhLnRva2Vucy5sZW5ndGg7ICsraSkge1xuICAgICAgICAgICAgZW50cnkgPSBleHRyYS50b2tlbnNbaV07XG4gICAgICAgICAgICB0b2tlbiA9IHtcbiAgICAgICAgICAgICAgICB0eXBlOiBlbnRyeS50eXBlLFxuICAgICAgICAgICAgICAgIHZhbHVlOiBlbnRyeS52YWx1ZVxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIGlmIChleHRyYS5yYW5nZSkge1xuICAgICAgICAgICAgICAgIHRva2VuLnJhbmdlID0gZW50cnkucmFuZ2U7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoZXh0cmEubG9jKSB7XG4gICAgICAgICAgICAgICAgdG9rZW4ubG9jID0gZW50cnkubG9jO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdG9rZW5zLnB1c2godG9rZW4pO1xuICAgICAgICB9XG5cbiAgICAgICAgZXh0cmEudG9rZW5zID0gdG9rZW5zO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGNyZWF0ZUxpdGVyYWwodG9rZW4pIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHR5cGU6IFN5bnRheC5MaXRlcmFsLFxuICAgICAgICAgICAgdmFsdWU6IHRva2VuLnZhbHVlXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gY3JlYXRlUmF3TGl0ZXJhbCh0b2tlbikge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgdHlwZTogU3ludGF4LkxpdGVyYWwsXG4gICAgICAgICAgICB2YWx1ZTogdG9rZW4udmFsdWUsXG4gICAgICAgICAgICByYXc6IHNsaWNlU291cmNlKHRva2VuLnJhbmdlWzBdLCB0b2tlbi5yYW5nZVsxXSlcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBjcmVhdGVMb2NhdGlvbk1hcmtlcigpIHtcbiAgICAgICAgdmFyIG1hcmtlciA9IHt9O1xuXG4gICAgICAgIG1hcmtlci5yYW5nZSA9IFtpbmRleCwgaW5kZXhdO1xuICAgICAgICBtYXJrZXIubG9jID0ge1xuICAgICAgICAgICAgc3RhcnQ6IHtcbiAgICAgICAgICAgICAgICBsaW5lOiBsaW5lTnVtYmVyLFxuICAgICAgICAgICAgICAgIGNvbHVtbjogaW5kZXggLSBsaW5lU3RhcnRcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBlbmQ6IHtcbiAgICAgICAgICAgICAgICBsaW5lOiBsaW5lTnVtYmVyLFxuICAgICAgICAgICAgICAgIGNvbHVtbjogaW5kZXggLSBsaW5lU3RhcnRcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICBtYXJrZXIuZW5kID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdGhpcy5yYW5nZVsxXSA9IGluZGV4O1xuICAgICAgICAgICAgdGhpcy5sb2MuZW5kLmxpbmUgPSBsaW5lTnVtYmVyO1xuICAgICAgICAgICAgdGhpcy5sb2MuZW5kLmNvbHVtbiA9IGluZGV4IC0gbGluZVN0YXJ0O1xuICAgICAgICB9O1xuXG4gICAgICAgIG1hcmtlci5hcHBseUdyb3VwID0gZnVuY3Rpb24gKG5vZGUpIHtcbiAgICAgICAgICAgIGlmIChleHRyYS5yYW5nZSkge1xuICAgICAgICAgICAgICAgIG5vZGUuZ3JvdXBSYW5nZSA9IFt0aGlzLnJhbmdlWzBdLCB0aGlzLnJhbmdlWzFdXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChleHRyYS5sb2MpIHtcbiAgICAgICAgICAgICAgICBub2RlLmdyb3VwTG9jID0ge1xuICAgICAgICAgICAgICAgICAgICBzdGFydDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgbGluZTogdGhpcy5sb2Muc3RhcnQubGluZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbHVtbjogdGhpcy5sb2Muc3RhcnQuY29sdW1uXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIGVuZDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgbGluZTogdGhpcy5sb2MuZW5kLmxpbmUsXG4gICAgICAgICAgICAgICAgICAgICAgICBjb2x1bW46IHRoaXMubG9jLmVuZC5jb2x1bW5cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgbWFya2VyLmFwcGx5ID0gZnVuY3Rpb24gKG5vZGUpIHtcbiAgICAgICAgICAgIGlmIChleHRyYS5yYW5nZSkge1xuICAgICAgICAgICAgICAgIG5vZGUucmFuZ2UgPSBbdGhpcy5yYW5nZVswXSwgdGhpcy5yYW5nZVsxXV07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoZXh0cmEubG9jKSB7XG4gICAgICAgICAgICAgICAgbm9kZS5sb2MgPSB7XG4gICAgICAgICAgICAgICAgICAgIHN0YXJ0OiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBsaW5lOiB0aGlzLmxvYy5zdGFydC5saW5lLFxuICAgICAgICAgICAgICAgICAgICAgICAgY29sdW1uOiB0aGlzLmxvYy5zdGFydC5jb2x1bW5cbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgZW5kOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBsaW5lOiB0aGlzLmxvYy5lbmQubGluZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbHVtbjogdGhpcy5sb2MuZW5kLmNvbHVtblxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICByZXR1cm4gbWFya2VyO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHRyYWNrR3JvdXBFeHByZXNzaW9uKCkge1xuICAgICAgICB2YXIgbWFya2VyLCBleHByO1xuXG4gICAgICAgIHNraXBDb21tZW50KCk7XG4gICAgICAgIG1hcmtlciA9IGNyZWF0ZUxvY2F0aW9uTWFya2VyKCk7XG4gICAgICAgIGV4cGVjdCgnKCcpO1xuXG4gICAgICAgIGV4cHIgPSBwYXJzZUV4cHJlc3Npb24oKTtcblxuICAgICAgICBleHBlY3QoJyknKTtcblxuICAgICAgICBtYXJrZXIuZW5kKCk7XG4gICAgICAgIG1hcmtlci5hcHBseUdyb3VwKGV4cHIpO1xuXG4gICAgICAgIHJldHVybiBleHByO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHRyYWNrTGVmdEhhbmRTaWRlRXhwcmVzc2lvbigpIHtcbiAgICAgICAgdmFyIG1hcmtlciwgZXhwcjtcblxuICAgICAgICBza2lwQ29tbWVudCgpO1xuICAgICAgICBtYXJrZXIgPSBjcmVhdGVMb2NhdGlvbk1hcmtlcigpO1xuXG4gICAgICAgIGV4cHIgPSBtYXRjaEtleXdvcmQoJ25ldycpID8gcGFyc2VOZXdFeHByZXNzaW9uKCkgOiBwYXJzZVByaW1hcnlFeHByZXNzaW9uKCk7XG5cbiAgICAgICAgd2hpbGUgKG1hdGNoKCcuJykgfHwgbWF0Y2goJ1snKSkge1xuICAgICAgICAgICAgaWYgKG1hdGNoKCdbJykpIHtcbiAgICAgICAgICAgICAgICBleHByID0ge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiBTeW50YXguTWVtYmVyRXhwcmVzc2lvbixcbiAgICAgICAgICAgICAgICAgICAgY29tcHV0ZWQ6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIG9iamVjdDogZXhwcixcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydHk6IHBhcnNlQ29tcHV0ZWRNZW1iZXIoKVxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgbWFya2VyLmVuZCgpO1xuICAgICAgICAgICAgICAgIG1hcmtlci5hcHBseShleHByKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgZXhwciA9IHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogU3ludGF4Lk1lbWJlckV4cHJlc3Npb24sXG4gICAgICAgICAgICAgICAgICAgIGNvbXB1dGVkOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgb2JqZWN0OiBleHByLFxuICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0eTogcGFyc2VOb25Db21wdXRlZE1lbWJlcigpXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICBtYXJrZXIuZW5kKCk7XG4gICAgICAgICAgICAgICAgbWFya2VyLmFwcGx5KGV4cHIpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGV4cHI7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gdHJhY2tMZWZ0SGFuZFNpZGVFeHByZXNzaW9uQWxsb3dDYWxsKCkge1xuICAgICAgICB2YXIgbWFya2VyLCBleHByO1xuXG4gICAgICAgIHNraXBDb21tZW50KCk7XG4gICAgICAgIG1hcmtlciA9IGNyZWF0ZUxvY2F0aW9uTWFya2VyKCk7XG5cbiAgICAgICAgZXhwciA9IG1hdGNoS2V5d29yZCgnbmV3JykgPyBwYXJzZU5ld0V4cHJlc3Npb24oKSA6IHBhcnNlUHJpbWFyeUV4cHJlc3Npb24oKTtcblxuICAgICAgICB3aGlsZSAobWF0Y2goJy4nKSB8fCBtYXRjaCgnWycpIHx8IG1hdGNoKCcoJykpIHtcbiAgICAgICAgICAgIGlmIChtYXRjaCgnKCcpKSB7XG4gICAgICAgICAgICAgICAgZXhwciA9IHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogU3ludGF4LkNhbGxFeHByZXNzaW9uLFxuICAgICAgICAgICAgICAgICAgICBjYWxsZWU6IGV4cHIsXG4gICAgICAgICAgICAgICAgICAgICdhcmd1bWVudHMnOiBwYXJzZUFyZ3VtZW50cygpXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICBtYXJrZXIuZW5kKCk7XG4gICAgICAgICAgICAgICAgbWFya2VyLmFwcGx5KGV4cHIpO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChtYXRjaCgnWycpKSB7XG4gICAgICAgICAgICAgICAgZXhwciA9IHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogU3ludGF4Lk1lbWJlckV4cHJlc3Npb24sXG4gICAgICAgICAgICAgICAgICAgIGNvbXB1dGVkOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICBvYmplY3Q6IGV4cHIsXG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnR5OiBwYXJzZUNvbXB1dGVkTWVtYmVyKClcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIG1hcmtlci5lbmQoKTtcbiAgICAgICAgICAgICAgICBtYXJrZXIuYXBwbHkoZXhwcik7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGV4cHIgPSB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IFN5bnRheC5NZW1iZXJFeHByZXNzaW9uLFxuICAgICAgICAgICAgICAgICAgICBjb21wdXRlZDogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgIG9iamVjdDogZXhwcixcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydHk6IHBhcnNlTm9uQ29tcHV0ZWRNZW1iZXIoKVxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgbWFya2VyLmVuZCgpO1xuICAgICAgICAgICAgICAgIG1hcmtlci5hcHBseShleHByKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBleHByO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGZpbHRlckdyb3VwKG5vZGUpIHtcbiAgICAgICAgdmFyIG4sIGksIGVudHJ5O1xuXG4gICAgICAgIG4gPSAoT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5hcHBseShub2RlKSA9PT0gJ1tvYmplY3QgQXJyYXldJykgPyBbXSA6IHt9O1xuICAgICAgICBmb3IgKGkgaW4gbm9kZSkge1xuICAgICAgICAgICAgaWYgKG5vZGUuaGFzT3duUHJvcGVydHkoaSkgJiYgaSAhPT0gJ2dyb3VwUmFuZ2UnICYmIGkgIT09ICdncm91cExvYycpIHtcbiAgICAgICAgICAgICAgICBlbnRyeSA9IG5vZGVbaV07XG4gICAgICAgICAgICAgICAgaWYgKGVudHJ5ID09PSBudWxsIHx8IHR5cGVvZiBlbnRyeSAhPT0gJ29iamVjdCcgfHwgZW50cnkgaW5zdGFuY2VvZiBSZWdFeHApIHtcbiAgICAgICAgICAgICAgICAgICAgbltpXSA9IGVudHJ5O1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIG5baV0gPSBmaWx0ZXJHcm91cChlbnRyeSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBuO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHdyYXBUcmFja2luZ0Z1bmN0aW9uKHJhbmdlLCBsb2MpIHtcblxuICAgICAgICByZXR1cm4gZnVuY3Rpb24gKHBhcnNlRnVuY3Rpb24pIHtcblxuICAgICAgICAgICAgZnVuY3Rpb24gaXNCaW5hcnkobm9kZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBub2RlLnR5cGUgPT09IFN5bnRheC5Mb2dpY2FsRXhwcmVzc2lvbiB8fFxuICAgICAgICAgICAgICAgICAgICBub2RlLnR5cGUgPT09IFN5bnRheC5CaW5hcnlFeHByZXNzaW9uO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBmdW5jdGlvbiB2aXNpdChub2RlKSB7XG4gICAgICAgICAgICAgICAgdmFyIHN0YXJ0LCBlbmQ7XG5cbiAgICAgICAgICAgICAgICBpZiAoaXNCaW5hcnkobm9kZS5sZWZ0KSkge1xuICAgICAgICAgICAgICAgICAgICB2aXNpdChub2RlLmxlZnQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoaXNCaW5hcnkobm9kZS5yaWdodCkpIHtcbiAgICAgICAgICAgICAgICAgICAgdmlzaXQobm9kZS5yaWdodCk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaWYgKHJhbmdlKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChub2RlLmxlZnQuZ3JvdXBSYW5nZSB8fCBub2RlLnJpZ2h0Lmdyb3VwUmFuZ2UpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0YXJ0ID0gbm9kZS5sZWZ0Lmdyb3VwUmFuZ2UgPyBub2RlLmxlZnQuZ3JvdXBSYW5nZVswXSA6IG5vZGUubGVmdC5yYW5nZVswXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGVuZCA9IG5vZGUucmlnaHQuZ3JvdXBSYW5nZSA/IG5vZGUucmlnaHQuZ3JvdXBSYW5nZVsxXSA6IG5vZGUucmlnaHQucmFuZ2VbMV07XG4gICAgICAgICAgICAgICAgICAgICAgICBub2RlLnJhbmdlID0gW3N0YXJ0LCBlbmRdO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHR5cGVvZiBub2RlLnJhbmdlID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgc3RhcnQgPSBub2RlLmxlZnQucmFuZ2VbMF07XG4gICAgICAgICAgICAgICAgICAgICAgICBlbmQgPSBub2RlLnJpZ2h0LnJhbmdlWzFdO1xuICAgICAgICAgICAgICAgICAgICAgICAgbm9kZS5yYW5nZSA9IFtzdGFydCwgZW5kXTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAobG9jKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChub2RlLmxlZnQuZ3JvdXBMb2MgfHwgbm9kZS5yaWdodC5ncm91cExvYykge1xuICAgICAgICAgICAgICAgICAgICAgICAgc3RhcnQgPSBub2RlLmxlZnQuZ3JvdXBMb2MgPyBub2RlLmxlZnQuZ3JvdXBMb2Muc3RhcnQgOiBub2RlLmxlZnQubG9jLnN0YXJ0O1xuICAgICAgICAgICAgICAgICAgICAgICAgZW5kID0gbm9kZS5yaWdodC5ncm91cExvYyA/IG5vZGUucmlnaHQuZ3JvdXBMb2MuZW5kIDogbm9kZS5yaWdodC5sb2MuZW5kO1xuICAgICAgICAgICAgICAgICAgICAgICAgbm9kZS5sb2MgPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RhcnQ6IHN0YXJ0LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVuZDogZW5kXG4gICAgICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHR5cGVvZiBub2RlLmxvYyA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG5vZGUubG9jID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0YXJ0OiBub2RlLmxlZnQubG9jLnN0YXJ0LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVuZDogbm9kZS5yaWdodC5sb2MuZW5kXG4gICAgICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHZhciBtYXJrZXIsIG5vZGU7XG5cbiAgICAgICAgICAgICAgICBza2lwQ29tbWVudCgpO1xuXG4gICAgICAgICAgICAgICAgbWFya2VyID0gY3JlYXRlTG9jYXRpb25NYXJrZXIoKTtcbiAgICAgICAgICAgICAgICBub2RlID0gcGFyc2VGdW5jdGlvbi5hcHBseShudWxsLCBhcmd1bWVudHMpO1xuICAgICAgICAgICAgICAgIG1hcmtlci5lbmQoKTtcblxuICAgICAgICAgICAgICAgIGlmIChyYW5nZSAmJiB0eXBlb2Ygbm9kZS5yYW5nZSA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgICAgICAgbWFya2VyLmFwcGx5KG5vZGUpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGlmIChsb2MgJiYgdHlwZW9mIG5vZGUubG9jID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgICAgICAgICBtYXJrZXIuYXBwbHkobm9kZSk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaWYgKGlzQmluYXJ5KG5vZGUpKSB7XG4gICAgICAgICAgICAgICAgICAgIHZpc2l0KG5vZGUpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHJldHVybiBub2RlO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBwYXRjaCgpIHtcblxuICAgICAgICB2YXIgd3JhcFRyYWNraW5nO1xuXG4gICAgICAgIGlmIChleHRyYS5jb21tZW50cykge1xuICAgICAgICAgICAgZXh0cmEuc2tpcENvbW1lbnQgPSBza2lwQ29tbWVudDtcbiAgICAgICAgICAgIHNraXBDb21tZW50ID0gc2NhbkNvbW1lbnQ7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoZXh0cmEucmF3KSB7XG4gICAgICAgICAgICBleHRyYS5jcmVhdGVMaXRlcmFsID0gY3JlYXRlTGl0ZXJhbDtcbiAgICAgICAgICAgIGNyZWF0ZUxpdGVyYWwgPSBjcmVhdGVSYXdMaXRlcmFsO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGV4dHJhLnJhbmdlIHx8IGV4dHJhLmxvYykge1xuXG4gICAgICAgICAgICBleHRyYS5wYXJzZUdyb3VwRXhwcmVzc2lvbiA9IHBhcnNlR3JvdXBFeHByZXNzaW9uO1xuICAgICAgICAgICAgZXh0cmEucGFyc2VMZWZ0SGFuZFNpZGVFeHByZXNzaW9uID0gcGFyc2VMZWZ0SGFuZFNpZGVFeHByZXNzaW9uO1xuICAgICAgICAgICAgZXh0cmEucGFyc2VMZWZ0SGFuZFNpZGVFeHByZXNzaW9uQWxsb3dDYWxsID0gcGFyc2VMZWZ0SGFuZFNpZGVFeHByZXNzaW9uQWxsb3dDYWxsO1xuICAgICAgICAgICAgcGFyc2VHcm91cEV4cHJlc3Npb24gPSB0cmFja0dyb3VwRXhwcmVzc2lvbjtcbiAgICAgICAgICAgIHBhcnNlTGVmdEhhbmRTaWRlRXhwcmVzc2lvbiA9IHRyYWNrTGVmdEhhbmRTaWRlRXhwcmVzc2lvbjtcbiAgICAgICAgICAgIHBhcnNlTGVmdEhhbmRTaWRlRXhwcmVzc2lvbkFsbG93Q2FsbCA9IHRyYWNrTGVmdEhhbmRTaWRlRXhwcmVzc2lvbkFsbG93Q2FsbDtcblxuICAgICAgICAgICAgd3JhcFRyYWNraW5nID0gd3JhcFRyYWNraW5nRnVuY3Rpb24oZXh0cmEucmFuZ2UsIGV4dHJhLmxvYyk7XG5cbiAgICAgICAgICAgIGV4dHJhLnBhcnNlQWRkaXRpdmVFeHByZXNzaW9uID0gcGFyc2VBZGRpdGl2ZUV4cHJlc3Npb247XG4gICAgICAgICAgICBleHRyYS5wYXJzZUFzc2lnbm1lbnRFeHByZXNzaW9uID0gcGFyc2VBc3NpZ25tZW50RXhwcmVzc2lvbjtcbiAgICAgICAgICAgIGV4dHJhLnBhcnNlQml0d2lzZUFOREV4cHJlc3Npb24gPSBwYXJzZUJpdHdpc2VBTkRFeHByZXNzaW9uO1xuICAgICAgICAgICAgZXh0cmEucGFyc2VCaXR3aXNlT1JFeHByZXNzaW9uID0gcGFyc2VCaXR3aXNlT1JFeHByZXNzaW9uO1xuICAgICAgICAgICAgZXh0cmEucGFyc2VCaXR3aXNlWE9SRXhwcmVzc2lvbiA9IHBhcnNlQml0d2lzZVhPUkV4cHJlc3Npb247XG4gICAgICAgICAgICBleHRyYS5wYXJzZUJsb2NrID0gcGFyc2VCbG9jaztcbiAgICAgICAgICAgIGV4dHJhLnBhcnNlRnVuY3Rpb25Tb3VyY2VFbGVtZW50cyA9IHBhcnNlRnVuY3Rpb25Tb3VyY2VFbGVtZW50cztcbiAgICAgICAgICAgIGV4dHJhLnBhcnNlQ2F0Y2hDbGF1c2UgPSBwYXJzZUNhdGNoQ2xhdXNlO1xuICAgICAgICAgICAgZXh0cmEucGFyc2VDb21wdXRlZE1lbWJlciA9IHBhcnNlQ29tcHV0ZWRNZW1iZXI7XG4gICAgICAgICAgICBleHRyYS5wYXJzZUNvbmRpdGlvbmFsRXhwcmVzc2lvbiA9IHBhcnNlQ29uZGl0aW9uYWxFeHByZXNzaW9uO1xuICAgICAgICAgICAgZXh0cmEucGFyc2VDb25zdExldERlY2xhcmF0aW9uID0gcGFyc2VDb25zdExldERlY2xhcmF0aW9uO1xuICAgICAgICAgICAgZXh0cmEucGFyc2VFcXVhbGl0eUV4cHJlc3Npb24gPSBwYXJzZUVxdWFsaXR5RXhwcmVzc2lvbjtcbiAgICAgICAgICAgIGV4dHJhLnBhcnNlRXhwcmVzc2lvbiA9IHBhcnNlRXhwcmVzc2lvbjtcbiAgICAgICAgICAgIGV4dHJhLnBhcnNlRm9yVmFyaWFibGVEZWNsYXJhdGlvbiA9IHBhcnNlRm9yVmFyaWFibGVEZWNsYXJhdGlvbjtcbiAgICAgICAgICAgIGV4dHJhLnBhcnNlRnVuY3Rpb25EZWNsYXJhdGlvbiA9IHBhcnNlRnVuY3Rpb25EZWNsYXJhdGlvbjtcbiAgICAgICAgICAgIGV4dHJhLnBhcnNlRnVuY3Rpb25FeHByZXNzaW9uID0gcGFyc2VGdW5jdGlvbkV4cHJlc3Npb247XG4gICAgICAgICAgICBleHRyYS5wYXJzZUxvZ2ljYWxBTkRFeHByZXNzaW9uID0gcGFyc2VMb2dpY2FsQU5ERXhwcmVzc2lvbjtcbiAgICAgICAgICAgIGV4dHJhLnBhcnNlTG9naWNhbE9SRXhwcmVzc2lvbiA9IHBhcnNlTG9naWNhbE9SRXhwcmVzc2lvbjtcbiAgICAgICAgICAgIGV4dHJhLnBhcnNlTXVsdGlwbGljYXRpdmVFeHByZXNzaW9uID0gcGFyc2VNdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb247XG4gICAgICAgICAgICBleHRyYS5wYXJzZU5ld0V4cHJlc3Npb24gPSBwYXJzZU5ld0V4cHJlc3Npb247XG4gICAgICAgICAgICBleHRyYS5wYXJzZU5vbkNvbXB1dGVkUHJvcGVydHkgPSBwYXJzZU5vbkNvbXB1dGVkUHJvcGVydHk7XG4gICAgICAgICAgICBleHRyYS5wYXJzZU9iamVjdFByb3BlcnR5ID0gcGFyc2VPYmplY3RQcm9wZXJ0eTtcbiAgICAgICAgICAgIGV4dHJhLnBhcnNlT2JqZWN0UHJvcGVydHlLZXkgPSBwYXJzZU9iamVjdFByb3BlcnR5S2V5O1xuICAgICAgICAgICAgZXh0cmEucGFyc2VQb3N0Zml4RXhwcmVzc2lvbiA9IHBhcnNlUG9zdGZpeEV4cHJlc3Npb247XG4gICAgICAgICAgICBleHRyYS5wYXJzZVByaW1hcnlFeHByZXNzaW9uID0gcGFyc2VQcmltYXJ5RXhwcmVzc2lvbjtcbiAgICAgICAgICAgIGV4dHJhLnBhcnNlUHJvZ3JhbSA9IHBhcnNlUHJvZ3JhbTtcbiAgICAgICAgICAgIGV4dHJhLnBhcnNlUHJvcGVydHlGdW5jdGlvbiA9IHBhcnNlUHJvcGVydHlGdW5jdGlvbjtcbiAgICAgICAgICAgIGV4dHJhLnBhcnNlUmVsYXRpb25hbEV4cHJlc3Npb24gPSBwYXJzZVJlbGF0aW9uYWxFeHByZXNzaW9uO1xuICAgICAgICAgICAgZXh0cmEucGFyc2VTdGF0ZW1lbnQgPSBwYXJzZVN0YXRlbWVudDtcbiAgICAgICAgICAgIGV4dHJhLnBhcnNlU2hpZnRFeHByZXNzaW9uID0gcGFyc2VTaGlmdEV4cHJlc3Npb247XG4gICAgICAgICAgICBleHRyYS5wYXJzZVN3aXRjaENhc2UgPSBwYXJzZVN3aXRjaENhc2U7XG4gICAgICAgICAgICBleHRyYS5wYXJzZVVuYXJ5RXhwcmVzc2lvbiA9IHBhcnNlVW5hcnlFeHByZXNzaW9uO1xuICAgICAgICAgICAgZXh0cmEucGFyc2VWYXJpYWJsZURlY2xhcmF0aW9uID0gcGFyc2VWYXJpYWJsZURlY2xhcmF0aW9uO1xuICAgICAgICAgICAgZXh0cmEucGFyc2VWYXJpYWJsZUlkZW50aWZpZXIgPSBwYXJzZVZhcmlhYmxlSWRlbnRpZmllcjtcblxuICAgICAgICAgICAgcGFyc2VBZGRpdGl2ZUV4cHJlc3Npb24gPSB3cmFwVHJhY2tpbmcoZXh0cmEucGFyc2VBZGRpdGl2ZUV4cHJlc3Npb24pO1xuICAgICAgICAgICAgcGFyc2VBc3NpZ25tZW50RXhwcmVzc2lvbiA9IHdyYXBUcmFja2luZyhleHRyYS5wYXJzZUFzc2lnbm1lbnRFeHByZXNzaW9uKTtcbiAgICAgICAgICAgIHBhcnNlQml0d2lzZUFOREV4cHJlc3Npb24gPSB3cmFwVHJhY2tpbmcoZXh0cmEucGFyc2VCaXR3aXNlQU5ERXhwcmVzc2lvbik7XG4gICAgICAgICAgICBwYXJzZUJpdHdpc2VPUkV4cHJlc3Npb24gPSB3cmFwVHJhY2tpbmcoZXh0cmEucGFyc2VCaXR3aXNlT1JFeHByZXNzaW9uKTtcbiAgICAgICAgICAgIHBhcnNlQml0d2lzZVhPUkV4cHJlc3Npb24gPSB3cmFwVHJhY2tpbmcoZXh0cmEucGFyc2VCaXR3aXNlWE9SRXhwcmVzc2lvbik7XG4gICAgICAgICAgICBwYXJzZUJsb2NrID0gd3JhcFRyYWNraW5nKGV4dHJhLnBhcnNlQmxvY2spO1xuICAgICAgICAgICAgcGFyc2VGdW5jdGlvblNvdXJjZUVsZW1lbnRzID0gd3JhcFRyYWNraW5nKGV4dHJhLnBhcnNlRnVuY3Rpb25Tb3VyY2VFbGVtZW50cyk7XG4gICAgICAgICAgICBwYXJzZUNhdGNoQ2xhdXNlID0gd3JhcFRyYWNraW5nKGV4dHJhLnBhcnNlQ2F0Y2hDbGF1c2UpO1xuICAgICAgICAgICAgcGFyc2VDb21wdXRlZE1lbWJlciA9IHdyYXBUcmFja2luZyhleHRyYS5wYXJzZUNvbXB1dGVkTWVtYmVyKTtcbiAgICAgICAgICAgIHBhcnNlQ29uZGl0aW9uYWxFeHByZXNzaW9uID0gd3JhcFRyYWNraW5nKGV4dHJhLnBhcnNlQ29uZGl0aW9uYWxFeHByZXNzaW9uKTtcbiAgICAgICAgICAgIHBhcnNlQ29uc3RMZXREZWNsYXJhdGlvbiA9IHdyYXBUcmFja2luZyhleHRyYS5wYXJzZUNvbnN0TGV0RGVjbGFyYXRpb24pO1xuICAgICAgICAgICAgcGFyc2VFcXVhbGl0eUV4cHJlc3Npb24gPSB3cmFwVHJhY2tpbmcoZXh0cmEucGFyc2VFcXVhbGl0eUV4cHJlc3Npb24pO1xuICAgICAgICAgICAgcGFyc2VFeHByZXNzaW9uID0gd3JhcFRyYWNraW5nKGV4dHJhLnBhcnNlRXhwcmVzc2lvbik7XG4gICAgICAgICAgICBwYXJzZUZvclZhcmlhYmxlRGVjbGFyYXRpb24gPSB3cmFwVHJhY2tpbmcoZXh0cmEucGFyc2VGb3JWYXJpYWJsZURlY2xhcmF0aW9uKTtcbiAgICAgICAgICAgIHBhcnNlRnVuY3Rpb25EZWNsYXJhdGlvbiA9IHdyYXBUcmFja2luZyhleHRyYS5wYXJzZUZ1bmN0aW9uRGVjbGFyYXRpb24pO1xuICAgICAgICAgICAgcGFyc2VGdW5jdGlvbkV4cHJlc3Npb24gPSB3cmFwVHJhY2tpbmcoZXh0cmEucGFyc2VGdW5jdGlvbkV4cHJlc3Npb24pO1xuICAgICAgICAgICAgcGFyc2VMZWZ0SGFuZFNpZGVFeHByZXNzaW9uID0gd3JhcFRyYWNraW5nKHBhcnNlTGVmdEhhbmRTaWRlRXhwcmVzc2lvbik7XG4gICAgICAgICAgICBwYXJzZUxvZ2ljYWxBTkRFeHByZXNzaW9uID0gd3JhcFRyYWNraW5nKGV4dHJhLnBhcnNlTG9naWNhbEFOREV4cHJlc3Npb24pO1xuICAgICAgICAgICAgcGFyc2VMb2dpY2FsT1JFeHByZXNzaW9uID0gd3JhcFRyYWNraW5nKGV4dHJhLnBhcnNlTG9naWNhbE9SRXhwcmVzc2lvbik7XG4gICAgICAgICAgICBwYXJzZU11bHRpcGxpY2F0aXZlRXhwcmVzc2lvbiA9IHdyYXBUcmFja2luZyhleHRyYS5wYXJzZU11bHRpcGxpY2F0aXZlRXhwcmVzc2lvbik7XG4gICAgICAgICAgICBwYXJzZU5ld0V4cHJlc3Npb24gPSB3cmFwVHJhY2tpbmcoZXh0cmEucGFyc2VOZXdFeHByZXNzaW9uKTtcbiAgICAgICAgICAgIHBhcnNlTm9uQ29tcHV0ZWRQcm9wZXJ0eSA9IHdyYXBUcmFja2luZyhleHRyYS5wYXJzZU5vbkNvbXB1dGVkUHJvcGVydHkpO1xuICAgICAgICAgICAgcGFyc2VPYmplY3RQcm9wZXJ0eSA9IHdyYXBUcmFja2luZyhleHRyYS5wYXJzZU9iamVjdFByb3BlcnR5KTtcbiAgICAgICAgICAgIHBhcnNlT2JqZWN0UHJvcGVydHlLZXkgPSB3cmFwVHJhY2tpbmcoZXh0cmEucGFyc2VPYmplY3RQcm9wZXJ0eUtleSk7XG4gICAgICAgICAgICBwYXJzZVBvc3RmaXhFeHByZXNzaW9uID0gd3JhcFRyYWNraW5nKGV4dHJhLnBhcnNlUG9zdGZpeEV4cHJlc3Npb24pO1xuICAgICAgICAgICAgcGFyc2VQcmltYXJ5RXhwcmVzc2lvbiA9IHdyYXBUcmFja2luZyhleHRyYS5wYXJzZVByaW1hcnlFeHByZXNzaW9uKTtcbiAgICAgICAgICAgIHBhcnNlUHJvZ3JhbSA9IHdyYXBUcmFja2luZyhleHRyYS5wYXJzZVByb2dyYW0pO1xuICAgICAgICAgICAgcGFyc2VQcm9wZXJ0eUZ1bmN0aW9uID0gd3JhcFRyYWNraW5nKGV4dHJhLnBhcnNlUHJvcGVydHlGdW5jdGlvbik7XG4gICAgICAgICAgICBwYXJzZVJlbGF0aW9uYWxFeHByZXNzaW9uID0gd3JhcFRyYWNraW5nKGV4dHJhLnBhcnNlUmVsYXRpb25hbEV4cHJlc3Npb24pO1xuICAgICAgICAgICAgcGFyc2VTdGF0ZW1lbnQgPSB3cmFwVHJhY2tpbmcoZXh0cmEucGFyc2VTdGF0ZW1lbnQpO1xuICAgICAgICAgICAgcGFyc2VTaGlmdEV4cHJlc3Npb24gPSB3cmFwVHJhY2tpbmcoZXh0cmEucGFyc2VTaGlmdEV4cHJlc3Npb24pO1xuICAgICAgICAgICAgcGFyc2VTd2l0Y2hDYXNlID0gd3JhcFRyYWNraW5nKGV4dHJhLnBhcnNlU3dpdGNoQ2FzZSk7XG4gICAgICAgICAgICBwYXJzZVVuYXJ5RXhwcmVzc2lvbiA9IHdyYXBUcmFja2luZyhleHRyYS5wYXJzZVVuYXJ5RXhwcmVzc2lvbik7XG4gICAgICAgICAgICBwYXJzZVZhcmlhYmxlRGVjbGFyYXRpb24gPSB3cmFwVHJhY2tpbmcoZXh0cmEucGFyc2VWYXJpYWJsZURlY2xhcmF0aW9uKTtcbiAgICAgICAgICAgIHBhcnNlVmFyaWFibGVJZGVudGlmaWVyID0gd3JhcFRyYWNraW5nKGV4dHJhLnBhcnNlVmFyaWFibGVJZGVudGlmaWVyKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0eXBlb2YgZXh0cmEudG9rZW5zICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgZXh0cmEuYWR2YW5jZSA9IGFkdmFuY2U7XG4gICAgICAgICAgICBleHRyYS5zY2FuUmVnRXhwID0gc2NhblJlZ0V4cDtcblxuICAgICAgICAgICAgYWR2YW5jZSA9IGNvbGxlY3RUb2tlbjtcbiAgICAgICAgICAgIHNjYW5SZWdFeHAgPSBjb2xsZWN0UmVnZXg7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiB1bnBhdGNoKCkge1xuICAgICAgICBpZiAodHlwZW9mIGV4dHJhLnNraXBDb21tZW50ID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICBza2lwQ29tbWVudCA9IGV4dHJhLnNraXBDb21tZW50O1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGV4dHJhLnJhdykge1xuICAgICAgICAgICAgY3JlYXRlTGl0ZXJhbCA9IGV4dHJhLmNyZWF0ZUxpdGVyYWw7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoZXh0cmEucmFuZ2UgfHwgZXh0cmEubG9jKSB7XG4gICAgICAgICAgICBwYXJzZUFkZGl0aXZlRXhwcmVzc2lvbiA9IGV4dHJhLnBhcnNlQWRkaXRpdmVFeHByZXNzaW9uO1xuICAgICAgICAgICAgcGFyc2VBc3NpZ25tZW50RXhwcmVzc2lvbiA9IGV4dHJhLnBhcnNlQXNzaWdubWVudEV4cHJlc3Npb247XG4gICAgICAgICAgICBwYXJzZUJpdHdpc2VBTkRFeHByZXNzaW9uID0gZXh0cmEucGFyc2VCaXR3aXNlQU5ERXhwcmVzc2lvbjtcbiAgICAgICAgICAgIHBhcnNlQml0d2lzZU9SRXhwcmVzc2lvbiA9IGV4dHJhLnBhcnNlQml0d2lzZU9SRXhwcmVzc2lvbjtcbiAgICAgICAgICAgIHBhcnNlQml0d2lzZVhPUkV4cHJlc3Npb24gPSBleHRyYS5wYXJzZUJpdHdpc2VYT1JFeHByZXNzaW9uO1xuICAgICAgICAgICAgcGFyc2VCbG9jayA9IGV4dHJhLnBhcnNlQmxvY2s7XG4gICAgICAgICAgICBwYXJzZUZ1bmN0aW9uU291cmNlRWxlbWVudHMgPSBleHRyYS5wYXJzZUZ1bmN0aW9uU291cmNlRWxlbWVudHM7XG4gICAgICAgICAgICBwYXJzZUNhdGNoQ2xhdXNlID0gZXh0cmEucGFyc2VDYXRjaENsYXVzZTtcbiAgICAgICAgICAgIHBhcnNlQ29tcHV0ZWRNZW1iZXIgPSBleHRyYS5wYXJzZUNvbXB1dGVkTWVtYmVyO1xuICAgICAgICAgICAgcGFyc2VDb25kaXRpb25hbEV4cHJlc3Npb24gPSBleHRyYS5wYXJzZUNvbmRpdGlvbmFsRXhwcmVzc2lvbjtcbiAgICAgICAgICAgIHBhcnNlQ29uc3RMZXREZWNsYXJhdGlvbiA9IGV4dHJhLnBhcnNlQ29uc3RMZXREZWNsYXJhdGlvbjtcbiAgICAgICAgICAgIHBhcnNlRXF1YWxpdHlFeHByZXNzaW9uID0gZXh0cmEucGFyc2VFcXVhbGl0eUV4cHJlc3Npb247XG4gICAgICAgICAgICBwYXJzZUV4cHJlc3Npb24gPSBleHRyYS5wYXJzZUV4cHJlc3Npb247XG4gICAgICAgICAgICBwYXJzZUZvclZhcmlhYmxlRGVjbGFyYXRpb24gPSBleHRyYS5wYXJzZUZvclZhcmlhYmxlRGVjbGFyYXRpb247XG4gICAgICAgICAgICBwYXJzZUZ1bmN0aW9uRGVjbGFyYXRpb24gPSBleHRyYS5wYXJzZUZ1bmN0aW9uRGVjbGFyYXRpb247XG4gICAgICAgICAgICBwYXJzZUZ1bmN0aW9uRXhwcmVzc2lvbiA9IGV4dHJhLnBhcnNlRnVuY3Rpb25FeHByZXNzaW9uO1xuICAgICAgICAgICAgcGFyc2VHcm91cEV4cHJlc3Npb24gPSBleHRyYS5wYXJzZUdyb3VwRXhwcmVzc2lvbjtcbiAgICAgICAgICAgIHBhcnNlTGVmdEhhbmRTaWRlRXhwcmVzc2lvbiA9IGV4dHJhLnBhcnNlTGVmdEhhbmRTaWRlRXhwcmVzc2lvbjtcbiAgICAgICAgICAgIHBhcnNlTGVmdEhhbmRTaWRlRXhwcmVzc2lvbkFsbG93Q2FsbCA9IGV4dHJhLnBhcnNlTGVmdEhhbmRTaWRlRXhwcmVzc2lvbkFsbG93Q2FsbDtcbiAgICAgICAgICAgIHBhcnNlTG9naWNhbEFOREV4cHJlc3Npb24gPSBleHRyYS5wYXJzZUxvZ2ljYWxBTkRFeHByZXNzaW9uO1xuICAgICAgICAgICAgcGFyc2VMb2dpY2FsT1JFeHByZXNzaW9uID0gZXh0cmEucGFyc2VMb2dpY2FsT1JFeHByZXNzaW9uO1xuICAgICAgICAgICAgcGFyc2VNdWx0aXBsaWNhdGl2ZUV4cHJlc3Npb24gPSBleHRyYS5wYXJzZU11bHRpcGxpY2F0aXZlRXhwcmVzc2lvbjtcbiAgICAgICAgICAgIHBhcnNlTmV3RXhwcmVzc2lvbiA9IGV4dHJhLnBhcnNlTmV3RXhwcmVzc2lvbjtcbiAgICAgICAgICAgIHBhcnNlTm9uQ29tcHV0ZWRQcm9wZXJ0eSA9IGV4dHJhLnBhcnNlTm9uQ29tcHV0ZWRQcm9wZXJ0eTtcbiAgICAgICAgICAgIHBhcnNlT2JqZWN0UHJvcGVydHkgPSBleHRyYS5wYXJzZU9iamVjdFByb3BlcnR5O1xuICAgICAgICAgICAgcGFyc2VPYmplY3RQcm9wZXJ0eUtleSA9IGV4dHJhLnBhcnNlT2JqZWN0UHJvcGVydHlLZXk7XG4gICAgICAgICAgICBwYXJzZVByaW1hcnlFeHByZXNzaW9uID0gZXh0cmEucGFyc2VQcmltYXJ5RXhwcmVzc2lvbjtcbiAgICAgICAgICAgIHBhcnNlUG9zdGZpeEV4cHJlc3Npb24gPSBleHRyYS5wYXJzZVBvc3RmaXhFeHByZXNzaW9uO1xuICAgICAgICAgICAgcGFyc2VQcm9ncmFtID0gZXh0cmEucGFyc2VQcm9ncmFtO1xuICAgICAgICAgICAgcGFyc2VQcm9wZXJ0eUZ1bmN0aW9uID0gZXh0cmEucGFyc2VQcm9wZXJ0eUZ1bmN0aW9uO1xuICAgICAgICAgICAgcGFyc2VSZWxhdGlvbmFsRXhwcmVzc2lvbiA9IGV4dHJhLnBhcnNlUmVsYXRpb25hbEV4cHJlc3Npb247XG4gICAgICAgICAgICBwYXJzZVN0YXRlbWVudCA9IGV4dHJhLnBhcnNlU3RhdGVtZW50O1xuICAgICAgICAgICAgcGFyc2VTaGlmdEV4cHJlc3Npb24gPSBleHRyYS5wYXJzZVNoaWZ0RXhwcmVzc2lvbjtcbiAgICAgICAgICAgIHBhcnNlU3dpdGNoQ2FzZSA9IGV4dHJhLnBhcnNlU3dpdGNoQ2FzZTtcbiAgICAgICAgICAgIHBhcnNlVW5hcnlFeHByZXNzaW9uID0gZXh0cmEucGFyc2VVbmFyeUV4cHJlc3Npb247XG4gICAgICAgICAgICBwYXJzZVZhcmlhYmxlRGVjbGFyYXRpb24gPSBleHRyYS5wYXJzZVZhcmlhYmxlRGVjbGFyYXRpb247XG4gICAgICAgICAgICBwYXJzZVZhcmlhYmxlSWRlbnRpZmllciA9IGV4dHJhLnBhcnNlVmFyaWFibGVJZGVudGlmaWVyO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHR5cGVvZiBleHRyYS5zY2FuUmVnRXhwID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICBhZHZhbmNlID0gZXh0cmEuYWR2YW5jZTtcbiAgICAgICAgICAgIHNjYW5SZWdFeHAgPSBleHRyYS5zY2FuUmVnRXhwO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gc3RyaW5nVG9BcnJheShzdHIpIHtcbiAgICAgICAgdmFyIGxlbmd0aCA9IHN0ci5sZW5ndGgsXG4gICAgICAgICAgICByZXN1bHQgPSBbXSxcbiAgICAgICAgICAgIGk7XG4gICAgICAgIGZvciAoaSA9IDA7IGkgPCBsZW5ndGg7ICsraSkge1xuICAgICAgICAgICAgcmVzdWx0W2ldID0gc3RyLmNoYXJBdChpKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHBhcnNlKGNvZGUsIG9wdGlvbnMpIHtcbiAgICAgICAgdmFyIHByb2dyYW0sIHRvU3RyaW5nO1xuXG4gICAgICAgIHRvU3RyaW5nID0gU3RyaW5nO1xuICAgICAgICBpZiAodHlwZW9mIGNvZGUgIT09ICdzdHJpbmcnICYmICEoY29kZSBpbnN0YW5jZW9mIFN0cmluZykpIHtcbiAgICAgICAgICAgIGNvZGUgPSB0b1N0cmluZyhjb2RlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHNvdXJjZSA9IGNvZGU7XG4gICAgICAgIGluZGV4ID0gMDtcbiAgICAgICAgbGluZU51bWJlciA9IChzb3VyY2UubGVuZ3RoID4gMCkgPyAxIDogMDtcbiAgICAgICAgbGluZVN0YXJ0ID0gMDtcbiAgICAgICAgbGVuZ3RoID0gc291cmNlLmxlbmd0aDtcbiAgICAgICAgYnVmZmVyID0gbnVsbDtcbiAgICAgICAgc3RhdGUgPSB7XG4gICAgICAgICAgICBhbGxvd0luOiB0cnVlLFxuICAgICAgICAgICAgbGFiZWxTZXQ6IHt9LFxuICAgICAgICAgICAgaW5GdW5jdGlvbkJvZHk6IGZhbHNlLFxuICAgICAgICAgICAgaW5JdGVyYXRpb246IGZhbHNlLFxuICAgICAgICAgICAgaW5Td2l0Y2g6IGZhbHNlXG4gICAgICAgIH07XG5cbiAgICAgICAgZXh0cmEgPSB7fTtcbiAgICAgICAgaWYgKHR5cGVvZiBvcHRpb25zICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgZXh0cmEucmFuZ2UgPSAodHlwZW9mIG9wdGlvbnMucmFuZ2UgPT09ICdib29sZWFuJykgJiYgb3B0aW9ucy5yYW5nZTtcbiAgICAgICAgICAgIGV4dHJhLmxvYyA9ICh0eXBlb2Ygb3B0aW9ucy5sb2MgPT09ICdib29sZWFuJykgJiYgb3B0aW9ucy5sb2M7XG4gICAgICAgICAgICBleHRyYS5yYXcgPSAodHlwZW9mIG9wdGlvbnMucmF3ID09PSAnYm9vbGVhbicpICYmIG9wdGlvbnMucmF3O1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBvcHRpb25zLnRva2VucyA9PT0gJ2Jvb2xlYW4nICYmIG9wdGlvbnMudG9rZW5zKSB7XG4gICAgICAgICAgICAgICAgZXh0cmEudG9rZW5zID0gW107XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodHlwZW9mIG9wdGlvbnMuY29tbWVudCA9PT0gJ2Jvb2xlYW4nICYmIG9wdGlvbnMuY29tbWVudCkge1xuICAgICAgICAgICAgICAgIGV4dHJhLmNvbW1lbnRzID0gW107XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodHlwZW9mIG9wdGlvbnMudG9sZXJhbnQgPT09ICdib29sZWFuJyAmJiBvcHRpb25zLnRvbGVyYW50KSB7XG4gICAgICAgICAgICAgICAgZXh0cmEuZXJyb3JzID0gW107XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAobGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBzb3VyY2VbMF0gPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgLy8gVHJ5IGZpcnN0IHRvIGNvbnZlcnQgdG8gYSBzdHJpbmcuIFRoaXMgaXMgZ29vZCBhcyBmYXN0IHBhdGhcbiAgICAgICAgICAgICAgICAvLyBmb3Igb2xkIElFIHdoaWNoIHVuZGVyc3RhbmRzIHN0cmluZyBpbmRleGluZyBmb3Igc3RyaW5nXG4gICAgICAgICAgICAgICAgLy8gbGl0ZXJhbHMgb25seSBhbmQgbm90IGZvciBzdHJpbmcgb2JqZWN0LlxuICAgICAgICAgICAgICAgIGlmIChjb2RlIGluc3RhbmNlb2YgU3RyaW5nKSB7XG4gICAgICAgICAgICAgICAgICAgIHNvdXJjZSA9IGNvZGUudmFsdWVPZigpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIEZvcmNlIGFjY2Vzc2luZyB0aGUgY2hhcmFjdGVycyB2aWEgYW4gYXJyYXkuXG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBzb3VyY2VbMF0gPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgICAgIHNvdXJjZSA9IHN0cmluZ1RvQXJyYXkoY29kZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcGF0Y2goKTtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIHByb2dyYW0gPSBwYXJzZVByb2dyYW0oKTtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgZXh0cmEuY29tbWVudHMgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgZmlsdGVyQ29tbWVudExvY2F0aW9uKCk7XG4gICAgICAgICAgICAgICAgcHJvZ3JhbS5jb21tZW50cyA9IGV4dHJhLmNvbW1lbnRzO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHR5cGVvZiBleHRyYS50b2tlbnMgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgZmlsdGVyVG9rZW5Mb2NhdGlvbigpO1xuICAgICAgICAgICAgICAgIHByb2dyYW0udG9rZW5zID0gZXh0cmEudG9rZW5zO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHR5cGVvZiBleHRyYS5lcnJvcnMgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgcHJvZ3JhbS5lcnJvcnMgPSBleHRyYS5lcnJvcnM7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoZXh0cmEucmFuZ2UgfHwgZXh0cmEubG9jKSB7XG4gICAgICAgICAgICAgICAgcHJvZ3JhbS5ib2R5ID0gZmlsdGVyR3JvdXAocHJvZ3JhbS5ib2R5KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgdGhyb3cgZTtcbiAgICAgICAgfSBmaW5hbGx5IHtcbiAgICAgICAgICAgIHVucGF0Y2goKTtcbiAgICAgICAgICAgIGV4dHJhID0ge307XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gcHJvZ3JhbTtcbiAgICB9XG5cbiAgICAvLyBTeW5jIHdpdGggcGFja2FnZS5qc29uLlxuICAgIGV4cG9ydHMudmVyc2lvbiA9ICcxLjAuMyc7XG5cbiAgICBleHBvcnRzLnBhcnNlID0gcGFyc2U7XG5cbiAgICAvLyBEZWVwIGNvcHkuXG4gICAgZXhwb3J0cy5TeW50YXggPSAoZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgbmFtZSwgdHlwZXMgPSB7fTtcblxuICAgICAgICBpZiAodHlwZW9mIE9iamVjdC5jcmVhdGUgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIHR5cGVzID0gT2JqZWN0LmNyZWF0ZShudWxsKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZvciAobmFtZSBpbiBTeW50YXgpIHtcbiAgICAgICAgICAgIGlmIChTeW50YXguaGFzT3duUHJvcGVydHkobmFtZSkpIHtcbiAgICAgICAgICAgICAgICB0eXBlc1tuYW1lXSA9IFN5bnRheFtuYW1lXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0eXBlb2YgT2JqZWN0LmZyZWV6ZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgT2JqZWN0LmZyZWV6ZSh0eXBlcyk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdHlwZXM7XG4gICAgfSgpKTtcblxufSkpO1xuLyogdmltOiBzZXQgc3c9NCB0cz00IGV0IHR3PTgwIDogKi9cbiIsIi8qXG4gIENvcHlyaWdodCAoQykgMjAxMiBZdXN1a2UgU3V6dWtpIDx1dGF0YW5lLnRlYUBnbWFpbC5jb20+XG4gIENvcHlyaWdodCAoQykgMjAxMiBBcml5YSBIaWRheWF0IDxhcml5YS5oaWRheWF0QGdtYWlsLmNvbT5cblxuICBSZWRpc3RyaWJ1dGlvbiBhbmQgdXNlIGluIHNvdXJjZSBhbmQgYmluYXJ5IGZvcm1zLCB3aXRoIG9yIHdpdGhvdXRcbiAgbW9kaWZpY2F0aW9uLCBhcmUgcGVybWl0dGVkIHByb3ZpZGVkIHRoYXQgdGhlIGZvbGxvd2luZyBjb25kaXRpb25zIGFyZSBtZXQ6XG5cbiAgICAqIFJlZGlzdHJpYnV0aW9ucyBvZiBzb3VyY2UgY29kZSBtdXN0IHJldGFpbiB0aGUgYWJvdmUgY29weXJpZ2h0XG4gICAgICBub3RpY2UsIHRoaXMgbGlzdCBvZiBjb25kaXRpb25zIGFuZCB0aGUgZm9sbG93aW5nIGRpc2NsYWltZXIuXG4gICAgKiBSZWRpc3RyaWJ1dGlvbnMgaW4gYmluYXJ5IGZvcm0gbXVzdCByZXByb2R1Y2UgdGhlIGFib3ZlIGNvcHlyaWdodFxuICAgICAgbm90aWNlLCB0aGlzIGxpc3Qgb2YgY29uZGl0aW9ucyBhbmQgdGhlIGZvbGxvd2luZyBkaXNjbGFpbWVyIGluIHRoZVxuICAgICAgZG9jdW1lbnRhdGlvbiBhbmQvb3Igb3RoZXIgbWF0ZXJpYWxzIHByb3ZpZGVkIHdpdGggdGhlIGRpc3RyaWJ1dGlvbi5cblxuICBUSElTIFNPRlRXQVJFIElTIFBST1ZJREVEIEJZIFRIRSBDT1BZUklHSFQgSE9MREVSUyBBTkQgQ09OVFJJQlVUT1JTIFwiQVMgSVNcIlxuICBBTkQgQU5ZIEVYUFJFU1MgT1IgSU1QTElFRCBXQVJSQU5USUVTLCBJTkNMVURJTkcsIEJVVCBOT1QgTElNSVRFRCBUTywgVEhFXG4gIElNUExJRUQgV0FSUkFOVElFUyBPRiBNRVJDSEFOVEFCSUxJVFkgQU5EIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFXG4gIEFSRSBESVNDTEFJTUVELiBJTiBOTyBFVkVOVCBTSEFMTCA8Q09QWVJJR0hUIEhPTERFUj4gQkUgTElBQkxFIEZPUiBBTllcbiAgRElSRUNULCBJTkRJUkVDVCwgSU5DSURFTlRBTCwgU1BFQ0lBTCwgRVhFTVBMQVJZLCBPUiBDT05TRVFVRU5USUFMIERBTUFHRVNcbiAgKElOQ0xVRElORywgQlVUIE5PVCBMSU1JVEVEIFRPLCBQUk9DVVJFTUVOVCBPRiBTVUJTVElUVVRFIEdPT0RTIE9SIFNFUlZJQ0VTO1xuICBMT1NTIE9GIFVTRSwgREFUQSwgT1IgUFJPRklUUzsgT1IgQlVTSU5FU1MgSU5URVJSVVBUSU9OKSBIT1dFVkVSIENBVVNFRCBBTkRcbiAgT04gQU5ZIFRIRU9SWSBPRiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQ09OVFJBQ1QsIFNUUklDVCBMSUFCSUxJVFksIE9SIFRPUlRcbiAgKElOQ0xVRElORyBORUdMSUdFTkNFIE9SIE9USEVSV0lTRSkgQVJJU0lORyBJTiBBTlkgV0FZIE9VVCBPRiBUSEUgVVNFIE9GXG4gIFRISVMgU09GVFdBUkUsIEVWRU4gSUYgQURWSVNFRCBPRiBUSEUgUE9TU0lCSUxJVFkgT0YgU1VDSCBEQU1BR0UuXG4qL1xuXG4vKmpzbGludCBiaXR3aXNlOnRydWUgKi9cbi8qZ2xvYmFsIGV4cG9ydHM6dHJ1ZSwgZGVmaW5lOnRydWUsIHdpbmRvdzp0cnVlICovXG4oZnVuY3Rpb24gKGZhY3RvcnkpIHtcbiAgICAndXNlIHN0cmljdCc7XG5cbiAgICAvLyBVbml2ZXJzYWwgTW9kdWxlIERlZmluaXRpb24gKFVNRCkgdG8gc3VwcG9ydCBBTUQsIENvbW1vbkpTL05vZGUuanMsXG4gICAgLy8gYW5kIHBsYWluIGJyb3dzZXIgbG9hZGluZyxcbiAgICBpZiAodHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kKSB7XG4gICAgICAgIGRlZmluZShbJ2V4cG9ydHMnXSwgZmFjdG9yeSk7XG4gICAgfSBlbHNlIGlmICh0eXBlb2YgZXhwb3J0cyAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgZmFjdG9yeShleHBvcnRzKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBmYWN0b3J5KCh3aW5kb3cuZXN0cmF2ZXJzZSA9IHt9KSk7XG4gICAgfVxufShmdW5jdGlvbiAoZXhwb3J0cykge1xuICAgICd1c2Ugc3RyaWN0JztcblxuICAgIHZhciBTeW50YXgsXG4gICAgICAgIGlzQXJyYXksXG4gICAgICAgIFZpc2l0b3JPcHRpb24sXG4gICAgICAgIFZpc2l0b3JLZXlzLFxuICAgICAgICB3cmFwcGVycztcblxuICAgIFN5bnRheCA9IHtcbiAgICAgICAgQXNzaWdubWVudEV4cHJlc3Npb246ICdBc3NpZ25tZW50RXhwcmVzc2lvbicsXG4gICAgICAgIEFycmF5RXhwcmVzc2lvbjogJ0FycmF5RXhwcmVzc2lvbicsXG4gICAgICAgIEJsb2NrU3RhdGVtZW50OiAnQmxvY2tTdGF0ZW1lbnQnLFxuICAgICAgICBCaW5hcnlFeHByZXNzaW9uOiAnQmluYXJ5RXhwcmVzc2lvbicsXG4gICAgICAgIEJyZWFrU3RhdGVtZW50OiAnQnJlYWtTdGF0ZW1lbnQnLFxuICAgICAgICBDYWxsRXhwcmVzc2lvbjogJ0NhbGxFeHByZXNzaW9uJyxcbiAgICAgICAgQ2F0Y2hDbGF1c2U6ICdDYXRjaENsYXVzZScsXG4gICAgICAgIENvbmRpdGlvbmFsRXhwcmVzc2lvbjogJ0NvbmRpdGlvbmFsRXhwcmVzc2lvbicsXG4gICAgICAgIENvbnRpbnVlU3RhdGVtZW50OiAnQ29udGludWVTdGF0ZW1lbnQnLFxuICAgICAgICBEZWJ1Z2dlclN0YXRlbWVudDogJ0RlYnVnZ2VyU3RhdGVtZW50JyxcbiAgICAgICAgRGlyZWN0aXZlU3RhdGVtZW50OiAnRGlyZWN0aXZlU3RhdGVtZW50JyxcbiAgICAgICAgRG9XaGlsZVN0YXRlbWVudDogJ0RvV2hpbGVTdGF0ZW1lbnQnLFxuICAgICAgICBFbXB0eVN0YXRlbWVudDogJ0VtcHR5U3RhdGVtZW50JyxcbiAgICAgICAgRXhwcmVzc2lvblN0YXRlbWVudDogJ0V4cHJlc3Npb25TdGF0ZW1lbnQnLFxuICAgICAgICBGb3JTdGF0ZW1lbnQ6ICdGb3JTdGF0ZW1lbnQnLFxuICAgICAgICBGb3JJblN0YXRlbWVudDogJ0ZvckluU3RhdGVtZW50JyxcbiAgICAgICAgRnVuY3Rpb25EZWNsYXJhdGlvbjogJ0Z1bmN0aW9uRGVjbGFyYXRpb24nLFxuICAgICAgICBGdW5jdGlvbkV4cHJlc3Npb246ICdGdW5jdGlvbkV4cHJlc3Npb24nLFxuICAgICAgICBJZGVudGlmaWVyOiAnSWRlbnRpZmllcicsXG4gICAgICAgIElmU3RhdGVtZW50OiAnSWZTdGF0ZW1lbnQnLFxuICAgICAgICBMaXRlcmFsOiAnTGl0ZXJhbCcsXG4gICAgICAgIExhYmVsZWRTdGF0ZW1lbnQ6ICdMYWJlbGVkU3RhdGVtZW50JyxcbiAgICAgICAgTG9naWNhbEV4cHJlc3Npb246ICdMb2dpY2FsRXhwcmVzc2lvbicsXG4gICAgICAgIE1lbWJlckV4cHJlc3Npb246ICdNZW1iZXJFeHByZXNzaW9uJyxcbiAgICAgICAgTmV3RXhwcmVzc2lvbjogJ05ld0V4cHJlc3Npb24nLFxuICAgICAgICBPYmplY3RFeHByZXNzaW9uOiAnT2JqZWN0RXhwcmVzc2lvbicsXG4gICAgICAgIFByb2dyYW06ICdQcm9ncmFtJyxcbiAgICAgICAgUHJvcGVydHk6ICdQcm9wZXJ0eScsXG4gICAgICAgIFJldHVyblN0YXRlbWVudDogJ1JldHVyblN0YXRlbWVudCcsXG4gICAgICAgIFNlcXVlbmNlRXhwcmVzc2lvbjogJ1NlcXVlbmNlRXhwcmVzc2lvbicsXG4gICAgICAgIFN3aXRjaFN0YXRlbWVudDogJ1N3aXRjaFN0YXRlbWVudCcsXG4gICAgICAgIFN3aXRjaENhc2U6ICdTd2l0Y2hDYXNlJyxcbiAgICAgICAgVGhpc0V4cHJlc3Npb246ICdUaGlzRXhwcmVzc2lvbicsXG4gICAgICAgIFRocm93U3RhdGVtZW50OiAnVGhyb3dTdGF0ZW1lbnQnLFxuICAgICAgICBUcnlTdGF0ZW1lbnQ6ICdUcnlTdGF0ZW1lbnQnLFxuICAgICAgICBVbmFyeUV4cHJlc3Npb246ICdVbmFyeUV4cHJlc3Npb24nLFxuICAgICAgICBVcGRhdGVFeHByZXNzaW9uOiAnVXBkYXRlRXhwcmVzc2lvbicsXG4gICAgICAgIFZhcmlhYmxlRGVjbGFyYXRpb246ICdWYXJpYWJsZURlY2xhcmF0aW9uJyxcbiAgICAgICAgVmFyaWFibGVEZWNsYXJhdG9yOiAnVmFyaWFibGVEZWNsYXJhdG9yJyxcbiAgICAgICAgV2hpbGVTdGF0ZW1lbnQ6ICdXaGlsZVN0YXRlbWVudCcsXG4gICAgICAgIFdpdGhTdGF0ZW1lbnQ6ICdXaXRoU3RhdGVtZW50J1xuICAgIH07XG5cbiAgICBpc0FycmF5ID0gQXJyYXkuaXNBcnJheTtcbiAgICBpZiAoIWlzQXJyYXkpIHtcbiAgICAgICAgaXNBcnJheSA9IGZ1bmN0aW9uIGlzQXJyYXkoYXJyYXkpIHtcbiAgICAgICAgICAgIHJldHVybiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwoYXJyYXkpID09PSAnW29iamVjdCBBcnJheV0nO1xuICAgICAgICB9O1xuICAgIH1cblxuICAgIFZpc2l0b3JLZXlzID0ge1xuICAgICAgICBBc3NpZ25tZW50RXhwcmVzc2lvbjogWydsZWZ0JywgJ3JpZ2h0J10sXG4gICAgICAgIEFycmF5RXhwcmVzc2lvbjogWydlbGVtZW50cyddLFxuICAgICAgICBCbG9ja1N0YXRlbWVudDogWydib2R5J10sXG4gICAgICAgIEJpbmFyeUV4cHJlc3Npb246IFsnbGVmdCcsICdyaWdodCddLFxuICAgICAgICBCcmVha1N0YXRlbWVudDogWydsYWJlbCddLFxuICAgICAgICBDYWxsRXhwcmVzc2lvbjogWydjYWxsZWUnLCAnYXJndW1lbnRzJ10sXG4gICAgICAgIENhdGNoQ2xhdXNlOiBbJ3BhcmFtJywgJ2JvZHknXSxcbiAgICAgICAgQ29uZGl0aW9uYWxFeHByZXNzaW9uOiBbJ3Rlc3QnLCAnY29uc2VxdWVudCcsICdhbHRlcm5hdGUnXSxcbiAgICAgICAgQ29udGludWVTdGF0ZW1lbnQ6IFsnbGFiZWwnXSxcbiAgICAgICAgRGVidWdnZXJTdGF0ZW1lbnQ6IFtdLFxuICAgICAgICBEaXJlY3RpdmVTdGF0ZW1lbnQ6IFtdLFxuICAgICAgICBEb1doaWxlU3RhdGVtZW50OiBbJ2JvZHknLCAndGVzdCddLFxuICAgICAgICBFbXB0eVN0YXRlbWVudDogW10sXG4gICAgICAgIEV4cHJlc3Npb25TdGF0ZW1lbnQ6IFsnZXhwcmVzc2lvbiddLFxuICAgICAgICBGb3JTdGF0ZW1lbnQ6IFsnaW5pdCcsICd0ZXN0JywgJ3VwZGF0ZScsICdib2R5J10sXG4gICAgICAgIEZvckluU3RhdGVtZW50OiBbJ2xlZnQnLCAncmlnaHQnLCAnYm9keSddLFxuICAgICAgICBGdW5jdGlvbkRlY2xhcmF0aW9uOiBbJ2lkJywgJ3BhcmFtcycsICdib2R5J10sXG4gICAgICAgIEZ1bmN0aW9uRXhwcmVzc2lvbjogWydpZCcsICdwYXJhbXMnLCAnYm9keSddLFxuICAgICAgICBJZGVudGlmaWVyOiBbXSxcbiAgICAgICAgSWZTdGF0ZW1lbnQ6IFsndGVzdCcsICdjb25zZXF1ZW50JywgJ2FsdGVybmF0ZSddLFxuICAgICAgICBMaXRlcmFsOiBbXSxcbiAgICAgICAgTGFiZWxlZFN0YXRlbWVudDogWydsYWJlbCcsICdib2R5J10sXG4gICAgICAgIExvZ2ljYWxFeHByZXNzaW9uOiBbJ2xlZnQnLCAncmlnaHQnXSxcbiAgICAgICAgTWVtYmVyRXhwcmVzc2lvbjogWydvYmplY3QnLCAncHJvcGVydHknXSxcbiAgICAgICAgTmV3RXhwcmVzc2lvbjogWydjYWxsZWUnLCAnYXJndW1lbnRzJ10sXG4gICAgICAgIE9iamVjdEV4cHJlc3Npb246IFsncHJvcGVydGllcyddLFxuICAgICAgICBQcm9ncmFtOiBbJ2JvZHknXSxcbiAgICAgICAgUHJvcGVydHk6IFsna2V5JywgJ3ZhbHVlJ10sXG4gICAgICAgIFJldHVyblN0YXRlbWVudDogWydhcmd1bWVudCddLFxuICAgICAgICBTZXF1ZW5jZUV4cHJlc3Npb246IFsnZXhwcmVzc2lvbnMnXSxcbiAgICAgICAgU3dpdGNoU3RhdGVtZW50OiBbJ2Rpc2NyaW1pbmFudCcsICdjYXNlcyddLFxuICAgICAgICBTd2l0Y2hDYXNlOiBbJ3Rlc3QnLCAnY29uc2VxdWVudCddLFxuICAgICAgICBUaGlzRXhwcmVzc2lvbjogW10sXG4gICAgICAgIFRocm93U3RhdGVtZW50OiBbJ2FyZ3VtZW50J10sXG4gICAgICAgIFRyeVN0YXRlbWVudDogWydibG9jaycsICdoYW5kbGVycycsICdmaW5hbGl6ZXInXSxcbiAgICAgICAgVW5hcnlFeHByZXNzaW9uOiBbJ2FyZ3VtZW50J10sXG4gICAgICAgIFVwZGF0ZUV4cHJlc3Npb246IFsnYXJndW1lbnQnXSxcbiAgICAgICAgVmFyaWFibGVEZWNsYXJhdGlvbjogWydkZWNsYXJhdGlvbnMnXSxcbiAgICAgICAgVmFyaWFibGVEZWNsYXJhdG9yOiBbJ2lkJywgJ2luaXQnXSxcbiAgICAgICAgV2hpbGVTdGF0ZW1lbnQ6IFsndGVzdCcsICdib2R5J10sXG4gICAgICAgIFdpdGhTdGF0ZW1lbnQ6IFsnb2JqZWN0JywgJ2JvZHknXVxuICAgIH07XG5cbiAgICBWaXNpdG9yT3B0aW9uID0ge1xuICAgICAgICBCcmVhazogMSxcbiAgICAgICAgU2tpcDogMlxuICAgIH07XG5cbiAgICB3cmFwcGVycyA9IHtcbiAgICAgICAgUHJvcGVydHlXcmFwcGVyOiAnUHJvcGVydHknXG4gICAgfTtcblxuICAgIGZ1bmN0aW9uIHRyYXZlcnNlKHRvcCwgdmlzaXRvcikge1xuICAgICAgICB2YXIgd29ya2xpc3QsIGxlYXZlbGlzdCwgbm9kZSwgbm9kZVR5cGUsIHJldCwgY3VycmVudCwgY3VycmVudDIsIGNhbmRpZGF0ZXMsIGNhbmRpZGF0ZSwgbWFya2VyID0ge307XG5cbiAgICAgICAgd29ya2xpc3QgPSBbIHRvcCBdO1xuICAgICAgICBsZWF2ZWxpc3QgPSBbIG51bGwgXTtcblxuICAgICAgICB3aGlsZSAod29ya2xpc3QubGVuZ3RoKSB7XG4gICAgICAgICAgICBub2RlID0gd29ya2xpc3QucG9wKCk7XG4gICAgICAgICAgICBub2RlVHlwZSA9IG5vZGUudHlwZTtcblxuICAgICAgICAgICAgaWYgKG5vZGUgPT09IG1hcmtlcikge1xuICAgICAgICAgICAgICAgIG5vZGUgPSBsZWF2ZWxpc3QucG9wKCk7XG4gICAgICAgICAgICAgICAgaWYgKHZpc2l0b3IubGVhdmUpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0ID0gdmlzaXRvci5sZWF2ZShub2RlLCBsZWF2ZWxpc3RbbGVhdmVsaXN0Lmxlbmd0aCAtIDFdKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICByZXQgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChyZXQgPT09IFZpc2l0b3JPcHRpb24uQnJlYWspIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSBpZiAobm9kZSkge1xuICAgICAgICAgICAgICAgIGlmICh3cmFwcGVycy5oYXNPd25Qcm9wZXJ0eShub2RlVHlwZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgbm9kZSA9IG5vZGUubm9kZTtcbiAgICAgICAgICAgICAgICAgICAgbm9kZVR5cGUgPSB3cmFwcGVyc1tub2RlVHlwZV07XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaWYgKHZpc2l0b3IuZW50ZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0ID0gdmlzaXRvci5lbnRlcihub2RlLCBsZWF2ZWxpc3RbbGVhdmVsaXN0Lmxlbmd0aCAtIDFdKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICByZXQgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaWYgKHJldCA9PT0gVmlzaXRvck9wdGlvbi5CcmVhaykge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgd29ya2xpc3QucHVzaChtYXJrZXIpO1xuICAgICAgICAgICAgICAgIGxlYXZlbGlzdC5wdXNoKG5vZGUpO1xuXG4gICAgICAgICAgICAgICAgaWYgKHJldCAhPT0gVmlzaXRvck9wdGlvbi5Ta2lwKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhbmRpZGF0ZXMgPSBWaXNpdG9yS2V5c1tub2RlVHlwZV07XG4gICAgICAgICAgICAgICAgICAgIGN1cnJlbnQgPSBjYW5kaWRhdGVzLmxlbmd0aDtcbiAgICAgICAgICAgICAgICAgICAgd2hpbGUgKChjdXJyZW50IC09IDEpID49IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhbmRpZGF0ZSA9IG5vZGVbY2FuZGlkYXRlc1tjdXJyZW50XV07XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoY2FuZGlkYXRlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGlzQXJyYXkoY2FuZGlkYXRlKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjdXJyZW50MiA9IGNhbmRpZGF0ZS5sZW5ndGg7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdoaWxlICgoY3VycmVudDIgLT0gMSkgPj0gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGNhbmRpZGF0ZVtjdXJyZW50Ml0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZihub2RlVHlwZSA9PT0gU3ludGF4Lk9iamVjdEV4cHJlc3Npb24gJiYgJ3Byb3BlcnRpZXMnID09PSBjYW5kaWRhdGVzW2N1cnJlbnRdICYmIG51bGwgPT0gY2FuZGlkYXRlc1tjdXJyZW50XS50eXBlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdvcmtsaXN0LnB1c2goe3R5cGU6ICdQcm9wZXJ0eVdyYXBwZXInLCBub2RlOiBjYW5kaWRhdGVbY3VycmVudDJdfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgd29ya2xpc3QucHVzaChjYW5kaWRhdGVbY3VycmVudDJdKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB3b3JrbGlzdC5wdXNoKGNhbmRpZGF0ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcmVwbGFjZSh0b3AsIHZpc2l0b3IpIHtcbiAgICAgICAgdmFyIHdvcmtsaXN0LCBsZWF2ZWxpc3QsIG5vZGUsIG5vZGVUeXBlLCB0YXJnZXQsIHR1cGxlLCByZXQsIGN1cnJlbnQsIGN1cnJlbnQyLCBjYW5kaWRhdGVzLCBjYW5kaWRhdGUsIG1hcmtlciA9IHt9LCByZXN1bHQ7XG5cbiAgICAgICAgcmVzdWx0ID0ge1xuICAgICAgICAgICAgdG9wOiB0b3BcbiAgICAgICAgfTtcblxuICAgICAgICB0dXBsZSA9IFsgdG9wLCByZXN1bHQsICd0b3AnIF07XG4gICAgICAgIHdvcmtsaXN0ID0gWyB0dXBsZSBdO1xuICAgICAgICBsZWF2ZWxpc3QgPSBbIHR1cGxlIF07XG5cbiAgICAgICAgZnVuY3Rpb24gbm90aWZ5KHYpIHtcbiAgICAgICAgICAgIHJldCA9IHY7XG4gICAgICAgIH1cblxuICAgICAgICB3aGlsZSAod29ya2xpc3QubGVuZ3RoKSB7XG4gICAgICAgICAgICB0dXBsZSA9IHdvcmtsaXN0LnBvcCgpO1xuXG4gICAgICAgICAgICBpZiAodHVwbGUgPT09IG1hcmtlcikge1xuICAgICAgICAgICAgICAgIHR1cGxlID0gbGVhdmVsaXN0LnBvcCgpO1xuICAgICAgICAgICAgICAgIHJldCA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgICAgICBpZiAodmlzaXRvci5sZWF2ZSkge1xuICAgICAgICAgICAgICAgICAgICBub2RlID0gdHVwbGVbMF07XG4gICAgICAgICAgICAgICAgICAgIHRhcmdldCA9IHZpc2l0b3IubGVhdmUodHVwbGVbMF0sIGxlYXZlbGlzdFtsZWF2ZWxpc3QubGVuZ3RoIC0gMV1bMF0sIG5vdGlmeSk7XG4gICAgICAgICAgICAgICAgICAgIGlmICh0YXJnZXQgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgbm9kZSA9IHRhcmdldDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB0dXBsZVsxXVt0dXBsZVsyXV0gPSBub2RlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAocmV0ID09PSBWaXNpdG9yT3B0aW9uLkJyZWFrKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiByZXN1bHQudG9wO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSBpZiAodHVwbGVbMF0pIHtcbiAgICAgICAgICAgICAgICByZXQgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICAgICAgbm9kZSA9IHR1cGxlWzBdO1xuXG4gICAgICAgICAgICAgICAgbm9kZVR5cGUgPSBub2RlLnR5cGU7XG4gICAgICAgICAgICAgICAgaWYgKHdyYXBwZXJzLmhhc093blByb3BlcnR5KG5vZGVUeXBlKSkge1xuICAgICAgICAgICAgICAgICAgICB0dXBsZVswXSA9IG5vZGUgPSBub2RlLm5vZGU7XG4gICAgICAgICAgICAgICAgICAgIG5vZGVUeXBlID0gd3JhcHBlcnNbbm9kZVR5cGVdO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGlmICh2aXNpdG9yLmVudGVyKSB7XG4gICAgICAgICAgICAgICAgICAgIHRhcmdldCA9IHZpc2l0b3IuZW50ZXIodHVwbGVbMF0sIGxlYXZlbGlzdFtsZWF2ZWxpc3QubGVuZ3RoIC0gMV1bMF0sIG5vdGlmeSk7XG4gICAgICAgICAgICAgICAgICAgIGlmICh0YXJnZXQgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgbm9kZSA9IHRhcmdldDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB0dXBsZVsxXVt0dXBsZVsyXV0gPSBub2RlO1xuICAgICAgICAgICAgICAgICAgICB0dXBsZVswXSA9IG5vZGU7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaWYgKHJldCA9PT0gVmlzaXRvck9wdGlvbi5CcmVhaykge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcmVzdWx0LnRvcDtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBpZiAodHVwbGVbMF0pIHtcbiAgICAgICAgICAgICAgICAgICAgd29ya2xpc3QucHVzaChtYXJrZXIpO1xuICAgICAgICAgICAgICAgICAgICBsZWF2ZWxpc3QucHVzaCh0dXBsZSk7XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKHJldCAhPT0gVmlzaXRvck9wdGlvbi5Ta2lwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjYW5kaWRhdGVzID0gVmlzaXRvcktleXNbbm9kZVR5cGVdO1xuICAgICAgICAgICAgICAgICAgICAgICAgY3VycmVudCA9IGNhbmRpZGF0ZXMubGVuZ3RoO1xuICAgICAgICAgICAgICAgICAgICAgICAgd2hpbGUgKChjdXJyZW50IC09IDEpID49IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYW5kaWRhdGUgPSBub2RlW2NhbmRpZGF0ZXNbY3VycmVudF1dO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjYW5kaWRhdGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGlzQXJyYXkoY2FuZGlkYXRlKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY3VycmVudDIgPSBjYW5kaWRhdGUubGVuZ3RoO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgd2hpbGUgKChjdXJyZW50MiAtPSAxKSA+PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGNhbmRpZGF0ZVtjdXJyZW50Ml0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYobm9kZVR5cGUgPT09IFN5bnRheC5PYmplY3RFeHByZXNzaW9uICYmICdwcm9wZXJ0aWVzJyA9PT0gY2FuZGlkYXRlc1tjdXJyZW50XSAmJiBudWxsID09IGNhbmRpZGF0ZXNbY3VycmVudF0udHlwZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgd29ya2xpc3QucHVzaChbe3R5cGU6ICdQcm9wZXJ0eVdyYXBwZXInLCBub2RlOiBjYW5kaWRhdGVbY3VycmVudDJdfSwgY2FuZGlkYXRlLCBjdXJyZW50Ml0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgd29ya2xpc3QucHVzaChbY2FuZGlkYXRlW2N1cnJlbnQyXSwgY2FuZGlkYXRlLCBjdXJyZW50Ml0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgd29ya2xpc3QucHVzaChbY2FuZGlkYXRlLCBub2RlLCBjYW5kaWRhdGVzW2N1cnJlbnRdXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gcmVzdWx0LnRvcDtcbiAgICB9XG5cbiAgICBleHBvcnRzLnZlcnNpb24gPSAnMC4wLjQnO1xuICAgIGV4cG9ydHMuU3ludGF4ID0gU3ludGF4O1xuICAgIGV4cG9ydHMudHJhdmVyc2UgPSB0cmF2ZXJzZTtcbiAgICBleHBvcnRzLnJlcGxhY2UgPSByZXBsYWNlO1xuICAgIGV4cG9ydHMuVmlzaXRvcktleXMgPSBWaXNpdG9yS2V5cztcbiAgICBleHBvcnRzLlZpc2l0b3JPcHRpb24gPSBWaXNpdG9yT3B0aW9uO1xufSkpO1xuLyogdmltOiBzZXQgc3c9NCB0cz00IGV0IHR3PTgwIDogKi9cbiIsIihmdW5jdGlvbiAobnMpIHtcclxuXHJcbiAgICB2YXIgd2FsayA9IHJlcXVpcmUoJ2VzdHJhdmVyc2UnKSxcclxuICAgICAgICBDb250ZXh0ID0gcmVxdWlyZShcIi4vLi4vYmFzZS9jb250ZXh0LmpzXCIpLmdldENvbnRleHQobnVsbCksXHJcbiAgICAgICAgU3ludGF4ID0gd2Fsay5TeW50YXg7XHJcblxyXG4gICAgdmFyIGZpbmRQYXJhbWV0ZXJzSW5Qcm9ncmFtID0gZnVuY3Rpb24gKHByb2dyYW0sIGNvbnRleHROYW1lLCBwYXJhbSwgYW5hbHl6ZWRDYWxscykge1xyXG4gICAgICAgIHZhciBjb250ZXh0U3RhY2sgPSBbbmV3IENvbnRleHQocHJvZ3JhbSwgbnVsbCwge25hbWU6IFwiZ2xvYmFsXCJ9KV07XHJcbiAgICAgICAgdmFyIGZvdW5kUGFyYW1zID0gW107XHJcbiAgICAgICAgYW5hbHl6ZWRDYWxscyA9IGFuYWx5emVkQ2FsbHMgfHwge307XHJcbiAgICAgICAgLy9jb25zb2xlLmxvZyhcIkxvb2tpbmcgZm9yOiBcIiwgY29udGV4dE5hbWUsIHBhcmFtKTtcclxuXHJcbiAgICAgICAgdmFyIGFjdGl2ZVBhcmFtID0gbnVsbDtcclxuICAgICAgICB3YWxrLnRyYXZlcnNlKHByb2dyYW0sIHtcclxuICAgICAgICAgICAgZW50ZXI6IGZ1bmN0aW9uIChub2RlKSB7XHJcbiAgICAgICAgICAgICAgICB2YXIgdHlwZSA9IG5vZGUudHlwZSxcclxuICAgICAgICAgICAgICAgICAgICBjb250ZXh0O1xyXG4gICAgICAgICAgICAgICAgc3dpdGNoICh0eXBlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBTeW50YXguRnVuY3Rpb25EZWNsYXJhdGlvbjpcclxuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHBhcmVudENvbnRleHQgPSBjb250ZXh0U3RhY2tbY29udGV4dFN0YWNrLmxlbmd0aCAtIDFdO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBwYXJlbnRDb250ZXh0LmRlY2xhcmVWYXJpYWJsZShub2RlLmlkLm5hbWUsIGZhbHNlKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29udGV4dCA9IG5ldyBDb250ZXh0KG5vZGUsIHBhcmVudENvbnRleHQsIHtuYW1lOiBub2RlLmlkLm5hbWUgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRleHRTdGFjay5wdXNoKGNvbnRleHQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoY29udGV4dC5zdHIoKSA9PSBjb250ZXh0TmFtZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG5vZGUucGFyYW1zLmxlbmd0aCA+IHBhcmFtKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYWN0aXZlUGFyYW0gPSBub2RlLnBhcmFtc1twYXJhbV0ubmFtZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICBjYXNlIFN5bnRheC5DYWxsRXhwcmVzc2lvbjpcclxuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHBvcyA9IG5vZGUuYXJndW1lbnRzLnJlZHVjZShmdW5jdGlvbiAocHJldiwgY3VyciwgaW5kZXgpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjdXJyLm5hbWUgPT0gYWN0aXZlUGFyYW0pXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGluZGV4O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHByZXY7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sIC0xKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHBvcyAhPSAtMSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29udGV4dCA9IGNvbnRleHRTdGFja1tjb250ZXh0U3RhY2subGVuZ3RoIC0gMV07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgaWQgPSBjb250ZXh0LmdldFZhcmlhYmxlSWRlbnRpZmllcihub2RlLmNhbGxlZS5uYW1lKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICghYW5hbHl6ZWRDYWxsc1tpZF0pIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhbmFseXplZENhbGxzW2lkXSA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZm91bmRQYXJhbXMgPSBmb3VuZFBhcmFtcy5jb25jYXQoZmluZFBhcmFtZXRlcnNJblByb2dyYW0ocHJvZ3JhbSwgaWQsIHBvcywgYW5hbHl6ZWRDYWxscykpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG5cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgbGVhdmU6IGZ1bmN0aW9uIChub2RlKSB7XHJcbiAgICAgICAgICAgICAgICB2YXIgdHlwZSA9IG5vZGUudHlwZTtcclxuICAgICAgICAgICAgICAgIHN3aXRjaCAodHlwZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgU3ludGF4LkZ1bmN0aW9uRGVjbGFyYXRpb246XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRleHRTdGFjay5wb3AoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgYWN0aXZlUGFyYW0gPSBudWxsO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICBjYXNlIFN5bnRheC5NZW1iZXJFeHByZXNzaW9uOlxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoYWN0aXZlUGFyYW0gJiYgbm9kZS5vYmplY3QubmFtZSA9PSBhY3RpdmVQYXJhbSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHBhcmFtZXRlck5hbWUgPSBub2RlLnByb3BlcnR5Lm5hbWU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZm91bmRQYXJhbXMuaW5kZXhPZihwYXJhbWV0ZXJOYW1lKSA9PSAtMSlcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmb3VuZFBhcmFtcy5wdXNoKHBhcmFtZXRlck5hbWUpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIHJldHVybiBmb3VuZFBhcmFtcztcclxuICAgIH07XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBAcGFyYW0ge29iamVjdCF9IHByb2dyYW1cclxuICAgICAqIEBwYXJhbSB7b2JqZWN0P30gb3B0XHJcbiAgICAgKi9cclxuICAgIG5zLmV4dHJhY3RQYXJhbWV0ZXJzID0gZnVuY3Rpb24gKHByb2dyYW0sIG9wdCkge1xyXG4gICAgICAgIG9wdCA9IG9wdCB8fCB7fTtcclxuICAgICAgICB2YXIgY29udGV4dCA9IG9wdC5jb250ZXh0IHx8IFwiZ2xvYmFsLnNoYWRlXCI7XHJcbiAgICAgICAgdmFyIHBhcmFtID0gb3B0LnBhcmFtIHx8IDA7XHJcblxyXG4gICAgICAgIHJldHVybiBmaW5kUGFyYW1ldGVyc0luUHJvZ3JhbShwcm9ncmFtLCBjb250ZXh0LCBwYXJhbSk7XHJcbiAgICB9O1xyXG5cclxuXHJcbn0oZXhwb3J0cykpO1xyXG4iLCIoZnVuY3Rpb24gKG5zKSB7XHJcblxyXG4gICAgdmFyIFN5bnRheCA9IHJlcXVpcmUoJ2VzdHJhdmVyc2UnKS5TeW50YXgsXHJcbiAgICAgICAgVmlzaXRvck9wdGlvbiA9IHJlcXVpcmUoJ2VzdHJhdmVyc2UnKS5WaXNpdG9yT3B0aW9uLFxyXG4gICAgICAgIFNoYWRlID0gcmVxdWlyZShcIi4uLy4uL2ludGVyZmFjZXMuanNcIiksXHJcbiAgICAgICAgVFlQRVMgPSBTaGFkZS5UWVBFUyxcclxuICAgICAgICBBbm5vdGF0aW9uID0gcmVxdWlyZShcIi4vLi4vLi4vYmFzZS9hbm5vdGF0aW9uLmpzXCIpLkFubm90YXRpb24sXHJcbiAgICAgICAgQmFzZSA9IHJlcXVpcmUoXCIuLy4uLy4uL2Jhc2UvaW5kZXguanNcIik7XHJcblxyXG5cclxuICAgIHZhciBCaW5hcnlGdW5jdGlvbnMgPSB7XHJcbiAgICAgICAgXCIrXCIgOiBmdW5jdGlvbihhLGIpIHsgcmV0dXJuIGEgKyBiOyB9LFxyXG4gICAgICAgIFwiLVwiIDogZnVuY3Rpb24oYSxiKSB7IHJldHVybiBhIC0gYjsgfSxcclxuICAgICAgICBcIi9cIiA6IGZ1bmN0aW9uKGEsYikgeyByZXR1cm4gYSAvIGI7IH0sXHJcbiAgICAgICAgXCIqXCIgOiBmdW5jdGlvbihhLGIpIHsgcmV0dXJuIGEgKiBiOyB9LFxyXG4gICAgICAgIFwiJVwiIDogZnVuY3Rpb24oYSxiKSB7IHJldHVybiBhICUgYjsgfSxcclxuXHJcbiAgICAgICAgXCI9PVwiIDogZnVuY3Rpb24oYSxiKSB7IHJldHVybiBhID09IGI7IH0sXHJcbiAgICAgICAgXCIhPVwiIDogZnVuY3Rpb24oYSxiKSB7IHJldHVybiBhICE9IGI7IH0sXHJcbiAgICAgICAgXCI9PT1cIiA6IGZ1bmN0aW9uKGEsYikgeyByZXR1cm4gYSA9PT0gYjsgfSxcclxuICAgICAgICBcIiE9PVwiIDogZnVuY3Rpb24oYSxiKSB7IHJldHVybiBhICE9PSBiOyB9LFxyXG4gICAgICAgIFwiPFwiIDogZnVuY3Rpb24oYSxiKSB7IHJldHVybiBhIDwgYjsgfSxcclxuICAgICAgICBcIjw9XCIgOiBmdW5jdGlvbihhLGIpIHsgcmV0dXJuIGEgPD0gYjsgfSxcclxuICAgICAgICBcIj5cIiA6IGZ1bmN0aW9uKGEsYikgeyByZXR1cm4gYSA+IGI7IH0sXHJcbiAgICAgICAgXCI+PVwiIDogZnVuY3Rpb24oYSxiKSB7IHJldHVybiBhID49IGI7IH1cclxuICAgICAgICB9O1xyXG5cclxuICAgIHZhciBVbmFyeUZ1bmN0aW9ucyA9IHtcclxuICAgICAgICAgICAgICAgIFwiIVwiOiBmdW5jdGlvbihhKSB7IHJldHVybiAhYTsgfSxcclxuICAgICAgICAgICAgICAgIFwiLVwiOiBmdW5jdGlvbihhKSB7IHJldHVybiAtYTsgfSxcclxuICAgICAgICAgICAgICAgIFwiK1wiOiBmdW5jdGlvbihhKSB7IHJldHVybiArYTsgfSxcclxuICAgICAgICAgICAgICAgIFwidHlwZW9mXCI6IGZ1bmN0aW9uKGEpIHsgcmV0dXJuIHR5cGVvZiBhOyB9LFxyXG4gICAgICAgICAgICAgICAgXCJ2b2lkXCI6IGZ1bmN0aW9uKGEpIHsgcmV0dXJuIHZvaWQgYTsgfSxcclxuICAgICAgICAgICAgICAgIFwiZGVsZXRlXCI6IGZ1bmN0aW9uKGEpIHsgcmV0dXJuIGRlbGV0ZSBhOyB9XHJcblxyXG4gICAgfTtcclxuXHJcblxyXG4gICAgZnVuY3Rpb24gZ2V0T2JqZWN0UmVmZXJlbmNlRnJvbU5vZGUob2JqZWN0LCBjb250ZXh0KSB7XHJcbiAgICAgICAgc3dpdGNoIChvYmplY3QudHlwZSkge1xyXG4gICAgICAgICAgICBjYXNlIFN5bnRheC5OZXdFeHByZXNzaW9uOlxyXG4gICAgICAgICAgICBjYXNlIFN5bnRheC5DYWxsRXhwcmVzc2lvbjpcclxuICAgICAgICAgICAgY2FzZSBTeW50YXguTWVtYmVyRXhwcmVzc2lvbjpcclxuICAgICAgICAgICAgICAgIHJldHVybiBjb250ZXh0LmNyZWF0ZVR5cGVJbmZvKG9iamVjdCk7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSBTeW50YXguSWRlbnRpZmllcjpcclxuICAgICAgICAgICAgICAgIHJldHVybiBjb250ZXh0LmdldEJpbmRpbmdCeU5hbWUob2JqZWN0Lm5hbWUpO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgU3ludGF4LlRoaXNFeHByZXNzaW9uOlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGNvbnRleHQuZ2V0QmluZGluZ0J5TmFtZShcInRoaXNcIik7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgZGVmYXVsdDpcclxuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIlVuaGFuZGxlZCBvYmplY3QgdHlwZSBpbiBUeXBlSW5mZXJlbmNlOiBcIiArIG9iamVjdC50eXBlKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgdmFyIGV2YWx1YXRlVHJ1dGggPSBmdW5jdGlvbihleHApIHtcclxuICAgICAgICByZXR1cm4gISFleHA7XHJcbiAgICB9XHJcblxyXG4gICAgdmFyIGxvZyA9IGZ1bmN0aW9uKHN0cikge307XHJcbiAgICAvL3ZhciBsb2cgPSBmdW5jdGlvbigpIHsgY29uc29sZS5sb2cuYXBwbHkoY29uc29sZSwgYXJndW1lbnRzKTsgfTtcclxuXHJcblxyXG4gICAgdmFyIGVudGVySGFuZGxlcnMgPSB7XHJcbiAgICAgICAgLy8gT24gZW50ZXJcclxuICAgICAgICBDb25kaXRpb25hbEV4cHJlc3Npb246IGZ1bmN0aW9uIChub2RlLCBwYXJlbnQsIGN0eCwgcm9vdCkge1xyXG4gICAgICAgICAgICB2YXIgcmVzdWx0ID0gbmV3IEFubm90YXRpb24obm9kZSk7XHJcblxyXG4gICAgICAgICAgICByb290LnRyYXZlcnNlKG5vZGUudGVzdCk7XHJcbiAgICAgICAgICAgIHZhciB0ZXN0ID0gY3R4LmNyZWF0ZVR5cGVJbmZvKG5vZGUudGVzdCk7XHJcblxyXG4gICAgICAgICAgICAvLyBjb25zb2xlLmxvZyhub2RlLnRlc3QsIG5vZGUuY29uc2VxdWVudCwgbm9kZS5hbHRlcm5hdGUpO1xyXG4gICAgICAgICAgICBpZiAodGVzdC5oYXNTdGF0aWNWYWx1ZSgpKSB7XHJcbiAgICAgICAgICAgICAgICB2YXIgdGVzdFJlc3VsdCA9IGV2YWx1YXRlVHJ1dGgodGVzdC5nZXRTdGF0aWNWYWx1ZSgpKTtcclxuICAgICAgICAgICAgICAgIGlmICh0ZXN0UmVzdWx0ID09PSB0cnVlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcm9vdC50cmF2ZXJzZShub2RlLmNvbnNlcXVlbnQpO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnNlcXVlbnQgPSBjdHguY3JlYXRlVHlwZUluZm8obm9kZS5jb25zZXF1ZW50KTtcclxuICAgICAgICAgICAgICAgICAgICByZXN1bHQuY29weShjb25zZXF1ZW50KTtcclxuICAgICAgICAgICAgICAgICAgICB2YXIgYWx0ZXJuYXRlID0gbmV3IEFubm90YXRpb24obm9kZS5hbHRlcm5hdGUpO1xyXG4gICAgICAgICAgICAgICAgICAgIGFsdGVybmF0ZS5lbGltaW5hdGUoKTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcm9vdC50cmF2ZXJzZShub2RlLmFsdGVybmF0ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIGFsdGVybmF0ZSA9IGN0eC5jcmVhdGVUeXBlSW5mbyhub2RlLmFsdGVybmF0ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0LmNvcHkoYWx0ZXJuYXRlKTtcclxuICAgICAgICAgICAgICAgICAgICB2YXIgY29uc2VxdWVudCA9IG5ldyBBbm5vdGF0aW9uKG5vZGUuY29uc2VxdWVudCk7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc2VxdWVudC5lbGltaW5hdGUoKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIC8vIFdlIGNhbid0IGRlY2lkZSwgdGh1cyB0cmF2ZXJzZSBib3RoO1xyXG4gICAgICAgICAgICAgICAgcm9vdC50cmF2ZXJzZShub2RlLmNvbnNlcXVlbnQpO1xyXG4gICAgICAgICAgICAgICAgcm9vdC50cmF2ZXJzZShub2RlLmFsdGVybmF0ZSk7XHJcbiAgICAgICAgICAgICAgICB2YXIgY29uc2VxdWVudCA9IGN0eC5jcmVhdGVUeXBlSW5mbyhub2RlLmNvbnNlcXVlbnQpLFxyXG4gICAgICAgICAgICAgICAgICAgIGFsdGVybmF0ZSA9IGN0eC5jcmVhdGVUeXBlSW5mbyhub2RlLmFsdGVybmF0ZSk7XHJcblxyXG5cclxuICAgICAgICAgICAgICAgIGlmIChjb25zZXF1ZW50LmVxdWFscyhhbHRlcm5hdGUpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0LmNvcHkoY29uc2VxdWVudCk7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGNvbnNlcXVlbnQuY2FuTnVtYmVyKCkgJiYgYWx0ZXJuYXRlLmNhbk51bWJlcigpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0LnNldFR5cGUoVFlQRVMuTlVNQkVSKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGVsc2UgaWYgKHRlc3QuaXNOdWxsT3JVbmRlZmluZWQoKSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdC5zZXRUeXBlKGFsdGVybmF0ZS5nZXRUeXBlKCkpXHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIFdlIGRvbid0IGFsbG93IGR5bmFtaWMgdHlwZXMgKHRoZSB0eXBlIG9mIHRoZSByZXN1bHQgZGVwZW5kcyBvbiB0aGUgdmFsdWUgb2YgaXQncyBvcGVyYW5kcykuXHJcbiAgICAgICAgICAgICAgICAgICAgLy8gQXQgdGhpcyBwb2ludCwgdGhlIGV4cHJlc3Npb24gbmVlZHMgdG8gZXZhbHVhdGUgdG8gYSByZXN1bHQsIG90aGVyd2lzZSBpdCdzIGFuIGVycm9yXHJcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgU2hhZGUudGhyb3dFcnJvcihub2RlLCBcIlN0YXRpYyBldmFsdWF0aW9uIG5vdCBpbXBsZW1lbnRlZCB5ZXRcIik7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmV0dXJuIFZpc2l0b3JPcHRpb24uU2tpcDtcclxuXHJcbiAgICAgICAgfSxcclxuICAgICAgICBMaXRlcmFsOiBmdW5jdGlvbiAobGl0ZXJhbCkge1xyXG4gICAgICAgICAgICAvL2NvbnNvbGUubG9nKGxpdGVyYWwpO1xyXG4gICAgICAgICAgICB2YXIgdmFsdWUgPSBsaXRlcmFsLnJhdyAhPT0gdW5kZWZpbmVkID8gbGl0ZXJhbC5yYXcgOiBsaXRlcmFsLnZhbHVlLFxyXG4gICAgICAgICAgICAgICAgcmVzdWx0ID0gbmV3IEFubm90YXRpb24obGl0ZXJhbCk7XHJcblxyXG4gICAgICAgICAgICB2YXIgbnVtYmVyID0gcGFyc2VGbG9hdCh2YWx1ZSk7XHJcblxyXG4gICAgICAgICAgICBpZiAoIWlzTmFOKG51bWJlcikpIHtcclxuICAgICAgICAgICAgICAgIGlmICh2YWx1ZS5pbmRleE9mKFwiLlwiKSA9PSAtMSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdC5zZXRUeXBlKFRZUEVTLklOVCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICByZXN1bHQuc2V0VHlwZShUWVBFUy5OVU1CRVIpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgcmVzdWx0LnNldFN0YXRpY1ZhbHVlKG51bWJlcik7XHJcbiAgICAgICAgICAgIH0gZWxzZSBpZiAodmFsdWUgPT09ICd0cnVlJykge1xyXG4gICAgICAgICAgICAgICAgcmVzdWx0LnNldFR5cGUoVFlQRVMuQk9PTEVBTik7XHJcbiAgICAgICAgICAgICAgICByZXN1bHQuc2V0U3RhdGljVmFsdWUodHJ1ZSk7XHJcbiAgICAgICAgICAgIH0gZWxzZSBpZiAodmFsdWUgPT09ICdmYWxzZScpIHtcclxuICAgICAgICAgICAgICAgIHJlc3VsdC5zZXRUeXBlKFRZUEVTLkJPT0xFQU4pO1xyXG4gICAgICAgICAgICAgICAgcmVzdWx0LnNldFN0YXRpY1ZhbHVlKGZhbHNlKTtcclxuICAgICAgICAgICAgfSBlbHNlIGlmICh2YWx1ZSA9PT0gJ251bGwnKSB7XHJcbiAgICAgICAgICAgICAgICByZXN1bHQuc2V0VHlwZShUWVBFUy5OVUxMKTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHJlc3VsdC5zZXRUeXBlKFRZUEVTLlNUUklORyk7XHJcbiAgICAgICAgICAgICAgICByZXN1bHQuc2V0U3RhdGljVmFsdWUodmFsdWUpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHZhciBoYW5kbGVycyA9IHtcclxuICAgICAgICBBc3NpZ25tZW50RXhwcmVzc2lvbjogZnVuY3Rpb24gKG5vZGUsIGN0eCkge1xyXG4gICAgICAgICAgICB2YXIgcmlnaHQgPSBjdHguY3JlYXRlVHlwZUluZm8obm9kZS5yaWdodCksXHJcbiAgICAgICAgICAgICAgICByZXN1bHQgPSBuZXcgQW5ub3RhdGlvbihub2RlKTtcclxuXHJcbiAgICAgICAgICAgIHJlc3VsdC5jb3B5KHJpZ2h0KTtcclxuICAgICAgICAgICAgaWYgKG5vZGUubGVmdC50eXBlID09IFN5bnRheC5JZGVudGlmaWVyKSB7XHJcbiAgICAgICAgICAgICAgICB2YXIgbmFtZSA9IG5vZGUubGVmdC5uYW1lO1xyXG4gICAgICAgICAgICAgICAgaWYgKGN0eC5pbkRlY2xhcmF0aW9uID09PSB0cnVlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY3R4LmRlY2xhcmVWYXJpYWJsZShuYW1lLCB0cnVlLCByZXN1bHQpXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBjdHgudXBkYXRlRXhwcmVzc2lvbihuYW1lLCByaWdodCk7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJBc3NpZ25tZW50IGV4cHJlc3Npb25cIik7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9LFxyXG5cclxuXHJcbiAgICAgICAgTmV3RXhwcmVzc2lvbjogZnVuY3Rpb24obm9kZSwgcGFyZW50LCBjdHgpIHtcclxuICAgICAgICAgICAgdmFyIHJlc3VsdCA9IG5ldyBBbm5vdGF0aW9uKG5vZGUpO1xyXG5cclxuICAgICAgICAgICAgdmFyIGVudHJ5ID0gY3R4LmdldEJpbmRpbmdCeU5hbWUobm9kZS5jYWxsZWUubmFtZSk7XHJcbiAgICAgICAgICAgIC8vY29uc29sZS5lcnJvcihlbnRyeSk7XHJcbiAgICAgICAgICAgIGlmIChlbnRyeSAmJiBlbnRyeS5oYXNDb25zdHJ1Y3RvcigpKSB7XHJcbiAgICAgICAgICAgICAgICB2YXIgY29uc3RydWN0b3IgPSBlbnRyeS5nZXRDb25zdHJ1Y3RvcigpO1xyXG4gICAgICAgICAgICAgICAgdmFyIGFyZ3MgPSBBbm5vdGF0aW9uLmNyZWF0ZUFubm90YXRlZE5vZGVBcnJheShub2RlLmFyZ3VtZW50cywgY3R4KTtcclxuICAgICAgICAgICAgICAgIHZhciBleHRyYSA9IGNvbnN0cnVjdG9yLmV2YWx1YXRlKHJlc3VsdCwgYXJncywgY3R4KTtcclxuICAgICAgICAgICAgICAgIHJlc3VsdC5zZXRGcm9tRXh0cmEoZXh0cmEpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJSZWZlcmVuY2VFcnJvcjogXCIgKyBub2RlLmNhbGxlZS5uYW1lICsgXCIgaXMgbm90IGRlZmluZWRcIik7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9LFxyXG5cclxuICAgICAgICBVbmFyeUV4cHJlc3Npb246IGZ1bmN0aW9uIChub2RlLCBjdHgpIHtcclxuICAgICAgICAgICAgdmFyIHJlc3VsdCA9IG5ldyBBbm5vdGF0aW9uKG5vZGUpLFxyXG4gICAgICAgICAgICAgICAgYXJndW1lbnQgPSBjdHguY3JlYXRlVHlwZUluZm8obm9kZS5hcmd1bWVudCksXHJcbiAgICAgICAgICAgICAgICBvcGVyYXRvciA9IG5vZGUub3BlcmF0b3IsXHJcbiAgICAgICAgICAgICAgICBmdW5jID0gVW5hcnlGdW5jdGlvbnNbb3BlcmF0b3JdO1xyXG5cclxuICAgICAgICAgICAgc3dpdGNoIChvcGVyYXRvcikge1xyXG4gICAgICAgICAgICAgICAgY2FzZSBcIiFcIjpcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0LnNldFR5cGUoVFlQRVMuQk9PTEVBTik7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIFwiK1wiOlxyXG4gICAgICAgICAgICAgICAgY2FzZSBcIi1cIjpcclxuICAgICAgICAgICAgICAgICAgICBpZiAoYXJndW1lbnQuY2FuSW50KCkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmVzdWx0LnNldFR5cGUoVFlQRVMuSU5UKTtcclxuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGFyZ3VtZW50LmNhbk51bWJlcigpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc3VsdC5zZXRUeXBlKFRZUEVTLk5VTUJFUik7XHJcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiQ2FuJ3QgZXZhbHVhdGUgJ1wiICsgb3BlcmF0b3IgKyAnXCIgZm9yICcgKyBhcmd1bWVudCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBcIn5cIjpcclxuICAgICAgICAgICAgICAgIGNhc2UgXCJ0eXBlb2ZcIjpcclxuICAgICAgICAgICAgICAgIGNhc2UgXCJ2b2lkXCI6XHJcbiAgICAgICAgICAgICAgICBjYXNlIFwiZGVsZXRlXCI6XHJcbiAgICAgICAgICAgICAgICBkZWZhdWx0OlxyXG4gICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIk9wZXJhdG9yIG5vdCB5ZXQgc3VwcG9ydGVkOiBcIiArIG9wZXJhdG9yKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAoYXJndW1lbnQuaGFzU3RhdGljVmFsdWUoKSkge1xyXG4gICAgICAgICAgICAgICAgcmVzdWx0LnNldFN0YXRpY1ZhbHVlKGZ1bmMoYXJndW1lbnQuZ2V0U3RhdGljVmFsdWUoKSkpO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgcmVzdWx0LnNldER5bmFtaWNWYWx1ZSgpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgIH0sXHJcblxyXG5cclxuICAgICAgICBJZGVudGlmaWVyOiBmdW5jdGlvbiAobm9kZSwgY3R4KSB7XHJcbiAgICAgICAgICAgIHZhciByZXN1bHQgPSBuZXcgQW5ub3RhdGlvbihub2RlKSxcclxuICAgICAgICAgICAgICAgIG5hbWUgPSBub2RlLm5hbWU7XHJcblxyXG4gICAgICAgICAgICBpZiAobmFtZSA9PT0gXCJ1bmRlZmluZWRcIikge1xyXG4gICAgICAgICAgICAgICAgcmVzdWx0LnNldFR5cGUoVFlQRVMuVU5ERUZJTkVEKTtcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0sXHJcblxyXG5cclxuXHJcbiAgICAgICAgTG9naWNhbEV4cHJlc3Npb246IGZ1bmN0aW9uIChub2RlLCBjdHgpIHtcclxuICAgICAgICAgICAgdmFyIGxlZnQgPSBjdHguY3JlYXRlVHlwZUluZm8obm9kZS5sZWZ0KSxcclxuICAgICAgICAgICAgICAgIHJpZ2h0ID0gY3R4LmNyZWF0ZVR5cGVJbmZvKG5vZGUucmlnaHQpLFxyXG4gICAgICAgICAgICAgICAgcmVzdWx0ID0gbmV3IEFubm90YXRpb24obm9kZSksXHJcbiAgICAgICAgICAgICAgICBvcGVyYXRvciA9IG5vZGUub3BlcmF0b3I7XHJcblxyXG4gICAgICAgICAgICBpZiAoIShvcGVyYXRvciA9PSBcIiYmXCIgfHwgb3BlcmF0b3IgPT0gXCJ8fFwiKSlcclxuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIk9wZXJhdG9yIG5vdCBzdXBwb3J0ZWQ6IFwiICsgbm9kZS5vcGVyYXRvcik7XHJcblxyXG4gICAgICAgICAgICBpZiAobGVmdC5pc051bGxPclVuZGVmaW5lZCgpKSB7ICAvLyBldmFsdWF0ZXMgdG8gZmFsc2VcclxuICAgICAgICAgICAgICAgIGlmIChvcGVyYXRvciA9PSBcInx8XCIpIHsgICAgICAvLyBmYWxzZSB8fCB4ID0geFxyXG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdC5jb3B5KHJpZ2h0KTtcclxuICAgICAgICAgICAgICAgICAgICBsZWZ0LmVsaW1pbmF0ZSgpO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHsgICAgICAgICAgICAgICAgICAgICAvLyBmYWxzZSAmJiB4ID0gZmFsc2VcclxuICAgICAgICAgICAgICAgICAgICByZXN1bHQuY29weShsZWZ0KTtcclxuICAgICAgICAgICAgICAgICAgICByaWdodC5lbGltaW5hdGUoKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSBlbHNlIGlmIChsZWZ0LmlzT2JqZWN0KCkgJiYgb3BlcmF0b3IgPT0gXCJ8fFwiKSB7IC8vIEFuIG9iamVjdCB0aGF0IGlzIG5vdCBudWxsIGV2YWx1YXRlcyB0byB0cnVlXHJcbiAgICAgICAgICAgICAgICByZXN1bHQuY29weShsZWZ0KTtcclxuICAgICAgICAgICAgICAgIHJpZ2h0LmVsaW1pbmF0ZSgpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGVsc2UgaWYgKGxlZnQuZ2V0VHlwZSgpID09IHJpZ2h0LmdldFR5cGUoKSkge1xyXG4gICAgICAgICAgICAgICAgaWYgKGxlZnQuaXNPYmplY3QoKSAmJiBsZWZ0LmdldEtpbmQoKSAhPSByaWdodC5nZXRLaW5kKCkpIHtcclxuICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJDYW4ndCBldmFsdWF0ZSBsb2dpY2FsIGV4cHJlc3Npb24gd2l0aCB0d28gZGlmZmVyZW50IGtpbmQgb2Ygb2JqZWN0c1wiKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIHJlc3VsdC5jb3B5KGxlZnQpOyAvLyBUT0RPOiBTdGF0aWMgdmFsdWU/XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAvLyBXZSBkb24ndCBhbGxvdyBkeW5hbWljIHR5cGVzICh0aGUgdHlwZSBvZiB0aGUgcmVzdWx0IGRlcGVuZHMgb24gdGhlIHZhbHVlIG9mIGl0J3Mgb3BlcmFuZHMpLlxyXG4gICAgICAgICAgICAgICAgLy8gQXQgdGhpcyBwb2ludCwgdGhlIGV4cHJlc3Npb24gbmVlZHMgdG8gZXZhbHVhdGUgdG8gYSByZXN1bHQsIG90aGVyd2lzZSBpdCdzIGFuIGVycm9yXHJcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJTdGF0aWMgZXZhbHVhdGlvbiBub3QgaW1wbGVtZW50ZWQgeWV0XCIpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSxcclxuXHJcblxyXG4gICAgICAgIEJpbmFyeUV4cHJlc3Npb246IGZ1bmN0aW9uIChub2RlLCBjdHgpIHtcclxuICAgICAgICAgICAgLy9jb25zb2xlLmxvZyhub2RlLmxlZnQsIG5vZGUucmlnaHQpO1xyXG4gICAgICAgICAgICB2YXIgbGVmdCA9IGN0eC5jcmVhdGVUeXBlSW5mbyhub2RlLmxlZnQpLFxyXG4gICAgICAgICAgICAgICAgcmlnaHQgPSBjdHguY3JlYXRlVHlwZUluZm8obm9kZS5yaWdodCksXHJcbiAgICAgICAgICAgICAgICByZXN1bHQgPSBuZXcgQW5ub3RhdGlvbihub2RlKSxcclxuICAgICAgICAgICAgICAgIG9wZXJhdG9yID0gbm9kZS5vcGVyYXRvcixcclxuICAgICAgICAgICAgICAgIGZ1bmMgPSBCaW5hcnlGdW5jdGlvbnNbb3BlcmF0b3JdO1xyXG5cclxuICAgICAgICAgICAgc3dpdGNoIChvcGVyYXRvcikge1xyXG4gICAgICAgICAgICAgICAgY2FzZSBcIitcIjpcclxuICAgICAgICAgICAgICAgIGNhc2UgXCItXCI6XHJcbiAgICAgICAgICAgICAgICBjYXNlIFwiKlwiOlxyXG4gICAgICAgICAgICAgICAgY2FzZSBcIi9cIjpcclxuICAgICAgICAgICAgICAgIGNhc2UgXCIlXCI6XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gaW50ICdvcCcgaW50ID0+IGludFxyXG4gICAgICAgICAgICAgICAgICAgIC8vIGludCAvIGludCA9PiBudW1iZXJcclxuICAgICAgICAgICAgICAgICAgICBpZiAobGVmdC5pc0ludCgpICYmIHJpZ2h0LmlzSW50KCkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG9wZXJhdG9yID09IFwiL1wiKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzdWx0LnNldFR5cGUoVFlQRVMuTlVNQkVSKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZWxzZVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzdWx0LnNldFR5cGUoVFlQRVMuSU5UKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gaW50ICdvcCcgbnVtYmVyID0+IG51bWJlclxyXG4gICAgICAgICAgICAgICAgICAgIGVsc2UgaWYgKGxlZnQuaXNJbnQoKSAmJiByaWdodC5pc051bWJlcigpIHx8IHJpZ2h0LmlzSW50KCkgJiYgbGVmdC5pc051bWJlcigpKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXN1bHQuc2V0VHlwZShUWVBFUy5OVU1CRVIpO1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIG51bWJlciAnb3AnIG51bWJlciA9PiBudW1iZXJcclxuICAgICAgICAgICAgICAgICAgICBlbHNlIGlmIChsZWZ0LmlzTnVtYmVyKCkgJiYgcmlnaHQuaXNOdW1iZXIoKSlcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmVzdWx0LnNldFR5cGUoVFlQRVMuTlVNQkVSKTtcclxuICAgICAgICAgICAgICAgICAgICAvLyBpbnQgJ29wJyBudWxsID0+IGludFxyXG4gICAgICAgICAgICAgICAgICAgIGVsc2UgaWYgKGxlZnQuaXNJbnQoKSAmJiByaWdodC5pc051bGxPclVuZGVmaW5lZCgpIHx8IHJpZ2h0LmlzSW50KCkgJiYgbGVmdC5pc051bGxPclVuZGVmaW5lZCgpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc3VsdC5zZXRUeXBlKFRZUEVTLklOVCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIC8vIG51bWJlciAnb3AnIG51bGwgPT4gbnVtYmVyXHJcbiAgICAgICAgICAgICAgICAgICAgZWxzZSBpZiAoKGxlZnQuaXNOdW1iZXIoKSAmJiByaWdodC5pc051bGxPclVuZGVmaW5lZCgpKSB8fCAocmlnaHQuaXNOdW1iZXIoKSAmJiBsZWZ0LmlzTnVsbE9yVW5kZWZpbmVkKCkpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc3VsdC5zZXRUeXBlKFRZUEVTLk5VTUJFUik7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAvL2NvbnNvbGUuZXJyb3Iobm9kZSwgbGVmdC5nZXRUeXBlKCksIG9wZXJhdG9yLCByaWdodC5nZXRUeXBlKCkpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBTaGFkZS50aHJvd0Vycm9yKG5vZGUsIFwiRXZhbHVhdGVzIHRvIE5hTjogXCIgKyBsZWZ0LmdldFR5cGVTdHJpbmcoKSArIFwiIFwiICsgb3BlcmF0b3IgKyBcIiBcIiArIHJpZ2h0LmdldFR5cGVTdHJpbmcoKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBcIj09XCI6IC8vIGNvbXBhcmlzb25cclxuICAgICAgICAgICAgICAgIGNhc2UgXCIhPVwiOlxyXG4gICAgICAgICAgICAgICAgY2FzZSBcIj09PVwiOlxyXG4gICAgICAgICAgICAgICAgY2FzZSBcIiE9PVwiOlxyXG4gICAgICAgICAgICAgICAgY2FzZSBcIj5cIjpcclxuICAgICAgICAgICAgICAgIGNhc2UgXCI8XCI6XHJcbiAgICAgICAgICAgICAgICBjYXNlIFwiPj1cIjpcclxuICAgICAgICAgICAgICAgIGNhc2UgXCI8PVwiOlxyXG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdC5zZXRUeXBlKFRZUEVTLkJPT0xFQU4pO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgZGVmYXVsdDpcclxuICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJPcGVyYXRvciBub3Qgc3VwcG9ydGVkOiBcIiArIG9wZXJhdG9yKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAobGVmdC5oYXNTdGF0aWNWYWx1ZSgpICYmIHJpZ2h0Lmhhc1N0YXRpY1ZhbHVlKCkpIHtcclxuICAgICAgICAgICAgICAgIC8vY29uc29sZS5sb2cobGVmdC5nZXRTdGF0aWNWYWx1ZSgpLCBvcGVyYXRvciwgcmlnaHQuZ2V0U3RhdGljVmFsdWUoKSk7XHJcbiAgICAgICAgICAgICAgICByZXN1bHQuc2V0U3RhdGljVmFsdWUoZnVuYyhsZWZ0LmdldFN0YXRpY1ZhbHVlKCksIHJpZ2h0LmdldFN0YXRpY1ZhbHVlKCkpKTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHJlc3VsdC5zZXREeW5hbWljVmFsdWUoKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICB9LFxyXG5cclxuXHJcbiAgICAgICAgTWVtYmVyRXhwcmVzc2lvbjogZnVuY3Rpb24gKG5vZGUsIHBhcmVudCwgY3R4LCByb290KSB7XHJcbiAgICAgICAgICAgIHZhciByZXN1bHRUeXBlID0gY3R4LmNyZWF0ZVR5cGVJbmZvKG5vZGUpLFxyXG4gICAgICAgICAgICAgICAgb2JqZWN0QW5ub3RhdGlvbiA9IG5ldyBBbm5vdGF0aW9uKG5vZGUub2JqZWN0KSxcclxuICAgICAgICAgICAgICAgIHByb3BlcnR5QW5ub3RhdGlvbiA9IG5ldyBBbm5vdGF0aW9uKG5vZGUucHJvcGVydHkpLFxyXG4gICAgICAgICAgICAgICAgcHJvcGVydHlOYW1lID0gbm9kZS5wcm9wZXJ0eS5uYW1lO1xyXG5cclxuICAgICAgICAgICAgLy9jb25zb2xlLmxvZyhcIk1lbWJlclwiLCBub2RlLm9iamVjdC5uYW1lLCBub2RlLnByb3BlcnR5Lm5hbWUpO1xyXG4gICAgICAgICAgICBpZiAobm9kZS5jb21wdXRlZCkge1xyXG4gICAgICAgICAgICAgICAgaWYgKG9iamVjdEFubm90YXRpb24uaXNBcnJheSgpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gUHJvcGVydHkgaXMgY29tcHV0ZWQsIHRodXMgaXQgY291bGQgYmUgYSB2YXJpYWJsZVxyXG4gICAgICAgICAgICAgICAgICAgIHZhciBwcm9wZXJ0eVR5cGUgPSAgY3R4LmNyZWF0ZVR5cGVJbmZvKG5vZGUucHJvcGVydHkpO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICghcHJvcGVydHlUeXBlLmNhbkludCgpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIFNoYWRlLnRocm93RXJyb3Iobm9kZSwgXCJFeHBlY3RlZCAnaW50JyB0eXBlIGZvciBhcnJheSBhY2Nlc3NvclwiKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIGVsZW1lbnRJbmZvID0gb2JqZWN0QW5ub3RhdGlvbi5nZXRBcnJheUVsZW1lbnRUeXBlKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0VHlwZS5zZXRUeXBlKGVsZW1lbnRJbmZvLnR5cGUsIGVsZW1lbnRJbmZvLmtpbmQpO1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIFNoYWRlLnRocm93RXJyb3Iobm9kZSwgXCJUeXBlRXJyb3I6IENhbm5vdCByZWFkIHByb3BlcnR5ICdcIisgcHJvcGVydHlOYW1lICsgXCInIG9mIFwiICsgb2JqZWN0QW5ub3RhdGlvbi5nZXRUeXBlU3RyaW5nKCkpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICB2YXIgb2JqZWN0T2ZJbnRlcmVzdCA9IGdldE9iamVjdFJlZmVyZW5jZUZyb21Ob2RlKG5vZGUub2JqZWN0LCBjdHgpO1xyXG5cclxuICAgICAgICAgICAgb2JqZWN0T2ZJbnRlcmVzdCB8fCBTaGFkZS50aHJvd0Vycm9yKG5vZGUsXCJSZWZlcmVuY2VFcnJvcjogXCIgKyBub2RlLm9iamVjdC5uYW1lICsgXCIgaXMgbm90IGRlZmluZWQuIENvbnRleHQ6IFwiICsgY3R4LnN0cigpKTtcclxuXHJcbiAgICAgICAgICAgIGlmIChvYmplY3RPZkludGVyZXN0LmdldFR5cGUoKSA9PSBUWVBFUy5VTkRFRklORUQpIHsgIC8vIGUuZy4gdmFyIGEgPSB1bmRlZmluZWQ7IGEudW5rbm93bjtcclxuICAgICAgICAgICAgICAgIFNoYWRlLnRocm93RXJyb3Iobm9kZSwgXCJUeXBlRXJyb3I6IENhbm5vdCByZWFkIHByb3BlcnR5ICdcIisgcHJvcGVydHlOYW1lICtcIicgb2YgdW5kZWZpbmVkXCIpXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKG9iamVjdE9mSW50ZXJlc3QuZ2V0VHlwZSgpICE9IFRZUEVTLk9CSkVDVCkgeyAvLyBlLmcuIHZhciBhID0gNTsgYS51bmtub3duO1xyXG4gICAgICAgICAgICAgICAgcmVzdWx0VHlwZS5zZXRUeXBlKFRZUEVTLlVOREVGSU5FRCk7XHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHZhciBvYmplY3RJbmZvID0gY3R4LmdldE9iamVjdEluZm9Gb3Iob2JqZWN0T2ZJbnRlcmVzdCk7XHJcbiAgICAgICAgICAgIGlmKCFvYmplY3RJbmZvKVxyXG4gICAgICAgICAgICAgICAgU2hhZGUudGhyb3dFcnJvcihub2RlLCBcIkludGVybmFsOiBJbmNvbXBsZXRlIHJlZ2lzdHJhdGlvbiBmb3Igb2JqZWN0OiBcIiArIG9iamVjdE9mSW50ZXJlc3QuZ2V0VHlwZVN0cmluZygpICsgXCIsIFwiICsgSlNPTi5zdHJpbmdpZnkobm9kZS5vYmplY3QpKTtcclxuXHJcbiAgICAgICAgICAgIG9iamVjdEFubm90YXRpb24uY29weShvYmplY3RPZkludGVyZXN0KTtcclxuICAgICAgICAgICAgaWYgKCFvYmplY3RJbmZvLmhhc093blByb3BlcnR5KHByb3BlcnR5TmFtZSkpIHtcclxuICAgICAgICAgICAgICAgIHJlc3VsdFR5cGUuc2V0VHlwZShUWVBFUy5VTkRFRklORUQpO1xyXG4gICAgICAgICAgICAgICAgcHJvcGVydHlBbm5vdGF0aW9uLnNldFR5cGUoVFlQRVMuVU5ERUZJTkVEKTtcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgdmFyIHByb3BlcnR5VHlwZUluZm8gPSBvYmplY3RJbmZvW3Byb3BlcnR5TmFtZV07XHJcbiAgICAgICAgICAgIHByb3BlcnR5QW5ub3RhdGlvbi5zZXRGcm9tRXh0cmEocHJvcGVydHlUeXBlSW5mbyk7XHJcbiAgICAgICAgICAgIHJlc3VsdFR5cGUuc2V0RnJvbUV4dHJhKHByb3BlcnR5VHlwZUluZm8pO1xyXG4gICAgICAgIH0sXHJcblxyXG4gICAgICAgIENhbGxFeHByZXNzaW9uOiBmdW5jdGlvbiAobm9kZSwgY3R4LCByb290KSB7XHJcbiAgICAgICAgICAgIHZhciByZXN1bHQgPSBuZXcgQW5ub3RhdGlvbihub2RlKTtcclxuXHJcbiAgICAgICAgICAgIC8vIENhbGwgb24gYW4gb2JqZWN0LCBlLmcuIE1hdGguY29zKClcclxuICAgICAgICAgICAgaWYgKG5vZGUuY2FsbGVlLnR5cGUgPT0gU3ludGF4Lk1lbWJlckV4cHJlc3Npb24pIHtcclxuICAgICAgICAgICAgICAgIHZhciBjYWxsaW5nT2JqZWN0ID0gZ2V0T2JqZWN0UmVmZXJlbmNlRnJvbU5vZGUobm9kZS5jYWxsZWUsIGN0eCk7XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKCFjYWxsaW5nT2JqZWN0LmlzRnVuY3Rpb24oKSkgeyAvLyBlLmcuIE1hdGguUEkoKVxyXG4gICAgICAgICAgICAgICAgICAgIFNoYWRlLnRocm93RXJyb3Iobm9kZSwgXCJUeXBlRXJyb3I6IE9iamVjdCAjPFwiICsgY2FsbGluZ09iamVjdC5nZXRUeXBlKCkrIFwiPiBoYXMgbm8gbWV0aG9kICdcIisgbm9kZS5jYWxsZWUucHJvcGVydHkubmFtZSArIFwiJ1wiKTtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICB2YXIgb2JqZWN0ID0gbm9kZS5jYWxsZWUub2JqZWN0LFxyXG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnR5TmFtZSA9IG5vZGUuY2FsbGVlLnByb3BlcnR5Lm5hbWU7XHJcblxyXG4gICAgICAgICAgICAgICAgdmFyIG9iamVjdFJlZmVyZW5jZSA9IGdldE9iamVjdFJlZmVyZW5jZUZyb21Ob2RlKG9iamVjdCwgY3R4KTtcclxuICAgICAgICAgICAgICAgIGlmKCFvYmplY3RSZWZlcmVuY2UpICB7XHJcbiAgICAgICAgICAgICAgICAgICAgU2hhZGUudGhyb3dFcnJvcihub2RlLCBcIkludGVybmFsOiBObyBvYmplY3QgaW5mbyBmb3I6IFwiICsgb2JqZWN0KTtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICB2YXIgb2JqZWN0SW5mbyA9IGN0eC5nZXRPYmplY3RJbmZvRm9yKG9iamVjdFJlZmVyZW5jZSk7XHJcbiAgICAgICAgICAgICAgICBpZighb2JqZWN0SW5mbykgeyAvLyBFdmVyeSBvYmplY3QgbmVlZHMgYW4gaW5mbywgb3RoZXJ3aXNlIHdlIGRpZCBzb21ldGhpbmcgd3JvbmdcclxuICAgICAgICAgICAgICAgICAgICBTaGFkZS50aHJvd0Vycm9yKG5vZGUsIFwiSW50ZXJuYWwgRXJyb3I6IE5vIG9iamVjdCByZWdpc3RlcmVkIGZvcjogXCIgKyBvYmplY3RSZWZlcmVuY2UuZ2V0VHlwZVN0cmluZygpICsgSlNPTi5zdHJpbmdpZnkobm9kZS5vYmplY3QpKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGlmIChvYmplY3RJbmZvLmhhc093blByb3BlcnR5KHByb3BlcnR5TmFtZSkpIHtcclxuICAgICAgICAgICAgICAgICAgICB2YXIgcHJvcGVydHlIYW5kbGVyID0gb2JqZWN0SW5mb1twcm9wZXJ0eU5hbWVdO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgcHJvcGVydHlIYW5kbGVyLmV2YWx1YXRlID09IFwiZnVuY3Rpb25cIikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgYXJncyA9IEFubm90YXRpb24uY3JlYXRlQW5ub3RhdGVkTm9kZUFycmF5KG5vZGUuYXJndW1lbnRzLCBjdHgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgZXh0cmEgPSBwcm9wZXJ0eUhhbmRsZXIuZXZhbHVhdGUocmVzdWx0LCBhcmdzLCBjdHgsIG9iamVjdFJlZmVyZW5jZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc3VsdC5zZXRGcm9tRXh0cmEoZXh0cmEpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9ICBlbHNlIGlmIChub2RlLmNhbGxlZS50eXBlID09IFN5bnRheC5JZGVudGlmaWVyKSB7XHJcbiAgICAgICAgICAgICAgICB2YXIgZnVuY3Rpb25OYW1lID0gbm9kZS5jYWxsZWUubmFtZTtcclxuICAgICAgICAgICAgICAgIHZhciBmdW5jID0gY3R4LmdldEJpbmRpbmdCeU5hbWUoZnVuY3Rpb25OYW1lKTtcclxuICAgICAgICAgICAgICAgIGlmICghZnVuYykge1xyXG4gICAgICAgICAgICAgICAgICAgIFNoYWRlLnRocm93RXJyb3Iobm9kZSwgXCJSZWZlcmVuY2VFcnJvcjogXCIgKyBmdW5jdGlvbk5hbWUgKyBcIiBpcyBub3QgZGVmaW5lZFwiKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGlmKCFmdW5jLmlzRnVuY3Rpb24oKSkge1xyXG4gICAgICAgICAgICAgICAgICAgIFNoYWRlLnRocm93RXJyb3Iobm9kZSwgXCJUeXBlRXJyb3I6IFwiICsgZnVuYy5nZXRUeXBlU3RyaW5nKCkgKyBcIiBpcyBub3QgYSBmdW5jdGlvblwiKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIHZhciBhcmdzID0gQW5ub3RhdGlvbi5jcmVhdGVBbm5vdGF0ZWROb2RlQXJyYXkobm9kZS5hcmd1bWVudHMsIGN0eCk7XHJcbiAgICAgICAgICAgICAgICB2YXIgZGVmaW5pbmdDb250ZXh0ID0gY3R4LmdldENvbnRleHRGb3JOYW1lKGZ1bmN0aW9uTmFtZSk7XHJcbiAgICAgICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgdmFyIGV4dHJhID0gcm9vdC5nZXRGdW5jdGlvbkluZm9ybWF0aW9uRm9yKGN0eC5nZXRWYXJpYWJsZUlkZW50aWZpZXIoZnVuY3Rpb25OYW1lKSwgYXJncywgZGVmaW5pbmdDb250ZXh0KTtcclxuICAgICAgICAgICAgICAgIH0gY2F0Y2goZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIFNoYWRlLnRocm93RXJyb3Iobm9kZSwgXCJGYWlsdXJlIGluIGZ1bmN0aW9uIGNhbGw6IFwiICsgZS5tZXNzYWdlKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGV4dHJhICYmIHJlc3VsdC5zZXRGcm9tRXh0cmEoZXh0cmEpO1xyXG4gICAgICAgICAgICAgICAgbm9kZS5jYWxsZWUubmFtZSA9IGV4dHJhLm5ld05hbWU7XHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAvKmNhc2UgU3ludGF4LklkZW50aWZpZXI6XHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIGZ1bmN0aW9uTmFtZSA9IG5vZGUuY2FsbGVlLm5hbWU7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIGZ1bmMgPSBjdHguZ2V0QmluZGluZ0J5TmFtZShmdW5jdGlvbk5hbWUpO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICghKGZ1bmMgJiYgZnVuYy5pc0luaXRpYWxpemVkKCkpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihmdW5jdGlvbk5hbWUgKyBcIiBpcyBub3QgZGVmaW5lZC4gQ29udGV4dDogXCIgKyBjdHguc3RyKCkpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAvLyBjb25zb2xlLmxvZyhmdW5jKTtcclxuICAgICAgICAgICAgICAgICAgICAvL3Rocm93IG5ldyBFcnJvcihcIkNhbid0IGNhbGwgXCIgKyBmdW5jdGlvbk5hbWUgKyBcIigpIGluIHRoaXMgY29udGV4dDogXCIgKyBjdHguc3RyKCkpO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgZGVmYXVsdDogICAqL1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJVbmhhbmRsZWQgQ2FsbEV4cHJlc3Npb246XCIgKyBub2RlLmNhbGxlZS50eXBlKTtcclxuXHJcbiAgICAgICAgfVxyXG4gICAgfTtcclxuXHJcbiAgICB2YXIgZW50ZXJFeHByZXNzaW9uID0gZnVuY3Rpb24gKG5vZGUsIHBhcmVudCwgY3R4KSB7XHJcbiAgICAgICAgaWYgKGVudGVySGFuZGxlcnMuaGFzT3duUHJvcGVydHkobm9kZS50eXBlKSkge1xyXG4gICAgICAgICAgICByZXR1cm4gZW50ZXJIYW5kbGVyc1tub2RlLnR5cGVdKG5vZGUsIHBhcmVudCwgY3R4LCB0aGlzKTtcclxuICAgICAgICB9XHJcbiAgICB9O1xyXG5cclxuICAgIHZhciBleGl0RXhwcmVzc2lvbiA9IGZ1bmN0aW9uIChub2RlLCBwYXJlbnQsIGN0eCkge1xyXG5cclxuICAgICAgICBzd2l0Y2ggKG5vZGUudHlwZSkge1xyXG4gICAgICAgICAgICBjYXNlIFN5bnRheC5Bc3NpZ25tZW50RXhwcmVzc2lvbjpcclxuICAgICAgICAgICAgICAgIGhhbmRsZXJzLkFzc2lnbm1lbnRFeHByZXNzaW9uKG5vZGUsIGN0eCk7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSBTeW50YXguQXJyYXlFeHByZXNzaW9uOlxyXG4gICAgICAgICAgICAgICAgbG9nKG5vZGUudHlwZSArIFwiIGlzIG5vdCBoYW5kbGUgeWV0LlwiKTtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIFN5bnRheC5BcnJheVBhdHRlcm46XHJcbiAgICAgICAgICAgICAgICBsb2cobm9kZS50eXBlICsgXCIgaXMgbm90IGhhbmRsZSB5ZXQuXCIpO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgU3ludGF4LkJpbmFyeUV4cHJlc3Npb246XHJcbiAgICAgICAgICAgICAgICBoYW5kbGVycy5CaW5hcnlFeHByZXNzaW9uKG5vZGUsIGN0eCk7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSBTeW50YXguQ2FsbEV4cHJlc3Npb246XHJcbiAgICAgICAgICAgICAgICBoYW5kbGVycy5DYWxsRXhwcmVzc2lvbihub2RlLCBjdHgsIHRoaXMpO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgU3ludGF4LkNvbmRpdGlvbmFsRXhwcmVzc2lvbjpcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIFN5bnRheC5GdW5jdGlvbkV4cHJlc3Npb246XHJcbiAgICAgICAgICAgICAgICBsb2cobm9kZS50eXBlICsgXCIgaXMgbm90IGhhbmRsZSB5ZXQuXCIpO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgU3ludGF4LklkZW50aWZpZXI6XHJcbiAgICAgICAgICAgICAgICBoYW5kbGVycy5JZGVudGlmaWVyKG5vZGUsIGN0eCk7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSBTeW50YXguTGl0ZXJhbDpcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIFN5bnRheC5Mb2dpY2FsRXhwcmVzc2lvbjpcclxuICAgICAgICAgICAgICAgIGhhbmRsZXJzLkxvZ2ljYWxFeHByZXNzaW9uKG5vZGUsIGN0eCk7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSBTeW50YXguTWVtYmVyRXhwcmVzc2lvbjpcclxuICAgICAgICAgICAgICAgIGhhbmRsZXJzLk1lbWJlckV4cHJlc3Npb24obm9kZSwgcGFyZW50LCBjdHgsIHRoaXMpO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgU3ludGF4Lk5ld0V4cHJlc3Npb246XHJcbiAgICAgICAgICAgICAgICBoYW5kbGVycy5OZXdFeHByZXNzaW9uKG5vZGUsIHBhcmVudCwgY3R4KTtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIFN5bnRheC5PYmplY3RFeHByZXNzaW9uOlxyXG4gICAgICAgICAgICAgICAgbG9nKG5vZGUudHlwZSArIFwiIGlzIG5vdCBoYW5kbGUgeWV0LlwiKTtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIFN5bnRheC5PYmplY3RQYXR0ZXJuOlxyXG4gICAgICAgICAgICAgICAgbG9nKG5vZGUudHlwZSArIFwiIGlzIG5vdCBoYW5kbGUgeWV0LlwiKTtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIFN5bnRheC5Qcm9wZXJ0eTpcclxuICAgICAgICAgICAgICAgIGxvZyhub2RlLnR5cGUgKyBcIiBpcyBub3QgaGFuZGxlIHlldC5cIik7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSBTeW50YXguU2VxdWVuY2VFeHByZXNzaW9uOlxyXG4gICAgICAgICAgICAgICAgbG9nKG5vZGUudHlwZSArIFwiIGlzIG5vdCBoYW5kbGUgeWV0LlwiKTtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIFN5bnRheC5UaGlzRXhwcmVzc2lvbjpcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIFN5bnRheC5VbmFyeUV4cHJlc3Npb246XHJcbiAgICAgICAgICAgICAgICBoYW5kbGVycy5VbmFyeUV4cHJlc3Npb24obm9kZSwgY3R4KTtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIFN5bnRheC5VcGRhdGVFeHByZXNzaW9uOlxyXG4gICAgICAgICAgICAgICAgbG9nKG5vZGUudHlwZSArIFwiIGlzIG5vdCBoYW5kbGUgeWV0LlwiKTtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIFN5bnRheC5ZaWVsZEV4cHJlc3Npb246XHJcbiAgICAgICAgICAgICAgICBsb2cobm9kZS50eXBlICsgXCIgaXMgbm90IGhhbmRsZSB5ZXQuXCIpO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGRlZmF1bHQ6XHJcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1Vua25vd24gbm9kZSB0eXBlOiAnICsgbm9kZS50eXBlKTtcclxuXHJcblxyXG4gICAgICAgIH1cclxuXHJcbiAgICB9O1xyXG5cclxuXHJcbiAgICBucy5lbnRlckV4cHJlc3Npb24gPSBlbnRlckV4cHJlc3Npb247XHJcbiAgICBucy5leGl0RXhwcmVzc2lvbiA9IGV4aXRFeHByZXNzaW9uO1xyXG59KGV4cG9ydHMpKTtcclxuIiwiKGZ1bmN0aW9uIChucykge1xyXG5cclxuICAgIHZhciB3YWxrID0gcmVxdWlyZSgnZXN0cmF2ZXJzZScpLFxyXG4gICAgICAgIGVudGVyRXhwcmVzc2lvbiA9IHJlcXVpcmUoJy4vaW5mZXJfZXhwcmVzc2lvbi5qcycpLmVudGVyRXhwcmVzc2lvbixcclxuICAgICAgICBleGl0RXhwcmVzc2lvbiA9IHJlcXVpcmUoJy4vaW5mZXJfZXhwcmVzc2lvbi5qcycpLmV4aXRFeHByZXNzaW9uLFxyXG4gICAgICAgIFN5bnRheCA9IHJlcXVpcmUoJ2VzdHJhdmVyc2UnKS5TeW50YXgsXHJcbiAgICAgICAgVFlQRVMgPSByZXF1aXJlKFwiLi4vLi4vaW50ZXJmYWNlcy5qc1wiKS5UWVBFUyxcclxuICAgICAgICBBbm5vdGF0aW9uID0gcmVxdWlyZShcIi4vLi4vLi4vYmFzZS9hbm5vdGF0aW9uLmpzXCIpLkFubm90YXRpb24sXHJcbiAgICAgICAgRnVuY3Rpb25Bbm5vdGF0aW9uID0gcmVxdWlyZShcIi4vLi4vLi4vYmFzZS9hbm5vdGF0aW9uLmpzXCIpLkZ1bmN0aW9uQW5ub3RhdGlvbjtcclxuXHJcbiAgICB2YXIgbG9nID0gZnVuY3Rpb24oc3RyKSB7fTtcclxuICAgIC8vdmFyIGxvZyA9IGZ1bmN0aW9uKCkgeyBjb25zb2xlLmxvZy5hcHBseShjb25zb2xlLCBhcmd1bWVudHMpOyB9O1xyXG5cclxuICAgIHZhciBlbnRlckhhbmRsZXIgPSB7XHJcbiAgICAgICAgRm9yU3RhdGVtZW50OiBmdW5jdGlvbihub2RlLCBjdHgsIHJvb3QpIHtcclxuICAgICAgICAgICAgdmFyIGN0eCA9IHJvb3QuY3JlYXRlQ29udGV4dChub2RlLCBjdHgpO1xyXG4gICAgICAgICAgICByb290LnB1c2hDb250ZXh0KGN0eCk7XHJcblxyXG4gICAgICAgICAgICByb290LnRyYXZlcnNlKG5vZGUuaW5pdCk7XHJcbiAgICAgICAgICAgIHJvb3QudHJhdmVyc2Uobm9kZS50ZXN0KTtcclxuXHJcbiAgICAgICAgICAgIHZhciB0ZXN0ID0gbmV3IEFubm90YXRpb24obm9kZS50ZXN0KTtcclxuICAgICAgICAgICAgaWYgKHRlc3QuaGFzU3RhdGljVmFsdWUoKSkgeyAvLyBHcmVhdCEgV2UgY2FuIGV2YWx1YXRlIGl0IVxyXG4gICAgICAgICAgICAgICAgLy8gVE9ET1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICByb290LnRyYXZlcnNlKG5vZGUudXBkYXRlKTtcclxuICAgICAgICAgICAgcm9vdC50cmF2ZXJzZShub2RlLmJvZHkpO1xyXG4gICAgICAgICAgICByb290LnBvcENvbnRleHQoKTtcclxuICAgICAgICAgICAgcmV0dXJuIHdhbGsuVmlzaXRvck9wdGlvbi5Ta2lwO1xyXG4gICAgICAgIH0sXHJcblxyXG4gICAgICAgIElmU3RhdGVtZW50OiAoZnVuY3Rpb24oKSB7XHJcblxyXG4gICAgICAgICAgICB2YXIgY19ldmFsdWF0ZSA9IGZ1bmN0aW9uKGV4cCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuICEhZXhwO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24obm9kZSwgY3R4LCByb290KSB7XHJcbiAgICAgICAgICAgICAgICByb290LnRyYXZlcnNlKG5vZGUudGVzdCk7XHJcbiAgICAgICAgICAgICAgICB2YXIgdGVzdCA9IG5ldyBBbm5vdGF0aW9uKG5vZGUudGVzdCk7XHJcbiAgICAgICAgICAgICAgICBpZiAodGVzdC5oYXNTdGF0aWNWYWx1ZSgpKSB7IC8vIEdyZWF0ISBXZSBjYW4gZXZhbHVhdGUgaXQhXHJcbiAgICAgICAgICAgICAgICAgICAgLy9jb25zb2xlLmxvZyhcIlN0YXRpYyB2YWx1ZSBpbiBpZiB0ZXN0IVwiKTtcclxuICAgICAgICAgICAgICAgICAgICB2YXIgdGVzdFJlc3VsdCA9IGNfZXZhbHVhdGUodGVzdC5nZXRTdGF0aWNWYWx1ZSgpKTtcclxuICAgICAgICAgICAgICAgICAgICBpZighdGVzdFJlc3VsdCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAobm9kZS5hbHRlcm5hdGUpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByb290LnRyYXZlcnNlKG5vZGUuYWx0ZXJuYXRlKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBjb25zZXF1ZW50ID0gbmV3IEFubm90YXRpb24obm9kZS5jb25zZXF1ZW50KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc2VxdWVudC5lbGltaW5hdGUoKTtcclxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByb290LnRyYXZlcnNlKG5vZGUuY29uc2VxdWVudCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmKG5vZGUuYWx0ZXJuYXRlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgYWx0ZXJuYXRlID0gbmV3IEFubm90YXRpb24obm9kZS5hbHRlcm5hdGUpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYWx0ZXJuYXRlLmVsaW1pbmF0ZSgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB3YWxrLlZpc2l0b3JPcHRpb24uU2tpcDtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0oKSksXHJcblxyXG4gICAgICAgIFZhcmlhYmxlRGVjbGFyYXRpb246IGZ1bmN0aW9uKG5vZGUsIGN0eCkge1xyXG4gICAgICAgICAgICBjdHguaW5EZWNsYXJhdGlvbiA9IHRydWU7XHJcbiAgICAgICAgfSxcclxuXHJcblxyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIEBwYXJhbSB7T2JqZWN0fSBub2RlXHJcbiAgICAgICAgICogQHBhcmFtIHtDb250ZXh0fSBwYXJlbnRDb250ZXh0XHJcbiAgICAgICAgICogQHBhcmFtIHtUeXBlSW5mZXJlbmNlfSByb290XHJcbiAgICAgICAgICovXHJcbiAgICAgICAgRnVuY3Rpb25EZWNsYXJhdGlvbjogZnVuY3Rpb24obm9kZSwgcGFyZW50Q29udGV4dCwgcm9vdCkge1xyXG4gICAgICAgICAgICB2YXIgcmVzdWx0ID0gbmV3IEZ1bmN0aW9uQW5ub3RhdGlvbihub2RlKTtcclxuXHJcbiAgICAgICAgICAgIGlmIChub2RlLmlkLnR5cGUgIT0gU3ludGF4LklkZW50aWZpZXIpIHtcclxuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIkR5bmFtaWMgdmFyaWFibGUgbmFtZXMgYXJlIG5vdCB5ZXQgc3VwcG9ydGVkXCIpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHZhciBmdW5jdGlvbk5hbWUgPSBub2RlLmlkLm5hbWU7XHJcbiAgICAgICAgICAgIHZhciBmdW5jdGlvbkNvbnRleHQgPSByb290LmNyZWF0ZUNvbnRleHQobm9kZSwgcGFyZW50Q29udGV4dCwgZnVuY3Rpb25OYW1lKTtcclxuICAgICAgICAgICAgZnVuY3Rpb25Db250ZXh0LmRlY2xhcmVQYXJhbWV0ZXJzKG5vZGUucGFyYW1zKTtcclxuICAgICAgICAgICAgcm9vdC5wdXNoQ29udGV4dChmdW5jdGlvbkNvbnRleHQpO1xyXG4gICAgICAgICAgICBpZihmdW5jdGlvbkNvbnRleHQuc3RyKCkgIT0gcm9vdC5lbnRyeVBvaW50KSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gd2Fsay5WaXNpdG9yT3B0aW9uLlNraXA7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgdmFyIGV4aXRIYW5kbGVyID0ge1xyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIEBwYXJhbSBub2RlXHJcbiAgICAgICAgICogQHBhcmFtIHtDb250ZXh0fSBjdHhcclxuICAgICAgICAgKiBAcGFyYW0ge1R5cGVJbmZlcmVuY2V9IHJvb3RcclxuICAgICAgICAgKi9cclxuICAgICAgICBGdW5jdGlvbkRlY2xhcmF0aW9uOiBmdW5jdGlvbihub2RlLCBjdHgsIHJvb3QpIHtcclxuICAgICAgICAgICAgdmFyIHJlc3VsdCA9IG5ldyBGdW5jdGlvbkFubm90YXRpb24obm9kZSk7XHJcbiAgICAgICAgICAgIHZhciByZXR1cm5JbmZvID0gY3R4LmdldFJldHVybkluZm8oKTtcclxuICAgICAgICAgICAgcmVzdWx0LnNldFJldHVybkluZm8ocmV0dXJuSW5mbyB8fCB7IHR5cGU6IFRZUEVTLlVOREVGSU5FRCB9KTtcclxuICAgICAgICAgICAgcm9vdC5wb3BDb250ZXh0KCk7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBWYXJpYWJsZURlY2xhcmF0aW9uOiBmdW5jdGlvbihub2RlLCBjdHgpIHtcclxuICAgICAgICAgICAgY3R4LmluRGVjbGFyYXRpb24gPSBmYWxzZTtcclxuICAgICAgICB9LFxyXG4gICAgICAgIFZhcmlhYmxlRGVjbGFyYXRvcjogZnVuY3Rpb24obm9kZSwgY3R4KSB7XHJcbiAgICAgICAgICAgIHZhciByZXN1bHQgPSBuZXcgQW5ub3RhdGlvbihub2RlKTtcclxuXHJcbiAgICAgICAgICAgIGlmIChub2RlLmlkLnR5cGUgIT0gU3ludGF4LklkZW50aWZpZXIpIHtcclxuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIkR5bmFtaWMgdmFyaWFibGUgbmFtZXMgYXJlIG5vdCB5ZXQgc3VwcG9ydGVkXCIpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHZhciB2YXJpYWJsZU5hbWUgPSBub2RlLmlkLm5hbWU7XHJcbiAgICAgICAgICAgIGN0eC5kZWNsYXJlVmFyaWFibGUodmFyaWFibGVOYW1lLCB0cnVlLCByZXN1bHQpO1xyXG5cclxuICAgICAgICAgICAgaWYgKG5vZGUuaW5pdCkge1xyXG4gICAgICAgICAgICAgICAgdmFyIGluaXQgPSBjdHguY3JlYXRlVHlwZUluZm8obm9kZS5pbml0KTtcclxuICAgICAgICAgICAgICAgIHJlc3VsdC5jb3B5KGluaXQpO1xyXG4gICAgICAgICAgICAgICAgY3R4LnVwZGF0ZUV4cHJlc3Npb24odmFyaWFibGVOYW1lLCBpbml0KTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHJlc3VsdC5zZXRUeXBlKFRZUEVTLlVOREVGSU5FRCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgLy8gVE9ETzogcmVzdWx0LnNldFR5cGUoaW5pdC5nZXRUeXBlKCkpO1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgUmV0dXJuU3RhdGVtZW50OiBmdW5jdGlvbihub2RlLCBwYXJlbnQsIGN0eCkge1xyXG4gICAgICAgICAgICB2YXIgcmVzdWx0ID0gbmV3IEFubm90YXRpb24obm9kZSksXHJcbiAgICAgICAgICAgICAgICBhcmd1bWVudCA9IG5vZGUuYXJndW1lbnQgPyBjdHguY3JlYXRlVHlwZUluZm8obm9kZS5hcmd1bWVudCkgOiBudWxsO1xyXG5cclxuICAgICAgICAgICAgaWYgKGFyZ3VtZW50KSB7XHJcbiAgICAgICAgICAgICAgICByZXN1bHQuY29weShhcmd1bWVudCk7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICByZXN1bHQuc2V0VHlwZShUWVBFUy5VTkRFRklORUQpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGN0eC51cGRhdGVSZXR1cm5JbmZvKHJlc3VsdCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgIH1cclxuXHJcblxyXG5cclxuXHJcbiAgICB2YXIgZW50ZXJTdGF0ZW1lbnQgPSBmdW5jdGlvbiAobm9kZSwgcGFyZW50LCBjdHgpIHtcclxuICAgICAgICBzd2l0Y2ggKG5vZGUudHlwZSkge1xyXG4gICAgICAgICAgICBjYXNlIFN5bnRheC5Gb3JTdGF0ZW1lbnQ6XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gZW50ZXJIYW5kbGVyLkZvclN0YXRlbWVudChub2RlLCBjdHgsIHRoaXMpO1xyXG4gICAgICAgICAgICBjYXNlIFN5bnRheC5JZlN0YXRlbWVudDpcclxuICAgICAgICAgICAgICAgIHJldHVybiBlbnRlckhhbmRsZXIuSWZTdGF0ZW1lbnQobm9kZSwgY3R4LCB0aGlzKTtcclxuICAgICAgICAgICAgY2FzZSBTeW50YXguVmFyaWFibGVEZWNsYXJhdGlvbjpcclxuICAgICAgICAgICAgICAgIHJldHVybiBlbnRlckhhbmRsZXIuVmFyaWFibGVEZWNsYXJhdGlvbihub2RlLCBjdHgpO1xyXG4gICAgICAgICAgICBjYXNlIFN5bnRheC5GdW5jdGlvbkRlY2xhcmF0aW9uOlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGVudGVySGFuZGxlci5GdW5jdGlvbkRlY2xhcmF0aW9uKG5vZGUsIGN0eCwgdGhpcyk7XHJcblxyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm47XHJcblxyXG5cclxuICAgIH07XHJcblxyXG4gICAgdmFyIGV4aXRTdGF0ZW1lbnQgPSBmdW5jdGlvbiAobm9kZSwgcGFyZW50LCBjdHgpIHtcclxuXHJcbiAgICAgICAgc3dpdGNoIChub2RlLnR5cGUpIHtcclxuICAgICAgICAgICAgY2FzZSBTeW50YXguRXhwcmVzc2lvblN0YXRlbWVudDpcclxuICAgICAgICAgICAgICAgIHZhciByZXN1bHQgPSBuZXcgQW5ub3RhdGlvbihub2RlKSxcclxuICAgICAgICAgICAgICAgICAgICBleHByZXNzaW9uID0gbmV3IEFubm90YXRpb24obm9kZS5leHByZXNzaW9uKTtcclxuXHJcbiAgICAgICAgICAgICAgICByZXN1bHQuY29weShleHByZXNzaW9uKTtcclxuXHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSBTeW50YXguQmxvY2tTdGF0ZW1lbnQ6XHJcbiAgICAgICAgICAgICAgICBsb2cobm9kZS50eXBlICsgXCIgaXMgbm90IGhhbmRsZSB5ZXQuXCIpO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgU3ludGF4LkJyZWFrU3RhdGVtZW50OlxyXG4gICAgICAgICAgICAgICAgbG9nKG5vZGUudHlwZSArIFwiIGlzIG5vdCBoYW5kbGUgeWV0LlwiKTtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIFN5bnRheC5DYXRjaENsYXVzZTpcclxuICAgICAgICAgICAgICAgIGxvZyhub2RlLnR5cGUgKyBcIiBpcyBub3QgaGFuZGxlIHlldC5cIik7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSBTeW50YXguQ29udGludWVTdGF0ZW1lbnQ6XHJcbiAgICAgICAgICAgICAgICBsb2cobm9kZS50eXBlICsgXCIgaXMgbm90IGhhbmRsZSB5ZXQuXCIpO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgU3ludGF4LkRpcmVjdGl2ZVN0YXRlbWVudDpcclxuICAgICAgICAgICAgICAgIGxvZyhub2RlLnR5cGUgKyBcIiBpcyBub3QgaGFuZGxlIHlldC5cIik7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSBTeW50YXguRG9XaGlsZVN0YXRlbWVudDpcclxuICAgICAgICAgICAgICAgIGxvZyhub2RlLnR5cGUgKyBcIiBpcyBub3QgaGFuZGxlIHlldC5cIik7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSBTeW50YXguRGVidWdnZXJTdGF0ZW1lbnQ6XHJcbiAgICAgICAgICAgICAgICBsb2cobm9kZS50eXBlICsgXCIgaXMgbm90IGhhbmRsZSB5ZXQuXCIpO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgU3ludGF4LkVtcHR5U3RhdGVtZW50OlxyXG4gICAgICAgICAgICAgICAgbG9nKG5vZGUudHlwZSArIFwiIGlzIG5vdCBoYW5kbGUgeWV0LlwiKTtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIFN5bnRheC5Gb3JTdGF0ZW1lbnQ6XHJcbiAgICAgICAgICAgICAgICBsb2cobm9kZS50eXBlICsgXCIgaXMgbm90IGhhbmRsZSB5ZXQuXCIpO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgU3ludGF4LkZvckluU3RhdGVtZW50OlxyXG4gICAgICAgICAgICAgICAgbG9nKG5vZGUudHlwZSArIFwiIGlzIG5vdCBoYW5kbGUgeWV0LlwiKTtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIFN5bnRheC5GdW5jdGlvbkRlY2xhcmF0aW9uOlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGV4aXRIYW5kbGVyLkZ1bmN0aW9uRGVjbGFyYXRpb24obm9kZSwgY3R4LCB0aGlzKTtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIFN5bnRheC5JZlN0YXRlbWVudDpcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIFN5bnRheC5MYWJlbGVkU3RhdGVtZW50OlxyXG4gICAgICAgICAgICAgICAgbG9nKG5vZGUudHlwZSArIFwiIGlzIG5vdCBoYW5kbGUgeWV0LlwiKTtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIFN5bnRheC5Qcm9ncmFtOlxyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgU3ludGF4LlJldHVyblN0YXRlbWVudDpcclxuICAgICAgICAgICAgICAgIHJldHVybiBleGl0SGFuZGxlci5SZXR1cm5TdGF0ZW1lbnQobm9kZSwgcGFyZW50LCBjdHgpO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgU3ludGF4LlN3aXRjaFN0YXRlbWVudDpcclxuICAgICAgICAgICAgICAgIGxvZyhub2RlLnR5cGUgKyBcIiBpcyBub3QgaGFuZGxlIHlldC5cIik7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSBTeW50YXguU3dpdGNoQ2FzZTpcclxuICAgICAgICAgICAgICAgIGxvZyhub2RlLnR5cGUgKyBcIiBpcyBub3QgaGFuZGxlIHlldC5cIik7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSBTeW50YXguVGhyb3dTdGF0ZW1lbnQ6XHJcbiAgICAgICAgICAgICAgICBsb2cobm9kZS50eXBlICsgXCIgaXMgbm90IGhhbmRsZSB5ZXQuXCIpO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgU3ludGF4LlRyeVN0YXRlbWVudDpcclxuICAgICAgICAgICAgICAgIGxvZyhub2RlLnR5cGUgKyBcIiBpcyBub3QgaGFuZGxlIHlldC5cIik7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSBTeW50YXguVmFyaWFibGVEZWNsYXJhdGlvbjpcclxuICAgICAgICAgICAgICAgIHJldHVybiBleGl0SGFuZGxlci5WYXJpYWJsZURlY2xhcmF0aW9uKG5vZGUsIGN0eCk7XHJcbiAgICAgICAgICAgIGNhc2UgU3ludGF4LlZhcmlhYmxlRGVjbGFyYXRvcjpcclxuICAgICAgICAgICAgICAgIGV4aXRIYW5kbGVyLlZhcmlhYmxlRGVjbGFyYXRvcihub2RlLCBjdHgpO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgU3ludGF4LldoaWxlU3RhdGVtZW50OlxyXG4gICAgICAgICAgICAgICAgbG9nKG5vZGUudHlwZSArIFwiIGlzIG5vdCBoYW5kbGUgeWV0LlwiKTtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIFN5bnRheC5XaXRoU3RhdGVtZW50OlxyXG4gICAgICAgICAgICAgICAgbG9nKG5vZGUudHlwZSArIFwiIGlzIG5vdCBoYW5kbGUgeWV0LlwiKTtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBkZWZhdWx0OlxyXG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdVbmtub3duIG5vZGUgdHlwZTogJyArIG5vZGUudHlwZSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgIH07XHJcblxyXG4gICAgbnMuZW50ZXJTdGF0ZW1lbnQgPSBlbnRlclN0YXRlbWVudDtcclxuICAgIG5zLmV4aXRTdGF0ZW1lbnQgPSBleGl0U3RhdGVtZW50O1xyXG59KGV4cG9ydHMpKTtcclxuIiwiKGZ1bmN0aW9uKG5zKXtcclxuXHJcbiAgICB2YXIgU2hhZGUgPSByZXF1aXJlKFwiLi4vLi4vLi4vaW50ZXJmYWNlcy5qc1wiKSxcclxuICAgICAgICBUWVBFUyA9IFNoYWRlLlRZUEVTLFxyXG4gICAgICAgIEtJTkRTID0gU2hhZGUuT0JKRUNUX0tJTkRTLFxyXG4gICAgICAgIFRvb2xzID0gcmVxdWlyZShcIi4vdG9vbHMuanNcIik7XHJcblxyXG4gICAgdmFyIENvbG9yQ2xvc3VyZUluc3RhbmNlID0ge1xyXG4gICAgICAgIG11bHRpcGx5OiB7XHJcbiAgICAgICAgICAgIHR5cGU6IFRZUEVTLkZVTkNUSU9OLFxyXG4gICAgICAgICAgICBldmFsdWF0ZTogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IFRZUEVTLk9CSkVDVCxcclxuICAgICAgICAgICAgICAgICAgICBraW5kOiBLSU5EUy5DT0xPUl9DTE9TVVJFXHJcbiAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSxcclxuICAgICAgICBhZGQ6IHtcclxuICAgICAgICAgICAgdHlwZTogVFlQRVMuRlVOQ1RJT04sXHJcbiAgICAgICAgICAgIGV2YWx1YXRlOiBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogVFlQRVMuT0JKRUNULFxyXG4gICAgICAgICAgICAgICAgICAgIGtpbmQ6IEtJTkRTLkNPTE9SX0NMT1NVUkVcclxuICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9O1xyXG5cclxuICAgIFRvb2xzLmV4dGVuZChucywge1xyXG4gICAgICAgIGlkOiBcIkNvbG9yQ2xvc3VyZVwiLFxyXG4gICAgICAgIGtpbmQ6IEtJTkRTLkNPTE9SX0NMT1NVUkUsXHJcbiAgICAgICAgb2JqZWN0OiBudWxsLFxyXG4gICAgICAgIGluc3RhbmNlOiBDb2xvckNsb3N1cmVJbnN0YW5jZVxyXG4gICAgfSk7XHJcblxyXG5cclxufShleHBvcnRzKSk7XHJcbiIsIihmdW5jdGlvbiAobnMpIHtcclxuXHJcbiAgICB2YXIgb2JqZWN0cyA9IHtcclxuICAgICAgICBTaGFkZSA6IHJlcXVpcmUoXCIuL3NoYWRlLmpzXCIpLFxyXG4gICAgICAgIE1hdHJpeDQgOiByZXF1aXJlKFwiLi9tYXRyaXguanNcIiksXHJcbiAgICAgICAgTWF0aCA6IHJlcXVpcmUoXCIuL21hdGguanNcIiksXHJcbiAgICAgICAgVmVjMiA6IHJlcXVpcmUoXCIuL3ZlYzIuanNcIiksXHJcbiAgICAgICAgVmVjMyA6IHJlcXVpcmUoXCIuL3ZlYzMuanNcIiksXHJcbiAgICAgICAgQ29sb3I6IHJlcXVpcmUoXCIuL3ZlYzMuanNcIiksXHJcbiAgICAgICAgVmVjNCA6IHJlcXVpcmUoXCIuL3ZlYzQuanNcIiksXHJcbiAgICAgICAgU3lzdGVtOiByZXF1aXJlKFwiLi9zeXN0ZW0uanNcIiksXHJcbiAgICAgICAgQ29sb3JDbG9zdXJlOiByZXF1aXJlKFwiLi9jb2xvcmNsb3N1cmUuanNcIilcclxuICAgIH07XHJcblxyXG4gICAgZXhwb3J0cy5SZWdpc3RyeSA9IHtcclxuICAgICAgICBuYW1lOiBcIlR5cGVJbmZlcmVuY2VcIixcclxuICAgICAgICBnZXRCeU5hbWU6IGZ1bmN0aW9uKG5hbWUpIHtcclxuICAgICAgICAgICAgdmFyIHJlc3VsdCA9IG9iamVjdHNbbmFtZV07XHJcbiAgICAgICAgICAgIHJldHVybiByZXN1bHQgfHwgbnVsbDtcclxuICAgICAgICB9LFxyXG4gICAgICAgIGdldEluc3RhbmNlRm9yS2luZDogZnVuY3Rpb24oa2luZCkge1xyXG4gICAgICAgICAgICBmb3IodmFyIG9iaiBpbiBvYmplY3RzKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAob2JqZWN0c1tvYmpdLmtpbmQgPT0ga2luZCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBvYmplY3RzW29ial0uaW5zdGFuY2U7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxufShleHBvcnRzKSk7XHJcbiIsIihmdW5jdGlvbiAobnMpIHtcclxuXHJcbiAgICB2YXIgU2hhZGUgPSByZXF1aXJlKFwiLi4vLi4vLi4vaW50ZXJmYWNlcy5qc1wiKSxcclxuICAgICAgICBUWVBFUyA9IFNoYWRlLlRZUEVTLFxyXG4gICAgICAgIEJhc2UgPSByZXF1aXJlKFwiLi4vLi4vLi4vYmFzZS9pbmRleC5qc1wiKSxcclxuICAgICAgICBUb29scyA9IHJlcXVpcmUoXCIuL3Rvb2xzLmpzXCIpO1xyXG5cclxuXHJcbiAgICB2YXIgZXZhbHVhdGVNZXRob2QgPSBmdW5jdGlvbiAobmFtZSwgcGFyYW1Db3VudCwgcmV0dXJuVHlwZSkge1xyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIEBwYXJhbSB7QW5ub3RhdGlvbn0gcmVzdWx0XHJcbiAgICAgICAgICogQHBhcmFtIHtBcnJheS48QW5ub3RhdGlvbj59IGFyZ3NcclxuICAgICAgICAgKiBAcGFyYW0ge0NvbnRleHR9IGN0eFxyXG4gICAgICAgICAqL1xyXG4gICAgICAgIHJldHVybiBmdW5jdGlvbiAocmVzdWx0LCBhcmdzLCBjdHgpIHtcclxuICAgICAgICAgICAgaWYgKHBhcmFtQ291bnQgIT0gLTEpIHsgLy8gQXJiaXRyYXJ5IG51bWJlciBvZiBhcmd1bWVudHNcclxuICAgICAgICAgICAgICAgIGlmICghYXJncyB8fCBhcmdzLmxlbmd0aCAhPSBwYXJhbUNvdW50KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiSW52YWxpZCBudW1iZXIgb2YgcGFyYW1ldGVycyBmb3IgTWF0aC5cIiArIG5hbWUgKyBcIiwgZXhwZWN0ZWQgXCIgKyBwYXJhbUNvdW50KTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgdmFyIGFyZ0FycmF5ID0gW107XHJcbiAgICAgICAgICAgIHZhciBpc1N0YXRpYyA9IHRydWU7XHJcbiAgICAgICAgICAgIGFyZ3MuZm9yRWFjaChmdW5jdGlvbiAocGFyYW0sIGluZGV4KSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoIXBhcmFtLmNhbk51bWJlcigpKVxyXG4gICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIlBhcmFtZXRlciBcIiArIGluZGV4ICsgXCIgaGFzIGludmFsaWQgdHlwZSBmb3IgTWF0aC5cIiArIG5hbWUgKyBcIiwgZXhwZWN0ZWQgJ251bWJlcicsIGJ1dCBnb3QgXCIgKyBwYXJhbS5nZXRUeXBlKCkpO1xyXG4gICAgICAgICAgICAgICAgaXNTdGF0aWMgPSBpc1N0YXRpYyAmJiBwYXJhbS5oYXNTdGF0aWNWYWx1ZSgpO1xyXG4gICAgICAgICAgICAgICAgaWYgKGlzU3RhdGljKVxyXG4gICAgICAgICAgICAgICAgICAgIGFyZ0FycmF5LnB1c2gocGFyYW0uZ2V0U3RhdGljVmFsdWUoKSk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB2YXIgdHlwZUluZm8gPSB7XHJcbiAgICAgICAgICAgICAgICB0eXBlOiByZXR1cm5UeXBlIHx8IFRZUEVTLk5VTUJFUlxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmIChpc1N0YXRpYykge1xyXG4gICAgICAgICAgICAgICAgdHlwZUluZm8uc3RhdGljVmFsdWUgPSBNYXRoW25hbWVdLmFwcGx5KHVuZGVmaW5lZCwgYXJnQXJyYXkpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHJldHVybiB0eXBlSW5mbztcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgdmFyIE1hdGhPYmplY3QgPSB7XHJcbiAgICAgICAgcmFuZG9tOiB7XHJcbiAgICAgICAgICAgIHR5cGU6IFRZUEVTLkZVTkNUSU9OLFxyXG4gICAgICAgICAgICBldmFsdWF0ZTogZnVuY3Rpb24obm9kZSwgYXJncykge1xyXG4gICAgICAgICAgICAgICAgaWYgKGFyZ3MubGVuZ3RoKVxyXG4gICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIk1hdGgucmFuZG9tIGhhcyBubyBwYXJhbWV0ZXJzLlwiKTtcclxuICAgICAgICAgICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogVFlQRVMuTlVNQkVSXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9LFxyXG4gICAgICAgIGFiczoge1xyXG4gICAgICAgICAgICB0eXBlOiBUWVBFUy5GVU5DVElPTixcclxuICAgICAgICAgICAgZXZhbHVhdGU6IGZ1bmN0aW9uKHJlc3VsdCwgYXJncykge1xyXG4gICAgICAgICAgICAgICAgVG9vbHMuY2hlY2tQYXJhbUNvdW50KHJlc3VsdC5ub2RlLCBcIk1hdGguYWJzXCIsIFsxXSwgYXJncy5sZW5ndGgpO1xyXG4gICAgICAgICAgICAgICAgdmFyIHR5cGVJbmZvID0ge307XHJcbiAgICAgICAgICAgICAgICBzd2l0Y2goYXJnc1swXS5nZXRUeXBlKCkpIHtcclxuICAgICAgICAgICAgICAgICAgICBjYXNlIFRZUEVTLk5VTUJFUjpcclxuICAgICAgICAgICAgICAgICAgICBjYXNlIFRZUEVTLklOVDpcclxuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZUluZm8udHlwZSA9IGFyZ3NbMF0uZ2V0VHlwZSgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OlxyXG4gICAgICAgICAgICAgICAgICAgICAgICBTaGFkZS50aHJvd0Vycm9yKHJlc3VsdC5ub2RlLCBcIkludmFsaWRUeXBlIGZvciBNYXRoLmFic1wiKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIHJldHVybiB0eXBlSW5mbztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH07XHJcblxyXG4gICAgdmFyIE1hdGhDb25zdGFudHMgPSBbXCJFXCIsIFwiUElcIiwgXCJMTjJcIiwgXCJMT0cyRVwiLCBcIkxPRzEwRVwiLCBcIlBJXCIsIFwiU1FSVDFfMlwiLCBcIlNRUlQyXCJdO1xyXG4gICAgdmFyIE9uZVBhcmFtZXRlck51bWJlck1ldGhvZHMgPSBbXCJhY29zXCIsIFwiYXNpblwiLCBcImF0YW5cIiwgXCJjb3NcIiwgXCJleHBcIiwgXCJsb2dcIiwgXCJyb3VuZFwiLCBcInNpblwiLCBcInNxcnRcIiwgXCJ0YW5cIl07XHJcbiAgICB2YXIgT25lUGFyYW1ldGVySW50TWV0aG9kcyA9IFtcImNlaWxcIiwgXCJmbG9vclwiXTtcclxuICAgIHZhciBUd29QYXJhbWV0ZXJOdW1iZXJNZXRob2RzID0gW1wiYXRhbjJcIiwgXCJwb3dcIl07XHJcbiAgICB2YXIgQXJiaXRyYXJ5UGFyYW1ldGVyTnVtYmVyTWV0aG9kcyA9IFtcIm1heFwiLCBcIm1pblwiXTtcclxuXHJcbiAgICBNYXRoQ29uc3RhbnRzLmZvckVhY2goZnVuY3Rpb24gKGNvbnN0YW50KSB7XHJcbiAgICAgICAgTWF0aE9iamVjdFtjb25zdGFudF0gPSB7IHR5cGU6IFRZUEVTLk5VTUJFUiwgc3RhdGljVmFsdWU6IE1hdGhbY29uc3RhbnRdIH07XHJcbiAgICB9KTtcclxuXHJcbiAgICBPbmVQYXJhbWV0ZXJOdW1iZXJNZXRob2RzLmZvckVhY2goZnVuY3Rpb24gKG1ldGhvZCkge1xyXG4gICAgICAgIE1hdGhPYmplY3RbbWV0aG9kXSA9IHsgdHlwZTogVFlQRVMuRlVOQ1RJT04sIGV2YWx1YXRlOiBldmFsdWF0ZU1ldGhvZChtZXRob2QsIDEpIH07XHJcbiAgICB9KTtcclxuXHJcbiAgICBUd29QYXJhbWV0ZXJOdW1iZXJNZXRob2RzLmZvckVhY2goZnVuY3Rpb24gKG1ldGhvZCkge1xyXG4gICAgICAgIE1hdGhPYmplY3RbbWV0aG9kXSA9IHsgdHlwZTogVFlQRVMuRlVOQ1RJT04sIGV2YWx1YXRlOiBldmFsdWF0ZU1ldGhvZChtZXRob2QsIDIpIH07XHJcbiAgICB9KTtcclxuXHJcbiAgICBPbmVQYXJhbWV0ZXJJbnRNZXRob2RzLmZvckVhY2goZnVuY3Rpb24gKG1ldGhvZCkge1xyXG4gICAgICAgIE1hdGhPYmplY3RbbWV0aG9kXSA9IHsgdHlwZTogVFlQRVMuRlVOQ1RJT04sIGV2YWx1YXRlOiBldmFsdWF0ZU1ldGhvZChtZXRob2QsIDEsIFRZUEVTLklOVCkgfTtcclxuICAgIH0pO1xyXG5cclxuICAgIEFyYml0cmFyeVBhcmFtZXRlck51bWJlck1ldGhvZHMuZm9yRWFjaChmdW5jdGlvbiAobWV0aG9kKSB7XHJcbiAgICAgICAgTWF0aE9iamVjdFttZXRob2RdID0geyB0eXBlOiBUWVBFUy5GVU5DVElPTiwgZXZhbHVhdGU6IGV2YWx1YXRlTWV0aG9kKG1ldGhvZCwgLTEpIH07XHJcbiAgICB9KTtcclxuXHJcbiAgICBCYXNlLmV4dGVuZChucywge1xyXG4gICAgICAgIGlkOiBcIk1hdGhcIixcclxuICAgICAgICBvYmplY3Q6IHtcclxuICAgICAgICAgICAgY29uc3RydWN0b3I6IG51bGwsXHJcbiAgICAgICAgICAgIHN0YXRpYzogTWF0aE9iamVjdFxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgaW5zdGFuY2U6IE1hdGhPYmplY3RcclxuICAgIH0pO1xyXG5cclxuXHJcbn0oZXhwb3J0cykpO1xyXG4iLCIoZnVuY3Rpb24gKG5zKSB7XHJcblxyXG4gICAgdmFyIGludGVyZmFjZXMgPSByZXF1aXJlKFwiLi4vLi4vLi4vaW50ZXJmYWNlcy5qc1wiKSxcclxuICAgIFRvb2xzID0gcmVxdWlyZShcIi4vdG9vbHMuanNcIik7XHJcblxyXG4gICAgdmFyIFRZUEVTID0gaW50ZXJmYWNlcy5UWVBFUyxcclxuICAgICAgICBLSU5EUyA9IGludGVyZmFjZXMuT0JKRUNUX0tJTkRTO1xyXG5cclxuICAgIHZhciBNYXRyaXhJbnN0YW5jZSA9IHtcclxuICAgICAgICB0cmFuc2Zvcm1Qb2ludDoge1xyXG4gICAgICAgICAgICB0eXBlOiBUWVBFUy5VTkRFRklORUQsXHJcbiAgICAgICAgICAgIGV2YWx1YXRlOiBmdW5jdGlvbihyZXN1bHQsIGFyZ3MpIHtcclxuICAgICAgICAgICAgICAgIFRvb2xzLmNoZWNrUGFyYW1Db3VudChyZXN1bHQubm9kZSwgXCJNYXRyaXg6OnRyYW5zZm9ybVBvaW50XCIsIFsxLDJdLCBhcmdzLmxlbmd0aCk7XHJcbiAgICAgICAgICAgICAgICB2YXIgc291cmNlUG9pbnQgPSB0YXJnZXRQb2ludCA9IGFyZ3NbMF07XHJcbiAgICAgICAgICAgICAgICBpZiAoIShzb3VyY2VQb2ludC5pc09iamVjdCgpICYmIHNvdXJjZVBvaW50LmNhbk5vcm1hbCgpKSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIkZpcnN0IGFyZ3VtZW50IG9mIE1hdHJpeDo6dHJhbnNmb3JtUG9pbnQgbXVzdCBldmFsdWF0ZSB0byBhIHBvaW50LCBmb3VuZDogXCIgKyBzb3VyY2VQb2ludC5nZXRUeXBlU3RyaW5nKCkpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgVG9vbHMuZXh0ZW5kKG5zLCB7XHJcbiAgICAgICAgaWQ6IFwiTWF0cml4NFwiLFxyXG4gICAgICAgIGtpbmQ6IFwibWF0cml4NFwiLFxyXG4gICAgICAgIG9iamVjdDoge1xyXG4gICAgICAgICAgICBjb25zdHJ1Y3RvcjogbnVsbCxcclxuICAgICAgICAgICAgc3RhdGljOiBudWxsXHJcbiAgICAgICAgfSxcclxuICAgICAgICBpbnN0YW5jZTogTWF0cml4SW5zdGFuY2VcclxuICAgIH0pO1xyXG5cclxufShleHBvcnRzKSk7XHJcbiIsIihmdW5jdGlvbihucyl7XHJcblxyXG4gICAgdmFyIFNoYWRlID0gcmVxdWlyZShcIi4uLy4uLy4uL2ludGVyZmFjZXMuanNcIiksXHJcbiAgICAgICAgVFlQRVMgPSBTaGFkZS5UWVBFUyxcclxuICAgICAgICBLSU5EUyA9IFNoYWRlLk9CSkVDVF9LSU5EUyxcclxuICAgICAgICBCYXNlID0gcmVxdWlyZShcIi4uLy4uLy4uL2Jhc2UvaW5kZXguanNcIiksXHJcbiAgICAgICAgVG9vbHMgPSByZXF1aXJlKFwiLi90b29scy5qc1wiKTtcclxuXHJcbiAgICB2YXIgU2hhZGVPYmplY3QgPSB7XHJcbiAgICAgICAgZGlmZnVzZToge1xyXG4gICAgICAgICAgICB0eXBlOiBUWVBFUy5GVU5DVElPTixcclxuICAgICAgICAgICAgZXZhbHVhdGU6IGZ1bmN0aW9uKHJlc3VsdCwgYXJncywgY3R4KSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoYXJncy5sZW5ndGggPCAxKVxyXG4gICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIlNoYWRlLmRpZmZ1c2UgZXhwZWN0cyBhdCBsZWFzdCAxIHBhcmFtZXRlci5cIilcclxuICAgICAgICAgICAgICAgIHZhciBub3JtYWwgPSBhcmdzWzBdO1xyXG4gICAgICAgICAgICAgICAgaWYoIShub3JtYWwgJiYgbm9ybWFsLmNhbk5vcm1hbCgpKSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIkZpcnN0IGFyZ3VtZW50IG9mIFNoYWRlLmRpZmZ1c2UgbXVzdCBldmFsdWF0ZSB0byBhIG5vcm1hbFwiKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGlmIChhcmdzLmxlbmd0aCA+IDEpIHtcclxuICAgICAgICAgICAgICAgICAgICB2YXIgY29sb3IgPSBhcmdzWzFdO1xyXG4gICAgICAgICAgICAgICAgICAgIC8vY29uc29sZS5sb2coXCJDb2xvcjogXCIsIGNvbG9yLnN0cigpLCBjb2xvci5nZXRUeXBlKGN0eCkpO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmKCFjb2xvci5jYW5Db2xvcigpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIlNlY29uZCBhcmd1bWVudCBvZiBTaGFkZS5kaWZmdXNlIG11c3QgZXZhbHVhdGUgdG8gYSBjb2xvci4gRm91bmQ6IFwiICsgY29sb3Iuc3RyKCkpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogVFlQRVMuT0JKRUNULFxyXG4gICAgICAgICAgICAgICAgICAgIGtpbmQ6IEtJTkRTLkNPTE9SX0NMT1NVUkVcclxuICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9LFxyXG4gICAgICAgIHBob25nOiB7XHJcbiAgICAgICAgICAgIHR5cGU6IFRZUEVTLkZVTkNUSU9OLFxyXG4gICAgICAgICAgICBldmFsdWF0ZTogZnVuY3Rpb24ocmVzdWx0LCBhcmdzLCBjdHgpIHtcclxuICAgICAgICAgICAgICAgIGlmIChhcmdzLmxlbmd0aCA8IDEpXHJcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiU2hhZGUucGhvbmcgZXhwZWN0cyBhdCBsZWFzdCAxIHBhcmFtZXRlci5cIilcclxuICAgICAgICAgICAgICAgIHZhciBub3JtYWwgPSBhcmdzWzBdO1xyXG4gICAgICAgICAgICAgICAgaWYoIShub3JtYWwgJiYgbm9ybWFsLmNhbk5vcm1hbCgpKSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIkZpcnN0IGFyZ3VtZW50IG9mIFNoYWRlLnBob25nIG11c3QgZXZhbHVhdGUgdG8gYSBub3JtYWxcIik7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBpZiAoYXJncy5sZW5ndGggPiAxKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIHNoaW5pbmVzcyA9IGFyZ3NbMV07XHJcbiAgICAgICAgICAgICAgICAgICAgLy9jb25zb2xlLmxvZyhcIkNvbG9yOiBcIiwgY29sb3Iuc3RyKCksIGNvbG9yLmdldFR5cGUoY3R4KSk7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYoIXNoaW5pbmVzcy5jYW5OdW1iZXIoKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJTZWNvbmQgYXJndW1lbnQgb2YgU2hhZGUucGhvbmcgbXVzdCBldmFsdWF0ZSB0byBhIG51bWJlci4gRm91bmQ6IFwiICsgY29sb3Iuc3RyKCkpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogVFlQRVMuT0JKRUNULFxyXG4gICAgICAgICAgICAgICAgICAgIGtpbmQ6IEtJTkRTLkNPTE9SX0NMT1NVUkVcclxuICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9LFxyXG4gICAgICAgIGNsYW1wOiB7XHJcbiAgICAgICAgICAgIHR5cGU6IFRZUEVTLkZVTkNUSU9OLFxyXG4gICAgICAgICAgICBldmFsdWF0ZTogZnVuY3Rpb24ocmVzdWx0LCBhcmdzKSB7XHJcbiAgICAgICAgICAgICAgICBUb29scy5jaGVja1BhcmFtQ291bnQocmVzdWx0Lm5vZGUsIFwiU2hhZGUuY2xhbXBcIiwgWzNdLCBhcmdzLmxlbmd0aCk7XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKGFyZ3MuZXZlcnkoZnVuY3Rpb24oZSkgeyByZXR1cm4gZS5jYW5OdW1iZXIoKTsgfSkpIHtcclxuICAgICAgICAgICAgICAgICAgICB2YXIgdHlwZUluZm8gPSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6IFRZUEVTLk5VTUJFUlxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBpZiAoVG9vbHMuYWxsQXJndW1lbnRzQXJlU3RhdGljKGFyZ3MpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBjYWxsQXJncyA9IGFyZ3MubWFwKGZ1bmN0aW9uKGEpIHtyZXR1cm4gYS5nZXRTdGF0aWNWYWx1ZSgpOyB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZUluZm8uc3RhdGljVmFsdWUgPSBTaGFkZS5TaGFkZS5jbGFtcC5hcHBseShudWxsLCBjYWxsQXJncyk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0eXBlSW5mbztcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIFNoYWRlLnRocm93RXJyb3IocmVzdWx0Lm5vZGUsIFwiU2hhZGUuY2xhbXAgbm90IHN1cHBvcnRlZCB3aXRoIGFyZ3VtZW50IHR5cGVzOiBcIiArIGFyZ3MubWFwKGZ1bmN0aW9uKGFyZykgeyByZXR1cm4gYXJnLmdldFR5cGVTdHJpbmcoKTsgfSkuam9pbihcIiwgXCIpKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgc21vb3Roc3RlcDoge1xyXG4gICAgICAgICAgICB0eXBlOiBUWVBFUy5GVU5DVElPTixcclxuICAgICAgICAgICAgZXZhbHVhdGU6IGZ1bmN0aW9uKHJlc3VsdCwgYXJncywgY3R4KSB7XHJcbiAgICAgICAgICAgICAgICBUb29scy5jaGVja1BhcmFtQ291bnQocmVzdWx0Lm5vZGUsIFwiU2hhZGUuc21vb3Roc3RlcFwiLCBbM10sIGFyZ3MubGVuZ3RoKTtcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAoYXJncy5ldmVyeShmdW5jdGlvbihlKSB7IHJldHVybiBlLmNhbk51bWJlcigpOyB9KSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciB0eXBlSW5mbyA9IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogVFlQRVMuTlVNQkVSXHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChUb29scy5hbGxBcmd1bWVudHNBcmVTdGF0aWMoYXJncykpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGNhbGxBcmdzID0gYXJncy5tYXAoZnVuY3Rpb24oYSkge3JldHVybiBhLmdldFN0YXRpY1ZhbHVlKCk7IH0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlSW5mby5zdGF0aWNWYWx1ZSA9IFNoYWRlLlNoYWRlLnNtb290aHN0ZXAuYXBwbHkobnVsbCwgY2FsbEFyZ3MpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHlwZUluZm87XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBTaGFkZS50aHJvd0Vycm9yKHJlc3VsdC5ub2RlLCBcIlNoYWRlLnNtb290aHN0ZXAgbm90IHN1cHBvcnRlZCB3aXRoIGFyZ3VtZW50IHR5cGVzOiBcIiArIGFyZ3MubWFwKGZ1bmN0aW9uKGFyZykgeyByZXR1cm4gYXJnLmdldFR5cGVTdHJpbmcoKTsgfSkuam9pbihcIiwgXCIpKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgc3RlcDoge1xyXG4gICAgICAgICAgICB0eXBlOiBUWVBFUy5GVU5DVElPTixcclxuICAgICAgICAgICAgZXZhbHVhdGU6IGZ1bmN0aW9uKHJlc3VsdCwgYXJncywgY3R4KSB7XHJcbiAgICAgICAgICAgICAgICBUb29scy5jaGVja1BhcmFtQ291bnQocmVzdWx0Lm5vZGUsIFwiU2hhZGUuc3RlcFwiLCBbMl0sIGFyZ3MubGVuZ3RoKTtcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAoYXJncy5ldmVyeShmdW5jdGlvbihlKSB7IHJldHVybiBlLmNhbk51bWJlcigpOyB9KSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciB0eXBlSW5mbyA9IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogVFlQRVMuTlVNQkVSXHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChUb29scy5hbGxBcmd1bWVudHNBcmVTdGF0aWMoYXJncykpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGNhbGxBcmdzID0gYXJncy5tYXAoZnVuY3Rpb24oYSkge3JldHVybiBhLmdldFN0YXRpY1ZhbHVlKCk7IH0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlSW5mby5zdGF0aWNWYWx1ZSA9IFNoYWRlLlNoYWRlLnN0ZXAuYXBwbHkobnVsbCwgY2FsbEFyZ3MpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHlwZUluZm87XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBTaGFkZS50aHJvd0Vycm9yKHJlc3VsdC5ub2RlLCBcIlNoYWRlLnN0ZXAgbm90IHN1cHBvcnRlZCB3aXRoIGFyZ3VtZW50IHR5cGVzOiBcIiArIGFyZ3MubWFwKGZ1bmN0aW9uKGFyZykgeyByZXR1cm4gYXJnLmdldFR5cGVTdHJpbmcoKTsgfSkuam9pbihcIiwgXCIpKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgZnJhY3Q6IHtcclxuICAgICAgICAgICAgdHlwZTogVFlQRVMuRlVOQ1RJT04sXHJcbiAgICAgICAgICAgIGV2YWx1YXRlOiBmdW5jdGlvbihyZXN1bHQsIGFyZ3MpIHtcclxuICAgICAgICAgICAgICAgIFRvb2xzLmNoZWNrUGFyYW1Db3VudChyZXN1bHQubm9kZSwgXCJTaGFkZS5mcmFjdFwiLCBbMV0sIGFyZ3MubGVuZ3RoKTtcclxuXHJcbiAgICAgICAgICAgICAgICB2YXIgeCA9IGFyZ3NbMF07XHJcbiAgICAgICAgICAgICAgICBpZiAoeC5jYW5OdW1iZXIoKSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciB0eXBlSW5mbyA9IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogVFlQRVMuTlVNQkVSXHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICBpZiAoeC5oYXNTdGF0aWNWYWx1ZSgpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGVJbmZvLnN0YXRpY1ZhbHVlID0gU2hhZGUuU2hhZGUuZnJhY3QoeC5nZXRTdGF0aWNWYWx1ZSgpKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHR5cGVJbmZvO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgU2hhZGUudGhyb3dFcnJvcihyZXN1bHQubm9kZSwgXCJTaGFkZS5mcmFjdCBub3Qgc3VwcG9ydGVkIHdpdGggYXJndW1lbnQgdHlwZXM6IFwiICsgYXJncy5tYXAoZnVuY3Rpb24oYXJnKSB7IHJldHVybiBhcmcuZ2V0VHlwZVN0cmluZygpOyB9KS5qb2luKFwiLCBcIikpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfTtcclxuXHJcbiAgICBCYXNlLmV4dGVuZChucywge1xyXG4gICAgICAgIGlkOiBcIlNoYWRlXCIsXHJcbiAgICAgICAgb2JqZWN0OiB7XHJcbiAgICAgICAgICAgIGNvbnN0cnVjdG9yOiBudWxsLFxyXG4gICAgICAgICAgICBzdGF0aWM6IFNoYWRlT2JqZWN0XHJcbiAgICAgICAgfSxcclxuICAgICAgICBpbnN0YW5jZTogbnVsbFxyXG4gICAgfSk7XHJcblxyXG59KGV4cG9ydHMpKTtcclxuIiwiKGZ1bmN0aW9uKG5zKXtcclxuXHJcbiAgICB2YXIgU2hhZGUgPSByZXF1aXJlKFwiLi4vLi4vLi4vaW50ZXJmYWNlcy5qc1wiKSxcclxuICAgICAgICBUWVBFUyA9IFNoYWRlLlRZUEVTLFxyXG4gICAgICAgIEtJTkRTID0gU2hhZGUuT0JKRUNUX0tJTkRTLFxyXG4gICAgICAgIEJhc2UgPSByZXF1aXJlKFwiLi4vLi4vLi4vYmFzZS9pbmRleC5qc1wiKTtcclxuXHJcbiAgICB2YXIgU3lzdGVtT2JqZWN0ID0ge1xyXG4gICAgICAgIGNvb3Jkczoge1xyXG4gICAgICAgICAgICB0eXBlOiBUWVBFUy5PQkpFQ1QsXHJcbiAgICAgICAgICAgIGtpbmQ6IEtJTkRTLkZMT0FUM1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgbm9ybWFsaXplZENvb3Jkczoge1xyXG4gICAgICAgICAgICB0eXBlOiBUWVBFUy5PQkpFQ1QsXHJcbiAgICAgICAgICAgIGtpbmQ6IEtJTkRTLkZMT0FUM1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgaGVpZ2h0OiB7XHJcbiAgICAgICAgICAgIHR5cGU6IFRZUEVTLklOVFxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgd2lkdGg6IHtcclxuICAgICAgICAgICAgdHlwZTogVFlQRVMuSU5UXHJcbiAgICAgICAgfVxyXG5cclxuICAgIH07XHJcblxyXG4gICAgQmFzZS5leHRlbmQobnMsIHtcclxuICAgICAgICBpZDogXCJTeXN0ZW1cIixcclxuICAgICAgICBvYmplY3Q6IHtcclxuICAgICAgICAgICAgY29uc3RydWN0b3I6IG51bGwsXHJcbiAgICAgICAgICAgIHN0YXRpYzogU3lzdGVtT2JqZWN0XHJcbiAgICAgICAgfSxcclxuICAgICAgICBpbnN0YW5jZTogbnVsbFxyXG4gICAgfSk7XHJcblxyXG59KGV4cG9ydHMpKTtcclxuIiwiKGZ1bmN0aW9uKG5zKXtcclxuICAgIHZhciBCYXNlID0gcmVxdWlyZShcIi4uLy4uLy4uL2Jhc2UvaW5kZXguanNcIik7XHJcbiAgICB2YXIgU2hhZGUgPSByZXF1aXJlKFwiLi4vLi4vLi4vaW50ZXJmYWNlcy5qc1wiKSxcclxuICAgICAgICBUWVBFUyA9IFNoYWRlLlRZUEVTLFxyXG4gICAgICAgIEtJTkRTID0gU2hhZGUuT0JKRUNUX0tJTkRTLFxyXG4gICAgICAgIFZlY0Jhc2UgPSByZXF1aXJlKFwiLi4vLi4vLi4vYmFzZS92ZWMuanNcIik7XHJcblxyXG4gICAgdmFyIGFsbEFyZ3VtZW50c0FyZVN0YXRpYyA9IGZ1bmN0aW9uIChhcmdzKSB7XHJcbiAgICAgICAgcmV0dXJuIGFyZ3MuZXZlcnkoZnVuY3Rpb24gKGFyZykge1xyXG4gICAgICAgICAgICByZXR1cm4gYXJnLmhhc1N0YXRpY1ZhbHVlKClcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICBucy5jaGVja1BhcmFtQ291bnQgPSBmdW5jdGlvbihub2RlLCBuYW1lLCBhbGxvd2VkLCBpcykge1xyXG4gICAgICAgIGlmIChhbGxvd2VkLmluZGV4T2YoaXMpID09IC0xKSB7XHJcbiAgICAgICAgICAgIFNoYWRlLnRocm93RXJyb3Iobm9kZSwgXCJJbnZhbGlkIG51bWJlciBvZiBwYXJhbWV0ZXJzIGZvciBcIiArIG5hbWUgKyBcIiwgZXhwZWN0ZWQgXCIgKyBhbGxvd2VkLmpvaW4oXCIgb3IgXCIpICsgXCIsIGZvdW5kOiBcIiArIGlzKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgbnMuc2luZ2xlQWNjZXNzb3IgPSBmdW5jdGlvbiAobmFtZSwgb2JqLCB2YWxpZEFyZ0NvdW50cywgc3RhdGljVmFsdWVGdW5jdGlvbikge1xyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgIHR5cGU6IFRZUEVTLkZVTkNUSU9OLFxyXG4gICAgICAgICAgICBldmFsdWF0ZTogZnVuY3Rpb24gKHJlc3VsdCwgYXJncywgY3R4LCBjYWxsT2JqZWN0KSB7XHJcbiAgICAgICAgICAgICAgICBucy5jaGVja1BhcmFtQ291bnQocmVzdWx0Lm5vZGUsIG5hbWUsIHZhbGlkQXJnQ291bnRzLCBhcmdzLmxlbmd0aCk7XHJcbiAgICAgICAgICAgICAgICB2YXIgdHlwZUluZm8gPSAgYXJncy5sZW5ndGggPyBvYmogOiB7IHR5cGU6IFRZUEVTLk5VTUJFUiB9O1xyXG5cclxuICAgICAgICAgICAgICAgIGlmIChzdGF0aWNWYWx1ZUZ1bmN0aW9uICYmIGNhbGxPYmplY3QuaGFzU3RhdGljVmFsdWUoKSAmJiBhcmdzLmV2ZXJ5KGZ1bmN0aW9uKGEpIHtyZXR1cm4gYS5oYXNTdGF0aWNWYWx1ZSgpOyB9KSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGVJbmZvLnN0YXRpY1ZhbHVlID0gc3RhdGljVmFsdWVGdW5jdGlvbihjYWxsT2JqZWN0LmdldFN0YXRpY1ZhbHVlKCksIGFyZ3MpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHR5cGVJbmZvO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfTtcclxuXHJcbiAgICBucy5leHRlbmQgPSBCYXNlLmV4dGVuZDtcclxuXHJcbiAgICB2YXIgVmVjID0ge1xyXG4gICAgICAgIFRZUEVTOiB7XHJcbiAgICAgICAgICAgIDE6IHsgdHlwZTogVFlQRVMuTlVNQkVSIH0sXHJcbiAgICAgICAgICAgIDI6IHsgdHlwZTogVFlQRVMuT0JKRUNULCBraW5kOiBLSU5EUy5GTE9BVDIgfSxcclxuICAgICAgICAgICAgMzogeyB0eXBlOiBUWVBFUy5PQkpFQ1QsIGtpbmQ6IEtJTkRTLkZMT0FUMyB9LFxyXG4gICAgICAgICAgICA0OiB7IHR5cGU6IFRZUEVTLk9CSkVDVCwga2luZDogS0lORFMuRkxPQVQ0IH0sXHJcbiAgICAgICAgICAgIGNvbG9yOiB7IHR5cGU6IFRZUEVTLk9CSkVDVCwga2luZDogS0lORFMuRkxPQVQzIH1cclxuICAgICAgICB9LFxyXG4gICAgICAgIGdldFR5cGU6IGZ1bmN0aW9uKGRlc3RWZWN0b3IsIGNvbG9yKXtcclxuICAgICAgICAgICAgaWYoZGVzdFZlY3RvciA9PSA0ICYmIGNvbG9yKVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIFZlYy5UWVBFUy5jb2xvcjtcclxuICAgICAgICAgICAgZWxzZVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIFZlYy5UWVBFU1tkZXN0VmVjdG9yXTtcclxuICAgICAgICB9LFxyXG4gICAgICAgIGdldFN0YXRpY1ZhbHVlOiBmdW5jdGlvbih0eXBlSW5mbywgbWV0aG9kTmFtZSwgYXJncywgY2FsbE9iamVjdCl7XHJcbiAgICAgICAgICAgIGlmKGNhbGxPYmplY3QuaGFzU3RhdGljVmFsdWUoKSAmJiBhbGxBcmd1bWVudHNBcmVTdGF0aWMoYXJncykpe1xyXG4gICAgICAgICAgICAgICAgdmFyIG9iamVjdCA9IGNhbGxPYmplY3QuZ2V0U3RhdGljVmFsdWUoKTtcclxuICAgICAgICAgICAgICAgIHZhciBjYWxsQXJncyA9IGFyZ3MubWFwKGZ1bmN0aW9uKGEpIHtyZXR1cm4gYS5nZXRTdGF0aWNWYWx1ZSgpOyB9KTtcclxuICAgICAgICAgICAgICAgIHZhciBtZXRob2QgPSBvYmplY3RbbWV0aG9kTmFtZV07XHJcbiAgICAgICAgICAgICAgICBpZihtZXRob2QpXHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZUluZm8uc3RhdGljVmFsdWUgPSBtZXRob2QuYXBwbHkob2JqZWN0LCBjYWxsQXJncyk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9LFxyXG4gICAgICAgIGNoZWNrVmVjQXJndW1lbnRzOiBmdW5jdGlvbihtZXRob2ROYW1lLCBjb2xvciwgdmVjU2l6ZSwgd2l0aEVtcHR5LCByZXN1bHQsIGFyZ3Mpe1xyXG4gICAgICAgICAgICB3aXRoRW1wdHkgPSAod2l0aEVtcHR5IHx8IHZlY1NpemUgPT0gMCk7XHJcbiAgICAgICAgICAgIGNvbG9yID0gY29sb3IgJiYgdmVjU2l6ZSA9PSA0O1xyXG4gICAgICAgICAgICB2YXIgYWxsb3dlZCA9IFtdO1xyXG4gICAgICAgICAgICBmb3IodmFyIGkgPSB3aXRoRW1wdHkgPyAwIDogMTsgaSA8PSB2ZWNTaXplOyArK2kpIGFsbG93ZWQucHVzaChpKTtcclxuICAgICAgICAgICAgbnMuY2hlY2tQYXJhbUNvdW50KHJlc3VsdC5ub2RlLCBtZXRob2ROYW1lLCBhbGxvd2VkLCBhcmdzLmxlbmd0aCk7XHJcblxyXG4gICAgICAgICAgICBpZih3aXRoRW1wdHkgJiYgYXJncy5sZW5ndGggPT0gMClcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuXHJcbiAgICAgICAgICAgIGlmKGFyZ3MubGVuZ3RoID09IDEgJiYgYXJnc1swXS5jYW5OdW1iZXIoKSlcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuXHJcbiAgICAgICAgICAgIHZhciBpZHggPSAwO1xyXG4gICAgICAgICAgICBmb3IodmFyIGkgPSAwOyBpZHggPCB2ZWNTaXplICYmIGkgPCBhcmdzLmxlbmd0aDsgKytpKXtcclxuICAgICAgICAgICAgICAgIHZhciBhcmc9IGFyZ3NbaV0sIGNudDtcclxuICAgICAgICAgICAgICAgIGlmKGFyZy5jYW5OdW1iZXIoKSkgY250ID0gMTtcclxuICAgICAgICAgICAgICAgIGVsc2UgaWYoYXJnLmlzT2ZLaW5kKEtJTkRTLkZMT0FUMikpIGNudCA9IDI7XHJcbiAgICAgICAgICAgICAgICBlbHNlIGlmKGFyZy5pc09mS2luZChLSU5EUy5GTE9BVDMpKSBjbnQgPSAzO1xyXG4gICAgICAgICAgICAgICAgZWxzZSBpZihhcmcuaXNPZktpbmQoS0lORFMuRkxPQVQ0KSkgY250ID0gNDtcclxuICAgICAgICAgICAgICAgIGVsc2UgU2hhZGUudGhyb3dFcnJvcihyZXN1bHQubm9kZSwgXCJJbmF2bGlkIHBhcmFtZXRlciBmb3IgXCIgKyBtZXRob2ROYW1lICsgXCIsIHR5cGUgaXMgbm90IHN1cHBvcnRlZFwiKTtcclxuICAgICAgICAgICAgICAgIC8vIFRPRE86IFByaW50IFR5cGU/XHJcbiAgICAgICAgICAgICAgICBpZHggKz0gY250O1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZihpZHggPCB2ZWNTaXplICYmICghY29sb3IgfHwgaWR4ICsgMSA8IHZlY1NpemUpKVxyXG4gICAgICAgICAgICAgICAgU2hhZGUudGhyb3dFcnJvcihyZXN1bHQubm9kZSwgXCJJbmF2bGlkIHBhcmFtZXRlcnMgZm9yIFwiICsgbWV0aG9kTmFtZSArIFwiLCBleHBlY3RlZCBcIiArIHZlY1NpemUgKyBcIiBzY2FsYXIgdmFsdWVzLCBnb3QgXCIgKyBpZHgpO1xyXG4gICAgICAgICAgICBlbHNlIGlmKGkgPCBhcmdzLmxlbmd0aCl7XHJcbiAgICAgICAgICAgICAgICBTaGFkZS50aHJvd0Vycm9yKHJlc3VsdC5ub2RlLCBcIkluYXZsaWQgcGFyYW1ldGVycyBmb3IgXCIgKyBtZXRob2ROYW1lICsgXCIsIHRvbyBtYW55IHBhcmFtZXRlcnNcIik7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9LFxyXG4gICAgICAgIHZlY0V2YWx1YXRlOiBmdW5jdGlvbihvYmplY3ROYW1lLCBtZXRob2ROYW1lLCBjb2xvciwgZGVzdFZlY1NpemUsIHNyY1ZlY1NpemUsIHJlc3VsdCwgYXJncywgY3R4LCBjYWxsT2JqZWN0KXtcclxuICAgICAgICAgICAgVmVjLmNoZWNrVmVjQXJndW1lbnRzKG9iamVjdE5hbWUgKyBcIi5cIiArIG1ldGhvZE5hbWUsIGNvbG9yLCBzcmNWZWNTaXplLCBmYWxzZSwgcmVzdWx0LCBhcmdzKTtcclxuXHJcbiAgICAgICAgICAgIHZhciB0eXBlSW5mbyA9IHt9O1xyXG4gICAgICAgICAgICBCYXNlLmV4dGVuZCh0eXBlSW5mbywgVmVjLmdldFR5cGUoZGVzdFZlY1NpemUsIGNvbG9yKSk7XHJcblxyXG4gICAgICAgICAgICBWZWMuZ2V0U3RhdGljVmFsdWUodHlwZUluZm8sIG1ldGhvZE5hbWUsIGFyZ3MsIGNhbGxPYmplY3QpO1xyXG4gICAgICAgICAgICByZXR1cm4gdHlwZUluZm87XHJcbiAgICAgICAgfSxcclxuXHJcbiAgICAgICAgb3B0aW9uYWxaZXJvRXZhbHVhdGU6IGZ1bmN0aW9uKG9iamVjdE5hbWUsIGNvbG9yLCBtZXRob2ROYW1lLCBkZXN0VmVjU2l6ZSwgemVyb0Rlc3RWZWNTaXplLCBzcmNWZWNTaXplLCByZXN1bHQsIGFyZ3MsIGN0eCwgY2FsbE9iamVjdCkge1xyXG4gICAgICAgICAgICB2YXIgcXVhbGlmaWVkTmFtZSA9IG9iamVjdE5hbWUgKyBcIi5cIiArIG1ldGhvZE5hbWU7XHJcbiAgICAgICAgICAgIHZhciB0eXBlSW5mbyA9IHt9O1xyXG5cclxuICAgICAgICAgICAgaWYoYXJncy5sZW5ndGggPT0gMCl7XHJcbiAgICAgICAgICAgICAgICBCYXNlLmV4dGVuZCh0eXBlSW5mbywgVmVjLmdldFR5cGUoemVyb0Rlc3RWZWNTaXplLCBjb2xvcikpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGVsc2V7XHJcbiAgICAgICAgICAgICAgICBWZWMuY2hlY2tWZWNBcmd1bWVudHMocXVhbGlmaWVkTmFtZSwgY29sb3IsIHNyY1ZlY1NpemUsIHRydWUsIHJlc3VsdCwgYXJncyk7XHJcbiAgICAgICAgICAgICAgICBCYXNlLmV4dGVuZCh0eXBlSW5mbywgVmVjLmdldFR5cGUoZGVzdFZlY1NpemUsIGNvbG9yKSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgVmVjLmdldFN0YXRpY1ZhbHVlKHR5cGVJbmZvLCBtZXRob2ROYW1lLCBhcmdzLCBjYWxsT2JqZWN0KTtcclxuXHJcbiAgICAgICAgICAgIHJldHVybiB0eXBlSW5mbztcclxuICAgICAgICB9LFxyXG5cclxuICAgICAgICBzd2l6emxlRXZhbHVhdGU6IGZ1bmN0aW9uKG9iamVjdE5hbWUsIGNvbG9yLCB2ZWNTaXplLCBzd2l6emxlLCB3aXRoU2V0dGVyLCByZXN1bHQsIGFyZ3MsIGN0eCwgY2FsbE9iamVjdCkge1xyXG4gICAgICAgICAgICBpZih3aXRoU2V0dGVyKXtcclxuICAgICAgICAgICAgICAgIHJldHVybiBWZWMub3B0aW9uYWxaZXJvRXZhbHVhdGUob2JqZWN0TmFtZSwgY29sb3IsIHN3aXp6bGUsIHZlY1NpemUsIHN3aXp6bGUubGVuZ3RoLCBzd2l6emxlLmxlbmd0aCxcclxuICAgICAgICAgICAgICAgICAgICByZXN1bHQsIGFyZ3MsIGN0eCwgY2FsbE9iamVjdCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZWxzZXtcclxuICAgICAgICAgICAgICAgIHJldHVybiBWZWMudmVjRXZhbHVhdGUob2JqZWN0TmFtZSwgc3dpenpsZSwgY29sb3IsIHN3aXp6bGUubGVuZ3RoLCAwLCByZXN1bHQsIGFyZ3MsIGN0eCwgY2FsbE9iamVjdCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9LFxyXG4gICAgICAgIGdldFN3aXp6bGVFdmFsdWF0ZTogZnVuY3Rpb24ob2JqZWN0TmFtZSwgY29sb3IsIHZlY1NpemUsIHN3aXp6bGUpe1xyXG4gICAgICAgICAgICB2YXIgaW5kaWNlcyA9IFtdLCB3aXRoU2V0dGVyID0gKHN3aXp6bGUubGVuZ3RoIDw9IHZlY1NpemUpO1xyXG4gICAgICAgICAgICBmb3IodmFyIGkgPSAwOyB3aXRoU2V0dGVyICYmIGkgPCBzd2l6emxlLmxlbmd0aDsgKytpKXtcclxuICAgICAgICAgICAgICAgIHZhciBpZHggPSBWZWNCYXNlLnN3aXp6bGVUb0luZGV4KHN3aXp6bGUuY2hhckF0KGkpKTtcclxuICAgICAgICAgICAgICAgIGlmKGluZGljZXNbaWR4XSlcclxuICAgICAgICAgICAgICAgICAgICB3aXRoU2V0dGVyID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICBlbHNlXHJcbiAgICAgICAgICAgICAgICAgICAgaW5kaWNlc1tpZHhdID0gdHJ1ZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICByZXR1cm4gIHtcclxuICAgICAgICAgICAgICAgIHR5cGU6IFRZUEVTLkZVTkNUSU9OLFxyXG4gICAgICAgICAgICAgICAgZXZhbHVhdGU6IFZlYy5zd2l6emxlRXZhbHVhdGUuYmluZChudWxsLCBvYmplY3ROYW1lLCBjb2xvciwgdmVjU2l6ZSwgc3dpenpsZSwgd2l0aFNldHRlcilcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgYXR0YWNoU3dpenpsZXM6IGZ1bmN0aW9uIChpbnN0YW5jZSwgb2JqZWN0TmFtZSwgY29sb3IsIHZlY0NvdW50KXtcclxuICAgICAgICAgICAgZm9yKHZhciBzID0gMDsgcyA8IFZlY0Jhc2Uuc3dpenpsZVNldHMubGVuZ3RoOyArK3Mpe1xyXG4gICAgICAgICAgICAgICAgZm9yKHZhciBjb3VudCA9IDE7IGNvdW50IDw9IDQ7ICsrY291bnQpe1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciBtYXggPSBNYXRoLnBvdyh2ZWNDb3VudCwgY291bnQpO1xyXG4gICAgICAgICAgICAgICAgICAgICBmb3IodmFyIGkgPSAwOyBpIDwgbWF4OyArK2kpe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgdmFsID0gaTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGtleSA9IFwiXCI7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvcih2YXIgIGogPSAwOyBqIDwgY291bnQ7ICsrail7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgaWR4ID0gdmFsICUgdmVjQ291bnQ7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YWwgPSBNYXRoLmZsb29yKHZhbCAvIHZlY0NvdW50KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGtleSs9IFZlY0Jhc2Uuc3dpenpsZVNldHNbc11baWR4XTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpbnN0YW5jZVtrZXldID0gVmVjLmdldFN3aXp6bGVFdmFsdWF0ZShvYmplY3ROYW1lLCBjb2xvciwgdmVjQ291bnQsIGtleSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSxcclxuICAgICAgICBhdHRhY2hWZWNNZXRob2RzOiBmdW5jdGlvbihpbnN0YW5jZSwgb2JqZWN0TmFtZSwgY29sb3IsIGRlc3RWZWNTaXplLCBzcmNWZWNTaXplLCBtZXRob2ROYW1lcyl7XHJcbiAgICAgICAgICAgIGZvcih2YXIgaSA9IDA7IGkgPCBtZXRob2ROYW1lcy5sZW5ndGg7ICsraSl7XHJcbiAgICAgICAgICAgICAgICB2YXIgbWV0aG9kTmFtZSA9IG1ldGhvZE5hbWVzW2ldO1xyXG4gICAgICAgICAgICAgICAgaW5zdGFuY2VbbWV0aG9kTmFtZV0gPSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogVFlQRVMuRlVOQ1RJT04sXHJcbiAgICAgICAgICAgICAgICAgICAgZXZhbHVhdGU6IFZlYy52ZWNFdmFsdWF0ZS5iaW5kKG51bGwsIG9iamVjdE5hbWUsIG1ldGhvZE5hbWUsIGNvbG9yLCBkZXN0VmVjU2l6ZSwgc3JjVmVjU2l6ZSlcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgY29uc3RydWN0b3JFdmFsdWF0ZTogZnVuY3Rpb24ob2JqZWN0TmFtZSwgY29sb3IsIHZlY1NpemUsIHJlc3VsdCwgYXJncywgY3R4KSB7XHJcbiAgICAgICAgICAgIFZlYy5jaGVja1ZlY0FyZ3VtZW50cyhvYmplY3ROYW1lLCBjb2xvciwgdmVjU2l6ZSwgdHJ1ZSwgcmVzdWx0LCBhcmdzKTtcclxuICAgICAgICAgICAgdmFyIGFyZ0FycmF5ID0gW107XHJcbiAgICAgICAgICAgIHZhciBpc1N0YXRpYyA9IHRydWU7XHJcbiAgICAgICAgICAgIGFyZ3MuZm9yRWFjaChmdW5jdGlvbiAocGFyYW0sIGluZGV4KSB7XHJcbiAgICAgICAgICAgICAgICBpc1N0YXRpYyA9IGlzU3RhdGljICYmIHBhcmFtLmhhc1N0YXRpY1ZhbHVlKCk7XHJcbiAgICAgICAgICAgICAgICBpZiAoaXNTdGF0aWMpXHJcbiAgICAgICAgICAgICAgICAgICAgYXJnQXJyYXkucHVzaChwYXJhbS5nZXRTdGF0aWNWYWx1ZSgpKTtcclxuICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICB2YXIgdHlwZUluZm8gPSBCYXNlLmV4dGVuZCh7fSxWZWMuZ2V0VHlwZSh2ZWNTaXplLCBjb2xvcikpO1xyXG5cclxuICAgICAgICAgICAgaWYgKGlzU3RhdGljKSB7XHJcbiAgICAgICAgICAgICAgICB2YXIgdiA9IG5ldyBTaGFkZVtvYmplY3ROYW1lXSgpO1xyXG4gICAgICAgICAgICAgICAgU2hhZGVbb2JqZWN0TmFtZV0uYXBwbHkodiwgYXJnQXJyYXkpO1xyXG4gICAgICAgICAgICAgICAgdHlwZUluZm8uc3RhdGljVmFsdWUgPSB2O1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHJldHVybiB0eXBlSW5mbztcclxuICAgICAgICB9XHJcblxyXG4gICAgfTtcclxuICAgIG5zLlZlYyA9IFZlYztcclxuICAgIG5zLmFsbEFyZ3VtZW50c0FyZVN0YXRpYyA9IGFsbEFyZ3VtZW50c0FyZVN0YXRpYztcclxuXHJcblxyXG59KGV4cG9ydHMpKTtcclxuIiwiKGZ1bmN0aW9uKG5zKXtcclxuXHJcbiAgICB2YXIgU2hhZGUgPSByZXF1aXJlKFwiLi4vLi4vLi4vaW50ZXJmYWNlcy5qc1wiKSxcclxuICAgICAgICBUWVBFUyA9IFNoYWRlLlRZUEVTLFxyXG4gICAgICAgIEtJTkRTID0gU2hhZGUuT0JKRUNUX0tJTkRTLFxyXG4gICAgICAgIFRvb2xzID0gcmVxdWlyZShcIi4vdG9vbHMuanNcIik7XHJcblxyXG4gICAgdmFyIFZlY3RvcjJDb25zdHJ1Y3RvciA9ICB7XHJcbiAgICAgICAgdHlwZTogVFlQRVMuT0JKRUNULFxyXG4gICAgICAgIGtpbmQ6IEtJTkRTLkZMT0FUMixcclxuICAgICAgICAvKipcclxuICAgICAgICAgKiBAcGFyYW0ge0Fubm90YXRpb259IHJlc3VsdFxyXG4gICAgICAgICAqIEBwYXJhbSB7QXJyYXkuPEFubm90YXRpb24+fSBhcmdzXHJcbiAgICAgICAgICogQHBhcmFtIHtDb250ZXh0fSBjdHhcclxuICAgICAgICAgKi9cclxuICAgICAgICBldmFsdWF0ZTogVG9vbHMuVmVjLmNvbnN0cnVjdG9yRXZhbHVhdGUuYmluZChudWxsLCBcIlZlYzJcIiwgZmFsc2UsIDIpXHJcbiAgICB9O1xyXG5cclxuICAgIHZhciBWZWN0b3IyU3RhdGljT2JqZWN0ID0ge1xyXG4gICAgfTtcclxuXHJcbiAgICB2YXIgVmVjdG9yMkluc3RhbmNlID0ge1xyXG4gICAgICAgIGxlbmd0aDoge1xyXG4gICAgICAgICAgICB0eXBlOiBUWVBFUy5GVU5DVElPTixcclxuICAgICAgICAgICAgZXZhbHVhdGU6IFRvb2xzLlZlYy5vcHRpb25hbFplcm9FdmFsdWF0ZS5iaW5kKG51bGwsXCJWZWMyXCIsIGZhbHNlLCBcImxlbmd0aFwiLCAyLCAxLCAxKVxyXG4gICAgICAgIH1cclxuICAgIH07XHJcbiAgICBUb29scy5WZWMuYXR0YWNoU3dpenpsZXMoVmVjdG9yMkluc3RhbmNlLCBcIlZlYzJcIiwgZmFsc2UsIDIpO1xyXG4gICAgVG9vbHMuVmVjLmF0dGFjaFZlY01ldGhvZHMoVmVjdG9yMkluc3RhbmNlLCBcIlZlYzJcIiwgZmFsc2UsIDIsIDIsIFsnYWRkJywgJ3N1YicsICdtdWwnLCAnZGl2JywgJ21vZCddKTtcclxuICAgIFRvb2xzLlZlYy5hdHRhY2hWZWNNZXRob2RzKFZlY3RvcjJJbnN0YW5jZSwgXCJWZWMyXCIsIGZhbHNlLCAxLCAyLCBbJ2RvdCddKTtcclxuICAgIFRvb2xzLlZlYy5hdHRhY2hWZWNNZXRob2RzKFZlY3RvcjJJbnN0YW5jZSwgXCJWZWMyXCIsIGZhbHNlLCAyLCAwLCBbJ25vcm1hbGl6ZSddKTtcclxuXHJcblxyXG4gICAgVG9vbHMuZXh0ZW5kKG5zLCB7XHJcbiAgICAgICAgaWQ6IFwiVmVjMlwiLFxyXG4gICAgICAgIGtpbmQ6IEtJTkRTLkZMT0FUMixcclxuICAgICAgICBvYmplY3Q6IHtcclxuICAgICAgICAgICAgY29uc3RydWN0b3I6IFZlY3RvcjJDb25zdHJ1Y3RvcixcclxuICAgICAgICAgICAgc3RhdGljOiBWZWN0b3IyU3RhdGljT2JqZWN0XHJcbiAgICAgICAgfSxcclxuICAgICAgICBpbnN0YW5jZTogVmVjdG9yMkluc3RhbmNlXHJcbiAgICB9KTtcclxuXHJcblxyXG59KGV4cG9ydHMpKTtcclxuIiwiKGZ1bmN0aW9uKG5zKXtcclxuXHJcbiAgICB2YXIgU2hhZGUgPSByZXF1aXJlKFwiLi4vLi4vLi4vaW50ZXJmYWNlcy5qc1wiKSxcclxuICAgICAgICBUWVBFUyA9IFNoYWRlLlRZUEVTLFxyXG4gICAgICAgIEtJTkRTID0gU2hhZGUuT0JKRUNUX0tJTkRTLFxyXG4gICAgICAgIFRvb2xzID0gcmVxdWlyZShcIi4vdG9vbHMuanNcIik7XHJcblxyXG4gICAgdmFyIFZlY3RvcjNDb25zdHJ1Y3RvciA9ICB7XHJcbiAgICAgICAgdHlwZTogVFlQRVMuT0JKRUNULFxyXG4gICAgICAgIGtpbmQ6IEtJTkRTLkZMT0FUMyxcclxuICAgICAgICAvKipcclxuICAgICAgICAgKiBAcGFyYW0ge0Fubm90YXRpb259IHJlc3VsdFxyXG4gICAgICAgICAqIEBwYXJhbSB7QXJyYXkuPEFubm90YXRpb24+fSBhcmdzXHJcbiAgICAgICAgICogQHBhcmFtIHtDb250ZXh0fSBjdHhcclxuICAgICAgICAgKi9cclxuICAgICAgICBldmFsdWF0ZTogVG9vbHMuVmVjLmNvbnN0cnVjdG9yRXZhbHVhdGUuYmluZChudWxsLCBcIlZlYzNcIiwgZmFsc2UsIDMpXHJcbiAgICB9O1xyXG5cclxuICAgIHZhciBWZWN0b3IzU3RhdGljT2JqZWN0ID0ge1xyXG4gICAgfTtcclxuXHJcbiAgICB2YXIgVmVjdG9yM0luc3RhbmNlID0ge1xyXG4gICAgICAgIGxlbmd0aDoge1xyXG4gICAgICAgICAgICB0eXBlOiBUWVBFUy5GVU5DVElPTixcclxuICAgICAgICAgICAgZXZhbHVhdGU6IFRvb2xzLlZlYy5vcHRpb25hbFplcm9FdmFsdWF0ZS5iaW5kKG51bGwsXCJWZWMzXCIsIGZhbHNlLCBcImxlbmd0aFwiLCAzLCAxLCAxKVxyXG4gICAgICAgIH1cclxuICAgIH07XHJcbiAgICBUb29scy5WZWMuYXR0YWNoU3dpenpsZXMoVmVjdG9yM0luc3RhbmNlLCBcIlZlYzNcIiwgZmFsc2UsIDMpO1xyXG4gICAgVG9vbHMuVmVjLmF0dGFjaFZlY01ldGhvZHMoVmVjdG9yM0luc3RhbmNlLCBcIlZlYzNcIiwgZmFsc2UsIDMsIDMsIFsnYWRkJywgJ3N1YicsICdtdWwnLCAnZGl2JywgJ21vZCddKTtcclxuICAgIFRvb2xzLlZlYy5hdHRhY2hWZWNNZXRob2RzKFZlY3RvcjNJbnN0YW5jZSwgXCJWZWMzXCIsIGZhbHNlLCAxLCAzLCBbJ2RvdCddKTtcclxuICAgIFRvb2xzLlZlYy5hdHRhY2hWZWNNZXRob2RzKFZlY3RvcjNJbnN0YW5jZSwgXCJWZWMzXCIsIGZhbHNlLCAzLCAwLCBbJ25vcm1hbGl6ZSddKTtcclxuXHJcblxyXG4gICAgVG9vbHMuZXh0ZW5kKG5zLCB7XHJcbiAgICAgICAgaWQ6IFwiVmVjM1wiLFxyXG4gICAgICAgIGtpbmQ6IEtJTkRTLkZMT0FUMyxcclxuICAgICAgICBvYmplY3Q6IHtcclxuICAgICAgICAgICAgY29uc3RydWN0b3I6IFZlY3RvcjNDb25zdHJ1Y3RvcixcclxuICAgICAgICAgICAgc3RhdGljOiBWZWN0b3IzU3RhdGljT2JqZWN0XHJcbiAgICAgICAgfSxcclxuICAgICAgICBpbnN0YW5jZTogVmVjdG9yM0luc3RhbmNlXHJcbiAgICB9KTtcclxuXHJcblxyXG59KGV4cG9ydHMpKTtcclxuIiwiKGZ1bmN0aW9uKG5zKXtcclxuXHJcbiAgICB2YXIgU2hhZGUgPSByZXF1aXJlKFwiLi4vLi4vLi4vaW50ZXJmYWNlcy5qc1wiKSxcclxuICAgICAgICBUWVBFUyA9IFNoYWRlLlRZUEVTLFxyXG4gICAgICAgIEtJTkRTID0gU2hhZGUuT0JKRUNUX0tJTkRTLFxyXG4gICAgICAgIFRvb2xzID0gcmVxdWlyZShcIi4vdG9vbHMuanNcIik7XHJcblxyXG4gICAgdmFyIFZlY3RvcjRDb25zdHJ1Y3RvciA9ICB7XHJcbiAgICAgICAgdHlwZTogVFlQRVMuT0JKRUNULFxyXG4gICAgICAgIGtpbmQ6IEtJTkRTLkZMT0FUNCxcclxuICAgICAgICAvKipcclxuICAgICAgICAgKiBAcGFyYW0ge0Fubm90YXRpb259IHJlc3VsdFxyXG4gICAgICAgICAqIEBwYXJhbSB7QXJyYXkuPEFubm90YXRpb24+fSBhcmdzXHJcbiAgICAgICAgICogQHBhcmFtIHtDb250ZXh0fSBjdHhcclxuICAgICAgICAgKi9cclxuICAgICAgICBldmFsdWF0ZTogVG9vbHMuVmVjLmNvbnN0cnVjdG9yRXZhbHVhdGUuYmluZChudWxsLCBcIlZlYzRcIiwgZmFsc2UsIDQpXHJcbiAgICB9O1xyXG5cclxuICAgIHZhciBWZWN0b3I0U3RhdGljT2JqZWN0ID0ge1xyXG4gICAgfTtcclxuXHJcbiAgICB2YXIgVmVjdG9yNEluc3RhbmNlID0ge1xyXG4gICAgICAgIGxlbmd0aDoge1xyXG4gICAgICAgICAgICB0eXBlOiBUWVBFUy5GVU5DVElPTixcclxuICAgICAgICAgICAgZXZhbHVhdGU6IFRvb2xzLlZlYy5vcHRpb25hbFplcm9FdmFsdWF0ZS5iaW5kKG51bGwsXCJWZWM0XCIsIGZhbHNlLCBcImxlbmd0aFwiLCA0LCAxLCAxKVxyXG4gICAgICAgIH1cclxuICAgIH07XHJcbiAgICBUb29scy5WZWMuYXR0YWNoU3dpenpsZXMoVmVjdG9yNEluc3RhbmNlLCBcIlZlYzRcIiwgZmFsc2UsIDQpO1xyXG4gICAgVG9vbHMuVmVjLmF0dGFjaFZlY01ldGhvZHMoVmVjdG9yNEluc3RhbmNlLCBcIlZlYzRcIiwgZmFsc2UsIDQsIDQsIFsnYWRkJywgJ3N1YicsICdtdWwnLCAnZGl2JywgJ21vZCddKTtcclxuICAgIFRvb2xzLlZlYy5hdHRhY2hWZWNNZXRob2RzKFZlY3RvcjRJbnN0YW5jZSwgXCJWZWM0XCIsIGZhbHNlLCAxLCA0LCBbJ2RvdCddKTtcclxuICAgIFRvb2xzLlZlYy5hdHRhY2hWZWNNZXRob2RzKFZlY3RvcjRJbnN0YW5jZSwgXCJWZWM0XCIsIGZhbHNlLCA0LCAwLCBbJ25vcm1hbGl6ZSddKTtcclxuXHJcblxyXG4gICAgVG9vbHMuZXh0ZW5kKG5zLCB7XHJcbiAgICAgICAgaWQ6IFwiVmVjNFwiLFxyXG4gICAgICAgIGtpbmQ6IEtJTkRTLkZMT0FUNCxcclxuICAgICAgICBvYmplY3Q6IHtcclxuICAgICAgICAgICAgY29uc3RydWN0b3I6IFZlY3RvcjRDb25zdHJ1Y3RvcixcclxuICAgICAgICAgICAgc3RhdGljOiBWZWN0b3I0U3RhdGljT2JqZWN0XHJcbiAgICAgICAgfSxcclxuICAgICAgICBpbnN0YW5jZTogVmVjdG9yNEluc3RhbmNlXHJcbiAgICB9KTtcclxuXHJcblxyXG59KGV4cG9ydHMpKTtcclxuIiwiKGZ1bmN0aW9uIChucykge1xyXG4gICAgLyoqXHJcbiAgICAgKiBTaGFkZS5qcyBzcGVjaWZpYyB0eXBlIGluZmVyZW5jZSB0aGF0IGlzIGFsc28gaW5mZXJyaW5nXHJcbiAgICAgKiB2aXJ0dWFsIHR5cGVzIHtAbGluayBTaGFkZS5UWVBFUyB9XHJcbiAgICAgKi9cclxuXHJcbiAgICB2YXIgd2FsayA9IHJlcXVpcmUoJ2VzdHJhdmVyc2UnKSxcclxuICAgICAgICBlbnRlckV4cHJlc3Npb24gPSByZXF1aXJlKCcuL2luZmVyX2V4cHJlc3Npb24uanMnKS5lbnRlckV4cHJlc3Npb24sXHJcbiAgICAgICAgZXhpdEV4cHJlc3Npb24gPSByZXF1aXJlKCcuL2luZmVyX2V4cHJlc3Npb24uanMnKS5leGl0RXhwcmVzc2lvbixcclxuICAgICAgICBlbnRlclN0YXRlbWVudCA9IHJlcXVpcmUoJy4vaW5mZXJfc3RhdGVtZW50LmpzJykuZW50ZXJTdGF0ZW1lbnQsXHJcbiAgICAgICAgZXhpdFN0YXRlbWVudCA9IHJlcXVpcmUoJy4vaW5mZXJfc3RhdGVtZW50LmpzJykuZXhpdFN0YXRlbWVudCxcclxuXHJcbiAgICAgICAgT2JqZWN0UmVnaXN0cnkgPSByZXF1aXJlKFwiLi9yZWdpc3RyeS9pbmRleC5qc1wiKS5SZWdpc3RyeSxcclxuICAgICAgICBDb250ZXh0ID0gcmVxdWlyZShcIi4vLi4vLi4vYmFzZS9jb250ZXh0LmpzXCIpLmdldENvbnRleHQoT2JqZWN0UmVnaXN0cnkpLFxyXG4gICAgICAgIEJhc2UgPSByZXF1aXJlKFwiLi4vLi4vYmFzZS9pbmRleC5qc1wiKSxcclxuICAgICAgICBBbm5vdGF0aW9uID0gcmVxdWlyZShcIi4vLi4vLi4vYmFzZS9hbm5vdGF0aW9uLmpzXCIpLkFubm90YXRpb24sXHJcbiAgICAgICAgRnVuY3Rpb25Bbm5vdGF0aW9uID0gcmVxdWlyZShcIi4vLi4vLi4vYmFzZS9hbm5vdGF0aW9uLmpzXCIpLkZ1bmN0aW9uQW5ub3RhdGlvbjtcclxuXHJcblxyXG5cclxuICAgIHZhciBTeW50YXggPSB3YWxrLlN5bnRheDtcclxuXHJcblxyXG4gICAgdmFyIHJlZ2lzdGVyR2xvYmFsQ29udGV4dCA9IGZ1bmN0aW9uIChwcm9ncmFtKSB7XHJcbiAgICAgICAgdmFyIGN0eCA9IG5ldyBDb250ZXh0KHByb2dyYW0sIG51bGwsIHtuYW1lOiBcImdsb2JhbFwifSk7XHJcbiAgICAgICAgY3R4LnJlZ2lzdGVyT2JqZWN0KFwiTWF0aFwiLCBPYmplY3RSZWdpc3RyeS5nZXRCeU5hbWUoXCJNYXRoXCIpKTtcclxuICAgICAgICBjdHgucmVnaXN0ZXJPYmplY3QoXCJDb2xvclwiLCBPYmplY3RSZWdpc3RyeS5nZXRCeU5hbWUoXCJDb2xvclwiKSk7XHJcbiAgICAgICAgY3R4LnJlZ2lzdGVyT2JqZWN0KFwiVmVjMlwiLCBPYmplY3RSZWdpc3RyeS5nZXRCeU5hbWUoXCJWZWMyXCIpKTtcclxuICAgICAgICBjdHgucmVnaXN0ZXJPYmplY3QoXCJWZWMzXCIsIE9iamVjdFJlZ2lzdHJ5LmdldEJ5TmFtZShcIlZlYzNcIikpO1xyXG4gICAgICAgIGN0eC5yZWdpc3Rlck9iamVjdChcIlZlYzRcIiwgT2JqZWN0UmVnaXN0cnkuZ2V0QnlOYW1lKFwiVmVjNFwiKSk7XHJcbiAgICAgICAgY3R4LnJlZ2lzdGVyT2JqZWN0KFwiU2hhZGVcIiwgT2JqZWN0UmVnaXN0cnkuZ2V0QnlOYW1lKFwiU2hhZGVcIikpO1xyXG4gICAgICAgIGN0eC5yZWdpc3Rlck9iamVjdChcInRoaXNcIiwgT2JqZWN0UmVnaXN0cnkuZ2V0QnlOYW1lKFwiU3lzdGVtXCIpKTtcclxuICAgICAgICByZXR1cm4gY3R4O1xyXG4gICAgfVxyXG5cclxuICAgIHZhciBUeXBlSW5mZXJlbmNlID0gZnVuY3Rpb24gKHJvb3QsIG9wdCkge1xyXG4gICAgICAgIG9wdCA9IG9wdCB8fCB7fTtcclxuICAgICAgICB0aGlzLnJvb3QgPSByb290O1xyXG4gICAgICAgIHRoaXMuY29udGV4dCA9IFtdO1xyXG4gICAgICAgIC8qKiBAdHlwZSB7T2JqZWN0LjxTdHJpbmcsIEFycmF5LjxUeXBlSW5mbz59ICoqL1xyXG4gICAgICAgIHRoaXMuaW5qZWN0aW9ucyA9IHt9O1xyXG4gICAgICAgIHRoaXMuZW50cnlQb2ludCA9IG9wdC5lbnRyeSB8fCBcImdsb2JhbC5zaGFkZVwiO1xyXG4gICAgICAgIHRoaXMucm9vdC5pbmplY3Rpb25zID0gdGhpcy5pbmplY3Rpb25zO1xyXG4gICAgICAgIHRoaXMuZnVuY3Rpb25zID0ge1xyXG4gICAgICAgICAgICBvcmlnOiB7fSxcclxuICAgICAgICAgICAgZGVyaXZlZDoge31cclxuICAgICAgICB9XHJcblxyXG4gICAgfVxyXG5cclxuICAgIEJhc2UuZXh0ZW5kKFR5cGVJbmZlcmVuY2UucHJvdG90eXBlLCB7XHJcbiAgICAgICAgcHVzaENvbnRleHQ6IGZ1bmN0aW9uIChjb250ZXh0KSB7XHJcbiAgICAgICAgICAgIHRoaXMuY29udGV4dC5wdXNoKGNvbnRleHQpO1xyXG4gICAgICAgICAgICB2YXIgaW5qZWN0aW9uID0gdGhpcy5pbmplY3Rpb25zW2NvbnRleHQuc3RyKCldO1xyXG4gICAgICAgICAgICBpZiAoaW5qZWN0aW9uKSB7XHJcbiAgICAgICAgICAgICAgICBjb250ZXh0LmluamVjdFBhcmFtZXRlcnMoaW5qZWN0aW9uKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgcG9wQ29udGV4dDogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICB0aGlzLmNvbnRleHQucG9wKCk7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBwZWVrQ29udGV4dDogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5jb250ZXh0W3RoaXMuY29udGV4dC5sZW5ndGggLSAxXTtcclxuICAgICAgICB9LFxyXG4gICAgICAgIGNyZWF0ZUNvbnRleHQ6IGZ1bmN0aW9uIChub2RlLCBwYXJlbnRDb250ZXh0LCBuYW1lKSB7XHJcbiAgICAgICAgICAgdmFyIHJlc3VsdCA9IG5ldyBDb250ZXh0KG5vZGUsIHBhcmVudENvbnRleHQsIHtuYW1lOiBuYW1lIH0gKTtcclxuICAgICAgICAgICByZXR1cm4gcmVzdWx0O1xyXG4gICAgICAgIH0sXHJcblxyXG4gICAgICAgIGFubm90YXRlUGFyYW1ldGVyczogZnVuY3Rpb24oYXJyKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBhcnIgPyBhcnIubWFwKGZ1bmN0aW9uKHBhcmFtKSB7XHJcbiAgICAgICAgICAgICAgICB2YXIgYW5ub3RhdGVkID0gIG5ldyBBbm5vdGF0aW9uKHBhcmFtKTtcclxuICAgICAgICAgICAgICAgIHJldHVybiBhbm5vdGF0ZWQ7XHJcbiAgICAgICAgICAgIH0pIDogW107XHJcbiAgICAgICAgfSxcclxuXHJcblxyXG4gICAgICAgIGJ1aWxkRnVuY3Rpb25NYXA6IGZ1bmN0aW9uKHByZykge1xyXG4gICAgICAgICAgICB2YXIgdGhhdCA9IHRoaXM7XHJcbiAgICAgICAgICAgIHdhbGsucmVwbGFjZShwcmcsIHtcclxuICAgICAgICAgICAgICAgIGVudGVyOiBmdW5jdGlvbihub2RlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKG5vZGUudHlwZSA9PSBTeW50YXguRnVuY3Rpb25EZWNsYXJhdGlvbikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgcmVzdWx0ID0gbmV3IEZ1bmN0aW9uQW5ub3RhdGlvbihub2RlKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGZ1bmN0aW9uTmFtZSA9IG5vZGUuaWQubmFtZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHBhcmVudENvbnRleHQgPSB0aGF0LnBlZWtDb250ZXh0KCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBmdW5jdGlvbkNvbnRleHQgPSB0aGF0LmNyZWF0ZUNvbnRleHQobm9kZSwgcGFyZW50Q29udGV4dCwgZnVuY3Rpb25OYW1lKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb25Db250ZXh0LmRlY2xhcmVQYXJhbWV0ZXJzKG5vZGUucGFyYW1zKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcGFyZW50Q29udGV4dC5kZWNsYXJlVmFyaWFibGUoZnVuY3Rpb25OYW1lKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcGFyZW50Q29udGV4dC51cGRhdGVFeHByZXNzaW9uKGZ1bmN0aW9uTmFtZSwgcmVzdWx0KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC5wdXNoQ29udGV4dChmdW5jdGlvbkNvbnRleHQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGF0LmZ1bmN0aW9ucy5vcmlnW2Z1bmN0aW9uQ29udGV4dC5zdHIoKV0gPSBub2RlO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICBsZWF2ZTogZnVuY3Rpb24obm9kZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChub2RlLnR5cGUgPT0gU3ludGF4LkZ1bmN0aW9uRGVjbGFyYXRpb24pIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC5wb3BDb250ZXh0KCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB7IHR5cGU6IFN5bnRheC5FbXB0eVN0YXRlbWVudCB9O1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgcHJnLmJvZHkgPSBwcmcuYm9keS5maWx0ZXIoZnVuY3Rpb24oYSkgeyByZXR1cm4gYS50eXBlICE9IFN5bnRheC5FbXB0eVN0YXRlbWVudDsgfSk7XHJcbiAgICAgICAgfSxcclxuXHJcbiAgICAgICAgdHJhdmVyc2U6IGZ1bmN0aW9uIChub2RlKSB7XHJcbiAgICAgICAgICAgIHdhbGsudHJhdmVyc2Uobm9kZSwge1xyXG4gICAgICAgICAgICAgICAgZW50ZXI6IHRoaXMuZW50ZXJOb2RlLmJpbmQodGhpcyksXHJcbiAgICAgICAgICAgICAgICBsZWF2ZTogdGhpcy5leGl0Tm9kZS5iaW5kKHRoaXMpXHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICByZXR1cm4gbm9kZTtcclxuICAgICAgICB9LFxyXG5cclxuICAgICAgICBlbnRlck5vZGU6IGZ1bmN0aW9uIChub2RlLCBwYXJlbnQpIHtcclxuICAgICAgICAgICAgdmFyIGNvbnRleHQgPSB0aGlzLmNvbnRleHRbdGhpcy5jb250ZXh0Lmxlbmd0aCAtIDFdO1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5zd2l0Y2hLaW5kKG5vZGUsIHBhcmVudCwgY29udGV4dCwgZW50ZXJTdGF0ZW1lbnQsIGVudGVyRXhwcmVzc2lvbik7XHJcbiAgICAgICAgfSxcclxuXHJcbiAgICAgICAgZXhpdE5vZGU6IGZ1bmN0aW9uIChub2RlLCBwYXJlbnQpIHtcclxuICAgICAgICAgICAgdmFyIGNvbnRleHQgPSB0aGlzLmNvbnRleHRbdGhpcy5jb250ZXh0Lmxlbmd0aCAtIDFdO1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5zd2l0Y2hLaW5kKG5vZGUsIHBhcmVudCwgY29udGV4dCwgZXhpdFN0YXRlbWVudCwgZXhpdEV4cHJlc3Npb24pO1xyXG4gICAgICAgIH0sXHJcblxyXG4gICAgICAgIHN3aXRjaEtpbmQ6IGZ1bmN0aW9uIChub2RlLCBwYXJlbnQsIGN0eCwgc3RhdGVtZW50LCBleHByZXNzaW9uKSB7XHJcbiAgICAgICAgICAgIHN3aXRjaCAobm9kZS50eXBlKSB7XHJcbiAgICAgICAgICAgICAgICBjYXNlIFN5bnRheC5CbG9ja1N0YXRlbWVudDpcclxuICAgICAgICAgICAgICAgIGNhc2UgU3ludGF4LkJyZWFrU3RhdGVtZW50OlxyXG4gICAgICAgICAgICAgICAgY2FzZSBTeW50YXguQ2F0Y2hDbGF1c2U6XHJcbiAgICAgICAgICAgICAgICBjYXNlIFN5bnRheC5Db250aW51ZVN0YXRlbWVudDpcclxuICAgICAgICAgICAgICAgIGNhc2UgU3ludGF4LkRpcmVjdGl2ZVN0YXRlbWVudDpcclxuICAgICAgICAgICAgICAgIGNhc2UgU3ludGF4LkRvV2hpbGVTdGF0ZW1lbnQ6XHJcbiAgICAgICAgICAgICAgICBjYXNlIFN5bnRheC5EZWJ1Z2dlclN0YXRlbWVudDpcclxuICAgICAgICAgICAgICAgIGNhc2UgU3ludGF4LkVtcHR5U3RhdGVtZW50OlxyXG4gICAgICAgICAgICAgICAgY2FzZSBTeW50YXguRXhwcmVzc2lvblN0YXRlbWVudDpcclxuICAgICAgICAgICAgICAgIGNhc2UgU3ludGF4LkZvclN0YXRlbWVudDpcclxuICAgICAgICAgICAgICAgIGNhc2UgU3ludGF4LkZvckluU3RhdGVtZW50OlxyXG4gICAgICAgICAgICAgICAgY2FzZSBTeW50YXguRnVuY3Rpb25EZWNsYXJhdGlvbjpcclxuICAgICAgICAgICAgICAgIGNhc2UgU3ludGF4LklmU3RhdGVtZW50OlxyXG4gICAgICAgICAgICAgICAgY2FzZSBTeW50YXguTGFiZWxlZFN0YXRlbWVudDpcclxuICAgICAgICAgICAgICAgIGNhc2UgU3ludGF4LlByb2dyYW06XHJcbiAgICAgICAgICAgICAgICBjYXNlIFN5bnRheC5SZXR1cm5TdGF0ZW1lbnQ6XHJcbiAgICAgICAgICAgICAgICBjYXNlIFN5bnRheC5Td2l0Y2hTdGF0ZW1lbnQ6XHJcbiAgICAgICAgICAgICAgICBjYXNlIFN5bnRheC5Td2l0Y2hDYXNlOlxyXG4gICAgICAgICAgICAgICAgY2FzZSBTeW50YXguVGhyb3dTdGF0ZW1lbnQ6XHJcbiAgICAgICAgICAgICAgICBjYXNlIFN5bnRheC5UcnlTdGF0ZW1lbnQ6XHJcbiAgICAgICAgICAgICAgICBjYXNlIFN5bnRheC5WYXJpYWJsZURlY2xhcmF0aW9uOlxyXG4gICAgICAgICAgICAgICAgY2FzZSBTeW50YXguVmFyaWFibGVEZWNsYXJhdG9yOlxyXG4gICAgICAgICAgICAgICAgY2FzZSBTeW50YXguV2hpbGVTdGF0ZW1lbnQ6XHJcbiAgICAgICAgICAgICAgICBjYXNlIFN5bnRheC5XaXRoU3RhdGVtZW50OlxyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBzdGF0ZW1lbnQuY2FsbCh0aGlzLCBub2RlLCBwYXJlbnQsIGN0eCk7XHJcblxyXG4gICAgICAgICAgICAgICAgY2FzZSBTeW50YXguQXNzaWdubWVudEV4cHJlc3Npb246XHJcbiAgICAgICAgICAgICAgICBjYXNlIFN5bnRheC5BcnJheUV4cHJlc3Npb246XHJcbiAgICAgICAgICAgICAgICBjYXNlIFN5bnRheC5BcnJheVBhdHRlcm46XHJcbiAgICAgICAgICAgICAgICBjYXNlIFN5bnRheC5CaW5hcnlFeHByZXNzaW9uOlxyXG4gICAgICAgICAgICAgICAgY2FzZSBTeW50YXguQ2FsbEV4cHJlc3Npb246XHJcbiAgICAgICAgICAgICAgICBjYXNlIFN5bnRheC5Db25kaXRpb25hbEV4cHJlc3Npb246XHJcbiAgICAgICAgICAgICAgICBjYXNlIFN5bnRheC5GdW5jdGlvbkV4cHJlc3Npb246XHJcbiAgICAgICAgICAgICAgICBjYXNlIFN5bnRheC5JZGVudGlmaWVyOlxyXG4gICAgICAgICAgICAgICAgY2FzZSBTeW50YXguTGl0ZXJhbDpcclxuICAgICAgICAgICAgICAgIGNhc2UgU3ludGF4LkxvZ2ljYWxFeHByZXNzaW9uOlxyXG4gICAgICAgICAgICAgICAgY2FzZSBTeW50YXguTWVtYmVyRXhwcmVzc2lvbjpcclxuICAgICAgICAgICAgICAgIGNhc2UgU3ludGF4Lk5ld0V4cHJlc3Npb246XHJcbiAgICAgICAgICAgICAgICBjYXNlIFN5bnRheC5PYmplY3RFeHByZXNzaW9uOlxyXG4gICAgICAgICAgICAgICAgY2FzZSBTeW50YXguT2JqZWN0UGF0dGVybjpcclxuICAgICAgICAgICAgICAgIGNhc2UgU3ludGF4LlByb3BlcnR5OlxyXG4gICAgICAgICAgICAgICAgY2FzZSBTeW50YXguU2VxdWVuY2VFeHByZXNzaW9uOlxyXG4gICAgICAgICAgICAgICAgY2FzZSBTeW50YXguVGhpc0V4cHJlc3Npb246XHJcbiAgICAgICAgICAgICAgICBjYXNlIFN5bnRheC5VbmFyeUV4cHJlc3Npb246XHJcbiAgICAgICAgICAgICAgICBjYXNlIFN5bnRheC5VcGRhdGVFeHByZXNzaW9uOlxyXG4gICAgICAgICAgICAgICAgY2FzZSBTeW50YXguWWllbGRFeHByZXNzaW9uOlxyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBleHByZXNzaW9uLmNhbGwodGhpcywgbm9kZSwgcGFyZW50LCBjdHgpO1xyXG5cclxuICAgICAgICAgICAgICAgIGRlZmF1bHQ6XHJcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdVbmtub3duIG5vZGUgdHlwZTogJyArIG5vZGUudHlwZSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9LFxyXG5cclxuICAgICAgICAvKipcclxuICAgICAgICAgKlxyXG4gICAgICAgICAqIEBwYXJhbSB7T2JqZWN0fSBmdW5jdGlvbkFTVFxyXG4gICAgICAgICAqIEBwYXJhbSB7QXJyYXkuPFR5cGVJbmZvPiBwYXJhbXNcclxuICAgICAgICAgKiBAcGFyYW0ge0NvbnRleHR9IHBhcmVudENvbnRleHRcclxuICAgICAgICAgKiBAcmV0dXJucyB7Kn1cclxuICAgICAgICAgKi9cclxuICAgICAgICBpbmZlckZ1bmN0aW9uOiBmdW5jdGlvbiAoZnVuY3Rpb25BU1QsIHBhcmFtcywgcGFyZW50Q29udGV4dCkge1xyXG4gICAgICAgICAgICB2YXIgZnVuY3Rpb25OYW1lID0gZnVuY3Rpb25BU1QuaWQubmFtZTtcclxuICAgICAgICAgICAgdmFyIHRhcmdldENvbnRleHROYW1lID0gcGFyZW50Q29udGV4dC5nZXRWYXJpYWJsZUlkZW50aWZpZXIoZnVuY3Rpb25OYW1lKTtcclxuICAgICAgICAgICAgdGhpcy5pbmplY3Rpb25zW3RhcmdldENvbnRleHROYW1lXSA9IHBhcmFtcztcclxuXHJcbiAgICAgICAgICAgIC8vIFdlIGhhdmUgYSBzcGVjaWZjIHR5cGUgc2V0IGluIHBhcmFtcyB0aGF0IHdlIGFubm90YXRlIHRvIHRoZVxyXG4gICAgICAgICAgICAvLyBmdW5jdGlvbiBBU1RcclxuICAgICAgICAgICAgZm9yKHZhciBpID0gMDsgaSA8IHBhcmFtcy5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgICAgICAgICAgaWYgKGkgPT0gZnVuY3Rpb25BU1QucGFyYW1zLmxlbmd0aClcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIHZhciBmdW5jUGFyYW0gPSBuZXcgQW5ub3RhdGlvbihmdW5jdGlvbkFTVC5wYXJhbXNbaV0pO1xyXG4gICAgICAgICAgICAgICAgZnVuY1BhcmFtLnNldEZyb21FeHRyYShwYXJhbXNbaV0uZ2V0RXh0cmEoKSk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHZhciBvbGRFbnRyeVBvaW50ID0gdGhpcy5lbnRyeVBvaW50O1xyXG4gICAgICAgICAgICB0aGlzLmVudHJ5UG9pbnQgPSB0YXJnZXRDb250ZXh0TmFtZTtcclxuICAgICAgICAgICAgdGhpcy5wdXNoQ29udGV4dChwYXJlbnRDb250ZXh0KTtcclxuICAgICAgICAgICAgLy9jb25zb2xlLmxvZyhcIlN0YXJ0aW5nIHRvIHRyYXZlcnNlOiBcIiArIGZ1bmN0aW9uTmFtZSArIFwiIGluIGNvbnRleHQgXCIgKyBwYXJlbnRDb250ZXh0LnN0cigpKVxyXG4gICAgICAgICAgICB2YXIgYXN0ID0gdGhpcy50cmF2ZXJzZShmdW5jdGlvbkFTVCk7XHJcbiAgICAgICAgICAgIHRoaXMucG9wQ29udGV4dCgpO1xyXG4gICAgICAgICAgICB0aGlzLmVudHJ5UG9pbnQgPSBvbGRFbnRyeVBvaW50O1xyXG5cclxuICAgICAgICAgICAgcmV0dXJuIGFzdDtcclxuICAgICAgICB9LFxyXG5cclxuICAgICAgICBpbmZlclByb2dyYW06IGZ1bmN0aW9uKHByZywgcGFyYW1zKSB7XHJcbiAgICAgICAgICAgIHZhciBwYXJhbXMgPSBwYXJhbXMgfHwge307XHJcbiAgICAgICAgICAgIHZhciBwcm9ncmFtQ29udGV4dCA9IHJlZ2lzdGVyR2xvYmFsQ29udGV4dChwcmcpO1xyXG5cclxuICAgICAgICAgICAgdGhpcy5wdXNoQ29udGV4dChwcm9ncmFtQ29udGV4dCk7XHJcbiAgICAgICAgICAgIHRoaXMuYnVpbGRGdW5jdGlvbk1hcChwcmcpO1xyXG4gICAgICAgICAgICB0aGlzLnRyYXZlcnNlKHByZyk7XHJcbiAgICAgICAgICAgIHRoaXMucG9wQ29udGV4dCgpO1xyXG5cclxuICAgICAgICAgICAgdmFyIGVudHJ5UG9pbnQgPSB0aGlzLmVudHJ5UG9pbnQ7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLmZ1bmN0aW9ucy5vcmlnLmhhc093blByb3BlcnR5KGVudHJ5UG9pbnQpKSB7XHJcbiAgICAgICAgICAgICAgICB2YXIgYXN0ID0gdGhpcy5mdW5jdGlvbnMub3JpZ1tlbnRyeVBvaW50XTtcclxuICAgICAgICAgICAgICAgIHZhciBwYXJhbXMgPSB0aGlzLmFubm90YXRlUGFyYW1ldGVycyhwYXJhbXNbZW50cnlQb2ludF0pO1xyXG4gICAgICAgICAgICAgICAgdmFyIGFhc3QgPSB0aGlzLmluZmVyRnVuY3Rpb24oYXN0LCBwYXJhbXMsIHByb2dyYW1Db250ZXh0KTtcclxuICAgICAgICAgICAgICAgIGZvcih2YXIgZnVuYyBpbiB0aGlzLmZ1bmN0aW9ucy5kZXJpdmVkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIHZhcmlhdGlvbnMgPSB0aGlzLmZ1bmN0aW9ucy5kZXJpdmVkW2Z1bmNdO1xyXG4gICAgICAgICAgICAgICAgICAgIGZvciAodmFyIHNpZ25hdHVyZSBpbiB2YXJpYXRpb25zKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHByZy5ib2R5LnB1c2godmFyaWF0aW9uc1tzaWduYXR1cmVdLmFzdCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIHByZy5ib2R5LnB1c2goYWFzdCk7XHJcblxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAodGhpcy5jb250ZXh0Lmxlbmd0aClcclxuICAgICAgICAgICAgICAgIHRocm93IEVycm9yKFwiU29tZXRoaW5nIHdlbnQgd3JvbmdcIik7XHJcbiAgICAgICAgICAgIHJldHVybiBwcmc7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBnZXRGdW5jdGlvbkluZm9ybWF0aW9uRm9yOiBmdW5jdGlvbihuYW1lLCBhcmdzLCBkZWZpbmluZ0NvbnRleHQpIHtcclxuICAgICAgICAgICAgdmFyIHNpZ25hdHVyZSA9IGFyZ3MucmVkdWNlKGZ1bmN0aW9uKHN0ciwgYXJnKSB7IHJldHVybiBzdHIgKyBhcmcuZ2V0VHlwZVN0cmluZygpfSwgXCJcIik7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLmZ1bmN0aW9ucy5kZXJpdmVkLmhhc093blByb3BlcnR5KG5hbWUpKSB7XHJcbiAgICAgICAgICAgICAgICB2YXIgZGVyaXZlZEZ1bmN0aW9uID0gdGhpcy5mdW5jdGlvbnMuZGVyaXZlZFtuYW1lXTtcclxuICAgICAgICAgICAgICAgIGlmIChkZXJpdmVkRnVuY3Rpb24uaGFzT3duUHJvcGVydHkoc2lnbmF0dXJlKSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBkZXJpdmVkRnVuY3Rpb25bc2lnbmF0dXJlXS5pbmZvO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmICh0aGlzLmZ1bmN0aW9ucy5vcmlnLmhhc093blByb3BlcnR5KG5hbWUpKSB7XHJcbiAgICAgICAgICAgICAgICB2YXIgYXN0ID0gdGhpcy5mdW5jdGlvbnMub3JpZ1tuYW1lXTtcclxuICAgICAgICAgICAgICAgIHZhciB2YXJpYXRpb25zID0gdGhpcy5mdW5jdGlvbnMuZGVyaXZlZFtuYW1lXSA9IHRoaXMuZnVuY3Rpb25zLmRlcml2ZWRbbmFtZV0gfHwge307XHJcbiAgICAgICAgICAgICAgICB2YXIgZGVyaXZlZCA9IHZhcmlhdGlvbnNbc2lnbmF0dXJlXSA9IHt9O1xyXG4gICAgICAgICAgICAgICAgZGVyaXZlZC5hc3QgPSB0aGlzLmluZmVyRnVuY3Rpb24oSlNPTi5wYXJzZShKU09OLnN0cmluZ2lmeShhc3QpKSwgYXJncywgZGVmaW5pbmdDb250ZXh0KTtcclxuICAgICAgICAgICAgICAgIGRlcml2ZWQuaW5mbyA9IGRlcml2ZWQuYXN0LmV4dHJhLnJldHVybkluZm87XHJcbiAgICAgICAgICAgICAgICBkZXJpdmVkLmluZm8ubmV3TmFtZSA9IG5hbWUucmVwbGFjZSgvXFwuL2csICdfJykgKyBPYmplY3Qua2V5cyh2YXJpYXRpb25zKS5sZW5ndGg7XHJcbiAgICAgICAgICAgICAgICBkZXJpdmVkLmFzdC5pZC5uYW1lID0gZGVyaXZlZC5pbmZvLm5ld05hbWU7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gZGVyaXZlZC5pbmZvO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIkNvdWxkIG5vdCByZXNvbHZlIGZ1bmN0aW9uIFwiICsgbmFtZSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgIH0pO1xyXG5cclxuXHJcbiAgICBucy5pbmZlciA9IGZ1bmN0aW9uIChhc3QsIG9wdCkge1xyXG4gICAgICAgIHZhciB0aSA9IG5ldyBUeXBlSW5mZXJlbmNlKGFzdCwgb3B0KTtcclxuICAgICAgICByZXR1cm4gdGkuaW5mZXJQcm9ncmFtKHRpLnJvb3QsIG9wdC5pbmplY3QpO1xyXG4gICAgfTtcclxuXHJcblxyXG59KGV4cG9ydHMpKTtcclxuIiwiKGZ1bmN0aW9uKG5zKXtcclxuXHJcbiAgICB2YXIgU2hhZGUgPSByZXF1aXJlKFwiLi4vaW50ZXJmYWNlcy5qc1wiKSxcclxuICAgICAgICBTeW50YXggPSByZXF1aXJlKCdlc3RyYXZlcnNlJykuU3ludGF4LFxyXG4gICAgICAgIEJhc2UgPSByZXF1aXJlKFwiLi9pbmRleC5qc1wiKSxcclxuICAgICAgICBUeXBlSW5mbyA9IHJlcXVpcmUoXCIuL3R5cGVpbmZvLmpzXCIpLlR5cGVJbmZvO1xyXG5cclxuICAgIHZhciBUWVBFUyA9IFNoYWRlLlRZUEVTLFxyXG4gICAgICAgIEtJTkRTID0gU2hhZGUuT0JKRUNUX0tJTkRTO1xyXG5cclxuXHJcbiAgICAvKipcclxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBub2RlXHJcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gZXh0cmFcclxuICAgICAqIEBleHRlbmRzIFR5cGVJbmZvXHJcbiAgICAgKiBAY29uc3RydWN0b3JcclxuICAgICAqL1xyXG4gICAgdmFyIEFubm90YXRpb24gPSBmdW5jdGlvbiAobm9kZSwgZXh0cmEpIHtcclxuICAgICAgICBUeXBlSW5mby5jYWxsKHRoaXMsIG5vZGUsIGV4dHJhKTtcclxuICAgIH07XHJcblxyXG4gICAgQmFzZS5jcmVhdGVDbGFzcyhBbm5vdGF0aW9uLCBUeXBlSW5mbywge1xyXG5cclxuICAgICAgICBzZXRDYWxsIDogZnVuY3Rpb24oY2FsbCkge1xyXG4gICAgICAgICAgICB2YXIgZXh0cmEgPSB0aGlzLmdldEV4dHJhKCk7XHJcbiAgICAgICAgICAgIGV4dHJhLmV2YWx1YXRlID0gY2FsbDtcclxuICAgICAgICB9LFxyXG4gICAgICAgIGdldENhbGwgOiBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuZ2V0RXh0cmEoKS5ldmFsdWF0ZTtcclxuICAgICAgICB9LFxyXG4gICAgICAgIGNsZWFyQ2FsbDogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgIHZhciBleHRyYSA9IHRoaXMuZ2V0RXh0cmEoKTtcclxuICAgICAgICAgICAgZGVsZXRlIGV4dHJhLmV2YWx1YXRlO1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgZWxpbWluYXRlIDogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgIHZhciBleHRyYSA9IHRoaXMuZ2V0RXh0cmEoKTtcclxuICAgICAgICAgICAgZXh0cmEuZWxpbWluYXRlID0gdHJ1ZTtcclxuICAgICAgICB9LFxyXG4gICAgICAgIGNhbkVsaW1pbmF0ZSA6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICB2YXIgZXh0cmEgPSB0aGlzLmdldEV4dHJhKCk7XHJcbiAgICAgICAgICAgIHJldHVybiBleHRyYS5lbGltaW5hdGUgPT0gdHJ1ZTtcclxuICAgICAgICB9XHJcblxyXG4gICAgfSk7XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBAcGFyYW0ge0FycmF5LjxvYmplY3Q+fSBhcnIgQXJyYXkgb2Ygbm9kZXNcclxuICAgICAqIEBwYXJhbSB7Q29udGV4dH0gY3R4XHJcbiAgICAgKiBAcmV0dXJucyB7QXJyYXkuPEFubm90YXRpb24+fVxyXG4gICAgICovXHJcbiAgICBBbm5vdGF0aW9uLmNyZWF0ZUFubm90YXRlZE5vZGVBcnJheSA9IGZ1bmN0aW9uKGFyciwgY3R4KSB7XHJcbiAgICAgICAgcmV0dXJuIGFyci5tYXAoZnVuY3Rpb24gKGFyZykge1xyXG4gICAgICAgICAgICByZXR1cm4gY3R4LmNyZWF0ZVR5cGVJbmZvKGFyZyk7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG5cclxuICAgIC8qKlxyXG4gICAgICogQHBhcmFtIHtvYmplY3R9IG5vZGVcclxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBleHRyYVxyXG4gICAgICogQGV4dGVuZHMgQW5ub3RhdGlvblxyXG4gICAgICogQGNvbnN0cnVjdG9yXHJcbiAgICAgKi9cclxuICAgIHZhciBGdW5jdGlvbkFubm90YXRpb24gPSBmdW5jdGlvbiAobm9kZSwgZXh0cmEpIHtcclxuICAgICAgICBBbm5vdGF0aW9uLmNhbGwodGhpcywgbm9kZSwgZXh0cmEpO1xyXG4gICAgICAgIHRoaXMuc2V0VHlwZShUWVBFUy5GVU5DVElPTik7XHJcbiAgICB9O1xyXG5cclxuICAgIEJhc2UuY3JlYXRlQ2xhc3MoRnVuY3Rpb25Bbm5vdGF0aW9uLCBBbm5vdGF0aW9uLCB7XHJcbiAgICAgICAgZ2V0UmV0dXJuSW5mbzogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmdldEV4dHJhKCkucmV0dXJuSW5mbztcclxuICAgICAgICB9LFxyXG4gICAgICAgIHNldFJldHVybkluZm86IGZ1bmN0aW9uKGluZm8pIHtcclxuICAgICAgICAgICAgdGhpcy5nZXRFeHRyYSgpLnJldHVybkluZm8gPSBpbmZvO1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgaXNVc2VkOiBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgcmV0dXJuICEhdGhpcy5nZXRFeHRyYSgpLnVzZWQ7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBzZXRVc2VkOiBmdW5jdGlvbih2KSB7XHJcbiAgICAgICAgICAgIHRoaXMuZ2V0RXh0cmEoKS51c2VkID0gdjtcclxuICAgICAgICB9XHJcbiAgICB9KTtcclxuXHJcbiAgICBucy5Bbm5vdGF0aW9uID0gQW5ub3RhdGlvbjtcclxuICAgIG5zLkZ1bmN0aW9uQW5ub3RhdGlvbiA9IEZ1bmN0aW9uQW5ub3RhdGlvbjtcclxuICAgIG5zLkFOTk8gPSBmdW5jdGlvbihvYmplY3Qpe3JldHVybiBuZXcgQW5ub3RhdGlvbihvYmplY3QpfTtcclxuXHJcbn0oZXhwb3J0cykpO1xyXG4iLCIoZnVuY3Rpb24obnMpe1xyXG5cclxuICAgIHZhciBCYXNlID0gcmVxdWlyZShcIi4vaW5kZXguanNcIiksXHJcbiAgICAgICAgU2hhZGUgPSByZXF1aXJlKFwiLi4vaW50ZXJmYWNlcy5qc1wiKSxcclxuICAgICAgICBUWVBFUyA9IFNoYWRlLlRZUEVTLFxyXG4gICAgICAgIEFubm90YXRpb24gPSByZXF1aXJlKFwiLi9hbm5vdGF0aW9uLmpzXCIpLkFubm90YXRpb24sXHJcbiAgICAgICAgVHlwZUluZm8gPSByZXF1aXJlKFwiLi90eXBlaW5mby5qc1wiKS5UeXBlSW5mbyxcclxuICAgICAgICBTeW50YXggPSByZXF1aXJlKCdlc3RyYXZlcnNlJykuU3ludGF4O1xyXG5cclxuICAgIG5zLmdldENvbnRleHQgPSBmdW5jdGlvbihyZWdpc3RyeSkge1xyXG5cclxuICAgIC8qKlxyXG4gICAgICpcclxuICAgICAqIEBwYXJhbSBiaW5kaW5nXHJcbiAgICAgKiBAZXh0ZW5kcyBUeXBlSW5mb1xyXG4gICAgICogQGNvbnN0cnVjdG9yXHJcbiAgICAgKi9cclxuICAgIHZhciBCaW5kaW5nID0gZnVuY3Rpb24oYmluZGluZywgcmVnaXN0ZXJ5KSB7XHJcbiAgICAgICAgVHlwZUluZm8uY2FsbCh0aGlzLCBiaW5kaW5nKTtcclxuICAgICAgICBpZih0aGlzLm5vZGUucmVmKSB7XHJcbiAgICAgICAgICAgIGlmICghcmVnaXN0ZXJ5W3RoaXMubm9kZS5yZWZdKVxyXG4gICAgICAgICAgICAgICAgdGhyb3cgRXJyb3IoXCJObyBvYmplY3QgaGFzIGJlZW4gcmVnaXN0ZXJlZCBmb3I6IFwiICsgdGhpcy5ub2RlLnJlZik7XHJcbiAgICAgICAgICAgIHRoaXMuZ2xvYmFsT2JqZWN0ID0gcmVnaXN0ZXJ5W3RoaXMubm9kZS5yZWZdLm9iamVjdDtcclxuICAgICAgICAgICAgaWYgKHRoaXMuZ2xvYmFsT2JqZWN0KSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnNldFR5cGUoVFlQRVMuT0JKRUNUKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH07XHJcblxyXG5cclxuICAgIEJhc2UuY3JlYXRlQ2xhc3MoQmluZGluZywgVHlwZUluZm8sIHtcclxuICAgICAgICBoYXNDb25zdHJ1Y3RvcjogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgIHJldHVybiAhIXRoaXMuZ2V0Q29uc3RydWN0b3IoKTtcclxuICAgICAgICB9LFxyXG4gICAgICAgIGdldENvbnN0cnVjdG9yOiBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuZ2xvYmFsT2JqZWN0ICYmIHRoaXMuZ2xvYmFsT2JqZWN0LmNvbnN0cnVjdG9yO1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgaXNJbml0aWFsaXplZDogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLm5vZGUuaW5pdGlhbGl6ZWQ7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBzZXRJbml0aWFsaXplZDogZnVuY3Rpb24odikge1xyXG4gICAgICAgICAgICB0aGlzLm5vZGUuaW5pdGlhbGl6ZWQgPSB2O1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgaGFzU3RhdGljVmFsdWU6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBpc0dsb2JhbDogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLm5vZGUuaW5mbyAmJiB0aGlzLm5vZGUuaW5mby5fZ2xvYmFsIHx8IFR5cGVJbmZvLnByb3RvdHlwZS5pc0dsb2JhbC5jYWxsKHRoaXMpO1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgZ2V0VHlwZTogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmdsb2JhbE9iamVjdD8gVFlQRVMuT0JKRUNUIDogVHlwZUluZm8ucHJvdG90eXBlLmdldFR5cGUuY2FsbCh0aGlzKTtcclxuICAgICAgICB9LFxyXG4gICAgICAgIGdldE9iamVjdEluZm86IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICBpZiAodGhpcy5nbG9iYWxPYmplY3QpXHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5nbG9iYWxPYmplY3Quc3RhdGljO1xyXG4gICAgICAgICAgICBpZiAodGhpcy5pc09iamVjdCgpKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5ub2RlLmluZm8gfHwgcmVnaXN0cnkuZ2V0SW5zdGFuY2VGb3JLaW5kKHRoaXMuZ2V0S2luZCgpKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgICAgICB9LFxyXG4gICAgICAgIGdldEluZm9Gb3JTaWduYXR1cmU6IGZ1bmN0aW9uKHNpZ25hdHVyZSkge1xyXG4gICAgICAgICAgICB2YXIgZXh0cmEgPSB0aGlzLmdldEV4dHJhKCk7XHJcbiAgICAgICAgICAgIGlmKCFleHRyYS5zaWduYXR1cmVzKVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICAgICAgICAgIHJldHVybiBleHRyYS5zaWduYXR1cmVzW3NpZ25hdHVyZV07XHJcbiAgICAgICAgfSxcclxuICAgICAgICBzZXRJbmZvRm9yU2lnbmF0dXJlOiBmdW5jdGlvbihzaWduYXR1cmUsIGluZm8pIHtcclxuICAgICAgICAgICAgdmFyIGV4dHJhID0gdGhpcy5nZXRFeHRyYSgpO1xyXG4gICAgICAgICAgICBpZighZXh0cmEuc2lnbmF0dXJlcylcclxuICAgICAgICAgICAgICAgIGV4dHJhLnNpZ25hdHVyZXMgPSB7fTtcclxuICAgICAgICAgICAgcmV0dXJuIGV4dHJhLnNpZ25hdHVyZXNbc2lnbmF0dXJlXSA9IGluZm87XHJcbiAgICAgICAgfVxyXG5cclxuXHJcbiAgICB9KVxyXG5cclxuXHJcbiAgICAvKipcclxuICAgICAqIEBwYXJhbSB7Q29udGV4dHxudWxsfSBwYXJlbnRcclxuICAgICAqIEBwYXJhbSBvcHRcclxuICAgICAqIEBjb25zdHJ1Y3RvclxyXG4gICAgICovXHJcbiAgICB2YXIgQ29udGV4dCA9IGZ1bmN0aW9uKG5vZGUsIHBhcmVudCwgb3B0KSB7XHJcbiAgICAgICAgb3B0ID0gb3B0IHx8IHt9O1xyXG5cclxuICAgICAgICAvKiogQHR5cGUgKENvbnRleHR8bnVsbCkgKi9cclxuICAgICAgICB0aGlzLnBhcmVudCA9IHBhcmVudCB8fCBvcHQucGFyZW50IHx8IG51bGw7XHJcbiAgICAgICAgdGhpcy5yZWdpc3RlcnkgPSBwYXJlbnQgPyBwYXJlbnQucmVnaXN0ZXJ5IDoge307XHJcblxyXG4gICAgICAgIHRoaXMuY29udGV4dCA9IG5vZGUuY29udGV4dCA9IG5vZGUuY29udGV4dCB8fCB7fTtcclxuXHJcbiAgICAgICAgLyoqIEB0eXBlIHtPYmplY3QuPHN0cmluZywge2luaXRpYWxpemVkOiBib29sZWFuLCBhbm5vdGF0aW9uOiBBbm5vdGF0aW9ufT59ICovXHJcbiAgICAgICAgdGhpcy5jb250ZXh0LmJpbmRpbmdzID0gdGhpcy5jb250ZXh0LmJpbmRpbmdzIHx8IHt9O1xyXG4gICAgICAgIGlmKG9wdC5iaW5kaW5ncykge1xyXG4gICAgICAgICAgICBCYXNlLmV4dGVuZCh0aGlzLmNvbnRleHQuYmluZGluZ3MsIG9wdC5iaW5kaW5ncyk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLmNvbnRleHQubmFtZSA9IG9wdC5uYW1lIHx8IG5vZGUubmFtZSB8fCBcIjxhbm9ueW1vdXM+XCI7XHJcblxyXG4gICAgfTtcclxuXHJcbiAgICBCYXNlLmV4dGVuZChDb250ZXh0LnByb3RvdHlwZSwge1xyXG5cclxuICAgICAgICBnZXROYW1lOiBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuY29udGV4dC5uYW1lO1xyXG4gICAgICAgIH0sXHJcblxyXG4gICAgICAgIGdldEJpbmRpbmdzOiBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuY29udGV4dC5iaW5kaW5ncztcclxuICAgICAgICB9LFxyXG5cclxuICAgICAgICB1cGRhdGVSZXR1cm5JbmZvOiBmdW5jdGlvbihhbm5vdGF0aW9uKSB7XHJcbiAgICAgICAgICAgIHRoaXMuY29udGV4dC5yZXR1cm5JbmZvID0gYW5ub3RhdGlvbi5nZXRFeHRyYSgpO1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgZ2V0UmV0dXJuSW5mbzogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmNvbnRleHQucmV0dXJuSW5mbztcclxuICAgICAgICB9LFxyXG5cclxuICAgICAgICAvKipcclxuICAgICAgICAgKiBAcGFyYW0ge3N0cmluZ30gbmFtZVxyXG4gICAgICAgICAqIEByZXR1cm5zIHsqfVxyXG4gICAgICAgICAqL1xyXG4gICAgICAgIGdldEJpbmRpbmdCeU5hbWU6IGZ1bmN0aW9uKG5hbWUpIHtcclxuICAgICAgICAgICAgdmFyIGJpbmRpbmdzID0gdGhpcy5nZXRCaW5kaW5ncygpO1xyXG4gICAgICAgICAgICB2YXIgYmluZGluZyA9IGJpbmRpbmdzW25hbWVdO1xyXG4gICAgICAgICAgICBpZihiaW5kaW5nICE9PSB1bmRlZmluZWQpXHJcbiAgICAgICAgICAgICAgICByZXR1cm4gbmV3IEJpbmRpbmcoYmluZGluZywgdGhpcy5yZWdpc3RlcnkpO1xyXG4gICAgICAgICAgICBpZiAodGhpcy5wYXJlbnQpXHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5wYXJlbnQuZ2V0QmluZGluZ0J5TmFtZShuYW1lKTtcclxuICAgICAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcclxuICAgICAgICB9LFxyXG5cclxuICAgICAgICAvKipcclxuICAgICAgICAgKiBAcGFyYW0ge3N0cmluZ30gbmFtZVxyXG4gICAgICAgICAqIEByZXR1cm5zIHtDb250ZXh0fG51bGx9XHJcbiAgICAgICAgICovXHJcbiAgICAgICAgZ2V0Q29udGV4dEZvck5hbWU6IGZ1bmN0aW9uKG5hbWUpIHtcclxuICAgICAgICAgICAgdmFyIGJpbmRpbmdzID0gdGhpcy5nZXRCaW5kaW5ncygpO1xyXG4gICAgICAgICAgICBpZihiaW5kaW5nc1tuYW1lXSAhPT0gdW5kZWZpbmVkKVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLnBhcmVudClcclxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLnBhcmVudC5nZXRDb250ZXh0Rm9yTmFtZShuYW1lKTtcclxuICAgICAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICAgICAgfSxcclxuXHJcbiAgICAgICAgZ2V0VmFyaWFibGVJZGVudGlmaWVyOiBmdW5jdGlvbihuYW1lKSB7XHJcbiAgICAgICAgICAgIHZhciBjb250ZXh0ID0gdGhpcy5nZXRDb250ZXh0Rm9yTmFtZShuYW1lKTtcclxuICAgICAgICAgICAgaWYoIWNvbnRleHQpXHJcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgICAgICAgICAgcmV0dXJuIGNvbnRleHQuc3RyKCkgKyBcIi5cIiArIG5hbWU7XHJcbiAgICAgICAgfSxcclxuXHJcbiAgICAgICAgZGVjbGFyZVZhcmlhYmxlOiBmdW5jdGlvbihuYW1lLCBmYWlsLCBwb3NpdGlvbikge1xyXG4gICAgICAgICAgICB2YXIgYmluZGluZ3MgPSB0aGlzLmdldEJpbmRpbmdzKCk7XHJcbiAgICAgICAgICAgIGZhaWwgPSAoZmFpbCA9PSB1bmRlZmluZWQpID8gdHJ1ZSA6IGZhaWw7XHJcbiAgICAgICAgICAgIGlmIChiaW5kaW5nc1tuYW1lXSkge1xyXG4gICAgICAgICAgICAgICAgaWYgKGZhaWwpIHtcclxuICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IobmFtZSArIFwiIHdhcyBhbHJlYWR5IGRlY2xhcmVkIGluIHRoaXMgc2NvcGUuXCIpXHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgdmFyIGluaXQgPSB7XHJcbiAgICAgICAgICAgICAgICBpbml0aWFsaXplZCA6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgaW5pdFBvc2l0aW9uOiBwb3NpdGlvbixcclxuICAgICAgICAgICAgICAgIGV4dHJhOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogVFlQRVMuVU5ERUZJTkVEXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgIGJpbmRpbmdzW25hbWVdID0gaW5pdDtcclxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgfSxcclxuXHJcbiAgICAgICAgLyoqXHJcbiAgICAgICAgICpcclxuICAgICAgICAgKiBAcGFyYW0ge3N0cmluZ30gbmFtZVxyXG4gICAgICAgICAqIEBwYXJhbSB7VHlwZUluZm99IHR5cGVJbmZvXHJcbiAgICAgICAgICovXHJcbiAgICAgICAgdXBkYXRlRXhwcmVzc2lvbjogZnVuY3Rpb24gKG5hbWUsIHR5cGVJbmZvKSB7XHJcbiAgICAgICAgICAgIHZhciB2ID0gdGhpcy5nZXRCaW5kaW5nQnlOYW1lKG5hbWUpO1xyXG4gICAgICAgICAgICBpZiAoIXYpIHtcclxuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIlZhcmlhYmxlIHdhcyBub3QgZGVjbGFyZWQgaW4gdGhpcyBzY29wZTogXCIgKyBuYW1lKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAodi5pc0luaXRpYWxpemVkKCkgJiYgdi5nZXRUeXBlKCkgIT09IHR5cGVJbmZvLmdldFR5cGUoKSkge1xyXG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiVmFyaWFibGUgbWF5IG5vdCBjaGFuZ2UgaXQncyB0eXBlOiBcIiArIG5hbWUpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmICghdi5pc0luaXRpYWxpemVkKCkpIHtcclxuICAgICAgICAgICAgICAgIC8vIEFubm90YXRlIHRoZSBkZWNsYXJhdGlvbiwgaWYgb25lIGlzIGdpdmVuXHJcbiAgICAgICAgICAgICAgICBpZih2Lm5vZGUuaW5pdFBvc2l0aW9uKVxyXG4gICAgICAgICAgICAgICAgICAgIHYubm9kZS5pbml0UG9zaXRpb24uY29weSh0eXBlSW5mbyk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHYuY29weSh0eXBlSW5mbyk7XHJcbiAgICAgICAgICAgIHYuc2V0RHluYW1pY1ZhbHVlKCk7XHJcbiAgICAgICAgICAgIHYuc2V0SW5pdGlhbGl6ZWQoIXR5cGVJbmZvLmlzVW5kZWZpbmVkKCkpO1xyXG4gICAgICAgIH0sXHJcblxyXG4gICAgICAgIHJlZ2lzdGVyT2JqZWN0OiBmdW5jdGlvbihuYW1lLCBvYmopIHtcclxuICAgICAgICAgICAgdGhpcy5yZWdpc3Rlcnlbb2JqLmlkXSA9IG9iajtcclxuICAgICAgICAgICAgdmFyIGJpbmRpbmdzID0gdGhpcy5nZXRCaW5kaW5ncygpO1xyXG4gICAgICAgICAgICBiaW5kaW5nc1tuYW1lXSA9IHtcclxuICAgICAgICAgICAgICAgIGV4dHJhOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogVFlQRVMuT0JKRUNUXHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgcmVmOiBvYmouaWRcclxuICAgICAgICAgICAgfTtcclxuICAgICAgICB9LFxyXG5cclxuICAgICAgICBkZWNsYXJlUGFyYW1ldGVyczogZnVuY3Rpb24ocGFyYW1zKSB7XHJcbiAgICAgICAgICAgIHZhciBiaW5kaW5ncyA9IHRoaXMuZ2V0QmluZGluZ3MoKTtcclxuICAgICAgICAgICAgdGhpcy5wYXJhbXMgPSBbXTtcclxuICAgICAgICAgICAgZm9yKHZhciBpID0gMDsgaSA8IHBhcmFtcy5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgICAgICAgICAgdmFyIHBhcmFtZXRlciA9IHBhcmFtc1tpXTtcclxuICAgICAgICAgICAgICAgIHRoaXMucGFyYW1zW2ldID0gcGFyYW1ldGVyLm5hbWU7XHJcbiAgICAgICAgICAgICAgICBiaW5kaW5nc1twYXJhbWV0ZXIubmFtZV0gPSB7IHR5cGU6IFRZUEVTLlVOREVGSU5FRCB9O1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSxcclxuXHJcbiAgICAgICAgLyoqXHJcbiAgICAgICAgICpcclxuICAgICAgICAgKiBAcGFyYW0ge0FycmF5LjxUeXBlSW5mbz59IDxwYXJhbXNcclxuICAgICAgICAgKi9cclxuICAgICAgICBpbmplY3RQYXJhbWV0ZXJzOiBmdW5jdGlvbihwYXJhbXMpIHtcclxuICAgICAgICAgICAgZm9yKHZhciBpID0gMDsgaTwgcGFyYW1zLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoaSA9PSB0aGlzLnBhcmFtcy5sZW5ndGgpXHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICB2YXIgbmFtZSA9IHRoaXMucGFyYW1zW2ldO1xyXG4gICAgICAgICAgICAgICAgdmFyIGJpbmRpbmdzID0gdGhpcy5nZXRCaW5kaW5ncygpO1xyXG4gICAgICAgICAgICAgICAgYmluZGluZ3NbbmFtZV0gPSB7IGV4dHJhOiB7fSB9O1xyXG4gICAgICAgICAgICAgICAgQmFzZS5kZWVwRXh0ZW5kKGJpbmRpbmdzW25hbWVdLmV4dHJhLCBwYXJhbXNbaV0uZ2V0RXh0cmEoKSk7XHJcbiAgICAgICAgICAgICAgICBpZiAocGFyYW1zW2ldLmdldE5vZGVJbmZvKCkpIHtcclxuICAgICAgICAgICAgICAgICAgICBiaW5kaW5nc1tuYW1lXS5pbmZvID0ge307XHJcbiAgICAgICAgICAgICAgICAgICAgQmFzZS5kZWVwRXh0ZW5kKGJpbmRpbmdzW25hbWVdLmluZm8sIHBhcmFtc1tpXS5nZXROb2RlSW5mbygpKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0sXHJcblxyXG4gICAgICAgIHN0cjogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgIHZhciBjdHggPSB0aGlzO1xyXG4gICAgICAgICAgICB2YXIgbmFtZXMgPSBbXTtcclxuICAgICAgICAgICAgd2hpbGUoY3R4KSB7XHJcbiAgICAgICAgICAgICAgICBuYW1lcy51bnNoaWZ0KGN0eC5nZXROYW1lKCkpO1xyXG4gICAgICAgICAgICAgICAgY3R4ID0gY3R4LnBhcmVudDtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICByZXR1cm4gbmFtZXMuam9pbihcIi5cIik7XHJcbiAgICAgICAgfSxcclxuXHJcbiAgICAgICAgZ2V0QWxsQmluZGluZ3M6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICB2YXIgcmVzdWx0ID0gT2JqZWN0LmtleXModGhpcy5nZXRCaW5kaW5ncygpKTtcclxuICAgICAgICAgICAgaWYgKHRoaXMucGFyZW50KSB7XHJcbiAgICAgICAgICAgICAgICB2YXIgcGFyZW50QmluZGluZ3MgPSB0aGlzLnBhcmVudC5nZXRBbGxCaW5kaW5ncygpO1xyXG4gICAgICAgICAgICAgICAgZm9yKHZhciBpID0gMDsgaSA8IHBhcmVudEJpbmRpbmdzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHJlc3VsdC5pbmRleE9mKHBhcmVudEJpbmRpbmdzW2ldKSAhPT0gLTEpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmVzdWx0LnB1c2gocGFyZW50QmluZGluZ3NbaV0pO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICByZXR1cm4gcmVzdWx0O1xyXG4gICAgICAgIH0sXHJcblxyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqXHJcbiAgICAgICAgICogQHBhcmFtIG5vZGVcclxuICAgICAgICAgKiBAcmV0dXJucyB7VHlwZUluZm99XHJcbiAgICAgICAgICovXHJcbiAgICAgICAgY3JlYXRlVHlwZUluZm86IGZ1bmN0aW9uIChub2RlKSB7XHJcbiAgICAgICAgICAgIHZhciByZXN1bHQgPSBuZXcgQW5ub3RhdGlvbihub2RlKTtcclxuICAgICAgICAgICAgaWYgKHJlc3VsdC5nZXRUeXBlKCkgIT09IFRZUEVTLkFOWSkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHJlc3VsdDtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKG5vZGUudHlwZSA9PSBTeW50YXguSWRlbnRpZmllcikge1xyXG4gICAgICAgICAgICAgICAgdmFyIG5hbWUgPSBub2RlLm5hbWU7XHJcbiAgICAgICAgICAgICAgICB2YXIgYmluZGluZyA9IHRoaXMuZ2V0QmluZGluZ0J5TmFtZShuYW1lKTtcclxuICAgICAgICAgICAgICAgIGlmICghYmluZGluZykge1xyXG4gICAgICAgICAgICAgICAgICAgIFNoYWRlLnRocm93RXJyb3Iobm9kZSwgXCJSZWZlcmVuY2VFcnJvcjogXCIgKyBuYW1lICsgXCIgaXMgbm90IGRlZmluZWRcIik7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gYmluZGluZztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICByZXR1cm4gcmVzdWx0O1xyXG4gICAgICAgIH0sXHJcblxyXG4gICAgICAgIGdldE9iamVjdEluZm9Gb3I6IGZ1bmN0aW9uKG9iaikge1xyXG4gICAgICAgICAgICBpZiAoIW9iai5pc09iamVjdCgpKVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XHJcblxyXG4gICAgICAgICAgICAvKiBUaGUgVHlwZUluZm8gbWlnaHQga25vdyBhYm91dCBpdCdzIG9iamVjdCB0eXBlICovXHJcbiAgICAgICAgICAgIGlmIChvYmouZ2V0T2JqZWN0SW5mbykge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIG9iai5nZXRPYmplY3RJbmZvKCk7XHJcbiAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgICB2YXIgbm9kZUluZm8gPSBvYmouZ2V0Tm9kZUluZm8oKTtcclxuICAgICAgICAgICAgaWYgKG5vZGVJbmZvKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKFwiRm91bmQgTm9kZUluZm9cIik7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gbm9kZUluZm87XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmV0dXJuIHJlZ2lzdHJ5LmdldEluc3RhbmNlRm9yS2luZChvYmouZ2V0S2luZCgpKVxyXG4gICAgICAgIH1cclxuXHJcbiAgICB9KTtcclxuXHJcblxyXG4gICAgICAgIHJldHVybiBDb250ZXh0O1xyXG5cclxuICAgIH07XHJcblxyXG5cclxuXHJcbn0oZXhwb3J0cykpO1xyXG4iLCIoZnVuY3Rpb24obnMpe1xyXG5cclxuICAgIG5zLmV4dGVuZCA9IGZ1bmN0aW9uKGEsIGIpIHtcclxuICAgICAgICBmb3IgKCB2YXIgcHJvcCBpbiBiKSB7XHJcbiAgICAgICAgICAgIHZhciBnID0gYi5fX2xvb2t1cEdldHRlcl9fKHByb3ApLCBzID0gYi5fX2xvb2t1cFNldHRlcl9fKHByb3ApO1xyXG4gICAgICAgICAgICBpZiAoZ3x8cykge1xyXG4gICAgICAgICAgICAgICAgaWYgKGcpIHtcclxuICAgICAgICAgICAgICAgICAgICBhLl9fZGVmaW5lR2V0dGVyX18ocHJvcCwgZyk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBpZiAocykge1xyXG4gICAgICAgICAgICAgICAgICAgIGEuX19kZWZpbmVTZXR0ZXJfXyhwcm9wLCBzKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIGlmIChiW3Byb3BdID09PSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgICAgICAgICBkZWxldGUgYVtwcm9wXTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAocHJvcCAhPT0gXCJjb25zdHJ1Y3RvclwiIHx8IGEgIT09IHdpbmRvdykge1xyXG4gICAgICAgICAgICAgICAgICAgIGFbcHJvcF0gPSBiW3Byb3BdO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBhO1xyXG4gICAgfTtcclxuXHJcbiAgICBucy5kZWVwRXh0ZW5kID0gZnVuY3Rpb24oZGVzdGluYXRpb24sIHNvdXJjZSkge1xyXG4gICAgICAgIGZvciAodmFyIHByb3BlcnR5IGluIHNvdXJjZSkge1xyXG4gICAgICAgICAgICBpZiAodHlwZW9mIHNvdXJjZVtwcm9wZXJ0eV0gPT09IFwib2JqZWN0XCIgJiYgc291cmNlW3Byb3BlcnR5XSAhPT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgZGVzdGluYXRpb25bcHJvcGVydHldID0gZGVzdGluYXRpb25bcHJvcGVydHldIHx8IHt9O1xyXG4gICAgICAgICAgICAgICAgbnMuZGVlcEV4dGVuZChkZXN0aW5hdGlvbltwcm9wZXJ0eV0sIHNvdXJjZVtwcm9wZXJ0eV0pO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgZGVzdGluYXRpb25bcHJvcGVydHldID0gc291cmNlW3Byb3BlcnR5XTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH07XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKlxyXG4gICAgICogQHBhcmFtIHtPYmplY3R9IGN0b3IgQ29uc3RydWN0b3JcclxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBwYXJlbnQgUGFyZW50IGNsYXNzXHJcbiAgICAgKiBAcGFyYW0ge09iamVjdD19IG1ldGhvZHMgTWV0aG9kcyB0byBhZGQgdG8gdGhlIGNsYXNzXHJcbiAgICAgKiBAcmV0dXJuIHtPYmplY3QhfVxyXG4gICAgICovXHJcbiAgICBucy5jcmVhdGVDbGFzcyA9IGZ1bmN0aW9uKGN0b3IsIHBhcmVudCwgbWV0aG9kcykge1xyXG4gICAgICAgIG1ldGhvZHMgPSBtZXRob2RzIHx8IHt9O1xyXG4gICAgICAgIGlmIChwYXJlbnQpIHtcclxuICAgICAgICAgICAgLyoqIEBjb25zdHJ1Y3RvciAqL1xyXG4gICAgICAgICAgICB2YXIgRiA9IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICBGLnByb3RvdHlwZSA9IHBhcmVudC5wcm90b3R5cGU7XHJcbiAgICAgICAgICAgIGN0b3IucHJvdG90eXBlID0gbmV3IEYoKTtcclxuICAgICAgICAgICAgY3Rvci5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBjdG9yO1xyXG4gICAgICAgICAgICBjdG9yLnN1cGVyY2xhc3MgPSBwYXJlbnQucHJvdG90eXBlO1xyXG4gICAgICAgIH1cclxuICAgICAgICBmb3IgKCB2YXIgbSBpbiBtZXRob2RzKSB7XHJcbiAgICAgICAgICAgIGN0b3IucHJvdG90eXBlW21dID0gbWV0aG9kc1ttXTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIGN0b3I7XHJcbiAgICB9O1xyXG5cclxuXHJcbn0oZXhwb3J0cykpXHJcbiIsIihmdW5jdGlvbihucyl7XHJcblxyXG4gICAgdmFyIFNoYWRlID0gcmVxdWlyZShcIi4uL2ludGVyZmFjZXMuanNcIiksXHJcbiAgICAgICAgU3ludGF4ID0gcmVxdWlyZSgnZXN0cmF2ZXJzZScpLlN5bnRheCxcclxuICAgICAgICBCYXNlID0gcmVxdWlyZShcIi4vaW5kZXguanNcIik7XHJcblxyXG4gICAgdmFyIFRZUEVTID0gU2hhZGUuVFlQRVMsXHJcbiAgICAgICAgS0lORFMgPSBTaGFkZS5PQkpFQ1RfS0lORFM7XHJcblxyXG5cclxuICAgIC8qKlxyXG4gICAgICogQHBhcmFtIHsqfSBub2RlIENhcnJpZXIgb2JqZWN0IGZvciB0aGUgdHlwZSBpbmZvLCBvbmx5IG5vZGUuZXh0cmEgZ2V0cyBwb2xsdXRlZFxyXG4gICAgICogQHBhcmFtIHtPYmplY3Q/fSBleHRyYVxyXG4gICAgICogQGNvbnN0cnVjdG9yXHJcbiAgICAgKi9cclxuICAgIHZhciBUeXBlSW5mbyA9IGZ1bmN0aW9uIChub2RlLCBleHRyYSkge1xyXG4gICAgICAgIHRoaXMubm9kZSA9IG5vZGU7XHJcbiAgICAgICAgdGhpcy5ub2RlLmV4dHJhID0gdGhpcy5ub2RlLmV4dHJhIHx8IHt9O1xyXG4gICAgICAgIGlmIChleHRyYSkge1xyXG4gICAgICAgICAgICBCYXNlLmRlZXBFeHRlbmQodGhpcy5ub2RlLmV4dHJhLCBleHRyYSk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIFR5cGVJbmZvLmNyZWF0ZUZvckNvbnRleHQgPSBmdW5jdGlvbihub2RlLCBjdHgpIHtcclxuICAgICAgICB2YXIgcmVzdWx0ID0gbmV3IFR5cGVJbmZvKG5vZGUpO1xyXG4gICAgICAgIGlmIChyZXN1bHQuZ2V0VHlwZSgpICE9PSBUWVBFUy5BTlkpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHJlc3VsdDtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChub2RlLnR5cGUgPT0gU3ludGF4LklkZW50aWZpZXIpIHtcclxuICAgICAgICAgICAgdmFyIG5hbWUgPSBub2RlLm5hbWU7XHJcbiAgICAgICAgICAgIHZhciB2YXJpYWJsZSA9IGN0eC5nZXRCaW5kaW5nQnlOYW1lKG5hbWUpO1xyXG4gICAgICAgICAgICByZXR1cm4gbmV3IFR5cGVJbmZvKG5vZGUsIHZhcmlhYmxlKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcclxuICAgIH1cclxuXHJcbiAgICBUeXBlSW5mby5wcm90b3R5cGUgPSB7XHJcbiAgICAgICAgZ2V0RXh0cmE6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMubm9kZS5leHRyYTtcclxuICAgICAgICB9LFxyXG4gICAgICAgIGdldFR5cGU6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgdmFyIGV4dHJhID0gdGhpcy5nZXRFeHRyYSgpO1xyXG4gICAgICAgICAgICBpZiAoZXh0cmEudHlwZSAhPSB1bmRlZmluZWQpXHJcbiAgICAgICAgICAgICAgICByZXR1cm4gZXh0cmEudHlwZTtcclxuICAgICAgICAgICAgcmV0dXJuIFRZUEVTLkFOWTtcclxuICAgICAgICB9LFxyXG5cclxuICAgICAgICBzZXRLaW5kOiBmdW5jdGlvbiAoa2luZCkge1xyXG4gICAgICAgICAgICB2YXIgZXh0cmEgPSB0aGlzLmdldEV4dHJhKCk7XHJcbiAgICAgICAgICAgIGV4dHJhLmtpbmQgPSBraW5kO1xyXG4gICAgICAgIH0sXHJcblxyXG4gICAgICAgIGdldEtpbmQ6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgaWYgKCF0aGlzLmlzT2JqZWN0KCkpXHJcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuZ2V0RXh0cmEoKS5raW5kIHx8IEtJTkRTLkFOWTtcclxuICAgICAgICB9LFxyXG5cclxuICAgICAgICBnZXRBcnJheUVsZW1lbnRUeXBlOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgIGlmKCF0aGlzLmlzQXJyYXkoKSlcclxuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIkNhbGxlZCBnZXRBcnJheUVsZW1lbnRUeXBlIG9uIFwiICsgdGhpcy5nZXRUeXBlKCkpO1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5nZXRFeHRyYSgpLmVsZW1lbnRzO1xyXG4gICAgICAgIH0sXHJcblxyXG4gICAgICAgIGlzT2ZLaW5kOiBmdW5jdGlvbihraW5kKSB7XHJcbiAgICAgICAgICAgIGlmICghdGhpcy5pc09iamVjdCgpKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuZ2V0S2luZCgpID09IGtpbmQ7XHJcbiAgICAgICAgfSxcclxuXHJcbiAgICAgICAgLyoqXHJcbiAgICAgICAgICogQHBhcmFtIHtzdHJpbmd9IHR5cGVcclxuICAgICAgICAgKiBAcGFyYW0ge3N0cmluZz99IGtpbmRcclxuICAgICAgICAgKi9cclxuICAgICAgICBzZXRUeXBlOiBmdW5jdGlvbiAodHlwZSwga2luZCkge1xyXG4gICAgICAgICAgICB2YXIgZXh0cmEgPSB0aGlzLmdldEV4dHJhKCk7XHJcbiAgICAgICAgICAgIGV4dHJhLnR5cGUgPSB0eXBlO1xyXG4gICAgICAgICAgICBpZiAoa2luZClcclxuICAgICAgICAgICAgICAgIHRoaXMuc2V0S2luZChraW5kKTtcclxuICAgICAgICB9LFxyXG5cclxuICAgICAgICBpc09mVHlwZTogZnVuY3Rpb24gKHR5cGUpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuZ2V0VHlwZSgpID09IHR5cGU7XHJcbiAgICAgICAgfSxcclxuXHJcbiAgICAgICAgZXF1YWxzOiBmdW5jdGlvbiAob3RoZXIpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuZ2V0VHlwZSgpID09IG90aGVyLmdldFR5cGUoKSAmJiB0aGlzLmdldEtpbmQoKSA9PSBvdGhlci5nZXRLaW5kKCk7XHJcbiAgICAgICAgfSxcclxuXHJcbiAgICAgICAgaXNJbnQ6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuaXNPZlR5cGUoVFlQRVMuSU5UKTtcclxuICAgICAgICB9LFxyXG4gICAgICAgIGlzTnVtYmVyOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmlzT2ZUeXBlKFRZUEVTLk5VTUJFUik7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBpc051bGxPclVuZGVmaW5lZDogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5pc051bGwoKSB8fCB0aGlzLmlzVW5kZWZpbmVkKCk7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBpc051bGw6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuaXNPZlR5cGUoVFlQRVMuTlVMTCk7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBpc1VuZGVmaW5lZDogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5pc09mVHlwZShUWVBFUy5VTkRFRklORUQpO1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgaXNCb29sOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmlzT2ZUeXBlKFRZUEVTLkJPT0xFQU4pO1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgaXNTdHJpbmc6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuaXNPZlR5cGUoVFlQRVMuU1RSSU5HKTtcclxuICAgICAgICB9LFxyXG4gICAgICAgIGlzQXJyYXk6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuaXNPZlR5cGUoVFlQRVMuQVJSQVkpO1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgaXNGdW5jdGlvbjogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5pc09mVHlwZShUWVBFUy5GVU5DVElPTik7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBpc09iamVjdDogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5pc09mVHlwZShUWVBFUy5PQkpFQ1QpO1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgaXNHbG9iYWw6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICByZXR1cm4gISF0aGlzLmdldEV4dHJhKCkuZ2xvYmFsO1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgc2V0R2xvYmFsOiBmdW5jdGlvbiAoZ2xvYmFsKSB7XHJcbiAgICAgICAgICAgIHZhciBleHRyYSA9IHRoaXMuZ2V0RXh0cmEoKTtcclxuICAgICAgICAgICAgZXh0cmEuZ2xvYmFsID0gZ2xvYmFsO1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgY2FuTnVtYmVyOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmlzTnVtYmVyKCkgfHwgdGhpcy5pc0ludCgpIHx8IHRoaXMuaXNCb29sKCk7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBjYW5JbnQ6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuaXNJbnQoKSB8fCB0aGlzLmlzQm9vbCgpO1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgaGFzU3RhdGljVmFsdWUgOiBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgdmFyIGV4dHJhID0gdGhpcy5nZXRFeHRyYSgpO1xyXG4gICAgICAgICAgICBpZiAodGhpcy5pc051bGxPclVuZGVmaW5lZCgpKVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgICAgIHJldHVybiBleHRyYS5oYXNPd25Qcm9wZXJ0eShcInN0YXRpY1ZhbHVlXCIpO1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgc2V0U3RhdGljVmFsdWUgOiBmdW5jdGlvbih2KSB7XHJcbiAgICAgICAgICAgIHZhciBleHRyYSA9IHRoaXMuZ2V0RXh0cmEoKTtcclxuICAgICAgICAgICAgaWYgKHRoaXMuaXNOdWxsT3JVbmRlZmluZWQoKSlcclxuICAgICAgICAgICAgICAgIHRocm93KFwiTnVsbCBhbmQgdW5kZWZpbmVkIGhhdmUgcHJlZGVmaW5lZCB2YWx1ZXMuXCIpO1xyXG4gICAgICAgICAgICBleHRyYS5zdGF0aWNWYWx1ZSA9IHY7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBnZXRTdGF0aWNWYWx1ZSA6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICBpZiAoIXRoaXMuaGFzU3RhdGljVmFsdWUoKSkge1xyXG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiTm9kZSBoYXMgbm8gc3RhdGljIHZhbHVlOiBcIiArIHRoaXMubm9kZSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKHRoaXMuaXNOdWxsKCkpXHJcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgICAgICAgICAgaWYgKHRoaXMuaXNVbmRlZmluZWQoKSlcclxuICAgICAgICAgICAgICAgIHJldHVybiB1bmRlZmluZWQ7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmdldEV4dHJhKCkuc3RhdGljVmFsdWU7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBzZXREeW5hbWljVmFsdWUgOiBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgZGVsZXRlIHRoaXMuZ2V0RXh0cmEoKS5zdGF0aWNWYWx1ZTtcclxuICAgICAgICB9LFxyXG4gICAgICAgIHNldENhbGwgOiBmdW5jdGlvbihjYWxsKSB7XHJcbiAgICAgICAgICAgIHZhciBleHRyYSA9IHRoaXMuZ2V0RXh0cmEoKTtcclxuICAgICAgICAgICAgZXh0cmEuZXZhbHVhdGUgPSBjYWxsO1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgZ2V0Q2FsbCA6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5nZXRFeHRyYSgpLmV2YWx1YXRlO1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgY2xlYXJDYWxsOiBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgdmFyIGV4dHJhID0gdGhpcy5nZXRFeHRyYSgpO1xyXG4gICAgICAgICAgICBkZWxldGUgZXh0cmEuZXZhbHVhdGU7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBjb3B5OiBmdW5jdGlvbihvdGhlcikge1xyXG4gICAgICAgICAgICBCYXNlLmRlZXBFeHRlbmQodGhpcy5ub2RlLmV4dHJhLCBvdGhlci5nZXRFeHRyYSgpKTtcclxuICAgICAgICB9LFxyXG4gICAgICAgIHN0cjogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgIHZhciBleHRyYSA9IHRoaXMuZ2V0RXh0cmEoKTtcclxuICAgICAgICAgICAgcmV0dXJuIEpTT04uc3RyaW5naWZ5KGV4dHJhLCBudWxsLCAxKTtcclxuICAgICAgICB9LFxyXG4gICAgICAgIGNhbk5vcm1hbDogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmlzT2JqZWN0KCkgJiYgKHRoaXMuaXNPZktpbmQoS0lORFMuTk9STUFMKSB8fCB0aGlzLmlzT2ZLaW5kKEtJTkRTLkZMT0FUMykpO1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgY2FuQ29sb3I6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5pc09iamVjdCgpICYmICh0aGlzLmlzT2ZLaW5kKEtJTkRTLkZMT0FUNCkgfHwgdGhpcy5pc09mS2luZChLSU5EUy5GTE9BVDMpKTtcclxuICAgICAgICB9LFxyXG4gICAgICAgIGVsaW1pbmF0ZSA6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICB2YXIgZXh0cmEgPSB0aGlzLmdldEV4dHJhKCk7XHJcbiAgICAgICAgICAgIGV4dHJhLmVsaW1pbmF0ZSA9IHRydWU7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBjYW5FbGltaW5hdGUgOiBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgdmFyIGV4dHJhID0gdGhpcy5nZXRFeHRyYSgpO1xyXG4gICAgICAgICAgICByZXR1cm4gZXh0cmEuZWxpbWluYXRlID09IHRydWU7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBzZXRGcm9tRXh0cmE6IGZ1bmN0aW9uKGV4dHJhKXtcclxuICAgICAgICAgICAgdGhpcy5zZXRUeXBlKGV4dHJhLnR5cGUpO1xyXG4gICAgICAgICAgICBpZiAoZXh0cmEua2luZCAhPSB1bmRlZmluZWQpXHJcbiAgICAgICAgICAgICAgICB0aGlzLnNldEtpbmQoZXh0cmEua2luZCk7XHJcbiAgICAgICAgICAgIHRoaXMuc2V0R2xvYmFsKGV4dHJhLmdsb2JhbCk7XHJcbiAgICAgICAgICAgIGlmIChleHRyYS5zdGF0aWNWYWx1ZSAhPSB1bmRlZmluZWQpXHJcbiAgICAgICAgICAgICAgICB0aGlzLnNldFN0YXRpY1ZhbHVlKGV4dHJhLnN0YXRpY1ZhbHVlKTtcclxuICAgICAgICAgICAgaWYgKGV4dHJhLmV2YWx1YXRlICE9IHVuZGVmaW5lZClcclxuICAgICAgICAgICAgICAgIHRoaXMuc2V0Q2FsbChleHRyYS5ldmFsdWF0ZSk7XHJcbiAgICAgICAgICAgIGlmIChleHRyYS5zb3VyY2UgIT0gdW5kZWZpbmVkKVxyXG4gICAgICAgICAgICAgICAgdGhpcy5zZXRTb3VyY2UoZXh0cmEuc291cmNlKTtcclxuICAgICAgICB9LFxyXG4gICAgICAgIGdldE5vZGVJbmZvOiBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgaWYgKHRoaXMuaXNPYmplY3QoKSlcclxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLm5vZGUuaW5mbztcclxuICAgICAgICB9LFxyXG4gICAgICAgIGdldFR5cGVTdHJpbmc6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICBpZiAodGhpcy5pc09iamVjdCgpKVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIFwiT2JqZWN0ICM8XCIgKyB0aGlzLmdldEtpbmQoKSArIFwiPlwiO1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5nZXRUeXBlKCk7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBzZXRTb3VyY2U6IGZ1bmN0aW9uKHNvdXJjZSkge1xyXG4gICAgICAgICAgICB2YXIgZXh0cmEgPSB0aGlzLmdldEV4dHJhKCk7XHJcbiAgICAgICAgICAgIGV4dHJhLnNvdXJjZSA9IHNvdXJjZTtcclxuICAgICAgICB9LFxyXG4gICAgICAgIGdldFNvdXJjZTogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmdldEV4dHJhKCkuc291cmNlO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICB9XHJcblxyXG4gICAgbnMuVHlwZUluZm8gPSBUeXBlSW5mbztcclxuXHJcbn0oZXhwb3J0cykpO1xyXG4iLCIoZnVuY3Rpb24obnMpe1xyXG5cclxuICAgIG5zLnN3aXp6bGVUb0luZGV4ID0gZnVuY3Rpb24oc3dpenpsZUtleSl7XHJcbiAgICAgICAgc3dpdGNoKHN3aXp6bGVLZXkpe1xyXG4gICAgICAgICAgICBjYXNlICd4JzpjYXNlICdyJyA6Y2FzZSAncyc6IHJldHVybiAwO1xyXG4gICAgICAgICAgICBjYXNlICd5JzpjYXNlICdnJyA6Y2FzZSAndCc6IHJldHVybiAxO1xyXG4gICAgICAgICAgICBjYXNlICd6JzpjYXNlICdiJyA6Y2FzZSAncCc6IHJldHVybiAyO1xyXG4gICAgICAgICAgICBjYXNlICd3JzpjYXNlICdhJyA6Y2FzZSAncSc6IHJldHVybiAzO1xyXG4gICAgICAgIH1cclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJVbmtub3duIHN3aXp6bGUga2V5OiAnXCIgKyBzd2l6emxlS2V5ICsgXCInXCIpO1xyXG4gICAgfTtcclxuICAgIG5zLmluZGV4VG9Td2l6emxlID0gZnVuY3Rpb24oaW5kZXgpe1xyXG4gICAgICAgIHN3aXRjaChpbmRleCl7XHJcbiAgICAgICAgICAgIGNhc2UgMDogcmV0dXJuICd4JztcclxuICAgICAgICAgICAgY2FzZSAxOiByZXR1cm4gJ3knO1xyXG4gICAgICAgICAgICBjYXNlIDI6IHJldHVybiAneic7XHJcbiAgICAgICAgICAgIGNhc2UgMzogcmV0dXJuICd3JztcclxuICAgICAgICB9XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiVW5rbm93biBzd2l6emxlIGluZGV4OiAnXCIgKyBpbmRleCArIFwiJ1wiKTtcclxuICAgIH07XHJcbiAgICBucy5zd2l6emxlU2V0cyA9IFtcclxuICAgICAgICBbJ3gnLCAneScsICd6JywgJ3cnXSxcclxuICAgICAgICBbJ3InLCAnZycsICdiJywgJ2EnXSxcclxuICAgICAgICBbJ3MnLCAndCcsICdwJywgJ3EnXVxyXG4gICAgXTtcclxuXHJcbn0oZXhwb3J0cykpXHJcbiIsIihmdW5jdGlvbiAobnMpIHtcclxuXHJcbiAgICB2YXIgQmFzZSA9IHJlcXVpcmUoXCIuLi8uLi9iYXNlL2luZGV4LmpzXCIpO1xyXG5cclxuICAgIHZhciBUcmFuc2Zvcm1lciA9IHJlcXVpcmUoXCIuL3RyYW5zZm9ybS5qc1wiKS5HTEFTVFRyYW5zZm9ybWVyO1xyXG4gICAgdmFyIGdlbmVyYXRlID0gcmVxdWlyZShcIi4vZ2xzbC1nZW5lcmF0ZS5qc1wiKS5nZW5lcmF0ZTtcclxuXHJcbiAgICB2YXIgR0xTTENvbXBpbGVyID0gZnVuY3Rpb24gKCkge1xyXG5cclxuICAgIH07XHJcblxyXG4gICAgQmFzZS5leHRlbmQoR0xTTENvbXBpbGVyLnByb3RvdHlwZSwge1xyXG5cclxuICAgICAgICBjb21waWxlRnJhZ21lbnRTaGFkZXI6IGZ1bmN0aW9uIChhYXN0LCBvcHQpIHtcclxuXHJcbiAgICAgICAgICAgIHZhciB0cmFuc2Zvcm1lciA9IG5ldyBUcmFuc2Zvcm1lcihcImdsb2JhbC5zaGFkZVwiKTtcclxuXHJcbiAgICAgICAgICAgIC8vY29uc29sZS5sb2coSlNPTi5zdHJpbmdpZnkoYWFzdCwgMCwgXCIgXCIpKTtcclxuXHJcbiAgICAgICAgICAgIHZhciB0cmFuc2Zvcm1lZCA9IHRyYW5zZm9ybWVyLnRyYW5zZm9ybUFBU1QoYWFzdCk7XHJcblxyXG4gICAgICAgICAgICAvL2NvbnNvbGUubG9nKEpTT04uc3RyaW5naWZ5KGFhc3QsIDAsIFwiIFwiKSk7XHJcblxyXG4gICAgICAgICAgICB2YXIgY29kZSA9IGdlbmVyYXRlKHRyYW5zZm9ybWVkLCBvcHQpO1xyXG5cclxuICAgICAgICAgICAgcmV0dXJuIGNvZGU7XHJcbiAgICAgICAgfVxyXG5cclxuICAgIH0pO1xyXG5cclxuXHJcbiAgICBucy5HTFNMQ29tcGlsZXIgPSBHTFNMQ29tcGlsZXI7XHJcblxyXG59KGV4cG9ydHMpKTtcclxuIiwiKGZ1bmN0aW9uIChucykge1xyXG5cclxuICAgIHZhciBGdW5jdGlvbkFubm90YXRpb24gPSByZXF1aXJlKFwiLi8uLi8uLi9iYXNlL2Fubm90YXRpb24uanNcIikuRnVuY3Rpb25Bbm5vdGF0aW9uO1xyXG4gICAgdmFyIFNoYWRlID0gcmVxdWlyZShcIi4vLi4vLi4vaW50ZXJmYWNlcy5qc1wiKTtcclxuICAgIHZhciB3YWxrID0gcmVxdWlyZSgnZXN0cmF2ZXJzZScpLFxyXG4gICAgICAgIFN5bnRheCA9IHdhbGsuU3ludGF4LFxyXG4gICAgICAgIFZpc2l0b3JPcHRpb24gPSB3YWxrLlZpc2l0b3JPcHRpb247XHJcblxyXG4gICAgdmFyIFR5cGVzID0gU2hhZGUuVFlQRVMsXHJcbiAgICAgICAgS2luZHMgPSBTaGFkZS5PQkpFQ1RfS0lORFMsXHJcbiAgICAgICAgU291cmNlcyA9IFNoYWRlLlNPVVJDRVM7XHJcblxyXG5cclxuXHJcbiAgICAvKipcclxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBvcHRcclxuICAgICAqL1xyXG4gICAgdmFyIGdldEhlYWRlciA9IGZ1bmN0aW9uIChvcHQpIHtcclxuICAgICAgICBpZiAob3B0Lm9taXRIZWFkZXIgPT0gdHJ1ZSlcclxuICAgICAgICAgICAgcmV0dXJuIFtdO1xyXG4gICAgICAgIHZhciBoZWFkZXIgPSBbXHJcbiAgICAgICAgICAgIFwiLy8gR2VuZXJhdGVkIGJ5IHNoYWRlLmpzXCJcclxuICAgICAgICBdO1xyXG4gICAgICAgIHZhciBmbG9hdFByZWNpc2lvbiA9IG9wdC5mbG9hdFByZWNpc2lvbiB8fCBcIm1lZGl1bXBcIjtcclxuICAgICAgICBoZWFkZXIucHVzaChcInByZWNpc2lvbiBcIiArIGZsb2F0UHJlY2lzaW9uICsgXCIgZmxvYXQ7XCIpO1xyXG4gICAgICAgIHJldHVybiBoZWFkZXI7XHJcbiAgICB9XHJcblxyXG4gICAgdmFyIHRvR0xTTFR5cGUgPSBmdW5jdGlvbiAoaW5mbywgYWxsb3dVbmRlZmluZWQpIHtcclxuICAgICAgICBzd2l0Y2ggKGluZm8udHlwZSkge1xyXG4gICAgICAgICAgICBjYXNlIFR5cGVzLk9CSkVDVDpcclxuICAgICAgICAgICAgICAgIHN3aXRjaCAoaW5mby5raW5kKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBLaW5kcy5GTE9BVDQ6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBcInZlYzRcIjtcclxuICAgICAgICAgICAgICAgICAgICBjYXNlIEtpbmRzLkZMT0FUMzpcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFwidmVjM1wiO1xyXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgS2luZHMuRkxPQVQyOlxyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gXCJ2ZWMyXCI7XHJcbiAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDpcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFwiPHVuZGVmaW5lZD5cIjtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgY2FzZSBUeXBlcy5VTkRFRklORUQ6XHJcbiAgICAgICAgICAgICAgICBpZiAoYWxsb3dVbmRlZmluZWQpXHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFwidm9pZFwiO1xyXG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiQ291bGQgbm90IGRldGVybWluZSB0eXBlXCIpO1xyXG4gICAgICAgICAgICBjYXNlIFR5cGVzLk5VTUJFUjpcclxuICAgICAgICAgICAgICAgIHJldHVybiBcImZsb2F0XCI7XHJcbiAgICAgICAgICAgIGNhc2UgVHlwZXMuQk9PTEVBTjpcclxuICAgICAgICAgICAgICAgIHJldHVybiBcImJvb2xcIjtcclxuICAgICAgICAgICAgY2FzZSBUeXBlcy5JTlQ6XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gXCJpbnRcIjtcclxuICAgICAgICAgICAgY2FzZSBUeXBlcy5CT09MRUFOOlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIFwiYm9vbFwiO1xyXG4gICAgICAgICAgICBkZWZhdWx0OlxyXG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwidG9HTFNMVHlwZTogVW5oYW5kbGVkIHR5cGU6IFwiICsgaW5mby50eXBlKTtcclxuXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHZhciB0b0dMU0xTb3VyY2UgPSBmdW5jdGlvbihpbmZvKSB7XHJcbiAgICAgICAgaWYgKCFpbmZvLnNvdXJjZSlcclxuICAgICAgICAgICAgcmV0dXJuIFwiXCI7XHJcbiAgICAgICAgaWYgKGluZm8uc291cmNlID09IFNvdXJjZXMuVkVSVEVYKVxyXG4gICAgICAgICAgICByZXR1cm4gXCJ2YXJ5aW5nXCI7XHJcbiAgICAgICAgaWYgKGluZm8uc291cmNlID09IFNvdXJjZXMuVU5JRk9STSlcclxuICAgICAgICAgICAgcmV0dXJuIFwidW5pZm9ybVwiO1xyXG4gICAgICAgIGlmIChpbmZvLnNvdXJjZSA9PSBTb3VyY2VzLkNPTlNUQU5UKVxyXG4gICAgICAgICAgICByZXR1cm4gXCJjb25zdFwiO1xyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcInRvR0xTTFNvdXJjZTogVW5oYW5kbGVkIHR5cGU6IFwiICsgaW5mby5zb3VyY2UpO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGNyZWF0ZUxpbmVTdGFjaygpIHtcclxuICAgICAgICB2YXIgYXJyID0gW107XHJcbiAgICAgICAgYXJyLnB1c2guYXBwbHkoYXJyLCBhcmd1bWVudHMpO1xyXG4gICAgICAgIHZhciBpbmRlbnQgPSBcIlwiO1xyXG4gICAgICAgIGFyci5hcHBlbmRMaW5lID0gZnVuY3Rpb24obGluZSl7XHJcbiAgICAgICAgICAgIHRoaXMucHVzaChpbmRlbnQgKyBsaW5lKTtcclxuICAgICAgICB9O1xyXG4gICAgICAgIGFyci5jaGFuZ2VJbmRlbnRpb24gPSBmdW5jdGlvbihhZGQpe1xyXG4gICAgICAgICAgICB3aGlsZShhZGQgPiAwKXtcclxuICAgICAgICAgICAgICAgIGluZGVudCArPSBcIiAgICBcIjsgYWRkLS07XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYoYWRkIDwgMCl7XHJcbiAgICAgICAgICAgICAgICBpbmRlbnQgPSBpbmRlbnQuc3Vic3RyKDAsIGluZGVudC5sZW5ndGggKyBhZGQqNCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9O1xyXG4gICAgICAgIGFyci5hcHBlbmQgPSBmdW5jdGlvbihzdHIpe1xyXG4gICAgICAgICAgICB0aGlzW3RoaXMubGVuZ3RoLTFdID0gdGhpc1t0aGlzLmxlbmd0aC0xXSArIHN0cjtcclxuICAgICAgICB9O1xyXG4gICAgICAgIHJldHVybiBhcnI7XHJcbiAgICB9O1xyXG5cclxuXHJcbiAgICAvKkJhc2UuZXh0ZW5kKExpbmVTdGFjay5wcm90b3R5cGUsIHtcclxuXHJcbiAgICB9KTsqL1xyXG5cclxuICAgIHZhciBnZW5lcmF0ZSA9IGZ1bmN0aW9uIChhc3QsIG9wdCkge1xyXG5cclxuICAgICAgICBvcHQgPSBvcHQgfHwge307XHJcblxyXG4gICAgICAgIHZhciBpbmRlbnQgPSBcIlwiO1xyXG4gICAgICAgIHZhciBsaW5lcyA9IGNyZWF0ZUxpbmVTdGFjaygpO1xyXG5cclxuICAgICAgICB0cmF2ZXJzZShhc3QsIGxpbmVzLCBvcHQpO1xyXG5cclxuICAgICAgICByZXR1cm4gbGluZXMuam9pbihcIlxcblwiKTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiB0cmF2ZXJzZShhc3QsIGxpbmVzLCBvcHQpIHtcclxuICAgICAgICB3YWxrLnRyYXZlcnNlKGFzdCwge1xyXG4gICAgICAgICAgICAgICAgZW50ZXI6IGZ1bmN0aW9uIChub2RlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHR5cGUgPSBub2RlLnR5cGU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHN3aXRjaCAodHlwZSkge1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgU3ludGF4LlByb2dyYW06XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZ2V0SGVhZGVyKG9wdCkuZm9yRWFjaChmdW5jdGlvbiAoZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsaW5lcy5wdXNoKGUpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcblxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgU3ludGF4LkZ1bmN0aW9uRGVjbGFyYXRpb246XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGZ1bmMgPSBuZXcgRnVuY3Rpb25Bbm5vdGF0aW9uKG5vZGUpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBtZXRob2RTdGFydCA9IFt0b0dMU0xUeXBlKGZ1bmMuZ2V0UmV0dXJuSW5mbygpLCB0cnVlKV07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbWV0aG9kU3RhcnQucHVzaChub2RlLmlkLm5hbWUsICcoJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCEobm9kZS5wYXJhbXMgJiYgbm9kZS5wYXJhbXMubGVuZ3RoKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtZXRob2RTdGFydC5wdXNoKFwidm9pZFwiKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBub2RlLnBhcmFtcy5mb3JFYWNoKGZ1bmN0aW9uIChwYXJhbSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbWV0aG9kU3RhcnQucHVzaCh0b0dMU0xUeXBlKHBhcmFtLmV4dHJhKSwgcGFyYW0ubmFtZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1ldGhvZFN0YXJ0LnB1c2goJykgeycpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxpbmVzLmFwcGVuZExpbmUobWV0aG9kU3RhcnQuam9pbihcIiBcIikpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxpbmVzLmNoYW5nZUluZGVudGlvbigxKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XHJcblxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgU3ludGF4LlJldHVyblN0YXRlbWVudDpcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgaGFzQXJndW1lbnRzID0gbm9kZS5hcmd1bWVudDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsaW5lcy5hcHBlbmRMaW5lKFwicmV0dXJuIFwiICsgKGhhc0FyZ3VtZW50cyA/IGhhbmRsZUV4cHJlc3Npb24obm9kZS5hcmd1bWVudCkgOiBcIlwiKSArIFwiO1wiKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSBTeW50YXguVmFyaWFibGVEZWNsYXJhdG9yIDpcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBjb25zb2xlLmxvZyhcIk1lZXAhXCIpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBzb3VyY2UgPSB0b0dMU0xTb3VyY2Uobm9kZS5leHRyYSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGxpbmUgPSBzb3VyY2UgPyBzb3VyY2UgKyBcIiBcIiA6IFwiXCI7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGluZSArPSB0b0dMU0xUeXBlKG5vZGUuZXh0cmEpICsgXCIgXCIgKyBub2RlLmlkLm5hbWU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG5vZGUuaW5pdCkgbGluZSArPSBcIiA9IFwiICsgaGFuZGxlRXhwcmVzc2lvbihub2RlLmluaXQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxpbmVzLmFwcGVuZExpbmUobGluZSArIFwiO1wiKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSBTeW50YXguQXNzaWdubWVudEV4cHJlc3Npb246XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGluZXMuYXBwZW5kTGluZShoYW5kbGVFeHByZXNzaW9uKG5vZGUpICsgXCI7XCIpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgU3ludGF4LkV4cHJlc3Npb25TdGF0ZW1lbnQ6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGluZXMuYXBwZW5kTGluZShoYW5kbGVFeHByZXNzaW9uKG5vZGUuZXhwcmVzc2lvbikgKyBcIjtcIik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFZpc2l0b3JPcHRpb24uU2tpcDtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXNlIFN5bnRheC5JZlN0YXRlbWVudDpcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsaW5lcy5hcHBlbmRMaW5lKFwiaWYoXCIgKyBoYW5kbGVFeHByZXNzaW9uKG5vZGUudGVzdCkgKyBcIikge1wiKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGluZXMuY2hhbmdlSW5kZW50aW9uKDEpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRyYXZlcnNlKG5vZGUuY29uc2VxdWVudCwgbGluZXMsIG9wdCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGluZXMuY2hhbmdlSW5kZW50aW9uKC0xKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG5vZGUuYWx0ZXJuYXRlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxpbmVzLmFwcGVuZExpbmUoXCJ9IGVsc2Uge1wiKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGluZXMuY2hhbmdlSW5kZW50aW9uKDEpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0cmF2ZXJzZShub2RlLmFsdGVybmF0ZSwgbGluZXMsIG9wdCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxpbmVzLmNoYW5nZUluZGVudGlvbigtMSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxpbmVzLmFwcGVuZExpbmUoXCJ9XCIpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBWaXNpdG9yT3B0aW9uLlNraXA7XHJcblxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvL2NvbnNvbGUubG9nKFwiVW5oYW5kbGVkOiBcIiArIHR5cGUpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgU2hhZGUudGhyb3dFcnJvcihub2RlLCBlLm1lc3NhZ2UpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICBsZWF2ZTogZnVuY3Rpb24gKG5vZGUpIHtcclxuICAgICAgICAgICAgICAgICAgICB2YXIgdHlwZSA9IG5vZGUudHlwZTtcclxuICAgICAgICAgICAgICAgICAgICBzd2l0Y2ggKHR5cGUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSBTeW50YXguUHJvZ3JhbTpcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjYXNlIFN5bnRheC5GdW5jdGlvbkRlY2xhcmF0aW9uOlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGluZXMuY2hhbmdlSW5kZW50aW9uKC0xKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxpbmVzLmFwcGVuZExpbmUoXCJ9XCIpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgKTtcclxuICAgIH1cclxuXHJcbiAgICB2YXIgZ2VuZXJhdGVGbG9hdCA9IGZ1bmN0aW9uKHZhbHVlKSB7XHJcbiAgICAgICAgaWYoaXNOYU4odmFsdWUpKVxyXG4gICAgICAgICAgICB0aHJvdyBFcnJvcihcIkludGVybmFsOiBFeHByZXNzaW9uIGdlbmVyYXRlZCBOYU4hXCIpO1xyXG4gICAgICAgIHZhciByZXN1bHQgPSAnJyArIHZhbHVlO1xyXG4gICAgICAgIGlmIChyZXN1bHQuaW5kZXhPZihcIi5cIikgPT0gLTEpIHtcclxuICAgICAgICAgICAgcmVzdWx0ICs9IFwiLjBcIjtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqXHJcbiAgICAgKiBAcGFyYW0gbm9kZVxyXG4gICAgICogQHJldHVybnMge3N0cmluZ31cclxuICAgICAqL1xyXG4gICAgdmFyIGhhbmRsZUV4cHJlc3Npb24gPSBmdW5jdGlvbihub2RlKSB7XHJcbiAgICAgICAgdmFyIHJlc3VsdCA9IFwiPHVuaGFuZGxlZDogXCIgKyBub2RlLnR5cGUrIFwiPlwiO1xyXG4gICAgICAgIHN3aXRjaChub2RlLnR5cGUpIHtcclxuICAgICAgICAgICAgY2FzZSBTeW50YXguTmV3RXhwcmVzc2lvbjpcclxuICAgICAgICAgICAgICAgIHJlc3VsdCA9IHRvR0xTTFR5cGUobm9kZS5leHRyYSk7XHJcbiAgICAgICAgICAgICAgICByZXN1bHQgKz0gaGFuZGxlQXJndW1lbnRzKG5vZGUuYXJndW1lbnRzKTtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG5cclxuICAgICAgICAgICAgY2FzZSBTeW50YXguTGl0ZXJhbDpcclxuICAgICAgICAgICAgICAgIHZhciB2YWx1ZSA9IG5vZGUuZXh0cmEuc3RhdGljVmFsdWUgIT09IHVuZGVmaW5lZCA/IG5vZGUuZXh0cmEuc3RhdGljVmFsdWUgOiBub2RlLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgaWYgKG5vZGUuZXh0cmEudHlwZSA9PSBUeXBlcy5OVU1CRVIpXHJcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0ID0gZ2VuZXJhdGVGbG9hdCh2YWx1ZSk7XHJcbiAgICAgICAgICAgICAgICBlbHNlXHJcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0ID0gdmFsdWU7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuXHJcblxyXG4gICAgICAgICAgICBjYXNlIFN5bnRheC5JZGVudGlmaWVyOlxyXG4gICAgICAgICAgICAgICAgcmVzdWx0ID0gbm9kZS5uYW1lO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcblxyXG4gICAgICAgICAgICBjYXNlIFN5bnRheC5CaW5hcnlFeHByZXNzaW9uOlxyXG4gICAgICAgICAgICBjYXNlIFN5bnRheC5Mb2dpY2FsRXhwcmVzc2lvbjpcclxuICAgICAgICAgICAgY2FzZSBTeW50YXguQXNzaWdubWVudEV4cHJlc3Npb246XHJcbiAgICAgICAgICAgICAgICByZXN1bHQgPSBoYW5kbGVCaW5hcnlBcmd1bWVudChub2RlLmxlZnQpO1xyXG4gICAgICAgICAgICAgICAgcmVzdWx0ICs9IFwiIFwiICsgbm9kZS5vcGVyYXRvciArIFwiIFwiO1xyXG4gICAgICAgICAgICAgICAgcmVzdWx0ICs9IGhhbmRsZUJpbmFyeUFyZ3VtZW50KG5vZGUucmlnaHQpO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgU3ludGF4LlVuYXJ5RXhwcmVzc2lvbjpcclxuICAgICAgICAgICAgICAgIHJlc3VsdCA9IG5vZGUub3BlcmF0b3I7XHJcbiAgICAgICAgICAgICAgICByZXN1bHQgKz0gaGFuZGxlQmluYXJ5QXJndW1lbnQobm9kZS5hcmd1bWVudCk7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuXHJcbiAgICAgICAgICAgIGNhc2UgU3ludGF4LkNhbGxFeHByZXNzaW9uOlxyXG4gICAgICAgICAgICAgICAgcmVzdWx0ID0gaGFuZGxlRXhwcmVzc2lvbihub2RlLmNhbGxlZSk7XHJcbiAgICAgICAgICAgICAgICByZXN1bHQgKz0gaGFuZGxlQXJndW1lbnRzKG5vZGUuYXJndW1lbnRzKTtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG5cclxuICAgICAgICAgICAgY2FzZSBTeW50YXguTWVtYmVyRXhwcmVzc2lvbjpcclxuICAgICAgICAgICAgICAgIHJlc3VsdCA9IGhhbmRsZUV4cHJlc3Npb24obm9kZS5vYmplY3QpO1xyXG4gICAgICAgICAgICAgICAgcmVzdWx0ICs9IFwiLlwiO1xyXG4gICAgICAgICAgICAgICAgcmVzdWx0ICs9IGhhbmRsZUV4cHJlc3Npb24obm9kZS5wcm9wZXJ0eSk7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuXHJcbiAgICAgICAgICAgIGNhc2UgU3ludGF4LkNvbmRpdGlvbmFsRXhwcmVzc2lvbjpcclxuICAgICAgICAgICAgICAgIHJlc3VsdCA9IGhhbmRsZUV4cHJlc3Npb24obm9kZS50ZXN0KTtcclxuICAgICAgICAgICAgICAgIHJlc3VsdCArPSBcIiA/IFwiO1xyXG4gICAgICAgICAgICAgICAgcmVzdWx0ICs9IGhhbmRsZUV4cHJlc3Npb24obm9kZS5jb25zZXF1ZW50KTtcclxuICAgICAgICAgICAgICAgIHJlc3VsdCArPSBcIiA6IFwiO1xyXG4gICAgICAgICAgICAgICAgcmVzdWx0ICs9IGhhbmRsZUV4cHJlc3Npb24obm9kZS5hbHRlcm5hdGUpO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcblxyXG4gICAgICAgICAgICBkZWZhdWx0OlxyXG4gICAgICAgICAgICAgICAgLy9jb25zb2xlLmxvZyhcIlVuaGFuZGxlZDogXCIgLCBub2RlLnR5cGUpO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gcmVzdWx0O1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGhhbmRsZUJpbmFyeUFyZ3VtZW50KG5vZGUpe1xyXG4gICAgICAgIHZhciByZXN1bHQgPSBoYW5kbGVFeHByZXNzaW9uKG5vZGUpO1xyXG4gICAgICAgIHN3aXRjaChub2RlLnR5cGUpIHtcclxuICAgICAgICAgICAgY2FzZSBTeW50YXguQmluYXJ5RXhwcmVzc2lvbjpcclxuICAgICAgICAgICAgY2FzZSBTeW50YXguTG9naWNhbEV4cHJlc3Npb246XHJcbiAgICAgICAgICAgIGNhc2UgU3ludGF4LkFzc2lnbm1lbnRFeHByZXNzaW9uOiByZXN1bHQgPSBcIiggXCIgKyByZXN1bHQgKyBcIiApXCI7IGJyZWFrO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gcmVzdWx0O1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGhhbmRsZUFyZ3VtZW50cyhjb250YWluZXIpIHtcclxuICAgICAgICB2YXIgcmVzdWx0ID0gXCIoXCI7XHJcbiAgICAgICAgY29udGFpbmVyLmZvckVhY2goZnVuY3Rpb24gKGFyZywgaW5kZXgpIHtcclxuICAgICAgICAgICAgcmVzdWx0ICs9IGhhbmRsZUV4cHJlc3Npb24oYXJnKTtcclxuICAgICAgICAgICAgaWYgKGluZGV4IDwgY29udGFpbmVyLmxlbmd0aCAtIDEpIHtcclxuICAgICAgICAgICAgICAgIHJlc3VsdCArPSBcIiwgXCI7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuICAgICAgICByZXR1cm4gcmVzdWx0ICsgXCIpXCI7XHJcbiAgICB9XHJcblxyXG5cclxuICAgIGV4cG9ydHMuZ2VuZXJhdGUgPSBnZW5lcmF0ZTtcclxuXHJcblxyXG59KGV4cG9ydHMpKTtcclxuIiwiKGZ1bmN0aW9uKG5zKXtcclxuXHJcbiAgICB2YXIgU2hhZGUgPSByZXF1aXJlKFwiLi4vLi4vLi4vaW50ZXJmYWNlcy5qc1wiKTtcclxuICAgIHZhciBUb29scyA9IHJlcXVpcmUoXCIuL3Rvb2xzLmpzXCIpO1xyXG5cclxuICAgIHZhciBDb2xvckNsb3N1cmVJbnN0YW5jZSA9IHtcclxuXHJcbiAgICB9O1xyXG5cclxuICAgIFRvb2xzLmV4dGVuZChucywge1xyXG4gICAgICAgIGlkOiBcIkNvbG9yQ2xvc3VyZVwiLFxyXG4gICAgICAgIGtpbmQ6IFNoYWRlLk9CSkVDVF9LSU5EUy5DT0xPUl9DTE9TVVJFLFxyXG4gICAgICAgIG9iamVjdDoge1xyXG4gICAgICAgICAgICBjb25zdHJ1Y3RvcjogbnVsbCxcclxuICAgICAgICAgICAgc3RhdGljOiB7fVxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgaW5zdGFuY2U6IENvbG9yQ2xvc3VyZUluc3RhbmNlXHJcbiAgICB9KTtcclxufShleHBvcnRzKSk7XHJcbiIsIihmdW5jdGlvbihucykge1xyXG5cclxuICAgIHZhciBvYmplY3RzID0ge1xyXG4gICAgICAgIC8vQ29sb3IgOiByZXF1aXJlKFwiLi9jb2xvci5qc1wiKSxcclxuICAgICAgICBTaGFkZSA6IHJlcXVpcmUoXCIuL3NoYWRlLmpzXCIpLFxyXG4gICAgICAgIC8vTWF0cml4NCA6IHJlcXVpcmUoXCIuL21hdHJpeC5qc1wiKSxcclxuICAgICAgICBNYXRoIDogcmVxdWlyZShcIi4vbWF0aC5qc1wiKSxcclxuICAgICAgICBTeXN0ZW0gOiByZXF1aXJlKFwiLi9zeXN0ZW0uanNcIiksXHJcbiAgICAgICAgVmVjMiA6IHJlcXVpcmUoXCIuL3ZlYzIuanNcIiksXHJcbiAgICAgICAgVmVjMyA6IHJlcXVpcmUoXCIuL3ZlYzMuanNcIiksXHJcbiAgICAgICAgQ29sb3I6IHJlcXVpcmUoXCIuL3ZlYzMuanNcIiksXHJcbiAgICAgICAgVmVjNCA6IHJlcXVpcmUoXCIuL3ZlYzQuanNcIiksXHJcbiAgICAgICAgQ29sb3JDbG9zdXJlOiByZXF1aXJlKFwiLi9jb2xvcmNsb3N1cmUuanNcIilcclxuICAgIH07XHJcblxyXG4gICAgbnMuUmVnaXN0cnkgPSB7XHJcbiAgICAgICAgbmFtZTogXCJHTFNMVHJhbnNmb3JtUmVnaXN0cnlcIixcclxuICAgICAgICBnZXRCeU5hbWU6IGZ1bmN0aW9uKG5hbWUpIHtcclxuICAgICAgICAgICAgdmFyIHJlc3VsdCA9IG9iamVjdHNbbmFtZV07XHJcbiAgICAgICAgICAgIHJldHVybiByZXN1bHQgfHwgbnVsbDtcclxuICAgICAgICB9LFxyXG4gICAgICAgIGdldEluc3RhbmNlRm9yS2luZDogZnVuY3Rpb24oa2luZCkge1xyXG4gICAgICAgICAgICBmb3IodmFyIG9iaiBpbiBvYmplY3RzKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAob2JqZWN0c1tvYmpdLmtpbmQgPT0ga2luZCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBvYmplY3RzW29ial0uaW5zdGFuY2U7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuXHJcbn0oZXhwb3J0cykpO1xyXG4iLCIoZnVuY3Rpb24obnMpe1xyXG5cclxuICAgdmFyIFNoYWRlID0gcmVxdWlyZShcIi4uLy4uLy4uL2ludGVyZmFjZXMuanNcIik7XHJcbiAgIHZhciBTeW50YXggPSByZXF1aXJlKCdlc3RyYXZlcnNlJykuU3ludGF4O1xyXG4gICB2YXIgVG9vbHMgPSByZXF1aXJlKCcuL3Rvb2xzLmpzJyk7XHJcblxyXG4gICAgdmFyIE1hdGhDb25zdGFudHMgPSBbXCJFXCIsIFwiUElcIiwgXCJMTjJcIiwgXCJMT0cyRVwiLCBcIkxPRzEwRVwiLCBcIlBJXCIsIFwiU1FSVDFfMlwiLCBcIlNRUlQyXCJdO1xyXG5cclxuXHJcblxyXG4gICAgdmFyIGhhbmRsZUludFZlcnNpb24gPSBmdW5jdGlvbihub2RlLCBwYXJlbnQpIHtcclxuICAgICAgICBwYXJlbnQuZXh0cmEudHlwZSA9IFNoYWRlLlRZUEVTLk5VTUJFUjtcclxuICAgICAgICByZXR1cm4gVG9vbHMucmVtb3ZlTWVtYmVyRnJvbUV4cHJlc3Npb24obm9kZSk7XHJcbiAgICB9XHJcblxyXG5cclxuICAgIHZhciBNYXRoRW50cnkgID0ge1xyXG4gICAgICAgIGFiczogeyBwcm9wZXJ0eTogVG9vbHMucmVtb3ZlTWVtYmVyRnJvbUV4cHJlc3Npb24gfSxcclxuICAgICAgICBhY29zOiB7IHByb3BlcnR5OiBUb29scy5yZW1vdmVNZW1iZXJGcm9tRXhwcmVzc2lvbiB9LFxyXG4gICAgICAgIGFzaW46IHsgcHJvcGVydHk6IFRvb2xzLnJlbW92ZU1lbWJlckZyb21FeHByZXNzaW9uIH0sXHJcbiAgICAgICAgYXRhbjogeyBwcm9wZXJ0eTogVG9vbHMucmVtb3ZlTWVtYmVyRnJvbUV4cHJlc3Npb24gfSxcclxuICAgICAgICBhdGFuMjogeyBwcm9wZXJ0eTogZnVuY3Rpb24oKSB7IHJldHVybiB7IHR5cGU6IFN5bnRheC5JZGVudGlmaWVyLCBuYW1lOiBcImF0YW5cIiB9IH19LFxyXG4gICAgICAgIGNlaWw6IHsgcHJvcGVydHk6IGhhbmRsZUludFZlcnNpb24gfSxcclxuICAgICAgICBjb3M6ICB7IHByb3BlcnR5OiBUb29scy5yZW1vdmVNZW1iZXJGcm9tRXhwcmVzc2lvbiB9LFxyXG4gICAgICAgIGV4cDogeyBwcm9wZXJ0eTogVG9vbHMucmVtb3ZlTWVtYmVyRnJvbUV4cHJlc3Npb24gfSxcclxuICAgICAgICBmbG9vcjogeyBwcm9wZXJ0eTogaGFuZGxlSW50VmVyc2lvbiB9LFxyXG4gICAgICAgIC8vIGltdWw6IHsgcHJvcGVydHk6IFRvb2xzLnJlbW92ZU1lbWJlckZyb21FeHByZXNzaW9uIH0sXHJcbiAgICAgICAgbG9nOiB7IHByb3BlcnR5OiBUb29scy5yZW1vdmVNZW1iZXJGcm9tRXhwcmVzc2lvbiB9LFxyXG4gICAgICAgIG1heDogeyBwcm9wZXJ0eTogVG9vbHMucmVtb3ZlTWVtYmVyRnJvbUV4cHJlc3Npb24gfSxcclxuICAgICAgICBtaW46IHsgcHJvcGVydHk6IFRvb2xzLnJlbW92ZU1lbWJlckZyb21FeHByZXNzaW9uIH0sXHJcbiAgICAgICAgcG93OiB7IHByb3BlcnR5OiBUb29scy5yZW1vdmVNZW1iZXJGcm9tRXhwcmVzc2lvbiB9LFxyXG4gICAgICAgIC8vIHJhbmRvbTogZnVuY3Rpb24gcmFuZG9tKCkgeyBbbmF0aXZlIGNvZGVdIH1cclxuICAgICAgICByb3VuZDogeyBwcm9wZXJ0eTogVG9vbHMucmVtb3ZlTWVtYmVyRnJvbUV4cHJlc3Npb24gfSwgLy8gU2luY2UgR0xTTCAxLjMsIHdoYXQgZG9lcyBXZWJHTCB1c2U/XHJcbiAgICAgICAgc2luOiAgeyBwcm9wZXJ0eTogVG9vbHMucmVtb3ZlTWVtYmVyRnJvbUV4cHJlc3Npb24gfSxcclxuICAgICAgICBzcXJ0OiB7IHByb3BlcnR5OiBUb29scy5yZW1vdmVNZW1iZXJGcm9tRXhwcmVzc2lvbiB9LFxyXG4gICAgICAgIHRhbjogeyBwcm9wZXJ0eTogVG9vbHMucmVtb3ZlTWVtYmVyRnJvbUV4cHJlc3Npb24gfVxyXG4gICAgfTtcclxuXHJcbiAgICBNYXRoQ29uc3RhbnRzLmZvckVhY2goZnVuY3Rpb24gKGNvbnN0YW50KSB7XHJcbiAgICAgICAgTWF0aEVudHJ5W2NvbnN0YW50XSA9IHtcclxuICAgICAgICAgICAgcHJvcGVydHk6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiAgeyB0eXBlOiBTeW50YXguTGl0ZXJhbCwgdmFsdWU6IE1hdGhbY29uc3RhbnRdLCBleHRyYTogeyB0eXBlOiBTaGFkZS5UWVBFUy5OVU1CRVIgfSB9O1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfSk7XHJcblxyXG4gICAgVG9vbHMuZXh0ZW5kKG5zLCB7XHJcbiAgICAgICAgaWQ6IFwiTWF0aFwiLFxyXG4gICAgICAgIG9iamVjdDoge1xyXG4gICAgICAgICAgICBjb25zdHJ1Y3RvcjogbnVsbCxcclxuICAgICAgICAgICAgc3RhdGljOiBNYXRoRW50cnlcclxuICAgICAgICB9LFxyXG4gICAgICAgIGluc3RhbmNlOiBNYXRoRW50cnlcclxuICAgIH0pO1xyXG5cclxufShleHBvcnRzKSk7XHJcbiIsIihmdW5jdGlvbihucyl7XHJcblxyXG4gICAgdmFyIFNoYWRlID0gcmVxdWlyZShcIi4uLy4uLy4uL2ludGVyZmFjZXMuanNcIik7XHJcbiAgICB2YXIgU3ludGF4ID0gcmVxdWlyZSgnZXN0cmF2ZXJzZScpLlN5bnRheDtcclxuICAgIHZhciBUb29scyA9IHJlcXVpcmUoJy4vdG9vbHMuanMnKTtcclxuXHJcbiAgICB2YXIgU2hhZGVPYmplY3QgPSB7XHJcbiAgICAgICAgZGlmZnVzZToge30sXHJcbiAgICAgICAgcGhvbmc6IHt9LFxyXG4gICAgICAgIGZyYWN0OiB7IHByb3BlcnR5OiBUb29scy5yZW1vdmVNZW1iZXJGcm9tRXhwcmVzc2lvbiB9LFxyXG4gICAgICAgIGNsYW1wOiB7IHByb3BlcnR5OiBUb29scy5yZW1vdmVNZW1iZXJGcm9tRXhwcmVzc2lvbiB9LFxyXG4gICAgICAgIHN0ZXA6IHsgcHJvcGVydHk6IFRvb2xzLnJlbW92ZU1lbWJlckZyb21FeHByZXNzaW9uIH0sXHJcbiAgICAgICAgc21vb3Roc3RlcDogeyBwcm9wZXJ0eTogVG9vbHMucmVtb3ZlTWVtYmVyRnJvbUV4cHJlc3Npb24gfVxyXG4gICAgfVxyXG5cclxuICAgIFRvb2xzLmV4dGVuZChucywge1xyXG4gICAgaWQ6IFwiU2hhZGVcIixcclxuICAgIG9iamVjdDoge1xyXG4gICAgICAgIGNvbnN0cnVjdG9yOiBudWxsLFxyXG4gICAgICAgIHN0YXRpYzogU2hhZGVPYmplY3RcclxuICAgIH0sXHJcbiAgICBpbnN0YW5jZTogbnVsbFxyXG59KTtcclxuXHJcbn0oZXhwb3J0cykpO1xyXG4iLCIoZnVuY3Rpb24gKG5zKSB7XHJcblxyXG4gICAgdmFyIEJhc2UgPSByZXF1aXJlKFwiLi4vLi4vLi4vYmFzZS9pbmRleC5qc1wiKSxcclxuICAgICAgICBTaGFkZSA9IHJlcXVpcmUoXCIuLi8uLi8uLi9pbnRlcmZhY2VzLmpzXCIpLFxyXG4gICAgICAgIFN5bnRheCA9IHJlcXVpcmUoJ2VzdHJhdmVyc2UnKS5TeW50YXg7XHJcblxyXG5cclxuICAgIHZhciBTeXN0ZW1QYXJhbWV0ZXJOYW1lcyA9IHtcclxuICAgICAgICBcImNvb3Jkc1wiIDogXCJfc3lzX2Nvb3Jkc1wiLFxyXG4gICAgICAgIFwiaGVpZ2h0XCI6IFwiX3N5c19oZWlnaHRcIixcclxuICAgICAgICBcIndpZHRoXCI6IFwiX3N5c193aWR0aFwiXHJcbiAgICB9XHJcblxyXG4gICAgdmFyIENvb3Jkc1R5cGUgPSAge1xyXG4gICAgICAgIHR5cGU6IFNoYWRlLlRZUEVTLk9CSkVDVCxcclxuICAgICAgICBraW5kOiBTaGFkZS5PQkpFQ1RfS0lORFMuRkxPQVQzLFxyXG4gICAgICAgIHNvdXJjZTogU2hhZGUuU09VUkNFUy5VTklGT1JNXHJcbiAgICB9O1xyXG5cclxuICAgIHZhciBTeXN0ZW1FbnRyeSA9IHtcclxuICAgICAgICBjb29yZHM6IHtcclxuICAgICAgICAgICAgcHJvcGVydHk6IGZ1bmN0aW9uIChub2RlKSB7XHJcbiAgICAgICAgICAgICAgICBub2RlLnByb3BlcnR5Lm5hbWUgPSBcImdsX0ZyYWdDb29yZFwiO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIG5vZGUucHJvcGVydHk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9LFxyXG4gICAgICAgIG5vcm1hbGl6ZWRDb29yZHM6IHtcclxuICAgICAgICAgICAgcHJvcGVydHk6IGZ1bmN0aW9uIChub2RlLCBwYXJlbnQsIGNvbnRleHQsIHN0YXRlKSB7XHJcbiAgICAgICAgICAgICAgICBzdGF0ZS5nbG9iYWxQYXJhbWV0ZXJzW1N5c3RlbVBhcmFtZXRlck5hbWVzLmNvb3Jkc10gPSBDb29yZHNUeXBlO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiBTeW50YXguTmV3RXhwcmVzc2lvbixcclxuICAgICAgICAgICAgICAgICAgICBjYWxsZWU6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogU3ludGF4LklkZW50aWZpZXIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG5hbWU6IFwiVmVjM1wiXHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICBhcmd1bWVudHM6IFtcclxuICAgICAgICAgICAgICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogU3ludGF4LkJpbmFyeUV4cHJlc3Npb24sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZWZ0OiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogU3ludGF4Lk1lbWJlckV4cHJlc3Npb24sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb2JqZWN0OiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6IFN5bnRheC5JZGVudGlmaWVyLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBuYW1lOiBcImdsX0ZyYWdDb29yZFwiXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0eToge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiBTeW50YXguSWRlbnRpZmllcixcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbmFtZTogXCJ4eXpcIlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByaWdodDoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6IFN5bnRheC5JZGVudGlmaWVyLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5hbWU6IFN5c3RlbVBhcmFtZXRlck5hbWVzLmNvb3Jkc1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9wZXJhdG9yOiBcIi9cIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4dHJhOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogU2hhZGUuVFlQRVMuT0JKRUNULFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGtpbmQ6IFNoYWRlLk9CSkVDVF9LSU5EUy5GTE9BVDNcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIF0sXHJcbiAgICAgICAgICAgICAgICAgICAgZXh0cmE6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogU2hhZGUuVFlQRVMuT0JKRUNULFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBraW5kOiBTaGFkZS5PQkpFQ1RfS0lORFMuRkxPQVQzXHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSxcclxuICAgICAgICBoZWlnaHQ6IHtcclxuICAgICAgICAgICAgcHJvcGVydHk6IGZ1bmN0aW9uIChub2RlLCBwYXJlbnQsIGNvbnRleHQsIHN0YXRlKSB7XHJcbiAgICAgICAgICAgICAgICBzdGF0ZS5nbG9iYWxQYXJhbWV0ZXJzW1N5c3RlbVBhcmFtZXRlck5hbWVzLmNvb3Jkc10gPSBDb29yZHNUeXBlO1xyXG4gICAgICAgICAgICAgICAgbm9kZS5wcm9wZXJ0eS5uYW1lID0gU3lzdGVtUGFyYW1ldGVyTmFtZXMuY29vcmRzICsgXCIueVwiO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIG5vZGUucHJvcGVydHk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9LFxyXG4gICAgICAgIHdpZHRoOiB7XHJcbiAgICAgICAgICAgIHByb3BlcnR5OiBmdW5jdGlvbiAobm9kZSwgcGFyZW50LCBjb250ZXh0LCBzdGF0ZSkge1xyXG4gICAgICAgICAgICAgICAgc3RhdGUuZ2xvYmFsUGFyYW1ldGVyc1tTeXN0ZW1QYXJhbWV0ZXJOYW1lcy5jb29yZHNdID0gQ29vcmRzVHlwZTtcclxuICAgICAgICAgICAgICAgIG5vZGUucHJvcGVydHkubmFtZSA9IFN5c3RlbVBhcmFtZXRlck5hbWVzLmNvb3JkcyArIFwiLnhcIjtcclxuICAgICAgICAgICAgICAgIHJldHVybiBub2RlLnByb3BlcnR5O1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgIH07XHJcblxyXG4gICAgQmFzZS5leHRlbmQobnMsIHtcclxuICAgICAgICBpZDogXCJTeXN0ZW1cIixcclxuICAgICAgICBvYmplY3Q6IHtcclxuICAgICAgICAgICAgY29uc3RydWN0b3I6IG51bGwsXHJcbiAgICAgICAgICAgIHN0YXRpYzogU3lzdGVtRW50cnlcclxuICAgICAgICB9LFxyXG4gICAgICAgIGluc3RhbmNlOiBudWxsXHJcbiAgICB9KTtcclxufShleHBvcnRzKSk7XHJcbiIsIihmdW5jdGlvbiAobnMpIHtcclxuXHJcbiAgICB2YXIgU3ludGF4ID0gcmVxdWlyZSgnZXN0cmF2ZXJzZScpLlN5bnRheDtcclxuICAgIHZhciBCYXNlID0gcmVxdWlyZShcIi4uLy4uLy4uL2Jhc2UvaW5kZXguanNcIik7XHJcbiAgICB2YXIgQU5OTyA9IHJlcXVpcmUoXCIuLi8uLi8uLi9iYXNlL2Fubm90YXRpb24uanNcIikuQU5OTztcclxuICAgIHZhciBTaGFkZSA9IHJlcXVpcmUoXCIuLi8uLi8uLi9pbnRlcmZhY2VzLmpzXCIpLFxyXG4gICAgICAgIFRZUEVTID0gU2hhZGUuVFlQRVMsXHJcbiAgICAgICAgS0lORFMgPSBTaGFkZS5PQkpFQ1RfS0lORFMsXHJcbiAgICAgICAgVmVjQmFzZSA9IHJlcXVpcmUoXCIuLi8uLi8uLi9iYXNlL3ZlYy5qc1wiKTtcclxuXHJcblxyXG4gICAgbnMucmVtb3ZlTWVtYmVyRnJvbUV4cHJlc3Npb24gPSBmdW5jdGlvbiAobm9kZSkge1xyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgIHR5cGU6IFN5bnRheC5JZGVudGlmaWVyLFxyXG4gICAgICAgICAgICBuYW1lOiBub2RlLnByb3BlcnR5Lm5hbWVcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgdmFyIFZlYyA9IHtcclxuICAgICAgICBnZW5lcmF0ZVZlY0Zyb21BcmdzOiBmdW5jdGlvbih2ZWNDb3VudCwgYXJncyl7XHJcbiAgICAgICAgICAgIGlmKHZlY0NvdW50ID09IDEpXHJcbiAgICAgICAgICAgICAgICByZXR1cm4gYXJnc1swXTtcclxuICAgICAgICAgICAgaWYoYXJncy5sZW5ndGggPT0gMSAmJiBBTk5PKGFyZ3NbMF0pLmlzT2ZLaW5kKEtJTkRTWydGTE9BVCcgKyB2ZWNDb3VudF0pKVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGFyZ3NbMF07XHJcbiAgICAgICAgICAgIHZhciByZXN1bHQgPSB7XHJcbiAgICAgICAgICAgICAgICB0eXBlOiBTeW50YXguTmV3RXhwcmVzc2lvbixcclxuICAgICAgICAgICAgICAgIGNhbGxlZToge1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IFN5bnRheC5JZGVudGlmaWVyLFxyXG4gICAgICAgICAgICAgICAgICAgIG5hbWU6IFwiVmVjXCIgKyB2ZWNDb3VudFxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgIGFyZ3VtZW50czogYXJnc1xyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICBBTk5PKHJlc3VsdCkuc2V0VHlwZShUWVBFUy5PQkpFQ1QsIEtJTkRTWydGTE9BVCcgKyB2ZWNDb3VudF0pO1xyXG4gICAgICAgICAgICBBTk5PKHJlc3VsdC5jYWxsZWUpLnNldFR5cGUoVFlQRVMuRlVOQ1RJT04pO1xyXG4gICAgICAgICAgICByZXR1cm4gcmVzdWx0O1xyXG4gICAgICAgIH0sXHJcblxyXG4gICAgICAgIGNyZWF0ZVN3aXp6bGU6IGZ1bmN0aW9uKHZlY0NvdW50LCBzd2l6emxlLCBub2RlLCBhcmdzLCBwYXJlbnQpe1xyXG4gICAgICAgICAgICBpZiAoYXJncy5sZW5ndGggPT0gMCkge1xyXG4gICAgICAgICAgICAgICAgbm9kZS5jYWxsZWUuZXh0cmEgPSBub2RlLmV4dHJhO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIG5vZGUuY2FsbGVlO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHZhciBzaW5ndWxhciA9IHN3aXp6bGUubGVuZ3RoID09IDE7XHJcbiAgICAgICAgICAgIHZhciBhcmdPYmplY3QgPSBzaW5ndWxhciA/IG5vZGUuYXJndW1lbnRzWzBdIDogVmVjLmdlbmVyYXRlVmVjRnJvbUFyZ3Moc3dpenpsZS5sZW5ndGgsIG5vZGUuYXJndW1lbnRzKTtcclxuICAgICAgICAgICAgdmFyIHJlcGxhY2UgPSB7XHJcbiAgICAgICAgICAgICAgICB0eXBlOiBTeW50YXguTmV3RXhwcmVzc2lvbixcclxuICAgICAgICAgICAgICAgIGNhbGxlZToge1xyXG4gICAgICAgICAgICAgICAgICAgdHlwZTogU3ludGF4LklkZW50aWZpZXIsXHJcbiAgICAgICAgICAgICAgICAgICBuYW1lOiBcIlZlY1wiICsgdmVjQ291bnRcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICBhcmd1bWVudHM6IFtdXHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgIHZhciBpbmRpY2VzID0gW107XHJcbiAgICAgICAgICAgIGZvcih2YXIgaSA9IDA7IGkgPCBzd2l6emxlLmxlbmd0aDsgKytpKXtcclxuICAgICAgICAgICAgICAgIHZhciBpZHggPSBWZWNCYXNlLnN3aXp6bGVUb0luZGV4KHN3aXp6bGUuY2hhckF0KGkpKTtcclxuICAgICAgICAgICAgICAgIGluZGljZXNbaWR4XSA9IGk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZm9yKHZhciBpID0gMDsgaSA8IHZlY0NvdW50OyArK2kpe1xyXG4gICAgICAgICAgICAgICAgaWYoaW5kaWNlc1tpXSAhPT0gdW5kZWZpbmVkKXtcclxuICAgICAgICAgICAgICAgICAgICByZXBsYWNlLmFyZ3VtZW50c1tpXSA9IHNpbmd1bGFyID8gYXJnT2JqZWN0IDoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiBTeW50YXguTWVtYmVyRXhwcmVzc2lvbixcclxuICAgICAgICAgICAgICAgICAgICAgICAgb2JqZWN0OiBhcmdPYmplY3QsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb3BlcnR5OiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiBTeW50YXguSWRlbnRpZmllcixcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5hbWU6IFZlY0Jhc2UuaW5kZXhUb1N3aXp6bGUoaW5kaWNlc1tpXSlcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBlbHNle1xyXG4gICAgICAgICAgICAgICAgICAgcmVwbGFjZS5hcmd1bWVudHNbaV0gPSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6IFN5bnRheC5NZW1iZXJFeHByZXNzaW9uLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBvYmplY3Q6IG5vZGUuY2FsbGVlLm9iamVjdCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvcGVydHk6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6IFN5bnRheC5JZGVudGlmaWVyLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbmFtZTogVmVjQmFzZS5pbmRleFRvU3dpenpsZShpKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBBTk5PKHJlcGxhY2UpLmNvcHkoQU5OTyhub2RlKSk7XHJcbiAgICAgICAgICAgIHJldHVybiByZXBsYWNlO1xyXG4gICAgICAgIH0sXHJcblxyXG4gICAgICAgIGF0dGFjaFN3aXp6bGVzOiBmdW5jdGlvbiAoaW5zdGFuY2UsIHZlY0NvdW50KXtcclxuICAgICAgICAgICAgZm9yKHZhciBzID0gMDsgcyA8IFZlY0Jhc2Uuc3dpenpsZVNldHMubGVuZ3RoOyArK3Mpe1xyXG4gICAgICAgICAgICAgICAgZm9yKHZhciBjb3VudCA9IDE7IGNvdW50IDw9IDQ7ICsrY291bnQpe1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciBtYXggPSBNYXRoLnBvdyh2ZWNDb3VudCwgY291bnQpO1xyXG4gICAgICAgICAgICAgICAgICAgICBmb3IodmFyIGkgPSAwOyBpIDwgbWF4OyArK2kpe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgdmFsID0gaTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGtleSA9IFwiXCI7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvcih2YXIgIGogPSAwOyBqIDwgY291bnQ7ICsrail7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgaWR4ID0gdmFsICUgdmVjQ291bnQ7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YWwgPSBNYXRoLmZsb29yKHZhbCAvIHZlY0NvdW50KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGtleSs9IFZlY0Jhc2Uuc3dpenpsZVNldHNbc11baWR4XTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpbnN0YW5jZVtrZXldID0ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FsbEV4cDogVmVjLmNyZWF0ZVN3aXp6bGUuYmluZChudWxsLCB2ZWNDb3VudCwga2V5KVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0sXHJcblxyXG4gICAgICAgIGNyZWF0ZU9wZXJhdG9yOiBmdW5jdGlvbih2ZWNDb3VudCwgb3BlcmF0b3IsIG5vZGUsIGFyZ3MsIHBhcmVudCkge1xyXG4gICAgICAgICAgICB2YXIgb3RoZXIgPSBWZWMuZ2VuZXJhdGVWZWNGcm9tQXJncyh2ZWNDb3VudCwgbm9kZS5hcmd1bWVudHMpO1xyXG4gICAgICAgICAgICB2YXIgcmVwbGFjZSA9IHtcclxuICAgICAgICAgICAgICAgIHR5cGU6IFN5bnRheC5CaW5hcnlFeHByZXNzaW9uLFxyXG4gICAgICAgICAgICAgICAgb3BlcmF0b3I6IG9wZXJhdG9yLFxyXG4gICAgICAgICAgICAgICAgbGVmdDogbm9kZS5jYWxsZWUub2JqZWN0LFxyXG4gICAgICAgICAgICAgICAgcmlnaHQ6IG90aGVyXHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgIEFOTk8ocmVwbGFjZSkuY29weShBTk5PKG5vZGUpKTtcclxuICAgICAgICAgICAgcmV0dXJuIHJlcGxhY2U7XHJcbiAgICAgICAgfSxcclxuXHJcbiAgICAgICAgYXR0YWNoT3BlcmF0b3JzOiBmdW5jdGlvbihpbnN0YW5jZSwgdmVjQ291bnQsIG9wZXJhdG9ycyl7XHJcbiAgICAgICAgICAgIGZvcih2YXIgbmFtZSBpbiBvcGVyYXRvcnMpe1xyXG4gICAgICAgICAgICAgICAgdmFyIG9wZXJhdG9yID0gb3BlcmF0b3JzW25hbWVdO1xyXG4gICAgICAgICAgICAgICAgaW5zdGFuY2VbbmFtZV0gPSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY2FsbEV4cDogVmVjLmNyZWF0ZU9wZXJhdG9yLmJpbmQobnVsbCwgdmVjQ291bnQsIG9wZXJhdG9yKVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSxcclxuXHJcbiAgICAgICAgY3JlYXRlRnVuY3Rpb25DYWxsOiBmdW5jdGlvbihmdW5jdGlvbk5hbWUsIHNlY29uZFZlY1NpemUsIG5vZGUsIGFyZ3MsIHBhcmVudCkge1xyXG4gICAgICAgICAgICB2YXIgcmVwbGFjZSA9IHtcclxuICAgICAgICAgICAgICAgIHR5cGU6IFN5bnRheC5DYWxsRXhwcmVzc2lvbixcclxuICAgICAgICAgICAgICAgIGNhbGxlZToge1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IFN5bnRheC5JZGVudGlmaWVyLFxyXG4gICAgICAgICAgICAgICAgICAgIG5hbWU6IGZ1bmN0aW9uTmFtZVxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgIGFyZ3VtZW50czogW1xyXG4gICAgICAgICAgICAgICAgICAgIG5vZGUuY2FsbGVlLm9iamVjdFxyXG4gICAgICAgICAgICAgICAgXVxyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICBpZihzZWNvbmRWZWNTaXplKXtcclxuICAgICAgICAgICAgICAgIHZhciBvdGhlciA9IFZlYy5nZW5lcmF0ZVZlY0Zyb21BcmdzKHNlY29uZFZlY1NpemUsIG5vZGUuYXJndW1lbnRzKTtcclxuICAgICAgICAgICAgICAgIHJlcGxhY2UuYXJndW1lbnRzLnB1c2gob3RoZXIpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIEFOTk8ocmVwbGFjZSkuY29weShBTk5PKG5vZGUpKTtcclxuICAgICAgICAgICAgcmV0dXJuIHJlcGxhY2U7XHJcbiAgICAgICAgfSxcclxuXHJcbiAgICAgICAgZ2VuZXJhdGVMZW5ndGhDYWxsOiBmdW5jdGlvbihub2RlLCBhcmdzLCBwYXJlbnQpe1xyXG4gICAgICAgICAgICAgICAgaWYoYXJncy5sZW5ndGggPT0gMCl7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFZlYy5jcmVhdGVGdW5jdGlvbkNhbGwoJ2xlbmd0aCcsIDAsIG5vZGUsIGFyZ3MsIHBhcmVudCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBlbHNle1xyXG4gICAgICAgICAgICAgICAgICAgICB2YXIgcmVwbGFjZSA9IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogU3ludGF4LkJpbmFyeUV4cHJlc3Npb24sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG9wZXJhdG9yOiAnKicsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxlZnQ6IG5vZGUuY2FsbGVlLm9iamVjdCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmlnaHQ6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6IFN5bnRheC5CaW5hcnlFeHByZXNzaW9uLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgb3BlcmF0b3I6ICcvJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxlZnQ6IG5vZGUuYXJndW1lbnRzWzBdLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmlnaHQ6IFZlYy5jcmVhdGVGdW5jdGlvbkNhbGwoJ2xlbmd0aCcsIDAsIG5vZGUsIGFyZ3MsIHBhcmVudClcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgICAgICAgICAgQU5OTyhyZXBsYWNlLnJpZ2h0KS5zZXRUeXBlKFRZUEVTLk5VTUJFUik7XHJcbiAgICAgICAgICAgICAgICAgICAgQU5OTyhyZXBsYWNlKS5jb3B5KEFOTk8obm9kZSkpO1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiByZXBsYWNlO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICB9O1xyXG4gICAgbnMuVmVjID0gVmVjO1xyXG5cclxuICAgIG5zLmV4dGVuZCA9IEJhc2UuZXh0ZW5kO1xyXG5cclxuXHJcbn0oZXhwb3J0cykpO1xyXG4iLCIoZnVuY3Rpb24obnMpe1xyXG5cclxuICAgIHZhciBTaGFkZSA9IHJlcXVpcmUoXCIuLi8uLi8uLi9pbnRlcmZhY2VzLmpzXCIpO1xyXG4gICAgdmFyIFN5bnRheCA9IHJlcXVpcmUoJ2VzdHJhdmVyc2UnKS5TeW50YXg7XHJcbiAgICB2YXIgVG9vbHMgPSByZXF1aXJlKFwiLi90b29scy5qc1wiKTtcclxuICAgIHZhciBBTk5PID0gcmVxdWlyZShcIi4uLy4uLy4uL2Jhc2UvYW5ub3RhdGlvbi5qc1wiKS5BTk5PO1xyXG5cclxuICAgIHZhciBUWVBFUyA9IFNoYWRlLlRZUEVTLFxyXG4gICAgICAgIEtJTkRTID0gU2hhZGUuT0JKRUNUX0tJTkRTO1xyXG5cclxuICAgIHZhciBWZWMySW5zdGFuY2UgPSB7XHJcbiAgICAgICAgbm9ybWFsaXplOiB7XHJcbiAgICAgICAgICAgIGNhbGxFeHA6IFRvb2xzLlZlYy5jcmVhdGVGdW5jdGlvbkNhbGwuYmluZChudWxsLCAnbm9ybWFsaXplJywgMClcclxuICAgICAgICB9LFxyXG4gICAgICAgIGRvdDoge1xyXG4gICAgICAgICAgICBjYWxsRXhwOiBUb29scy5WZWMuY3JlYXRlRnVuY3Rpb25DYWxsLmJpbmQobnVsbCwgJ2RvdCcsIDIpXHJcbiAgICAgICAgfSxcclxuICAgICAgICBsZW5ndGg6IHtcclxuICAgICAgICAgICAgY2FsbEV4cDogVG9vbHMuVmVjLmdlbmVyYXRlTGVuZ3RoQ2FsbFxyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIFRvb2xzLlZlYy5hdHRhY2hTd2l6emxlcyhWZWMySW5zdGFuY2UsIDIpO1xyXG4gICAgVG9vbHMuVmVjLmF0dGFjaE9wZXJhdG9ycyhWZWMySW5zdGFuY2UsIDIsIHtcclxuICAgICAgICBhZGQ6ICcrJyxcclxuICAgICAgICBzdWI6ICctJyxcclxuICAgICAgICBtdWw6ICcqJyxcclxuICAgICAgICBkaXY6ICcvJyxcclxuICAgICAgICBtb2Q6ICclJ1xyXG4gICAgfSlcclxuXHJcblxyXG4gICAgVG9vbHMuZXh0ZW5kKG5zLCB7XHJcbiAgICAgICAgaWQ6IFwiVmVjMlwiLFxyXG4gICAgICAgIGtpbmQ6IEtJTkRTLkZMT0FUMixcclxuICAgICAgICBvYmplY3Q6IHtcclxuICAgICAgICAgICAgY29uc3RydWN0b3I6IG51bGwsXHJcbiAgICAgICAgICAgIHN0YXRpYzoge31cclxuICAgICAgICB9LFxyXG4gICAgICAgIGluc3RhbmNlOiBWZWMySW5zdGFuY2VcclxuICAgIH0pO1xyXG5cclxufShleHBvcnRzKSk7XHJcbiIsIihmdW5jdGlvbihucyl7XHJcblxyXG4gICAgdmFyIFNoYWRlID0gcmVxdWlyZShcIi4uLy4uLy4uL2ludGVyZmFjZXMuanNcIik7XHJcbiAgICB2YXIgU3ludGF4ID0gcmVxdWlyZSgnZXN0cmF2ZXJzZScpLlN5bnRheDtcclxuICAgIHZhciBUb29scyA9IHJlcXVpcmUoXCIuL3Rvb2xzLmpzXCIpO1xyXG4gICAgdmFyIEFOTk8gPSByZXF1aXJlKFwiLi4vLi4vLi4vYmFzZS9hbm5vdGF0aW9uLmpzXCIpLkFOTk87XHJcblxyXG4gICAgdmFyIFRZUEVTID0gU2hhZGUuVFlQRVMsXHJcbiAgICAgICAgS0lORFMgPSBTaGFkZS5PQkpFQ1RfS0lORFM7XHJcblxyXG4gICAgdmFyIFZlYzNJbnN0YW5jZSA9IHtcclxuICAgICAgICBub3JtYWxpemU6IHtcclxuICAgICAgICAgICAgY2FsbEV4cDogVG9vbHMuVmVjLmNyZWF0ZUZ1bmN0aW9uQ2FsbC5iaW5kKG51bGwsICdub3JtYWxpemUnLCAwKVxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgZG90OiB7XHJcbiAgICAgICAgICAgIGNhbGxFeHA6IFRvb2xzLlZlYy5jcmVhdGVGdW5jdGlvbkNhbGwuYmluZChudWxsLCAnZG90JywgMylcclxuICAgICAgICB9LFxyXG4gICAgICAgIGxlbmd0aDoge1xyXG4gICAgICAgICAgICBjYWxsRXhwOiBUb29scy5WZWMuZ2VuZXJhdGVMZW5ndGhDYWxsXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgVG9vbHMuVmVjLmF0dGFjaFN3aXp6bGVzKFZlYzNJbnN0YW5jZSwgMyk7XHJcbiAgICBUb29scy5WZWMuYXR0YWNoT3BlcmF0b3JzKFZlYzNJbnN0YW5jZSwgMywge1xyXG4gICAgICAgIGFkZDogJysnLFxyXG4gICAgICAgIHN1YjogJy0nLFxyXG4gICAgICAgIG11bDogJyonLFxyXG4gICAgICAgIGRpdjogJy8nLFxyXG4gICAgICAgIG1vZDogJyUnXHJcbiAgICB9KVxyXG5cclxuXHJcbiAgICBUb29scy5leHRlbmQobnMsIHtcclxuICAgICAgICBpZDogXCJWZWMzXCIsXHJcbiAgICAgICAga2luZDogS0lORFMuRkxPQVQzLFxyXG4gICAgICAgIG9iamVjdDoge1xyXG4gICAgICAgICAgICBjb25zdHJ1Y3RvcjogbnVsbCxcclxuICAgICAgICAgICAgc3RhdGljOiB7fVxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgaW5zdGFuY2U6IFZlYzNJbnN0YW5jZVxyXG4gICAgfSk7XHJcblxyXG59KGV4cG9ydHMpKTtcclxuIiwiKGZ1bmN0aW9uKG5zKXtcclxuXHJcbiAgICB2YXIgU2hhZGUgPSByZXF1aXJlKFwiLi4vLi4vLi4vaW50ZXJmYWNlcy5qc1wiKTtcclxuICAgIHZhciBTeW50YXggPSByZXF1aXJlKCdlc3RyYXZlcnNlJykuU3ludGF4O1xyXG4gICAgdmFyIFRvb2xzID0gcmVxdWlyZShcIi4vdG9vbHMuanNcIik7XHJcbiAgICB2YXIgQU5OTyA9IHJlcXVpcmUoXCIuLi8uLi8uLi9iYXNlL2Fubm90YXRpb24uanNcIikuQU5OTztcclxuXHJcbiAgICB2YXIgVFlQRVMgPSBTaGFkZS5UWVBFUyxcclxuICAgICAgICBLSU5EUyA9IFNoYWRlLk9CSkVDVF9LSU5EUztcclxuXHJcbiAgICB2YXIgVmVjNEluc3RhbmNlID0ge1xyXG4gICAgICAgIG5vcm1hbGl6ZToge1xyXG4gICAgICAgICAgICBjYWxsRXhwOiBUb29scy5WZWMuY3JlYXRlRnVuY3Rpb25DYWxsLmJpbmQobnVsbCwgJ25vcm1hbGl6ZScsIDApXHJcbiAgICAgICAgfSxcclxuICAgICAgICBkb3Q6IHtcclxuICAgICAgICAgICAgY2FsbEV4cDogVG9vbHMuVmVjLmNyZWF0ZUZ1bmN0aW9uQ2FsbC5iaW5kKG51bGwsICdkb3QnLCA0KVxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgbGVuZ3RoOiB7XHJcbiAgICAgICAgICAgIGNhbGxFeHA6IFRvb2xzLlZlYy5nZW5lcmF0ZUxlbmd0aENhbGxcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICBUb29scy5WZWMuYXR0YWNoU3dpenpsZXMoVmVjNEluc3RhbmNlLCA0KTtcclxuICAgIFRvb2xzLlZlYy5hdHRhY2hPcGVyYXRvcnMoVmVjNEluc3RhbmNlLCA0LCB7XHJcbiAgICAgICAgYWRkOiAnKycsXHJcbiAgICAgICAgc3ViOiAnLScsXHJcbiAgICAgICAgbXVsOiAnKicsXHJcbiAgICAgICAgZGl2OiAnLycsXHJcbiAgICAgICAgbW9kOiAnJSdcclxuICAgIH0pXHJcblxyXG5cclxuICAgIFRvb2xzLmV4dGVuZChucywge1xyXG4gICAgICAgIGlkOiBcIlZlYzRcIixcclxuICAgICAgICBraW5kOiBLSU5EUy5GTE9BVDQsXHJcbiAgICAgICAgb2JqZWN0OiB7XHJcbiAgICAgICAgICAgIGNvbnN0cnVjdG9yOiBudWxsLFxyXG4gICAgICAgICAgICBzdGF0aWM6IHt9XHJcbiAgICAgICAgfSxcclxuICAgICAgICBpbnN0YW5jZTogVmVjNEluc3RhbmNlXHJcbiAgICB9KTtcclxuXHJcbn0oZXhwb3J0cykpO1xyXG4iLCIoZnVuY3Rpb24gKG5zKSB7XHJcblxyXG4gICAgdmFyIEJhc2UgPSByZXF1aXJlKFwiLi4vLi4vYmFzZS9pbmRleC5qc1wiKSxcclxuICAgICAgICBBTk5PID0gcmVxdWlyZShcIi4uLy4uL2Jhc2UvYW5ub3RhdGlvbi5qc1wiKS5BTk5PLFxyXG4gICAgICAgIEFubm90YXRpb24gPSByZXF1aXJlKFwiLi4vLi4vYmFzZS9hbm5vdGF0aW9uLmpzXCIpLkFubm90YXRpb24sXHJcbiAgICAgICAgRnVuY3Rpb25Bbm5vdGF0aW9uID0gcmVxdWlyZShcIi4uLy4uL2Jhc2UvYW5ub3RhdGlvbi5qc1wiKS5GdW5jdGlvbkFubm90YXRpb24sXHJcbiAgICAgICAgVHlwZUluZm8gPSByZXF1aXJlKFwiLi4vLi4vYmFzZS90eXBlaW5mby5qc1wiKS5UeXBlSW5mbyxcclxuICAgICAgICBTaGFkZSA9IHJlcXVpcmUoXCIuLy4uLy4uL2ludGVyZmFjZXMuanNcIiksXHJcbiAgICAgICAgVHlwZXMgPSBTaGFkZS5UWVBFUyxcclxuICAgICAgICBLaW5kcyA9IFNoYWRlLk9CSkVDVF9LSU5EUyxcclxuICAgICAgICBTb3VyY2VzID0gcmVxdWlyZShcIi4vLi4vLi4vaW50ZXJmYWNlcy5qc1wiKS5TT1VSQ0VTO1xyXG5cclxuICAgIHZhciBPYmplY3RSZWdpc3RyeSA9IHJlcXVpcmUoXCIuL3JlZ2lzdHJ5L2luZGV4LmpzXCIpLlJlZ2lzdHJ5LFxyXG4gICAgICAgIENvbnRleHQgPSByZXF1aXJlKFwiLi4vLi4vYmFzZS9jb250ZXh0LmpzXCIpLmdldENvbnRleHQoT2JqZWN0UmVnaXN0cnkpO1xyXG5cclxuXHJcbiAgICB2YXIgd2FsayA9IHJlcXVpcmUoJ2VzdHJhdmVyc2UnKTtcclxuICAgIHZhciBTeW50YXggPSB3YWxrLlN5bnRheDtcclxuXHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBUcmFuc2Zvcm1zIHRoZSBKUyBBU1QgdG8gYW4gQVNUIHJlcHJlc2VudGF0aW9uIGNvbnZlbmllbnRcclxuICAgICAqIGZvciBjb2RlIGdlbmVyYXRpb25cclxuICAgICAqIEBjb25zdHJ1Y3RvclxyXG4gICAgICovXHJcbiAgICB2YXIgR0xBU1RUcmFuc2Zvcm1lciA9IGZ1bmN0aW9uIChtYWluSWQpIHtcclxuICAgICAgICB0aGlzLm1haW5JZCA9IG1haW5JZDtcclxuICAgIH07XHJcblxyXG4gICAgQmFzZS5leHRlbmQoR0xBU1RUcmFuc2Zvcm1lci5wcm90b3R5cGUsIHtcclxuICAgICAgICByZWdpc3Rlckdsb2JhbENvbnRleHQgOiBmdW5jdGlvbiAocHJvZ3JhbSkge1xyXG4gICAgICAgICAgICB2YXIgY3R4ID0gbmV3IENvbnRleHQocHJvZ3JhbSwgbnVsbCwge25hbWU6IFwiZ2xvYmFsXCJ9KTtcclxuICAgICAgICAgICAgY3R4LnJlZ2lzdGVyT2JqZWN0KFwiTWF0aFwiLCBPYmplY3RSZWdpc3RyeS5nZXRCeU5hbWUoXCJNYXRoXCIpKTtcclxuICAgICAgICAgICAgY3R4LnJlZ2lzdGVyT2JqZWN0KFwidGhpc1wiLCBPYmplY3RSZWdpc3RyeS5nZXRCeU5hbWUoXCJTeXN0ZW1cIikpO1xyXG4gICAgICAgICAgICBjdHgucmVnaXN0ZXJPYmplY3QoXCJTaGFkZVwiLCBPYmplY3RSZWdpc3RyeS5nZXRCeU5hbWUoXCJTaGFkZVwiKSk7XHJcbiAgICAgICAgICAgIGN0eC5yZWdpc3Rlck9iamVjdChcIlZlYzJcIiwgT2JqZWN0UmVnaXN0cnkuZ2V0QnlOYW1lKFwiVmVjMlwiKSk7XHJcbiAgICAgICAgICAgIGN0eC5yZWdpc3Rlck9iamVjdChcIlZlYzNcIiwgT2JqZWN0UmVnaXN0cnkuZ2V0QnlOYW1lKFwiVmVjM1wiKSk7XHJcbiAgICAgICAgICAgIGN0eC5yZWdpc3Rlck9iamVjdChcIkNvbG9yXCIsIE9iamVjdFJlZ2lzdHJ5LmdldEJ5TmFtZShcIlZlYzNcIikpO1xyXG4gICAgICAgICAgICBjdHguZGVjbGFyZVZhcmlhYmxlKFwiZ2xfRnJhZ0Nvb3JkXCIsIGZhbHNlKTtcclxuICAgICAgICAgICAgY3R4LnVwZGF0ZUV4cHJlc3Npb24oXCJnbF9GcmFnQ29vcmRcIiwgbmV3IFR5cGVJbmZvKHtcclxuICAgICAgICAgICAgICAgIGV4dHJhOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogVHlwZXMuT0JKRUNULFxyXG4gICAgICAgICAgICAgICAgICAgIGtpbmQ6IEtpbmRzLkZMT0FUM1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KSk7XHJcbiAgICAgICAgICAgIGN0eC5kZWNsYXJlVmFyaWFibGUoXCJfc3lzX25vcm1hbGl6ZWRDb29yZHNcIiwgZmFsc2UpO1xyXG4gICAgICAgICAgICBjdHgudXBkYXRlRXhwcmVzc2lvbihcIl9zeXNfbm9ybWFsaXplZENvb3Jkc1wiLCBuZXcgVHlwZUluZm8oe1xyXG4gICAgICAgICAgICAgICAgZXh0cmE6IHtcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiBUeXBlcy5PQkpFQ1QsXHJcbiAgICAgICAgICAgICAgICAgICAga2luZDogS2luZHMuRkxPQVQzXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pKTtcclxuXHJcbiAgICAgICAgICAgIHJldHVybiBjdHg7XHJcbiAgICAgICAgfSxcclxuICAgICAgICB0cmFuc2Zvcm1BQVNUOiBmdW5jdGlvbiAocHJvZ3JhbSkge1xyXG4gICAgICAgICAgICB0aGlzLnJvb3QgPSBwcm9ncmFtO1xyXG4gICAgICAgICAgICB2YXIgY29udGV4dCA9IHRoaXMucmVnaXN0ZXJHbG9iYWxDb250ZXh0KHByb2dyYW0pO1xyXG5cclxuICAgICAgICAgICAgdmFyIHN0YXRlID0ge1xyXG4gICAgICAgICAgICAgICAgIGNvbnRleHQ6IGNvbnRleHQsXHJcbiAgICAgICAgICAgICAgICAgY29udGV4dFN0YWNrOiBbY29udGV4dF0sXHJcbiAgICAgICAgICAgICAgICAgaW5NYWluOiAgdGhpcy5tYWluSWQgPT0gY29udGV4dC5zdHIoKSxcclxuICAgICAgICAgICAgICAgICBnbG9iYWxQYXJhbWV0ZXJzIDogcHJvZ3JhbS5pbmplY3Rpb25zW3RoaXMubWFpbklkXSAmJiBwcm9ncmFtLmluamVjdGlvbnNbdGhpcy5tYWluSWRdWzBdID8gcHJvZ3JhbS5pbmplY3Rpb25zW3RoaXMubWFpbklkXVswXS5ub2RlLmluZm8gOiB7fSxcclxuICAgICAgICAgICAgICAgICBibG9ja2VkTmFtZXMgOiBbXSxcclxuICAgICAgICAgICAgICAgICB0b3BEZWNsYXJhdGlvbnMgOiBbXSxcclxuICAgICAgICAgICAgICAgICBpZE5hbWVNYXAgOiB7fVxyXG4gICAgICAgICAgICB9XHJcblxyXG5cclxuXHJcbiAgICAgICAgICAgIGZvcih2YXIgbmFtZSBpbiBzdGF0ZS5nbG9iYWxQYXJhbWV0ZXJzKXtcclxuICAgICAgICAgICAgICAgIHN0YXRlLmJsb2NrZWROYW1lcy5wdXNoKG5hbWUpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICB0aGlzLnJlcGxhY2UocHJvZ3JhbSwgc3RhdGUpO1xyXG5cclxuICAgICAgICAgICAgZm9yKHZhciBuYW1lIGluIHN0YXRlLmdsb2JhbFBhcmFtZXRlcnMpe1xyXG4gICAgICAgICAgICAgICAgdmFyIGRlY2wgPSBoYW5kbGVUb3BEZWNsYXJhdGlvbihuYW1lLCBzdGF0ZS5nbG9iYWxQYXJhbWV0ZXJzKTtcclxuICAgICAgICAgICAgICAgIGlmIChkZWNsKVxyXG4gICAgICAgICAgICAgICAgICAgIHByb2dyYW0uYm9keS51bnNoaWZ0KGRlY2wpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICByZXR1cm4gcHJvZ3JhbTtcclxuICAgICAgICB9LFxyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqXHJcbiAgICAgICAgICogQHBhcmFtIHtPYmplY3QhfSBhc3RcclxuICAgICAgICAgKiBAcGFyYW0ge09iamVjdCF9IHN0YXRlXHJcbiAgICAgICAgICogQHJldHVybnMgeyp9XHJcbiAgICAgICAgICovXHJcbiAgICAgICAgcmVwbGFjZTogZnVuY3Rpb24oYXN0LCBzdGF0ZSkge1xyXG4gICAgICAgICAgICB3YWxrLnJlcGxhY2UoYXN0LCB7XHJcblxyXG4gICAgICAgICAgICAgICAgZW50ZXI6IGZ1bmN0aW9uIChub2RlLCBwYXJlbnQpIHtcclxuICAgICAgICAgICAgICAgICAgICAvL2NvbnNvbGUubG9nKFwiRW50ZXI6XCIsIG5vZGUudHlwZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgc3dpdGNoIChub2RlLnR5cGUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSBTeW50YXguSWRlbnRpZmllcjpcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBoYW5kbGVJZGVudGlmaWVyKG5vZGUsIHBhcmVudCwgc3RhdGUuYmxvY2tlZE5hbWVzLCBzdGF0ZS5pZE5hbWVNYXApO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjYXNlIFN5bnRheC5JZlN0YXRlbWVudDpcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBoYW5kbGVJZlN0YXRlbWVudChub2RlKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSBTeW50YXguQ29uZGl0aW9uYWxFeHByZXNzaW9uOlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGhhbmRsZUNvbmRpdGlvbmFsRXhwcmVzc2lvbihub2RlLCBzdGF0ZSwgdGhpcyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgU3ludGF4LkxvZ2ljYWxFeHByZXNzaW9uOlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGhhbmRsZUxvZ2ljYWxFeHByZXNzaW9uKG5vZGUsIHRoaXMsIHN0YXRlKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSBTeW50YXguRnVuY3Rpb25EZWNsYXJhdGlvbjpcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIE5vIG5lZWQgdG8gZGVjbGFyZSwgdGhpcyBoYXMgYmVlbiBhbm5vdGF0ZWQgYWxyZWFkeVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHBhcmVudENvbnRleHQgPSBzdGF0ZS5jb250ZXh0U3RhY2tbc3RhdGUuY29udGV4dFN0YWNrLmxlbmd0aCAtIDFdO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGNvbnRleHQgPSBuZXcgQ29udGV4dChub2RlLCBwYXJlbnRDb250ZXh0LCB7bmFtZTogbm9kZS5pZC5uYW1lIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RhdGUuY29udGV4dCA9IGNvbnRleHQ7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdGF0ZS5jb250ZXh0U3RhY2sucHVzaChjb250ZXh0KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0YXRlLmluTWFpbiA9IHRoaXMubWFpbklkID09IGNvbnRleHQuc3RyKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9LmJpbmQodGhpcyksXHJcblxyXG4gICAgICAgICAgICAgICAgbGVhdmU6IGZ1bmN0aW9uKG5vZGUsIHBhcmVudCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHN3aXRjaChub2RlLnR5cGUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSBTeW50YXguTWVtYmVyRXhwcmVzc2lvbjpcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBoYW5kbGVNZW1iZXJFeHByZXNzaW9uKG5vZGUsIHBhcmVudCwgc3RhdGUpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjYXNlIFN5bnRheC5DYWxsRXhwcmVzc2lvbjpcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBoYW5kbGVDYWxsRXhwcmVzc2lvbihub2RlLCBwYXJlbnQsIHN0YXRlLnRvcERlY2xhcmF0aW9ucywgc3RhdGUuY29udGV4dCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgU3ludGF4LkZ1bmN0aW9uRGVjbGFyYXRpb246XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdGF0ZS5jb250ZXh0ID0gc3RhdGUuY29udGV4dFN0YWNrLnBvcCgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RhdGUuaW5NYWluID0gc3RhdGUuY29udGV4dC5zdHIoKSA9PSB0aGlzLm1haW5JZDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzdGF0ZS5pbk1haW4pXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGhhbmRsZU1haW5GdW5jdGlvbihub2RlLCBwYXJlbnQsIHN0YXRlLmNvbnRleHQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjYXNlIFN5bnRheC5SZXR1cm5TdGF0ZW1lbnQ6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZihzdGF0ZS5pbk1haW4pIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gaGFuZGxlUmV0dXJuSW5NYWluKG5vZGUsIHBhcmVudCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSBTeW50YXguQmluYXJ5RXhwcmVzc2lvbjpcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBoYW5kbGVCaW5hcnlFeHByZXNzaW9uKG5vZGUsIHBhcmVudCk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH0uYmluZCh0aGlzKVxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgcmV0dXJuIGFzdDtcclxuICAgICAgICB9XHJcbiAgICB9KTtcclxuXHJcbiAgICB2YXIgaGFuZGxlVG9wRGVjbGFyYXRpb24gPSBmdW5jdGlvbihuYW1lLCBnbG9iYWxQYXJhbWV0ZXJzKXtcclxuICAgICAgICB2YXIgcHJvcGVydHlMaXRlcmFsID0gIHsgdHlwZTogU3ludGF4LklkZW50aWZpZXIsIG5hbWU6IGdldE5hbWVGb3JHbG9iYWwoZ2xvYmFsUGFyYW1ldGVycywgbmFtZSl9O1xyXG4gICAgICAgIHZhciBwcm9wZXJ0eUFubm90YXRpb24gPSAgQU5OTyhwcm9wZXJ0eUxpdGVyYWwpO1xyXG4gICAgICAgIHByb3BlcnR5QW5ub3RhdGlvbi5zZXRGcm9tRXh0cmEoZ2xvYmFsUGFyYW1ldGVyc1tuYW1lXSk7XHJcblxyXG4gICAgICAgIGlmIChwcm9wZXJ0eUFubm90YXRpb24uaXNOdWxsT3JVbmRlZmluZWQoKSlcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG5cclxuICAgICAgICB2YXIgZGVjbCA9IHtcclxuICAgICAgICAgICAgdHlwZTogU3ludGF4LlZhcmlhYmxlRGVjbGFyYXRpb24sXHJcbiAgICAgICAgICAgIGRlY2xhcmF0aW9uczogW1xyXG4gICAgICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IFN5bnRheC5WYXJpYWJsZURlY2xhcmF0b3IsXHJcbiAgICAgICAgICAgICAgICAgICAgaWQ6IHByb3BlcnR5TGl0ZXJhbCxcclxuICAgICAgICAgICAgICAgICAgICBpbml0OiBudWxsXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIF0sXHJcbiAgICAgICAgICAgIGtpbmQ6IFwidmFyXCJcclxuICAgICAgICB9O1xyXG4gICAgICAgIHZhciBkZWNsQW5ub3RhdGlvbiA9ICBBTk5PKGRlY2wuZGVjbGFyYXRpb25zWzBdKTtcclxuICAgICAgICBkZWNsQW5ub3RhdGlvbi5jb3B5KHByb3BlcnR5QW5ub3RhdGlvbik7XHJcbiAgICAgICAgcmV0dXJuIGRlY2w7XHJcbiAgICB9XHJcblxyXG4gICAgdmFyIGhhbmRsZUlkZW50aWZpZXIgPSBmdW5jdGlvbihub2RlLCBwYXJlbnQsIGJsb2NrZWROYW1lcywgaWROYW1lTWFwKXtcclxuICAgICAgICBpZihwYXJlbnQudHlwZSA9PSBTeW50YXguRnVuY3Rpb25EZWNsYXJhdGlvbilcclxuICAgICAgICAgICAgcmV0dXJuIG5vZGU7XHJcbiAgICAgICAgaWYocGFyZW50LnR5cGUgPT0gU3ludGF4Lk1lbWJlckV4cHJlc3Npb24gJiYgQU5OTyhwYXJlbnQub2JqZWN0KS5pc0dsb2JhbCgpKVxyXG4gICAgICAgICAgICByZXR1cm4gbm9kZTtcclxuXHJcblxyXG4gICAgICAgIHZhciBuYW1lID0gbm9kZS5uYW1lO1xyXG4gICAgICAgIGlmKGlkTmFtZU1hcFtuYW1lXSkgbm9kZS5uYW1lID0gaWROYW1lTWFwW25hbWVdO1xyXG4gICAgICAgIHZhciBuZXdOYW1lID0gbmFtZSwgaSA9IDE7XHJcbiAgICAgICAgd2hpbGUoYmxvY2tlZE5hbWVzLmluZGV4T2YobmV3TmFtZSkgIT0gLTEpe1xyXG4gICAgICAgICAgICBuZXdOYW1lID0gbmFtZSArIFwiX1wiICsgKCsraSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlkTmFtZU1hcFtuYW1lXSA9IG5ld05hbWU7XHJcbiAgICAgICAgbm9kZS5uYW1lID0gbmV3TmFtZTtcclxuICAgICAgICByZXR1cm4gbm9kZTtcclxuICAgIH1cclxuXHJcblxyXG4gICAgdmFyIGhhbmRsZVJldHVybkluTWFpbiA9IGZ1bmN0aW9uKG5vZGUsIHBhcmVudCkge1xyXG4gICAgICAgIGlmIChub2RlLmFyZ3VtZW50KSB7XHJcbiAgICAgICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgICAgICB0eXBlOiBTeW50YXguQmxvY2tTdGF0ZW1lbnQsXHJcbiAgICAgICAgICAgICAgICBib2R5OiBbXHJcbiAgICAgICAgICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiBTeW50YXguQXNzaWdubWVudEV4cHJlc3Npb24sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG9wZXJhdG9yOiBcIj1cIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGVmdDoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogU3ludGF4LklkZW50aWZpZXIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBuYW1lOiBcImdsX0ZyYWdDb2xvclwiXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJpZ2h0OiBub2RlLmFyZ3VtZW50XHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6IFN5bnRheC5SZXR1cm5TdGF0ZW1lbnRcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBdXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICAgICAgdHlwZTogU3ludGF4LkV4cHJlc3Npb25TdGF0ZW1lbnQsXHJcbiAgICAgICAgICAgICAgICBleHByZXNzaW9uIDoge1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IFN5bnRheC5JZGVudGlmaWVyLFxyXG4gICAgICAgICAgICAgICAgICAgIG5hbWU6IFwiZGlzY2FyZFwiXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9O1xyXG5cclxuICAgIHZhciBoYW5kbGVNYWluRnVuY3Rpb24gPSBmdW5jdGlvbihub2RlLCBwYXJlbnQsIGNvbnRleHQpIHtcclxuICAgICAgICB2YXIgYW5ubyA9IG5ldyBGdW5jdGlvbkFubm90YXRpb24obm9kZSk7XHJcbiAgICAgICAgYW5uby5zZXRSZXR1cm5JbmZvKHsgdHlwZTogVHlwZXMuVU5ERUZJTkVEIH0pO1xyXG5cclxuICAgICAgICAvLyBjb25zb2xlLmxvZyhjb250ZXh0KTtcclxuICAgICAgICAvLyBNYWluIGhhcyBubyBwYXJhbWV0ZXJzXHJcbiAgICAgICAgbm9kZS5wYXJhbXMgPSBbXTtcclxuICAgICAgICAvLyBSZW5hbWUgdG8gJ21haW4nXHJcbiAgICAgICAgbm9kZS5pZC5uYW1lID0gXCJtYWluXCI7XHJcbiAgICAgICAgLy9jb25zb2xlLmxvZyhub2RlKTtcclxuICAgIH1cclxuXHJcblxyXG4gICAgZnVuY3Rpb24gZ2V0TmFtZU9mTm9kZShub2RlKSB7XHJcbiAgICAgICAgc3dpdGNoIChub2RlLnR5cGUpIHtcclxuICAgICAgICAgICAgY2FzZSBTeW50YXguSWRlbnRpZmllcjpcclxuICAgICAgICAgICAgICAgIHJldHVybiBub2RlLm5hbWU7XHJcbiAgICAgICAgICAgIGNhc2UgU3ludGF4Lk1lbWJlckV4cHJlc3Npb246XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gZ2V0TmFtZU9mTm9kZShub2RlLm9iamVjdCkgKyBcIi5cIiArIGdldE5hbWVPZk5vZGUobm9kZS5wcm9wZXJ0eSk7XHJcbiAgICAgICAgICAgIGNhc2UgU3ludGF4Lk5ld0V4cHJlc3Npb246XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gZ2V0TmFtZU9mTm9kZShub2RlLmNhbGxlZSk7XHJcbiAgICAgICAgICAgIGRlZmF1bHQ6XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gXCJ1bmtub3duKFwiICsgbm9kZS50eXBlICsgXCIpXCI7XHJcbiAgICAgICAgfVxyXG4gICAgfTtcclxuXHJcbiAgICBmdW5jdGlvbiBnZXRPYmplY3RSZWZlcmVuY2VGcm9tTm9kZShvYmplY3QsIGNvbnRleHQpIHtcclxuICAgICAgICBzd2l0Y2ggKG9iamVjdC50eXBlKSB7XHJcbiAgICAgICAgICAgIGNhc2UgU3ludGF4Lk5ld0V4cHJlc3Npb246XHJcbiAgICAgICAgICAgIGNhc2UgU3ludGF4LkNhbGxFeHByZXNzaW9uOlxyXG4gICAgICAgICAgICBjYXNlIFN5bnRheC5NZW1iZXJFeHByZXNzaW9uOlxyXG4gICAgICAgICAgICBjYXNlIFN5bnRheC5CaW5hcnlFeHByZXNzaW9uOlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGNvbnRleHQuY3JlYXRlVHlwZUluZm8ob2JqZWN0KTtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIFN5bnRheC5JZGVudGlmaWVyOlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGNvbnRleHQuZ2V0QmluZGluZ0J5TmFtZShvYmplY3QubmFtZSk7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSBTeW50YXguVGhpc0V4cHJlc3Npb246XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gY29udGV4dC5nZXRCaW5kaW5nQnlOYW1lKFwidGhpc1wiKTtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBkZWZhdWx0OlxyXG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiVW5oYW5kbGVkIG9iamVjdCB0eXBlIGluIEdMU0wgZ2VuZXJhdGlvbjogXCIgKyBvYmplY3QudHlwZSk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHZhciBoYW5kbGVDYWxsRXhwcmVzc2lvbiA9IGZ1bmN0aW9uIChjYWxsRXhwcmVzc2lvbiwgcGFyZW50LCB0b3BEZWNsYXJhdGlvbnMsIGNvbnRleHQpIHtcclxuXHJcbiAgICAgICAgLy8gSXMgdGhpcyBhIGNhbGwgb24gYW4gb2JqZWN0P1xyXG4gICAgICAgIGlmIChjYWxsRXhwcmVzc2lvbi5jYWxsZWUudHlwZSA9PSBTeW50YXguTWVtYmVyRXhwcmVzc2lvbikge1xyXG4gICAgICAgICAgICB2YXIgY2FsbGVlUmVmZXJlbmNlID0gZ2V0T2JqZWN0UmVmZXJlbmNlRnJvbU5vZGUoY2FsbEV4cHJlc3Npb24uY2FsbGVlLCBjb250ZXh0KTtcclxuICAgICAgICAgICAgaWYoIShjYWxsZWVSZWZlcmVuY2UgJiYgY2FsbGVlUmVmZXJlbmNlLmlzRnVuY3Rpb24oKSkpXHJcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJTb21ldGhpbmcgd2VudCB3cm9uZyBpbiB0eXBlIGluZmVyZW5jZVwiKTtcclxuXHJcbiAgICAgICAgICAgIHZhciBvYmplY3QgPSBjYWxsRXhwcmVzc2lvbi5jYWxsZWUub2JqZWN0LFxyXG4gICAgICAgICAgICAgICAgcHJvcGVydHlOYW1lID0gY2FsbEV4cHJlc3Npb24uY2FsbGVlLnByb3BlcnR5Lm5hbWU7XHJcblxyXG4gICAgICAgICAgICB2YXIgb2JqZWN0UmVmZXJlbmNlID0gZ2V0T2JqZWN0UmVmZXJlbmNlRnJvbU5vZGUob2JqZWN0LCBjb250ZXh0KTtcclxuICAgICAgICAgICAgaWYoIW9iamVjdFJlZmVyZW5jZSkgIHtcclxuICAgICAgICAgICAgICAgIFNoYWRlLnRocm93RXJyb3IoY2FsbEV4cHJlc3Npb24sIFwiSW50ZXJuYWw6IE5vIG9iamVjdCBpbmZvIGZvcjogXCIgKyBvYmplY3QpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICB2YXIgb2JqZWN0SW5mbyA9IGNvbnRleHQuZ2V0T2JqZWN0SW5mb0ZvcihvYmplY3RSZWZlcmVuY2UpO1xyXG4gICAgICAgICAgICBpZighb2JqZWN0SW5mbykgeyAvLyBFdmVyeSBvYmplY3QgbmVlZHMgYW4gaW5mbywgb3RoZXJ3aXNlIHdlIGRpZCBzb21ldGhpbmcgd3JvbmdcclxuICAgICAgICAgICAgICAgIFNoYWRlLnRocm93RXJyb3IoY2FsbEV4cHJlc3Npb24sIFwiSW50ZXJuYWwgRXJyb3I6IE5vIG9iamVjdCByZWdpc3RlcmVkIGZvcjogXCIgKyBvYmplY3RSZWZlcmVuY2UuZ2V0VHlwZVN0cmluZygpICsgXCIsIFwiICsgZ2V0TmFtZU9mTm9kZShjYWxsRXhwcmVzc2lvbi5jYWxsZWUub2JqZWN0KStcIiwgXCIrY2FsbEV4cHJlc3Npb24uY2FsbGVlLm9iamVjdC50eXBlKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAob2JqZWN0SW5mby5oYXNPd25Qcm9wZXJ0eShwcm9wZXJ0eU5hbWUpKSB7XHJcbiAgICAgICAgICAgICAgICB2YXIgcHJvcGVydHlIYW5kbGVyID0gb2JqZWN0SW5mb1twcm9wZXJ0eU5hbWVdO1xyXG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBwcm9wZXJ0eUhhbmRsZXIuY2FsbEV4cCA9PSBcImZ1bmN0aW9uXCIpIHtcclxuICAgICAgICAgICAgICAgICAgICB2YXIgYXJncyA9IEFubm90YXRpb24uY3JlYXRlQW5ub3RhdGVkTm9kZUFycmF5KGNhbGxFeHByZXNzaW9uLmFyZ3VtZW50cywgY29udGV4dCk7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHByb3BlcnR5SGFuZGxlci5jYWxsRXhwKGNhbGxFeHByZXNzaW9uLCBhcmdzLCBwYXJlbnQpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgIH1cclxuXHJcbiAgICB9XHJcblxyXG5cclxuICAgIHZhciBoYW5kbGVNZW1iZXJFeHByZXNzaW9uID0gZnVuY3Rpb24gKG1lbWJlckV4cHJlc3Npb24sIHBhcmVudCwgc3RhdGUpIHtcclxuICAgICAgICB2YXIgcHJvcGVydHlOYW1lID0gbWVtYmVyRXhwcmVzc2lvbi5wcm9wZXJ0eS5uYW1lLFxyXG4gICAgICAgICAgICBjb250ZXh0ID0gc3RhdGUuY29udGV4dDtcclxuXHJcbiAgICAgICAgdmFyIG9iamVjdFJlZmVyZW5jZSA9IGdldE9iamVjdFJlZmVyZW5jZUZyb21Ob2RlKG1lbWJlckV4cHJlc3Npb24ub2JqZWN0LCBjb250ZXh0KTtcclxuXHJcbiAgICAgICAgaWYgKG9iamVjdFJlZmVyZW5jZSAmJiBvYmplY3RSZWZlcmVuY2UuaXNPYmplY3QoKSkge1xyXG4gICAgICAgICAgICB2YXIgb2JqZWN0SW5mbyA9IGNvbnRleHQuZ2V0T2JqZWN0SW5mb0ZvcihvYmplY3RSZWZlcmVuY2UpO1xyXG4gICAgICAgICAgICBpZighb2JqZWN0SW5mbykgey8vIEV2ZXJ5IG9iamVjdCBuZWVkcyBhbiBpbmZvLCBvdGhlcndpc2Ugd2UgZGlkIHNvbWV0aGluZyB3cm9uZ1xyXG4gICAgICAgICAgICAgICAgU2hhZGUudGhyb3dFcnJvcihtZW1iZXJFeHByZXNzaW9uLCBcIkludGVybmFsIEVycm9yOiBObyBvYmplY3QgcmVnaXN0ZXJlZCBmb3I6IFwiICsgb2JqZWN0UmVmZXJlbmNlLmdldFR5cGVTdHJpbmcoKSArIEpTT04uc3RyaW5naWZ5KG1lbWJlckV4cHJlc3Npb24ub2JqZWN0KSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKG9iamVjdEluZm8uaGFzT3duUHJvcGVydHkocHJvcGVydHlOYW1lKSkge1xyXG4gICAgICAgICAgICAgICAgdmFyIHByb3BlcnR5SGFuZGxlciA9IG9iamVjdEluZm9bcHJvcGVydHlOYW1lXTtcclxuICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgcHJvcGVydHlIYW5kbGVyLnByb3BlcnR5ID09IFwiZnVuY3Rpb25cIikge1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciByZXN1bHQgPSBwcm9wZXJ0eUhhbmRsZXIucHJvcGVydHkobWVtYmVyRXhwcmVzc2lvbiwgcGFyZW50LCBjb250ZXh0LCBzdGF0ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJlc3VsdDtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYob2JqZWN0UmVmZXJlbmNlICYmIG9iamVjdFJlZmVyZW5jZS5pc0dsb2JhbCgpKSB7XHJcbiAgICAgICAgICAgIHZhciBwcm9wZXJ0eUxpdGVyYWwgPSAgeyB0eXBlOiBTeW50YXguSWRlbnRpZmllciwgbmFtZTogZ2V0TmFtZUZvckdsb2JhbChvYmplY3RSZWZlcmVuY2UsIHByb3BlcnR5TmFtZSl9O1xyXG4gICAgICAgICAgICBBTk5PKHByb3BlcnR5TGl0ZXJhbCkuY29weShBTk5PKG1lbWJlckV4cHJlc3Npb24pKTtcclxuICAgICAgICAgICAgcmV0dXJuIHByb3BlcnR5TGl0ZXJhbDtcclxuICAgICAgICB9XHJcblxyXG4gICAgfTtcclxuXHJcbiAgICB2YXIgZ2V0TmFtZUZvckdsb2JhbCA9IGZ1bmN0aW9uKHJlZmVyZW5jZSwgYmFzZU5hbWUpIHtcclxuICAgICAgICB2YXIgZW50cnkgPSByZWZlcmVuY2VbYmFzZU5hbWVdO1xyXG4gICAgICAgIGlmKGVudHJ5KSB7XHJcbiAgICAgICAgICAgIGlmIChlbnRyeS5zb3VyY2UgPT0gU291cmNlcy5WRVJURVgpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBcImZyYWdfXCIgKyBiYXNlTmFtZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gYmFzZU5hbWU7XHJcbiAgICB9XHJcblxyXG4gICAgdmFyIGhhbmRsZUJpbmFyeUV4cHJlc3Npb24gPSBmdW5jdGlvbiAoYmluYXJ5RXhwcmVzc2lvbiwgcGFyZW50LCBjYikge1xyXG4gICAgICAgIC8vIEluIEdMLCB3ZSBjYW4ndCBtaXggdXAgZmxvYXRzLCBpbnRzIGFuZCBib29sZCBmb3IgYmluYXJ5IGV4cHJlc3Npb25zXHJcbiAgICAgICAgdmFyIGxlZnQgPSBBTk5PKGJpbmFyeUV4cHJlc3Npb24ubGVmdCksXHJcbiAgICAgICAgICAgIHJpZ2h0ID0gQU5OTyhiaW5hcnlFeHByZXNzaW9uLnJpZ2h0KTtcclxuXHJcbiAgICAgICAgaWYgKGxlZnQuaXNOdW1iZXIoKSAmJiByaWdodC5pc0ludCgpKSB7XHJcbiAgICAgICAgICAgIGJpbmFyeUV4cHJlc3Npb24ucmlnaHQgPSBjYXN0VG9GbG9hdChiaW5hcnlFeHByZXNzaW9uLnJpZ2h0KTtcclxuICAgICAgICB9XHJcbiAgICAgICAgZWxzZSBpZiAocmlnaHQuaXNOdW1iZXIoKSAmJiBsZWZ0LmlzSW50KCkpIHtcclxuICAgICAgICAgICAgYmluYXJ5RXhwcmVzc2lvbi5sZWZ0ID0gY2FzdFRvRmxvYXQoYmluYXJ5RXhwcmVzc2lvbi5sZWZ0KTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChiaW5hcnlFeHByZXNzaW9uLm9wZXJhdG9yID09IFwiJVwiKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBoYW5kbGVNb2R1bG8oYmluYXJ5RXhwcmVzc2lvbik7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBiaW5hcnlFeHByZXNzaW9uO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGNhc3RUb0Zsb2F0KGFzdCkge1xyXG4gICAgICAgIHZhciBleHAgPSBBTk5PKGFzdCk7XHJcblxyXG4gICAgICAgIGlmICghZXhwLmlzTnVtYmVyKCkpIHsgICAvLyBDYXN0XHJcbiAgICAgICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgICAgICB0eXBlOiBTeW50YXguQ2FsbEV4cHJlc3Npb24sXHJcbiAgICAgICAgICAgICAgICBjYWxsZWU6IHtcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiBTeW50YXguSWRlbnRpZmllcixcclxuICAgICAgICAgICAgICAgICAgICBuYW1lOiBcImZsb2F0XCJcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICBhcmd1bWVudHM6IFthc3RdXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIGFzdDtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBjYXN0VG9JbnQoYXN0LCBmb3JjZSkge1xyXG4gICAgICAgIHZhciBleHAgPSBBTk5PKGFzdCk7XHJcblxyXG4gICAgICAgIGlmICghZXhwLmlzSW50KCkgfHwgZm9yY2UpIHsgICAvLyBDYXN0XHJcbiAgICAgICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgICAgICB0eXBlOiBTeW50YXguQ2FsbEV4cHJlc3Npb24sXHJcbiAgICAgICAgICAgICAgICBjYWxsZWU6IHtcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiBTeW50YXguSWRlbnRpZmllcixcclxuICAgICAgICAgICAgICAgICAgICBuYW1lOiBcImludFwiXHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgYXJndW1lbnRzOiBbYXN0XVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBhc3Q7XHJcbiAgICB9XHJcblxyXG4gICAgdmFyIGhhbmRsZU1vZHVsbyA9IGZ1bmN0aW9uIChiaW5hcnlFeHByZXNzaW9uKSB7XHJcbiAgICAgICAgYmluYXJ5RXhwcmVzc2lvbi5yaWdodCA9IGNhc3RUb0Zsb2F0KGJpbmFyeUV4cHJlc3Npb24ucmlnaHQpO1xyXG4gICAgICAgIGJpbmFyeUV4cHJlc3Npb24ubGVmdCA9IGNhc3RUb0Zsb2F0KGJpbmFyeUV4cHJlc3Npb24ubGVmdCk7XHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgdHlwZTogU3ludGF4LkNhbGxFeHByZXNzaW9uLFxyXG4gICAgICAgICAgICBjYWxsZWU6IHtcclxuICAgICAgICAgICAgICAgIHR5cGU6IFN5bnRheC5JZGVudGlmaWVyLFxyXG4gICAgICAgICAgICAgICAgbmFtZTogXCJtb2RcIlxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBhcmd1bWVudHM6IFtcclxuICAgICAgICAgICAgICAgIGJpbmFyeUV4cHJlc3Npb24ubGVmdCxcclxuICAgICAgICAgICAgICAgIGJpbmFyeUV4cHJlc3Npb24ucmlnaHRcclxuICAgICAgICAgICAgXSxcclxuICAgICAgICAgICAgZXh0cmE6IHtcclxuICAgICAgICAgICAgICAgIHR5cGU6IFR5cGVzLk5VTUJFUlxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHZhciBoYW5kbGVDb25kaXRpb25hbEV4cHJlc3Npb24gPSBmdW5jdGlvbihub2RlLCBzdGF0ZSwgcm9vdCkge1xyXG4gICAgICAgIHZhciBjb25zZXF1ZW50ID0gQU5OTyhub2RlLmNvbnNlcXVlbnQpO1xyXG4gICAgICAgIHZhciBhbHRlcm5hdGUgPSBBTk5PKG5vZGUuYWx0ZXJuYXRlKTtcclxuICAgICAgICBpZiAoY29uc2VxdWVudC5jYW5FbGltaW5hdGUoKSkge1xyXG4gICAgICAgICAgICByZXR1cm4gcm9vdC5yZXBsYWNlKG5vZGUuYWx0ZXJuYXRlLCBzdGF0ZSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmIChhbHRlcm5hdGUuY2FuRWxpbWluYXRlKCkpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHJvb3QucmVwbGFjZShub2RlLmNvbnNlcXVlbnQsIHN0YXRlKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgfVxyXG5cclxuICAgIHZhciBoYW5kbGVJZlN0YXRlbWVudCA9IGZ1bmN0aW9uIChub2RlKSB7XHJcbiAgICAgICAgdmFyIGNvbnNlcXVlbnQgPSBBTk5PKG5vZGUuY29uc2VxdWVudCk7XHJcbiAgICAgICAgdmFyIGFsdGVybmF0ZSA9IG5vZGUuYWx0ZXJuYXRlID8gQU5OTyhub2RlLmFsdGVybmF0ZSkgOiBudWxsO1xyXG4gICAgICAgIGlmIChjb25zZXF1ZW50LmNhbkVsaW1pbmF0ZSgpKSB7XHJcbiAgICAgICAgICAgIGlmIChhbHRlcm5hdGUpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBub2RlLmFsdGVybmF0ZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICAgICAgdHlwZTogU3ludGF4LkVtcHR5U3RhdGVtZW50XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9IGVsc2UgaWYgKGFsdGVybmF0ZSAmJiBhbHRlcm5hdGUuY2FuRWxpbWluYXRlKCkpIHtcclxuICAgICAgICAgICAgcmV0dXJuIG5vZGUuY29uc2VxdWVudDtcclxuICAgICAgICB9XHJcbiAgICAgICAgLy8gV2Ugc3RpbGwgaGF2ZSBhIHJlYWwgaWYgc3RhdGVtZW50XHJcbiAgICAgICB2YXIgdGVzdCA9IEFOTk8obm9kZS50ZXN0KTtcclxuICAgICAgIHN3aXRjaCh0ZXN0LmdldFR5cGUoKSkge1xyXG4gICAgICAgICAgIGNhc2UgVHlwZXMuSU5UOlxyXG4gICAgICAgICAgIGNhc2UgVHlwZXMuTlVNQkVSOlxyXG4gICAgICAgICAgICAgICBub2RlLnRlc3QgPSB7XHJcbiAgICAgICAgICAgICAgICAgICB0eXBlOiBTeW50YXguQmluYXJ5RXhwcmVzc2lvbixcclxuICAgICAgICAgICAgICAgICAgIG9wZXJhdG9yOiBcIiE9XCIsXHJcbiAgICAgICAgICAgICAgICAgICBsZWZ0OiBub2RlLnRlc3QsXHJcbiAgICAgICAgICAgICAgICAgICByaWdodDoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgIHR5cGU6IFN5bnRheC5MaXRlcmFsLFxyXG4gICAgICAgICAgICAgICAgICAgICAgIHZhbHVlOiAwLFxyXG4gICAgICAgICAgICAgICAgICAgICAgIGV4dHJhOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6IHRlc3QuZ2V0VHlwZSgpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICB9XHJcbiAgICAgICB9XHJcblxyXG5cclxuICAgIH07XHJcblxyXG4gICAgdmFyIGhhbmRsZUxvZ2ljYWxFeHByZXNzaW9uID0gZnVuY3Rpb24gKG5vZGUsIHJvb3QsIHN0YXRlKSB7XHJcbiAgICAgICAgdmFyIGxlZnQgPSBBTk5PKG5vZGUubGVmdCk7XHJcbiAgICAgICAgdmFyIHJpZ2h0ID0gQU5OTyhub2RlLnJpZ2h0KTtcclxuICAgICAgICBpZiAobGVmdC5jYW5FbGltaW5hdGUoKSlcclxuICAgICAgICAgICAgcmV0dXJuIHJvb3QucmVwbGFjZShub2RlLnJpZ2h0LCBzdGF0ZSk7XHJcbiAgICAgICAgaWYgKHJpZ2h0LmNhbkVsaW1pbmF0ZSgpKVxyXG4gICAgICAgICAgICByZXR1cm4gcm9vdC5yZXBsYWNlKG5vZGUubGVmdCwgc3RhdGUpO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIEV4cG9ydHNcclxuICAgIG5zLkdMQVNUVHJhbnNmb3JtZXIgPSBHTEFTVFRyYW5zZm9ybWVyO1xyXG5cclxuXHJcbn0oZXhwb3J0cykpO1xyXG4iLCIoZnVuY3Rpb24gKG5zKSB7XHJcbiAgICB2YXIgQmFzZSA9IHJlcXVpcmUoXCIuL2Jhc2UvaW5kZXguanNcIik7XHJcbiAgICAvKipcclxuICAgICAqIEBlbnVtIHtzdHJpbmd9XHJcbiAgICAgKi9cclxuICAgIG5zLlRZUEVTID0ge1xyXG4gICAgICAgIEFOWTogXCJhbnlcIixcclxuICAgICAgICBJTlQ6IFwiaW50XCIsXHJcbiAgICAgICAgTlVNQkVSOiBcIm51bWJlclwiLFxyXG4gICAgICAgIEJPT0xFQU46IFwiYm9vbGVhblwiLFxyXG4gICAgICAgIE9CSkVDVDogXCJvYmplY3RcIixcclxuICAgICAgICBBUlJBWTogXCJhcnJheVwiLFxyXG4gICAgICAgIE5VTEw6IFwibnVsbFwiLFxyXG4gICAgICAgIFVOREVGSU5FRDogXCJ1bmRlZmluZWRcIixcclxuICAgICAgICBGVU5DVElPTjogXCJmdW5jdGlvblwiLFxyXG4gICAgICAgIFNUUklORzogXCJzdHJpbmdcIlxyXG4gICAgfVxyXG5cclxuICAgIG5zLk9CSkVDVF9LSU5EUyA9IHtcclxuICAgICAgICBBTlk6IFwiYW55XCIsXHJcbiAgICAgICAgRkxPQVQyOiBcImZsb2F0MlwiLCAvLyB2aXJ0dWFsIGtpbmRzXHJcbiAgICAgICAgRkxPQVQzOiBcImZsb2F0M1wiLCAvLyB2aXJ0dWFsIGtpbmRzXHJcbiAgICAgICAgRkxPQVQ0OiBcImZsb2F0NFwiLCAvLyB2aXJ0dWFsIGtpbmRzXHJcbiAgICAgICAgTk9STUFMOiBcIm5vcm1hbFwiLFxyXG4gICAgICAgIE1BVFJJWDQ6IFwibWF0cml4NFwiLFxyXG4gICAgICAgIE1BVFJJWDM6IFwibWF0cml4M1wiLFxyXG4gICAgICAgIENPTE9SX0NMT1NVUkU6IFwiY29sb3JfY2xvc3VyZVwiXHJcbiAgICB9XHJcblxyXG4gICAgbnMuU09VUkNFUyA9IHtcclxuICAgICAgICBVTklGT1JNOiBcInVuaWZvcm1cIixcclxuICAgICAgICBWRVJURVg6IFwidmVydGV4XCIsXHJcbiAgICAgICAgQ09OU1RBTlQ6IFwiY29uc3RhbnRcIlxyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGZpbGxWZWN0b3IoZGVzdCwgdmVjU2l6ZSwgYXJndW1lbnRzKXtcclxuICAgICAgICB2YXIgY29sb3IgPSBmYWxzZTtcclxuICAgICAgICBpZihhcmd1bWVudHMubGVuZ3RoID09IDAgKXtcclxuICAgICAgICAgICAgZm9yKHZhciBpID0gMDsgaSA8IHZlY1NpemU7ICsraSlcclxuICAgICAgICAgICAgICAgIGRlc3RbaV0gPSAwO1xyXG4gICAgICAgICAgICBpZihjb2xvcikgZGVzdFszXSA9IDE7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYoYXJndW1lbnRzLmxlbmd0aCA9PSAxICYmICFpc05hTihhcmd1bWVudHNbMF0pKXtcclxuICAgICAgICAgICAgZm9yKHZhciBpID0gMDsgaSA8IHZlY1NpemU7ICsraSlcclxuICAgICAgICAgICAgICAgIGRlc3RbaV0gPSBhcmd1bWVudHNbMF07XHJcbiAgICAgICAgICAgIGlmKGNvbG9yKSBkZXN0WzNdID0gMTtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdmFyIGlkeCA9IDA7XHJcbiAgICAgICAgZm9yKHZhciBpID0gMDsgaWR4IDwgdmVjU2l6ZSAmJiBpIDwgYXJndW1lbnRzLmxlbmd0aDsgKytpKXtcclxuICAgICAgICAgICAgdmFyIGFyZz0gYXJndW1lbnRzW2ldLCBjbnQgPSAxO1xyXG4gICAgICAgICAgICBpZihhcmcgaW5zdGFuY2VvZiBWZWMyKSBjbnQgPSAyO1xyXG4gICAgICAgICAgICBlbHNlIGlmKGFyZyBpbnN0YW5jZW9mIFZlYzMpIGNudCA9IDM7XHJcbiAgICAgICAgICAgIGVsc2UgaWYoYXJnIGluc3RhbmNlb2YgVmVjNCkgY250ID0gNDtcclxuXHJcbiAgICAgICAgICAgIGlmKGNudCA9PSAxKVxyXG4gICAgICAgICAgICAgICAgZGVzdFtpZHgrK10gPSBhcmcgfHwgMDtcclxuICAgICAgICAgICAgZWxzZVxyXG4gICAgICAgICAgICAgICAgZm9yKHZhciBqID0gMDsgaWR4IDwgdmVjU2l6ZSAmJiBqIDwgY250OyArK2ope1xyXG4gICAgICAgICAgICAgICAgICAgIGRlc3RbaWR4KytdID0gYXJnW2pdO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICBpZihpIDwgYXJndW1lbnRzLmxlbmd0aClcclxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiVG9vIG1hbnkgYXJndW1lbnRzIGZvciBcIiArIChjb2xvciA/IFwiQ29sb3JcIiA6IFwiVmVjXCIgKyB2ZWNTaXplKSArIFwiLlwiKTtcclxuICAgICAgICBpZihpZHggPCB2ZWNTaXplKXtcclxuICAgICAgICAgICAgaWYoY29sb3IgJiYgKGlkeCA9PSAzKSlcclxuICAgICAgICAgICAgICAgIGRlc3RbM10gPSAxO1xyXG4gICAgICAgICAgICBlbHNlXHJcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJOb3QgZW5vdWdoIGFyZ3VtZW50cyBmb3IgXCIgKyAoY29sb3IgPyBcIkNvbG9yXCIgOiBcIlZlY1wiICsgdmVjU2l6ZSkgKyBcIi5cIik7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuXHJcbiAgICAvLyBUT0RPOiBHZW5lcmF0ZSBTd2l6emxlIGZ1bmN0aW9uc1xyXG4gICAgdmFyIFNXSVpaTEVfS0VZUyA9IFtcclxuICAgICAgICBbJ3gnLCd5JywneicsJ3cnXSxcclxuICAgICAgICBbJ3InLCAnZycsICdiJywgJ2EnXSxcclxuICAgICAgICBbJ3MnLCAndCcsICdwJywgJ3EnXVxyXG4gICAgXVxyXG5cclxuICAgIGZ1bmN0aW9uIGFkZFN3aXp6bGVzKHByb3RvdHlwZSwgdmVjQ291bnQsIG1hc2tDb3VudCwgd2l0aFNldHRlcil7XHJcbiAgICAgICAgdmFyIG1heCA9IE1hdGgucG93KHZlY0NvdW50LCBtYXNrQ291bnQpO1xyXG4gICAgICAgIGZvcih2YXIgaSA9IDA7IGkgPCBtYXg7ICsraSl7XHJcbiAgICAgICAgICAgIHZhciBpbmRpY2VzID0gW10sIGtleXMgPSBbXCJcIiwgXCJcIiwgXCJcIl0sIHZhbCA9IGksIGFyZ3MgPSBbXTtcclxuICAgICAgICAgICAgdmFyIHNldHRlckFyZ3MgPSBbXSwgZ2VuZXJhdGVTZXR0ZXIgPSB3aXRoU2V0dGVyO1xyXG4gICAgICAgICAgICBmb3IodmFyIGogPSAwOyBqIDwgbWFza0NvdW50OyArK2ope1xyXG4gICAgICAgICAgICAgICAgdmFyIGlkeCA9IHZhbCAlIHZlY0NvdW50O1xyXG4gICAgICAgICAgICAgICAgaW5kaWNlcy5wdXNoKGlkeCk7XHJcbiAgICAgICAgICAgICAgICBpZihnZW5lcmF0ZVNldHRlcil7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYoc2V0dGVyQXJnc1tpZHhdID09PSB1bmRlZmluZWQpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNldHRlckFyZ3NbaWR4XSA9ICdvdGhlclsnICsgaiArICddJztcclxuICAgICAgICAgICAgICAgICAgICBlbHNlXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGdlbmVyYXRlU2V0dGVyID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBmb3IodmFyIGsgPSAwOyBrIDwgU1dJWlpMRV9LRVlTLmxlbmd0aDsgKytrKXtcclxuICAgICAgICAgICAgICAgICAgICBrZXlzW2tdICs9IFNXSVpaTEVfS0VZU1trXVtpZHhdO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgdmFsID0gTWF0aC5mbG9vcih2YWwgLyB2ZWNDb3VudCk7XHJcbiAgICAgICAgICAgICAgICBhcmdzLnB1c2goJ3RoaXNbJysgaWR4ICsgJ10nICk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHZhciBmdW5jQXJncyA9IFwiXCI7XHJcbiAgICAgICAgICAgIHZhciBib2R5ID0gJyAgcmV0dXJuIGdldFZlYycgKyBtYXNrQ291bnQgKyAnLmFwcGx5KG51bGwsIGFyZ3VtZW50cyk7XFxuJztcclxuICAgICAgICAgICAgaWYoZ2VuZXJhdGVTZXR0ZXIpe1xyXG4gICAgICAgICAgICAgICAgZm9yKHZhciBqID0gMDsgaiA8IHZlY0NvdW50OyArK2ope1xyXG4gICAgICAgICAgICAgICAgICAgIGlmKHNldHRlckFyZ3Nbal0gPT09IHVuZGVmaW5lZClcclxuICAgICAgICAgICAgICAgICAgICAgICAgc2V0dGVyQXJnc1tqXSA9ICd0aGlzWycgKyBqICsgJ10nO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgc3dpdGNoKG1hc2tDb3VudCl7XHJcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAyIDogZnVuY0FyZ3MgPSBcIngsIHlcIjsgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAzIDogZnVuY0FyZ3MgPSBcIngsIHksIHpcIjsgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgY2FzZSA0IDogZnVuY0FyZ3MgPSBcIngsIHksIHosIHdcIjsgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgYm9keSA9IFwiICBpZihhcmd1bWVudHMubGVuZ3RoID09IDApXFxuICBcIiArIGJvZHkgK1xyXG4gICAgICAgICAgICAgICAgICAgICAgIFwiICBlbHNle1xcblwiICtcclxuICAgICAgICAgICAgICAgICAgICAgICBcIiAgICB2YXIgb3RoZXI9Z2V0VmVjXCIgKyBtYXNrQ291bnQgKyAnLmFwcGx5KG51bGwsIGFyZ3VtZW50cyk7XFxuJyArXHJcbiAgICAgICAgICAgICAgICAgICAgICAgXCIgICAgcmV0dXJuIGdldFZlY1wiICsgdmVjQ291bnQgKyAnKCcgKyBzZXR0ZXJBcmdzLmpvaW4oXCIsIFwiKSArICcpO1xcbicgK1xyXG4gICAgICAgICAgICAgICAgICAgICAgIFwiICB9XFxuXCI7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgdmFyIGZ1bmN0aW9uQ29kZSA9ICdmdW5jdGlvbignICsgZnVuY0FyZ3MgKyAgJyl7XFxuJyArIGJvZHkgKyAnfSc7XHJcbiAgICAgICAgICAgIHRyeXtcclxuICAgICAgICAgICAgICAgIHZhciByZXN1bHQgPSBldmFsKFwiKFwiICsgZnVuY3Rpb25Db2RlICsgXCIpXCIpO1xyXG4gICAgICAgICAgICAgICAgZm9yKHZhciBqID0gMDsgaiA8IGtleXMubGVuZ3RoOyArK2opXHJcbiAgICAgICAgICAgICAgICAgICAgcHJvdG90eXBlW2tleXNbal1dID0gcmVzdWx0O1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGNhdGNoKGUpe1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihcIkVycm9yIENvbXBpbGluZyBDb2RlOlxcblwiICsgZnVuY3Rpb25Db2RlKTtcclxuICAgICAgICAgICAgICAgIHRocm93IGU7XHJcblxyXG4gICAgICAgICAgICB9XHJcblxyXG5cclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG5cclxuICAgIC8qKlxyXG4gICAgICogVGhlIHZpcnR1YWwgVmVjMiB0eXBlXHJcbiAgICAgKiBAY29uc3RydWN0b3JcclxuICAgICAqL1xyXG4gICAgIHZhciBWZWMyID0gZnVuY3Rpb24oeCwgeSl7XHJcbiAgICAgICAgZmlsbFZlY3Rvcih0aGlzLCAyLCBhcmd1bWVudHMpO1xyXG4gICAgIH1cclxuXHJcblxyXG4gICAgIGZ1bmN0aW9uIGdldFZlYzIoKXtcclxuICAgICAgICBpZihhcmd1bWVudHNbMF0gaW5zdGFuY2VvZiBWZWMyKVxyXG4gICAgICAgICAgICByZXR1cm4gYXJndW1lbnRzWzBdO1xyXG4gICAgICAgIHZhciBvYmogPSAgbmV3IFZlYzIoKTtcclxuICAgICAgICBWZWMyLmFwcGx5KG9iaiwgYXJndW1lbnRzKTtcclxuICAgICAgICByZXR1cm4gb2JqO1xyXG4gICAgIH1cclxuXHJcbiAgICAgVmVjMi5wcm90b3R5cGUuYWRkID0gZnVuY3Rpb24oeCwgeSl7IC8vIDAgYXJndW1lbnRzID0+IGlkZW50aXR5IG9yIGVycm9yP1xyXG4gICAgICAgIHZhciBhZGQgPSBnZXRWZWMyLmFwcGx5KG51bGwsIGFyZ3VtZW50cyk7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBWZWMyKHRoaXNbMF0gKyBhZGRbMF0sIHRoaXNbMV0gKyBhZGRbMV0pO1xyXG4gICAgIH1cclxuICAgICBWZWMyLnByb3RvdHlwZS5zdWIgPSBmdW5jdGlvbih4LCB5KXtcclxuICAgICAgICB2YXIgc3ViID0gZ2V0VmVjMi5hcHBseShudWxsLCBhcmd1bWVudHMpO1xyXG4gICAgICAgIHJldHVybiBuZXcgVmVjMih0aGlzWzBdIC0gc3ViWzBdLCB0aGlzWzFdIC0gc3ViWzFdKTtcclxuICAgICB9XHJcbiAgICAgVmVjMi5wcm90b3R5cGUubXVsID0gZnVuY3Rpb24oeCwgeSl7XHJcbiAgICAgICAgdmFyIG90aGVyID0gZ2V0VmVjMi5hcHBseShudWxsLCBhcmd1bWVudHMpO1xyXG4gICAgICAgIHJldHVybiBuZXcgVmVjMih0aGlzWzBdICogb3RoZXJbMF0sIHRoaXNbMV0gKiBvdGhlclsxXSk7XHJcbiAgICAgfVxyXG4gICAgIFZlYzIucHJvdG90eXBlLmRpdiA9IGZ1bmN0aW9uKHgsIHkpe1xyXG4gICAgICAgIHZhciBvdGhlciA9IGdldFZlYzIuYXBwbHkobnVsbCwgYXJndW1lbnRzKTtcclxuICAgICAgICByZXR1cm4gbmV3IFZlYzIodGhpc1swXSAvIG90aGVyWzBdLCB0aGlzWzFdIC8gb3RoZXJbMV0pO1xyXG4gICAgIH1cclxuICAgICBWZWMyLnByb3RvdHlwZS5tb2QgPSBmdW5jdGlvbih4LCB5KXtcclxuICAgICAgICB2YXIgb3RoZXIgPSBnZXRWZWMyLmFwcGx5KG51bGwsIGFyZ3VtZW50cyk7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBWZWMyKHRoaXNbMF0gJSBvdGhlclswXSwgdGhpc1sxXSAlIG90aGVyWzFdKTtcclxuICAgICB9XHJcbiAgICAgVmVjMi5wcm90b3R5cGUuZG90ID0gZnVuY3Rpb24oeCwgeSl7XHJcbiAgICAgICAgdmFyIG90aGVyID0gZ2V0VmVjMi5hcHBseShudWxsLCBhcmd1bWVudHMpO1xyXG4gICAgICAgIHJldHVybiB0aGlzWzBdKm90aGVyWzBdICsgdGhpc1sxXSpvdGhlclsxXTtcclxuICAgICB9XHJcbiAgICAgVmVjMi5wcm90b3R5cGUuYWJzID0gZnVuY3Rpb24oKXtcclxuICAgICAgICByZXR1cm4gbmV3IFZlYzIoTWF0aC5hYnModGhpc1swXSksIE1hdGguYWJzKHRoaXNbMV0pKTtcclxuICAgICB9XHJcbiAgICAgVmVjMi5wcm90b3R5cGUubGVuZ3RoID0gZnVuY3Rpb24obGVuZ3RoKXtcclxuICAgICAgICBpZihhcmd1bWVudHMubGVuZ3RoID09IDApXHJcbiAgICAgICAgICAgIHJldHVybiBNYXRoLnNxcnQodGhpcy5kb3QodGhpcykpO1xyXG4gICAgICAgIGVsc2V7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLm11bChsZW5ndGggLyB0aGlzLmxlbmd0aCgpKTtcclxuICAgICAgICB9XHJcbiAgICAgfVxyXG4gICAgIFZlYzIucHJvdG90eXBlLm5vcm1hbGl6ZSA9IGZ1bmN0aW9uKCl7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMubGVuZ3RoKDEpO1xyXG4gICAgIH1cclxuXHJcbiAgICAgVmVjMi5wcm90b3R5cGUueHkgPSBWZWMyLnByb3RvdHlwZS5yZyA9IFZlYzIucHJvdG90eXBlLnN0ID0gZnVuY3Rpb24oeCx5KXtcclxuICAgICAgICBpZihhcmd1bWVudHMubGVuZ3RoID09IDApXHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgICAgIGVsc2V7XHJcbiAgICAgICAgICAgIHJldHVybiBnZXRWZWMyLmFwcGx5KG51bGwsIGFyZ3VtZW50cyk7XHJcbiAgICAgICAgfVxyXG4gICAgIH1cclxuICAgICBWZWMyLnByb3RvdHlwZS54ID0gVmVjMi5wcm90b3R5cGUuciA9IFZlYzIucHJvdG90eXBlLnMgPSBmdW5jdGlvbih4KXtcclxuICAgICAgICBpZihhcmd1bWVudHMubGVuZ3RoID09IDApXHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzWzBdO1xyXG4gICAgICAgIGVsc2VcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMueHkoeCwgdGhpc1sxXSk7XHJcbiAgICAgfVxyXG4gICAgIFZlYzIucHJvdG90eXBlLnkgPSBWZWMyLnByb3RvdHlwZS5nID0gVmVjMi5wcm90b3R5cGUudCA9IGZ1bmN0aW9uKHkpe1xyXG4gICAgICAgIGlmKGFyZ3VtZW50cy5sZW5ndGggPT0gMClcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXNbMV07XHJcbiAgICAgICAgZWxzZVxyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy54eSh0aGlzWzBdLCB5KTtcclxuICAgICB9XHJcblxyXG4gICAgIGFkZFN3aXp6bGVzKFZlYzIucHJvdG90eXBlLCAyLCAyLCB0cnVlKTtcclxuICAgICBhZGRTd2l6emxlcyhWZWMyLnByb3RvdHlwZSwgMiwgMywgZmFsc2UpO1xyXG4gICAgIGFkZFN3aXp6bGVzKFZlYzIucHJvdG90eXBlLCAyLCA0LCBmYWxzZSk7XHJcblxyXG5cclxuXHJcbiAgICAgLyoqXHJcbiAgICAgICogVGhlIHZpcnR1YWwgVmVjMyB0eXBlXHJcbiAgICAgICogQGNvbnN0cnVjdG9yXHJcbiAgICAgICovXHJcbiAgICAgdmFyIFZlYzMgPSBmdW5jdGlvbih4LCB5LCB6ICl7XHJcbiAgICAgICAgZmlsbFZlY3Rvcih0aGlzLCAzLCBhcmd1bWVudHMpO1xyXG4gICAgIH1cclxuXHJcbiAgICAgZnVuY3Rpb24gZ2V0VmVjMygpe1xyXG4gICAgICAgIGlmKGFyZ3VtZW50c1swXSBpbnN0YW5jZW9mIFZlYzMpXHJcbiAgICAgICAgICAgIHJldHVybiBhcmd1bWVudHNbMF07XHJcbiAgICAgICAgdmFyIG9iaiA9IG5ldyBWZWMzKCk7XHJcbiAgICAgICAgVmVjMy5hcHBseShvYmosIGFyZ3VtZW50cyk7XHJcbiAgICAgICAgcmV0dXJuIG9iajtcclxuICAgICB9XHJcblxyXG4gICAgIFZlYzMucHJvdG90eXBlLmFkZCA9IGZ1bmN0aW9uKHgsIHksIHope1xyXG4gICAgICAgIHZhciBvdGhlciA9IGdldFZlYzMuYXBwbHkobnVsbCwgYXJndW1lbnRzKTtcclxuICAgICAgICByZXR1cm4gbmV3IFZlYzModGhpc1swXSArIG90aGVyWzBdLCB0aGlzWzFdICsgb3RoZXJbMV0sIHRoaXNbMl0gKyBvdGhlclsyXSk7XHJcbiAgICAgfVxyXG4gICAgIFZlYzMucHJvdG90eXBlLnN1YiA9IGZ1bmN0aW9uKHgsIHksIHope1xyXG4gICAgICAgIHZhciBvdGhlciA9IGdldFZlYzMuYXBwbHkobnVsbCwgYXJndW1lbnRzKTtcclxuICAgICAgICByZXR1cm4gbmV3IFZlYzModGhpc1swXSAtIG90aGVyWzBdLCB0aGlzWzFdIC0gb3RoZXJbMV0sIHRoaXNbMl0gLSBvdGhlclsyXSk7XHJcbiAgICAgfVxyXG4gICAgIFZlYzMucHJvdG90eXBlLm11bCA9IGZ1bmN0aW9uKHgsIHksIHope1xyXG4gICAgICAgIHZhciBvdGhlciA9IGdldFZlYzMuYXBwbHkobnVsbCwgYXJndW1lbnRzKTtcclxuICAgICAgICByZXR1cm4gbmV3IFZlYzModGhpc1swXSAqIG90aGVyWzBdLCB0aGlzWzFdICogb3RoZXJbMV0sIHRoaXNbMl0gKiBvdGhlclsyXSk7XHJcbiAgICAgfVxyXG4gICAgIFZlYzMucHJvdG90eXBlLmRpdiA9IGZ1bmN0aW9uKHgsIHksIHope1xyXG4gICAgICAgIHZhciBvdGhlciA9IGdldFZlYzMuYXBwbHkobnVsbCwgYXJndW1lbnRzKTtcclxuICAgICAgICByZXR1cm4gbmV3IFZlYzModGhpc1swXSAvIG90aGVyWzBdLCB0aGlzWzFdIC8gb3RoZXJbMV0sIHRoaXNbMl0gLyBvdGhlclsyXSk7XHJcbiAgICAgfVxyXG4gICAgIFZlYzMucHJvdG90eXBlLm1vZCA9IGZ1bmN0aW9uKHgsIHksIHope1xyXG4gICAgICAgIHZhciBvdGhlciA9IGdldFZlYzMuYXBwbHkobnVsbCwgYXJndW1lbnRzKTtcclxuICAgICAgICByZXR1cm4gbmV3IFZlYzModGhpc1swXSAlIG90aGVyWzBdLCB0aGlzWzFdICUgb3RoZXJbMV0sIHRoaXNbMl0gJSBvdGhlclsyXSk7XHJcbiAgICAgfVxyXG4gICAgIFZlYzMucHJvdG90eXBlLmFicyA9IGZ1bmN0aW9uKCl7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBWZWMzKE1hdGguYWJzKHRoaXNbMF0pLCBNYXRoLmFicyh0aGlzWzFdKSwgTWF0aC5hYnModGhpc1syXSkpO1xyXG4gICAgIH1cclxuICAgICBWZWMzLnByb3RvdHlwZS5kb3QgPSBmdW5jdGlvbih4LCB5LCB6KXtcclxuICAgICAgICB2YXIgb3RoZXIgPSBnZXRWZWMzLmFwcGx5KG51bGwsIGFyZ3VtZW50cyk7XHJcbiAgICAgICAgcmV0dXJuIHRoaXNbMF0qb3RoZXJbMF0gKyB0aGlzWzFdKm90aGVyWzFdICsgdGhpc1syXSpvdGhlclsyXTtcclxuICAgICB9XHJcbiAgICAgVmVjMy5wcm90b3R5cGUuY3Jvc3MgPSBmdW5jdGlvbih4LCB5LCB6KXtcclxuICAgICAgICB2YXIgb3RoZXIgPSBnZXRWZWMzLmFwcGx5KG51bGwsIGFyZ3VtZW50cyk7XHJcbiAgICAgICAgdmFyIHggPSB0aGlzWzFdKm90aGVyWzJdIC0gb3RoZXJbMV0qdGhpc1syXTtcclxuICAgICAgICB2YXIgeSA9IHRoaXNbMl0qb3RoZXJbMF0gLSBvdGhlclsyXSp0aGlzWzBdO1xyXG4gICAgICAgIHZhciB6ID0gdGhpc1swXSpvdGhlclsxXSAtIG90aGVyWzBdKnRoaXNbMV07XHJcbiAgICAgICAgcmV0dXJuIG5ldyBWZWMzKHgsIHksIHopO1xyXG4gICAgIH1cclxuICAgICBWZWMzLnByb3RvdHlwZS5sZW5ndGggPSBmdW5jdGlvbihsZW5ndGgpe1xyXG4gICAgICAgIGlmKGFyZ3VtZW50cy5sZW5ndGggPT0gMClcclxuICAgICAgICAgICAgcmV0dXJuIE1hdGguc3FydCh0aGlzLmRvdCh0aGlzKSk7XHJcbiAgICAgICAgZWxzZXtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMubXVsKGxlbmd0aCAvIHRoaXMubGVuZ3RoKCkpO1xyXG4gICAgICAgIH1cclxuICAgICB9XHJcbiAgICAgVmVjMy5wcm90b3R5cGUubm9ybWFsaXplID0gZnVuY3Rpb24oKXtcclxuICAgICAgICByZXR1cm4gdGhpcy5sZW5ndGgoMSk7XHJcbiAgICAgfVxyXG4gICAgIFZlYzMucHJvdG90eXBlLnh5eiA9IFZlYzMucHJvdG90eXBlLnJnYiA9IFZlYzMucHJvdG90eXBlLnN0cCA9IGZ1bmN0aW9uKHgsIHksIHope1xyXG4gICAgICAgIGlmKGFyZ3VtZW50cy5sZW5ndGggPT0gMClcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICAgICAgZWxzZVxyXG4gICAgICAgICAgICByZXR1cm4gbmV3IFZlYzMoeCwgeSwgeik7XHJcbiAgICAgfVxyXG4gICAgIFZlYzMucHJvdG90eXBlLnggPSBWZWMzLnByb3RvdHlwZS5yID0gVmVjMy5wcm90b3R5cGUucyA9IGZ1bmN0aW9uKHgpe1xyXG4gICAgICAgIGlmKGFyZ3VtZW50cy5sZW5ndGggPT0gMClcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXNbMF07XHJcbiAgICAgICAgZWxzZVxyXG4gICAgICAgICAgICByZXR1cm4gbmV3IFZlYzMoeCwgdGhpc1sxXSwgdGhpc1syXSk7XHJcbiAgICAgfVxyXG4gICAgIFZlYzMucHJvdG90eXBlLnkgPSBWZWMzLnByb3RvdHlwZS5nID0gVmVjMy5wcm90b3R5cGUudCA9IGZ1bmN0aW9uKHkpe1xyXG4gICAgICAgIGlmKGFyZ3VtZW50cy5sZW5ndGggPT0gMClcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXNbMV07XHJcbiAgICAgICAgZWxzZVxyXG4gICAgICAgICAgICByZXR1cm4gbmV3IFZlYzModGhpc1swXSwgeSwgdGhpc1syXSk7XHJcbiAgICAgfVxyXG4gICAgIFZlYzMucHJvdG90eXBlLnogPSBWZWMzLnByb3RvdHlwZS5iID0gVmVjMy5wcm90b3R5cGUucCA9IGZ1bmN0aW9uKHope1xyXG4gICAgICAgIGlmKGFyZ3VtZW50cy5sZW5ndGggPT0gMClcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXNbMl07XHJcbiAgICAgICAgZWxzZVxyXG4gICAgICAgICAgICByZXR1cm4gbmV3IFZlYzModGhpc1swXSwgdGhpc1sxXSwgeik7XHJcbiAgICAgfVxyXG4gICAgIGFkZFN3aXp6bGVzKFZlYzMucHJvdG90eXBlLCAzLCAyLCB0cnVlKTtcclxuICAgICBhZGRTd2l6emxlcyhWZWMzLnByb3RvdHlwZSwgMywgMywgdHJ1ZSk7XHJcbiAgICAgYWRkU3dpenpsZXMoVmVjMy5wcm90b3R5cGUsIDMsIDQsIGZhbHNlKTtcclxuXHJcblxyXG4gICAgIC8qKlxyXG4gICAgICAqIFRoZSB2aXJ0dWFsIFZlYzQgdHlwZVxyXG4gICAgICAqIEBjb25zdHJ1Y3RvclxyXG4gICAgICAqL1xyXG4gICAgIHZhciBWZWM0ID0gZnVuY3Rpb24oeCwgeSwgeiwgdyApe1xyXG4gICAgICAgIGZpbGxWZWN0b3IodGhpcywgNCwgYXJndW1lbnRzKVxyXG4gICAgIH1cclxuXHJcbiAgICAgZnVuY3Rpb24gZ2V0VmVjNCgpe1xyXG4gICAgICAgIGlmKGFyZ3VtZW50c1swXSBpbnN0YW5jZW9mIFZlYzQpXHJcbiAgICAgICAgICAgIHJldHVybiBhcmd1bWVudHNbMF07XHJcbiAgICAgICAgdmFyIG9iaiA9IG5ldyBWZWM0KCk7XHJcbiAgICAgICAgVmVjNC5hcHBseShvYmosIGFyZ3VtZW50cyk7XHJcbiAgICAgICAgcmV0dXJuIG9iajtcclxuICAgICB9XHJcblxyXG4gICAgIFZlYzQucHJvdG90eXBlLmFkZCA9IGZ1bmN0aW9uKHgsIHksIHosIHcpe1xyXG4gICAgICAgIHZhciBvdGhlciA9IGdldFZlYzQuYXBwbHkobnVsbCwgYXJndW1lbnRzKTtcclxuICAgICAgICByZXR1cm4gbmV3IFZlYzQodGhpc1swXSArIG90aGVyWzBdLCB0aGlzWzFdICsgb3RoZXJbMV0sIHRoaXNbMl0gKyBvdGhlclsyXSwgdGhpc1szXSArIG90aGVyWzNdKTtcclxuICAgICB9XHJcbiAgICAgVmVjNC5wcm90b3R5cGUuc3ViID0gZnVuY3Rpb24oeCwgeSwgeiwgdyl7XHJcbiAgICAgICAgdmFyIG90aGVyID0gZ2V0VmVjNC5hcHBseShudWxsLCBhcmd1bWVudHMpO1xyXG4gICAgICAgIHJldHVybiBuZXcgVmVjNCh0aGlzWzBdIC0gb3RoZXJbMF0sIHRoaXNbMV0gLSBvdGhlclsxXSwgdGhpc1syXSAtIG90aGVyWzJdLCB0aGlzWzNdIC0gb3RoZXJbM10pO1xyXG4gICAgIH1cclxuICAgICBWZWM0LnByb3RvdHlwZS5tdWwgPSBmdW5jdGlvbih4LCB5LCB6LCB3KXtcclxuICAgICAgICB2YXIgb3RoZXIgPSBnZXRWZWM0LmFwcGx5KG51bGwsIGFyZ3VtZW50cyk7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBWZWM0KHRoaXNbMF0gKiBvdGhlclswXSwgdGhpc1sxXSAqIG90aGVyWzFdLCB0aGlzWzJdICogb3RoZXJbMl0sIHRoaXNbM10gKiBvdGhlclszXSk7XHJcbiAgICAgfVxyXG4gICAgIFZlYzQucHJvdG90eXBlLmRpdiA9IGZ1bmN0aW9uKHgsIHksIHosIHcpe1xyXG4gICAgICAgIHZhciBvdGhlciA9IGdldFZlYzQuYXBwbHkobnVsbCwgYXJndW1lbnRzKTtcclxuICAgICAgICByZXR1cm4gbmV3IFZlYzQodGhpc1swXSAvIG90aGVyWzBdLCB0aGlzWzFdIC8gb3RoZXJbMV0sIHRoaXNbMl0gLyBvdGhlclsyXSwgdGhpc1szXSAvIG90aGVyWzNdKTtcclxuICAgICB9XHJcbiAgICAgVmVjNC5wcm90b3R5cGUubW9kID0gZnVuY3Rpb24oeCwgeSwgeiwgdyl7XHJcbiAgICAgICAgdmFyIG90aGVyID0gZ2V0VmVjNC5hcHBseShudWxsLCBhcmd1bWVudHMpO1xyXG4gICAgICAgIHJldHVybiBuZXcgVmVjNCh0aGlzWzBdICUgb3RoZXJbMF0sIHRoaXNbMV0gJSBvdGhlclsxXSwgdGhpc1syXSAlIG90aGVyWzJdLCB0aGlzWzNdICUgb3RoZXJbM10pO1xyXG4gICAgIH1cclxuICAgICBWZWM0LnByb3RvdHlwZS5hYnMgPSBmdW5jdGlvbigpe1xyXG4gICAgICAgIHJldHVybiBuZXcgVmVjNChNYXRoLmFicyh0aGlzWzBdKSwgTWF0aC5hYnModGhpc1sxXSksIE1hdGguYWJzKHRoaXNbMl0pLCBNYXRoLmFicyh0aGlzWzNdKSk7XHJcbiAgICAgfVxyXG4gICAgIFZlYzQucHJvdG90eXBlLmRvdCA9IGZ1bmN0aW9uKHgsIHksIHosIHcpe1xyXG4gICAgICAgIHZhciBvdGhlciA9IGdldFZlYzQuYXBwbHkobnVsbCwgYXJndW1lbnRzKTtcclxuICAgICAgICByZXR1cm4gdGhpc1swXSpvdGhlclswXSArIHRoaXNbMV0qb3RoZXJbMV0gKyB0aGlzWzJdKm90aGVyWzJdICsgdGhpc1szXSpvdGhlclszXTtcclxuICAgICB9XHJcbiAgICAgVmVjNC5wcm90b3R5cGUubGVuZ3RoID0gZnVuY3Rpb24obGVuZ3RoKXtcclxuICAgICAgICBpZihhcmd1bWVudHMubGVuZ3RoID09IDApXHJcbiAgICAgICAgICAgIHJldHVybiBNYXRoLnNxcnQodGhpcy5kb3QodGhpcykpO1xyXG4gICAgICAgIGVsc2V7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLm11bChsZW5ndGggLyB0aGlzLmxlbmd0aCgpKTtcclxuICAgICAgICB9XHJcbiAgICAgfVxyXG4gICAgIFZlYzQucHJvdG90eXBlLm5vcm1hbGl6ZSA9IGZ1bmN0aW9uKCl7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMubGVuZ3RoKDEpO1xyXG4gICAgIH1cclxuICAgICBWZWM0LnByb3RvdHlwZS54eXp3ID0gVmVjNC5wcm90b3R5cGUucmdiYSA9IFZlYzQucHJvdG90eXBlLnN0cHEgPSBmdW5jdGlvbih4LCB5LCB6LCB3KXtcclxuICAgICAgICBpZihhcmd1bWVudHMubGVuZ3RoID09IDApXHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgICAgIGVsc2VcclxuICAgICAgICAgICAgcmV0dXJuIGdldFZlYzQuYXBwbHkobnVsbCwgYXJndW1lbnRzKTtcclxuICAgICB9XHJcbiAgICAgVmVjNC5wcm90b3R5cGUueCA9IFZlYzQucHJvdG90eXBlLnIgPSBWZWM0LnByb3RvdHlwZS5zID0gZnVuY3Rpb24oeCl7XHJcbiAgICAgICAgaWYoYXJndW1lbnRzLmxlbmd0aCA9PSAwKVxyXG4gICAgICAgICAgICByZXR1cm4gdGhpc1swXTtcclxuICAgICAgICBlbHNlXHJcbiAgICAgICAgICAgIHJldHVybiBnZXRWZWM0KHgsIHRoaXNbMV0sIHRoaXNbMl0sIHRoaXNbM10pO1xyXG4gICAgIH1cclxuXHJcbiAgICAgVmVjNC5wcm90b3R5cGUueSA9IFZlYzQucHJvdG90eXBlLmcgPSBWZWM0LnByb3RvdHlwZS50ID0gZnVuY3Rpb24oeSl7XHJcbiAgICAgICAgaWYoYXJndW1lbnRzLmxlbmd0aCA9PSAwKVxyXG4gICAgICAgICAgICByZXR1cm4gdGhpc1sxXTtcclxuICAgICAgICBlbHNlXHJcbiAgICAgICAgICAgIHJldHVybiBnZXRWZWM0KHRoaXNbMF0sIHksIHRoaXNbMl0sIHRoaXNbM10pO1xyXG4gICAgIH1cclxuICAgICBWZWM0LnByb3RvdHlwZS56ID0gVmVjNC5wcm90b3R5cGUuYiA9IFZlYzQucHJvdG90eXBlLnAgPSBmdW5jdGlvbih6KXtcclxuICAgICAgICBpZihhcmd1bWVudHMubGVuZ3RoID09IDApXHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzWzJdO1xyXG4gICAgICAgIGVsc2VcclxuICAgICAgICAgICAgcmV0dXJuIGdldFZlYzQodGhpc1swXSwgdGhpc1sxXSwgeiwgdGhpc1szXSk7XHJcbiAgICAgfVxyXG4gICAgIFZlYzQucHJvdG90eXBlLncgPSBWZWM0LnByb3RvdHlwZS5hID0gVmVjNC5wcm90b3R5cGUucSA9IGZ1bmN0aW9uKHcpe1xyXG4gICAgICAgIGlmKGFyZ3VtZW50cy5sZW5ndGggPT0gMClcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXNbM107XHJcbiAgICAgICAgZWxzZVxyXG4gICAgICAgICAgICByZXR1cm4gZ2V0VmVjNCh0aGlzWzBdLCB0aGlzWzFdLHRoaXNbMl0sIHcgKTtcclxuICAgICB9XHJcbiAgICAgYWRkU3dpenpsZXMoVmVjNC5wcm90b3R5cGUsIDQsIDIsIHRydWUpO1xyXG4gICAgIGFkZFN3aXp6bGVzKFZlYzQucHJvdG90eXBlLCA0LCAzLCB0cnVlKTtcclxuICAgICBhZGRTd2l6emxlcyhWZWM0LnByb3RvdHlwZSwgNCwgNCwgdHJ1ZSk7XHJcblxyXG4gICAgIC8qKlxyXG4gICAgICAqIFRoZSB2aXJ0dWFsIENvbG9yIHR5cGVcclxuICAgICAgKiBAY29uc3RydWN0b3JcclxuICAgICAgKi9cclxuICAgICB2YXIgQ29sb3IgPSBWZWM0O1xyXG5cclxuICAgIHZhciBTaGFkZSA9IHt9O1xyXG5cclxuICAgIFNoYWRlLmNsYW1wID0gZnVuY3Rpb24oeCwgbWluVmFsLCBtYXhWYWwpIHtcclxuICAgICAgICByZXR1cm4gTWF0aC5taW4oTWF0aC5tYXgoeCwgbWluVmFsKSwgbWF4VmFsKTtcclxuICAgIH07XHJcblxyXG4gICAgU2hhZGUuc21vb3Roc3RlcCA9IGZ1bmN0aW9uKGVkZ2UxLCBlZGdlMiwgeCkge1xyXG4gICAgICAgIHZhciB0ID0gU2hhZGUuY2xhbXAoKHggLSBlZGdlMSkgLyAoZWRnZTIgLSBlZGdlMSksIDAuMCwgMS4wKTtcclxuICAgICAgICByZXR1cm4gdCAqIHQgKiAoMy4wIC0gMi4wICogdCk7XHJcbiAgICB9O1xyXG5cclxuICAgIFNoYWRlLnN0ZXAgPSBmdW5jdGlvbihlZGdlLCB4KSB7XHJcbiAgICAgICAgcmV0dXJuIHggPCBlZGdlID8gMCA6IDE7XHJcbiAgICB9O1xyXG5cclxuICAgIFNoYWRlLmZyYWN0ID0gZnVuY3Rpb24oeCkge1xyXG4gICAgICAgIHJldHVybiB4IC0gTWF0aC5mbG9vcih4KTtcclxuICAgIH1cclxuXHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gbm9kZVxyXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IG1zZ1xyXG4gICAgICovXHJcbiAgICBucy50aHJvd0Vycm9yID0gZnVuY3Rpb24obm9kZSwgbXNnKSB7XHJcbiAgICAgICAgdmFyIGxvYyA9IG5vZGUgJiYgbm9kZS5sb2M7XHJcbiAgICAgICAgaWYgKGxvYyAmJiBsb2Muc3RhcnQubGluZSkge1xyXG4gICAgICAgICAgICBtc2cgPSBcIkxpbmUgXCIgKyBsb2Muc3RhcnQubGluZSArIFwiOiBcIiArIG1zZztcclxuICAgICAgICB9XHJcbiAgICAgICAgdmFyIGVycm9yID0gbmV3IEVycm9yKG1zZyk7XHJcbiAgICAgICAgZXJyb3IubG9jID0gbG9jO1xyXG4gICAgICAgIHRocm93IGVycm9yO1xyXG4gICAgfVxyXG5cclxuICAgIG5zLlZlYzIgPSBWZWMyO1xyXG4gICAgbnMuVmVjMyA9IFZlYzM7XHJcbiAgICBucy5WZWM0ID0gVmVjNDtcclxuICAgIG5zLkNvbG9yID0gQ29sb3I7XHJcbiAgICBucy5TaGFkZSA9IFNoYWRlO1xyXG5cclxufShleHBvcnRzKSk7XHJcbiIsIihmdW5jdGlvbiAobnMpIHtcclxuICAgIHZhciBwYXJzZXIgPSByZXF1aXJlKCdlc3ByaW1hJyksXHJcbiAgICAgICAgcGFyYW1ldGVycyA9IHJlcXVpcmUoXCIuL2FuYWx5emUvcGFyYW1ldGVycy5qc1wiKSxcclxuICAgICAgICBpbnRlcmZhY2VzID0gcmVxdWlyZShcIi4vaW50ZXJmYWNlcy5qc1wiKSxcclxuICAgICAgICBpbmZlcmVuY2UgPSByZXF1aXJlKFwiLi9hbmFseXplL3R5cGVpbmZlcmVuY2UvdHlwZWluZmVyZW5jZS5qc1wiKSxcclxuICAgICAgICBCYXNlID0gcmVxdWlyZShcIi4vYmFzZS9pbmRleC5qc1wiKSxcclxuICAgICAgICBHTFNMQ29tcGlsZXIgPSByZXF1aXJlKFwiLi9nZW5lcmF0ZS9nbHNsL2NvbXBpbGVyLmpzXCIpLkdMU0xDb21waWxlcjtcclxuXHJcblxyXG5cclxuICAgIEJhc2UuZXh0ZW5kKG5zLCB7XHJcblxyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIEFuYWx5emVzIGEgamF2YXNjcmlwdCBwcm9ncmFtIGFuZCByZXR1cm5zIGEgbGlzdCBvZiBwYXJhbWV0ZXJzXHJcbiAgICAgICAgICogQHBhcmFtIHtmdW5jdGlvbigpfHN0cmluZykgZnVuY1xyXG4gICAgICAgICAqIEByZXR1cm5zIHtvYmplY3QhfVxyXG4gICAgICAgICAqL1xyXG4gICAgICAgIGV4dHJhY3RQYXJhbWV0ZXJzOiBmdW5jdGlvbiAoZnVuYywgb3B0KSB7XHJcbiAgICAgICAgICAgIGlmICh0eXBlb2YgZnVuYyA9PSAnZnVuY3Rpb24nKSB7XHJcbiAgICAgICAgICAgICAgICBmdW5jID0gZnVuYy50b1N0cmluZygpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHZhciBhc3QgPSBwYXJzZXIucGFyc2UoZnVuYyk7XHJcblxyXG4gICAgICAgICAgICByZXR1cm4gcGFyYW1ldGVycy5leHRyYWN0UGFyYW1ldGVycyhhc3QsIG9wdCk7XHJcbiAgICAgICAgfSxcclxuXHJcbiAgICAgICAgcGFyc2VBbmRJbmZlcmVuY2VFeHByZXNzaW9uOiBmdW5jdGlvbiAoc3RyLCBvcHQpIHtcclxuICAgICAgICAgICAgb3B0ID0gb3B0IHx8IHt9O1xyXG4gICAgICAgICAgICB2YXIgYXN0ID0gcGFyc2VyLnBhcnNlKHN0ciwge3JhdzogdHJ1ZSwgbG9jOiBvcHQubG9jIHx8IGZhbHNlIH0pO1xyXG4gICAgICAgICAgICB2YXIgYWFzdCA9IGluZmVyZW5jZS5pbmZlcihhc3QsIG9wdCk7XHJcbiAgICAgICAgICAgIHJldHVybiBhYXN0O1xyXG4gICAgICAgIH0sXHJcblxyXG4gICAgICAgIGNvbXBpbGVGcmFnbWVudFNoYWRlcjogZnVuY3Rpb24oYWFzdCl7XHJcbiAgICAgICAgICAgIHJldHVybiBuZXcgR0xTTENvbXBpbGVyKCkuY29tcGlsZUZyYWdtZW50U2hhZGVyKGFhc3QpO1xyXG4gICAgICAgIH0sXHJcblxyXG4gICAgICAgIFRZUEVTIDogaW50ZXJmYWNlcy5UWVBFUyxcclxuICAgICAgICBPQkpFQ1RfS0lORFMgOiBpbnRlcmZhY2VzLk9CSkVDVF9LSU5EUyxcclxuICAgICAgICBTT1VSQ0VTOiBpbnRlcmZhY2VzLlNPVVJDRVMsXHJcbiAgICAgICAgVmVjMjogaW50ZXJmYWNlcy5WZWMyLFxyXG4gICAgICAgIFZlYzM6IGludGVyZmFjZXMuVmVjMyxcclxuICAgICAgICBWZWM0OiBpbnRlcmZhY2VzLlZlYzQsXHJcbiAgICAgICAgQ29sb3I6IGludGVyZmFjZXMuQ29sb3JcclxuXHJcbn0pO1xyXG4gICAgLyoqXHJcbiAgICAgKiBMaWJyYXJ5IHZlcnNpb246XHJcbiAgICAgKi9cclxuICAgIG5zLnZlcnNpb24gPSAnMC4wLjEnO1xyXG5cclxufShleHBvcnRzKSk7XHJcbiJdfQ==
;