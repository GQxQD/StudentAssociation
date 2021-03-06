<template>
  <div class="member common-container" v-loading.lock="!isLoad">
    <div v-if="isLoad" class="member-wrapper">
      <div class="actions clearfix">
        <el-button
          @click="exportData" icon="fa fa-download"
          :disabled="!association"
          type="success" size="mini"
          class="pull-right">导出成员列表
        </el-button>
      </div>
      <el-table
        id="table"
        :data="members"
        border
        style="">
        <el-table-column
          fixed
          prop="username"
          label="用户名">
          <template slot-scope="scope">
            <span>{{ scope.row.username }}</span>
            <el-tooltip effect="dark"
                        v-if="scope.row.isChairman || scope.row.isManager"
                        :content="scope.row.isChairman ? '会长' : '管理员'"
                        placement="right">
              <span v-if="scope.row.isManager" class="el-icon-star-on text-primary"></span>
              <span v-else class="fa fa-certificate text-primary"></span>
            </el-tooltip>
            <el-tooltip v-if="$store.state.user._id !== scope.row._id" effect="dark"
                        content="发送消息"
                        placement="right">
              <router-link :to="'/message/whisper/' + scope.row._id"
                           class="fa fa-comment text-success"></router-link>
            </el-tooltip>
          </template>
        </el-table-column>
        <el-table-column
          prop="nickname"
          label="昵称">
          <template slot-scope="scope">
            <span style="margin-left: 10px">{{ scope.row.nickname || '（未设置）' }}</span>
          </template>
        </el-table-column>
        <el-table-column
          prop="email"
          label="邮箱">
          <template slot-scope="scope">
            <span style="margin-left: 10px">{{ scope.row.email || '（未设置）' }}</span>
          </template>
        </el-table-column>
        <el-table-column
          prop="phoneNumber"
          width="120px"
          label="手机号码">
          <template slot-scope="scope">
            <span style="margin-left: 10px">{{ scope.row.phoneNumber || '（未设置）' }}</span>
          </template>
        </el-table-column>
        <el-table-column
          prop="gender"
          width="75px"
          align="center"
          label="性别">
          <template slot-scope="scope">
            <span style="margin-left: 10px">{{ scope.row.gender | formatGender }}</span>
          </template>
        </el-table-column>
        <el-table-column
          v-if="isManager"
          fixed="right"
          width="70px"
          label="操作">
          <template slot-scope="scope">
            <el-dropdown v-if="scope.row.operations.length">
              <div class="el-dropdown-link">
                <el-button class="el-dropdown-link" type="text"
                           size="mini" icon="el-icon-setting">设置
                </el-button>
              </div>
              <el-dropdown-menu slot="dropdown">
                <el-dropdown-item
                  v-for="(o, i) in scope.row.operations"
                  :key="i">
                  <span @click="o.action(scope.row._id)">{{o.label}}</span>
                </el-dropdown-item>
              </el-dropdown-menu>
            </el-dropdown>
          </template>
        </el-table-column>
      </el-table>
    </div>
    <div v-else class="unload">
      加载中
    </div>
  </div>
</template>

<script>
import FileSaver from 'file-saver';
import XLSX from 'xlsx';
import AssociationService from '../../service/AssociationService';

