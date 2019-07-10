/*--------------------------------------------------------------------------------------------- 
*  Copyright (c) Microsoft Corporation. All rights reserved. 
*  Licensed under the MIT License. See License.txt in the project root for license information. 
*--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import * as path from 'path';

import { should, expect } from 'chai';
import { activateCSharpExtension } from './integrationHelpers';
import testAssetWorkspace from './testAssets/testAssetWorkspace';
import poll from './poll';

const chai = require('chai');
chai.use(require('chai-arrays'));
chai.use(require('chai-fs'));

suite(`DiagnosticProvider: ${testAssetWorkspace.description}`, function () {
    let fileUri: vscode.Uri;
    let secondaryFileUri: vscode.Uri;

    suiteSetup(async function () {
        should();

        await testAssetWorkspace.restore();
        await activateCSharpExtension();

        let fileName = 'diagnostics.cs';
        let secondaryFileName = 'secondaryFileDiagnostics.cs';
        let projectDirectory = testAssetWorkspace.projects[0].projectDirectoryPath;

        fileUri = vscode.Uri.file(path.join(projectDirectory, fileName));
        secondaryFileUri = vscode.Uri.file(path.join(projectDirectory, secondaryFileName));

        await vscode.commands.executeCommand("vscode.open", fileUri);
    });

    suiteTeardown(async () => {
        await testAssetWorkspace.cleanupWorkspace();
    });

    test("Returns any diagnostics from file", async function () {
        let result = await poll(() => vscode.languages.getDiagnostics(fileUri), 10*1000, 500);
        expect(result.length).to.be.greaterThan(0);
    });

    test("Return unnecessary tag in case of unnesessary using", async function () {
        let result = await poll(() => vscode.languages.getDiagnostics(fileUri), 15*1000, 500);

        let cs8019 = result.find(x => x.message.includes("CS8019"));
        expect(cs8019).to.not.be.undefined;
        expect(cs8019.tags).to.include(vscode.DiagnosticTag.Unnecessary);
    });

    test("Return fadeout diagnostics like unused variables based on roslyn analyzers", async function () {
        let result = await poll(() => vscode.languages.getDiagnostics(fileUri), 15*1000, 500, result => result.find(x => x.message.includes("IDE0059")) != undefined);

        let ide0059 = result.find(x => x.message.includes("IDE0059"));
        expect(ide0059.tags).to.include(vscode.DiagnosticTag.Unnecessary);
    });

    test("When workspace is count as 'large', then only return diagnostics from open documents", async function () {
        let openFileDiagnostics = await poll(() => vscode.languages.getDiagnostics(fileUri), 15*1000, 500);
        //let secondaryNonOpenFileDiagnostics = await vscode.languages.getDiagnostics(secondaryFileUri);
        let secondaryNonOpenFileDiagnostics = await poll(() => vscode.languages.getDiagnostics(secondaryFileUri), 15*1000, 500);

        expect(openFileDiagnostics.length).to.be.greaterThan(0);
        expect(secondaryNonOpenFileDiagnostics.length).to.be.eq(0);
    });
});
