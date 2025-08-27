// test-update-status.js
// 测试任务和项目状态更新

const { updateTaskStatus } = require('./notion-service.js');
require('dotenv').config();

async function testUpdateStatus() {
  console.log('🧪 测试任务/项目状态更新功能');
  console.log('=' .repeat(60));
  
  const testCases = [
    {
      name: '烤全羊',
      type: '项目（在通用项目库）',
      expectedResult: true
    },
    {
      name: '家具购买报销',
      type: '项目（在LaPure项目库）',
      expectedResult: true
    },
    {
      name: '小红书招聘',
      type: '项目（在LaPure项目库）',
      expectedResult: true
    },
    {
      name: '整理购买凭证',
      type: '任务（在通用任务库）',
      expectedResult: true
    },
    {
      name: '不存在的任务',
      type: '不存在',
      expectedResult: false
    }
  ];
  
  for (const test of testCases) {
    console.log(`\n📝 测试: "${test.name}"`);
    console.log(`   类型: ${test.type}`);
    
    const result = await updateTaskStatus(test.name, '完成', 'test_user');
    
    if (result === test.expectedResult) {
      console.log(`   ✅ 测试通过 (${result ? '成功更新' : '正确识别为不存在'})`);
    } else {
      console.log(`   ❌ 测试失败 (期望: ${test.expectedResult}, 实际: ${result})`);
    }
  }
  
  console.log('\n' + '=' .repeat(60));
  console.log('✅ 测试完成！');
  console.log('\n💡 修复说明:');
  console.log('1. 现在会同时在任务库和项目库中查找');
  console.log('2. 正确处理中英文属性差异');
  console.log('3. 不再查询错误的数据库（如Salon理发店信息库）');
}

testUpdateStatus().catch(console.error);