export default {
  name: 'member',
  mounted() {
    this.initData();
  },
  data() {
    return {
      isLoad: false,
      members: [],
      association: null,
    };
  },
  methods: {
    // 初始化数据
    initData() {
      // 获取同乡会成员
      AssociationService.getMembers()
        .then((res) => {
          this.members = res.data;
          // 获取同乡会信息
          return AssociationService.getById();
        })
        .then((res) => {
          this.association = res.data;
          setTimeout(() => {
            this.isLoad = true;
            this.setOperations();
          }, this.$loadingDelayTime);
        });
    },
    // 设置操作面板内容
    setOperations() {
      this.members = this.members.map((m) => {
        const operations = [];
        // 管理员（包括会长）操作
        if (this.isManager && m._id !== this.association.chairman) {
          if (this.isChairman) {
            operations.push({
              label: '让位会长',
              action: this.resetChairman,
            });
            if (this.association.managers.indexOf(m._id) > -1) {
              operations.push({
                label: '取消管理员',
                action: this.setManagerToMember,
              });
            } else {
              operations.push({
                label: '设为管理员',
                action: this.setMemberToManager,
              });
            }
          }
          if (this.association.managers.indexOf(m._id) < 0 || this.isChairman) {
            operations.push({
              label: '踢出同乡会',
              action: this.setMemberOut,
            });
          }
        }
        // if (operations.length < 1) {
        //   operations.push({
        //     label: '暂无操作',
        //     action: () => this.$message.error('Nothing was done.'),
        //   });
        // }
        m.isChairman = this.association.chairman === m._id;
        m.isManager = this.association.managers.indexOf(m._id) > -1;
        m.operations = operations;
        return m;
      });
    },
    setMemberToManager(_id) {
      this.$confirm('是否确定设置管理员', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      }).then(() => {
        AssociationService.doAction('setMemberToManager', _id)
          .then(() => {
            this.$message.success('设置管理员成功');
            this.isLoad = false;
            this.initData();
          });
      }).catch(() => {
        this.$message({
          type: 'info',
          message: '已取消操作',
        });
      });
    },
    setManagerToMember(_id) {
      this.$confirm('是否确定取消管理员', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      }).then(() => {
        AssociationService.doAction('setManagerToMember', _id)
          .then(() => {
            this.$message.success('取消管理员成功');
            this.isLoad = false;
            this.initData();
          });
      }).catch(() => {
        this.$message({
          type: 'info',
          message: '已取消操作',
        });
      });
    },
    resetChairman(_id) {
      this.$confirm('是否确定让位会长', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      }).then(() => {
        AssociationService.doAction('resetChairman', _id)
          .then(() => {
            this.$message.success('让位会长成功');
            this.isLoad = false;
            this.initData();
          });
      }).catch(() => {
        this.$message({
          type: 'info',
          message: '已取消操作',
        });
      });
    },
    setMemberOut(_id) {
      this.$confirm('是否确定将其踢出同乡会', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      }).then(() => {
        AssociationService.doAction('setMemberOut', _id)
          .then(() => {
            this.$message.success('踢出同乡会成功');
            this.isLoad = false;
            this.initData();
          });
      }).catch(() => {
        this.$message({
          type: 'info',
          message: '已取消操作',
        });
      });
    },
    exportData() {
      const workbook = XLSX.utils.book_new();
      const data = this.members.map((m) => {
        const res = {
          ID: m._id,
          UserName: m.username,
          NickName: m.nickname,
          Email: m.email,
          PhoneNumber: m.phoneNumber,
        };
        res.Gender = ['保密', '男', '女'][m.gender + 1];
        return res;
      });
      const worksheet = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(workbook, worksheet, '成员列表');
      const workbookOut = XLSX.write(workbook, { bookType: 'xlsx', bookSST: true, type: 'array' });
      try {
        FileSaver.saveAs(new Blob([workbookOut], { type: 'application/octet-stream' }),
          `[${this.association.name}]成员列表-${this.moment().format('YYYYMMDDHHmmss')}.xlsx`,
        );
      } catch (e) {
        console.log(e);
        this.$message.error('导出同乡会成员列表失败，请稍后重试');
      }
    },
  },
  computed: {
    // 当前登录用户是否为 会长
    isChairman() {
      return this.isLoad && this.association.chairman === this.$store.state.user._id;
    },
    // 当前登录用户是否为 管理员/会长
    isManager() {
      return this.isLoad &&
        (this.isChairman || this.association.managers.indexOf(this.$store.state.user._id) > -1);
    },
  },
};
</script>

<style lang="scss" scoped>
.member {
  .member-wrapper {
    padding: 20px 20px 20px;
    box-shadow: 0 2px 4px 0 rgba(121, 146, 185, .54);
    border-radius: 4px;
    background-color: #fff;
    .actions {
      margin-bottom: 10px;
    }
  }
  a {
    text-decoration: none;
  }
  .unload {
    width: 100%;
    height: 200px;
    line-height: 200px;
    text-align: center;
    font-size: 25px;
  }
}
</style>
